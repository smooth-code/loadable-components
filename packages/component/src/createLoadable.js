/* eslint-disable no-use-before-define, react/no-multi-comp, no-underscore-dangle */
import React from 'react'
import * as ReactIs from 'react-is'
import hoistNonReactStatics from 'hoist-non-react-statics'
import { invariant } from './util'
import Context from './Context'
import { LOADABLE_SHARED } from './shared'

const STATUS_PENDING = 'PENDING'
const STATUS_RESOLVED = 'RESOLVED'
const STATUS_REJECTED = 'REJECTED'

function resolveConstructor(ctor) {
  if (typeof ctor === 'function') {
    return {
      requireAsync: ctor,
      resolve() {
        return undefined
      },
      chunkName() {
        return undefined
      },
    }
  }

  return ctor
}

const withChunkExtractor = Component => {
  const LoadableWithChunkExtractor = props => (
    <Context.Consumer>
      {extractor => <Component __chunkExtractor={extractor} {...props} />}
    </Context.Consumer>
  )
  if (Component.displayName) {
    LoadableWithChunkExtractor.displayName =
      `${Component.displayName}WithChunkExtractor`;
  }
  return LoadableWithChunkExtractor
}

const identity = v => v

function createLoadable({
  defaultResolveComponent = identity,
  render,
  onLoad,
}) {
  function loadable(loadableConstructor, options = {}) {
    const ctor = resolveConstructor(loadableConstructor)
    const cache = {}

    /**
     * Cachekey represents the component to be loaded
     * if key changes - component has to be reloaded
     * @param props
     * @returns {null|Component}
     */
    function getCacheKey(props) {
      if (options.cacheKey) {
        return options.cacheKey(props)
      }
      if (ctor.resolve) {
        return ctor.resolve(props)
      }
      return 'static'
    }

    /**
     * Resolves loaded `module` to a specific `Component
     * @param module
     * @param props
     * @param Loadable
     * @returns Component
     */
    function resolve(module, props, Loadable) {
      const Component = options.resolveComponent
        ? options.resolveComponent(module, props)
        : defaultResolveComponent(module)

      if (options.resolveComponent && !ReactIs.isValidElementType(Component)) {
        throw new Error(
          `resolveComponent returned something that is not a React component!`,
        )
      }
      hoistNonReactStatics(Loadable, Component, {
        preload: true,
      })
      return Component
    }

    class InnerLoadable extends React.Component {
      static getDerivedStateFromProps(props, state) {
        const cacheKey = getCacheKey(props)
        return {
          ...state,
          cacheKey,
          // change of a key triggers loading state automatically
          loading: state.loading || state.cacheKey !== cacheKey,
        }
      }

      constructor(props) {
        super(props)

        this.state = {
          result: null,
          error: null,
          loading: true,
          cacheKey: getCacheKey(props),
        }

        invariant(
          !props.__chunkExtractor || ctor.requireSync,
          'SSR requires `@loadable/babel-plugin`, please install it',
        )

        // Server-side
        if (props.__chunkExtractor) {
          // This module has been marked with no SSR
          if (options.ssr === false) {
            return
          }

          // We run load function, we assume that it won't fail and that it
          // triggers a synchronous loading of the module
          ctor.requireAsync(props).catch(() => null)

          // So we can require now the module synchronously
          this.loadSync()

          if (!options.excludeChunkFromExtractor) {
            props.__chunkExtractor.addChunk(ctor.chunkName(props))
          }
          return
        }

        // Client-side with `isReady` method present (SSR probably)
        // If module is already loaded, we use a synchronous loading
        // Only perform this synchronous loading if the component has not
        // been marked with no SSR, else we risk hydration mismatches
        if (
          options.ssr !== false &&
          // is ready - was loaded in this session
          ((ctor.isReady && ctor.isReady(props)) ||
            // is ready - was loaded during SSR process
            (ctor.chunkName &&
              LOADABLE_SHARED.initialChunks[ctor.chunkName(props)]))
        ) {
          this.loadSync()
        }
      }

      componentDidMount() {
        this.mounted = true

        // retrieve loading promise from a global cache
        const cachedPromise = this.getCache()

        // if promise exists, but rejected - clear cache
        if (cachedPromise && cachedPromise.status === STATUS_REJECTED) {
          this.setCache()
        }

        // component might be resolved synchronously in the constructor
        if (this.state.loading) {
          this.loadAsync()
        }
      }

      componentDidUpdate(prevProps, prevState) {
        // Component has to be reloaded on cacheKey change
        if (prevState.cacheKey !== this.state.cacheKey) {
          this.loadAsync()
        }
      }

      componentWillUnmount() {
        this.mounted = false
      }

      safeSetState(nextState, callback) {
        if (this.mounted) {
          this.setState(nextState, callback)
        }
      }

      /**
       * returns a cache key for the current props
       * @returns {Component|string}
       */
      getCacheKey() {
        return getCacheKey(this.props)
      }

      /**
       * access the persistent cache
       */
      getCache() {
        return cache[this.getCacheKey()]
      }

      /**
       * sets the cache value. If called without value sets it as undefined
       */
      setCache(value = undefined) {
        cache[this.getCacheKey()] = value
      }

      triggerOnLoad() {
        if (onLoad) {
          setTimeout(() => {
            onLoad(this.state.result, this.props)
          })
        }
      }

      /**
       * Synchronously loads component
       * target module is expected to already exists in the module cache
       * or be capable to resolve synchronously (webpack target=node)
       */
      loadSync() {
        // load sync is expecting component to be in the "loading" state already
        // sounds weird, but loading=true is the initial state of InnerLoadable
        if (!this.state.loading) return

        try {
          const loadedModule = ctor.requireSync(this.props)
          const result = resolve(loadedModule, this.props, Loadable)
          this.state.result = result
          this.state.loading = false
        } catch (error) {
          console.error(
            'loadable-components: failed to synchronously load component, which expected to be available',
            {
              fileName: ctor.resolve(this.props),
              chunkName: ctor.chunkName(this.props),
              error: error ? error.message : error,
            },
          )
          this.state.error = error
        }
      }

      /**
       * Asynchronously loads a component.
       */
      loadAsync() {
        const promise = this.resolveAsync()

        promise
          .then(loadedModule => {
            const result = resolve(loadedModule, this.props, { Loadable })
            this.safeSetState(
              {
                result,
                loading: false,
              },
              () => this.triggerOnLoad(),
            )
          })
          .catch(error => this.safeSetState({ error, loading: false }))

        return promise
      }

      /**
       * Asynchronously resolves(not loads) a component.
       * Note - this function does not change the state
       */
      resolveAsync() {
        const { __chunkExtractor, forwardedRef, ...props } = this.props

        let promise = this.getCache()

        if (!promise) {
          promise = ctor.requireAsync(props)
          promise.status = STATUS_PENDING

          this.setCache(promise)

          promise.then(
            () => {
              promise.status = STATUS_RESOLVED
            },
            error => {
              console.error(
                'loadable-components: failed to asynchronously load component',
                {
                  fileName: ctor.resolve(this.props),
                  chunkName: ctor.chunkName(this.props),
                  error: error ? error.message : error,
                },
              )
              promise.status = STATUS_REJECTED
            },
          )
        }

        return promise
      }

      render() {
        const {
          forwardedRef,
          fallback: propFallback,
          __chunkExtractor,
          ...props
        } = this.props
        const { error, loading, result } = this.state

        if (options.suspense) {
          const cachedPromise = this.getCache() || this.loadAsync()
          if (cachedPromise.status === STATUS_PENDING) {
            throw this.loadAsync()
          }
        }

        if (error) {
          throw error
        }

        const fallback = propFallback || options.fallback || null

        if (loading) {
          return fallback
        }

        return render({
          fallback,
          result,
          options,
          props: { ...props, ref: forwardedRef },
        })
      }
    }

    const EnhancedInnerLoadable = withChunkExtractor(InnerLoadable)
    const Loadable = React.forwardRef((props, ref) => (
      <EnhancedInnerLoadable forwardedRef={ref} {...props} />
    ))

    Loadable.displayName = 'Loadable'

    // In future, preload could use `<link rel="preload">`
    Loadable.preload = props => {
      ctor.requireAsync(props)
    }

    Loadable.load = props => ctor.requireAsync(props)

    return Loadable
  }

  function lazy(ctor, options) {
    return loadable(ctor, { ...options, suspense: true })
  }

  return { loadable, lazy }
}

export default createLoadable
