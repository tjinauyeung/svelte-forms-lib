
(function(l, i, v, e) { v = l.createElement(i); v.async = 1; v.src = '//' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; e = l.getElementsByTagName(i)[0]; e.parentNode.insertBefore(v, e)})(document, 'script');
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function subscribe(store, callback) {
        const unsub = store.subscribe(callback);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, fn) {
        return definition[1]
            ? assign({}, assign(ctx.$$scope.ctx, definition[1](fn ? fn(ctx) : {})))
            : ctx.$$scope.ctx;
    }
    function get_slot_changes(definition, ctx, changed, fn) {
        return definition[1]
            ? assign({}, assign(ctx.$$scope.changed || {}, definition[1](fn ? fn(changed) : {})))
            : ctx.$$scope.changed || {};
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function set_attributes(node, attributes) {
        for (const key in attributes) {
            if (key === 'style') {
                node.style.cssText = attributes[key];
            }
            else if (key in node) {
                node[key] = attributes[key];
            }
            else {
                attr(node, key, attributes[key]);
            }
        }
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.data !== data)
            text.data = data;
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = current_component;
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined' ? window : global);

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        if (component.$$.fragment) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, value) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_update);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function unwrapExports (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var dist = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, '__esModule', { value: true });

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function subscribe(store, callback) {
        const unsub = store.subscribe(callback);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, fn) {
        return definition[1]
            ? assign({}, assign(ctx.$$scope.ctx, definition[1](fn ? fn(ctx) : {})))
            : ctx.$$scope.ctx;
    }
    function get_slot_changes(definition, ctx, changed, fn) {
        return definition[1]
            ? assign({}, assign(ctx.$$scope.changed || {}, definition[1](fn ? fn(changed) : {})))
            : ctx.$$scope.changed || {};
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function set_attributes(node, attributes) {
        for (const key in attributes) {
            if (key === 'style') {
                node.style.cssText = attributes[key];
            }
            else if (key in node) {
                node[key] = attributes[key];
            }
            else {
                attr(node, key, attributes[key]);
            }
        }
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.data !== data)
            text.data = data;
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        if (component.$$.fragment) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, value) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_update);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe,
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    /**
     * Derived value store by synchronizing one or more readable stores and
     * applying an aggregation function over its input values.
     * @param {Stores} stores input stores
     * @param {function(Stores=, function(*)=):*}fn function callback that aggregates the values
     * @param {*=}initial_value when used asynchronously
     */
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => store.subscribe((value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    /**
     * Based on Kendo UI Core expression code <https://github.com/telerik/kendo-ui-core#license-information>
     */

    function Cache(maxSize) {
      this._maxSize = maxSize;
      this.clear();
    }
    Cache.prototype.clear = function() {
      this._size = 0;
      this._values = {};
    };
    Cache.prototype.get = function(key) {
      return this._values[key]
    };
    Cache.prototype.set = function(key, value) {
      this._size >= this._maxSize && this.clear();
      if (!this._values.hasOwnProperty(key)) {
        this._size++;
      }
      return this._values[key] = value
    };

    var SPLIT_REGEX = /[^.^\]^[]+|(?=\[\]|\.\.)/g,
      DIGIT_REGEX = /^\d+$/,
      LEAD_DIGIT_REGEX = /^\d/,
      SPEC_CHAR_REGEX = /[~`!#$%\^&*+=\-\[\]\\';,/{}|\\":<>\?]/g,
      CLEAN_QUOTES_REGEX = /^\s*(['"]?)(.*?)(\1)\s*$/,
      MAX_CACHE_SIZE = 512;

    var contentSecurityPolicy = false,
      pathCache = new Cache(MAX_CACHE_SIZE),
      setCache = new Cache(MAX_CACHE_SIZE),
      getCache = new Cache(MAX_CACHE_SIZE);

    try {
      new Function('');
    } catch (error) {
      contentSecurityPolicy = true;
    }

    var propertyExpr = {
      Cache: Cache,

      expr: expr,

      split: split,

      normalizePath: normalizePath,

      setter: contentSecurityPolicy
        ? function(path) {
          var parts = normalizePath(path);
          return function(data, value) {
            return setterFallback(parts, data, value)
          }
        }
        : function(path) {
          return setCache.get(path) || setCache.set(
            path,
            new Function(
              'data, value',
              expr(path, 'data') + ' = value'
            )
          )
        },

      getter: contentSecurityPolicy
        ? function(path, safe) {
          var parts = normalizePath(path);
          return function(data) {
            return getterFallback(parts, safe, data)
          }
        }
        : function(path, safe) {
          var key = path + '_' + safe;
          return getCache.get(key) || getCache.set(
            key,
            new Function('data', 'return ' + expr(path, safe, 'data'))
          )
        },

      join: function(segments) {
        return segments.reduce(function(path, part) {
          return (
            path +
            (isQuoted(part) || DIGIT_REGEX.test(part)
              ? '[' + part + ']'
              : (path ? '.' : '') + part)
          )
        }, '')
      },

      forEach: function(path, cb, thisArg) {
        forEach(split(path), cb, thisArg);
      }
    };

    function setterFallback(parts, data, value) {
      var index = 0,
        len = parts.length;
      while (index < len - 1) {
        data = data[parts[index++]];
      }
      data[parts[index]] = value;
    }

    function getterFallback(parts, safe, data) {
      var index = 0,
        len = parts.length;
      while (index < len) {
        if (data != null || !safe) {
          data = data[parts[index++]];
        } else {
          return
        }
      }
      return data
    }

    function normalizePath(path) {
      return pathCache.get(path) || pathCache.set(
        path,
        split(path).map(function(part) {
          return part.replace(CLEAN_QUOTES_REGEX, '$2')
        })
      )
    }

    function split(path) {
      return path.match(SPLIT_REGEX)
    }

    function expr(expression, safe, param) {
      expression = expression || '';

      if (typeof safe === 'string') {
        param = safe;
        safe = false;
      }

      param = param || 'data';

      if (expression && expression.charAt(0) !== '[') expression = '.' + expression;

      return safe ? makeSafe(expression, param) : param + expression
    }

    function forEach(parts, iter, thisArg) {
      var len = parts.length,
        part,
        idx,
        isArray,
        isBracket;

      for (idx = 0; idx < len; idx++) {
        part = parts[idx];

        if (part) {
          if (shouldBeQuoted(part)) {
            part = '"' + part + '"';
          }

          isBracket = isQuoted(part);
          isArray = !isBracket && /^\d+$/.test(part);

          iter.call(thisArg, part, isBracket, isArray, idx, parts);
        }
      }
    }

    function isQuoted(str) {
      return (
        typeof str === 'string' && str && ["'", '"'].indexOf(str.charAt(0)) !== -1
      )
    }

    function makeSafe(path, param) {
      var result = param,
        parts = split(path),
        isLast;

      forEach(parts, function(part, isBracket, isArray, idx, parts) {
        isLast = idx === parts.length - 1;

        part = isBracket || isArray ? '[' + part + ']' : '.' + part;

        result += part + (!isLast ? ' || {})' : ')');
      });

      return new Array(parts.length + 1).join('(') + result
    }

    function hasLeadingNumber(part) {
      return part.match(LEAD_DIGIT_REGEX) && !part.match(DIGIT_REGEX)
    }

    function hasSpecialChars(part) {
      return SPEC_CHAR_REGEX.test(part)
    }

    function shouldBeQuoted(part) {
      return !isQuoted(part) && (hasLeadingNumber(part) || hasSpecialChars(part))
    }
    var propertyExpr_8 = propertyExpr.forEach;

    function subscribeOnce(observable) {
      return new Promise(resolve => {
        observable.subscribe(resolve)(); // immediately invoke to unsubscribe
      });
    }

    function update$1(obj, path, val) {
      obj.update(o => {
        set(o, path, val);
        return o;
      });
    }

    function cloneDeep(obj) {
      return JSON.parse(JSON.stringify(obj));
    }

    function isEmpty(obj) {
      return Object.keys(obj).length <= 0;
    }

    function getValues(obj) {
      let result = [];
      for (const key in obj) {
        result = result.concat(typeof obj[key] === "object" ? getValues(obj[key]) : obj[key]);
      }
      return result;
    }

    function assignDeep(obj, val) {
      if (Array.isArray(obj)) {
        return obj.map(o => assignDeep(o, val));
      }
      const copy = {};
      for (const key in obj) {
        copy[key] = typeof obj[key] === "object" ? assignDeep(obj[key], val) : val;
      }
      return copy;
    }

    function has(object, key) {
      return object != null && Object.prototype.hasOwnProperty.call(object, key);
    }

    function set(obj, path, value) {
      if (Object(obj) !== obj) return obj;
      if (!Array.isArray(path)) {
        path = path.toString().match(/[^.[\]]+/g) || [];
      }
      const res = path
        .slice(0, -1)
        .reduce(
          (acc, key, index) =>
            Object(acc[key]) === acc[key]
              ? acc[key]
              : (acc[key] = Math.abs(path[index + 1]) >> 0 === +path[index + 1] ? [] : {}),
          obj
        );
      res[path[path.length - 1]] = value;
      return obj;
    }

    // Implementation of yup.reach
    // TODO rewrite to simpler version and remove dependency on forEach
    function reach(obj, path, value, context) {
      return getIn(obj, path, value, context).schema;
    }

    function trim(part) {
      return part.substr(0, part.length - 1).substr(1);
    }

    function getIn(schema, path, value, context) {
      let parent, lastPart;

      context = context || value;

      if (!path)
        return {
          parent,
          parentPath: path,
          schema
        };

      propertyExpr_8(path, (_part, isBracket, isArray) => {
        let part = isBracket ? trim(_part) : _part;

        if (isArray || has(schema, "_subType")) {
          let index = isArray ? parseInt(part, 10) : 0;
          schema = schema.resolve({ context, parent, value })._subType;
          if (value) {
            value = value[index];
          }
        }

        if (!isArray) {
          schema = schema.resolve({ context, parent, value });
          schema = schema.fields[part];
          parent = value;
          value = value && value[part];
          lastPart = part;
        }
      });

      return { schema, parent, parentPath: lastPart };
    }

    const util = {
      subscribeOnce,
      update: update$1,
      cloneDeep,
      isEmpty,
      assignDeep,
      reach,
      getValues
    };

    const NO_ERROR = "";
    const IS_TOUCHED = true;

    const createForm = config => {
      const initialValues = config.initialValues || {};

      if (Object.keys(initialValues).length < 1) {
        const provided = JSON.stringify(initialValues);
        console.warn(
          `createForm requires initialValues to be a non empty object or array, provided ${provided}`
        );
        return;
      }

      const validationSchema = config.validationSchema;
      const validateFn = config.validate;
      const onSubmit = config.onSubmit;

      const initial = {
        values: () => util.cloneDeep(initialValues),
        errors: () => util.assignDeep(initialValues, NO_ERROR),
        touched: () => util.assignDeep(initialValues, !IS_TOUCHED)
      };

      const form = writable(initial.values());
      const errors = writable(initial.errors());
      const touched = writable(initial.touched());

      const isSubmitting = writable(false);
      const isValidating = writable(false);

      const isValid = derived([errors, touched], ([$errors, $touched]) => {
        const allTouched = util.getValues($touched).every(field => field === IS_TOUCHED);
        const noErrors = util.getValues($errors).every(field => field === NO_ERROR);
        return allTouched && noErrors;
      });

      function handleChange(event) {
        const { name: field, value } = event.target;

        updateTouched(field, true);

        if (validationSchema) {
          isValidating.set(true);
          return util
            .reach(validationSchema, field)
            .validate(value)
            .then(() => util.update(errors, field, ""))
            .catch(err => util.update(errors, field, err.message))
            .finally(() => {
              updateField(field, value);
              isValidating.set(false);
            });
        }

        updateField(field, value);
      }

      function handleSubmit(ev) {
        if (ev && ev.preventDefault) {
          ev.preventDefault();
        }

        isSubmitting.set(true);

        return util.subscribeOnce(form).then(values => {
          if (typeof validateFn === "function") {
            isValidating.set(true);

            return Promise.resolve()
              .then(() => validateFn(values))
              .then(err => {
                if (util.isEmpty(err)) {
                  clearErrorsAndSubmit(values);
                } else {
                  errors.set(err);
                  isValidating.set(false);
                }
              });
          }

          if (validationSchema) {
            isValidating.set(true);

            return validationSchema
              .validate(values, { abortEarly: false })
              .then(() => clearErrorsAndSubmit(values))
              .catch(yupErrs => {
                if (yupErrs && yupErrs.inner) {
                  yupErrs.inner.forEach(error => util.update(errors, error.path, error.message));
                }
                isSubmitting.set(false);
              })
              .finally(() => isValidating.set(false));
          }

          clearErrorsAndSubmit(values);
        });
      }

      function handleReset() {
        form.set(initial.values());
        errors.set(initial.errors());
        touched.set(initial.touched());
      }

      function clearErrorsAndSubmit(values) {
        return Promise.resolve()
          .then(() => errors.set(util.assignDeep(values, "")))
          .then(() => onSubmit(values, form, errors))
          .finally(() => isSubmitting.set(false));
      }

      /**
       * Handler to imperatively update the value of a form field
       */
      function updateField(field, value) {
        util.update(form, field, value);
      }

      /**
       * Handler to imperatively update the touched value of a form field
       */
      function updateTouched(field, value) {
        util.update(touched, field, value);
      }

      return {
        form,
        errors,
        touched,
        isValid,
        isSubmitting,
        isValidating,
        handleChange,
        handleSubmit,
        handleReset,
        updateField,
        updateTouched,
        state: derived(
          [form, errors, touched, isValid, isValidating, isSubmitting],
          ([$form, $errors, $touched, $isValid, $isValidating, $isSubmitting]) => ({
            form: $form,
            errors: $errors,
            touched: $touched,
            isValid: $isValid,
            isSubmitting: $isSubmitting,
            isValidating: $isValidating
          })
        )
      };
    };

    const key = {};

    /* lib/components/Form.svelte generated by Svelte v3.10.0 */

    const get_default_slot_changes = ({ form, errors, touched, state, handleChange, handleSubmit, updateField, updateTouched }) => ({});
    const get_default_slot_context = ({ form, errors, touched, state, handleChange, handleSubmit, updateField, updateTouched }) => ({
    	form: form,
    	errors: errors,
    	touched: touched,
    	state: state,
    	handleChange: handleChange,
    	handleSubmit: handleSubmit,
    	updateField: updateField,
    	updateTouched: updateTouched
    });

    function create_fragment(ctx) {
    	var form_1, current, dispose;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, get_default_slot_context);

    	var form_1_levels = [
    		ctx.$$props
    	];

    	var form_1_data = {};
    	for (var i = 0; i < form_1_levels.length; i += 1) {
    		form_1_data = assign(form_1_data, form_1_levels[i]);
    	}

    	return {
    		c() {
    			form_1 = element("form");

    			if (default_slot) default_slot.c();

    			set_attributes(form_1, form_1_data);
    			dispose = listen(form_1, "submit", ctx.handleSubmit);
    		},

    		l(nodes) {
    			if (default_slot) default_slot.l(form_1_nodes);
    		},

    		m(target, anchor) {
    			insert(target, form_1, anchor);

    			if (default_slot) {
    				default_slot.m(form_1, null);
    			}

    			current = true;
    		},

    		p(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, get_default_slot_changes),
    					get_slot_context(default_slot_template, ctx, get_default_slot_context)
    				);
    			}

    			set_attributes(form_1, get_spread_update(form_1_levels, [
    				(changed.$$props) && ctx.$$props
    			]));
    		},

    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(form_1);
    			}

    			if (default_slot) default_slot.d(detaching);
    			dispose();
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	

      let { initialValues, validate, validationSchema, onSubmit } = $$props;

      const {
        form,
        errors,
        touched,
        state,
        handleChange,
        handleSubmit,
        updateField,
        updateTouched
      } = createForm({
        initialValues,
        validationSchema,
        validate,
        onSubmit
      });

      setContext(key, {
        form,
        errors,
        touched,
        state,
        handleChange,
        handleSubmit,
        updateField,
        updateTouched
      });

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('initialValues' in $$new_props) $$invalidate('initialValues', initialValues = $$new_props.initialValues);
    		if ('validate' in $$new_props) $$invalidate('validate', validate = $$new_props.validate);
    		if ('validationSchema' in $$new_props) $$invalidate('validationSchema', validationSchema = $$new_props.validationSchema);
    		if ('onSubmit' in $$new_props) $$invalidate('onSubmit', onSubmit = $$new_props.onSubmit);
    		if ('$$scope' in $$new_props) $$invalidate('$$scope', $$scope = $$new_props.$$scope);
    	};

    	return {
    		initialValues,
    		validate,
    		validationSchema,
    		onSubmit,
    		form,
    		errors,
    		touched,
    		state,
    		handleChange,
    		handleSubmit,
    		updateField,
    		updateTouched,
    		$$props,
    		$$props: $$props = exclude_internal_props($$props),
    		$$slots,
    		$$scope
    	};
    }

    class Form extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, ["initialValues", "validate", "validationSchema", "onSubmit"]);
    	}
    }

    /* lib/components/Field.svelte generated by Svelte v3.10.0 */

    function create_fragment$1(ctx) {
    	var input, dispose;

    	var input_levels = [
    		{ type: "text" },
    		{ name: ctx.name },
    		ctx.$$props
    	];

    	var input_data = {};
    	for (var i = 0; i < input_levels.length; i += 1) {
    		input_data = assign(input_data, input_levels[i]);
    	}

    	return {
    		c() {
    			input = element("input");
    			set_attributes(input, input_data);

    			dispose = [
    				listen(input, "input", ctx.input_input_handler),
    				listen(input, "change", ctx.handleChange),
    				listen(input, "blur", ctx.handleChange)
    			];
    		},

    		m(target, anchor) {
    			insert(target, input, anchor);

    			set_input_value(input, ctx.$form[ctx.name]);
    		},

    		p(changed, ctx) {
    			if ((changed.$form || changed.name) && (input.value !== ctx.$form[ctx.name])) set_input_value(input, ctx.$form[ctx.name]);

    			set_attributes(input, get_spread_update(input_levels, [
    				{ type: "text" },
    				(changed.name) && { name: ctx.name },
    				(changed.$$props) && ctx.$$props
    			]));
    		},

    		i: noop,
    		o: noop,

    		d(detaching) {
    			if (detaching) {
    				detach(input);
    			}

    			run_all(dispose);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $form;

    	

      let { name } = $$props;

      const { form, handleChange } = getContext(key); component_subscribe($$self, form, $$value => { $form = $$value; $$invalidate('$form', $form); });

    	function input_input_handler() {
    		form.update($$value => ($$value[name] = this.value, $$value));
    		$$invalidate('name', name);
    	}

    	$$self.$set = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('name' in $$new_props) $$invalidate('name', name = $$new_props.name);
    	};

    	return {
    		name,
    		form,
    		handleChange,
    		$form,
    		$$props,
    		input_input_handler,
    		$$props: $$props = exclude_internal_props($$props)
    	};
    }

    class Field extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, ["name"]);
    	}
    }

    /* lib/components/ErrorMessage.svelte generated by Svelte v3.10.0 */

    // (10:0) {#if $errors[name]}
    function create_if_block(ctx) {
    	var small, t_value = ctx.$errors[ctx.name] + "", t;

    	var small_levels = [
    		ctx.$$props
    	];

    	var small_data = {};
    	for (var i = 0; i < small_levels.length; i += 1) {
    		small_data = assign(small_data, small_levels[i]);
    	}

    	return {
    		c() {
    			small = element("small");
    			t = text(t_value);
    			set_attributes(small, small_data);
    		},

    		m(target, anchor) {
    			insert(target, small, anchor);
    			append(small, t);
    		},

    		p(changed, ctx) {
    			if ((changed.$errors || changed.name) && t_value !== (t_value = ctx.$errors[ctx.name] + "")) {
    				set_data(t, t_value);
    			}

    			set_attributes(small, get_spread_update(small_levels, [
    				(changed.$$props) && ctx.$$props
    			]));
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(small);
    			}
    		}
    	};
    }

    function create_fragment$2(ctx) {
    	var if_block_anchor;

    	var if_block = (ctx.$errors[ctx.name]) && create_if_block(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},

    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},

    		p(changed, ctx) {
    			if (ctx.$errors[ctx.name]) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},

    		i: noop,
    		o: noop,

    		d(detaching) {
    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach(if_block_anchor);
    			}
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $errors;

    	

      let { name } = $$props;

      const { errors } = getContext(key); component_subscribe($$self, errors, $$value => { $errors = $$value; $$invalidate('$errors', $errors); });

    	$$self.$set = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('name' in $$new_props) $$invalidate('name', name = $$new_props.name);
    	};

    	return {
    		name,
    		errors,
    		$errors,
    		$$props,
    		$$props: $$props = exclude_internal_props($$props)
    	};
    }

    class ErrorMessage extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, ["name"]);
    	}
    }

    exports.ErrorMessage = ErrorMessage;
    exports.Field = Field;
    exports.Form = Form;
    exports.createForm = createForm;
    });

    unwrapExports(dist);
    var dist_1 = dist.ErrorMessage;
    var dist_2 = dist.Field;
    var dist_3 = dist.Form;
    var dist_4 = dist.createForm;

    /* docs-src/components/Code.svelte generated by Svelte v3.10.0 */
    const { document: document_1 } = globals;

    function add_css() {
    	var style = element("style");
    	style.id = 'svelte-fncvw8-style';
    	style.textContent = ".wrapper.svelte-fncvw8{position:relative;cursor:pointer}.wrapper.svelte-fncvw8:hover .copy.svelte-fncvw8{opacity:1}.copy.svelte-fncvw8{opacity:0;background:#fff;color:#000;padding:10px 14px;border-radius:4px;display:block;position:absolute;top:20px;right:20px;pointer-events:none}.heading.svelte-fncvw8{position:absolute;text-transform:uppercase;letter-spacing:2px;top:35px;left:40px;font-size:14px;font-weight:bold;color:#c7c7d4}pre.svelte-fncvw8{background:var(--secondary);padding:50px 20px 40px;border-radius:12px;line-height:1.8;overflow:scroll;font-size:16px;color:#fff;font-family:Roboto Mono, monospace}";
    	append(document_1.head, style);
    }

    function create_fragment(ctx) {
    	var div1, h1, t1, pre_1, t2, div0, t3, dispose;

    	return {
    		c() {
    			div1 = element("div");
    			h1 = element("h1");
    			h1.textContent = "code";
    			t1 = space();
    			pre_1 = element("pre");
    			t2 = space();
    			div0 = element("div");
    			t3 = text(ctx.copyText);
    			attr(h1, "class", "heading svelte-fncvw8");
    			attr(pre_1, "class", "svelte-fncvw8");
    			attr(div0, "class", "copy svelte-fncvw8");
    			attr(div1, "class", "wrapper svelte-fncvw8");
    			dispose = listen(pre_1, "click", ctx.copy);
    		},

    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, h1);
    			append(div1, t1);
    			append(div1, pre_1);
    			ctx.pre_1_binding(pre_1);
    			append(div1, t2);
    			append(div1, div0);
    			append(div0, t3);
    		},

    		p(changed, ctx) {
    			if (changed.copyText) {
    				set_data(t3, ctx.copyText);
    			}
    		},

    		i: noop,
    		o: noop,

    		d(detaching) {
    			if (detaching) {
    				detach(div1);
    			}

    			ctx.pre_1_binding(null);
    			dispose();
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let { highlight, source } = $$props;

      let pre;
      onMount(() => {
        pre.innerHTML = highlight; $$invalidate('pre', pre);
      });

      let copyText = "copy";

      function copy() {
        const textarea = document.createElement("textarea");
        document.body.appendChild(textarea);
        textarea.value = source;
        textarea.select();

        try {
          const success = document.execCommand("copy");
          if (success) {
            $$invalidate('copyText', copyText = "copied!");
          }
          setTimeout(() => {
            $$invalidate('copyText', copyText = "copy");
          }, 2000);
        } catch (err) {
          console.log("Oops, unable to copy");
        }

        document.body.removeChild(textarea);
      }

    	function pre_1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('pre', pre = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ('highlight' in $$props) $$invalidate('highlight', highlight = $$props.highlight);
    		if ('source' in $$props) $$invalidate('source', source = $$props.source);
    	};

    	return {
    		highlight,
    		source,
    		pre,
    		copyText,
    		copy,
    		pre_1_binding
    	};
    }

    class Code extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document_1.getElementById("svelte-fncvw8-style")) add_css();
    		init(this, options, instance, create_fragment, safe_not_equal, ["highlight", "source"]);
    	}
    }

    var prism = createCommonjsModule(function (module) {
    /* **********************************************
         Begin prism-core.js
    ********************************************** */

    var _self = (typeof window !== 'undefined')
    	? window   // if in browser
    	: (
    		(typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope)
    		? self // if in worker
    		: {}   // if in node js
    	);

    /**
     * Prism: Lightweight, robust, elegant syntax highlighting
     * MIT license http://www.opensource.org/licenses/mit-license.php/
     * @author Lea Verou http://lea.verou.me
     */

    var Prism = (function (_self){

    // Private helper vars
    var lang = /\blang(?:uage)?-([\w-]+)\b/i;
    var uniqueId = 0;

    var _ = {
    	manual: _self.Prism && _self.Prism.manual,
    	disableWorkerMessageHandler: _self.Prism && _self.Prism.disableWorkerMessageHandler,
    	util: {
    		encode: function (tokens) {
    			if (tokens instanceof Token) {
    				return new Token(tokens.type, _.util.encode(tokens.content), tokens.alias);
    			} else if (Array.isArray(tokens)) {
    				return tokens.map(_.util.encode);
    			} else {
    				return tokens.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\u00a0/g, ' ');
    			}
    		},

    		type: function (o) {
    			return Object.prototype.toString.call(o).slice(8, -1);
    		},

    		objId: function (obj) {
    			if (!obj['__id']) {
    				Object.defineProperty(obj, '__id', { value: ++uniqueId });
    			}
    			return obj['__id'];
    		},

    		// Deep clone a language definition (e.g. to extend it)
    		clone: function deepClone(o, visited) {
    			var clone, id, type = _.util.type(o);
    			visited = visited || {};

    			switch (type) {
    				case 'Object':
    					id = _.util.objId(o);
    					if (visited[id]) {
    						return visited[id];
    					}
    					clone = {};
    					visited[id] = clone;

    					for (var key in o) {
    						if (o.hasOwnProperty(key)) {
    							clone[key] = deepClone(o[key], visited);
    						}
    					}

    					return clone;

    				case 'Array':
    					id = _.util.objId(o);
    					if (visited[id]) {
    						return visited[id];
    					}
    					clone = [];
    					visited[id] = clone;

    					o.forEach(function (v, i) {
    						clone[i] = deepClone(v, visited);
    					});

    					return clone;

    				default:
    					return o;
    			}
    		}
    	},

    	languages: {
    		extend: function (id, redef) {
    			var lang = _.util.clone(_.languages[id]);

    			for (var key in redef) {
    				lang[key] = redef[key];
    			}

    			return lang;
    		},

    		/**
    		 * Insert a token before another token in a language literal
    		 * As this needs to recreate the object (we cannot actually insert before keys in object literals),
    		 * we cannot just provide an object, we need an object and a key.
    		 * @param inside The key (or language id) of the parent
    		 * @param before The key to insert before.
    		 * @param insert Object with the key/value pairs to insert
    		 * @param root The object that contains `inside`. If equal to Prism.languages, it can be omitted.
    		 */
    		insertBefore: function (inside, before, insert, root) {
    			root = root || _.languages;
    			var grammar = root[inside];
    			var ret = {};

    			for (var token in grammar) {
    				if (grammar.hasOwnProperty(token)) {

    					if (token == before) {
    						for (var newToken in insert) {
    							if (insert.hasOwnProperty(newToken)) {
    								ret[newToken] = insert[newToken];
    							}
    						}
    					}

    					// Do not insert token which also occur in insert. See #1525
    					if (!insert.hasOwnProperty(token)) {
    						ret[token] = grammar[token];
    					}
    				}
    			}

    			var old = root[inside];
    			root[inside] = ret;

    			// Update references in other language definitions
    			_.languages.DFS(_.languages, function(key, value) {
    				if (value === old && key != inside) {
    					this[key] = ret;
    				}
    			});

    			return ret;
    		},

    		// Traverse a language definition with Depth First Search
    		DFS: function DFS(o, callback, type, visited) {
    			visited = visited || {};

    			var objId = _.util.objId;

    			for (var i in o) {
    				if (o.hasOwnProperty(i)) {
    					callback.call(o, i, o[i], type || i);

    					var property = o[i],
    					    propertyType = _.util.type(property);

    					if (propertyType === 'Object' && !visited[objId(property)]) {
    						visited[objId(property)] = true;
    						DFS(property, callback, null, visited);
    					}
    					else if (propertyType === 'Array' && !visited[objId(property)]) {
    						visited[objId(property)] = true;
    						DFS(property, callback, i, visited);
    					}
    				}
    			}
    		}
    	},
    	plugins: {},

    	highlightAll: function(async, callback) {
    		_.highlightAllUnder(document, async, callback);
    	},

    	highlightAllUnder: function(container, async, callback) {
    		var env = {
    			callback: callback,
    			selector: 'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code'
    		};

    		_.hooks.run('before-highlightall', env);

    		var elements = container.querySelectorAll(env.selector);

    		for (var i=0, element; element = elements[i++];) {
    			_.highlightElement(element, async === true, env.callback);
    		}
    	},

    	highlightElement: function(element, async, callback) {
    		// Find language
    		var language = 'none', grammar, parent = element;

    		while (parent && !lang.test(parent.className)) {
    			parent = parent.parentNode;
    		}

    		if (parent) {
    			language = (parent.className.match(lang) || [,'none'])[1].toLowerCase();
    			grammar = _.languages[language];
    		}

    		// Set language on the element, if not present
    		element.className = element.className.replace(lang, '').replace(/\s+/g, ' ') + ' language-' + language;

    		if (element.parentNode) {
    			// Set language on the parent, for styling
    			parent = element.parentNode;

    			if (/pre/i.test(parent.nodeName)) {
    				parent.className = parent.className.replace(lang, '').replace(/\s+/g, ' ') + ' language-' + language;
    			}
    		}

    		var code = element.textContent;

    		var env = {
    			element: element,
    			language: language,
    			grammar: grammar,
    			code: code
    		};

    		var insertHighlightedCode = function (highlightedCode) {
    			env.highlightedCode = highlightedCode;

    			_.hooks.run('before-insert', env);

    			env.element.innerHTML = env.highlightedCode;

    			_.hooks.run('after-highlight', env);
    			_.hooks.run('complete', env);
    			callback && callback.call(env.element);
    		};

    		_.hooks.run('before-sanity-check', env);

    		if (!env.code) {
    			_.hooks.run('complete', env);
    			return;
    		}

    		_.hooks.run('before-highlight', env);

    		if (!env.grammar) {
    			insertHighlightedCode(_.util.encode(env.code));
    			return;
    		}

    		if (async && _self.Worker) {
    			var worker = new Worker(_.filename);

    			worker.onmessage = function(evt) {
    				insertHighlightedCode(evt.data);
    			};

    			worker.postMessage(JSON.stringify({
    				language: env.language,
    				code: env.code,
    				immediateClose: true
    			}));
    		}
    		else {
    			insertHighlightedCode(_.highlight(env.code, env.grammar, env.language));
    		}
    	},

    	highlight: function (text, grammar, language) {
    		var env = {
    			code: text,
    			grammar: grammar,
    			language: language
    		};
    		_.hooks.run('before-tokenize', env);
    		env.tokens = _.tokenize(env.code, env.grammar);
    		_.hooks.run('after-tokenize', env);
    		return Token.stringify(_.util.encode(env.tokens), env.language);
    	},

    	matchGrammar: function (text, strarr, grammar, index, startPos, oneshot, target) {
    		for (var token in grammar) {
    			if(!grammar.hasOwnProperty(token) || !grammar[token]) {
    				continue;
    			}

    			if (token == target) {
    				return;
    			}

    			var patterns = grammar[token];
    			patterns = (_.util.type(patterns) === "Array") ? patterns : [patterns];

    			for (var j = 0; j < patterns.length; ++j) {
    				var pattern = patterns[j],
    					inside = pattern.inside,
    					lookbehind = !!pattern.lookbehind,
    					greedy = !!pattern.greedy,
    					lookbehindLength = 0,
    					alias = pattern.alias;

    				if (greedy && !pattern.pattern.global) {
    					// Without the global flag, lastIndex won't work
    					var flags = pattern.pattern.toString().match(/[imuy]*$/)[0];
    					pattern.pattern = RegExp(pattern.pattern.source, flags + "g");
    				}

    				pattern = pattern.pattern || pattern;

    				// Don’t cache length as it changes during the loop
    				for (var i = index, pos = startPos; i < strarr.length; pos += strarr[i].length, ++i) {

    					var str = strarr[i];

    					if (strarr.length > text.length) {
    						// Something went terribly wrong, ABORT, ABORT!
    						return;
    					}

    					if (str instanceof Token) {
    						continue;
    					}

    					if (greedy && i != strarr.length - 1) {
    						pattern.lastIndex = pos;
    						var match = pattern.exec(text);
    						if (!match) {
    							break;
    						}

    						var from = match.index + (lookbehind ? match[1].length : 0),
    						    to = match.index + match[0].length,
    						    k = i,
    						    p = pos;

    						for (var len = strarr.length; k < len && (p < to || (!strarr[k].type && !strarr[k - 1].greedy)); ++k) {
    							p += strarr[k].length;
    							// Move the index i to the element in strarr that is closest to from
    							if (from >= p) {
    								++i;
    								pos = p;
    							}
    						}

    						// If strarr[i] is a Token, then the match starts inside another Token, which is invalid
    						if (strarr[i] instanceof Token) {
    							continue;
    						}

    						// Number of tokens to delete and replace with the new match
    						delNum = k - i;
    						str = text.slice(pos, p);
    						match.index -= pos;
    					} else {
    						pattern.lastIndex = 0;

    						var match = pattern.exec(str),
    							delNum = 1;
    					}

    					if (!match) {
    						if (oneshot) {
    							break;
    						}

    						continue;
    					}

    					if(lookbehind) {
    						lookbehindLength = match[1] ? match[1].length : 0;
    					}

    					var from = match.index + lookbehindLength,
    					    match = match[0].slice(lookbehindLength),
    					    to = from + match.length,
    					    before = str.slice(0, from),
    					    after = str.slice(to);

    					var args = [i, delNum];

    					if (before) {
    						++i;
    						pos += before.length;
    						args.push(before);
    					}

    					var wrapped = new Token(token, inside? _.tokenize(match, inside) : match, alias, match, greedy);

    					args.push(wrapped);

    					if (after) {
    						args.push(after);
    					}

    					Array.prototype.splice.apply(strarr, args);

    					if (delNum != 1)
    						_.matchGrammar(text, strarr, grammar, i, pos, true, token);

    					if (oneshot)
    						break;
    				}
    			}
    		}
    	},

    	tokenize: function(text, grammar) {
    		var strarr = [text];

    		var rest = grammar.rest;

    		if (rest) {
    			for (var token in rest) {
    				grammar[token] = rest[token];
    			}

    			delete grammar.rest;
    		}

    		_.matchGrammar(text, strarr, grammar, 0, 0, false);

    		return strarr;
    	},

    	hooks: {
    		all: {},

    		add: function (name, callback) {
    			var hooks = _.hooks.all;

    			hooks[name] = hooks[name] || [];

    			hooks[name].push(callback);
    		},

    		run: function (name, env) {
    			var callbacks = _.hooks.all[name];

    			if (!callbacks || !callbacks.length) {
    				return;
    			}

    			for (var i=0, callback; callback = callbacks[i++];) {
    				callback(env);
    			}
    		}
    	},

    	Token: Token
    };

    _self.Prism = _;

    function Token(type, content, alias, matchedStr, greedy) {
    	this.type = type;
    	this.content = content;
    	this.alias = alias;
    	// Copy of the full string this token was created from
    	this.length = (matchedStr || "").length|0;
    	this.greedy = !!greedy;
    }

    Token.stringify = function(o, language) {
    	if (typeof o == 'string') {
    		return o;
    	}

    	if (Array.isArray(o)) {
    		return o.map(function(element) {
    			return Token.stringify(element, language);
    		}).join('');
    	}

    	var env = {
    		type: o.type,
    		content: Token.stringify(o.content, language),
    		tag: 'span',
    		classes: ['token', o.type],
    		attributes: {},
    		language: language
    	};

    	if (o.alias) {
    		var aliases = Array.isArray(o.alias) ? o.alias : [o.alias];
    		Array.prototype.push.apply(env.classes, aliases);
    	}

    	_.hooks.run('wrap', env);

    	var attributes = Object.keys(env.attributes).map(function(name) {
    		return name + '="' + (env.attributes[name] || '').replace(/"/g, '&quot;') + '"';
    	}).join(' ');

    	return '<' + env.tag + ' class="' + env.classes.join(' ') + '"' + (attributes ? ' ' + attributes : '') + '>' + env.content + '</' + env.tag + '>';
    };

    if (!_self.document) {
    	if (!_self.addEventListener) {
    		// in Node.js
    		return _;
    	}

    	if (!_.disableWorkerMessageHandler) {
    		// In worker
    		_self.addEventListener('message', function (evt) {
    			var message = JSON.parse(evt.data),
    				lang = message.language,
    				code = message.code,
    				immediateClose = message.immediateClose;

    			_self.postMessage(_.highlight(code, _.languages[lang], lang));
    			if (immediateClose) {
    				_self.close();
    			}
    		}, false);
    	}

    	return _;
    }

    //Get current script and highlight
    var script = document.currentScript || [].slice.call(document.getElementsByTagName("script")).pop();

    if (script) {
    	_.filename = script.src;

    	if (!_.manual && !script.hasAttribute('data-manual')) {
    		if(document.readyState !== "loading") {
    			if (window.requestAnimationFrame) {
    				window.requestAnimationFrame(_.highlightAll);
    			} else {
    				window.setTimeout(_.highlightAll, 16);
    			}
    		}
    		else {
    			document.addEventListener('DOMContentLoaded', _.highlightAll);
    		}
    	}
    }

    return _;

    })(_self);

    if ( module.exports) {
    	module.exports = Prism;
    }

    // hack for components to work correctly in node.js
    if (typeof commonjsGlobal !== 'undefined') {
    	commonjsGlobal.Prism = Prism;
    }


    /* **********************************************
         Begin prism-markup.js
    ********************************************** */

    Prism.languages.markup = {
    	'comment': /<!--[\s\S]*?-->/,
    	'prolog': /<\?[\s\S]+?\?>/,
    	'doctype': /<!DOCTYPE[\s\S]+?>/i,
    	'cdata': /<!\[CDATA\[[\s\S]*?]]>/i,
    	'tag': {
    		pattern: /<\/?(?!\d)[^\s>\/=$<%]+(?:\s(?:\s*[^\s>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?=[\s/>])))+)?\s*\/?>/i,
    		greedy: true,
    		inside: {
    			'tag': {
    				pattern: /^<\/?[^\s>\/]+/i,
    				inside: {
    					'punctuation': /^<\/?/,
    					'namespace': /^[^\s>\/:]+:/
    				}
    			},
    			'attr-value': {
    				pattern: /=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+)/i,
    				inside: {
    					'punctuation': [
    						/^=/,
    						{
    							pattern: /^(\s*)["']|["']$/,
    							lookbehind: true
    						}
    					]
    				}
    			},
    			'punctuation': /\/?>/,
    			'attr-name': {
    				pattern: /[^\s>\/]+/,
    				inside: {
    					'namespace': /^[^\s>\/:]+:/
    				}
    			}

    		}
    	},
    	'entity': /&#?[\da-z]{1,8};/i
    };

    Prism.languages.markup['tag'].inside['attr-value'].inside['entity'] =
    	Prism.languages.markup['entity'];

    // Plugin to make entity title show the real entity, idea by Roman Komarov
    Prism.hooks.add('wrap', function(env) {

    	if (env.type === 'entity') {
    		env.attributes['title'] = env.content.replace(/&amp;/, '&');
    	}
    });

    Object.defineProperty(Prism.languages.markup.tag, 'addInlined', {
    	/**
    	 * Adds an inlined language to markup.
    	 *
    	 * An example of an inlined language is CSS with `<style>` tags.
    	 *
    	 * @param {string} tagName The name of the tag that contains the inlined language. This name will be treated as
    	 * case insensitive.
    	 * @param {string} lang The language key.
    	 * @example
    	 * addInlined('style', 'css');
    	 */
    	value: function addInlined(tagName, lang) {
    		var includedCdataInside = {};
    		includedCdataInside['language-' + lang] = {
    			pattern: /(^<!\[CDATA\[)[\s\S]+?(?=\]\]>$)/i,
    			lookbehind: true,
    			inside: Prism.languages[lang]
    		};
    		includedCdataInside['cdata'] = /^<!\[CDATA\[|\]\]>$/i;

    		var inside = {
    			'included-cdata': {
    				pattern: /<!\[CDATA\[[\s\S]*?\]\]>/i,
    				inside: includedCdataInside
    			}
    		};
    		inside['language-' + lang] = {
    			pattern: /[\s\S]+/,
    			inside: Prism.languages[lang]
    		};

    		var def = {};
    		def[tagName] = {
    			pattern: RegExp(/(<__[\s\S]*?>)(?:<!\[CDATA\[[\s\S]*?\]\]>\s*|[\s\S])*?(?=<\/__>)/.source.replace(/__/g, tagName), 'i'),
    			lookbehind: true,
    			greedy: true,
    			inside: inside
    		};

    		Prism.languages.insertBefore('markup', 'cdata', def);
    	}
    });

    Prism.languages.xml = Prism.languages.extend('markup', {});
    Prism.languages.html = Prism.languages.markup;
    Prism.languages.mathml = Prism.languages.markup;
    Prism.languages.svg = Prism.languages.markup;


    /* **********************************************
         Begin prism-css.js
    ********************************************** */

    (function (Prism) {

    	var string = /("|')(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/;

    	Prism.languages.css = {
    		'comment': /\/\*[\s\S]*?\*\//,
    		'atrule': {
    			pattern: /@[\w-]+[\s\S]*?(?:;|(?=\s*\{))/,
    			inside: {
    				'rule': /@[\w-]+/
    				// See rest below
    			}
    		},
    		'url': {
    			pattern: RegExp('url\\((?:' + string.source + '|[^\n\r()]*)\\)', 'i'),
    			inside: {
    				'function': /^url/i,
    				'punctuation': /^\(|\)$/
    			}
    		},
    		'selector': RegExp('[^{}\\s](?:[^{};"\']|' + string.source + ')*?(?=\\s*\\{)'),
    		'string': {
    			pattern: string,
    			greedy: true
    		},
    		'property': /[-_a-z\xA0-\uFFFF][-\w\xA0-\uFFFF]*(?=\s*:)/i,
    		'important': /!important\b/i,
    		'function': /[-a-z0-9]+(?=\()/i,
    		'punctuation': /[(){};:,]/
    	};

    	Prism.languages.css['atrule'].inside.rest = Prism.languages.css;

    	var markup = Prism.languages.markup;
    	if (markup) {
    		markup.tag.addInlined('style', 'css');

    		Prism.languages.insertBefore('inside', 'attr-value', {
    			'style-attr': {
    				pattern: /\s*style=("|')(?:\\[\s\S]|(?!\1)[^\\])*\1/i,
    				inside: {
    					'attr-name': {
    						pattern: /^\s*style/i,
    						inside: markup.tag.inside
    					},
    					'punctuation': /^\s*=\s*['"]|['"]\s*$/,
    					'attr-value': {
    						pattern: /.+/i,
    						inside: Prism.languages.css
    					}
    				},
    				alias: 'language-css'
    			}
    		}, markup.tag);
    	}

    }(Prism));


    /* **********************************************
         Begin prism-clike.js
    ********************************************** */

    Prism.languages.clike = {
    	'comment': [
    		{
    			pattern: /(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,
    			lookbehind: true
    		},
    		{
    			pattern: /(^|[^\\:])\/\/.*/,
    			lookbehind: true,
    			greedy: true
    		}
    	],
    	'string': {
    		pattern: /(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
    		greedy: true
    	},
    	'class-name': {
    		pattern: /((?:\b(?:class|interface|extends|implements|trait|instanceof|new)\s+)|(?:catch\s+\())[\w.\\]+/i,
    		lookbehind: true,
    		inside: {
    			punctuation: /[.\\]/
    		}
    	},
    	'keyword': /\b(?:if|else|while|do|for|return|in|instanceof|function|new|try|throw|catch|finally|null|break|continue)\b/,
    	'boolean': /\b(?:true|false)\b/,
    	'function': /\w+(?=\()/,
    	'number': /\b0x[\da-f]+\b|(?:\b\d+\.?\d*|\B\.\d+)(?:e[+-]?\d+)?/i,
    	'operator': /--?|\+\+?|!=?=?|<=?|>=?|==?=?|&&?|\|\|?|\?|\*|\/|~|\^|%/,
    	'punctuation': /[{}[\];(),.:]/
    };


    /* **********************************************
         Begin prism-javascript.js
    ********************************************** */

    Prism.languages.javascript = Prism.languages.extend('clike', {
    	'class-name': [
    		Prism.languages.clike['class-name'],
    		{
    			pattern: /(^|[^$\w\xA0-\uFFFF])[_$A-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\.(?:prototype|constructor))/,
    			lookbehind: true
    		}
    	],
    	'keyword': [
    		{
    			pattern: /((?:^|})\s*)(?:catch|finally)\b/,
    			lookbehind: true
    		},
    		{
    			pattern: /(^|[^.])\b(?:as|async(?=\s*(?:function\b|\(|[$\w\xA0-\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\b/,
    			lookbehind: true
    		},
    	],
    	'number': /\b(?:(?:0[xX](?:[\dA-Fa-f](?:_[\dA-Fa-f])?)+|0[bB](?:[01](?:_[01])?)+|0[oO](?:[0-7](?:_[0-7])?)+)n?|(?:\d(?:_\d)?)+n|NaN|Infinity)\b|(?:\b(?:\d(?:_\d)?)+\.?(?:\d(?:_\d)?)*|\B\.(?:\d(?:_\d)?)+)(?:[Ee][+-]?(?:\d(?:_\d)?)+)?/,
    	// Allow for all non-ASCII characters (See http://stackoverflow.com/a/2008444)
    	'function': /#?[_$a-zA-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\s*(?:\.\s*(?:apply|bind|call)\s*)?\()/,
    	'operator': /-[-=]?|\+[+=]?|!=?=?|<<?=?|>>?>?=?|=(?:==?|>)?|&[&=]?|\|[|=]?|\*\*?=?|\/=?|~|\^=?|%=?|\?|\.{3}/
    });

    Prism.languages.javascript['class-name'][0].pattern = /(\b(?:class|interface|extends|implements|instanceof|new)\s+)[\w.\\]+/;

    Prism.languages.insertBefore('javascript', 'keyword', {
    	'regex': {
    		pattern: /((?:^|[^$\w\xA0-\uFFFF."'\])\s])\s*)\/(\[(?:[^\]\\\r\n]|\\.)*]|\\.|[^/\\\[\r\n])+\/[gimyus]{0,6}(?=\s*($|[\r\n,.;})\]]))/,
    		lookbehind: true,
    		greedy: true
    	},
    	// This must be declared before keyword because we use "function" inside the look-forward
    	'function-variable': {
    		pattern: /#?[_$a-zA-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\s*[=:]\s*(?:async\s*)?(?:\bfunction\b|(?:\((?:[^()]|\([^()]*\))*\)|[_$a-zA-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*)\s*=>))/,
    		alias: 'function'
    	},
    	'parameter': [
    		{
    			pattern: /(function(?:\s+[_$A-Za-z\xA0-\uFFFF][$\w\xA0-\uFFFF]*)?\s*\(\s*)(?!\s)(?:[^()]|\([^()]*\))+?(?=\s*\))/,
    			lookbehind: true,
    			inside: Prism.languages.javascript
    		},
    		{
    			pattern: /[_$a-z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\s*=>)/i,
    			inside: Prism.languages.javascript
    		},
    		{
    			pattern: /(\(\s*)(?!\s)(?:[^()]|\([^()]*\))+?(?=\s*\)\s*=>)/,
    			lookbehind: true,
    			inside: Prism.languages.javascript
    		},
    		{
    			pattern: /((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:[_$A-Za-z\xA0-\uFFFF][$\w\xA0-\uFFFF]*\s*)\(\s*)(?!\s)(?:[^()]|\([^()]*\))+?(?=\s*\)\s*\{)/,
    			lookbehind: true,
    			inside: Prism.languages.javascript
    		}
    	],
    	'constant': /\b[A-Z](?:[A-Z_]|\dx?)*\b/
    });

    Prism.languages.insertBefore('javascript', 'string', {
    	'template-string': {
    		pattern: /`(?:\\[\s\S]|\${(?:[^{}]|{(?:[^{}]|{[^}]*})*})+}|(?!\${)[^\\`])*`/,
    		greedy: true,
    		inside: {
    			'template-punctuation': {
    				pattern: /^`|`$/,
    				alias: 'string'
    			},
    			'interpolation': {
    				pattern: /((?:^|[^\\])(?:\\{2})*)\${(?:[^{}]|{(?:[^{}]|{[^}]*})*})+}/,
    				lookbehind: true,
    				inside: {
    					'interpolation-punctuation': {
    						pattern: /^\${|}$/,
    						alias: 'punctuation'
    					},
    					rest: Prism.languages.javascript
    				}
    			},
    			'string': /[\s\S]+/
    		}
    	}
    });

    if (Prism.languages.markup) {
    	Prism.languages.markup.tag.addInlined('script', 'javascript');
    }

    Prism.languages.js = Prism.languages.javascript;


    /* **********************************************
         Begin prism-file-highlight.js
    ********************************************** */

    (function () {
    	if (typeof self === 'undefined' || !self.Prism || !self.document || !document.querySelector) {
    		return;
    	}

    	/**
    	 * @param {Element} [container=document]
    	 */
    	self.Prism.fileHighlight = function(container) {
    		container = container || document;

    		var Extensions = {
    			'js': 'javascript',
    			'py': 'python',
    			'rb': 'ruby',
    			'ps1': 'powershell',
    			'psm1': 'powershell',
    			'sh': 'bash',
    			'bat': 'batch',
    			'h': 'c',
    			'tex': 'latex'
    		};

    		Array.prototype.slice.call(container.querySelectorAll('pre[data-src]')).forEach(function (pre) {
    			// ignore if already loaded
    			if (pre.hasAttribute('data-src-loaded')) {
    				return;
    			}

    			// load current
    			var src = pre.getAttribute('data-src');

    			var language, parent = pre;
    			var lang = /\blang(?:uage)?-([\w-]+)\b/i;
    			while (parent && !lang.test(parent.className)) {
    				parent = parent.parentNode;
    			}

    			if (parent) {
    				language = (pre.className.match(lang) || [, ''])[1];
    			}

    			if (!language) {
    				var extension = (src.match(/\.(\w+)$/) || [, ''])[1];
    				language = Extensions[extension] || extension;
    			}

    			var code = document.createElement('code');
    			code.className = 'language-' + language;

    			pre.textContent = '';

    			code.textContent = 'Loading…';

    			pre.appendChild(code);

    			var xhr = new XMLHttpRequest();

    			xhr.open('GET', src, true);

    			xhr.onreadystatechange = function () {
    				if (xhr.readyState == 4) {

    					if (xhr.status < 400 && xhr.responseText) {
    						code.textContent = xhr.responseText;

    						Prism.highlightElement(code);
    						// mark as loaded
    						pre.setAttribute('data-src-loaded', '');
    					}
    					else if (xhr.status >= 400) {
    						code.textContent = '✖ Error ' + xhr.status + ' while fetching file: ' + xhr.statusText;
    					}
    					else {
    						code.textContent = '✖ Error: File does not exist or is empty';
    					}
    				}
    			};

    			xhr.send(null);
    		});

    		if (Prism.plugins.toolbar) {
    			Prism.plugins.toolbar.registerButton('download-file', function (env) {
    				var pre = env.element.parentNode;
    				if (!pre || !/pre/i.test(pre.nodeName) || !pre.hasAttribute('data-src') || !pre.hasAttribute('data-download-link')) {
    					return;
    				}
    				var src = pre.getAttribute('data-src');
    				var a = document.createElement('a');
    				a.textContent = pre.getAttribute('data-download-link-label') || 'Download';
    				a.setAttribute('download', '');
    				a.href = src;
    				return a;
    			});
    		}

    	};

    	document.addEventListener('DOMContentLoaded', function () {
    		// execute inside handler, for dropping Event as argument
    		self.Prism.fileHighlight();
    	});

    })();
    });

    const blocks = '(if|else if|await|then|catch|each|html|debug)';

    Prism.languages.svelte = Prism.languages.extend('markup', {
    	each: {
    		pattern: new RegExp(
    			'{#each' + '(?:(?:\\{(?:(?:\\{(?:[^{}])*\\})|(?:[^{}]))*\\})|(?:[^{}]))*}'
    		),
    		inside: {
    			'language-javascript': [
    				{
    					pattern: /(as[\s\S]*)\([\s\S]*\)(?=\s*\})/,
    					lookbehind: true,
    					inside: Prism.languages['javascript'],
    				},
    				{
    					pattern: /(as[\s]*)[\s\S]*(?=\s*)/,
    					lookbehind: true,
    					inside: Prism.languages['javascript'],
    				},
    				{
    					pattern: /(#each[\s]*)[\s\S]*(?=as)/,
    					lookbehind: true,
    					inside: Prism.languages['javascript'],
    				},
    			],
    			keyword: /#each|as/,
    			punctuation: /{|}/,
    		},
    	},
    	block: {
    		pattern: new RegExp(
    			'{[#:/@]/s' +
    				blocks +
    				'(?:(?:\\{(?:(?:\\{(?:[^{}])*\\})|(?:[^{}]))*\\})|(?:[^{}]))*}'
    		),
    		inside: {
    			punctuation: /^{|}$/,
    			keyword: [new RegExp('[#:/@]' + blocks + '( )*'), /as/, /then/],
    			'language-javascript': {
    				pattern: /[\s\S]*/,
    				inside: Prism.languages['javascript'],
    			},
    		},
    	},
    	tag: {
    		pattern: /<\/?(?!\d)[^\s>\/=$<%]+(?:\s(?:\s*[^\s>\/=]+(?:\s*=\s*(?:(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?:"[^"]*"|'[^']*'|{[\s\S]+?}(?=[\s/>])))|(?=[\s/>])))+)?\s*\/?>/i,
    		greedy: true,
    		inside: {
    			tag: {
    				pattern: /^<\/?[^\s>\/]+/i,
    				inside: {
    					punctuation: /^<\/?/,
    					namespace: /^[^\s>\/:]+:/,
    				},
    			},
    			'language-javascript': {
    				pattern: /\{(?:(?:\{(?:(?:\{(?:[^{}])*\})|(?:[^{}]))*\})|(?:[^{}]))*\}/,
    				inside: Prism.languages['javascript'],
    			},
    			'attr-value': {
    				pattern: /=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+)/i,
    				inside: {
    					punctuation: [
    						/^=/,
    						{
    							pattern: /^(\s*)["']|["']$/,
    							lookbehind: true,
    						},
    					],
    					'language-javascript': {
    						pattern: /{[\s\S]+}/,
    						inside: Prism.languages['javascript'],
    					},
    				},
    			},
    			punctuation: /\/?>/,
    			'attr-name': {
    				pattern: /[^\s>\/]+/,
    				inside: {
    					namespace: /^[^\s>\/:]+:/,
    				},
    			},
    		},
    	},
    	'language-javascript': {
    		pattern: /\{(?:(?:\{(?:(?:\{(?:[^{}])*\})|(?:[^{}]))*\})|(?:[^{}]))*\}/,
    		lookbehind: true,
    		inside: Prism.languages['javascript'],
    	},
    });

    Prism.languages.svelte['tag'].inside['attr-value'].inside['entity'] =
    	Prism.languages.svelte['entity'];

    Prism.hooks.add('wrap', env => {
    	if (env.type === 'entity') {
    		env.attributes['title'] = env.content.replace(/&amp;/, '&');
    	}
    });

    Object.defineProperty(Prism.languages.svelte.tag, 'addInlined', {
    	value: function addInlined(tagName, lang) {
    		const includedCdataInside = {};
    		includedCdataInside['language-' + lang] = {
    			pattern: /(^<!\[CDATA\[)[\s\S]+?(?=\]\]>$)/i,
    			lookbehind: true,
    			inside: Prism.languages[lang],
    		};
    		includedCdataInside['cdata'] = /^<!\[CDATA\[|\]\]>$/i;

    		const inside = {
    			'included-cdata': {
    				pattern: /<!\[CDATA\[[\s\S]*?\]\]>/i,
    				inside: includedCdataInside,
    			},
    		};
    		inside['language-' + lang] = {
    			pattern: /[\s\S]+/,
    			inside: Prism.languages[lang],
    		};

    		const def = {};
    		def[tagName] = {
    			pattern: RegExp(
    				/(<__[\s\S]*?>)(?:<!\[CDATA\[[\s\S]*?\]\]>\s*|[\s\S])*?(?=<\/__>)/.source.replace(
    					/__/g,
    					tagName
    				),
    				'i'
    			),
    			lookbehind: true,
    			greedy: true,
    			inside,
    		};

    		Prism.languages.insertBefore('svelte', 'cdata', def);
    	},
    });

    Prism.languages.svelte.tag.addInlined('style', 'css');
    Prism.languages.svelte.tag.addInlined('script', 'javascript');

    const source = `
  <script>
    import { createForm } from "svelte-forms-lib";

    const { form, state, handleChange, handleSubmit } = createForm({
      initialValues: {
        name: "",
        email: ""
      },
      onSubmit: values => {
        alert(JSON.stringify(values));
      }
    });
  </script>

  <form on:submit={handleSubmit}>
    <label for="name">name</label>
    <input
      id="name"
      name="name"
      on:change={handleChange}
      bind:value={$form.name}
    />
    <label for="email">email</label>
    <input
      id="email"
      name="email"
      on:change={handleChange}
      bind:value={$form.email}
    />
    <button type="submit">Submit</button>
  </form>
`;

    const highlight = prism.highlight(source, prism.languages.svelte, "svelte");

    /* docs-src/examples/Basic/component.svelte generated by Svelte v3.10.0 */

    function create_fragment$1(ctx) {
    	var h1, t1, hr, t2, p, t4, form_1, label0, t6, input0, t7, label1, t9, input1, t10, button, t12, current, dispose;

    	var code = new Code({
    		props: {
    		source: source,
    		highlight: highlight
    	}
    	});

    	return {
    		c() {
    			h1 = element("h1");
    			h1.textContent = "Basic";
    			t1 = space();
    			hr = element("hr");
    			t2 = space();
    			p = element("p");
    			p.textContent = "Here's an example of a basic form component without validation.";
    			t4 = space();
    			form_1 = element("form");
    			label0 = element("label");
    			label0.textContent = "name:";
    			t6 = space();
    			input0 = element("input");
    			t7 = space();
    			label1 = element("label");
    			label1.textContent = "email:";
    			t9 = space();
    			input1 = element("input");
    			t10 = space();
    			button = element("button");
    			button.textContent = "Submit";
    			t12 = space();
    			code.$$.fragment.c();
    			attr(label0, "for", "name");
    			attr(input0, "id", "name");
    			attr(input0, "name", "name");
    			attr(label1, "for", "email");
    			attr(input1, "id", "email");
    			attr(input1, "name", "email");
    			attr(button, "type", "submit");

    			dispose = [
    				listen(input0, "input", ctx.input0_input_handler),
    				listen(input0, "change", ctx.handleChange),
    				listen(input1, "input", ctx.input1_input_handler),
    				listen(input1, "change", ctx.handleChange),
    				listen(form_1, "submit", ctx.handleSubmit)
    			];
    		},

    		m(target, anchor) {
    			insert(target, h1, anchor);
    			insert(target, t1, anchor);
    			insert(target, hr, anchor);
    			insert(target, t2, anchor);
    			insert(target, p, anchor);
    			insert(target, t4, anchor);
    			insert(target, form_1, anchor);
    			append(form_1, label0);
    			append(form_1, t6);
    			append(form_1, input0);

    			set_input_value(input0, ctx.$form.name);

    			append(form_1, t7);
    			append(form_1, label1);
    			append(form_1, t9);
    			append(form_1, input1);

    			set_input_value(input1, ctx.$form.email);

    			append(form_1, t10);
    			append(form_1, button);
    			insert(target, t12, anchor);
    			mount_component(code, target, anchor);
    			current = true;
    		},

    		p(changed, ctx) {
    			if (changed.$form && (input0.value !== ctx.$form.name)) set_input_value(input0, ctx.$form.name);
    			if (changed.$form && (input1.value !== ctx.$form.email)) set_input_value(input1, ctx.$form.email);

    			var code_changes = {};
    			if (changed.source) code_changes.source = source;
    			if (changed.highlight) code_changes.highlight = highlight;
    			code.$set(code_changes);
    		},

    		i(local) {
    			if (current) return;
    			transition_in(code.$$.fragment, local);

    			current = true;
    		},

    		o(local) {
    			transition_out(code.$$.fragment, local);
    			current = false;
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(h1);
    				detach(t1);
    				detach(hr);
    				detach(t2);
    				detach(p);
    				detach(t4);
    				detach(form_1);
    				detach(t12);
    			}

    			destroy_component(code, detaching);

    			run_all(dispose);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $form;

    	

      const { form, state, handleChange, handleSubmit } = dist_4({
        initialValues: {
          name: "",
          email: ""
        },
        onSubmit: values => {
          alert(JSON.stringify(values, null, 2));
        }
      }); component_subscribe($$self, form, $$value => { $form = $$value; $$invalidate('$form', $form); });

    	function input0_input_handler() {
    		form.update($$value => ($$value.name = this.value, $$value));
    	}

    	function input1_input_handler() {
    		form.update($$value => ($$value.email = this.value, $$value));
    	}

    	return {
    		form,
    		handleChange,
    		handleSubmit,
    		$form,
    		input0_input_handler,
    		input1_input_handler
    	};
    }

    class Component extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, []);
    	}
    }

    var interopRequireDefault = createCommonjsModule(function (module) {
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : {
        default: obj
      };
    }

    module.exports = _interopRequireDefault;
    });

    unwrapExports(interopRequireDefault);

    var _extends_1 = createCommonjsModule(function (module) {
    function _extends() {
      module.exports = _extends = Object.assign || function (target) {
        for (var i = 1; i < arguments.length; i++) {
          var source = arguments[i];

          for (var key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
              target[key] = source[key];
            }
          }
        }

        return target;
      };

      return _extends.apply(this, arguments);
    }

    module.exports = _extends;
    });

    /** Used for built-in method references. */
    var objectProto = Object.prototype;

    /** Used to check objects for own properties. */
    var hasOwnProperty = objectProto.hasOwnProperty;

    /**
     * The base implementation of `_.has` without support for deep paths.
     *
     * @private
     * @param {Object} [object] The object to query.
     * @param {Array|string} key The key to check.
     * @returns {boolean} Returns `true` if `key` exists, else `false`.
     */
    function baseHas(object, key) {
      return object != null && hasOwnProperty.call(object, key);
    }

    var _baseHas = baseHas;

    /**
     * Checks if `value` is classified as an `Array` object.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an array, else `false`.
     * @example
     *
     * _.isArray([1, 2, 3]);
     * // => true
     *
     * _.isArray(document.body.children);
     * // => false
     *
     * _.isArray('abc');
     * // => false
     *
     * _.isArray(_.noop);
     * // => false
     */
    var isArray = Array.isArray;

    var isArray_1 = isArray;

    /** Detect free variable `global` from Node.js. */
    var freeGlobal = typeof commonjsGlobal == 'object' && commonjsGlobal && commonjsGlobal.Object === Object && commonjsGlobal;

    var _freeGlobal = freeGlobal;

    /** Detect free variable `self`. */
    var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

    /** Used as a reference to the global object. */
    var root = _freeGlobal || freeSelf || Function('return this')();

    var _root = root;

    /** Built-in value references. */
    var Symbol$1 = _root.Symbol;

    var _Symbol = Symbol$1;

    /** Used for built-in method references. */
    var objectProto$1 = Object.prototype;

    /** Used to check objects for own properties. */
    var hasOwnProperty$1 = objectProto$1.hasOwnProperty;

    /**
     * Used to resolve the
     * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
     * of values.
     */
    var nativeObjectToString = objectProto$1.toString;

    /** Built-in value references. */
    var symToStringTag = _Symbol ? _Symbol.toStringTag : undefined;

    /**
     * A specialized version of `baseGetTag` which ignores `Symbol.toStringTag` values.
     *
     * @private
     * @param {*} value The value to query.
     * @returns {string} Returns the raw `toStringTag`.
     */
    function getRawTag(value) {
      var isOwn = hasOwnProperty$1.call(value, symToStringTag),
          tag = value[symToStringTag];

      try {
        value[symToStringTag] = undefined;
        var unmasked = true;
      } catch (e) {}

      var result = nativeObjectToString.call(value);
      if (unmasked) {
        if (isOwn) {
          value[symToStringTag] = tag;
        } else {
          delete value[symToStringTag];
        }
      }
      return result;
    }

    var _getRawTag = getRawTag;

    /** Used for built-in method references. */
    var objectProto$2 = Object.prototype;

    /**
     * Used to resolve the
     * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
     * of values.
     */
    var nativeObjectToString$1 = objectProto$2.toString;

    /**
     * Converts `value` to a string using `Object.prototype.toString`.
     *
     * @private
     * @param {*} value The value to convert.
     * @returns {string} Returns the converted string.
     */
    function objectToString(value) {
      return nativeObjectToString$1.call(value);
    }

    var _objectToString = objectToString;

    /** `Object#toString` result references. */
    var nullTag = '[object Null]',
        undefinedTag = '[object Undefined]';

    /** Built-in value references. */
    var symToStringTag$1 = _Symbol ? _Symbol.toStringTag : undefined;

    /**
     * The base implementation of `getTag` without fallbacks for buggy environments.
     *
     * @private
     * @param {*} value The value to query.
     * @returns {string} Returns the `toStringTag`.
     */
    function baseGetTag(value) {
      if (value == null) {
        return value === undefined ? undefinedTag : nullTag;
      }
      return (symToStringTag$1 && symToStringTag$1 in Object(value))
        ? _getRawTag(value)
        : _objectToString(value);
    }

    var _baseGetTag = baseGetTag;

    /**
     * Checks if `value` is object-like. A value is object-like if it's not `null`
     * and has a `typeof` result of "object".
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
     * @example
     *
     * _.isObjectLike({});
     * // => true
     *
     * _.isObjectLike([1, 2, 3]);
     * // => true
     *
     * _.isObjectLike(_.noop);
     * // => false
     *
     * _.isObjectLike(null);
     * // => false
     */
    function isObjectLike(value) {
      return value != null && typeof value == 'object';
    }

    var isObjectLike_1 = isObjectLike;

    /** `Object#toString` result references. */
    var symbolTag = '[object Symbol]';

    /**
     * Checks if `value` is classified as a `Symbol` primitive or object.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
     * @example
     *
     * _.isSymbol(Symbol.iterator);
     * // => true
     *
     * _.isSymbol('abc');
     * // => false
     */
    function isSymbol(value) {
      return typeof value == 'symbol' ||
        (isObjectLike_1(value) && _baseGetTag(value) == symbolTag);
    }

    var isSymbol_1 = isSymbol;

    /** Used to match property names within property paths. */
    var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,
        reIsPlainProp = /^\w*$/;

    /**
     * Checks if `value` is a property name and not a property path.
     *
     * @private
     * @param {*} value The value to check.
     * @param {Object} [object] The object to query keys on.
     * @returns {boolean} Returns `true` if `value` is a property name, else `false`.
     */
    function isKey(value, object) {
      if (isArray_1(value)) {
        return false;
      }
      var type = typeof value;
      if (type == 'number' || type == 'symbol' || type == 'boolean' ||
          value == null || isSymbol_1(value)) {
        return true;
      }
      return reIsPlainProp.test(value) || !reIsDeepProp.test(value) ||
        (object != null && value in Object(object));
    }

    var _isKey = isKey;

    /**
     * Checks if `value` is the
     * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
     * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an object, else `false`.
     * @example
     *
     * _.isObject({});
     * // => true
     *
     * _.isObject([1, 2, 3]);
     * // => true
     *
     * _.isObject(_.noop);
     * // => true
     *
     * _.isObject(null);
     * // => false
     */
    function isObject(value) {
      var type = typeof value;
      return value != null && (type == 'object' || type == 'function');
    }

    var isObject_1 = isObject;

    /** `Object#toString` result references. */
    var asyncTag = '[object AsyncFunction]',
        funcTag = '[object Function]',
        genTag = '[object GeneratorFunction]',
        proxyTag = '[object Proxy]';

    /**
     * Checks if `value` is classified as a `Function` object.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a function, else `false`.
     * @example
     *
     * _.isFunction(_);
     * // => true
     *
     * _.isFunction(/abc/);
     * // => false
     */
    function isFunction(value) {
      if (!isObject_1(value)) {
        return false;
      }
      // The use of `Object#toString` avoids issues with the `typeof` operator
      // in Safari 9 which returns 'object' for typed arrays and other constructors.
      var tag = _baseGetTag(value);
      return tag == funcTag || tag == genTag || tag == asyncTag || tag == proxyTag;
    }

    var isFunction_1 = isFunction;

    /** Used to detect overreaching core-js shims. */
    var coreJsData = _root['__core-js_shared__'];

    var _coreJsData = coreJsData;

    /** Used to detect methods masquerading as native. */
    var maskSrcKey = (function() {
      var uid = /[^.]+$/.exec(_coreJsData && _coreJsData.keys && _coreJsData.keys.IE_PROTO || '');
      return uid ? ('Symbol(src)_1.' + uid) : '';
    }());

    /**
     * Checks if `func` has its source masked.
     *
     * @private
     * @param {Function} func The function to check.
     * @returns {boolean} Returns `true` if `func` is masked, else `false`.
     */
    function isMasked(func) {
      return !!maskSrcKey && (maskSrcKey in func);
    }

    var _isMasked = isMasked;

    /** Used for built-in method references. */
    var funcProto = Function.prototype;

    /** Used to resolve the decompiled source of functions. */
    var funcToString = funcProto.toString;

    /**
     * Converts `func` to its source code.
     *
     * @private
     * @param {Function} func The function to convert.
     * @returns {string} Returns the source code.
     */
    function toSource(func) {
      if (func != null) {
        try {
          return funcToString.call(func);
        } catch (e) {}
        try {
          return (func + '');
        } catch (e) {}
      }
      return '';
    }

    var _toSource = toSource;

    /**
     * Used to match `RegExp`
     * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
     */
    var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;

    /** Used to detect host constructors (Safari). */
    var reIsHostCtor = /^\[object .+?Constructor\]$/;

    /** Used for built-in method references. */
    var funcProto$1 = Function.prototype,
        objectProto$3 = Object.prototype;

    /** Used to resolve the decompiled source of functions. */
    var funcToString$1 = funcProto$1.toString;

    /** Used to check objects for own properties. */
    var hasOwnProperty$2 = objectProto$3.hasOwnProperty;

    /** Used to detect if a method is native. */
    var reIsNative = RegExp('^' +
      funcToString$1.call(hasOwnProperty$2).replace(reRegExpChar, '\\$&')
      .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
    );

    /**
     * The base implementation of `_.isNative` without bad shim checks.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a native function,
     *  else `false`.
     */
    function baseIsNative(value) {
      if (!isObject_1(value) || _isMasked(value)) {
        return false;
      }
      var pattern = isFunction_1(value) ? reIsNative : reIsHostCtor;
      return pattern.test(_toSource(value));
    }

    var _baseIsNative = baseIsNative;

    /**
     * Gets the value at `key` of `object`.
     *
     * @private
     * @param {Object} [object] The object to query.
     * @param {string} key The key of the property to get.
     * @returns {*} Returns the property value.
     */
    function getValue(object, key) {
      return object == null ? undefined : object[key];
    }

    var _getValue = getValue;

    /**
     * Gets the native function at `key` of `object`.
     *
     * @private
     * @param {Object} object The object to query.
     * @param {string} key The key of the method to get.
     * @returns {*} Returns the function if it's native, else `undefined`.
     */
    function getNative(object, key) {
      var value = _getValue(object, key);
      return _baseIsNative(value) ? value : undefined;
    }

    var _getNative = getNative;

    /* Built-in method references that are verified to be native. */
    var nativeCreate = _getNative(Object, 'create');

    var _nativeCreate = nativeCreate;

    /**
     * Removes all key-value entries from the hash.
     *
     * @private
     * @name clear
     * @memberOf Hash
     */
    function hashClear() {
      this.__data__ = _nativeCreate ? _nativeCreate(null) : {};
      this.size = 0;
    }

    var _hashClear = hashClear;

    /**
     * Removes `key` and its value from the hash.
     *
     * @private
     * @name delete
     * @memberOf Hash
     * @param {Object} hash The hash to modify.
     * @param {string} key The key of the value to remove.
     * @returns {boolean} Returns `true` if the entry was removed, else `false`.
     */
    function hashDelete(key) {
      var result = this.has(key) && delete this.__data__[key];
      this.size -= result ? 1 : 0;
      return result;
    }

    var _hashDelete = hashDelete;

    /** Used to stand-in for `undefined` hash values. */
    var HASH_UNDEFINED = '__lodash_hash_undefined__';

    /** Used for built-in method references. */
    var objectProto$4 = Object.prototype;

    /** Used to check objects for own properties. */
    var hasOwnProperty$3 = objectProto$4.hasOwnProperty;

    /**
     * Gets the hash value for `key`.
     *
     * @private
     * @name get
     * @memberOf Hash
     * @param {string} key The key of the value to get.
     * @returns {*} Returns the entry value.
     */
    function hashGet(key) {
      var data = this.__data__;
      if (_nativeCreate) {
        var result = data[key];
        return result === HASH_UNDEFINED ? undefined : result;
      }
      return hasOwnProperty$3.call(data, key) ? data[key] : undefined;
    }

    var _hashGet = hashGet;

    /** Used for built-in method references. */
    var objectProto$5 = Object.prototype;

    /** Used to check objects for own properties. */
    var hasOwnProperty$4 = objectProto$5.hasOwnProperty;

    /**
     * Checks if a hash value for `key` exists.
     *
     * @private
     * @name has
     * @memberOf Hash
     * @param {string} key The key of the entry to check.
     * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
     */
    function hashHas(key) {
      var data = this.__data__;
      return _nativeCreate ? (data[key] !== undefined) : hasOwnProperty$4.call(data, key);
    }

    var _hashHas = hashHas;

    /** Used to stand-in for `undefined` hash values. */
    var HASH_UNDEFINED$1 = '__lodash_hash_undefined__';

    /**
     * Sets the hash `key` to `value`.
     *
     * @private
     * @name set
     * @memberOf Hash
     * @param {string} key The key of the value to set.
     * @param {*} value The value to set.
     * @returns {Object} Returns the hash instance.
     */
    function hashSet(key, value) {
      var data = this.__data__;
      this.size += this.has(key) ? 0 : 1;
      data[key] = (_nativeCreate && value === undefined) ? HASH_UNDEFINED$1 : value;
      return this;
    }

    var _hashSet = hashSet;

    /**
     * Creates a hash object.
     *
     * @private
     * @constructor
     * @param {Array} [entries] The key-value pairs to cache.
     */
    function Hash(entries) {
      var index = -1,
          length = entries == null ? 0 : entries.length;

      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }

    // Add methods to `Hash`.
    Hash.prototype.clear = _hashClear;
    Hash.prototype['delete'] = _hashDelete;
    Hash.prototype.get = _hashGet;
    Hash.prototype.has = _hashHas;
    Hash.prototype.set = _hashSet;

    var _Hash = Hash;

    /**
     * Removes all key-value entries from the list cache.
     *
     * @private
     * @name clear
     * @memberOf ListCache
     */
    function listCacheClear() {
      this.__data__ = [];
      this.size = 0;
    }

    var _listCacheClear = listCacheClear;

    /**
     * Performs a
     * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
     * comparison between two values to determine if they are equivalent.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to compare.
     * @param {*} other The other value to compare.
     * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
     * @example
     *
     * var object = { 'a': 1 };
     * var other = { 'a': 1 };
     *
     * _.eq(object, object);
     * // => true
     *
     * _.eq(object, other);
     * // => false
     *
     * _.eq('a', 'a');
     * // => true
     *
     * _.eq('a', Object('a'));
     * // => false
     *
     * _.eq(NaN, NaN);
     * // => true
     */
    function eq(value, other) {
      return value === other || (value !== value && other !== other);
    }

    var eq_1 = eq;

    /**
     * Gets the index at which the `key` is found in `array` of key-value pairs.
     *
     * @private
     * @param {Array} array The array to inspect.
     * @param {*} key The key to search for.
     * @returns {number} Returns the index of the matched value, else `-1`.
     */
    function assocIndexOf(array, key) {
      var length = array.length;
      while (length--) {
        if (eq_1(array[length][0], key)) {
          return length;
        }
      }
      return -1;
    }

    var _assocIndexOf = assocIndexOf;

    /** Used for built-in method references. */
    var arrayProto = Array.prototype;

    /** Built-in value references. */
    var splice = arrayProto.splice;

    /**
     * Removes `key` and its value from the list cache.
     *
     * @private
     * @name delete
     * @memberOf ListCache
     * @param {string} key The key of the value to remove.
     * @returns {boolean} Returns `true` if the entry was removed, else `false`.
     */
    function listCacheDelete(key) {
      var data = this.__data__,
          index = _assocIndexOf(data, key);

      if (index < 0) {
        return false;
      }
      var lastIndex = data.length - 1;
      if (index == lastIndex) {
        data.pop();
      } else {
        splice.call(data, index, 1);
      }
      --this.size;
      return true;
    }

    var _listCacheDelete = listCacheDelete;

    /**
     * Gets the list cache value for `key`.
     *
     * @private
     * @name get
     * @memberOf ListCache
     * @param {string} key The key of the value to get.
     * @returns {*} Returns the entry value.
     */
    function listCacheGet(key) {
      var data = this.__data__,
          index = _assocIndexOf(data, key);

      return index < 0 ? undefined : data[index][1];
    }

    var _listCacheGet = listCacheGet;

    /**
     * Checks if a list cache value for `key` exists.
     *
     * @private
     * @name has
     * @memberOf ListCache
     * @param {string} key The key of the entry to check.
     * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
     */
    function listCacheHas(key) {
      return _assocIndexOf(this.__data__, key) > -1;
    }

    var _listCacheHas = listCacheHas;

    /**
     * Sets the list cache `key` to `value`.
     *
     * @private
     * @name set
     * @memberOf ListCache
     * @param {string} key The key of the value to set.
     * @param {*} value The value to set.
     * @returns {Object} Returns the list cache instance.
     */
    function listCacheSet(key, value) {
      var data = this.__data__,
          index = _assocIndexOf(data, key);

      if (index < 0) {
        ++this.size;
        data.push([key, value]);
      } else {
        data[index][1] = value;
      }
      return this;
    }

    var _listCacheSet = listCacheSet;

    /**
     * Creates an list cache object.
     *
     * @private
     * @constructor
     * @param {Array} [entries] The key-value pairs to cache.
     */
    function ListCache(entries) {
      var index = -1,
          length = entries == null ? 0 : entries.length;

      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }

    // Add methods to `ListCache`.
    ListCache.prototype.clear = _listCacheClear;
    ListCache.prototype['delete'] = _listCacheDelete;
    ListCache.prototype.get = _listCacheGet;
    ListCache.prototype.has = _listCacheHas;
    ListCache.prototype.set = _listCacheSet;

    var _ListCache = ListCache;

    /* Built-in method references that are verified to be native. */
    var Map$1 = _getNative(_root, 'Map');

    var _Map = Map$1;

    /**
     * Removes all key-value entries from the map.
     *
     * @private
     * @name clear
     * @memberOf MapCache
     */
    function mapCacheClear() {
      this.size = 0;
      this.__data__ = {
        'hash': new _Hash,
        'map': new (_Map || _ListCache),
        'string': new _Hash
      };
    }

    var _mapCacheClear = mapCacheClear;

    /**
     * Checks if `value` is suitable for use as unique object key.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is suitable, else `false`.
     */
    function isKeyable(value) {
      var type = typeof value;
      return (type == 'string' || type == 'number' || type == 'symbol' || type == 'boolean')
        ? (value !== '__proto__')
        : (value === null);
    }

    var _isKeyable = isKeyable;

    /**
     * Gets the data for `map`.
     *
     * @private
     * @param {Object} map The map to query.
     * @param {string} key The reference key.
     * @returns {*} Returns the map data.
     */
    function getMapData(map, key) {
      var data = map.__data__;
      return _isKeyable(key)
        ? data[typeof key == 'string' ? 'string' : 'hash']
        : data.map;
    }

    var _getMapData = getMapData;

    /**
     * Removes `key` and its value from the map.
     *
     * @private
     * @name delete
     * @memberOf MapCache
     * @param {string} key The key of the value to remove.
     * @returns {boolean} Returns `true` if the entry was removed, else `false`.
     */
    function mapCacheDelete(key) {
      var result = _getMapData(this, key)['delete'](key);
      this.size -= result ? 1 : 0;
      return result;
    }

    var _mapCacheDelete = mapCacheDelete;

    /**
     * Gets the map value for `key`.
     *
     * @private
     * @name get
     * @memberOf MapCache
     * @param {string} key The key of the value to get.
     * @returns {*} Returns the entry value.
     */
    function mapCacheGet(key) {
      return _getMapData(this, key).get(key);
    }

    var _mapCacheGet = mapCacheGet;

    /**
     * Checks if a map value for `key` exists.
     *
     * @private
     * @name has
     * @memberOf MapCache
     * @param {string} key The key of the entry to check.
     * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
     */
    function mapCacheHas(key) {
      return _getMapData(this, key).has(key);
    }

    var _mapCacheHas = mapCacheHas;

    /**
     * Sets the map `key` to `value`.
     *
     * @private
     * @name set
     * @memberOf MapCache
     * @param {string} key The key of the value to set.
     * @param {*} value The value to set.
     * @returns {Object} Returns the map cache instance.
     */
    function mapCacheSet(key, value) {
      var data = _getMapData(this, key),
          size = data.size;

      data.set(key, value);
      this.size += data.size == size ? 0 : 1;
      return this;
    }

    var _mapCacheSet = mapCacheSet;

    /**
     * Creates a map cache object to store key-value pairs.
     *
     * @private
     * @constructor
     * @param {Array} [entries] The key-value pairs to cache.
     */
    function MapCache(entries) {
      var index = -1,
          length = entries == null ? 0 : entries.length;

      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }

    // Add methods to `MapCache`.
    MapCache.prototype.clear = _mapCacheClear;
    MapCache.prototype['delete'] = _mapCacheDelete;
    MapCache.prototype.get = _mapCacheGet;
    MapCache.prototype.has = _mapCacheHas;
    MapCache.prototype.set = _mapCacheSet;

    var _MapCache = MapCache;

    /** Error message constants. */
    var FUNC_ERROR_TEXT = 'Expected a function';

    /**
     * Creates a function that memoizes the result of `func`. If `resolver` is
     * provided, it determines the cache key for storing the result based on the
     * arguments provided to the memoized function. By default, the first argument
     * provided to the memoized function is used as the map cache key. The `func`
     * is invoked with the `this` binding of the memoized function.
     *
     * **Note:** The cache is exposed as the `cache` property on the memoized
     * function. Its creation may be customized by replacing the `_.memoize.Cache`
     * constructor with one whose instances implement the
     * [`Map`](http://ecma-international.org/ecma-262/7.0/#sec-properties-of-the-map-prototype-object)
     * method interface of `clear`, `delete`, `get`, `has`, and `set`.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Function
     * @param {Function} func The function to have its output memoized.
     * @param {Function} [resolver] The function to resolve the cache key.
     * @returns {Function} Returns the new memoized function.
     * @example
     *
     * var object = { 'a': 1, 'b': 2 };
     * var other = { 'c': 3, 'd': 4 };
     *
     * var values = _.memoize(_.values);
     * values(object);
     * // => [1, 2]
     *
     * values(other);
     * // => [3, 4]
     *
     * object.a = 2;
     * values(object);
     * // => [1, 2]
     *
     * // Modify the result cache.
     * values.cache.set(object, ['a', 'b']);
     * values(object);
     * // => ['a', 'b']
     *
     * // Replace `_.memoize.Cache`.
     * _.memoize.Cache = WeakMap;
     */
    function memoize(func, resolver) {
      if (typeof func != 'function' || (resolver != null && typeof resolver != 'function')) {
        throw new TypeError(FUNC_ERROR_TEXT);
      }
      var memoized = function() {
        var args = arguments,
            key = resolver ? resolver.apply(this, args) : args[0],
            cache = memoized.cache;

        if (cache.has(key)) {
          return cache.get(key);
        }
        var result = func.apply(this, args);
        memoized.cache = cache.set(key, result) || cache;
        return result;
      };
      memoized.cache = new (memoize.Cache || _MapCache);
      return memoized;
    }

    // Expose `MapCache`.
    memoize.Cache = _MapCache;

    var memoize_1 = memoize;

    /** Used as the maximum memoize cache size. */
    var MAX_MEMOIZE_SIZE = 500;

    /**
     * A specialized version of `_.memoize` which clears the memoized function's
     * cache when it exceeds `MAX_MEMOIZE_SIZE`.
     *
     * @private
     * @param {Function} func The function to have its output memoized.
     * @returns {Function} Returns the new memoized function.
     */
    function memoizeCapped(func) {
      var result = memoize_1(func, function(key) {
        if (cache.size === MAX_MEMOIZE_SIZE) {
          cache.clear();
        }
        return key;
      });

      var cache = result.cache;
      return result;
    }

    var _memoizeCapped = memoizeCapped;

    /** Used to match property names within property paths. */
    var rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;

    /** Used to match backslashes in property paths. */
    var reEscapeChar = /\\(\\)?/g;

    /**
     * Converts `string` to a property path array.
     *
     * @private
     * @param {string} string The string to convert.
     * @returns {Array} Returns the property path array.
     */
    var stringToPath = _memoizeCapped(function(string) {
      var result = [];
      if (string.charCodeAt(0) === 46 /* . */) {
        result.push('');
      }
      string.replace(rePropName, function(match, number, quote, subString) {
        result.push(quote ? subString.replace(reEscapeChar, '$1') : (number || match));
      });
      return result;
    });

    var _stringToPath = stringToPath;

    /**
     * A specialized version of `_.map` for arrays without support for iteratee
     * shorthands.
     *
     * @private
     * @param {Array} [array] The array to iterate over.
     * @param {Function} iteratee The function invoked per iteration.
     * @returns {Array} Returns the new mapped array.
     */
    function arrayMap(array, iteratee) {
      var index = -1,
          length = array == null ? 0 : array.length,
          result = Array(length);

      while (++index < length) {
        result[index] = iteratee(array[index], index, array);
      }
      return result;
    }

    var _arrayMap = arrayMap;

    /** Used as references for various `Number` constants. */
    var INFINITY = 1 / 0;

    /** Used to convert symbols to primitives and strings. */
    var symbolProto = _Symbol ? _Symbol.prototype : undefined,
        symbolToString = symbolProto ? symbolProto.toString : undefined;

    /**
     * The base implementation of `_.toString` which doesn't convert nullish
     * values to empty strings.
     *
     * @private
     * @param {*} value The value to process.
     * @returns {string} Returns the string.
     */
    function baseToString(value) {
      // Exit early for strings to avoid a performance hit in some environments.
      if (typeof value == 'string') {
        return value;
      }
      if (isArray_1(value)) {
        // Recursively convert values (susceptible to call stack limits).
        return _arrayMap(value, baseToString) + '';
      }
      if (isSymbol_1(value)) {
        return symbolToString ? symbolToString.call(value) : '';
      }
      var result = (value + '');
      return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
    }

    var _baseToString = baseToString;

    /**
     * Converts `value` to a string. An empty string is returned for `null`
     * and `undefined` values. The sign of `-0` is preserved.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to convert.
     * @returns {string} Returns the converted string.
     * @example
     *
     * _.toString(null);
     * // => ''
     *
     * _.toString(-0);
     * // => '-0'
     *
     * _.toString([1, 2, 3]);
     * // => '1,2,3'
     */
    function toString(value) {
      return value == null ? '' : _baseToString(value);
    }

    var toString_1 = toString;

    /**
     * Casts `value` to a path array if it's not one.
     *
     * @private
     * @param {*} value The value to inspect.
     * @param {Object} [object] The object to query keys on.
     * @returns {Array} Returns the cast property path array.
     */
    function castPath(value, object) {
      if (isArray_1(value)) {
        return value;
      }
      return _isKey(value, object) ? [value] : _stringToPath(toString_1(value));
    }

    var _castPath = castPath;

    /** `Object#toString` result references. */
    var argsTag = '[object Arguments]';

    /**
     * The base implementation of `_.isArguments`.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an `arguments` object,
     */
    function baseIsArguments(value) {
      return isObjectLike_1(value) && _baseGetTag(value) == argsTag;
    }

    var _baseIsArguments = baseIsArguments;

    /** Used for built-in method references. */
    var objectProto$6 = Object.prototype;

    /** Used to check objects for own properties. */
    var hasOwnProperty$5 = objectProto$6.hasOwnProperty;

    /** Built-in value references. */
    var propertyIsEnumerable = objectProto$6.propertyIsEnumerable;

    /**
     * Checks if `value` is likely an `arguments` object.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an `arguments` object,
     *  else `false`.
     * @example
     *
     * _.isArguments(function() { return arguments; }());
     * // => true
     *
     * _.isArguments([1, 2, 3]);
     * // => false
     */
    var isArguments = _baseIsArguments(function() { return arguments; }()) ? _baseIsArguments : function(value) {
      return isObjectLike_1(value) && hasOwnProperty$5.call(value, 'callee') &&
        !propertyIsEnumerable.call(value, 'callee');
    };

    var isArguments_1 = isArguments;

    /** Used as references for various `Number` constants. */
    var MAX_SAFE_INTEGER = 9007199254740991;

    /** Used to detect unsigned integer values. */
    var reIsUint = /^(?:0|[1-9]\d*)$/;

    /**
     * Checks if `value` is a valid array-like index.
     *
     * @private
     * @param {*} value The value to check.
     * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
     * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
     */
    function isIndex(value, length) {
      var type = typeof value;
      length = length == null ? MAX_SAFE_INTEGER : length;

      return !!length &&
        (type == 'number' ||
          (type != 'symbol' && reIsUint.test(value))) &&
            (value > -1 && value % 1 == 0 && value < length);
    }

    var _isIndex = isIndex;

    /** Used as references for various `Number` constants. */
    var MAX_SAFE_INTEGER$1 = 9007199254740991;

    /**
     * Checks if `value` is a valid array-like length.
     *
     * **Note:** This method is loosely based on
     * [`ToLength`](http://ecma-international.org/ecma-262/7.0/#sec-tolength).
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
     * @example
     *
     * _.isLength(3);
     * // => true
     *
     * _.isLength(Number.MIN_VALUE);
     * // => false
     *
     * _.isLength(Infinity);
     * // => false
     *
     * _.isLength('3');
     * // => false
     */
    function isLength(value) {
      return typeof value == 'number' &&
        value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER$1;
    }

    var isLength_1 = isLength;

    /** Used as references for various `Number` constants. */
    var INFINITY$1 = 1 / 0;

    /**
     * Converts `value` to a string key if it's not a string or symbol.
     *
     * @private
     * @param {*} value The value to inspect.
     * @returns {string|symbol} Returns the key.
     */
    function toKey(value) {
      if (typeof value == 'string' || isSymbol_1(value)) {
        return value;
      }
      var result = (value + '');
      return (result == '0' && (1 / value) == -INFINITY$1) ? '-0' : result;
    }

    var _toKey = toKey;

    /**
     * Checks if `path` exists on `object`.
     *
     * @private
     * @param {Object} object The object to query.
     * @param {Array|string} path The path to check.
     * @param {Function} hasFunc The function to check properties.
     * @returns {boolean} Returns `true` if `path` exists, else `false`.
     */
    function hasPath(object, path, hasFunc) {
      path = _castPath(path, object);

      var index = -1,
          length = path.length,
          result = false;

      while (++index < length) {
        var key = _toKey(path[index]);
        if (!(result = object != null && hasFunc(object, key))) {
          break;
        }
        object = object[key];
      }
      if (result || ++index != length) {
        return result;
      }
      length = object == null ? 0 : object.length;
      return !!length && isLength_1(length) && _isIndex(key, length) &&
        (isArray_1(object) || isArguments_1(object));
    }

    var _hasPath = hasPath;

    /**
     * Checks if `path` is a direct property of `object`.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Object
     * @param {Object} object The object to query.
     * @param {Array|string} path The path to check.
     * @returns {boolean} Returns `true` if `path` exists, else `false`.
     * @example
     *
     * var object = { 'a': { 'b': 2 } };
     * var other = _.create({ 'a': _.create({ 'b': 2 }) });
     *
     * _.has(object, 'a');
     * // => true
     *
     * _.has(object, 'a.b');
     * // => true
     *
     * _.has(object, ['a', 'b']);
     * // => true
     *
     * _.has(other, 'a');
     * // => false
     */
    function has(object, path) {
      return object != null && _hasPath(object, path, _baseHas);
    }

    var has_1 = has;

    /**
     * Removes all key-value entries from the stack.
     *
     * @private
     * @name clear
     * @memberOf Stack
     */
    function stackClear() {
      this.__data__ = new _ListCache;
      this.size = 0;
    }

    var _stackClear = stackClear;

    /**
     * Removes `key` and its value from the stack.
     *
     * @private
     * @name delete
     * @memberOf Stack
     * @param {string} key The key of the value to remove.
     * @returns {boolean} Returns `true` if the entry was removed, else `false`.
     */
    function stackDelete(key) {
      var data = this.__data__,
          result = data['delete'](key);

      this.size = data.size;
      return result;
    }

    var _stackDelete = stackDelete;

    /**
     * Gets the stack value for `key`.
     *
     * @private
     * @name get
     * @memberOf Stack
     * @param {string} key The key of the value to get.
     * @returns {*} Returns the entry value.
     */
    function stackGet(key) {
      return this.__data__.get(key);
    }

    var _stackGet = stackGet;

    /**
     * Checks if a stack value for `key` exists.
     *
     * @private
     * @name has
     * @memberOf Stack
     * @param {string} key The key of the entry to check.
     * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
     */
    function stackHas(key) {
      return this.__data__.has(key);
    }

    var _stackHas = stackHas;

    /** Used as the size to enable large array optimizations. */
    var LARGE_ARRAY_SIZE = 200;

    /**
     * Sets the stack `key` to `value`.
     *
     * @private
     * @name set
     * @memberOf Stack
     * @param {string} key The key of the value to set.
     * @param {*} value The value to set.
     * @returns {Object} Returns the stack cache instance.
     */
    function stackSet(key, value) {
      var data = this.__data__;
      if (data instanceof _ListCache) {
        var pairs = data.__data__;
        if (!_Map || (pairs.length < LARGE_ARRAY_SIZE - 1)) {
          pairs.push([key, value]);
          this.size = ++data.size;
          return this;
        }
        data = this.__data__ = new _MapCache(pairs);
      }
      data.set(key, value);
      this.size = data.size;
      return this;
    }

    var _stackSet = stackSet;

    /**
     * Creates a stack cache object to store key-value pairs.
     *
     * @private
     * @constructor
     * @param {Array} [entries] The key-value pairs to cache.
     */
    function Stack(entries) {
      var data = this.__data__ = new _ListCache(entries);
      this.size = data.size;
    }

    // Add methods to `Stack`.
    Stack.prototype.clear = _stackClear;
    Stack.prototype['delete'] = _stackDelete;
    Stack.prototype.get = _stackGet;
    Stack.prototype.has = _stackHas;
    Stack.prototype.set = _stackSet;

    var _Stack = Stack;

    /**
     * A specialized version of `_.forEach` for arrays without support for
     * iteratee shorthands.
     *
     * @private
     * @param {Array} [array] The array to iterate over.
     * @param {Function} iteratee The function invoked per iteration.
     * @returns {Array} Returns `array`.
     */
    function arrayEach(array, iteratee) {
      var index = -1,
          length = array == null ? 0 : array.length;

      while (++index < length) {
        if (iteratee(array[index], index, array) === false) {
          break;
        }
      }
      return array;
    }

    var _arrayEach = arrayEach;

    var defineProperty = (function() {
      try {
        var func = _getNative(Object, 'defineProperty');
        func({}, '', {});
        return func;
      } catch (e) {}
    }());

    var _defineProperty = defineProperty;

    /**
     * The base implementation of `assignValue` and `assignMergeValue` without
     * value checks.
     *
     * @private
     * @param {Object} object The object to modify.
     * @param {string} key The key of the property to assign.
     * @param {*} value The value to assign.
     */
    function baseAssignValue(object, key, value) {
      if (key == '__proto__' && _defineProperty) {
        _defineProperty(object, key, {
          'configurable': true,
          'enumerable': true,
          'value': value,
          'writable': true
        });
      } else {
        object[key] = value;
      }
    }

    var _baseAssignValue = baseAssignValue;

    /** Used for built-in method references. */
    var objectProto$7 = Object.prototype;

    /** Used to check objects for own properties. */
    var hasOwnProperty$6 = objectProto$7.hasOwnProperty;

    /**
     * Assigns `value` to `key` of `object` if the existing value is not equivalent
     * using [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
     * for equality comparisons.
     *
     * @private
     * @param {Object} object The object to modify.
     * @param {string} key The key of the property to assign.
     * @param {*} value The value to assign.
     */
    function assignValue(object, key, value) {
      var objValue = object[key];
      if (!(hasOwnProperty$6.call(object, key) && eq_1(objValue, value)) ||
          (value === undefined && !(key in object))) {
        _baseAssignValue(object, key, value);
      }
    }

    var _assignValue = assignValue;

    /**
     * Copies properties of `source` to `object`.
     *
     * @private
     * @param {Object} source The object to copy properties from.
     * @param {Array} props The property identifiers to copy.
     * @param {Object} [object={}] The object to copy properties to.
     * @param {Function} [customizer] The function to customize copied values.
     * @returns {Object} Returns `object`.
     */
    function copyObject(source, props, object, customizer) {
      var isNew = !object;
      object || (object = {});

      var index = -1,
          length = props.length;

      while (++index < length) {
        var key = props[index];

        var newValue = customizer
          ? customizer(object[key], source[key], key, object, source)
          : undefined;

        if (newValue === undefined) {
          newValue = source[key];
        }
        if (isNew) {
          _baseAssignValue(object, key, newValue);
        } else {
          _assignValue(object, key, newValue);
        }
      }
      return object;
    }

    var _copyObject = copyObject;

    /**
     * The base implementation of `_.times` without support for iteratee shorthands
     * or max array length checks.
     *
     * @private
     * @param {number} n The number of times to invoke `iteratee`.
     * @param {Function} iteratee The function invoked per iteration.
     * @returns {Array} Returns the array of results.
     */
    function baseTimes(n, iteratee) {
      var index = -1,
          result = Array(n);

      while (++index < n) {
        result[index] = iteratee(index);
      }
      return result;
    }

    var _baseTimes = baseTimes;

    /**
     * This method returns `false`.
     *
     * @static
     * @memberOf _
     * @since 4.13.0
     * @category Util
     * @returns {boolean} Returns `false`.
     * @example
     *
     * _.times(2, _.stubFalse);
     * // => [false, false]
     */
    function stubFalse() {
      return false;
    }

    var stubFalse_1 = stubFalse;

    var isBuffer_1 = createCommonjsModule(function (module, exports) {
    /** Detect free variable `exports`. */
    var freeExports =  exports && !exports.nodeType && exports;

    /** Detect free variable `module`. */
    var freeModule = freeExports && 'object' == 'object' && module && !module.nodeType && module;

    /** Detect the popular CommonJS extension `module.exports`. */
    var moduleExports = freeModule && freeModule.exports === freeExports;

    /** Built-in value references. */
    var Buffer = moduleExports ? _root.Buffer : undefined;

    /* Built-in method references for those with the same name as other `lodash` methods. */
    var nativeIsBuffer = Buffer ? Buffer.isBuffer : undefined;

    /**
     * Checks if `value` is a buffer.
     *
     * @static
     * @memberOf _
     * @since 4.3.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a buffer, else `false`.
     * @example
     *
     * _.isBuffer(new Buffer(2));
     * // => true
     *
     * _.isBuffer(new Uint8Array(2));
     * // => false
     */
    var isBuffer = nativeIsBuffer || stubFalse_1;

    module.exports = isBuffer;
    });

    /** `Object#toString` result references. */
    var argsTag$1 = '[object Arguments]',
        arrayTag = '[object Array]',
        boolTag = '[object Boolean]',
        dateTag = '[object Date]',
        errorTag = '[object Error]',
        funcTag$1 = '[object Function]',
        mapTag = '[object Map]',
        numberTag = '[object Number]',
        objectTag = '[object Object]',
        regexpTag = '[object RegExp]',
        setTag = '[object Set]',
        stringTag = '[object String]',
        weakMapTag = '[object WeakMap]';

    var arrayBufferTag = '[object ArrayBuffer]',
        dataViewTag = '[object DataView]',
        float32Tag = '[object Float32Array]',
        float64Tag = '[object Float64Array]',
        int8Tag = '[object Int8Array]',
        int16Tag = '[object Int16Array]',
        int32Tag = '[object Int32Array]',
        uint8Tag = '[object Uint8Array]',
        uint8ClampedTag = '[object Uint8ClampedArray]',
        uint16Tag = '[object Uint16Array]',
        uint32Tag = '[object Uint32Array]';

    /** Used to identify `toStringTag` values of typed arrays. */
    var typedArrayTags = {};
    typedArrayTags[float32Tag] = typedArrayTags[float64Tag] =
    typedArrayTags[int8Tag] = typedArrayTags[int16Tag] =
    typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] =
    typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] =
    typedArrayTags[uint32Tag] = true;
    typedArrayTags[argsTag$1] = typedArrayTags[arrayTag] =
    typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] =
    typedArrayTags[dataViewTag] = typedArrayTags[dateTag] =
    typedArrayTags[errorTag] = typedArrayTags[funcTag$1] =
    typedArrayTags[mapTag] = typedArrayTags[numberTag] =
    typedArrayTags[objectTag] = typedArrayTags[regexpTag] =
    typedArrayTags[setTag] = typedArrayTags[stringTag] =
    typedArrayTags[weakMapTag] = false;

    /**
     * The base implementation of `_.isTypedArray` without Node.js optimizations.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
     */
    function baseIsTypedArray(value) {
      return isObjectLike_1(value) &&
        isLength_1(value.length) && !!typedArrayTags[_baseGetTag(value)];
    }

    var _baseIsTypedArray = baseIsTypedArray;

    /**
     * The base implementation of `_.unary` without support for storing metadata.
     *
     * @private
     * @param {Function} func The function to cap arguments for.
     * @returns {Function} Returns the new capped function.
     */
    function baseUnary(func) {
      return function(value) {
        return func(value);
      };
    }

    var _baseUnary = baseUnary;

    var _nodeUtil = createCommonjsModule(function (module, exports) {
    /** Detect free variable `exports`. */
    var freeExports =  exports && !exports.nodeType && exports;

    /** Detect free variable `module`. */
    var freeModule = freeExports && 'object' == 'object' && module && !module.nodeType && module;

    /** Detect the popular CommonJS extension `module.exports`. */
    var moduleExports = freeModule && freeModule.exports === freeExports;

    /** Detect free variable `process` from Node.js. */
    var freeProcess = moduleExports && _freeGlobal.process;

    /** Used to access faster Node.js helpers. */
    var nodeUtil = (function() {
      try {
        // Use `util.types` for Node.js 10+.
        var types = freeModule && freeModule.require && freeModule.require('util').types;

        if (types) {
          return types;
        }

        // Legacy `process.binding('util')` for Node.js < 10.
        return freeProcess && freeProcess.binding && freeProcess.binding('util');
      } catch (e) {}
    }());

    module.exports = nodeUtil;
    });

    /* Node.js helper references. */
    var nodeIsTypedArray = _nodeUtil && _nodeUtil.isTypedArray;

    /**
     * Checks if `value` is classified as a typed array.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
     * @example
     *
     * _.isTypedArray(new Uint8Array);
     * // => true
     *
     * _.isTypedArray([]);
     * // => false
     */
    var isTypedArray = nodeIsTypedArray ? _baseUnary(nodeIsTypedArray) : _baseIsTypedArray;

    var isTypedArray_1 = isTypedArray;

    /** Used for built-in method references. */
    var objectProto$8 = Object.prototype;

    /** Used to check objects for own properties. */
    var hasOwnProperty$7 = objectProto$8.hasOwnProperty;

    /**
     * Creates an array of the enumerable property names of the array-like `value`.
     *
     * @private
     * @param {*} value The value to query.
     * @param {boolean} inherited Specify returning inherited property names.
     * @returns {Array} Returns the array of property names.
     */
    function arrayLikeKeys(value, inherited) {
      var isArr = isArray_1(value),
          isArg = !isArr && isArguments_1(value),
          isBuff = !isArr && !isArg && isBuffer_1(value),
          isType = !isArr && !isArg && !isBuff && isTypedArray_1(value),
          skipIndexes = isArr || isArg || isBuff || isType,
          result = skipIndexes ? _baseTimes(value.length, String) : [],
          length = result.length;

      for (var key in value) {
        if ((inherited || hasOwnProperty$7.call(value, key)) &&
            !(skipIndexes && (
               // Safari 9 has enumerable `arguments.length` in strict mode.
               key == 'length' ||
               // Node.js 0.10 has enumerable non-index properties on buffers.
               (isBuff && (key == 'offset' || key == 'parent')) ||
               // PhantomJS 2 has enumerable non-index properties on typed arrays.
               (isType && (key == 'buffer' || key == 'byteLength' || key == 'byteOffset')) ||
               // Skip index properties.
               _isIndex(key, length)
            ))) {
          result.push(key);
        }
      }
      return result;
    }

    var _arrayLikeKeys = arrayLikeKeys;

    /** Used for built-in method references. */
    var objectProto$9 = Object.prototype;

    /**
     * Checks if `value` is likely a prototype object.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a prototype, else `false`.
     */
    function isPrototype(value) {
      var Ctor = value && value.constructor,
          proto = (typeof Ctor == 'function' && Ctor.prototype) || objectProto$9;

      return value === proto;
    }

    var _isPrototype = isPrototype;

    /**
     * Creates a unary function that invokes `func` with its argument transformed.
     *
     * @private
     * @param {Function} func The function to wrap.
     * @param {Function} transform The argument transform.
     * @returns {Function} Returns the new function.
     */
    function overArg(func, transform) {
      return function(arg) {
        return func(transform(arg));
      };
    }

    var _overArg = overArg;

    /* Built-in method references for those with the same name as other `lodash` methods. */
    var nativeKeys = _overArg(Object.keys, Object);

    var _nativeKeys = nativeKeys;

    /** Used for built-in method references. */
    var objectProto$a = Object.prototype;

    /** Used to check objects for own properties. */
    var hasOwnProperty$8 = objectProto$a.hasOwnProperty;

    /**
     * The base implementation of `_.keys` which doesn't treat sparse arrays as dense.
     *
     * @private
     * @param {Object} object The object to query.
     * @returns {Array} Returns the array of property names.
     */
    function baseKeys(object) {
      if (!_isPrototype(object)) {
        return _nativeKeys(object);
      }
      var result = [];
      for (var key in Object(object)) {
        if (hasOwnProperty$8.call(object, key) && key != 'constructor') {
          result.push(key);
        }
      }
      return result;
    }

    var _baseKeys = baseKeys;

    /**
     * Checks if `value` is array-like. A value is considered array-like if it's
     * not a function and has a `value.length` that's an integer greater than or
     * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
     * @example
     *
     * _.isArrayLike([1, 2, 3]);
     * // => true
     *
     * _.isArrayLike(document.body.children);
     * // => true
     *
     * _.isArrayLike('abc');
     * // => true
     *
     * _.isArrayLike(_.noop);
     * // => false
     */
    function isArrayLike(value) {
      return value != null && isLength_1(value.length) && !isFunction_1(value);
    }

    var isArrayLike_1 = isArrayLike;

    /**
     * Creates an array of the own enumerable property names of `object`.
     *
     * **Note:** Non-object values are coerced to objects. See the
     * [ES spec](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
     * for more details.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Object
     * @param {Object} object The object to query.
     * @returns {Array} Returns the array of property names.
     * @example
     *
     * function Foo() {
     *   this.a = 1;
     *   this.b = 2;
     * }
     *
     * Foo.prototype.c = 3;
     *
     * _.keys(new Foo);
     * // => ['a', 'b'] (iteration order is not guaranteed)
     *
     * _.keys('hi');
     * // => ['0', '1']
     */
    function keys(object) {
      return isArrayLike_1(object) ? _arrayLikeKeys(object) : _baseKeys(object);
    }

    var keys_1 = keys;

    /**
     * The base implementation of `_.assign` without support for multiple sources
     * or `customizer` functions.
     *
     * @private
     * @param {Object} object The destination object.
     * @param {Object} source The source object.
     * @returns {Object} Returns `object`.
     */
    function baseAssign(object, source) {
      return object && _copyObject(source, keys_1(source), object);
    }

    var _baseAssign = baseAssign;

    /**
     * This function is like
     * [`Object.keys`](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
     * except that it includes inherited enumerable properties.
     *
     * @private
     * @param {Object} object The object to query.
     * @returns {Array} Returns the array of property names.
     */
    function nativeKeysIn(object) {
      var result = [];
      if (object != null) {
        for (var key in Object(object)) {
          result.push(key);
        }
      }
      return result;
    }

    var _nativeKeysIn = nativeKeysIn;

    /** Used for built-in method references. */
    var objectProto$b = Object.prototype;

    /** Used to check objects for own properties. */
    var hasOwnProperty$9 = objectProto$b.hasOwnProperty;

    /**
     * The base implementation of `_.keysIn` which doesn't treat sparse arrays as dense.
     *
     * @private
     * @param {Object} object The object to query.
     * @returns {Array} Returns the array of property names.
     */
    function baseKeysIn(object) {
      if (!isObject_1(object)) {
        return _nativeKeysIn(object);
      }
      var isProto = _isPrototype(object),
          result = [];

      for (var key in object) {
        if (!(key == 'constructor' && (isProto || !hasOwnProperty$9.call(object, key)))) {
          result.push(key);
        }
      }
      return result;
    }

    var _baseKeysIn = baseKeysIn;

    /**
     * Creates an array of the own and inherited enumerable property names of `object`.
     *
     * **Note:** Non-object values are coerced to objects.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category Object
     * @param {Object} object The object to query.
     * @returns {Array} Returns the array of property names.
     * @example
     *
     * function Foo() {
     *   this.a = 1;
     *   this.b = 2;
     * }
     *
     * Foo.prototype.c = 3;
     *
     * _.keysIn(new Foo);
     * // => ['a', 'b', 'c'] (iteration order is not guaranteed)
     */
    function keysIn$1(object) {
      return isArrayLike_1(object) ? _arrayLikeKeys(object, true) : _baseKeysIn(object);
    }

    var keysIn_1 = keysIn$1;

    /**
     * The base implementation of `_.assignIn` without support for multiple sources
     * or `customizer` functions.
     *
     * @private
     * @param {Object} object The destination object.
     * @param {Object} source The source object.
     * @returns {Object} Returns `object`.
     */
    function baseAssignIn(object, source) {
      return object && _copyObject(source, keysIn_1(source), object);
    }

    var _baseAssignIn = baseAssignIn;

    var _cloneBuffer = createCommonjsModule(function (module, exports) {
    /** Detect free variable `exports`. */
    var freeExports =  exports && !exports.nodeType && exports;

    /** Detect free variable `module`. */
    var freeModule = freeExports && 'object' == 'object' && module && !module.nodeType && module;

    /** Detect the popular CommonJS extension `module.exports`. */
    var moduleExports = freeModule && freeModule.exports === freeExports;

    /** Built-in value references. */
    var Buffer = moduleExports ? _root.Buffer : undefined,
        allocUnsafe = Buffer ? Buffer.allocUnsafe : undefined;

    /**
     * Creates a clone of  `buffer`.
     *
     * @private
     * @param {Buffer} buffer The buffer to clone.
     * @param {boolean} [isDeep] Specify a deep clone.
     * @returns {Buffer} Returns the cloned buffer.
     */
    function cloneBuffer(buffer, isDeep) {
      if (isDeep) {
        return buffer.slice();
      }
      var length = buffer.length,
          result = allocUnsafe ? allocUnsafe(length) : new buffer.constructor(length);

      buffer.copy(result);
      return result;
    }

    module.exports = cloneBuffer;
    });

    /**
     * Copies the values of `source` to `array`.
     *
     * @private
     * @param {Array} source The array to copy values from.
     * @param {Array} [array=[]] The array to copy values to.
     * @returns {Array} Returns `array`.
     */
    function copyArray(source, array) {
      var index = -1,
          length = source.length;

      array || (array = Array(length));
      while (++index < length) {
        array[index] = source[index];
      }
      return array;
    }

    var _copyArray = copyArray;

    /**
     * A specialized version of `_.filter` for arrays without support for
     * iteratee shorthands.
     *
     * @private
     * @param {Array} [array] The array to iterate over.
     * @param {Function} predicate The function invoked per iteration.
     * @returns {Array} Returns the new filtered array.
     */
    function arrayFilter(array, predicate) {
      var index = -1,
          length = array == null ? 0 : array.length,
          resIndex = 0,
          result = [];

      while (++index < length) {
        var value = array[index];
        if (predicate(value, index, array)) {
          result[resIndex++] = value;
        }
      }
      return result;
    }

    var _arrayFilter = arrayFilter;

    /**
     * This method returns a new empty array.
     *
     * @static
     * @memberOf _
     * @since 4.13.0
     * @category Util
     * @returns {Array} Returns the new empty array.
     * @example
     *
     * var arrays = _.times(2, _.stubArray);
     *
     * console.log(arrays);
     * // => [[], []]
     *
     * console.log(arrays[0] === arrays[1]);
     * // => false
     */
    function stubArray() {
      return [];
    }

    var stubArray_1 = stubArray;

    /** Used for built-in method references. */
    var objectProto$c = Object.prototype;

    /** Built-in value references. */
    var propertyIsEnumerable$1 = objectProto$c.propertyIsEnumerable;

    /* Built-in method references for those with the same name as other `lodash` methods. */
    var nativeGetSymbols = Object.getOwnPropertySymbols;

    /**
     * Creates an array of the own enumerable symbols of `object`.
     *
     * @private
     * @param {Object} object The object to query.
     * @returns {Array} Returns the array of symbols.
     */
    var getSymbols = !nativeGetSymbols ? stubArray_1 : function(object) {
      if (object == null) {
        return [];
      }
      object = Object(object);
      return _arrayFilter(nativeGetSymbols(object), function(symbol) {
        return propertyIsEnumerable$1.call(object, symbol);
      });
    };

    var _getSymbols = getSymbols;

    /**
     * Copies own symbols of `source` to `object`.
     *
     * @private
     * @param {Object} source The object to copy symbols from.
     * @param {Object} [object={}] The object to copy symbols to.
     * @returns {Object} Returns `object`.
     */
    function copySymbols(source, object) {
      return _copyObject(source, _getSymbols(source), object);
    }

    var _copySymbols = copySymbols;

    /**
     * Appends the elements of `values` to `array`.
     *
     * @private
     * @param {Array} array The array to modify.
     * @param {Array} values The values to append.
     * @returns {Array} Returns `array`.
     */
    function arrayPush(array, values) {
      var index = -1,
          length = values.length,
          offset = array.length;

      while (++index < length) {
        array[offset + index] = values[index];
      }
      return array;
    }

    var _arrayPush = arrayPush;

    /** Built-in value references. */
    var getPrototype = _overArg(Object.getPrototypeOf, Object);

    var _getPrototype = getPrototype;

    /* Built-in method references for those with the same name as other `lodash` methods. */
    var nativeGetSymbols$1 = Object.getOwnPropertySymbols;

    /**
     * Creates an array of the own and inherited enumerable symbols of `object`.
     *
     * @private
     * @param {Object} object The object to query.
     * @returns {Array} Returns the array of symbols.
     */
    var getSymbolsIn = !nativeGetSymbols$1 ? stubArray_1 : function(object) {
      var result = [];
      while (object) {
        _arrayPush(result, _getSymbols(object));
        object = _getPrototype(object);
      }
      return result;
    };

    var _getSymbolsIn = getSymbolsIn;

    /**
     * Copies own and inherited symbols of `source` to `object`.
     *
     * @private
     * @param {Object} source The object to copy symbols from.
     * @param {Object} [object={}] The object to copy symbols to.
     * @returns {Object} Returns `object`.
     */
    function copySymbolsIn(source, object) {
      return _copyObject(source, _getSymbolsIn(source), object);
    }

    var _copySymbolsIn = copySymbolsIn;

    /**
     * The base implementation of `getAllKeys` and `getAllKeysIn` which uses
     * `keysFunc` and `symbolsFunc` to get the enumerable property names and
     * symbols of `object`.
     *
     * @private
     * @param {Object} object The object to query.
     * @param {Function} keysFunc The function to get the keys of `object`.
     * @param {Function} symbolsFunc The function to get the symbols of `object`.
     * @returns {Array} Returns the array of property names and symbols.
     */
    function baseGetAllKeys(object, keysFunc, symbolsFunc) {
      var result = keysFunc(object);
      return isArray_1(object) ? result : _arrayPush(result, symbolsFunc(object));
    }

    var _baseGetAllKeys = baseGetAllKeys;

    /**
     * Creates an array of own enumerable property names and symbols of `object`.
     *
     * @private
     * @param {Object} object The object to query.
     * @returns {Array} Returns the array of property names and symbols.
     */
    function getAllKeys(object) {
      return _baseGetAllKeys(object, keys_1, _getSymbols);
    }

    var _getAllKeys = getAllKeys;

    /**
     * Creates an array of own and inherited enumerable property names and
     * symbols of `object`.
     *
     * @private
     * @param {Object} object The object to query.
     * @returns {Array} Returns the array of property names and symbols.
     */
    function getAllKeysIn(object) {
      return _baseGetAllKeys(object, keysIn_1, _getSymbolsIn);
    }

    var _getAllKeysIn = getAllKeysIn;

    /* Built-in method references that are verified to be native. */
    var DataView = _getNative(_root, 'DataView');

    var _DataView = DataView;

    /* Built-in method references that are verified to be native. */
    var Promise$1 = _getNative(_root, 'Promise');

    var _Promise = Promise$1;

    /* Built-in method references that are verified to be native. */
    var Set$1 = _getNative(_root, 'Set');

    var _Set = Set$1;

    /* Built-in method references that are verified to be native. */
    var WeakMap = _getNative(_root, 'WeakMap');

    var _WeakMap = WeakMap;

    /** `Object#toString` result references. */
    var mapTag$1 = '[object Map]',
        objectTag$1 = '[object Object]',
        promiseTag = '[object Promise]',
        setTag$1 = '[object Set]',
        weakMapTag$1 = '[object WeakMap]';

    var dataViewTag$1 = '[object DataView]';

    /** Used to detect maps, sets, and weakmaps. */
    var dataViewCtorString = _toSource(_DataView),
        mapCtorString = _toSource(_Map),
        promiseCtorString = _toSource(_Promise),
        setCtorString = _toSource(_Set),
        weakMapCtorString = _toSource(_WeakMap);

    /**
     * Gets the `toStringTag` of `value`.
     *
     * @private
     * @param {*} value The value to query.
     * @returns {string} Returns the `toStringTag`.
     */
    var getTag = _baseGetTag;

    // Fallback for data views, maps, sets, and weak maps in IE 11 and promises in Node.js < 6.
    if ((_DataView && getTag(new _DataView(new ArrayBuffer(1))) != dataViewTag$1) ||
        (_Map && getTag(new _Map) != mapTag$1) ||
        (_Promise && getTag(_Promise.resolve()) != promiseTag) ||
        (_Set && getTag(new _Set) != setTag$1) ||
        (_WeakMap && getTag(new _WeakMap) != weakMapTag$1)) {
      getTag = function(value) {
        var result = _baseGetTag(value),
            Ctor = result == objectTag$1 ? value.constructor : undefined,
            ctorString = Ctor ? _toSource(Ctor) : '';

        if (ctorString) {
          switch (ctorString) {
            case dataViewCtorString: return dataViewTag$1;
            case mapCtorString: return mapTag$1;
            case promiseCtorString: return promiseTag;
            case setCtorString: return setTag$1;
            case weakMapCtorString: return weakMapTag$1;
          }
        }
        return result;
      };
    }

    var _getTag = getTag;

    /** Used for built-in method references. */
    var objectProto$d = Object.prototype;

    /** Used to check objects for own properties. */
    var hasOwnProperty$a = objectProto$d.hasOwnProperty;

    /**
     * Initializes an array clone.
     *
     * @private
     * @param {Array} array The array to clone.
     * @returns {Array} Returns the initialized clone.
     */
    function initCloneArray(array) {
      var length = array.length,
          result = new array.constructor(length);

      // Add properties assigned by `RegExp#exec`.
      if (length && typeof array[0] == 'string' && hasOwnProperty$a.call(array, 'index')) {
        result.index = array.index;
        result.input = array.input;
      }
      return result;
    }

    var _initCloneArray = initCloneArray;

    /** Built-in value references. */
    var Uint8Array = _root.Uint8Array;

    var _Uint8Array = Uint8Array;

    /**
     * Creates a clone of `arrayBuffer`.
     *
     * @private
     * @param {ArrayBuffer} arrayBuffer The array buffer to clone.
     * @returns {ArrayBuffer} Returns the cloned array buffer.
     */
    function cloneArrayBuffer(arrayBuffer) {
      var result = new arrayBuffer.constructor(arrayBuffer.byteLength);
      new _Uint8Array(result).set(new _Uint8Array(arrayBuffer));
      return result;
    }

    var _cloneArrayBuffer = cloneArrayBuffer;

    /**
     * Creates a clone of `dataView`.
     *
     * @private
     * @param {Object} dataView The data view to clone.
     * @param {boolean} [isDeep] Specify a deep clone.
     * @returns {Object} Returns the cloned data view.
     */
    function cloneDataView(dataView, isDeep) {
      var buffer = isDeep ? _cloneArrayBuffer(dataView.buffer) : dataView.buffer;
      return new dataView.constructor(buffer, dataView.byteOffset, dataView.byteLength);
    }

    var _cloneDataView = cloneDataView;

    /** Used to match `RegExp` flags from their coerced string values. */
    var reFlags = /\w*$/;

    /**
     * Creates a clone of `regexp`.
     *
     * @private
     * @param {Object} regexp The regexp to clone.
     * @returns {Object} Returns the cloned regexp.
     */
    function cloneRegExp(regexp) {
      var result = new regexp.constructor(regexp.source, reFlags.exec(regexp));
      result.lastIndex = regexp.lastIndex;
      return result;
    }

    var _cloneRegExp = cloneRegExp;

    /** Used to convert symbols to primitives and strings. */
    var symbolProto$1 = _Symbol ? _Symbol.prototype : undefined,
        symbolValueOf = symbolProto$1 ? symbolProto$1.valueOf : undefined;

    /**
     * Creates a clone of the `symbol` object.
     *
     * @private
     * @param {Object} symbol The symbol object to clone.
     * @returns {Object} Returns the cloned symbol object.
     */
    function cloneSymbol(symbol) {
      return symbolValueOf ? Object(symbolValueOf.call(symbol)) : {};
    }

    var _cloneSymbol = cloneSymbol;

    /**
     * Creates a clone of `typedArray`.
     *
     * @private
     * @param {Object} typedArray The typed array to clone.
     * @param {boolean} [isDeep] Specify a deep clone.
     * @returns {Object} Returns the cloned typed array.
     */
    function cloneTypedArray(typedArray, isDeep) {
      var buffer = isDeep ? _cloneArrayBuffer(typedArray.buffer) : typedArray.buffer;
      return new typedArray.constructor(buffer, typedArray.byteOffset, typedArray.length);
    }

    var _cloneTypedArray = cloneTypedArray;

    /** `Object#toString` result references. */
    var boolTag$1 = '[object Boolean]',
        dateTag$1 = '[object Date]',
        mapTag$2 = '[object Map]',
        numberTag$1 = '[object Number]',
        regexpTag$1 = '[object RegExp]',
        setTag$2 = '[object Set]',
        stringTag$1 = '[object String]',
        symbolTag$1 = '[object Symbol]';

    var arrayBufferTag$1 = '[object ArrayBuffer]',
        dataViewTag$2 = '[object DataView]',
        float32Tag$1 = '[object Float32Array]',
        float64Tag$1 = '[object Float64Array]',
        int8Tag$1 = '[object Int8Array]',
        int16Tag$1 = '[object Int16Array]',
        int32Tag$1 = '[object Int32Array]',
        uint8Tag$1 = '[object Uint8Array]',
        uint8ClampedTag$1 = '[object Uint8ClampedArray]',
        uint16Tag$1 = '[object Uint16Array]',
        uint32Tag$1 = '[object Uint32Array]';

    /**
     * Initializes an object clone based on its `toStringTag`.
     *
     * **Note:** This function only supports cloning values with tags of
     * `Boolean`, `Date`, `Error`, `Map`, `Number`, `RegExp`, `Set`, or `String`.
     *
     * @private
     * @param {Object} object The object to clone.
     * @param {string} tag The `toStringTag` of the object to clone.
     * @param {boolean} [isDeep] Specify a deep clone.
     * @returns {Object} Returns the initialized clone.
     */
    function initCloneByTag(object, tag, isDeep) {
      var Ctor = object.constructor;
      switch (tag) {
        case arrayBufferTag$1:
          return _cloneArrayBuffer(object);

        case boolTag$1:
        case dateTag$1:
          return new Ctor(+object);

        case dataViewTag$2:
          return _cloneDataView(object, isDeep);

        case float32Tag$1: case float64Tag$1:
        case int8Tag$1: case int16Tag$1: case int32Tag$1:
        case uint8Tag$1: case uint8ClampedTag$1: case uint16Tag$1: case uint32Tag$1:
          return _cloneTypedArray(object, isDeep);

        case mapTag$2:
          return new Ctor;

        case numberTag$1:
        case stringTag$1:
          return new Ctor(object);

        case regexpTag$1:
          return _cloneRegExp(object);

        case setTag$2:
          return new Ctor;

        case symbolTag$1:
          return _cloneSymbol(object);
      }
    }

    var _initCloneByTag = initCloneByTag;

    /** Built-in value references. */
    var objectCreate = Object.create;

    /**
     * The base implementation of `_.create` without support for assigning
     * properties to the created object.
     *
     * @private
     * @param {Object} proto The object to inherit from.
     * @returns {Object} Returns the new object.
     */
    var baseCreate = (function() {
      function object() {}
      return function(proto) {
        if (!isObject_1(proto)) {
          return {};
        }
        if (objectCreate) {
          return objectCreate(proto);
        }
        object.prototype = proto;
        var result = new object;
        object.prototype = undefined;
        return result;
      };
    }());

    var _baseCreate = baseCreate;

    /**
     * Initializes an object clone.
     *
     * @private
     * @param {Object} object The object to clone.
     * @returns {Object} Returns the initialized clone.
     */
    function initCloneObject(object) {
      return (typeof object.constructor == 'function' && !_isPrototype(object))
        ? _baseCreate(_getPrototype(object))
        : {};
    }

    var _initCloneObject = initCloneObject;

    /** `Object#toString` result references. */
    var mapTag$3 = '[object Map]';

    /**
     * The base implementation of `_.isMap` without Node.js optimizations.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a map, else `false`.
     */
    function baseIsMap(value) {
      return isObjectLike_1(value) && _getTag(value) == mapTag$3;
    }

    var _baseIsMap = baseIsMap;

    /* Node.js helper references. */
    var nodeIsMap = _nodeUtil && _nodeUtil.isMap;

    /**
     * Checks if `value` is classified as a `Map` object.
     *
     * @static
     * @memberOf _
     * @since 4.3.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a map, else `false`.
     * @example
     *
     * _.isMap(new Map);
     * // => true
     *
     * _.isMap(new WeakMap);
     * // => false
     */
    var isMap = nodeIsMap ? _baseUnary(nodeIsMap) : _baseIsMap;

    var isMap_1 = isMap;

    /** `Object#toString` result references. */
    var setTag$3 = '[object Set]';

    /**
     * The base implementation of `_.isSet` without Node.js optimizations.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a set, else `false`.
     */
    function baseIsSet(value) {
      return isObjectLike_1(value) && _getTag(value) == setTag$3;
    }

    var _baseIsSet = baseIsSet;

    /* Node.js helper references. */
    var nodeIsSet = _nodeUtil && _nodeUtil.isSet;

    /**
     * Checks if `value` is classified as a `Set` object.
     *
     * @static
     * @memberOf _
     * @since 4.3.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a set, else `false`.
     * @example
     *
     * _.isSet(new Set);
     * // => true
     *
     * _.isSet(new WeakSet);
     * // => false
     */
    var isSet = nodeIsSet ? _baseUnary(nodeIsSet) : _baseIsSet;

    var isSet_1 = isSet;

    /** Used to compose bitmasks for cloning. */
    var CLONE_DEEP_FLAG = 1,
        CLONE_FLAT_FLAG = 2,
        CLONE_SYMBOLS_FLAG = 4;

    /** `Object#toString` result references. */
    var argsTag$2 = '[object Arguments]',
        arrayTag$1 = '[object Array]',
        boolTag$2 = '[object Boolean]',
        dateTag$2 = '[object Date]',
        errorTag$1 = '[object Error]',
        funcTag$2 = '[object Function]',
        genTag$1 = '[object GeneratorFunction]',
        mapTag$4 = '[object Map]',
        numberTag$2 = '[object Number]',
        objectTag$2 = '[object Object]',
        regexpTag$2 = '[object RegExp]',
        setTag$4 = '[object Set]',
        stringTag$2 = '[object String]',
        symbolTag$2 = '[object Symbol]',
        weakMapTag$2 = '[object WeakMap]';

    var arrayBufferTag$2 = '[object ArrayBuffer]',
        dataViewTag$3 = '[object DataView]',
        float32Tag$2 = '[object Float32Array]',
        float64Tag$2 = '[object Float64Array]',
        int8Tag$2 = '[object Int8Array]',
        int16Tag$2 = '[object Int16Array]',
        int32Tag$2 = '[object Int32Array]',
        uint8Tag$2 = '[object Uint8Array]',
        uint8ClampedTag$2 = '[object Uint8ClampedArray]',
        uint16Tag$2 = '[object Uint16Array]',
        uint32Tag$2 = '[object Uint32Array]';

    /** Used to identify `toStringTag` values supported by `_.clone`. */
    var cloneableTags = {};
    cloneableTags[argsTag$2] = cloneableTags[arrayTag$1] =
    cloneableTags[arrayBufferTag$2] = cloneableTags[dataViewTag$3] =
    cloneableTags[boolTag$2] = cloneableTags[dateTag$2] =
    cloneableTags[float32Tag$2] = cloneableTags[float64Tag$2] =
    cloneableTags[int8Tag$2] = cloneableTags[int16Tag$2] =
    cloneableTags[int32Tag$2] = cloneableTags[mapTag$4] =
    cloneableTags[numberTag$2] = cloneableTags[objectTag$2] =
    cloneableTags[regexpTag$2] = cloneableTags[setTag$4] =
    cloneableTags[stringTag$2] = cloneableTags[symbolTag$2] =
    cloneableTags[uint8Tag$2] = cloneableTags[uint8ClampedTag$2] =
    cloneableTags[uint16Tag$2] = cloneableTags[uint32Tag$2] = true;
    cloneableTags[errorTag$1] = cloneableTags[funcTag$2] =
    cloneableTags[weakMapTag$2] = false;

    /**
     * The base implementation of `_.clone` and `_.cloneDeep` which tracks
     * traversed objects.
     *
     * @private
     * @param {*} value The value to clone.
     * @param {boolean} bitmask The bitmask flags.
     *  1 - Deep clone
     *  2 - Flatten inherited properties
     *  4 - Clone symbols
     * @param {Function} [customizer] The function to customize cloning.
     * @param {string} [key] The key of `value`.
     * @param {Object} [object] The parent object of `value`.
     * @param {Object} [stack] Tracks traversed objects and their clone counterparts.
     * @returns {*} Returns the cloned value.
     */
    function baseClone(value, bitmask, customizer, key, object, stack) {
      var result,
          isDeep = bitmask & CLONE_DEEP_FLAG,
          isFlat = bitmask & CLONE_FLAT_FLAG,
          isFull = bitmask & CLONE_SYMBOLS_FLAG;

      if (customizer) {
        result = object ? customizer(value, key, object, stack) : customizer(value);
      }
      if (result !== undefined) {
        return result;
      }
      if (!isObject_1(value)) {
        return value;
      }
      var isArr = isArray_1(value);
      if (isArr) {
        result = _initCloneArray(value);
        if (!isDeep) {
          return _copyArray(value, result);
        }
      } else {
        var tag = _getTag(value),
            isFunc = tag == funcTag$2 || tag == genTag$1;

        if (isBuffer_1(value)) {
          return _cloneBuffer(value, isDeep);
        }
        if (tag == objectTag$2 || tag == argsTag$2 || (isFunc && !object)) {
          result = (isFlat || isFunc) ? {} : _initCloneObject(value);
          if (!isDeep) {
            return isFlat
              ? _copySymbolsIn(value, _baseAssignIn(result, value))
              : _copySymbols(value, _baseAssign(result, value));
          }
        } else {
          if (!cloneableTags[tag]) {
            return object ? value : {};
          }
          result = _initCloneByTag(value, tag, isDeep);
        }
      }
      // Check for circular references and return its corresponding clone.
      stack || (stack = new _Stack);
      var stacked = stack.get(value);
      if (stacked) {
        return stacked;
      }
      stack.set(value, result);

      if (isSet_1(value)) {
        value.forEach(function(subValue) {
          result.add(baseClone(subValue, bitmask, customizer, subValue, value, stack));
        });
      } else if (isMap_1(value)) {
        value.forEach(function(subValue, key) {
          result.set(key, baseClone(subValue, bitmask, customizer, key, value, stack));
        });
      }

      var keysFunc = isFull
        ? (isFlat ? _getAllKeysIn : _getAllKeys)
        : (isFlat ? keysIn : keys_1);

      var props = isArr ? undefined : keysFunc(value);
      _arrayEach(props || value, function(subValue, key) {
        if (props) {
          key = subValue;
          subValue = value[key];
        }
        // Recursively populate clone (susceptible to call stack limits).
        _assignValue(result, key, baseClone(subValue, bitmask, customizer, key, value, stack));
      });
      return result;
    }

    var _baseClone = baseClone;

    /** Used to compose bitmasks for cloning. */
    var CLONE_DEEP_FLAG$1 = 1,
        CLONE_SYMBOLS_FLAG$1 = 4;

    /**
     * This method is like `_.cloneWith` except that it recursively clones `value`.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to recursively clone.
     * @param {Function} [customizer] The function to customize cloning.
     * @returns {*} Returns the deep cloned value.
     * @see _.cloneWith
     * @example
     *
     * function customizer(value) {
     *   if (_.isElement(value)) {
     *     return value.cloneNode(true);
     *   }
     * }
     *
     * var el = _.cloneDeepWith(document.body, customizer);
     *
     * console.log(el === document.body);
     * // => false
     * console.log(el.nodeName);
     * // => 'BODY'
     * console.log(el.childNodes.length);
     * // => 20
     */
    function cloneDeepWith(value, customizer) {
      customizer = typeof customizer == 'function' ? customizer : undefined;
      return _baseClone(value, CLONE_DEEP_FLAG$1 | CLONE_SYMBOLS_FLAG$1, customizer);
    }

    var cloneDeepWith_1 = cloneDeepWith;

    /** `Object#toString` result references. */
    var stringTag$3 = '[object String]';

    /**
     * Checks if `value` is classified as a `String` primitive or object.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a string, else `false`.
     * @example
     *
     * _.isString('abc');
     * // => true
     *
     * _.isString(1);
     * // => false
     */
    function isString(value) {
      return typeof value == 'string' ||
        (!isArray_1(value) && isObjectLike_1(value) && _baseGetTag(value) == stringTag$3);
    }

    var isString_1 = isString;

    /**
     * Converts `iterator` to an array.
     *
     * @private
     * @param {Object} iterator The iterator to convert.
     * @returns {Array} Returns the converted array.
     */
    function iteratorToArray(iterator) {
      var data,
          result = [];

      while (!(data = iterator.next()).done) {
        result.push(data.value);
      }
      return result;
    }

    var _iteratorToArray = iteratorToArray;

    /**
     * Converts `map` to its key-value pairs.
     *
     * @private
     * @param {Object} map The map to convert.
     * @returns {Array} Returns the key-value pairs.
     */
    function mapToArray(map) {
      var index = -1,
          result = Array(map.size);

      map.forEach(function(value, key) {
        result[++index] = [key, value];
      });
      return result;
    }

    var _mapToArray = mapToArray;

    /**
     * Converts `set` to an array of its values.
     *
     * @private
     * @param {Object} set The set to convert.
     * @returns {Array} Returns the values.
     */
    function setToArray(set) {
      var index = -1,
          result = Array(set.size);

      set.forEach(function(value) {
        result[++index] = value;
      });
      return result;
    }

    var _setToArray = setToArray;

    /**
     * Converts an ASCII `string` to an array.
     *
     * @private
     * @param {string} string The string to convert.
     * @returns {Array} Returns the converted array.
     */
    function asciiToArray(string) {
      return string.split('');
    }

    var _asciiToArray = asciiToArray;

    /** Used to compose unicode character classes. */
    var rsAstralRange = '\\ud800-\\udfff',
        rsComboMarksRange = '\\u0300-\\u036f',
        reComboHalfMarksRange = '\\ufe20-\\ufe2f',
        rsComboSymbolsRange = '\\u20d0-\\u20ff',
        rsComboRange = rsComboMarksRange + reComboHalfMarksRange + rsComboSymbolsRange,
        rsVarRange = '\\ufe0e\\ufe0f';

    /** Used to compose unicode capture groups. */
    var rsZWJ = '\\u200d';

    /** Used to detect strings with [zero-width joiners or code points from the astral planes](http://eev.ee/blog/2015/09/12/dark-corners-of-unicode/). */
    var reHasUnicode = RegExp('[' + rsZWJ + rsAstralRange  + rsComboRange + rsVarRange + ']');

    /**
     * Checks if `string` contains Unicode symbols.
     *
     * @private
     * @param {string} string The string to inspect.
     * @returns {boolean} Returns `true` if a symbol is found, else `false`.
     */
    function hasUnicode(string) {
      return reHasUnicode.test(string);
    }

    var _hasUnicode = hasUnicode;

    /** Used to compose unicode character classes. */
    var rsAstralRange$1 = '\\ud800-\\udfff',
        rsComboMarksRange$1 = '\\u0300-\\u036f',
        reComboHalfMarksRange$1 = '\\ufe20-\\ufe2f',
        rsComboSymbolsRange$1 = '\\u20d0-\\u20ff',
        rsComboRange$1 = rsComboMarksRange$1 + reComboHalfMarksRange$1 + rsComboSymbolsRange$1,
        rsVarRange$1 = '\\ufe0e\\ufe0f';

    /** Used to compose unicode capture groups. */
    var rsAstral = '[' + rsAstralRange$1 + ']',
        rsCombo = '[' + rsComboRange$1 + ']',
        rsFitz = '\\ud83c[\\udffb-\\udfff]',
        rsModifier = '(?:' + rsCombo + '|' + rsFitz + ')',
        rsNonAstral = '[^' + rsAstralRange$1 + ']',
        rsRegional = '(?:\\ud83c[\\udde6-\\uddff]){2}',
        rsSurrPair = '[\\ud800-\\udbff][\\udc00-\\udfff]',
        rsZWJ$1 = '\\u200d';

    /** Used to compose unicode regexes. */
    var reOptMod = rsModifier + '?',
        rsOptVar = '[' + rsVarRange$1 + ']?',
        rsOptJoin = '(?:' + rsZWJ$1 + '(?:' + [rsNonAstral, rsRegional, rsSurrPair].join('|') + ')' + rsOptVar + reOptMod + ')*',
        rsSeq = rsOptVar + reOptMod + rsOptJoin,
        rsSymbol = '(?:' + [rsNonAstral + rsCombo + '?', rsCombo, rsRegional, rsSurrPair, rsAstral].join('|') + ')';

    /** Used to match [string symbols](https://mathiasbynens.be/notes/javascript-unicode). */
    var reUnicode = RegExp(rsFitz + '(?=' + rsFitz + ')|' + rsSymbol + rsSeq, 'g');

    /**
     * Converts a Unicode `string` to an array.
     *
     * @private
     * @param {string} string The string to convert.
     * @returns {Array} Returns the converted array.
     */
    function unicodeToArray(string) {
      return string.match(reUnicode) || [];
    }

    var _unicodeToArray = unicodeToArray;

    /**
     * Converts `string` to an array.
     *
     * @private
     * @param {string} string The string to convert.
     * @returns {Array} Returns the converted array.
     */
    function stringToArray(string) {
      return _hasUnicode(string)
        ? _unicodeToArray(string)
        : _asciiToArray(string);
    }

    var _stringToArray = stringToArray;

    /**
     * The base implementation of `_.values` and `_.valuesIn` which creates an
     * array of `object` property values corresponding to the property names
     * of `props`.
     *
     * @private
     * @param {Object} object The object to query.
     * @param {Array} props The property names to get values for.
     * @returns {Object} Returns the array of property values.
     */
    function baseValues(object, props) {
      return _arrayMap(props, function(key) {
        return object[key];
      });
    }

    var _baseValues = baseValues;

    /**
     * Creates an array of the own enumerable string keyed property values of `object`.
     *
     * **Note:** Non-object values are coerced to objects.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Object
     * @param {Object} object The object to query.
     * @returns {Array} Returns the array of property values.
     * @example
     *
     * function Foo() {
     *   this.a = 1;
     *   this.b = 2;
     * }
     *
     * Foo.prototype.c = 3;
     *
     * _.values(new Foo);
     * // => [1, 2] (iteration order is not guaranteed)
     *
     * _.values('hi');
     * // => ['h', 'i']
     */
    function values(object) {
      return object == null ? [] : _baseValues(object, keys_1(object));
    }

    var values_1 = values;

    /** `Object#toString` result references. */
    var mapTag$5 = '[object Map]',
        setTag$5 = '[object Set]';

    /** Built-in value references. */
    var symIterator = _Symbol ? _Symbol.iterator : undefined;

    /**
     * Converts `value` to an array.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Lang
     * @param {*} value The value to convert.
     * @returns {Array} Returns the converted array.
     * @example
     *
     * _.toArray({ 'a': 1, 'b': 2 });
     * // => [1, 2]
     *
     * _.toArray('abc');
     * // => ['a', 'b', 'c']
     *
     * _.toArray(1);
     * // => []
     *
     * _.toArray(null);
     * // => []
     */
    function toArray(value) {
      if (!value) {
        return [];
      }
      if (isArrayLike_1(value)) {
        return isString_1(value) ? _stringToArray(value) : _copyArray(value);
      }
      if (symIterator && value[symIterator]) {
        return _iteratorToArray(value[symIterator]());
      }
      var tag = _getTag(value),
          func = tag == mapTag$5 ? _mapToArray : (tag == setTag$5 ? _setToArray : values_1);

      return func(value);
    }

    var toArray_1 = toArray;

    var printValue_1 = createCommonjsModule(function (module, exports) {

    exports.__esModule = true;
    exports.default = printValue;
    var toString = Object.prototype.toString;
    var errorToString = Error.prototype.toString;
    var regExpToString = RegExp.prototype.toString;
    var symbolToString = typeof Symbol !== 'undefined' ? Symbol.prototype.toString : function () {
      return '';
    };
    var SYMBOL_REGEXP = /^Symbol\((.*)\)(.*)$/;

    function printNumber(val) {
      if (val != +val) return 'NaN';
      var isNegativeZero = val === 0 && 1 / val < 0;
      return isNegativeZero ? '-0' : '' + val;
    }

    function printSimpleValue(val, quoteStrings) {
      if (quoteStrings === void 0) {
        quoteStrings = false;
      }

      if (val == null || val === true || val === false) return '' + val;
      var typeOf = typeof val;
      if (typeOf === 'number') return printNumber(val);
      if (typeOf === 'string') return quoteStrings ? "\"" + val + "\"" : val;
      if (typeOf === 'function') return '[Function ' + (val.name || 'anonymous') + ']';
      if (typeOf === 'symbol') return symbolToString.call(val).replace(SYMBOL_REGEXP, 'Symbol($1)');
      var tag = toString.call(val).slice(8, -1);
      if (tag === 'Date') return isNaN(val.getTime()) ? '' + val : val.toISOString(val);
      if (tag === 'Error' || val instanceof Error) return '[' + errorToString.call(val) + ']';
      if (tag === 'RegExp') return regExpToString.call(val);
      return null;
    }

    function printValue(value, quoteStrings) {
      var result = printSimpleValue(value, quoteStrings);
      if (result !== null) return result;
      return JSON.stringify(value, function (key, value) {
        var result = printSimpleValue(this[key], quoteStrings);
        if (result !== null) return result;
        return value;
      }, 2);
    }

    module.exports = exports["default"];
    });

    unwrapExports(printValue_1);

    var locale = createCommonjsModule(function (module, exports) {



    exports.__esModule = true;
    exports.default = exports.array = exports.object = exports.boolean = exports.date = exports.number = exports.string = exports.mixed = void 0;

    var _printValue = interopRequireDefault(printValue_1);

    var mixed = {
      default: '${path} is invalid',
      required: '${path} is a required field',
      oneOf: '${path} must be one of the following values: ${values}',
      notOneOf: '${path} must not be one of the following values: ${values}',
      notType: function notType(_ref) {
        var path = _ref.path,
            type = _ref.type,
            value = _ref.value,
            originalValue = _ref.originalValue;
        var isCast = originalValue != null && originalValue !== value;
        var msg = path + " must be a `" + type + "` type, " + ("but the final value was: `" + (0, _printValue.default)(value, true) + "`") + (isCast ? " (cast from the value `" + (0, _printValue.default)(originalValue, true) + "`)." : '.');

        if (value === null) {
          msg += "\n If \"null\" is intended as an empty value be sure to mark the schema as `.nullable()`";
        }

        return msg;
      }
    };
    exports.mixed = mixed;
    var string = {
      length: '${path} must be exactly ${length} characters',
      min: '${path} must be at least ${min} characters',
      max: '${path} must be at most ${max} characters',
      matches: '${path} must match the following: "${regex}"',
      email: '${path} must be a valid email',
      url: '${path} must be a valid URL',
      trim: '${path} must be a trimmed string',
      lowercase: '${path} must be a lowercase string',
      uppercase: '${path} must be a upper case string'
    };
    exports.string = string;
    var number = {
      min: '${path} must be greater than or equal to ${min}',
      max: '${path} must be less than or equal to ${max}',
      lessThan: '${path} must be less than ${less}',
      moreThan: '${path} must be greater than ${more}',
      notEqual: '${path} must be not equal to ${notEqual}',
      positive: '${path} must be a positive number',
      negative: '${path} must be a negative number',
      integer: '${path} must be an integer'
    };
    exports.number = number;
    var date = {
      min: '${path} field must be later than ${min}',
      max: '${path} field must be at earlier than ${max}'
    };
    exports.date = date;
    var boolean = {};
    exports.boolean = boolean;
    var object = {
      noUnknown: '${path} field cannot have keys not specified in the object shape'
    };
    exports.object = object;
    var array = {
      min: '${path} field must have at least ${min} items',
      max: '${path} field must have less than or equal to ${max} items'
    };
    exports.array = array;
    var _default = {
      mixed: mixed,
      string: string,
      number: number,
      date: date,
      object: object,
      array: array,
      boolean: boolean
    };
    exports.default = _default;
    });

    unwrapExports(locale);
    var locale_1 = locale.array;
    var locale_2 = locale.object;
    var locale_3 = locale.date;
    var locale_4 = locale.number;
    var locale_5 = locale.string;
    var locale_6 = locale.mixed;

    var isSchema = createCommonjsModule(function (module, exports) {

    exports.__esModule = true;
    exports.default = void 0;

    var _default = function _default(obj) {
      return obj && obj.__isYupSchema__;
    };

    exports.default = _default;
    module.exports = exports["default"];
    });

    unwrapExports(isSchema);

    var Condition_1 = createCommonjsModule(function (module, exports) {



    exports.__esModule = true;
    exports.default = void 0;

    var _has = interopRequireDefault(has_1);

    var _isSchema = interopRequireDefault(isSchema);

    var Condition =
    /*#__PURE__*/
    function () {
      function Condition(refs, options) {
        this.refs = refs;

        if (typeof options === 'function') {
          this.fn = options;
          return;
        }

        if (!(0, _has.default)(options, 'is')) throw new TypeError('`is:` is required for `when()` conditions');
        if (!options.then && !options.otherwise) throw new TypeError('either `then:` or `otherwise:` is required for `when()` conditions');
        var is = options.is,
            then = options.then,
            otherwise = options.otherwise;
        var check = typeof is === 'function' ? is : function () {
          for (var _len = arguments.length, values = new Array(_len), _key = 0; _key < _len; _key++) {
            values[_key] = arguments[_key];
          }

          return values.every(function (value) {
            return value === is;
          });
        };

        this.fn = function () {
          for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
            args[_key2] = arguments[_key2];
          }

          var options = args.pop();
          var schema = args.pop();
          var branch = check.apply(void 0, args) ? then : otherwise;
          if (!branch) return undefined;
          if (typeof branch === 'function') return branch(schema);
          return schema.concat(branch.resolve(options));
        };
      }

      var _proto = Condition.prototype;

      _proto.resolve = function resolve(base, options) {
        var values = this.refs.map(function (ref) {
          return ref.getValue(options);
        });
        var schema = this.fn.apply(base, values.concat(base, options));
        if (schema === undefined || schema === base) return base;
        if (!(0, _isSchema.default)(schema)) throw new TypeError('conditions must return a schema object');
        return schema.resolve(options);
      };

      return Condition;
    }();

    var _default = Condition;
    exports.default = _default;
    module.exports = exports["default"];
    });

    unwrapExports(Condition_1);

    function _objectWithoutPropertiesLoose(source, excluded) {
      if (source == null) return {};
      var target = {};
      var sourceKeys = Object.keys(source);
      var key, i;

      for (i = 0; i < sourceKeys.length; i++) {
        key = sourceKeys[i];
        if (excluded.indexOf(key) >= 0) continue;
        target[key] = source[key];
      }

      return target;
    }

    var objectWithoutPropertiesLoose = _objectWithoutPropertiesLoose;

    /* jshint node: true */
    function makeArrayFrom(obj) {
      return Array.prototype.slice.apply(obj);
    }
    var
      PENDING = "pending",
      RESOLVED = "resolved",
      REJECTED = "rejected";

    function SynchronousPromise(handler) {
      this.status = PENDING;
      this._continuations = [];
      this._parent = null;
      this._paused = false;
      if (handler) {
        handler.call(
          this,
          this._continueWith.bind(this),
          this._failWith.bind(this)
        );
      }
    }

    function looksLikeAPromise(obj) {
      return obj && typeof (obj.then) === "function";
    }

    SynchronousPromise.prototype = {
      then: function (nextFn, catchFn) {
        var next = SynchronousPromise.unresolved()._setParent(this);
        if (this._isRejected()) {
          if (this._paused) {
            this._continuations.push({
              promise: next,
              nextFn: nextFn,
              catchFn: catchFn
            });
            return next;
          }
          if (catchFn) {
            try {
              var catchResult = catchFn(this._error);
              if (looksLikeAPromise(catchResult)) {
                this._chainPromiseData(catchResult, next);
                return next;
              } else {
                return SynchronousPromise.resolve(catchResult)._setParent(this);
              }
            } catch (e) {
              return SynchronousPromise.reject(e)._setParent(this);
            }
          }
          return SynchronousPromise.reject(this._error)._setParent(this);
        }
        this._continuations.push({
          promise: next,
          nextFn: nextFn,
          catchFn: catchFn
        });
        this._runResolutions();
        return next;
      },
      catch: function (handler) {
        if (this._isResolved()) {
          return SynchronousPromise.resolve(this._data)._setParent(this);
        }
        var next = SynchronousPromise.unresolved()._setParent(this);
        this._continuations.push({
          promise: next,
          catchFn: handler
        });
        this._runRejections();
        return next;
      },
      finally: function(callback) {
        return (this._finally = SynchronousPromise.resolve()
          ._setParent(this)
          .then(function() {
            return callback();
          }));
      },
      pause: function () {
        this._paused = true;
        return this;
      },
      resume: function () {
        var firstPaused = this._findFirstPaused();
        if (firstPaused) {
          firstPaused._paused = false;
          firstPaused._runResolutions();
          firstPaused._runRejections();
        }
        return this;
      },
      _findAncestry: function () {
        return this._continuations.reduce(function (acc, cur) {
          if (cur.promise) {
            var node = {
              promise: cur.promise,
              children: cur.promise._findAncestry()
            };
            acc.push(node);
          }
          return acc;
        }, []);
      },
      _setParent: function (parent) {
        if (this._parent) {
          throw new Error("parent already set");
        }
        this._parent = parent;
        return this;
      },
      _continueWith: function (data) {
        var firstPending = this._findFirstPending();
        if (firstPending) {
          firstPending._data = data;
          firstPending._setResolved();
        }
      },
      _findFirstPending: function () {
        return this._findFirstAncestor(function (test) {
          return test._isPending && test._isPending();
        });
      },
      _findFirstPaused: function () {
        return this._findFirstAncestor(function (test) {
          return test._paused;
        });
      },
      _findFirstAncestor: function (matching) {
        var test = this;
        var result;
        while (test) {
          if (matching(test)) {
            result = test;
          }
          test = test._parent;
        }
        return result;
      },
      _failWith: function (error) {
        var firstRejected = this._findFirstPending();
        if (firstRejected) {
          firstRejected._error = error;
          firstRejected._setRejected();
        }
      },
      _takeContinuations: function () {
        return this._continuations.splice(0, this._continuations.length);
      },
      _runRejections: function () {
        if (this._paused || !this._isRejected()) {
          return;
        }
        var
          error = this._error,
          continuations = this._takeContinuations(),
          self = this;
        continuations.forEach(function (cont) {
          if (cont.catchFn) {
            try {
              var catchResult = cont.catchFn(error);
              self._handleUserFunctionResult(catchResult, cont.promise);
            } catch (e) {
              var message = e.message;
              cont.promise.reject(e);
            }
          } else {
            cont.promise.reject(error);
          }
        });
      },
      _runResolutions: function () {
        if (this._paused || !this._isResolved()) {
          return;
        }
        var continuations = this._takeContinuations();
        if (looksLikeAPromise(this._data)) {
          return this._handleWhenResolvedDataIsPromise(this._data);
        }
        var data = this._data;
        var self = this;
        continuations.forEach(function (cont) {
          if (cont.nextFn) {
            try {
              var result = cont.nextFn(data);
              self._handleUserFunctionResult(result, cont.promise);
            } catch (e) {
              self._handleResolutionError(e, cont);
            }
          } else if (cont.promise) {
            cont.promise.resolve(data);
          }
        });
      },
      _handleResolutionError: function (e, continuation) {
        this._setRejected();
        if (continuation.catchFn) {
          try {
            continuation.catchFn(e);
            return;
          } catch (e2) {
            e = e2;
          }
        }
        if (continuation.promise) {
          continuation.promise.reject(e);
        }
      },
      _handleWhenResolvedDataIsPromise: function (data) {
        var self = this;
        return data.then(function (result) {
          self._data = result;
          self._runResolutions();
        }).catch(function (error) {
          self._error = error;
          self._setRejected();
          self._runRejections();
        });
      },
      _handleUserFunctionResult: function (data, nextSynchronousPromise) {
        if (looksLikeAPromise(data)) {
          this._chainPromiseData(data, nextSynchronousPromise);
        } else {
          nextSynchronousPromise.resolve(data);
        }
      },
      _chainPromiseData: function (promiseData, nextSynchronousPromise) {
        promiseData.then(function (newData) {
          nextSynchronousPromise.resolve(newData);
        }).catch(function (newError) {
          nextSynchronousPromise.reject(newError);
        });
      },
      _setResolved: function () {
        this.status = RESOLVED;
        if (!this._paused) {
          this._runResolutions();
        }
      },
      _setRejected: function () {
        this.status = REJECTED;
        if (!this._paused) {
          this._runRejections();
        }
      },
      _isPending: function () {
        return this.status === PENDING;
      },
      _isResolved: function () {
        return this.status === RESOLVED;
      },
      _isRejected: function () {
        return this.status === REJECTED;
      }
    };

    SynchronousPromise.resolve = function (result) {
      return new SynchronousPromise(function (resolve, reject) {
        if (looksLikeAPromise(result)) {
          result.then(function (newResult) {
            resolve(newResult);
          }).catch(function (error) {
            reject(error);
          });
        } else {
          resolve(result);
        }
      });
    };

    SynchronousPromise.reject = function (result) {
      return new SynchronousPromise(function (resolve, reject) {
        reject(result);
      });
    };

    SynchronousPromise.unresolved = function () {
      return new SynchronousPromise(function (resolve, reject) {
        this.resolve = resolve;
        this.reject = reject;
      });
    };

    SynchronousPromise.all = function () {
      var args = makeArrayFrom(arguments);
      if (Array.isArray(args[0])) {
        args = args[0];
      }
      if (!args.length) {
        return SynchronousPromise.resolve([]);
      }
      return new SynchronousPromise(function (resolve, reject) {
        var
          allData = [],
          numResolved = 0,
          doResolve = function () {
            if (numResolved === args.length) {
              resolve(allData);
            }
          },
          rejected = false,
          doReject = function (err) {
            if (rejected) {
              return;
            }
            rejected = true;
            reject(err);
          };
        args.forEach(function (arg, idx) {
          SynchronousPromise.resolve(arg).then(function (thisResult) {
            allData[idx] = thisResult;
            numResolved += 1;
            doResolve();
          }).catch(function (err) {
            doReject(err);
          });
        });
      });
    };

    /* jshint ignore:start */
    if (Promise === SynchronousPromise) {
      throw new Error("Please use SynchronousPromise.installGlobally() to install globally");
    }
    var RealPromise = Promise;
    SynchronousPromise.installGlobally = function(__awaiter) {
      if (Promise === SynchronousPromise) {
        return __awaiter;
      }
      var result = patchAwaiterIfRequired(__awaiter);
      Promise = SynchronousPromise;
      return result;
    };

    SynchronousPromise.uninstallGlobally = function() {
      if (Promise === SynchronousPromise) {
        Promise = RealPromise;
      }
    };

    function patchAwaiterIfRequired(__awaiter) {
      if (typeof(__awaiter) === "undefined" || __awaiter.__patched) {
        return __awaiter;
      }
      var originalAwaiter = __awaiter;
      __awaiter = function() {
        originalAwaiter.apply(this, makeArrayFrom(arguments));
      };
      __awaiter.__patched = true;
      return __awaiter;
    }
    /* jshint ignore:end */

    var synchronousPromise = {
      SynchronousPromise: SynchronousPromise
    };

    var ValidationError_1 = createCommonjsModule(function (module, exports) {



    exports.__esModule = true;
    exports.default = ValidationError;

    var _printValue = interopRequireDefault(printValue_1);

    var strReg = /\$\{\s*(\w+)\s*\}/g;

    var replace = function replace(str) {
      return function (params) {
        return str.replace(strReg, function (_, key) {
          return (0, _printValue.default)(params[key]);
        });
      };
    };

    function ValidationError(errors, value, field, type) {
      var _this = this;

      this.name = 'ValidationError';
      this.value = value;
      this.path = field;
      this.type = type;
      this.errors = [];
      this.inner = [];
      if (errors) [].concat(errors).forEach(function (err) {
        _this.errors = _this.errors.concat(err.errors || err);
        if (err.inner) _this.inner = _this.inner.concat(err.inner.length ? err.inner : err);
      });
      this.message = this.errors.length > 1 ? this.errors.length + " errors occurred" : this.errors[0];
      if (Error.captureStackTrace) Error.captureStackTrace(this, ValidationError);
    }

    ValidationError.prototype = Object.create(Error.prototype);
    ValidationError.prototype.constructor = ValidationError;

    ValidationError.isError = function (err) {
      return err && err.name === 'ValidationError';
    };

    ValidationError.formatError = function (message, params) {
      if (typeof message === 'string') message = replace(message);

      var fn = function fn(params) {
        params.path = params.label || params.path || 'this';
        return typeof message === 'function' ? message(params) : message;
      };

      return arguments.length === 1 ? fn : fn(params);
    };

    module.exports = exports["default"];
    });

    unwrapExports(ValidationError_1);

    var runValidations_1 = createCommonjsModule(function (module, exports) {



    exports.__esModule = true;
    exports.propagateErrors = propagateErrors;
    exports.settled = settled;
    exports.collectErrors = collectErrors;
    exports.default = runValidations;

    var _objectWithoutPropertiesLoose2 = interopRequireDefault(objectWithoutPropertiesLoose);



    var _ValidationError = interopRequireDefault(ValidationError_1);

    var promise = function promise(sync) {
      return sync ? synchronousPromise.SynchronousPromise : Promise;
    };

    var unwrapError = function unwrapError(errors) {
      if (errors === void 0) {
        errors = [];
      }

      return errors.inner && errors.inner.length ? errors.inner : [].concat(errors);
    };

    function scopeToValue(promises, value, sync) {
      //console.log('scopeToValue', promises, value)
      var p = promise(sync).all(promises); //console.log('scopeToValue B', p)

      var b = p.catch(function (err) {
        if (err.name === 'ValidationError') err.value = value;
        throw err;
      }); //console.log('scopeToValue c', b)

      var c = b.then(function () {
        return value;
      }); //console.log('scopeToValue d', c)

      return c;
    }
    /**
     * If not failing on the first error, catch the errors
     * and collect them in an array
     */


    function propagateErrors(endEarly, errors) {
      return endEarly ? null : function (err) {
        errors.push(err);
        return err.value;
      };
    }

    function settled(promises, sync) {
      var Promise = promise(sync);
      return Promise.all(promises.map(function (p) {
        return Promise.resolve(p).then(function (value) {
          return {
            fulfilled: true,
            value: value
          };
        }, function (value) {
          return {
            fulfilled: false,
            value: value
          };
        });
      }));
    }

    function collectErrors(_ref) {
      var validations = _ref.validations,
          value = _ref.value,
          path = _ref.path,
          sync = _ref.sync,
          errors = _ref.errors,
          sort = _ref.sort;
      errors = unwrapError(errors);
      return settled(validations, sync).then(function (results) {
        var nestedErrors = results.filter(function (r) {
          return !r.fulfilled;
        }).reduce(function (arr, _ref2) {
          var error = _ref2.value;

          // we are only collecting validation errors
          if (!_ValidationError.default.isError(error)) {
            throw error;
          }

          return arr.concat(error);
        }, []);
        if (sort) nestedErrors.sort(sort); //show parent errors after the nested ones: name.first, name

        errors = nestedErrors.concat(errors);
        if (errors.length) throw new _ValidationError.default(errors, value, path);
        return value;
      });
    }

    function runValidations(_ref3) {
      var endEarly = _ref3.endEarly,
          options = (0, _objectWithoutPropertiesLoose2.default)(_ref3, ["endEarly"]);
      if (endEarly) return scopeToValue(options.validations, options.value, options.sync);
      return collectErrors(options);
    }
    });

    unwrapExports(runValidations_1);
    var runValidations_2 = runValidations_1.propagateErrors;
    var runValidations_3 = runValidations_1.settled;
    var runValidations_4 = runValidations_1.collectErrors;

    var prependDeep_1 = createCommonjsModule(function (module, exports) {



    exports.__esModule = true;
    exports.default = prependDeep;

    var _has = interopRequireDefault(has_1);

    var _isSchema = interopRequireDefault(isSchema);

    var isObject = function isObject(obj) {
      return Object.prototype.toString.call(obj) === '[object Object]';
    };

    function prependDeep(target, source) {
      for (var key in source) {
        if ((0, _has.default)(source, key)) {
          var sourceVal = source[key],
              targetVal = target[key];

          if (targetVal === undefined) {
            target[key] = sourceVal;
          } else if (targetVal === sourceVal) {
            continue;
          } else if ((0, _isSchema.default)(targetVal)) {
            if ((0, _isSchema.default)(sourceVal)) target[key] = sourceVal.concat(targetVal);
          } else if (isObject(targetVal)) {
            if (isObject(sourceVal)) target[key] = prependDeep(targetVal, sourceVal);
          } else if (Array.isArray(targetVal)) {
            if (Array.isArray(sourceVal)) target[key] = sourceVal.concat(targetVal);
          }
        }
      }

      return target;
    }

    module.exports = exports["default"];
    });

    unwrapExports(prependDeep_1);

    /**
     * Creates a base function for methods like `_.forIn` and `_.forOwn`.
     *
     * @private
     * @param {boolean} [fromRight] Specify iterating from right to left.
     * @returns {Function} Returns the new base function.
     */
    function createBaseFor(fromRight) {
      return function(object, iteratee, keysFunc) {
        var index = -1,
            iterable = Object(object),
            props = keysFunc(object),
            length = props.length;

        while (length--) {
          var key = props[fromRight ? length : ++index];
          if (iteratee(iterable[key], key, iterable) === false) {
            break;
          }
        }
        return object;
      };
    }

    var _createBaseFor = createBaseFor;

    /**
     * The base implementation of `baseForOwn` which iterates over `object`
     * properties returned by `keysFunc` and invokes `iteratee` for each property.
     * Iteratee functions may exit iteration early by explicitly returning `false`.
     *
     * @private
     * @param {Object} object The object to iterate over.
     * @param {Function} iteratee The function invoked per iteration.
     * @param {Function} keysFunc The function to get the keys of `object`.
     * @returns {Object} Returns `object`.
     */
    var baseFor = _createBaseFor();

    var _baseFor = baseFor;

    /**
     * The base implementation of `_.forOwn` without support for iteratee shorthands.
     *
     * @private
     * @param {Object} object The object to iterate over.
     * @param {Function} iteratee The function invoked per iteration.
     * @returns {Object} Returns `object`.
     */
    function baseForOwn(object, iteratee) {
      return object && _baseFor(object, iteratee, keys_1);
    }

    var _baseForOwn = baseForOwn;

    /** Used to stand-in for `undefined` hash values. */
    var HASH_UNDEFINED$2 = '__lodash_hash_undefined__';

    /**
     * Adds `value` to the array cache.
     *
     * @private
     * @name add
     * @memberOf SetCache
     * @alias push
     * @param {*} value The value to cache.
     * @returns {Object} Returns the cache instance.
     */
    function setCacheAdd(value) {
      this.__data__.set(value, HASH_UNDEFINED$2);
      return this;
    }

    var _setCacheAdd = setCacheAdd;

    /**
     * Checks if `value` is in the array cache.
     *
     * @private
     * @name has
     * @memberOf SetCache
     * @param {*} value The value to search for.
     * @returns {number} Returns `true` if `value` is found, else `false`.
     */
    function setCacheHas(value) {
      return this.__data__.has(value);
    }

    var _setCacheHas = setCacheHas;

    /**
     *
     * Creates an array cache object to store unique values.
     *
     * @private
     * @constructor
     * @param {Array} [values] The values to cache.
     */
    function SetCache(values) {
      var index = -1,
          length = values == null ? 0 : values.length;

      this.__data__ = new _MapCache;
      while (++index < length) {
        this.add(values[index]);
      }
    }

    // Add methods to `SetCache`.
    SetCache.prototype.add = SetCache.prototype.push = _setCacheAdd;
    SetCache.prototype.has = _setCacheHas;

    var _SetCache = SetCache;

    /**
     * A specialized version of `_.some` for arrays without support for iteratee
     * shorthands.
     *
     * @private
     * @param {Array} [array] The array to iterate over.
     * @param {Function} predicate The function invoked per iteration.
     * @returns {boolean} Returns `true` if any element passes the predicate check,
     *  else `false`.
     */
    function arraySome(array, predicate) {
      var index = -1,
          length = array == null ? 0 : array.length;

      while (++index < length) {
        if (predicate(array[index], index, array)) {
          return true;
        }
      }
      return false;
    }

    var _arraySome = arraySome;

    /**
     * Checks if a `cache` value for `key` exists.
     *
     * @private
     * @param {Object} cache The cache to query.
     * @param {string} key The key of the entry to check.
     * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
     */
    function cacheHas(cache, key) {
      return cache.has(key);
    }

    var _cacheHas = cacheHas;

    /** Used to compose bitmasks for value comparisons. */
    var COMPARE_PARTIAL_FLAG = 1,
        COMPARE_UNORDERED_FLAG = 2;

    /**
     * A specialized version of `baseIsEqualDeep` for arrays with support for
     * partial deep comparisons.
     *
     * @private
     * @param {Array} array The array to compare.
     * @param {Array} other The other array to compare.
     * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
     * @param {Function} customizer The function to customize comparisons.
     * @param {Function} equalFunc The function to determine equivalents of values.
     * @param {Object} stack Tracks traversed `array` and `other` objects.
     * @returns {boolean} Returns `true` if the arrays are equivalent, else `false`.
     */
    function equalArrays(array, other, bitmask, customizer, equalFunc, stack) {
      var isPartial = bitmask & COMPARE_PARTIAL_FLAG,
          arrLength = array.length,
          othLength = other.length;

      if (arrLength != othLength && !(isPartial && othLength > arrLength)) {
        return false;
      }
      // Assume cyclic values are equal.
      var stacked = stack.get(array);
      if (stacked && stack.get(other)) {
        return stacked == other;
      }
      var index = -1,
          result = true,
          seen = (bitmask & COMPARE_UNORDERED_FLAG) ? new _SetCache : undefined;

      stack.set(array, other);
      stack.set(other, array);

      // Ignore non-index properties.
      while (++index < arrLength) {
        var arrValue = array[index],
            othValue = other[index];

        if (customizer) {
          var compared = isPartial
            ? customizer(othValue, arrValue, index, other, array, stack)
            : customizer(arrValue, othValue, index, array, other, stack);
        }
        if (compared !== undefined) {
          if (compared) {
            continue;
          }
          result = false;
          break;
        }
        // Recursively compare arrays (susceptible to call stack limits).
        if (seen) {
          if (!_arraySome(other, function(othValue, othIndex) {
                if (!_cacheHas(seen, othIndex) &&
                    (arrValue === othValue || equalFunc(arrValue, othValue, bitmask, customizer, stack))) {
                  return seen.push(othIndex);
                }
              })) {
            result = false;
            break;
          }
        } else if (!(
              arrValue === othValue ||
                equalFunc(arrValue, othValue, bitmask, customizer, stack)
            )) {
          result = false;
          break;
        }
      }
      stack['delete'](array);
      stack['delete'](other);
      return result;
    }

    var _equalArrays = equalArrays;

    /** Used to compose bitmasks for value comparisons. */
    var COMPARE_PARTIAL_FLAG$1 = 1,
        COMPARE_UNORDERED_FLAG$1 = 2;

    /** `Object#toString` result references. */
    var boolTag$3 = '[object Boolean]',
        dateTag$3 = '[object Date]',
        errorTag$2 = '[object Error]',
        mapTag$6 = '[object Map]',
        numberTag$3 = '[object Number]',
        regexpTag$3 = '[object RegExp]',
        setTag$6 = '[object Set]',
        stringTag$4 = '[object String]',
        symbolTag$3 = '[object Symbol]';

    var arrayBufferTag$3 = '[object ArrayBuffer]',
        dataViewTag$4 = '[object DataView]';

    /** Used to convert symbols to primitives and strings. */
    var symbolProto$2 = _Symbol ? _Symbol.prototype : undefined,
        symbolValueOf$1 = symbolProto$2 ? symbolProto$2.valueOf : undefined;

    /**
     * A specialized version of `baseIsEqualDeep` for comparing objects of
     * the same `toStringTag`.
     *
     * **Note:** This function only supports comparing values with tags of
     * `Boolean`, `Date`, `Error`, `Number`, `RegExp`, or `String`.
     *
     * @private
     * @param {Object} object The object to compare.
     * @param {Object} other The other object to compare.
     * @param {string} tag The `toStringTag` of the objects to compare.
     * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
     * @param {Function} customizer The function to customize comparisons.
     * @param {Function} equalFunc The function to determine equivalents of values.
     * @param {Object} stack Tracks traversed `object` and `other` objects.
     * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
     */
    function equalByTag(object, other, tag, bitmask, customizer, equalFunc, stack) {
      switch (tag) {
        case dataViewTag$4:
          if ((object.byteLength != other.byteLength) ||
              (object.byteOffset != other.byteOffset)) {
            return false;
          }
          object = object.buffer;
          other = other.buffer;

        case arrayBufferTag$3:
          if ((object.byteLength != other.byteLength) ||
              !equalFunc(new _Uint8Array(object), new _Uint8Array(other))) {
            return false;
          }
          return true;

        case boolTag$3:
        case dateTag$3:
        case numberTag$3:
          // Coerce booleans to `1` or `0` and dates to milliseconds.
          // Invalid dates are coerced to `NaN`.
          return eq_1(+object, +other);

        case errorTag$2:
          return object.name == other.name && object.message == other.message;

        case regexpTag$3:
        case stringTag$4:
          // Coerce regexes to strings and treat strings, primitives and objects,
          // as equal. See http://www.ecma-international.org/ecma-262/7.0/#sec-regexp.prototype.tostring
          // for more details.
          return object == (other + '');

        case mapTag$6:
          var convert = _mapToArray;

        case setTag$6:
          var isPartial = bitmask & COMPARE_PARTIAL_FLAG$1;
          convert || (convert = _setToArray);

          if (object.size != other.size && !isPartial) {
            return false;
          }
          // Assume cyclic values are equal.
          var stacked = stack.get(object);
          if (stacked) {
            return stacked == other;
          }
          bitmask |= COMPARE_UNORDERED_FLAG$1;

          // Recursively compare objects (susceptible to call stack limits).
          stack.set(object, other);
          var result = _equalArrays(convert(object), convert(other), bitmask, customizer, equalFunc, stack);
          stack['delete'](object);
          return result;

        case symbolTag$3:
          if (symbolValueOf$1) {
            return symbolValueOf$1.call(object) == symbolValueOf$1.call(other);
          }
      }
      return false;
    }

    var _equalByTag = equalByTag;

    /** Used to compose bitmasks for value comparisons. */
    var COMPARE_PARTIAL_FLAG$2 = 1;

    /** Used for built-in method references. */
    var objectProto$e = Object.prototype;

    /** Used to check objects for own properties. */
    var hasOwnProperty$b = objectProto$e.hasOwnProperty;

    /**
     * A specialized version of `baseIsEqualDeep` for objects with support for
     * partial deep comparisons.
     *
     * @private
     * @param {Object} object The object to compare.
     * @param {Object} other The other object to compare.
     * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
     * @param {Function} customizer The function to customize comparisons.
     * @param {Function} equalFunc The function to determine equivalents of values.
     * @param {Object} stack Tracks traversed `object` and `other` objects.
     * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
     */
    function equalObjects(object, other, bitmask, customizer, equalFunc, stack) {
      var isPartial = bitmask & COMPARE_PARTIAL_FLAG$2,
          objProps = _getAllKeys(object),
          objLength = objProps.length,
          othProps = _getAllKeys(other),
          othLength = othProps.length;

      if (objLength != othLength && !isPartial) {
        return false;
      }
      var index = objLength;
      while (index--) {
        var key = objProps[index];
        if (!(isPartial ? key in other : hasOwnProperty$b.call(other, key))) {
          return false;
        }
      }
      // Assume cyclic values are equal.
      var stacked = stack.get(object);
      if (stacked && stack.get(other)) {
        return stacked == other;
      }
      var result = true;
      stack.set(object, other);
      stack.set(other, object);

      var skipCtor = isPartial;
      while (++index < objLength) {
        key = objProps[index];
        var objValue = object[key],
            othValue = other[key];

        if (customizer) {
          var compared = isPartial
            ? customizer(othValue, objValue, key, other, object, stack)
            : customizer(objValue, othValue, key, object, other, stack);
        }
        // Recursively compare objects (susceptible to call stack limits).
        if (!(compared === undefined
              ? (objValue === othValue || equalFunc(objValue, othValue, bitmask, customizer, stack))
              : compared
            )) {
          result = false;
          break;
        }
        skipCtor || (skipCtor = key == 'constructor');
      }
      if (result && !skipCtor) {
        var objCtor = object.constructor,
            othCtor = other.constructor;

        // Non `Object` object instances with different constructors are not equal.
        if (objCtor != othCtor &&
            ('constructor' in object && 'constructor' in other) &&
            !(typeof objCtor == 'function' && objCtor instanceof objCtor &&
              typeof othCtor == 'function' && othCtor instanceof othCtor)) {
          result = false;
        }
      }
      stack['delete'](object);
      stack['delete'](other);
      return result;
    }

    var _equalObjects = equalObjects;

    /** Used to compose bitmasks for value comparisons. */
    var COMPARE_PARTIAL_FLAG$3 = 1;

    /** `Object#toString` result references. */
    var argsTag$3 = '[object Arguments]',
        arrayTag$2 = '[object Array]',
        objectTag$3 = '[object Object]';

    /** Used for built-in method references. */
    var objectProto$f = Object.prototype;

    /** Used to check objects for own properties. */
    var hasOwnProperty$c = objectProto$f.hasOwnProperty;

    /**
     * A specialized version of `baseIsEqual` for arrays and objects which performs
     * deep comparisons and tracks traversed objects enabling objects with circular
     * references to be compared.
     *
     * @private
     * @param {Object} object The object to compare.
     * @param {Object} other The other object to compare.
     * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
     * @param {Function} customizer The function to customize comparisons.
     * @param {Function} equalFunc The function to determine equivalents of values.
     * @param {Object} [stack] Tracks traversed `object` and `other` objects.
     * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
     */
    function baseIsEqualDeep(object, other, bitmask, customizer, equalFunc, stack) {
      var objIsArr = isArray_1(object),
          othIsArr = isArray_1(other),
          objTag = objIsArr ? arrayTag$2 : _getTag(object),
          othTag = othIsArr ? arrayTag$2 : _getTag(other);

      objTag = objTag == argsTag$3 ? objectTag$3 : objTag;
      othTag = othTag == argsTag$3 ? objectTag$3 : othTag;

      var objIsObj = objTag == objectTag$3,
          othIsObj = othTag == objectTag$3,
          isSameTag = objTag == othTag;

      if (isSameTag && isBuffer_1(object)) {
        if (!isBuffer_1(other)) {
          return false;
        }
        objIsArr = true;
        objIsObj = false;
      }
      if (isSameTag && !objIsObj) {
        stack || (stack = new _Stack);
        return (objIsArr || isTypedArray_1(object))
          ? _equalArrays(object, other, bitmask, customizer, equalFunc, stack)
          : _equalByTag(object, other, objTag, bitmask, customizer, equalFunc, stack);
      }
      if (!(bitmask & COMPARE_PARTIAL_FLAG$3)) {
        var objIsWrapped = objIsObj && hasOwnProperty$c.call(object, '__wrapped__'),
            othIsWrapped = othIsObj && hasOwnProperty$c.call(other, '__wrapped__');

        if (objIsWrapped || othIsWrapped) {
          var objUnwrapped = objIsWrapped ? object.value() : object,
              othUnwrapped = othIsWrapped ? other.value() : other;

          stack || (stack = new _Stack);
          return equalFunc(objUnwrapped, othUnwrapped, bitmask, customizer, stack);
        }
      }
      if (!isSameTag) {
        return false;
      }
      stack || (stack = new _Stack);
      return _equalObjects(object, other, bitmask, customizer, equalFunc, stack);
    }

    var _baseIsEqualDeep = baseIsEqualDeep;

    /**
     * The base implementation of `_.isEqual` which supports partial comparisons
     * and tracks traversed objects.
     *
     * @private
     * @param {*} value The value to compare.
     * @param {*} other The other value to compare.
     * @param {boolean} bitmask The bitmask flags.
     *  1 - Unordered comparison
     *  2 - Partial comparison
     * @param {Function} [customizer] The function to customize comparisons.
     * @param {Object} [stack] Tracks traversed `value` and `other` objects.
     * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
     */
    function baseIsEqual(value, other, bitmask, customizer, stack) {
      if (value === other) {
        return true;
      }
      if (value == null || other == null || (!isObjectLike_1(value) && !isObjectLike_1(other))) {
        return value !== value && other !== other;
      }
      return _baseIsEqualDeep(value, other, bitmask, customizer, baseIsEqual, stack);
    }

    var _baseIsEqual = baseIsEqual;

    /** Used to compose bitmasks for value comparisons. */
    var COMPARE_PARTIAL_FLAG$4 = 1,
        COMPARE_UNORDERED_FLAG$2 = 2;

    /**
     * The base implementation of `_.isMatch` without support for iteratee shorthands.
     *
     * @private
     * @param {Object} object The object to inspect.
     * @param {Object} source The object of property values to match.
     * @param {Array} matchData The property names, values, and compare flags to match.
     * @param {Function} [customizer] The function to customize comparisons.
     * @returns {boolean} Returns `true` if `object` is a match, else `false`.
     */
    function baseIsMatch(object, source, matchData, customizer) {
      var index = matchData.length,
          length = index,
          noCustomizer = !customizer;

      if (object == null) {
        return !length;
      }
      object = Object(object);
      while (index--) {
        var data = matchData[index];
        if ((noCustomizer && data[2])
              ? data[1] !== object[data[0]]
              : !(data[0] in object)
            ) {
          return false;
        }
      }
      while (++index < length) {
        data = matchData[index];
        var key = data[0],
            objValue = object[key],
            srcValue = data[1];

        if (noCustomizer && data[2]) {
          if (objValue === undefined && !(key in object)) {
            return false;
          }
        } else {
          var stack = new _Stack;
          if (customizer) {
            var result = customizer(objValue, srcValue, key, object, source, stack);
          }
          if (!(result === undefined
                ? _baseIsEqual(srcValue, objValue, COMPARE_PARTIAL_FLAG$4 | COMPARE_UNORDERED_FLAG$2, customizer, stack)
                : result
              )) {
            return false;
          }
        }
      }
      return true;
    }

    var _baseIsMatch = baseIsMatch;

    /**
     * Checks if `value` is suitable for strict equality comparisons, i.e. `===`.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` if suitable for strict
     *  equality comparisons, else `false`.
     */
    function isStrictComparable(value) {
      return value === value && !isObject_1(value);
    }

    var _isStrictComparable = isStrictComparable;

    /**
     * Gets the property names, values, and compare flags of `object`.
     *
     * @private
     * @param {Object} object The object to query.
     * @returns {Array} Returns the match data of `object`.
     */
    function getMatchData(object) {
      var result = keys_1(object),
          length = result.length;

      while (length--) {
        var key = result[length],
            value = object[key];

        result[length] = [key, value, _isStrictComparable(value)];
      }
      return result;
    }

    var _getMatchData = getMatchData;

    /**
     * A specialized version of `matchesProperty` for source values suitable
     * for strict equality comparisons, i.e. `===`.
     *
     * @private
     * @param {string} key The key of the property to get.
     * @param {*} srcValue The value to match.
     * @returns {Function} Returns the new spec function.
     */
    function matchesStrictComparable(key, srcValue) {
      return function(object) {
        if (object == null) {
          return false;
        }
        return object[key] === srcValue &&
          (srcValue !== undefined || (key in Object(object)));
      };
    }

    var _matchesStrictComparable = matchesStrictComparable;

    /**
     * The base implementation of `_.matches` which doesn't clone `source`.
     *
     * @private
     * @param {Object} source The object of property values to match.
     * @returns {Function} Returns the new spec function.
     */
    function baseMatches(source) {
      var matchData = _getMatchData(source);
      if (matchData.length == 1 && matchData[0][2]) {
        return _matchesStrictComparable(matchData[0][0], matchData[0][1]);
      }
      return function(object) {
        return object === source || _baseIsMatch(object, source, matchData);
      };
    }

    var _baseMatches = baseMatches;

    /**
     * The base implementation of `_.get` without support for default values.
     *
     * @private
     * @param {Object} object The object to query.
     * @param {Array|string} path The path of the property to get.
     * @returns {*} Returns the resolved value.
     */
    function baseGet(object, path) {
      path = _castPath(path, object);

      var index = 0,
          length = path.length;

      while (object != null && index < length) {
        object = object[_toKey(path[index++])];
      }
      return (index && index == length) ? object : undefined;
    }

    var _baseGet = baseGet;

    /**
     * Gets the value at `path` of `object`. If the resolved value is
     * `undefined`, the `defaultValue` is returned in its place.
     *
     * @static
     * @memberOf _
     * @since 3.7.0
     * @category Object
     * @param {Object} object The object to query.
     * @param {Array|string} path The path of the property to get.
     * @param {*} [defaultValue] The value returned for `undefined` resolved values.
     * @returns {*} Returns the resolved value.
     * @example
     *
     * var object = { 'a': [{ 'b': { 'c': 3 } }] };
     *
     * _.get(object, 'a[0].b.c');
     * // => 3
     *
     * _.get(object, ['a', '0', 'b', 'c']);
     * // => 3
     *
     * _.get(object, 'a.b.c', 'default');
     * // => 'default'
     */
    function get(object, path, defaultValue) {
      var result = object == null ? undefined : _baseGet(object, path);
      return result === undefined ? defaultValue : result;
    }

    var get_1 = get;

    /**
     * The base implementation of `_.hasIn` without support for deep paths.
     *
     * @private
     * @param {Object} [object] The object to query.
     * @param {Array|string} key The key to check.
     * @returns {boolean} Returns `true` if `key` exists, else `false`.
     */
    function baseHasIn(object, key) {
      return object != null && key in Object(object);
    }

    var _baseHasIn = baseHasIn;

    /**
     * Checks if `path` is a direct or inherited property of `object`.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Object
     * @param {Object} object The object to query.
     * @param {Array|string} path The path to check.
     * @returns {boolean} Returns `true` if `path` exists, else `false`.
     * @example
     *
     * var object = _.create({ 'a': _.create({ 'b': 2 }) });
     *
     * _.hasIn(object, 'a');
     * // => true
     *
     * _.hasIn(object, 'a.b');
     * // => true
     *
     * _.hasIn(object, ['a', 'b']);
     * // => true
     *
     * _.hasIn(object, 'b');
     * // => false
     */
    function hasIn(object, path) {
      return object != null && _hasPath(object, path, _baseHasIn);
    }

    var hasIn_1 = hasIn;

    /** Used to compose bitmasks for value comparisons. */
    var COMPARE_PARTIAL_FLAG$5 = 1,
        COMPARE_UNORDERED_FLAG$3 = 2;

    /**
     * The base implementation of `_.matchesProperty` which doesn't clone `srcValue`.
     *
     * @private
     * @param {string} path The path of the property to get.
     * @param {*} srcValue The value to match.
     * @returns {Function} Returns the new spec function.
     */
    function baseMatchesProperty(path, srcValue) {
      if (_isKey(path) && _isStrictComparable(srcValue)) {
        return _matchesStrictComparable(_toKey(path), srcValue);
      }
      return function(object) {
        var objValue = get_1(object, path);
        return (objValue === undefined && objValue === srcValue)
          ? hasIn_1(object, path)
          : _baseIsEqual(srcValue, objValue, COMPARE_PARTIAL_FLAG$5 | COMPARE_UNORDERED_FLAG$3);
      };
    }

    var _baseMatchesProperty = baseMatchesProperty;

    /**
     * This method returns the first argument it receives.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Util
     * @param {*} value Any value.
     * @returns {*} Returns `value`.
     * @example
     *
     * var object = { 'a': 1 };
     *
     * console.log(_.identity(object) === object);
     * // => true
     */
    function identity(value) {
      return value;
    }

    var identity_1 = identity;

    /**
     * The base implementation of `_.property` without support for deep paths.
     *
     * @private
     * @param {string} key The key of the property to get.
     * @returns {Function} Returns the new accessor function.
     */
    function baseProperty(key) {
      return function(object) {
        return object == null ? undefined : object[key];
      };
    }

    var _baseProperty = baseProperty;

    /**
     * A specialized version of `baseProperty` which supports deep paths.
     *
     * @private
     * @param {Array|string} path The path of the property to get.
     * @returns {Function} Returns the new accessor function.
     */
    function basePropertyDeep(path) {
      return function(object) {
        return _baseGet(object, path);
      };
    }

    var _basePropertyDeep = basePropertyDeep;

    /**
     * Creates a function that returns the value at `path` of a given object.
     *
     * @static
     * @memberOf _
     * @since 2.4.0
     * @category Util
     * @param {Array|string} path The path of the property to get.
     * @returns {Function} Returns the new accessor function.
     * @example
     *
     * var objects = [
     *   { 'a': { 'b': 2 } },
     *   { 'a': { 'b': 1 } }
     * ];
     *
     * _.map(objects, _.property('a.b'));
     * // => [2, 1]
     *
     * _.map(_.sortBy(objects, _.property(['a', 'b'])), 'a.b');
     * // => [1, 2]
     */
    function property(path) {
      return _isKey(path) ? _baseProperty(_toKey(path)) : _basePropertyDeep(path);
    }

    var property_1 = property;

    /**
     * The base implementation of `_.iteratee`.
     *
     * @private
     * @param {*} [value=_.identity] The value to convert to an iteratee.
     * @returns {Function} Returns the iteratee.
     */
    function baseIteratee(value) {
      // Don't store the `typeof` result in a variable to avoid a JIT bug in Safari 9.
      // See https://bugs.webkit.org/show_bug.cgi?id=156034 for more details.
      if (typeof value == 'function') {
        return value;
      }
      if (value == null) {
        return identity_1;
      }
      if (typeof value == 'object') {
        return isArray_1(value)
          ? _baseMatchesProperty(value[0], value[1])
          : _baseMatches(value);
      }
      return property_1(value);
    }

    var _baseIteratee = baseIteratee;

    /**
     * Creates an object with the same keys as `object` and values generated
     * by running each own enumerable string keyed property of `object` thru
     * `iteratee`. The iteratee is invoked with three arguments:
     * (value, key, object).
     *
     * @static
     * @memberOf _
     * @since 2.4.0
     * @category Object
     * @param {Object} object The object to iterate over.
     * @param {Function} [iteratee=_.identity] The function invoked per iteration.
     * @returns {Object} Returns the new mapped object.
     * @see _.mapKeys
     * @example
     *
     * var users = {
     *   'fred':    { 'user': 'fred',    'age': 40 },
     *   'pebbles': { 'user': 'pebbles', 'age': 1 }
     * };
     *
     * _.mapValues(users, function(o) { return o.age; });
     * // => { 'fred': 40, 'pebbles': 1 } (iteration order is not guaranteed)
     *
     * // The `_.property` iteratee shorthand.
     * _.mapValues(users, 'age');
     * // => { 'fred': 40, 'pebbles': 1 } (iteration order is not guaranteed)
     */
    function mapValues(object, iteratee) {
      var result = {};
      iteratee = _baseIteratee(iteratee);

      _baseForOwn(object, function(value, key, object) {
        _baseAssignValue(result, key, iteratee(value, key, object));
      });
      return result;
    }

    var mapValues_1 = mapValues;

    /**
     * Based on Kendo UI Core expression code <https://github.com/telerik/kendo-ui-core#license-information>
     */

    function Cache(maxSize) {
      this._maxSize = maxSize;
      this.clear();
    }
    Cache.prototype.clear = function() {
      this._size = 0;
      this._values = {};
    };
    Cache.prototype.get = function(key) {
      return this._values[key]
    };
    Cache.prototype.set = function(key, value) {
      this._size >= this._maxSize && this.clear();
      if (!this._values.hasOwnProperty(key)) {
        this._size++;
      }
      return this._values[key] = value
    };

    var SPLIT_REGEX = /[^.^\]^[]+|(?=\[\]|\.\.)/g,
      DIGIT_REGEX = /^\d+$/,
      LEAD_DIGIT_REGEX = /^\d/,
      SPEC_CHAR_REGEX = /[~`!#$%\^&*+=\-\[\]\\';,/{}|\\":<>\?]/g,
      CLEAN_QUOTES_REGEX = /^\s*(['"]?)(.*?)(\1)\s*$/,
      MAX_CACHE_SIZE = 512;

    var contentSecurityPolicy = false,
      pathCache = new Cache(MAX_CACHE_SIZE),
      setCache = new Cache(MAX_CACHE_SIZE),
      getCache = new Cache(MAX_CACHE_SIZE);

    try {
      new Function('');
    } catch (error) {
      contentSecurityPolicy = true;
    }

    var propertyExpr = {
      Cache: Cache,

      expr: expr,

      split: split,

      normalizePath: normalizePath,

      setter: contentSecurityPolicy
        ? function(path) {
          var parts = normalizePath(path);
          return function(data, value) {
            return setterFallback(parts, data, value)
          }
        }
        : function(path) {
          return setCache.get(path) || setCache.set(
            path,
            new Function(
              'data, value',
              expr(path, 'data') + ' = value'
            )
          )
        },

      getter: contentSecurityPolicy
        ? function(path, safe) {
          var parts = normalizePath(path);
          return function(data) {
            return getterFallback(parts, safe, data)
          }
        }
        : function(path, safe) {
          var key = path + '_' + safe;
          return getCache.get(key) || getCache.set(
            key,
            new Function('data', 'return ' + expr(path, safe, 'data'))
          )
        },

      join: function(segments) {
        return segments.reduce(function(path, part) {
          return (
            path +
            (isQuoted(part) || DIGIT_REGEX.test(part)
              ? '[' + part + ']'
              : (path ? '.' : '') + part)
          )
        }, '')
      },

      forEach: function(path, cb, thisArg) {
        forEach(split(path), cb, thisArg);
      }
    };

    function setterFallback(parts, data, value) {
      var index = 0,
        len = parts.length;
      while (index < len - 1) {
        data = data[parts[index++]];
      }
      data[parts[index]] = value;
    }

    function getterFallback(parts, safe, data) {
      var index = 0,
        len = parts.length;
      while (index < len) {
        if (data != null || !safe) {
          data = data[parts[index++]];
        } else {
          return
        }
      }
      return data
    }

    function normalizePath(path) {
      return pathCache.get(path) || pathCache.set(
        path,
        split(path).map(function(part) {
          return part.replace(CLEAN_QUOTES_REGEX, '$2')
        })
      )
    }

    function split(path) {
      return path.match(SPLIT_REGEX)
    }

    function expr(expression, safe, param) {
      expression = expression || '';

      if (typeof safe === 'string') {
        param = safe;
        safe = false;
      }

      param = param || 'data';

      if (expression && expression.charAt(0) !== '[') expression = '.' + expression;

      return safe ? makeSafe(expression, param) : param + expression
    }

    function forEach(parts, iter, thisArg) {
      var len = parts.length,
        part,
        idx,
        isArray,
        isBracket;

      for (idx = 0; idx < len; idx++) {
        part = parts[idx];

        if (part) {
          if (shouldBeQuoted(part)) {
            part = '"' + part + '"';
          }

          isBracket = isQuoted(part);
          isArray = !isBracket && /^\d+$/.test(part);

          iter.call(thisArg, part, isBracket, isArray, idx, parts);
        }
      }
    }

    function isQuoted(str) {
      return (
        typeof str === 'string' && str && ["'", '"'].indexOf(str.charAt(0)) !== -1
      )
    }

    function makeSafe(path, param) {
      var result = param,
        parts = split(path),
        isLast;

      forEach(parts, function(part, isBracket, isArray, idx, parts) {
        isLast = idx === parts.length - 1;

        part = isBracket || isArray ? '[' + part + ']' : '.' + part;

        result += part + (!isLast ? ' || {})' : ')');
      });

      return new Array(parts.length + 1).join('(') + result
    }

    function hasLeadingNumber(part) {
      return part.match(LEAD_DIGIT_REGEX) && !part.match(DIGIT_REGEX)
    }

    function hasSpecialChars(part) {
      return SPEC_CHAR_REGEX.test(part)
    }

    function shouldBeQuoted(part) {
      return !isQuoted(part) && (hasLeadingNumber(part) || hasSpecialChars(part))
    }

    var Reference_1 = createCommonjsModule(function (module, exports) {



    exports.__esModule = true;
    exports.default = void 0;

    var _extends2 = interopRequireDefault(_extends_1);



    var prefixes = {
      context: '$',
      value: '.'
    };

    var Reference =
    /*#__PURE__*/
    function () {
      function Reference(key, options) {
        if (options === void 0) {
          options = {};
        }

        if (typeof key !== 'string') throw new TypeError('ref must be a string, got: ' + key);
        this.key = key.trim();
        if (key === '') throw new TypeError('ref must be a non-empty string');
        this.isContext = this.key[0] === prefixes.context;
        this.isValue = this.key[0] === prefixes.value;
        this.isSibling = !this.isContext && !this.isValue;
        var prefix = this.isContext ? prefixes.context : this.isValue ? prefixes.value : '';
        this.path = this.key.slice(prefix.length);
        this.getter = this.path && (0, propertyExpr.getter)(this.path, true);
        this.map = options.map;
      }

      var _proto = Reference.prototype;

      _proto.getValue = function getValue(options) {
        var result = this.isContext ? options.context : this.isValue ? options.value : options.parent;
        if (this.getter) result = this.getter(result || {});
        if (this.map) result = this.map(result);
        return result;
      };

      _proto.cast = function cast(value, options) {
        return this.getValue((0, _extends2.default)({}, options, {
          value: value
        }));
      };

      _proto.resolve = function resolve() {
        return this;
      };

      _proto.describe = function describe() {
        return {
          type: 'ref',
          key: this.key
        };
      };

      _proto.toString = function toString() {
        return "Ref(" + this.key + ")";
      };

      Reference.isRef = function isRef(value) {
        return value && value.__isYupRef;
      };

      return Reference;
    }();

    exports.default = Reference;
    Reference.prototype.__isYupRef = true;
    module.exports = exports["default"];
    });

    unwrapExports(Reference_1);

    var createValidation_1 = createCommonjsModule(function (module, exports) {



    exports.__esModule = true;
    exports.createErrorFactory = createErrorFactory;
    exports.default = createValidation;

    var _objectWithoutPropertiesLoose2 = interopRequireDefault(objectWithoutPropertiesLoose);

    var _extends2 = interopRequireDefault(_extends_1);

    var _mapValues = interopRequireDefault(mapValues_1);

    var _ValidationError = interopRequireDefault(ValidationError_1);

    var _Reference = interopRequireDefault(Reference_1);



    var formatError = _ValidationError.default.formatError;

    var thenable = function thenable(p) {
      return p && typeof p.then === 'function' && typeof p.catch === 'function';
    };

    function runTest(testFn, ctx, value, sync) {
      var result = testFn.call(ctx, value);
      if (!sync) return Promise.resolve(result);

      if (thenable(result)) {
        throw new Error("Validation test of type: \"" + ctx.type + "\" returned a Promise during a synchronous validate. " + "This test will finish after the validate call has returned");
      }

      return synchronousPromise.SynchronousPromise.resolve(result);
    }

    function resolveParams(oldParams, newParams, resolve) {
      return (0, _mapValues.default)((0, _extends2.default)({}, oldParams, newParams), resolve);
    }

    function createErrorFactory(_ref) {
      var value = _ref.value,
          label = _ref.label,
          resolve = _ref.resolve,
          originalValue = _ref.originalValue,
          opts = (0, _objectWithoutPropertiesLoose2.default)(_ref, ["value", "label", "resolve", "originalValue"]);
      return function createError(_temp) {
        var _ref2 = _temp === void 0 ? {} : _temp,
            _ref2$path = _ref2.path,
            path = _ref2$path === void 0 ? opts.path : _ref2$path,
            _ref2$message = _ref2.message,
            message = _ref2$message === void 0 ? opts.message : _ref2$message,
            _ref2$type = _ref2.type,
            type = _ref2$type === void 0 ? opts.name : _ref2$type,
            params = _ref2.params;

        params = (0, _extends2.default)({
          path: path,
          value: value,
          originalValue: originalValue,
          label: label
        }, resolveParams(opts.params, params, resolve));
        return (0, _extends2.default)(new _ValidationError.default(formatError(message, params), value, path, type), {
          params: params
        });
      };
    }

    function createValidation(options) {
      var name = options.name,
          message = options.message,
          test = options.test,
          params = options.params;

      function validate(_ref3) {
        var value = _ref3.value,
            path = _ref3.path,
            label = _ref3.label,
            options = _ref3.options,
            originalValue = _ref3.originalValue,
            sync = _ref3.sync,
            rest = (0, _objectWithoutPropertiesLoose2.default)(_ref3, ["value", "path", "label", "options", "originalValue", "sync"]);
        var parent = options.parent;

        var resolve = function resolve(item) {
          return _Reference.default.isRef(item) ? item.getValue({
            value: value,
            parent: parent,
            context: options.context
          }) : item;
        };

        var createError = createErrorFactory({
          message: message,
          path: path,
          value: value,
          originalValue: originalValue,
          params: params,
          label: label,
          resolve: resolve,
          name: name
        });
        var ctx = (0, _extends2.default)({
          path: path,
          parent: parent,
          type: name,
          createError: createError,
          resolve: resolve,
          options: options
        }, rest);
        return runTest(test, ctx, value, sync).then(function (validOrError) {
          if (_ValidationError.default.isError(validOrError)) throw validOrError;else if (!validOrError) throw createError();
        });
      }

      validate.OPTIONS = options;
      return validate;
    }
    });

    unwrapExports(createValidation_1);
    var createValidation_2 = createValidation_1.createErrorFactory;

    var reach_1 = createCommonjsModule(function (module, exports) {



    exports.__esModule = true;
    exports.getIn = getIn;
    exports.default = void 0;



    var _has = interopRequireDefault(has_1);

    var trim = function trim(part) {
      return part.substr(0, part.length - 1).substr(1);
    };

    function getIn(schema, path, value, context) {
      var parent, lastPart, lastPartDebug; // if only one "value" arg then use it for both

      context = context || value;
      if (!path) return {
        parent: parent,
        parentPath: path,
        schema: schema
      };
      (0, propertyExpr.forEach)(path, function (_part, isBracket, isArray) {
        var part = isBracket ? trim(_part) : _part;

        if (isArray || (0, _has.default)(schema, '_subType')) {
          // we skipped an array: foo[].bar
          var idx = isArray ? parseInt(part, 10) : 0;
          schema = schema.resolve({
            context: context,
            parent: parent,
            value: value
          })._subType;

          if (value) {
            if (isArray && idx >= value.length) {
              throw new Error("Yup.reach cannot resolve an array item at index: " + _part + ", in the path: " + path + ". " + "because there is no value at that index. ");
            }

            value = value[idx];
          }
        }

        if (!isArray) {
          schema = schema.resolve({
            context: context,
            parent: parent,
            value: value
          });
          if (!(0, _has.default)(schema, 'fields') || !(0, _has.default)(schema.fields, part)) throw new Error("The schema does not contain the path: " + path + ". " + ("(failed at: " + lastPartDebug + " which is a type: \"" + schema._type + "\") "));
          schema = schema.fields[part];
          parent = value;
          value = value && value[part];
          lastPart = part;
          lastPartDebug = isBracket ? '[' + _part + ']' : '.' + _part;
        }
      });
      return {
        schema: schema,
        parent: parent,
        parentPath: lastPart
      };
    }

    var reach = function reach(obj, path, value, context) {
      return getIn(obj, path, value, context).schema;
    };

    var _default = reach;
    exports.default = _default;
    });

    unwrapExports(reach_1);
    var reach_2 = reach_1.getIn;

    var mixed = createCommonjsModule(function (module, exports) {



    exports.__esModule = true;
    exports.default = SchemaType;

    var _extends2 = interopRequireDefault(_extends_1);

    var _has = interopRequireDefault(has_1);

    var _cloneDeepWith = interopRequireDefault(cloneDeepWith_1);

    var _toArray2 = interopRequireDefault(toArray_1);



    var _Condition = interopRequireDefault(Condition_1);

    var _runValidations = interopRequireDefault(runValidations_1);

    var _prependDeep = interopRequireDefault(prependDeep_1);

    var _isSchema = interopRequireDefault(isSchema);

    var _createValidation = interopRequireDefault(createValidation_1);

    var _printValue = interopRequireDefault(printValue_1);

    var _Reference = interopRequireDefault(Reference_1);



    var RefSet =
    /*#__PURE__*/
    function () {
      function RefSet() {
        this.list = new Set();
        this.refs = new Map();
      }

      var _proto = RefSet.prototype;

      _proto.toArray = function toArray() {
        return (0, _toArray2.default)(this.list).concat((0, _toArray2.default)(this.refs.values()));
      };

      _proto.add = function add(value) {
        _Reference.default.isRef(value) ? this.refs.set(value.key, value) : this.list.add(value);
      };

      _proto.delete = function _delete(value) {
        _Reference.default.isRef(value) ? this.refs.delete(value.key, value) : this.list.delete(value);
      };

      _proto.has = function has(value, resolve) {
        if (this.list.has(value)) return true;
        var item,
            values = this.refs.values();

        while (item = values.next(), !item.done) {
          if (resolve(item.value) === value) return true;
        }

        return false;
      };

      return RefSet;
    }();

    function SchemaType(options) {
      var _this = this;

      if (options === void 0) {
        options = {};
      }

      if (!(this instanceof SchemaType)) return new SchemaType();
      this._deps = [];
      this._conditions = [];
      this._options = {
        abortEarly: true,
        recursive: true
      };
      this._exclusive = Object.create(null);
      this._whitelist = new RefSet();
      this._blacklist = new RefSet();
      this.tests = [];
      this.transforms = [];
      this.withMutation(function () {
        _this.typeError(locale.mixed.notType);
      });
      if ((0, _has.default)(options, 'default')) this._defaultDefault = options.default;
      this._type = options.type || 'mixed';
    }

    var proto = SchemaType.prototype = {
      __isYupSchema__: true,
      constructor: SchemaType,
      clone: function clone() {
        var _this2 = this;

        if (this._mutate) return this; // if the nested value is a schema we can skip cloning, since
        // they are already immutable

        return (0, _cloneDeepWith.default)(this, function (value) {
          if ((0, _isSchema.default)(value) && value !== _this2) return value;
        });
      },
      label: function label(_label) {
        var next = this.clone();
        next._label = _label;
        return next;
      },
      meta: function meta(obj) {
        if (arguments.length === 0) return this._meta;
        var next = this.clone();
        next._meta = (0, _extends2.default)(next._meta || {}, obj);
        return next;
      },
      withMutation: function withMutation(fn) {
        var before = this._mutate;
        this._mutate = true;
        var result = fn(this);
        this._mutate = before;
        return result;
      },
      concat: function concat(schema) {
        if (!schema || schema === this) return this;
        if (schema._type !== this._type && this._type !== 'mixed') throw new TypeError("You cannot `concat()` schema's of different types: " + this._type + " and " + schema._type);
        var next = (0, _prependDeep.default)(schema.clone(), this); // new undefined default is overriden by old non-undefined one, revert

        if ((0, _has.default)(schema, '_default')) next._default = schema._default;
        next.tests = this.tests;
        next._exclusive = this._exclusive; // manually add the new tests to ensure
        // the deduping logic is consistent

        next.withMutation(function (next) {
          schema.tests.forEach(function (fn) {
            next.test(fn.OPTIONS);
          });
        });
        return next;
      },
      isType: function isType(v) {
        if (this._nullable && v === null) return true;
        return !this._typeCheck || this._typeCheck(v);
      },
      resolve: function resolve(options) {
        var schema = this;

        if (schema._conditions.length) {
          var conditions = schema._conditions;
          schema = schema.clone();
          schema._conditions = [];
          schema = conditions.reduce(function (schema, condition) {
            return condition.resolve(schema, options);
          }, schema);
          schema = schema.resolve(options);
        }

        return schema;
      },
      cast: function cast(value, options) {
        if (options === void 0) {
          options = {};
        }

        var resolvedSchema = this.resolve((0, _extends2.default)({}, options, {
          value: value
        }));

        var result = resolvedSchema._cast(value, options);

        if (value !== undefined && options.assert !== false && resolvedSchema.isType(result) !== true) {
          var formattedValue = (0, _printValue.default)(value);
          var formattedResult = (0, _printValue.default)(result);
          throw new TypeError("The value of " + (options.path || 'field') + " could not be cast to a value " + ("that satisfies the schema type: \"" + resolvedSchema._type + "\". \n\n") + ("attempted value: " + formattedValue + " \n") + (formattedResult !== formattedValue ? "result of cast: " + formattedResult : ''));
        }

        return result;
      },
      _cast: function _cast(rawValue) {
        var _this3 = this;

        var value = rawValue === undefined ? rawValue : this.transforms.reduce(function (value, fn) {
          return fn.call(_this3, value, rawValue);
        }, rawValue);

        if (value === undefined && (0, _has.default)(this, '_default')) {
          value = this.default();
        }

        return value;
      },
      _validate: function _validate(_value, options) {
        var _this4 = this;

        if (options === void 0) {
          options = {};
        }

        var value = _value;
        var originalValue = options.originalValue != null ? options.originalValue : _value;

        var isStrict = this._option('strict', options);

        var endEarly = this._option('abortEarly', options);

        var sync = options.sync;
        var path = options.path;
        var label = this._label;

        if (!isStrict) {
          value = this._cast(value, (0, _extends2.default)({
            assert: false
          }, options));
        } // value is cast, we can check if it meets type requirements


        var validationParams = {
          value: value,
          path: path,
          schema: this,
          options: options,
          label: label,
          originalValue: originalValue,
          sync: sync
        };
        var initialTests = [];
        if (this._typeError) initialTests.push(this._typeError(validationParams));
        if (this._whitelistError) initialTests.push(this._whitelistError(validationParams));
        if (this._blacklistError) initialTests.push(this._blacklistError(validationParams));
        return (0, _runValidations.default)({
          validations: initialTests,
          endEarly: endEarly,
          value: value,
          path: path,
          sync: sync
        }).then(function (value) {
          return (0, _runValidations.default)({
            path: path,
            sync: sync,
            value: value,
            endEarly: endEarly,
            validations: _this4.tests.map(function (fn) {
              return fn(validationParams);
            })
          });
        });
      },
      validate: function validate(value, options) {
        if (options === void 0) {
          options = {};
        }

        var schema = this.resolve((0, _extends2.default)({}, options, {
          value: value
        }));
        return schema._validate(value, options);
      },
      validateSync: function validateSync(value, options) {
        if (options === void 0) {
          options = {};
        }

        var schema = this.resolve((0, _extends2.default)({}, options, {
          value: value
        }));
        var result, err;

        schema._validate(value, (0, _extends2.default)({}, options, {
          sync: true
        })).then(function (r) {
          return result = r;
        }).catch(function (e) {
          return err = e;
        });

        if (err) throw err;
        return result;
      },
      isValid: function isValid(value, options) {
        return this.validate(value, options).then(function () {
          return true;
        }).catch(function (err) {
          if (err.name === 'ValidationError') return false;
          throw err;
        });
      },
      isValidSync: function isValidSync(value, options) {
        try {
          this.validateSync(value, options);
          return true;
        } catch (err) {
          if (err.name === 'ValidationError') return false;
          throw err;
        }
      },
      getDefault: function getDefault(options) {
        if (options === void 0) {
          options = {};
        }

        var schema = this.resolve(options);
        return schema.default();
      },
      default: function _default(def) {
        if (arguments.length === 0) {
          var defaultValue = (0, _has.default)(this, '_default') ? this._default : this._defaultDefault;
          return typeof defaultValue === 'function' ? defaultValue.call(this) : (0, _cloneDeepWith.default)(defaultValue);
        }

        var next = this.clone();
        next._default = def;
        return next;
      },
      strict: function strict(isStrict) {
        if (isStrict === void 0) {
          isStrict = true;
        }

        var next = this.clone();
        next._options.strict = isStrict;
        return next;
      },
      _isPresent: function _isPresent(value) {
        return value != null;
      },
      required: function required(message) {
        if (message === void 0) {
          message = locale.mixed.required;
        }

        return this.test({
          message: message,
          name: 'required',
          exclusive: true,
          test: function test(value) {
            return this.schema._isPresent(value);
          }
        });
      },
      notRequired: function notRequired() {
        var next = this.clone();
        next.tests = next.tests.filter(function (test) {
          return test.OPTIONS.name !== 'required';
        });
        return next;
      },
      nullable: function nullable(isNullable) {
        if (isNullable === void 0) {
          isNullable = true;
        }

        var next = this.clone();
        next._nullable = isNullable;
        return next;
      },
      transform: function transform(fn) {
        var next = this.clone();
        next.transforms.push(fn);
        return next;
      },

      /**
       * Adds a test function to the schema's queue of tests.
       * tests can be exclusive or non-exclusive.
       *
       * - exclusive tests, will replace any existing tests of the same name.
       * - non-exclusive: can be stacked
       *
       * If a non-exclusive test is added to a schema with an exclusive test of the same name
       * the exclusive test is removed and further tests of the same name will be stacked.
       *
       * If an exclusive test is added to a schema with non-exclusive tests of the same name
       * the previous tests are removed and further tests of the same name will replace each other.
       */
      test: function test() {
        var opts;

        if (arguments.length === 1) {
          if (typeof (arguments.length <= 0 ? undefined : arguments[0]) === 'function') {
            opts = {
              test: arguments.length <= 0 ? undefined : arguments[0]
            };
          } else {
            opts = arguments.length <= 0 ? undefined : arguments[0];
          }
        } else if (arguments.length === 2) {
          opts = {
            name: arguments.length <= 0 ? undefined : arguments[0],
            test: arguments.length <= 1 ? undefined : arguments[1]
          };
        } else {
          opts = {
            name: arguments.length <= 0 ? undefined : arguments[0],
            message: arguments.length <= 1 ? undefined : arguments[1],
            test: arguments.length <= 2 ? undefined : arguments[2]
          };
        }

        if (opts.message === undefined) opts.message = locale.mixed.default;
        if (typeof opts.test !== 'function') throw new TypeError('`test` is a required parameters');
        var next = this.clone();
        var validate = (0, _createValidation.default)(opts);
        var isExclusive = opts.exclusive || opts.name && next._exclusive[opts.name] === true;

        if (opts.exclusive && !opts.name) {
          throw new TypeError('Exclusive tests must provide a unique `name` identifying the test');
        }

        next._exclusive[opts.name] = !!opts.exclusive;
        next.tests = next.tests.filter(function (fn) {
          if (fn.OPTIONS.name === opts.name) {
            if (isExclusive) return false;
            if (fn.OPTIONS.test === validate.OPTIONS.test) return false;
          }

          return true;
        });
        next.tests.push(validate);
        return next;
      },
      when: function when(keys, options) {
        if (arguments.length === 1) {
          options = keys;
          keys = '.';
        }

        var next = this.clone(),
            deps = [].concat(keys).map(function (key) {
          return new _Reference.default(key);
        });
        deps.forEach(function (dep) {
          if (dep.isSibling) next._deps.push(dep.key);
        });

        next._conditions.push(new _Condition.default(deps, options));

        return next;
      },
      typeError: function typeError(message) {
        var next = this.clone();
        next._typeError = (0, _createValidation.default)({
          message: message,
          name: 'typeError',
          test: function test(value) {
            if (value !== undefined && !this.schema.isType(value)) return this.createError({
              params: {
                type: this.schema._type
              }
            });
            return true;
          }
        });
        return next;
      },
      oneOf: function oneOf(enums, message) {
        if (message === void 0) {
          message = locale.mixed.oneOf;
        }

        var next = this.clone();
        enums.forEach(function (val) {
          next._whitelist.add(val);

          next._blacklist.delete(val);
        });
        next._whitelistError = (0, _createValidation.default)({
          message: message,
          name: 'oneOf',
          test: function test(value) {
            if (value === undefined) return true;
            var valids = this.schema._whitelist;
            return valids.has(value, this.resolve) ? true : this.createError({
              params: {
                values: valids.toArray().join(', ')
              }
            });
          }
        });
        return next;
      },
      notOneOf: function notOneOf(enums, message) {
        if (message === void 0) {
          message = locale.mixed.notOneOf;
        }

        var next = this.clone();
        enums.forEach(function (val) {
          next._blacklist.add(val);

          next._whitelist.delete(val);
        });
        next._blacklistError = (0, _createValidation.default)({
          message: message,
          name: 'notOneOf',
          test: function test(value) {
            var invalids = this.schema._blacklist;
            if (invalids.has(value, this.resolve)) return this.createError({
              params: {
                values: invalids.toArray().join(', ')
              }
            });
            return true;
          }
        });
        return next;
      },
      strip: function strip(_strip) {
        if (_strip === void 0) {
          _strip = true;
        }

        var next = this.clone();
        next._strip = _strip;
        return next;
      },
      _option: function _option(key, overrides) {
        return (0, _has.default)(overrides, key) ? overrides[key] : this._options[key];
      },
      describe: function describe() {
        var next = this.clone();
        return {
          type: next._type,
          meta: next._meta,
          label: next._label,
          tests: next.tests.map(function (fn) {
            return {
              name: fn.OPTIONS.name,
              params: fn.OPTIONS.params
            };
          }).filter(function (n, idx, list) {
            return list.findIndex(function (c) {
              return c.name === n.name;
            }) === idx;
          })
        };
      }
    };
    var _arr = ['validate', 'validateSync'];

    var _loop = function _loop() {
      var method = _arr[_i];

      proto[method + "At"] = function (path, value, options) {
        if (options === void 0) {
          options = {};
        }

        var _getIn = (0, reach_1.getIn)(this, path, value, options.context),
            parent = _getIn.parent,
            parentPath = _getIn.parentPath,
            schema = _getIn.schema;

        return schema[method](parent && parent[parentPath], (0, _extends2.default)({}, options, {
          parent: parent,
          path: path
        }));
      };
    };

    for (var _i = 0; _i < _arr.length; _i++) {
      _loop();
    }

    var _arr2 = ['equals', 'is'];

    for (var _i2 = 0; _i2 < _arr2.length; _i2++) {
      var alias = _arr2[_i2];
      proto[alias] = proto.oneOf;
    }

    var _arr3 = ['not', 'nope'];

    for (var _i3 = 0; _i3 < _arr3.length; _i3++) {
      var _alias = _arr3[_i3];
      proto[_alias] = proto.notOneOf;
    }

    proto.optional = proto.notRequired;
    module.exports = exports["default"];
    });

    unwrapExports(mixed);

    var inherits_1 = createCommonjsModule(function (module, exports) {



    exports.__esModule = true;
    exports.default = inherits;

    var _extends2 = interopRequireDefault(_extends_1);

    function inherits(ctor, superCtor, spec) {
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      });
      (0, _extends2.default)(ctor.prototype, spec);
    }

    module.exports = exports["default"];
    });

    unwrapExports(inherits_1);

    var boolean_1 = createCommonjsModule(function (module, exports) {



    exports.__esModule = true;
    exports.default = void 0;

    var _inherits = interopRequireDefault(inherits_1);

    var _mixed = interopRequireDefault(mixed);

    var _default = BooleanSchema;
    exports.default = _default;

    function BooleanSchema() {
      var _this = this;

      if (!(this instanceof BooleanSchema)) return new BooleanSchema();

      _mixed.default.call(this, {
        type: 'boolean'
      });

      this.withMutation(function () {
        _this.transform(function (value) {
          if (!this.isType(value)) {
            if (/^(true|1)$/i.test(value)) return true;
            if (/^(false|0)$/i.test(value)) return false;
          }

          return value;
        });
      });
    }

    (0, _inherits.default)(BooleanSchema, _mixed.default, {
      _typeCheck: function _typeCheck(v) {
        if (v instanceof Boolean) v = v.valueOf();
        return typeof v === 'boolean';
      }
    });
    module.exports = exports["default"];
    });

    unwrapExports(boolean_1);

    var isAbsent = createCommonjsModule(function (module, exports) {

    exports.__esModule = true;
    exports.default = void 0;

    var _default = function _default(value) {
      return value == null;
    };

    exports.default = _default;
    module.exports = exports["default"];
    });

    unwrapExports(isAbsent);

    var string = createCommonjsModule(function (module, exports) {



    exports.__esModule = true;
    exports.default = StringSchema;

    var _inherits = interopRequireDefault(inherits_1);

    var _mixed = interopRequireDefault(mixed);



    var _isAbsent = interopRequireDefault(isAbsent);

    // eslint-disable-next-line
    var rEmail = /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))$/i; // eslint-disable-next-line

    var rUrl = /^((https?|ftp):)?\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i;

    var isTrimmed = function isTrimmed(value) {
      return (0, _isAbsent.default)(value) || value === value.trim();
    };

    function StringSchema() {
      var _this = this;

      if (!(this instanceof StringSchema)) return new StringSchema();

      _mixed.default.call(this, {
        type: 'string'
      });

      this.withMutation(function () {
        _this.transform(function (value) {
          if (this.isType(value)) return value;
          return value != null && value.toString ? value.toString() : value;
        });
      });
    }

    (0, _inherits.default)(StringSchema, _mixed.default, {
      _typeCheck: function _typeCheck(value) {
        if (value instanceof String) value = value.valueOf();
        return typeof value === 'string';
      },
      _isPresent: function _isPresent(value) {
        return _mixed.default.prototype._cast.call(this, value) && value.length > 0;
      },
      length: function length(_length, message) {
        if (message === void 0) {
          message = locale.string.length;
        }

        return this.test({
          message: message,
          name: 'length',
          exclusive: true,
          params: {
            length: _length
          },
          test: function test(value) {
            return (0, _isAbsent.default)(value) || value.length === this.resolve(_length);
          }
        });
      },
      min: function min(_min, message) {
        if (message === void 0) {
          message = locale.string.min;
        }

        return this.test({
          message: message,
          name: 'min',
          exclusive: true,
          params: {
            min: _min
          },
          test: function test(value) {
            return (0, _isAbsent.default)(value) || value.length >= this.resolve(_min);
          }
        });
      },
      max: function max(_max, message) {
        if (message === void 0) {
          message = locale.string.max;
        }

        return this.test({
          name: 'max',
          exclusive: true,
          message: message,
          params: {
            max: _max
          },
          test: function test(value) {
            return (0, _isAbsent.default)(value) || value.length <= this.resolve(_max);
          }
        });
      },
      matches: function matches(regex, options) {
        var excludeEmptyString = false;
        var message;

        if (options) {
          if (options.message || options.hasOwnProperty('excludeEmptyString')) {
            excludeEmptyString = options.excludeEmptyString;
            message = options.message;
          } else message = options;
        }

        return this.test({
          message: message || locale.string.matches,
          params: {
            regex: regex
          },
          test: function test(value) {
            return (0, _isAbsent.default)(value) || value === '' && excludeEmptyString || regex.test(value);
          }
        });
      },
      email: function email(message) {
        if (message === void 0) {
          message = locale.string.email;
        }

        return this.matches(rEmail, {
          message: message,
          excludeEmptyString: true
        });
      },
      url: function url(message) {
        if (message === void 0) {
          message = locale.string.url;
        }

        return this.matches(rUrl, {
          message: message,
          excludeEmptyString: true
        });
      },
      //-- transforms --
      ensure: function ensure() {
        return this.default('').transform(function (val) {
          return val === null ? '' : val;
        });
      },
      trim: function trim(message) {
        if (message === void 0) {
          message = locale.string.trim;
        }

        return this.transform(function (val) {
          return val != null ? val.trim() : val;
        }).test({
          message: message,
          name: 'trim',
          test: isTrimmed
        });
      },
      lowercase: function lowercase(message) {
        if (message === void 0) {
          message = locale.string.lowercase;
        }

        return this.transform(function (value) {
          return !(0, _isAbsent.default)(value) ? value.toLowerCase() : value;
        }).test({
          message: message,
          name: 'string_case',
          exclusive: true,
          test: function test(value) {
            return (0, _isAbsent.default)(value) || value === value.toLowerCase();
          }
        });
      },
      uppercase: function uppercase(message) {
        if (message === void 0) {
          message = locale.string.uppercase;
        }

        return this.transform(function (value) {
          return !(0, _isAbsent.default)(value) ? value.toUpperCase() : value;
        }).test({
          message: message,
          name: 'string_case',
          exclusive: true,
          test: function test(value) {
            return (0, _isAbsent.default)(value) || value === value.toUpperCase();
          }
        });
      }
    });
    module.exports = exports["default"];
    });

    unwrapExports(string);

    var number = createCommonjsModule(function (module, exports) {



    exports.__esModule = true;
    exports.default = NumberSchema;

    var _inherits = interopRequireDefault(inherits_1);

    var _mixed = interopRequireDefault(mixed);



    var _isAbsent = interopRequireDefault(isAbsent);

    var isNaN = function isNaN(value) {
      return value != +value;
    };

    var isInteger = function isInteger(val) {
      return (0, _isAbsent.default)(val) || val === (val | 0);
    };

    function NumberSchema() {
      var _this = this;

      if (!(this instanceof NumberSchema)) return new NumberSchema();

      _mixed.default.call(this, {
        type: 'number'
      });

      this.withMutation(function () {
        _this.transform(function (value) {
          var parsed = value;

          if (typeof parsed === 'string') {
            parsed = parsed.replace(/\s/g, '');
            if (parsed === '') return NaN; // don't use parseFloat to avoid positives on alpha-numeric strings

            parsed = +parsed;
          }

          if (this.isType(parsed)) return parsed;
          return parseFloat(parsed);
        });
      });
    }

    (0, _inherits.default)(NumberSchema, _mixed.default, {
      _typeCheck: function _typeCheck(value) {
        if (value instanceof Number) value = value.valueOf();
        return typeof value === 'number' && !isNaN(value);
      },
      min: function min(_min, message) {
        if (message === void 0) {
          message = locale.number.min;
        }

        return this.test({
          message: message,
          name: 'min',
          exclusive: true,
          params: {
            min: _min
          },
          test: function test(value) {
            return (0, _isAbsent.default)(value) || value >= this.resolve(_min);
          }
        });
      },
      max: function max(_max, message) {
        if (message === void 0) {
          message = locale.number.max;
        }

        return this.test({
          message: message,
          name: 'max',
          exclusive: true,
          params: {
            max: _max
          },
          test: function test(value) {
            return (0, _isAbsent.default)(value) || value <= this.resolve(_max);
          }
        });
      },
      lessThan: function lessThan(less, message) {
        if (message === void 0) {
          message = locale.number.lessThan;
        }

        return this.test({
          message: message,
          name: 'max',
          exclusive: true,
          params: {
            less: less
          },
          test: function test(value) {
            return (0, _isAbsent.default)(value) || value < this.resolve(less);
          }
        });
      },
      moreThan: function moreThan(more, message) {
        if (message === void 0) {
          message = locale.number.moreThan;
        }

        return this.test({
          message: message,
          name: 'min',
          exclusive: true,
          params: {
            more: more
          },
          test: function test(value) {
            return (0, _isAbsent.default)(value) || value > this.resolve(more);
          }
        });
      },
      positive: function positive(msg) {
        if (msg === void 0) {
          msg = locale.number.positive;
        }

        return this.moreThan(0, msg);
      },
      negative: function negative(msg) {
        if (msg === void 0) {
          msg = locale.number.negative;
        }

        return this.lessThan(0, msg);
      },
      integer: function integer(message) {
        if (message === void 0) {
          message = locale.number.integer;
        }

        return this.test({
          name: 'integer',
          message: message,
          test: isInteger
        });
      },
      truncate: function truncate() {
        return this.transform(function (value) {
          return !(0, _isAbsent.default)(value) ? value | 0 : value;
        });
      },
      round: function round(method) {
        var avail = ['ceil', 'floor', 'round', 'trunc'];
        method = method && method.toLowerCase() || 'round'; // this exists for symemtry with the new Math.trunc

        if (method === 'trunc') return this.truncate();
        if (avail.indexOf(method.toLowerCase()) === -1) throw new TypeError('Only valid options for round() are: ' + avail.join(', '));
        return this.transform(function (value) {
          return !(0, _isAbsent.default)(value) ? Math[method](value) : value;
        });
      }
    });
    module.exports = exports["default"];
    });

    unwrapExports(number);

    var isodate = createCommonjsModule(function (module, exports) {

    exports.__esModule = true;
    exports.default = parseIsoDate;

    /* eslint-disable */

    /**
     *
     * Date.parse with progressive enhancement for ISO 8601 <https://github.com/csnover/js-iso8601>
     * NON-CONFORMANT EDITION.
     * © 2011 Colin Snover <http://zetafleet.com>
     * Released under MIT license.
     */
    //              1 YYYY                 2 MM        3 DD              4 HH     5 mm        6 ss            7 msec         8 Z 9 ±    10 tzHH    11 tzmm
    var isoReg = /^(\d{4}|[+\-]\d{6})(?:-?(\d{2})(?:-?(\d{2}))?)?(?:[ T]?(\d{2}):?(\d{2})(?::?(\d{2})(?:[,\.](\d{1,}))?)?(?:(Z)|([+\-])(\d{2})(?::?(\d{2}))?)?)?$/;

    function parseIsoDate(date) {
      var numericKeys = [1, 4, 5, 6, 7, 10, 11],
          minutesOffset = 0,
          timestamp,
          struct;

      if (struct = isoReg.exec(date)) {
        // avoid NaN timestamps caused by “undefined” values being passed to Date.UTC
        for (var i = 0, k; k = numericKeys[i]; ++i) {
          struct[k] = +struct[k] || 0;
        } // allow undefined days and months


        struct[2] = (+struct[2] || 1) - 1;
        struct[3] = +struct[3] || 1; // allow arbitrary sub-second precision beyond milliseconds

        struct[7] = struct[7] ? String(struct[7]).substr(0, 3) : 0; // timestamps without timezone identifiers should be considered local time

        if ((struct[8] === undefined || struct[8] === '') && (struct[9] === undefined || struct[9] === '')) timestamp = +new Date(struct[1], struct[2], struct[3], struct[4], struct[5], struct[6], struct[7]);else {
          if (struct[8] !== 'Z' && struct[9] !== undefined) {
            minutesOffset = struct[10] * 60 + struct[11];
            if (struct[9] === '+') minutesOffset = 0 - minutesOffset;
          }

          timestamp = Date.UTC(struct[1], struct[2], struct[3], struct[4], struct[5] + minutesOffset, struct[6], struct[7]);
        }
      } else timestamp = Date.parse ? Date.parse(date) : NaN;

      return timestamp;
    }

    module.exports = exports["default"];
    });

    unwrapExports(isodate);

    var date = createCommonjsModule(function (module, exports) {



    exports.__esModule = true;
    exports.default = void 0;

    var _mixed = interopRequireDefault(mixed);

    var _inherits = interopRequireDefault(inherits_1);

    var _isodate = interopRequireDefault(isodate);



    var _isAbsent = interopRequireDefault(isAbsent);

    var _Reference = interopRequireDefault(Reference_1);

    var invalidDate = new Date('');

    var isDate = function isDate(obj) {
      return Object.prototype.toString.call(obj) === '[object Date]';
    };

    var _default = DateSchema;
    exports.default = _default;

    function DateSchema() {
      var _this = this;

      if (!(this instanceof DateSchema)) return new DateSchema();

      _mixed.default.call(this, {
        type: 'date'
      });

      this.withMutation(function () {
        _this.transform(function (value) {
          if (this.isType(value)) return value;
          value = (0, _isodate.default)(value);
          return value ? new Date(value) : invalidDate;
        });
      });
    }

    (0, _inherits.default)(DateSchema, _mixed.default, {
      _typeCheck: function _typeCheck(v) {
        return isDate(v) && !isNaN(v.getTime());
      },
      min: function min(_min, message) {
        if (message === void 0) {
          message = locale.date.min;
        }

        var limit = _min;

        if (!_Reference.default.isRef(limit)) {
          limit = this.cast(_min);
          if (!this._typeCheck(limit)) throw new TypeError('`min` must be a Date or a value that can be `cast()` to a Date');
        }

        return this.test({
          message: message,
          name: 'min',
          exclusive: true,
          params: {
            min: _min
          },
          test: function test(value) {
            return (0, _isAbsent.default)(value) || value >= this.resolve(limit);
          }
        });
      },
      max: function max(_max, message) {
        if (message === void 0) {
          message = locale.date.max;
        }

        var limit = _max;

        if (!_Reference.default.isRef(limit)) {
          limit = this.cast(_max);
          if (!this._typeCheck(limit)) throw new TypeError('`max` must be a Date or a value that can be `cast()` to a Date');
        }

        return this.test({
          message: message,
          name: 'max',
          exclusive: true,
          params: {
            max: _max
          },
          test: function test(value) {
            return (0, _isAbsent.default)(value) || value <= this.resolve(limit);
          }
        });
      }
    });
    module.exports = exports["default"];
    });

    unwrapExports(date);

    var interopRequireWildcard = createCommonjsModule(function (module) {
    function _interopRequireWildcard(obj) {
      if (obj && obj.__esModule) {
        return obj;
      } else {
        var newObj = {};

        if (obj != null) {
          for (var key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
              var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {};

              if (desc.get || desc.set) {
                Object.defineProperty(newObj, key, desc);
              } else {
                newObj[key] = obj[key];
              }
            }
          }
        }

        newObj.default = obj;
        return newObj;
      }
    }

    module.exports = _interopRequireWildcard;
    });

    unwrapExports(interopRequireWildcard);

    function _taggedTemplateLiteralLoose(strings, raw) {
      if (!raw) {
        raw = strings.slice(0);
      }

      strings.raw = raw;
      return strings;
    }

    var taggedTemplateLiteralLoose = _taggedTemplateLiteralLoose;

    /**
     * A specialized version of `_.reduce` for arrays without support for
     * iteratee shorthands.
     *
     * @private
     * @param {Array} [array] The array to iterate over.
     * @param {Function} iteratee The function invoked per iteration.
     * @param {*} [accumulator] The initial value.
     * @param {boolean} [initAccum] Specify using the first element of `array` as
     *  the initial value.
     * @returns {*} Returns the accumulated value.
     */
    function arrayReduce(array, iteratee, accumulator, initAccum) {
      var index = -1,
          length = array == null ? 0 : array.length;

      if (initAccum && length) {
        accumulator = array[++index];
      }
      while (++index < length) {
        accumulator = iteratee(accumulator, array[index], index, array);
      }
      return accumulator;
    }

    var _arrayReduce = arrayReduce;

    /**
     * The base implementation of `_.propertyOf` without support for deep paths.
     *
     * @private
     * @param {Object} object The object to query.
     * @returns {Function} Returns the new accessor function.
     */
    function basePropertyOf(object) {
      return function(key) {
        return object == null ? undefined : object[key];
      };
    }

    var _basePropertyOf = basePropertyOf;

    /** Used to map Latin Unicode letters to basic Latin letters. */
    var deburredLetters = {
      // Latin-1 Supplement block.
      '\xc0': 'A',  '\xc1': 'A', '\xc2': 'A', '\xc3': 'A', '\xc4': 'A', '\xc5': 'A',
      '\xe0': 'a',  '\xe1': 'a', '\xe2': 'a', '\xe3': 'a', '\xe4': 'a', '\xe5': 'a',
      '\xc7': 'C',  '\xe7': 'c',
      '\xd0': 'D',  '\xf0': 'd',
      '\xc8': 'E',  '\xc9': 'E', '\xca': 'E', '\xcb': 'E',
      '\xe8': 'e',  '\xe9': 'e', '\xea': 'e', '\xeb': 'e',
      '\xcc': 'I',  '\xcd': 'I', '\xce': 'I', '\xcf': 'I',
      '\xec': 'i',  '\xed': 'i', '\xee': 'i', '\xef': 'i',
      '\xd1': 'N',  '\xf1': 'n',
      '\xd2': 'O',  '\xd3': 'O', '\xd4': 'O', '\xd5': 'O', '\xd6': 'O', '\xd8': 'O',
      '\xf2': 'o',  '\xf3': 'o', '\xf4': 'o', '\xf5': 'o', '\xf6': 'o', '\xf8': 'o',
      '\xd9': 'U',  '\xda': 'U', '\xdb': 'U', '\xdc': 'U',
      '\xf9': 'u',  '\xfa': 'u', '\xfb': 'u', '\xfc': 'u',
      '\xdd': 'Y',  '\xfd': 'y', '\xff': 'y',
      '\xc6': 'Ae', '\xe6': 'ae',
      '\xde': 'Th', '\xfe': 'th',
      '\xdf': 'ss',
      // Latin Extended-A block.
      '\u0100': 'A',  '\u0102': 'A', '\u0104': 'A',
      '\u0101': 'a',  '\u0103': 'a', '\u0105': 'a',
      '\u0106': 'C',  '\u0108': 'C', '\u010a': 'C', '\u010c': 'C',
      '\u0107': 'c',  '\u0109': 'c', '\u010b': 'c', '\u010d': 'c',
      '\u010e': 'D',  '\u0110': 'D', '\u010f': 'd', '\u0111': 'd',
      '\u0112': 'E',  '\u0114': 'E', '\u0116': 'E', '\u0118': 'E', '\u011a': 'E',
      '\u0113': 'e',  '\u0115': 'e', '\u0117': 'e', '\u0119': 'e', '\u011b': 'e',
      '\u011c': 'G',  '\u011e': 'G', '\u0120': 'G', '\u0122': 'G',
      '\u011d': 'g',  '\u011f': 'g', '\u0121': 'g', '\u0123': 'g',
      '\u0124': 'H',  '\u0126': 'H', '\u0125': 'h', '\u0127': 'h',
      '\u0128': 'I',  '\u012a': 'I', '\u012c': 'I', '\u012e': 'I', '\u0130': 'I',
      '\u0129': 'i',  '\u012b': 'i', '\u012d': 'i', '\u012f': 'i', '\u0131': 'i',
      '\u0134': 'J',  '\u0135': 'j',
      '\u0136': 'K',  '\u0137': 'k', '\u0138': 'k',
      '\u0139': 'L',  '\u013b': 'L', '\u013d': 'L', '\u013f': 'L', '\u0141': 'L',
      '\u013a': 'l',  '\u013c': 'l', '\u013e': 'l', '\u0140': 'l', '\u0142': 'l',
      '\u0143': 'N',  '\u0145': 'N', '\u0147': 'N', '\u014a': 'N',
      '\u0144': 'n',  '\u0146': 'n', '\u0148': 'n', '\u014b': 'n',
      '\u014c': 'O',  '\u014e': 'O', '\u0150': 'O',
      '\u014d': 'o',  '\u014f': 'o', '\u0151': 'o',
      '\u0154': 'R',  '\u0156': 'R', '\u0158': 'R',
      '\u0155': 'r',  '\u0157': 'r', '\u0159': 'r',
      '\u015a': 'S',  '\u015c': 'S', '\u015e': 'S', '\u0160': 'S',
      '\u015b': 's',  '\u015d': 's', '\u015f': 's', '\u0161': 's',
      '\u0162': 'T',  '\u0164': 'T', '\u0166': 'T',
      '\u0163': 't',  '\u0165': 't', '\u0167': 't',
      '\u0168': 'U',  '\u016a': 'U', '\u016c': 'U', '\u016e': 'U', '\u0170': 'U', '\u0172': 'U',
      '\u0169': 'u',  '\u016b': 'u', '\u016d': 'u', '\u016f': 'u', '\u0171': 'u', '\u0173': 'u',
      '\u0174': 'W',  '\u0175': 'w',
      '\u0176': 'Y',  '\u0177': 'y', '\u0178': 'Y',
      '\u0179': 'Z',  '\u017b': 'Z', '\u017d': 'Z',
      '\u017a': 'z',  '\u017c': 'z', '\u017e': 'z',
      '\u0132': 'IJ', '\u0133': 'ij',
      '\u0152': 'Oe', '\u0153': 'oe',
      '\u0149': "'n", '\u017f': 's'
    };

    /**
     * Used by `_.deburr` to convert Latin-1 Supplement and Latin Extended-A
     * letters to basic Latin letters.
     *
     * @private
     * @param {string} letter The matched letter to deburr.
     * @returns {string} Returns the deburred letter.
     */
    var deburrLetter = _basePropertyOf(deburredLetters);

    var _deburrLetter = deburrLetter;

    /** Used to match Latin Unicode letters (excluding mathematical operators). */
    var reLatin = /[\xc0-\xd6\xd8-\xf6\xf8-\xff\u0100-\u017f]/g;

    /** Used to compose unicode character classes. */
    var rsComboMarksRange$2 = '\\u0300-\\u036f',
        reComboHalfMarksRange$2 = '\\ufe20-\\ufe2f',
        rsComboSymbolsRange$2 = '\\u20d0-\\u20ff',
        rsComboRange$2 = rsComboMarksRange$2 + reComboHalfMarksRange$2 + rsComboSymbolsRange$2;

    /** Used to compose unicode capture groups. */
    var rsCombo$1 = '[' + rsComboRange$2 + ']';

    /**
     * Used to match [combining diacritical marks](https://en.wikipedia.org/wiki/Combining_Diacritical_Marks) and
     * [combining diacritical marks for symbols](https://en.wikipedia.org/wiki/Combining_Diacritical_Marks_for_Symbols).
     */
    var reComboMark = RegExp(rsCombo$1, 'g');

    /**
     * Deburrs `string` by converting
     * [Latin-1 Supplement](https://en.wikipedia.org/wiki/Latin-1_Supplement_(Unicode_block)#Character_table)
     * and [Latin Extended-A](https://en.wikipedia.org/wiki/Latin_Extended-A)
     * letters to basic Latin letters and removing
     * [combining diacritical marks](https://en.wikipedia.org/wiki/Combining_Diacritical_Marks).
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category String
     * @param {string} [string=''] The string to deburr.
     * @returns {string} Returns the deburred string.
     * @example
     *
     * _.deburr('déjà vu');
     * // => 'deja vu'
     */
    function deburr(string) {
      string = toString_1(string);
      return string && string.replace(reLatin, _deburrLetter).replace(reComboMark, '');
    }

    var deburr_1 = deburr;

    /** Used to match words composed of alphanumeric characters. */
    var reAsciiWord = /[^\x00-\x2f\x3a-\x40\x5b-\x60\x7b-\x7f]+/g;

    /**
     * Splits an ASCII `string` into an array of its words.
     *
     * @private
     * @param {string} The string to inspect.
     * @returns {Array} Returns the words of `string`.
     */
    function asciiWords(string) {
      return string.match(reAsciiWord) || [];
    }

    var _asciiWords = asciiWords;

    /** Used to detect strings that need a more robust regexp to match words. */
    var reHasUnicodeWord = /[a-z][A-Z]|[A-Z]{2}[a-z]|[0-9][a-zA-Z]|[a-zA-Z][0-9]|[^a-zA-Z0-9 ]/;

    /**
     * Checks if `string` contains a word composed of Unicode symbols.
     *
     * @private
     * @param {string} string The string to inspect.
     * @returns {boolean} Returns `true` if a word is found, else `false`.
     */
    function hasUnicodeWord(string) {
      return reHasUnicodeWord.test(string);
    }

    var _hasUnicodeWord = hasUnicodeWord;

    /** Used to compose unicode character classes. */
    var rsAstralRange$2 = '\\ud800-\\udfff',
        rsComboMarksRange$3 = '\\u0300-\\u036f',
        reComboHalfMarksRange$3 = '\\ufe20-\\ufe2f',
        rsComboSymbolsRange$3 = '\\u20d0-\\u20ff',
        rsComboRange$3 = rsComboMarksRange$3 + reComboHalfMarksRange$3 + rsComboSymbolsRange$3,
        rsDingbatRange = '\\u2700-\\u27bf',
        rsLowerRange = 'a-z\\xdf-\\xf6\\xf8-\\xff',
        rsMathOpRange = '\\xac\\xb1\\xd7\\xf7',
        rsNonCharRange = '\\x00-\\x2f\\x3a-\\x40\\x5b-\\x60\\x7b-\\xbf',
        rsPunctuationRange = '\\u2000-\\u206f',
        rsSpaceRange = ' \\t\\x0b\\f\\xa0\\ufeff\\n\\r\\u2028\\u2029\\u1680\\u180e\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200a\\u202f\\u205f\\u3000',
        rsUpperRange = 'A-Z\\xc0-\\xd6\\xd8-\\xde',
        rsVarRange$2 = '\\ufe0e\\ufe0f',
        rsBreakRange = rsMathOpRange + rsNonCharRange + rsPunctuationRange + rsSpaceRange;

    /** Used to compose unicode capture groups. */
    var rsApos = "['\u2019]",
        rsBreak = '[' + rsBreakRange + ']',
        rsCombo$2 = '[' + rsComboRange$3 + ']',
        rsDigits = '\\d+',
        rsDingbat = '[' + rsDingbatRange + ']',
        rsLower = '[' + rsLowerRange + ']',
        rsMisc = '[^' + rsAstralRange$2 + rsBreakRange + rsDigits + rsDingbatRange + rsLowerRange + rsUpperRange + ']',
        rsFitz$1 = '\\ud83c[\\udffb-\\udfff]',
        rsModifier$1 = '(?:' + rsCombo$2 + '|' + rsFitz$1 + ')',
        rsNonAstral$1 = '[^' + rsAstralRange$2 + ']',
        rsRegional$1 = '(?:\\ud83c[\\udde6-\\uddff]){2}',
        rsSurrPair$1 = '[\\ud800-\\udbff][\\udc00-\\udfff]',
        rsUpper = '[' + rsUpperRange + ']',
        rsZWJ$2 = '\\u200d';

    /** Used to compose unicode regexes. */
    var rsMiscLower = '(?:' + rsLower + '|' + rsMisc + ')',
        rsMiscUpper = '(?:' + rsUpper + '|' + rsMisc + ')',
        rsOptContrLower = '(?:' + rsApos + '(?:d|ll|m|re|s|t|ve))?',
        rsOptContrUpper = '(?:' + rsApos + '(?:D|LL|M|RE|S|T|VE))?',
        reOptMod$1 = rsModifier$1 + '?',
        rsOptVar$1 = '[' + rsVarRange$2 + ']?',
        rsOptJoin$1 = '(?:' + rsZWJ$2 + '(?:' + [rsNonAstral$1, rsRegional$1, rsSurrPair$1].join('|') + ')' + rsOptVar$1 + reOptMod$1 + ')*',
        rsOrdLower = '\\d*(?:1st|2nd|3rd|(?![123])\\dth)(?=\\b|[A-Z_])',
        rsOrdUpper = '\\d*(?:1ST|2ND|3RD|(?![123])\\dTH)(?=\\b|[a-z_])',
        rsSeq$1 = rsOptVar$1 + reOptMod$1 + rsOptJoin$1,
        rsEmoji = '(?:' + [rsDingbat, rsRegional$1, rsSurrPair$1].join('|') + ')' + rsSeq$1;

    /** Used to match complex or compound words. */
    var reUnicodeWord = RegExp([
      rsUpper + '?' + rsLower + '+' + rsOptContrLower + '(?=' + [rsBreak, rsUpper, '$'].join('|') + ')',
      rsMiscUpper + '+' + rsOptContrUpper + '(?=' + [rsBreak, rsUpper + rsMiscLower, '$'].join('|') + ')',
      rsUpper + '?' + rsMiscLower + '+' + rsOptContrLower,
      rsUpper + '+' + rsOptContrUpper,
      rsOrdUpper,
      rsOrdLower,
      rsDigits,
      rsEmoji
    ].join('|'), 'g');

    /**
     * Splits a Unicode `string` into an array of its words.
     *
     * @private
     * @param {string} The string to inspect.
     * @returns {Array} Returns the words of `string`.
     */
    function unicodeWords(string) {
      return string.match(reUnicodeWord) || [];
    }

    var _unicodeWords = unicodeWords;

    /**
     * Splits `string` into an array of its words.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category String
     * @param {string} [string=''] The string to inspect.
     * @param {RegExp|string} [pattern] The pattern to match words.
     * @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
     * @returns {Array} Returns the words of `string`.
     * @example
     *
     * _.words('fred, barney, & pebbles');
     * // => ['fred', 'barney', 'pebbles']
     *
     * _.words('fred, barney, & pebbles', /[^, ]+/g);
     * // => ['fred', 'barney', '&', 'pebbles']
     */
    function words(string, pattern, guard) {
      string = toString_1(string);
      pattern = guard ? undefined : pattern;

      if (pattern === undefined) {
        return _hasUnicodeWord(string) ? _unicodeWords(string) : _asciiWords(string);
      }
      return string.match(pattern) || [];
    }

    var words_1 = words;

    /** Used to compose unicode capture groups. */
    var rsApos$1 = "['\u2019]";

    /** Used to match apostrophes. */
    var reApos = RegExp(rsApos$1, 'g');

    /**
     * Creates a function like `_.camelCase`.
     *
     * @private
     * @param {Function} callback The function to combine each word.
     * @returns {Function} Returns the new compounder function.
     */
    function createCompounder(callback) {
      return function(string) {
        return _arrayReduce(words_1(deburr_1(string).replace(reApos, '')), callback, '');
      };
    }

    var _createCompounder = createCompounder;

    /**
     * Converts `string` to
     * [snake case](https://en.wikipedia.org/wiki/Snake_case).
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category String
     * @param {string} [string=''] The string to convert.
     * @returns {string} Returns the snake cased string.
     * @example
     *
     * _.snakeCase('Foo Bar');
     * // => 'foo_bar'
     *
     * _.snakeCase('fooBar');
     * // => 'foo_bar'
     *
     * _.snakeCase('--FOO-BAR--');
     * // => 'foo_bar'
     */
    var snakeCase = _createCompounder(function(result, word, index) {
      return result + (index ? '_' : '') + word.toLowerCase();
    });

    var snakeCase_1 = snakeCase;

    /**
     * The base implementation of `_.slice` without an iteratee call guard.
     *
     * @private
     * @param {Array} array The array to slice.
     * @param {number} [start=0] The start position.
     * @param {number} [end=array.length] The end position.
     * @returns {Array} Returns the slice of `array`.
     */
    function baseSlice(array, start, end) {
      var index = -1,
          length = array.length;

      if (start < 0) {
        start = -start > length ? 0 : (length + start);
      }
      end = end > length ? length : end;
      if (end < 0) {
        end += length;
      }
      length = start > end ? 0 : ((end - start) >>> 0);
      start >>>= 0;

      var result = Array(length);
      while (++index < length) {
        result[index] = array[index + start];
      }
      return result;
    }

    var _baseSlice = baseSlice;

    /**
     * Casts `array` to a slice if it's needed.
     *
     * @private
     * @param {Array} array The array to inspect.
     * @param {number} start The start position.
     * @param {number} [end=array.length] The end position.
     * @returns {Array} Returns the cast slice.
     */
    function castSlice(array, start, end) {
      var length = array.length;
      end = end === undefined ? length : end;
      return (!start && end >= length) ? array : _baseSlice(array, start, end);
    }

    var _castSlice = castSlice;

    /**
     * Creates a function like `_.lowerFirst`.
     *
     * @private
     * @param {string} methodName The name of the `String` case method to use.
     * @returns {Function} Returns the new case function.
     */
    function createCaseFirst(methodName) {
      return function(string) {
        string = toString_1(string);

        var strSymbols = _hasUnicode(string)
          ? _stringToArray(string)
          : undefined;

        var chr = strSymbols
          ? strSymbols[0]
          : string.charAt(0);

        var trailing = strSymbols
          ? _castSlice(strSymbols, 1).join('')
          : string.slice(1);

        return chr[methodName]() + trailing;
      };
    }

    var _createCaseFirst = createCaseFirst;

    /**
     * Converts the first character of `string` to upper case.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category String
     * @param {string} [string=''] The string to convert.
     * @returns {string} Returns the converted string.
     * @example
     *
     * _.upperFirst('fred');
     * // => 'Fred'
     *
     * _.upperFirst('FRED');
     * // => 'FRED'
     */
    var upperFirst = _createCaseFirst('toUpperCase');

    var upperFirst_1 = upperFirst;

    /**
     * Converts the first character of `string` to upper case and the remaining
     * to lower case.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category String
     * @param {string} [string=''] The string to capitalize.
     * @returns {string} Returns the capitalized string.
     * @example
     *
     * _.capitalize('FRED');
     * // => 'Fred'
     */
    function capitalize(string) {
      return upperFirst_1(toString_1(string).toLowerCase());
    }

    var capitalize_1 = capitalize;

    /**
     * Converts `string` to [camel case](https://en.wikipedia.org/wiki/CamelCase).
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category String
     * @param {string} [string=''] The string to convert.
     * @returns {string} Returns the camel cased string.
     * @example
     *
     * _.camelCase('Foo Bar');
     * // => 'fooBar'
     *
     * _.camelCase('--foo-bar--');
     * // => 'fooBar'
     *
     * _.camelCase('__FOO_BAR__');
     * // => 'fooBar'
     */
    var camelCase = _createCompounder(function(result, word, index) {
      word = word.toLowerCase();
      return result + (index ? capitalize_1(word) : word);
    });

    var camelCase_1 = camelCase;

    /**
     * The opposite of `_.mapValues`; this method creates an object with the
     * same values as `object` and keys generated by running each own enumerable
     * string keyed property of `object` thru `iteratee`. The iteratee is invoked
     * with three arguments: (value, key, object).
     *
     * @static
     * @memberOf _
     * @since 3.8.0
     * @category Object
     * @param {Object} object The object to iterate over.
     * @param {Function} [iteratee=_.identity] The function invoked per iteration.
     * @returns {Object} Returns the new mapped object.
     * @see _.mapValues
     * @example
     *
     * _.mapKeys({ 'a': 1, 'b': 2 }, function(value, key) {
     *   return key + value;
     * });
     * // => { 'a1': 1, 'b2': 2 }
     */
    function mapKeys(object, iteratee) {
      var result = {};
      iteratee = _baseIteratee(iteratee);

      _baseForOwn(object, function(value, key, object) {
        _baseAssignValue(result, iteratee(value, key, object), value);
      });
      return result;
    }

    var mapKeys_1 = mapKeys;

    /**
     * Topological sorting function
     *
     * @param {Array} edges
     * @returns {Array}
     */

    var toposort_1 = function(edges) {
      return toposort(uniqueNodes(edges), edges)
    };

    var array = toposort;

    function toposort(nodes, edges) {
      var cursor = nodes.length
        , sorted = new Array(cursor)
        , visited = {}
        , i = cursor
        // Better data structures make algorithm much faster.
        , outgoingEdges = makeOutgoingEdges(edges)
        , nodesHash = makeNodesHash(nodes);

      // check for unknown nodes
      edges.forEach(function(edge) {
        if (!nodesHash.has(edge[0]) || !nodesHash.has(edge[1])) {
          throw new Error('Unknown node. There is an unknown node in the supplied edges.')
        }
      });

      while (i--) {
        if (!visited[i]) visit(nodes[i], i, new Set());
      }

      return sorted

      function visit(node, i, predecessors) {
        if(predecessors.has(node)) {
          var nodeRep;
          try {
            nodeRep = ", node was:" + JSON.stringify(node);
          } catch(e) {
            nodeRep = "";
          }
          throw new Error('Cyclic dependency' + nodeRep)
        }

        if (!nodesHash.has(node)) {
          throw new Error('Found unknown node. Make sure to provided all involved nodes. Unknown node: '+JSON.stringify(node))
        }

        if (visited[i]) return;
        visited[i] = true;

        var outgoing = outgoingEdges.get(node) || new Set();
        outgoing = Array.from(outgoing);

        if (i = outgoing.length) {
          predecessors.add(node);
          do {
            var child = outgoing[--i];
            visit(child, nodesHash.get(child), predecessors);
          } while (i)
          predecessors.delete(node);
        }

        sorted[--cursor] = node;
      }
    }

    function uniqueNodes(arr){
      var res = new Set();
      for (var i = 0, len = arr.length; i < len; i++) {
        var edge = arr[i];
        res.add(edge[0]);
        res.add(edge[1]);
      }
      return Array.from(res)
    }

    function makeOutgoingEdges(arr){
      var edges = new Map();
      for (var i = 0, len = arr.length; i < len; i++) {
        var edge = arr[i];
        if (!edges.has(edge[0])) edges.set(edge[0], new Set());
        if (!edges.has(edge[1])) edges.set(edge[1], new Set());
        edges.get(edge[0]).add(edge[1]);
      }
      return edges
    }

    function makeNodesHash(arr){
      var res = new Map();
      for (var i = 0, len = arr.length; i < len; i++) {
        res.set(arr[i], i);
      }
      return res
    }
    toposort_1.array = array;

    var sortFields_1 = createCommonjsModule(function (module, exports) {



    exports.__esModule = true;
    exports.default = sortFields;

    var _has = interopRequireDefault(has_1);

    var _toposort = interopRequireDefault(toposort_1);



    var _Reference = interopRequireDefault(Reference_1);

    var _isSchema = interopRequireDefault(isSchema);

    function sortFields(fields, excludes) {
      if (excludes === void 0) {
        excludes = [];
      }

      var edges = [],
          nodes = [];

      function addNode(depPath, key) {
        var node = (0, propertyExpr.split)(depPath)[0];
        if (!~nodes.indexOf(node)) nodes.push(node);
        if (!~excludes.indexOf(key + "-" + node)) edges.push([key, node]);
      }

      for (var key in fields) {
        if ((0, _has.default)(fields, key)) {
          var value = fields[key];
          if (!~nodes.indexOf(key)) nodes.push(key);
          if (_Reference.default.isRef(value) && value.isSibling) addNode(value.path, key);else if ((0, _isSchema.default)(value) && value._deps) value._deps.forEach(function (path) {
            return addNode(path, key);
          });
        }
      }

      return _toposort.default.array(nodes, edges).reverse();
    }

    module.exports = exports["default"];
    });

    unwrapExports(sortFields_1);

    var sortByKeyOrder_1 = createCommonjsModule(function (module, exports) {

    exports.__esModule = true;
    exports.default = sortByKeyOrder;

    function findIndex(arr, err) {
      var idx = Infinity;
      arr.some(function (key, ii) {
        if (err.path.indexOf(key) !== -1) {
          idx = ii;
          return true;
        }
      });
      return idx;
    }

    function sortByKeyOrder(fields) {
      var keys = Object.keys(fields);
      return function (a, b) {
        return findIndex(keys, a) - findIndex(keys, b);
      };
    }

    module.exports = exports["default"];
    });

    unwrapExports(sortByKeyOrder_1);

    var makePath_1 = createCommonjsModule(function (module, exports) {

    exports.__esModule = true;
    exports.default = makePath;

    function makePath(strings) {
      for (var _len = arguments.length, values = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        values[_key - 1] = arguments[_key];
      }

      var path = strings.reduce(function (str, next) {
        var value = values.shift();
        return str + (value == null ? '' : value) + next;
      });
      return path.replace(/^\./, '');
    }

    module.exports = exports["default"];
    });

    unwrapExports(makePath_1);

    var object = createCommonjsModule(function (module, exports) {





    exports.__esModule = true;
    exports.default = ObjectSchema;

    var _taggedTemplateLiteralLoose2 = interopRequireDefault(taggedTemplateLiteralLoose);

    var _extends2 = interopRequireDefault(_extends_1);

    var _has = interopRequireDefault(has_1);

    var _snakeCase2 = interopRequireDefault(snakeCase_1);

    var _camelCase2 = interopRequireDefault(camelCase_1);

    var _mapKeys = interopRequireDefault(mapKeys_1);

    var _mapValues = interopRequireDefault(mapValues_1);



    var _mixed = interopRequireDefault(mixed);



    var _sortFields = interopRequireDefault(sortFields_1);

    var _sortByKeyOrder = interopRequireDefault(sortByKeyOrder_1);

    var _inherits = interopRequireDefault(inherits_1);

    var _makePath = interopRequireDefault(makePath_1);

    var _runValidations = interopRequireWildcard(runValidations_1);

    function _templateObject2() {
      var data = (0, _taggedTemplateLiteralLoose2.default)(["", ".", ""]);

      _templateObject2 = function _templateObject2() {
        return data;
      };

      return data;
    }

    function _templateObject() {
      var data = (0, _taggedTemplateLiteralLoose2.default)(["", ".", ""]);

      _templateObject = function _templateObject() {
        return data;
      };

      return data;
    }

    var isObject = function isObject(obj) {
      return Object.prototype.toString.call(obj) === '[object Object]';
    };

    function unknown(ctx, value) {
      var known = Object.keys(ctx.fields);
      return Object.keys(value).filter(function (key) {
        return known.indexOf(key) === -1;
      });
    }

    function ObjectSchema(spec) {
      var _this2 = this;

      if (!(this instanceof ObjectSchema)) return new ObjectSchema(spec);

      _mixed.default.call(this, {
        type: 'object',
        default: function _default() {
          var _this = this;

          if (!this._nodes.length) return undefined;
          var dft = {};

          this._nodes.forEach(function (key) {
            dft[key] = _this.fields[key].default ? _this.fields[key].default() : undefined;
          });

          return dft;
        }
      });

      this.fields = Object.create(null);
      this._nodes = [];
      this._excludedEdges = [];
      this.withMutation(function () {
        _this2.transform(function coerce(value) {
          if (typeof value === 'string') {
            try {
              value = JSON.parse(value);
            } catch (err) {
              value = null;
            }
          }

          if (this.isType(value)) return value;
          return null;
        });

        if (spec) {
          _this2.shape(spec);
        }
      });
    }

    (0, _inherits.default)(ObjectSchema, _mixed.default, {
      _typeCheck: function _typeCheck(value) {
        return isObject(value) || typeof value === 'function';
      },
      _cast: function _cast(_value, options) {
        var _this3 = this;

        if (options === void 0) {
          options = {};
        }

        var value = _mixed.default.prototype._cast.call(this, _value, options); //should ignore nulls here


        if (value === undefined) return this.default();
        if (!this._typeCheck(value)) return value;
        var fields = this.fields;
        var strip = this._option('stripUnknown', options) === true;

        var props = this._nodes.concat(Object.keys(value).filter(function (v) {
          return _this3._nodes.indexOf(v) === -1;
        }));

        var intermediateValue = {}; // is filled during the transform below

        var innerOptions = (0, _extends2.default)({}, options, {
          parent: intermediateValue,
          __validating: false
        });
        var isChanged = false;
        props.forEach(function (prop) {
          var field = fields[prop];
          var exists = (0, _has.default)(value, prop);

          if (field) {
            var fieldValue;
            var strict = field._options && field._options.strict; // safe to mutate since this is fired in sequence

            innerOptions.path = (0, _makePath.default)(_templateObject(), options.path, prop);
            innerOptions.value = value[prop];
            field = field.resolve(innerOptions);

            if (field._strip === true) {
              isChanged = isChanged || prop in value;
              return;
            }

            fieldValue = !options.__validating || !strict ? field.cast(value[prop], innerOptions) : value[prop];
            if (fieldValue !== undefined) intermediateValue[prop] = fieldValue;
          } else if (exists && !strip) intermediateValue[prop] = value[prop];

          if (intermediateValue[prop] !== value[prop]) isChanged = true;
        });
        return isChanged ? intermediateValue : value;
      },
      _validate: function _validate(_value, opts) {
        var _this4 = this;

        if (opts === void 0) {
          opts = {};
        }

        var endEarly, recursive;
        var sync = opts.sync;
        var errors = [];
        var originalValue = opts.originalValue != null ? opts.originalValue : _value;
        endEarly = this._option('abortEarly', opts);
        recursive = this._option('recursive', opts);
        opts = (0, _extends2.default)({}, opts, {
          __validating: true,
          originalValue: originalValue
        });
        return _mixed.default.prototype._validate.call(this, _value, opts).catch((0, _runValidations.propagateErrors)(endEarly, errors)).then(function (value) {
          if (!recursive || !isObject(value)) {
            // only iterate though actual objects
            if (errors.length) throw errors[0];
            return value;
          }

          originalValue = originalValue || value;

          var validations = _this4._nodes.map(function (key) {
            var path = (0, _makePath.default)(_templateObject2(), opts.path, key);
            var field = _this4.fields[key];
            var innerOptions = (0, _extends2.default)({}, opts, {
              path: path,
              parent: value,
              originalValue: originalValue[key]
            });

            if (field && field.validate) {
              // inner fields are always strict:
              // 1. this isn't strict so the casting will also have cast inner values
              // 2. this is strict in which case the nested values weren't cast either
              innerOptions.strict = true;
              return field.validate(value[key], innerOptions);
            }

            return Promise.resolve(true);
          });

          return (0, _runValidations.default)({
            sync: sync,
            validations: validations,
            value: value,
            errors: errors,
            endEarly: endEarly,
            path: opts.path,
            sort: (0, _sortByKeyOrder.default)(_this4.fields)
          });
        });
      },
      concat: function concat(schema) {
        var next = _mixed.default.prototype.concat.call(this, schema);

        next._nodes = (0, _sortFields.default)(next.fields, next._excludedEdges);
        return next;
      },
      shape: function shape(schema, excludes) {
        if (excludes === void 0) {
          excludes = [];
        }

        var next = this.clone();
        var fields = (0, _extends2.default)(next.fields, schema);
        next.fields = fields;

        if (excludes.length) {
          if (!Array.isArray(excludes[0])) excludes = [excludes];
          var keys = excludes.map(function (_ref) {
            var first = _ref[0],
                second = _ref[1];
            return first + "-" + second;
          });
          next._excludedEdges = next._excludedEdges.concat(keys);
        }

        next._nodes = (0, _sortFields.default)(fields, next._excludedEdges);
        return next;
      },
      from: function from(_from, to, alias) {
        var fromGetter = (0, propertyExpr.getter)(_from, true);
        return this.transform(function (obj) {
          if (obj == null) return obj;
          var newObj = obj;

          if ((0, _has.default)(obj, _from)) {
            newObj = (0, _extends2.default)({}, obj);
            if (!alias) delete newObj[_from];
            newObj[to] = fromGetter(obj);
          }

          return newObj;
        });
      },
      noUnknown: function noUnknown(noAllow, message) {
        if (noAllow === void 0) {
          noAllow = true;
        }

        if (message === void 0) {
          message = locale.object.noUnknown;
        }

        if (typeof noAllow === 'string') {
          message = noAllow;
          noAllow = true;
        }

        var next = this.test({
          name: 'noUnknown',
          exclusive: true,
          message: message,
          test: function test(value) {
            return value == null || !noAllow || unknown(this.schema, value).length === 0;
          }
        });
        next._options.stripUnknown = noAllow;
        return next;
      },
      unknown: function unknown(allow, message) {
        if (allow === void 0) {
          allow = true;
        }

        if (message === void 0) {
          message = locale.object.noUnknown;
        }

        return this.noUnknown(!allow, message);
      },
      transformKeys: function transformKeys(fn) {
        return this.transform(function (obj) {
          return obj && (0, _mapKeys.default)(obj, function (_, key) {
            return fn(key);
          });
        });
      },
      camelCase: function camelCase() {
        return this.transformKeys(_camelCase2.default);
      },
      snakeCase: function snakeCase() {
        return this.transformKeys(_snakeCase2.default);
      },
      constantCase: function constantCase() {
        return this.transformKeys(function (key) {
          return (0, _snakeCase2.default)(key).toUpperCase();
        });
      },
      describe: function describe() {
        var base = _mixed.default.prototype.describe.call(this);

        base.fields = (0, _mapValues.default)(this.fields, function (value) {
          return value.describe();
        });
        return base;
      }
    });
    module.exports = exports["default"];
    });

    unwrapExports(object);

    var array$1 = createCommonjsModule(function (module, exports) {





    exports.__esModule = true;
    exports.default = void 0;

    var _extends2 = interopRequireDefault(_extends_1);

    var _taggedTemplateLiteralLoose2 = interopRequireDefault(taggedTemplateLiteralLoose);

    var _inherits = interopRequireDefault(inherits_1);

    var _isAbsent = interopRequireDefault(isAbsent);

    var _isSchema = interopRequireDefault(isSchema);

    var _makePath = interopRequireDefault(makePath_1);

    var _printValue = interopRequireDefault(printValue_1);

    var _mixed = interopRequireDefault(mixed);



    var _runValidations = interopRequireWildcard(runValidations_1);

    function _templateObject() {
      var data = (0, _taggedTemplateLiteralLoose2.default)(["", "[", "]"]);

      _templateObject = function _templateObject() {
        return data;
      };

      return data;
    }

    var _default = ArraySchema;
    exports.default = _default;

    function ArraySchema(type) {
      var _this = this;

      if (!(this instanceof ArraySchema)) return new ArraySchema(type);

      _mixed.default.call(this, {
        type: 'array'
      }); // `undefined` specifically means uninitialized, as opposed to
      // "no subtype"


      this._subType = undefined;
      this.withMutation(function () {
        _this.transform(function (values) {
          if (typeof values === 'string') try {
            values = JSON.parse(values);
          } catch (err) {
            values = null;
          }
          return this.isType(values) ? values : null;
        });

        if (type) _this.of(type);
      });
    }

    (0, _inherits.default)(ArraySchema, _mixed.default, {
      _typeCheck: function _typeCheck(v) {
        return Array.isArray(v);
      },
      _cast: function _cast(_value, _opts) {
        var _this2 = this;

        var value = _mixed.default.prototype._cast.call(this, _value, _opts); //should ignore nulls here


        if (!this._typeCheck(value) || !this._subType) return value;
        var isChanged = false;
        var castArray = value.map(function (v) {
          var castElement = _this2._subType.cast(v, _opts);

          if (castElement !== v) {
            isChanged = true;
          }

          return castElement;
        });
        return isChanged ? castArray : value;
      },
      _validate: function _validate(_value, options) {
        var _this3 = this;

        if (options === void 0) {
          options = {};
        }

        var errors = [];
        var sync = options.sync;
        var path = options.path;
        var subType = this._subType;

        var endEarly = this._option('abortEarly', options);

        var recursive = this._option('recursive', options);

        var originalValue = options.originalValue != null ? options.originalValue : _value;
        return _mixed.default.prototype._validate.call(this, _value, options).catch((0, _runValidations.propagateErrors)(endEarly, errors)).then(function (value) {
          if (!recursive || !subType || !_this3._typeCheck(value)) {
            if (errors.length) throw errors[0];
            return value;
          }

          originalValue = originalValue || value;
          var validations = value.map(function (item, idx) {
            var path = (0, _makePath.default)(_templateObject(), options.path, idx); // object._validate note for isStrict explanation

            var innerOptions = (0, _extends2.default)({}, options, {
              path: path,
              strict: true,
              parent: value,
              originalValue: originalValue[idx]
            });
            if (subType.validate) return subType.validate(item, innerOptions);
            return true;
          });
          return (0, _runValidations.default)({
            sync: sync,
            path: path,
            value: value,
            errors: errors,
            endEarly: endEarly,
            validations: validations
          });
        });
      },
      _isPresent: function _isPresent(value) {
        return _mixed.default.prototype._cast.call(this, value) && value.length > 0;
      },
      of: function of(schema) {
        var next = this.clone();
        if (schema !== false && !(0, _isSchema.default)(schema)) throw new TypeError('`array.of()` sub-schema must be a valid yup schema, or `false` to negate a current sub-schema. ' + 'not: ' + (0, _printValue.default)(schema));
        next._subType = schema;
        return next;
      },
      min: function min(_min, message) {
        message = message || locale.array.min;
        return this.test({
          message: message,
          name: 'min',
          exclusive: true,
          params: {
            min: _min
          },
          test: function test(value) {
            return (0, _isAbsent.default)(value) || value.length >= this.resolve(_min);
          }
        });
      },
      max: function max(_max, message) {
        message = message || locale.array.max;
        return this.test({
          message: message,
          name: 'max',
          exclusive: true,
          params: {
            max: _max
          },
          test: function test(value) {
            return (0, _isAbsent.default)(value) || value.length <= this.resolve(_max);
          }
        });
      },
      ensure: function ensure() {
        var _this4 = this;

        return this.default(function () {
          return [];
        }).transform(function (val) {
          if (_this4.isType(val)) return val;
          return val === null ? [] : [].concat(val);
        });
      },
      compact: function compact(rejector) {
        var reject = !rejector ? function (v) {
          return !!v;
        } : function (v, i, a) {
          return !rejector(v, i, a);
        };
        return this.transform(function (values) {
          return values != null ? values.filter(reject) : values;
        });
      },
      describe: function describe() {
        var base = _mixed.default.prototype.describe.call(this);

        if (this._subType) base.innerType = this._subType.describe();
        return base;
      }
    });
    module.exports = exports["default"];
    });

    unwrapExports(array$1);

    var Lazy_1 = createCommonjsModule(function (module, exports) {



    exports.__esModule = true;
    exports.default = void 0;

    var _isSchema = interopRequireDefault(isSchema);

    var Lazy =
    /*#__PURE__*/
    function () {
      function Lazy(mapFn) {
        this._resolve = function (value, options) {
          var schema = mapFn(value, options);
          if (!(0, _isSchema.default)(schema)) throw new TypeError('lazy() functions must return a valid schema');
          return schema.resolve(options);
        };
      }

      var _proto = Lazy.prototype;

      _proto.resolve = function resolve(options) {
        return this._resolve(options.value, options);
      };

      _proto.cast = function cast(value, options) {
        return this._resolve(value, options).cast(value, options);
      };

      _proto.validate = function validate(value, options) {
        return this._resolve(value, options).validate(value, options);
      };

      _proto.validateSync = function validateSync(value, options) {
        return this._resolve(value, options).validateSync(value, options);
      };

      _proto.validateAt = function validateAt(path, value, options) {
        return this._resolve(value, options).validateAt(path, value, options);
      };

      _proto.validateSyncAt = function validateSyncAt(path, value, options) {
        return this._resolve(value, options).validateSyncAt(path, value, options);
      };

      return Lazy;
    }();

    Lazy.prototype.__isYupSchema__ = true;
    var _default = Lazy;
    exports.default = _default;
    module.exports = exports["default"];
    });

    unwrapExports(Lazy_1);

    var setLocale_1 = createCommonjsModule(function (module, exports) {



    exports.__esModule = true;
    exports.default = setLocale;

    var _locale = interopRequireDefault(locale);

    function setLocale(custom) {
      Object.keys(custom).forEach(function (type) {
        Object.keys(custom[type]).forEach(function (method) {
          _locale.default[type][method] = custom[type][method];
        });
      });
    }

    module.exports = exports["default"];
    });

    unwrapExports(setLocale_1);

    var lib = createCommonjsModule(function (module, exports) {



    exports.__esModule = true;
    exports.addMethod = addMethod;
    exports.lazy = exports.ref = exports.boolean = void 0;

    var _mixed = interopRequireDefault(mixed);

    exports.mixed = _mixed.default;

    var _boolean = interopRequireDefault(boolean_1);

    exports.bool = _boolean.default;

    var _string = interopRequireDefault(string);

    exports.string = _string.default;

    var _number = interopRequireDefault(number);

    exports.number = _number.default;

    var _date = interopRequireDefault(date);

    exports.date = _date.default;

    var _object = interopRequireDefault(object);

    exports.object = _object.default;

    var _array = interopRequireDefault(array$1);

    exports.array = _array.default;

    var _Reference = interopRequireDefault(Reference_1);

    var _Lazy = interopRequireDefault(Lazy_1);

    var _ValidationError = interopRequireDefault(ValidationError_1);

    exports.ValidationError = _ValidationError.default;

    var _reach = interopRequireDefault(reach_1);

    exports.reach = _reach.default;

    var _isSchema = interopRequireDefault(isSchema);

    exports.isSchema = _isSchema.default;

    var _setLocale = interopRequireDefault(setLocale_1);

    exports.setLocale = _setLocale.default;
    var boolean = _boolean.default;
    exports.boolean = boolean;

    var ref = function ref(key, options) {
      return new _Reference.default(key, options);
    };

    exports.ref = ref;

    var lazy = function lazy(fn) {
      return new _Lazy.default(fn);
    };

    exports.lazy = lazy;

    function addMethod(schemaType, name, fn) {
      if (!schemaType || !(0, _isSchema.default)(schemaType.prototype)) throw new TypeError('You must provide a yup schema constructor function');
      if (typeof name !== 'string') throw new TypeError('A Method name must be provided');
      if (typeof fn !== 'function') throw new TypeError('Method function must be provided');
      schemaType.prototype[name] = fn;
    }
    });

    var yup = unwrapExports(lib);
    var lib_1 = lib.addMethod;
    var lib_2 = lib.lazy;
    var lib_3 = lib.ref;
    var lib_4 = lib.mixed;
    var lib_5 = lib.bool;
    var lib_6 = lib.string;
    var lib_7 = lib.number;
    var lib_8 = lib.date;
    var lib_9 = lib.object;
    var lib_10 = lib.array;
    var lib_11 = lib.ValidationError;
    var lib_12 = lib.reach;
    var lib_13 = lib.isSchema;
    var lib_14 = lib.setLocale;

    const source$1 = `
  <script>
    import { createForm } from "svelte-forms-lib";
    import yup from "yup";

    const { form, errors, state, handleChange, handleSubmit } = createForm({
      initialValues: {
        name: "",
        email: ""
      },
      validationSchema: yup.object().shape({
        name: yup.string().required(),
        email: yup
          .string()
          .email()
          .required()
      }),
      onSubmit: values => {
        alert(JSON.stringify(values));
      }
    });
  </script>

  <form on:submit={handleSubmit}>
    <label for="name">name</label>
    <input
      id="name"
      name="name"
      on:change={handleChange}
      on:blur={handleChange}
      bind:value={$form.name}
    />
    {#if $errors.name}
      <small>{$errors.name}</small>
    {/if}

    <label for="email">email</label>
    <input
      id="email"
      name="email"
      on:change={handleChange}
      on:blur={handleChange}
      bind:value={$form.email}
    />
    {#if $errors.email}
      <small>{$errors.email}</small>
    {/if}

    <button type="submit">submit</button>
  </form>
`;

    const highlight$1 = prism.highlight(source$1, prism.languages.svelte, "svelte");

    /* docs-src/examples/Yup/component.svelte generated by Svelte v3.10.0 */

    // (39:2) {#if $errors.name}
    function create_if_block_1(ctx) {
    	var small, t_value = ctx.$errors.name + "", t;

    	return {
    		c() {
    			small = element("small");
    			t = text(t_value);
    		},

    		m(target, anchor) {
    			insert(target, small, anchor);
    			append(small, t);
    		},

    		p(changed, ctx) {
    			if ((changed.$errors) && t_value !== (t_value = ctx.$errors.name + "")) {
    				set_data(t, t_value);
    			}
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(small);
    			}
    		}
    	};
    }

    // (50:2) {#if $errors.email}
    function create_if_block(ctx) {
    	var small, t_value = ctx.$errors.email + "", t;

    	return {
    		c() {
    			small = element("small");
    			t = text(t_value);
    		},

    		m(target, anchor) {
    			insert(target, small, anchor);
    			append(small, t);
    		},

    		p(changed, ctx) {
    			if ((changed.$errors) && t_value !== (t_value = ctx.$errors.email + "")) {
    				set_data(t, t_value);
    			}
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(small);
    			}
    		}
    	};
    }

    function create_fragment$2(ctx) {
    	var h1, t1, hr, t2, p, t6, form_1, label0, t8, input0, t9, t10, label1, t12, input1, t13, t14, button, t16, current, dispose;

    	var if_block0 = (ctx.$errors.name) && create_if_block_1(ctx);

    	var if_block1 = (ctx.$errors.email) && create_if_block(ctx);

    	var code = new Code({
    		props: {
    		source: source$1,
    		highlight: highlight$1
    	}
    	});

    	return {
    		c() {
    			h1 = element("h1");
    			h1.textContent = "Yup validation";
    			t1 = space();
    			hr = element("hr");
    			t2 = space();
    			p = element("p");
    			p.innerHTML = `
			  Example using <a href="https://github.com/jquense/yup" target="_blank">Yup</a> as validation. Validation happens when input changes and upon form submission.
			`;
    			t6 = space();
    			form_1 = element("form");
    			label0 = element("label");
    			label0.textContent = "name";
    			t8 = space();
    			input0 = element("input");
    			t9 = space();
    			if (if_block0) if_block0.c();
    			t10 = space();
    			label1 = element("label");
    			label1.textContent = "email";
    			t12 = space();
    			input1 = element("input");
    			t13 = space();
    			if (if_block1) if_block1.c();
    			t14 = space();
    			button = element("button");
    			button.textContent = "submit";
    			t16 = space();
    			code.$$.fragment.c();
    			attr(label0, "for", "name");
    			attr(input0, "id", "name");
    			attr(input0, "name", "name");
    			attr(label1, "for", "email");
    			attr(input1, "id", "email");
    			attr(input1, "name", "email");
    			attr(button, "type", "submit");

    			dispose = [
    				listen(input0, "input", ctx.input0_input_handler),
    				listen(input0, "change", ctx.handleChange),
    				listen(input0, "blur", ctx.handleChange),
    				listen(input1, "input", ctx.input1_input_handler),
    				listen(input1, "change", ctx.handleChange),
    				listen(input1, "blur", ctx.handleChange),
    				listen(form_1, "submit", ctx.handleSubmit)
    			];
    		},

    		m(target, anchor) {
    			insert(target, h1, anchor);
    			insert(target, t1, anchor);
    			insert(target, hr, anchor);
    			insert(target, t2, anchor);
    			insert(target, p, anchor);
    			insert(target, t6, anchor);
    			insert(target, form_1, anchor);
    			append(form_1, label0);
    			append(form_1, t8);
    			append(form_1, input0);

    			set_input_value(input0, ctx.$form.name);

    			append(form_1, t9);
    			if (if_block0) if_block0.m(form_1, null);
    			append(form_1, t10);
    			append(form_1, label1);
    			append(form_1, t12);
    			append(form_1, input1);

    			set_input_value(input1, ctx.$form.email);

    			append(form_1, t13);
    			if (if_block1) if_block1.m(form_1, null);
    			append(form_1, t14);
    			append(form_1, button);
    			insert(target, t16, anchor);
    			mount_component(code, target, anchor);
    			current = true;
    		},

    		p(changed, ctx) {
    			if (changed.$form && (input0.value !== ctx.$form.name)) set_input_value(input0, ctx.$form.name);

    			if (ctx.$errors.name) {
    				if (if_block0) {
    					if_block0.p(changed, ctx);
    				} else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					if_block0.m(form_1, t10);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (changed.$form && (input1.value !== ctx.$form.email)) set_input_value(input1, ctx.$form.email);

    			if (ctx.$errors.email) {
    				if (if_block1) {
    					if_block1.p(changed, ctx);
    				} else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					if_block1.m(form_1, t14);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			var code_changes = {};
    			if (changed.source) code_changes.source = source$1;
    			if (changed.highlight) code_changes.highlight = highlight$1;
    			code.$set(code_changes);
    		},

    		i(local) {
    			if (current) return;
    			transition_in(code.$$.fragment, local);

    			current = true;
    		},

    		o(local) {
    			transition_out(code.$$.fragment, local);
    			current = false;
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(h1);
    				detach(t1);
    				detach(hr);
    				detach(t2);
    				detach(p);
    				detach(t6);
    				detach(form_1);
    			}

    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();

    			if (detaching) {
    				detach(t16);
    			}

    			destroy_component(code, detaching);

    			run_all(dispose);
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $form, $errors;

    	

      const { form, errors, state, handleChange, handleSubmit } = dist_4({
        initialValues: {
          name: "",
          email: ""
        },
        validationSchema: yup.object().shape({
          name: yup.string().required(),
          email: yup
            .string()
            .email()
            .required()
        }),
        onSubmit: values => {
          alert(JSON.stringify(values, null, 2));
        }
      }); component_subscribe($$self, form, $$value => { $form = $$value; $$invalidate('$form', $form); }); component_subscribe($$self, errors, $$value => { $errors = $$value; $$invalidate('$errors', $errors); });

    	function input0_input_handler() {
    		form.update($$value => ($$value.name = this.value, $$value));
    	}

    	function input1_input_handler() {
    		form.update($$value => ($$value.email = this.value, $$value));
    	}

    	return {
    		form,
    		errors,
    		handleChange,
    		handleSubmit,
    		$form,
    		$errors,
    		input0_input_handler,
    		input1_input_handler
    	};
    }

    class Component$1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, []);
    	}
    }

    const source$2 = `
  <script>
    import { createForm } from "svelte-forms-lib";
    import yup from "yup";

    const { form, errors, state, handleChange, handleSubmit } = createForm({
      initialValues: {
        name: "",
        email: ""
      },
      validate: values => {
        let errs = {};
        if (values.name === "") {
          errs["name"] = "custom validation: name is required";
        }
        if (values.email === "") {
          errs["email"] = "custom validation: email is required";
        }
        return errs;
      },
      onSubmit: values => {
        alert(JSON.stringify(values));
      }
    });
  </script>

  <form on:submit={handleSubmit}>
    <label for="name">name</label>
    <input
      id="name"
      name="name"
      on:change={handleChange}
      bind:value={$form.name}
    />
    {#if $errors.name}
      <small>{$errors.name}</small>
    {/if}
    <label for="email">email</label>
    <input
      id="email"
      name="email"
      on:change={handleChange}
      bind:value={$form.email}
    />
    {#if $errors.email}
      <small>{$errors.email}</small>
    {/if}
    <button type="submit">submit</button>
  </form>
`;

    const highlight$2 = prism.highlight(source$2, prism.languages.svelte, "svelte");

    /* docs-src/examples/Custom/component.svelte generated by Svelte v3.10.0 */

    // (38:2) {#if $errors.name}
    function create_if_block_1$1(ctx) {
    	var small, t_value = ctx.$errors.name + "", t;

    	return {
    		c() {
    			small = element("small");
    			t = text(t_value);
    		},

    		m(target, anchor) {
    			insert(target, small, anchor);
    			append(small, t);
    		},

    		p(changed, ctx) {
    			if ((changed.$errors) && t_value !== (t_value = ctx.$errors.name + "")) {
    				set_data(t, t_value);
    			}
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(small);
    			}
    		}
    	};
    }

    // (44:2) {#if $errors.email}
    function create_if_block$1(ctx) {
    	var small, t_value = ctx.$errors.email + "", t;

    	return {
    		c() {
    			small = element("small");
    			t = text(t_value);
    		},

    		m(target, anchor) {
    			insert(target, small, anchor);
    			append(small, t);
    		},

    		p(changed, ctx) {
    			if ((changed.$errors) && t_value !== (t_value = ctx.$errors.email + "")) {
    				set_data(t, t_value);
    			}
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(small);
    			}
    		}
    	};
    }

    function create_fragment$3(ctx) {
    	var h1, t1, hr, t2, p, t4, form_1, label0, t6, input0, t7, t8, label1, t10, input1, t11, t12, button, t14, current, dispose;

    	var if_block0 = (ctx.$errors.name) && create_if_block_1$1(ctx);

    	var if_block1 = (ctx.$errors.email) && create_if_block$1(ctx);

    	var code = new Code({
    		props: {
    		source: source$2,
    		highlight: highlight$2
    	}
    	});

    	return {
    		c() {
    			h1 = element("h1");
    			h1.textContent = "Custom validation";
    			t1 = space();
    			hr = element("hr");
    			t2 = space();
    			p = element("p");
    			p.textContent = "Example using Yup as validation. The validate function allows for custom validation. Validation is\n  only fired upon submission. Field validation coming soon.";
    			t4 = space();
    			form_1 = element("form");
    			label0 = element("label");
    			label0.textContent = "name";
    			t6 = space();
    			input0 = element("input");
    			t7 = space();
    			if (if_block0) if_block0.c();
    			t8 = space();
    			label1 = element("label");
    			label1.textContent = "email";
    			t10 = space();
    			input1 = element("input");
    			t11 = space();
    			if (if_block1) if_block1.c();
    			t12 = space();
    			button = element("button");
    			button.textContent = "submit";
    			t14 = space();
    			code.$$.fragment.c();
    			attr(label0, "for", "name");
    			attr(input0, "id", "name");
    			attr(input0, "name", "name");
    			attr(label1, "for", "email");
    			attr(input1, "id", "email");
    			attr(input1, "name", "email");
    			attr(button, "type", "submit");

    			dispose = [
    				listen(input0, "input", ctx.input0_input_handler),
    				listen(input0, "change", ctx.handleChange),
    				listen(input1, "input", ctx.input1_input_handler),
    				listen(input1, "change", ctx.handleChange),
    				listen(form_1, "submit", ctx.handleSubmit)
    			];
    		},

    		m(target, anchor) {
    			insert(target, h1, anchor);
    			insert(target, t1, anchor);
    			insert(target, hr, anchor);
    			insert(target, t2, anchor);
    			insert(target, p, anchor);
    			insert(target, t4, anchor);
    			insert(target, form_1, anchor);
    			append(form_1, label0);
    			append(form_1, t6);
    			append(form_1, input0);

    			set_input_value(input0, ctx.$form.name);

    			append(form_1, t7);
    			if (if_block0) if_block0.m(form_1, null);
    			append(form_1, t8);
    			append(form_1, label1);
    			append(form_1, t10);
    			append(form_1, input1);

    			set_input_value(input1, ctx.$form.email);

    			append(form_1, t11);
    			if (if_block1) if_block1.m(form_1, null);
    			append(form_1, t12);
    			append(form_1, button);
    			insert(target, t14, anchor);
    			mount_component(code, target, anchor);
    			current = true;
    		},

    		p(changed, ctx) {
    			if (changed.$form && (input0.value !== ctx.$form.name)) set_input_value(input0, ctx.$form.name);

    			if (ctx.$errors.name) {
    				if (if_block0) {
    					if_block0.p(changed, ctx);
    				} else {
    					if_block0 = create_if_block_1$1(ctx);
    					if_block0.c();
    					if_block0.m(form_1, t8);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (changed.$form && (input1.value !== ctx.$form.email)) set_input_value(input1, ctx.$form.email);

    			if (ctx.$errors.email) {
    				if (if_block1) {
    					if_block1.p(changed, ctx);
    				} else {
    					if_block1 = create_if_block$1(ctx);
    					if_block1.c();
    					if_block1.m(form_1, t12);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			var code_changes = {};
    			if (changed.source) code_changes.source = source$2;
    			if (changed.highlight) code_changes.highlight = highlight$2;
    			code.$set(code_changes);
    		},

    		i(local) {
    			if (current) return;
    			transition_in(code.$$.fragment, local);

    			current = true;
    		},

    		o(local) {
    			transition_out(code.$$.fragment, local);
    			current = false;
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(h1);
    				detach(t1);
    				detach(hr);
    				detach(t2);
    				detach(p);
    				detach(t4);
    				detach(form_1);
    			}

    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();

    			if (detaching) {
    				detach(t14);
    			}

    			destroy_component(code, detaching);

    			run_all(dispose);
    		}
    	};
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $form, $errors;

    	

      const { form, errors, state, handleChange, handleSubmit } = dist_4({
        initialValues: {
          name: "",
          email: ""
        },
        validate: values => {
          let errs = {};
          if (values.name === "") {
            errs["name"] = "custom validation: name is required";
          }
          if (values.email === "") {
            errs["email"] = "custom validation: email is required";
          }
          return errs;
        },
        onSubmit: values => {
          alert(JSON.stringify(values, null, 2));
        }
      }); component_subscribe($$self, form, $$value => { $form = $$value; $$invalidate('$form', $form); }); component_subscribe($$self, errors, $$value => { $errors = $$value; $$invalidate('$errors', $errors); });

    	function input0_input_handler() {
    		form.update($$value => ($$value.name = this.value, $$value));
    	}

    	function input1_input_handler() {
    		form.update($$value => ($$value.email = this.value, $$value));
    	}

    	return {
    		form,
    		errors,
    		handleChange,
    		handleSubmit,
    		$form,
    		$errors,
    		input0_input_handler,
    		input1_input_handler
    	};
    }

    class Component$2 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, []);
    	}
    }

    const source$3 = `
  <script>
    import { createForm } from "svelte-forms-lib";
    import yup from "yup";

    const {
      form,
      errors,
      state,
      handleChange,
      handleSubmit,
      handleReset
    } = createForm({
      initialValues: {
        users: [
          {
            name: "",
            email: ""
          }
        ]
      },
      validationSchema: yup.object().shape({
        users: yup.array().of(
          yup.object().shape({
            name: yup.string().required(),
            email: yup
              .string()
              .email()
              .required()
          })
        )
      }),
      onSubmit: values => {
        alert(JSON.stringify(values));
      }
    });

    const add = () => {
      $form.users = $form.users.concat({ name: "", email: "" });
      $errors.users = $errors.users.concat({ name: "", email: "" });
    };

    const remove = i => () => {
      $form.users = $form.users.filter((u, j) => j !== i);
      $errors.users = $errors.users.filter((u, j) => j !== i);
    };
  </script>

  <style>
    .error {
      display: block;
      color: red;
    }
    .form-group {
      display: flex;
      align-items: baseline;
    }
    .button-group {
      display: flex;
    }
    button ~ button {
      margin-left: 15px;
    }
  </style>

  <form>
    <h1>Add users</h1>

    {#each $form.users as user, j}
      <div class="form-group">
        <div>
          <input
            name={\`users[\${j}].name\`}
            placeholder="name"
            on:change={handleChange}
            on:blur={handleChange}
            bind:value={$form.users[j].name}
          />
          {#if $errors.users[j].name}
            <small class="error">{$errors.users[j].name}</small>
          {/if}
        </div>

        <div>
          <input
            placeholder="email"
            name={\`users[\${j}].email\`}
            on:change={handleChange}
            on:blur={handleChange}
            bind:value={$form.users[j].email}
          />
          {#if $errors.users[j].email}
            <small class="error">{$errors.users[j].email}</small>
          {/if}
        </div>

        {#if j === $form.users.length - 1}
          <button type="button" on:click={add}>+</button>
        {/if}
        {#if $form.users.length !== 1}
          <button type="button" on:click={remove(j)}>-</button>
        {/if}
      </div>
    {/each}

    <div class="button-group">
      <button type="button" on:click={handleSubmit}>submit</button>
      <button type="button" on:click={handleReset}>reset</button>
    </div>
  </form>
`;

    const highlight$3 = prism.highlight(source$3, prism.languages.svelte, "svelte");

    /* docs-src/examples/Array/component.svelte generated by Svelte v3.10.0 */

    function add_css$1() {
    	var style = element("style");
    	style.id = 'svelte-19gnbq6-style';
    	style.textContent = ".form-group.svelte-19gnbq6{display:flex;align-items:baseline}.form-title.svelte-19gnbq6{font-size:18px;font-weight:600;margin:22px 0 0}.push-right.svelte-19gnbq6{margin-right:15px}.flex.svelte-19gnbq6{display:flex}button.svelte-19gnbq6{padding:8px 24px;min-width:auto}";
    	append(document.head, style);
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.user = list[i];
    	child_ctx.j = i;
    	return child_ctx;
    }

    // (85:8) {#if $errors.users[j].name}
    function create_if_block_3(ctx) {
    	var small, t_value = ctx.$errors.users[ctx.j].name + "", t;

    	return {
    		c() {
    			small = element("small");
    			t = text(t_value);
    		},

    		m(target, anchor) {
    			insert(target, small, anchor);
    			append(small, t);
    		},

    		p(changed, ctx) {
    			if ((changed.$errors) && t_value !== (t_value = ctx.$errors.users[ctx.j].name + "")) {
    				set_data(t, t_value);
    			}
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(small);
    			}
    		}
    	};
    }

    // (97:8) {#if $errors.users[j].email}
    function create_if_block_2(ctx) {
    	var small, t_value = ctx.$errors.users[ctx.j].email + "", t;

    	return {
    		c() {
    			small = element("small");
    			t = text(t_value);
    		},

    		m(target, anchor) {
    			insert(target, small, anchor);
    			append(small, t);
    		},

    		p(changed, ctx) {
    			if ((changed.$errors) && t_value !== (t_value = ctx.$errors.users[ctx.j].email + "")) {
    				set_data(t, t_value);
    			}
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(small);
    			}
    		}
    	};
    }

    // (102:6) {#if j === $form.users.length - 1}
    function create_if_block_1$2(ctx) {
    	var button, dispose;

    	return {
    		c() {
    			button = element("button");
    			button.textContent = "+";
    			attr(button, "type", "button");
    			attr(button, "class", "push-right svelte-19gnbq6");
    			dispose = listen(button, "click", ctx.add);
    		},

    		m(target, anchor) {
    			insert(target, button, anchor);
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(button);
    			}

    			dispose();
    		}
    	};
    }

    // (105:6) {#if $form.users.length !== 1}
    function create_if_block$2(ctx) {
    	var button, dispose;

    	return {
    		c() {
    			button = element("button");
    			button.textContent = "-";
    			attr(button, "type", "button");
    			attr(button, "class", "svelte-19gnbq6");
    			dispose = listen(button, "click", ctx.remove(ctx.j));
    		},

    		m(target, anchor) {
    			insert(target, button, anchor);
    		},

    		p(changed, new_ctx) {
    			ctx = new_ctx;
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(button);
    			}

    			dispose();
    		}
    	};
    }

    // (76:2) {#each $form.users as user, j}
    function create_each_block(ctx) {
    	var div2, div0, input0, t0, t1, div1, input1, t2, t3, t4, dispose;

    	function input0_input_handler() {
    		ctx.input0_input_handler.call(input0, ctx);
    	}

    	var if_block0 = (ctx.$errors.users[ctx.j].name) && create_if_block_3(ctx);

    	function input1_input_handler() {
    		ctx.input1_input_handler.call(input1, ctx);
    	}

    	var if_block1 = (ctx.$errors.users[ctx.j].email) && create_if_block_2(ctx);

    	var if_block2 = (ctx.j === ctx.$form.users.length - 1) && create_if_block_1$2(ctx);

    	var if_block3 = (ctx.$form.users.length !== 1) && create_if_block$2(ctx);

    	return {
    		c() {
    			div2 = element("div");
    			div0 = element("div");
    			input0 = element("input");
    			t0 = space();
    			if (if_block0) if_block0.c();
    			t1 = space();
    			div1 = element("div");
    			input1 = element("input");
    			t2 = space();
    			if (if_block1) if_block1.c();
    			t3 = space();
    			if (if_block2) if_block2.c();
    			t4 = space();
    			if (if_block3) if_block3.c();
    			attr(input0, "name", `users[${ctx.j}].name`);
    			attr(input0, "placeholder", "name");
    			attr(div0, "class", "push-right svelte-19gnbq6");
    			attr(input1, "placeholder", "email");
    			attr(input1, "name", `users[${ctx.j}].email`);
    			attr(div1, "class", "push-right svelte-19gnbq6");
    			attr(div2, "class", "form-group svelte-19gnbq6");

    			dispose = [
    				listen(input0, "input", input0_input_handler),
    				listen(input0, "change", ctx.handleChange),
    				listen(input0, "blur", ctx.handleChange),
    				listen(input1, "input", input1_input_handler),
    				listen(input1, "change", ctx.handleChange),
    				listen(input1, "blur", ctx.handleChange)
    			];
    		},

    		m(target, anchor) {
    			insert(target, div2, anchor);
    			append(div2, div0);
    			append(div0, input0);

    			set_input_value(input0, ctx.$form.users[ctx.j].name);

    			append(div0, t0);
    			if (if_block0) if_block0.m(div0, null);
    			append(div2, t1);
    			append(div2, div1);
    			append(div1, input1);

    			set_input_value(input1, ctx.$form.users[ctx.j].email);

    			append(div1, t2);
    			if (if_block1) if_block1.m(div1, null);
    			append(div2, t3);
    			if (if_block2) if_block2.m(div2, null);
    			append(div2, t4);
    			if (if_block3) if_block3.m(div2, null);
    		},

    		p(changed, new_ctx) {
    			ctx = new_ctx;
    			if (changed.$form && (input0.value !== ctx.$form.users[ctx.j].name)) set_input_value(input0, ctx.$form.users[ctx.j].name);

    			if (ctx.$errors.users[ctx.j].name) {
    				if (if_block0) {
    					if_block0.p(changed, ctx);
    				} else {
    					if_block0 = create_if_block_3(ctx);
    					if_block0.c();
    					if_block0.m(div0, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (changed.$form && (input1.value !== ctx.$form.users[ctx.j].email)) set_input_value(input1, ctx.$form.users[ctx.j].email);

    			if (ctx.$errors.users[ctx.j].email) {
    				if (if_block1) {
    					if_block1.p(changed, ctx);
    				} else {
    					if_block1 = create_if_block_2(ctx);
    					if_block1.c();
    					if_block1.m(div1, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (ctx.j === ctx.$form.users.length - 1) {
    				if (!if_block2) {
    					if_block2 = create_if_block_1$2(ctx);
    					if_block2.c();
    					if_block2.m(div2, t4);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (ctx.$form.users.length !== 1) {
    				if (!if_block3) {
    					if_block3 = create_if_block$2(ctx);
    					if_block3.c();
    					if_block3.m(div2, null);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(div2);
    			}

    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			run_all(dispose);
    		}
    	};
    }

    function create_fragment$4(ctx) {
    	var h10, t1, hr, t2, p, t5, form_1, h11, t7, t8, div, button0, t10, button1, t12, current, dispose;

    	let each_value = ctx.$form.users;

    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	var code_1 = new Code({
    		props: {
    		source: source$3,
    		highlight: highlight$3
    	}
    	});

    	return {
    		c() {
    			h10 = element("h1");
    			h10.textContent = "Form array";
    			t1 = space();
    			hr = element("hr");
    			t2 = space();
    			p = element("p");
    			p.innerHTML = `
			  Example using dynamic form with adding and removing of new fields or objects. Validation and
			  values are persisted. Support for nested field targeting i.e.
			  <code>\$forms.users[i].name</code>`;
    			t5 = space();
    			form_1 = element("form");
    			h11 = element("h1");
    			h11.textContent = "Add users";
    			t7 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t8 = space();
    			div = element("div");
    			button0 = element("button");
    			button0.textContent = "submit";
    			t10 = space();
    			button1 = element("button");
    			button1.textContent = "reset";
    			t12 = space();
    			code_1.$$.fragment.c();
    			attr(h11, "class", "form-title svelte-19gnbq6");
    			attr(button0, "type", "button");
    			attr(button0, "class", "push-right svelte-19gnbq6");
    			attr(button1, "type", "button");
    			attr(button1, "class", "svelte-19gnbq6");
    			attr(div, "class", "flex svelte-19gnbq6");

    			dispose = [
    				listen(button0, "click", ctx.handleSubmit),
    				listen(button1, "click", ctx.handleReset)
    			];
    		},

    		m(target, anchor) {
    			insert(target, h10, anchor);
    			insert(target, t1, anchor);
    			insert(target, hr, anchor);
    			insert(target, t2, anchor);
    			insert(target, p, anchor);
    			insert(target, t5, anchor);
    			insert(target, form_1, anchor);
    			append(form_1, h11);
    			append(form_1, t7);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(form_1, null);
    			}

    			append(form_1, t8);
    			append(form_1, div);
    			append(div, button0);
    			append(div, t10);
    			append(div, button1);
    			insert(target, t12, anchor);
    			mount_component(code_1, target, anchor);
    			current = true;
    		},

    		p(changed, ctx) {
    			if (changed.$form || changed.$errors) {
    				each_value = ctx.$form.users;

    				let i;
    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(form_1, t8);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}
    				each_blocks.length = each_value.length;
    			}

    			var code_1_changes = {};
    			if (changed.source) code_1_changes.source = source$3;
    			if (changed.highlight) code_1_changes.highlight = highlight$3;
    			code_1.$set(code_1_changes);
    		},

    		i(local) {
    			if (current) return;
    			transition_in(code_1.$$.fragment, local);

    			current = true;
    		},

    		o(local) {
    			transition_out(code_1.$$.fragment, local);
    			current = false;
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(h10);
    				detach(t1);
    				detach(hr);
    				detach(t2);
    				detach(p);
    				detach(t5);
    				detach(form_1);
    			}

    			destroy_each(each_blocks, detaching);

    			if (detaching) {
    				detach(t12);
    			}

    			destroy_component(code_1, detaching);

    			run_all(dispose);
    		}
    	};
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let $form, $errors;

    	

      const { form, errors, state, handleChange, handleSubmit, handleReset } = dist_4({
        initialValues: {
          users: [
            {
              name: "",
              email: ""
            }
          ]
        },
        validationSchema: yup.object().shape({
          users: yup.array().of(
            yup.object().shape({
              name: yup.string().required(),
              email: yup
                .string()
                .email()
                .required()
            })
          )
        }),
        onSubmit: values => {
          alert(JSON.stringify(values, null, 2));
        }
      }); component_subscribe($$self, form, $$value => { $form = $$value; $$invalidate('$form', $form); }); component_subscribe($$self, errors, $$value => { $errors = $$value; $$invalidate('$errors', $errors); });

      const add = () => {
        $form.users = $form.users.concat({ name: "", email: "" }); form.set($form);
        $errors.users = $errors.users.concat({ name: "", email: "" }); errors.set($errors);
      };

      const remove = i => () => {
        $form.users = $form.users.filter((u, j) => j !== i); form.set($form);
        $errors.users = $errors.users.filter((u, j) => j !== i); errors.set($errors);
      };

    	function input0_input_handler({ j }) {
    		form.update($$value => ($$value.users[j].name = this.value, $$value));
    	}

    	function input1_input_handler({ j }) {
    		form.update($$value => ($$value.users[j].email = this.value, $$value));
    	}

    	return {
    		form,
    		errors,
    		handleChange,
    		handleSubmit,
    		handleReset,
    		add,
    		remove,
    		$form,
    		$errors,
    		input0_input_handler,
    		input1_input_handler
    	};
    }

    class Component$3 extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-19gnbq6-style")) add_css$1();
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, []);
    	}
    }

    const source$4 = `
  <script>
    import { Form, Field, ErrorMessage } from "svelte-forms-lib";
    import yup from "yup";

    const formProps = {
      initialValues: { name: "", email: "" },
      validationSchema: yup.object().shape({
        name: yup.string().required(),
        email: yup
          .string()
          .email()
          .required()
      }),
      onSubmit: values => {
        alert(JSON.stringify(values));
      }
    };
  </script>

  <Form {...formProps}>
    <label>name</label>
    <Field name="name" />
    <ErrorMessage name="name" />

    <label>email</label>
    <Field name="email" />
    <ErrorMessage name="email" />

    <button type="submit">submit</button>
  </Form>
`;

    const highlight$4 = prism.highlight(source$4, prism.languages.svelte, "svelte");

    /* docs-src/examples/Helpers/component.svelte generated by Svelte v3.10.0 */

    // (28:0) <Form {...formProps}>
    function create_default_slot(ctx) {
    	var label0, t1, t2, t3, label1, t5, t6, t7, button, current;

    	var field0 = new dist_2({ props: { name: "name" } });

    	var errormessage0 = new dist_1({ props: { name: "name" } });

    	var field1 = new dist_2({ props: { name: "email" } });

    	var errormessage1 = new dist_1({ props: { name: "email" } });

    	return {
    		c() {
    			label0 = element("label");
    			label0.textContent = "name";
    			t1 = space();
    			field0.$$.fragment.c();
    			t2 = space();
    			errormessage0.$$.fragment.c();
    			t3 = space();
    			label1 = element("label");
    			label1.textContent = "email";
    			t5 = space();
    			field1.$$.fragment.c();
    			t6 = space();
    			errormessage1.$$.fragment.c();
    			t7 = space();
    			button = element("button");
    			button.textContent = "submit";
    			attr(button, "type", "submit");
    		},

    		m(target, anchor) {
    			insert(target, label0, anchor);
    			insert(target, t1, anchor);
    			mount_component(field0, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(errormessage0, target, anchor);
    			insert(target, t3, anchor);
    			insert(target, label1, anchor);
    			insert(target, t5, anchor);
    			mount_component(field1, target, anchor);
    			insert(target, t6, anchor);
    			mount_component(errormessage1, target, anchor);
    			insert(target, t7, anchor);
    			insert(target, button, anchor);
    			current = true;
    		},

    		p: noop,

    		i(local) {
    			if (current) return;
    			transition_in(field0.$$.fragment, local);

    			transition_in(errormessage0.$$.fragment, local);

    			transition_in(field1.$$.fragment, local);

    			transition_in(errormessage1.$$.fragment, local);

    			current = true;
    		},

    		o(local) {
    			transition_out(field0.$$.fragment, local);
    			transition_out(errormessage0.$$.fragment, local);
    			transition_out(field1.$$.fragment, local);
    			transition_out(errormessage1.$$.fragment, local);
    			current = false;
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(label0);
    				detach(t1);
    			}

    			destroy_component(field0, detaching);

    			if (detaching) {
    				detach(t2);
    			}

    			destroy_component(errormessage0, detaching);

    			if (detaching) {
    				detach(t3);
    				detach(label1);
    				detach(t5);
    			}

    			destroy_component(field1, detaching);

    			if (detaching) {
    				detach(t6);
    			}

    			destroy_component(errormessage1, detaching);

    			if (detaching) {
    				detach(t7);
    				detach(button);
    			}
    		}
    	};
    }

    function create_fragment$5(ctx) {
    	var h1, t1, hr, t2, p, t10, t11, current;

    	var form_spread_levels = [
    		ctx.formProps
    	];

    	let form_props = {
    		$$slots: { default: [create_default_slot] },
    		$$scope: { ctx }
    	};
    	for (var i = 0; i < form_spread_levels.length; i += 1) {
    		form_props = assign(form_props, form_spread_levels[i]);
    	}
    	var form = new dist_3({ props: form_props });

    	var code = new Code({
    		props: {
    		source: source$4,
    		highlight: highlight$4
    	}
    	});

    	return {
    		c() {
    			h1 = element("h1");
    			h1.textContent = "Using helper components";
    			t1 = space();
    			hr = element("hr");
    			t2 = space();
    			p = element("p");
    			p.innerHTML = `
			  Example <span>Form</span>, <span>Field</span> and <span>ErrorMessage</span> helper components.
			`;
    			t10 = space();
    			form.$$.fragment.c();
    			t11 = space();
    			code.$$.fragment.c();
    		},

    		m(target, anchor) {
    			insert(target, h1, anchor);
    			insert(target, t1, anchor);
    			insert(target, hr, anchor);
    			insert(target, t2, anchor);
    			insert(target, p, anchor);
    			insert(target, t10, anchor);
    			mount_component(form, target, anchor);
    			insert(target, t11, anchor);
    			mount_component(code, target, anchor);
    			current = true;
    		},

    		p(changed, ctx) {
    			var form_changes = (changed.formProps) ? get_spread_update(form_spread_levels, [
    									ctx.formProps
    								]) : {};
    			if (changed.$$scope) form_changes.$$scope = { changed, ctx };
    			form.$set(form_changes);

    			var code_changes = {};
    			if (changed.source) code_changes.source = source$4;
    			if (changed.highlight) code_changes.highlight = highlight$4;
    			code.$set(code_changes);
    		},

    		i(local) {
    			if (current) return;
    			transition_in(form.$$.fragment, local);

    			transition_in(code.$$.fragment, local);

    			current = true;
    		},

    		o(local) {
    			transition_out(form.$$.fragment, local);
    			transition_out(code.$$.fragment, local);
    			current = false;
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(h1);
    				detach(t1);
    				detach(hr);
    				detach(t2);
    				detach(p);
    				detach(t10);
    			}

    			destroy_component(form, detaching);

    			if (detaching) {
    				detach(t11);
    			}

    			destroy_component(code, detaching);
    		}
    	};
    }

    function instance$5($$self) {
    	

      const formProps = {
        initialValues: { name: "", email: "" },
        validationSchema: yup.object().shape({
          name: yup.string().required(),
          email: yup
            .string()
            .email()
            .required()
        }),
        onSubmit: values => {
          alert(JSON.stringify(values, null, 2));
        }
      };

    	return { formProps };
    }

    class Component$4 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, []);
    	}
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe,
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    /**
     * Derived value store by synchronizing one or more readable stores and
     * applying an aggregation function over its input values.
     * @param {Stores} stores input stores
     * @param {function(Stores=, function(*)=):*}fn function callback that aggregates the values
     * @param {*=}initial_value when used asynchronously
     */
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => store.subscribe((value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    const LOCATION = {};
    const ROUTER = {};

    /**
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/history.js
     *
     * https://github.com/reach/router/blob/master/LICENSE
     * */

    function getLocation(source) {
      return {
        ...source.location,
        state: source.history.state,
        key: (source.history.state && source.history.state.key) || "initial"
      };
    }

    function createHistory(source, options) {
      const listeners = [];
      let location = getLocation(source);

      return {
        get location() {
          return location;
        },

        listen(listener) {
          listeners.push(listener);

          const popstateListener = () => {
            location = getLocation(source);
            listener({ location, action: "POP" });
          };

          source.addEventListener("popstate", popstateListener);

          return () => {
            source.removeEventListener("popstate", popstateListener);

            const index = listeners.indexOf(listener);
            listeners.splice(index, 1);
          };
        },

        navigate(to, { state, replace = false } = {}) {
          state = { ...state, key: Date.now() + "" };
          // try...catch iOS Safari limits to 100 pushState calls
          try {
            if (replace) {
              source.history.replaceState(state, null, to);
            } else {
              source.history.pushState(state, null, to);
            }
          } catch (e) {
            source.location[replace ? "replace" : "assign"](to);
          }

          location = getLocation(source);
          listeners.forEach(listener => listener({ location, action: "PUSH" }));
        }
      };
    }

    // Stores history entries in memory for testing or other platforms like Native
    function createMemorySource(initialPathname = "/") {
      let index = 0;
      const stack = [{ pathname: initialPathname, search: "" }];
      const states = [];

      return {
        get location() {
          return stack[index];
        },
        addEventListener(name, fn) {},
        removeEventListener(name, fn) {},
        history: {
          get entries() {
            return stack;
          },
          get index() {
            return index;
          },
          get state() {
            return states[index];
          },
          pushState(state, _, uri) {
            const [pathname, search = ""] = uri.split("?");
            index++;
            stack.push({ pathname, search });
            states.push(state);
          },
          replaceState(state, _, uri) {
            const [pathname, search = ""] = uri.split("?");
            stack[index] = { pathname, search };
            states[index] = state;
          }
        }
      };
    }

    // Global history uses window.history as the source if available,
    // otherwise a memory history
    const canUseDOM = Boolean(
      typeof window !== "undefined" &&
        window.document &&
        window.document.createElement
    );
    const globalHistory = createHistory(canUseDOM ? window : createMemorySource());
    const { navigate } = globalHistory;

    /**
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/utils.js
     *
     * https://github.com/reach/router/blob/master/LICENSE
     * */

    const paramRe = /^:(.+)/;

    const SEGMENT_POINTS = 4;
    const STATIC_POINTS = 3;
    const DYNAMIC_POINTS = 2;
    const SPLAT_PENALTY = 1;
    const ROOT_POINTS = 1;

    /**
     * Check if `string` starts with `search`
     * @param {string} string
     * @param {string} search
     * @return {boolean}
     */
    function startsWith(string, search) {
      return string.substr(0, search.length) === search;
    }

    /**
     * Check if `segment` is a root segment
     * @param {string} segment
     * @return {boolean}
     */
    function isRootSegment(segment) {
      return segment === "";
    }

    /**
     * Check if `segment` is a dynamic segment
     * @param {string} segment
     * @return {boolean}
     */
    function isDynamic(segment) {
      return paramRe.test(segment);
    }

    /**
     * Check if `segment` is a splat
     * @param {string} segment
     * @return {boolean}
     */
    function isSplat(segment) {
      return segment[0] === "*";
    }

    /**
     * Split up the URI into segments delimited by `/`
     * @param {string} uri
     * @return {string[]}
     */
    function segmentize(uri) {
      return (
        uri
          // Strip starting/ending `/`
          .replace(/(^\/+|\/+$)/g, "")
          .split("/")
      );
    }

    /**
     * Strip `str` of potential start and end `/`
     * @param {string} str
     * @return {string}
     */
    function stripSlashes(str) {
      return str.replace(/(^\/+|\/+$)/g, "");
    }

    /**
     * Score a route depending on how its individual segments look
     * @param {object} route
     * @param {number} index
     * @return {object}
     */
    function rankRoute(route, index) {
      const score = route.default
        ? 0
        : segmentize(route.path).reduce((score, segment) => {
            score += SEGMENT_POINTS;

            if (isRootSegment(segment)) {
              score += ROOT_POINTS;
            } else if (isDynamic(segment)) {
              score += DYNAMIC_POINTS;
            } else if (isSplat(segment)) {
              score -= SEGMENT_POINTS + SPLAT_PENALTY;
            } else {
              score += STATIC_POINTS;
            }

            return score;
          }, 0);

      return { route, score, index };
    }

    /**
     * Give a score to all routes and sort them on that
     * @param {object[]} routes
     * @return {object[]}
     */
    function rankRoutes(routes) {
      return (
        routes
          .map(rankRoute)
          // If two routes have the exact same score, we go by index instead
          .sort((a, b) =>
            a.score < b.score ? 1 : a.score > b.score ? -1 : a.index - b.index
          )
      );
    }

    /**
     * Ranks and picks the best route to match. Each segment gets the highest
     * amount of points, then the type of segment gets an additional amount of
     * points where
     *
     *  static > dynamic > splat > root
     *
     * This way we don't have to worry about the order of our routes, let the
     * computers do it.
     *
     * A route looks like this
     *
     *  { path, default, value }
     *
     * And a returned match looks like:
     *
     *  { route, params, uri }
     *
     * @param {object[]} routes
     * @param {string} uri
     * @return {?object}
     */
    function pick(routes, uri) {
      let match;
      let default_;

      const [uriPathname] = uri.split("?");
      const uriSegments = segmentize(uriPathname);
      const isRootUri = uriSegments[0] === "";
      const ranked = rankRoutes(routes);

      for (let i = 0, l = ranked.length; i < l; i++) {
        const route = ranked[i].route;
        let missed = false;

        if (route.default) {
          default_ = {
            route,
            params: {},
            uri
          };
          continue;
        }

        const routeSegments = segmentize(route.path);
        const params = {};
        const max = Math.max(uriSegments.length, routeSegments.length);
        let index = 0;

        for (; index < max; index++) {
          const routeSegment = routeSegments[index];
          const uriSegment = uriSegments[index];

          if (routeSegment !== undefined && isSplat(routeSegment)) {
            // Hit a splat, just grab the rest, and return a match
            // uri:   /files/documents/work
            // route: /files/* or /files/*splatname
            const splatName = routeSegment === "*" ? "*" : routeSegment.slice(1);

            params[splatName] = uriSegments
              .slice(index)
              .map(decodeURIComponent)
              .join("/");
            break;
          }

          if (uriSegment === undefined) {
            // URI is shorter than the route, no match
            // uri:   /users
            // route: /users/:userId
            missed = true;
            break;
          }

          let dynamicMatch = paramRe.exec(routeSegment);

          if (dynamicMatch && !isRootUri) {
            const value = decodeURIComponent(uriSegment);
            params[dynamicMatch[1]] = value;
          } else if (routeSegment !== uriSegment) {
            // Current segments don't match, not dynamic, not splat, so no match
            // uri:   /users/123/settings
            // route: /users/:id/profile
            missed = true;
            break;
          }
        }

        if (!missed) {
          match = {
            route,
            params,
            uri: "/" + uriSegments.slice(0, index).join("/")
          };
          break;
        }
      }

      return match || default_ || null;
    }

    /**
     * Check if the `path` matches the `uri`.
     * @param {string} path
     * @param {string} uri
     * @return {?object}
     */
    function match(route, uri) {
      return pick([route], uri);
    }

    /**
     * Add the query to the pathname if a query is given
     * @param {string} pathname
     * @param {string} [query]
     * @return {string}
     */
    function addQuery(pathname, query) {
      return pathname + (query ? `?${query}` : "");
    }

    /**
     * Resolve URIs as though every path is a directory, no files. Relative URIs
     * in the browser can feel awkward because not only can you be "in a directory",
     * you can be "at a file", too. For example:
     *
     *  browserSpecResolve('foo', '/bar/') => /bar/foo
     *  browserSpecResolve('foo', '/bar') => /foo
     *
     * But on the command line of a file system, it's not as complicated. You can't
     * `cd` from a file, only directories. This way, links have to know less about
     * their current path. To go deeper you can do this:
     *
     *  <Link to="deeper"/>
     *  // instead of
     *  <Link to=`{${props.uri}/deeper}`/>
     *
     * Just like `cd`, if you want to go deeper from the command line, you do this:
     *
     *  cd deeper
     *  # not
     *  cd $(pwd)/deeper
     *
     * By treating every path as a directory, linking to relative paths should
     * require less contextual information and (fingers crossed) be more intuitive.
     * @param {string} to
     * @param {string} base
     * @return {string}
     */
    function resolve(to, base) {
      // /foo/bar, /baz/qux => /foo/bar
      if (startsWith(to, "/")) {
        return to;
      }

      const [toPathname, toQuery] = to.split("?");
      const [basePathname] = base.split("?");
      const toSegments = segmentize(toPathname);
      const baseSegments = segmentize(basePathname);

      // ?a=b, /users?b=c => /users?a=b
      if (toSegments[0] === "") {
        return addQuery(basePathname, toQuery);
      }

      // profile, /users/789 => /users/789/profile
      if (!startsWith(toSegments[0], ".")) {
        const pathname = baseSegments.concat(toSegments).join("/");

        return addQuery((basePathname === "/" ? "" : "/") + pathname, toQuery);
      }

      // ./       , /users/123 => /users/123
      // ../      , /users/123 => /users
      // ../..    , /users/123 => /
      // ../../one, /a/b/c/d   => /a/b/one
      // .././one , /a/b/c/d   => /a/b/c/one
      const allSegments = baseSegments.concat(toSegments);
      const segments = [];

      allSegments.forEach(segment => {
        if (segment === "..") {
          segments.pop();
        } else if (segment !== ".") {
          segments.push(segment);
        }
      });

      return addQuery("/" + segments.join("/"), toQuery);
    }

    /**
     * Combines the `basepath` and the `path` into one path.
     * @param {string} basepath
     * @param {string} path
     */
    function combinePaths(basepath, path) {
      return `${stripSlashes(
    path === "/" ? basepath : `${stripSlashes(basepath)}/${stripSlashes(path)}`
  )}/`;
    }

    /**
     * Decides whether a given `event` should result in a navigation or not.
     * @param {object} event
     */
    function shouldNavigate(event) {
      return (
        !event.defaultPrevented &&
        event.button === 0 &&
        !(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey)
      );
    }

    /* node_modules/svelte-routing/src/Router.svelte generated by Svelte v3.10.0 */

    function create_fragment$6(ctx) {
    	var current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	return {
    		c() {
    			if (default_slot) default_slot.c();
    		},

    		l(nodes) {
    			if (default_slot) default_slot.l(nodes);
    		},

    		m(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},

    		p(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}
    		},

    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let $base, $location, $routes;

    	

      let { basepath = "/", url = null } = $$props;

      const locationContext = getContext(LOCATION);
      const routerContext = getContext(ROUTER);

      const routes = writable([]); component_subscribe($$self, routes, $$value => { $routes = $$value; $$invalidate('$routes', $routes); });
      const activeRoute = writable(null);
      let hasActiveRoute = false; // Used in SSR to synchronously set that a Route is active.

      // If locationContext is not set, this is the topmost Router in the tree.
      // If the `url` prop is given we force the location to it.
      const location =
        locationContext ||
        writable(url ? { pathname: url } : globalHistory.location); component_subscribe($$self, location, $$value => { $location = $$value; $$invalidate('$location', $location); });

      // If routerContext is set, the routerBase of the parent Router
      // will be the base for this Router's descendants.
      // If routerContext is not set, the path and resolved uri will both
      // have the value of the basepath prop.
      const base = routerContext
        ? routerContext.routerBase
        : writable({
            path: basepath,
            uri: basepath
          }); component_subscribe($$self, base, $$value => { $base = $$value; $$invalidate('$base', $base); });

      const routerBase = derived([base, activeRoute], ([base, activeRoute]) => {
        // If there is no activeRoute, the routerBase will be identical to the base.
        if (activeRoute === null) {
          return base;
        }

        const { path: basepath } = base;
        const { route, uri } = activeRoute;
        // Remove the potential /* or /*splatname from
        // the end of the child Routes relative paths.
        const path = route.default ? basepath : route.path.replace(/\*.*$/, "");

        return { path, uri };
      });

      function registerRoute(route) {
        const { path: basepath } = $base;
        let { path } = route;

        // We store the original path in the _path property so we can reuse
        // it when the basepath changes. The only thing that matters is that
        // the route reference is intact, so mutation is fine.
        route._path = path;
        route.path = combinePaths(basepath, path);

        if (typeof window === "undefined") {
          // In SSR we should set the activeRoute immediately if it is a match.
          // If there are more Routes being registered after a match is found,
          // we just skip them.
          if (hasActiveRoute) {
            return;
          }

          const matchingRoute = match(route, $location.pathname);
          if (matchingRoute) {
            activeRoute.set(matchingRoute);
            hasActiveRoute = true;
          }
        } else {
          routes.update(rs => {
            rs.push(route);
            return rs;
          });
        }
      }

      function unregisterRoute(route) {
        routes.update(rs => {
          const index = rs.indexOf(route);
          rs.splice(index, 1);
          return rs;
        });
      }

      if (!locationContext) {
        // The topmost Router in the tree is responsible for updating
        // the location store and supplying it through context.
        onMount(() => {
          const unlisten = globalHistory.listen(history => {
            location.set(history.location);
          });

          return unlisten;
        });

        setContext(LOCATION, location);
      }

      setContext(ROUTER, {
        activeRoute,
        base,
        routerBase,
        registerRoute,
        unregisterRoute
      });

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ('basepath' in $$props) $$invalidate('basepath', basepath = $$props.basepath);
    		if ('url' in $$props) $$invalidate('url', url = $$props.url);
    		if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = ($$dirty = { $base: 1, $routes: 1, $location: 1 }) => {
    		if ($$dirty.$base) { {
            const { path: basepath } = $base;
            routes.update(rs => {
              rs.forEach(r => (r.path = combinePaths(basepath, r._path)));
              return rs;
            });
          } }
    		if ($$dirty.$routes || $$dirty.$location) { {
            const bestMatch = pick($routes, $location.pathname);
            activeRoute.set(bestMatch);
          } }
    	};

    	return {
    		basepath,
    		url,
    		routes,
    		location,
    		base,
    		$$slots,
    		$$scope
    	};
    }

    class Router extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, ["basepath", "url"]);
    	}
    }

    /* node_modules/svelte-routing/src/Route.svelte generated by Svelte v3.10.0 */

    const get_default_slot_changes = ({ routeParams, $location }) => ({ params: routeParams, location: $location });
    const get_default_slot_context = ({ routeParams, $location }) => ({
    	params: routeParams,
    	location: $location
    });

    // (40:0) {#if $activeRoute !== null && $activeRoute.route === route}
    function create_if_block$3(ctx) {
    	var current_block_type_index, if_block, if_block_anchor, current;

    	var if_block_creators = [
    		create_if_block_1$3,
    		create_else_block
    	];

    	var if_blocks = [];

    	function select_block_type(changed, ctx) {
    		if (ctx.component !== null) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(null, ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},

    		m(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p(changed, ctx) {
    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(changed, ctx);
    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(changed, ctx);
    			} else {
    				group_outros();
    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});
    				check_outros();

    				if_block = if_blocks[current_block_type_index];
    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}
    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},

    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d(detaching) {
    			if_blocks[current_block_type_index].d(detaching);

    			if (detaching) {
    				detach(if_block_anchor);
    			}
    		}
    	};
    }

    // (43:2) {:else}
    function create_else_block(ctx) {
    	var current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, get_default_slot_context);

    	return {
    		c() {
    			if (default_slot) default_slot.c();
    		},

    		l(nodes) {
    			if (default_slot) default_slot.l(nodes);
    		},

    		m(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},

    		p(changed, ctx) {
    			if (default_slot && default_slot.p && (changed.$$scope || changed.routeParams || changed.$location)) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, get_default_slot_changes),
    					get_slot_context(default_slot_template, ctx, get_default_slot_context)
    				);
    			}
    		},

    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    // (41:2) {#if component !== null}
    function create_if_block_1$3(ctx) {
    	var switch_instance_anchor, current;

    	var switch_instance_spread_levels = [
    		{ location: ctx.$location },
    		ctx.routeParams,
    		ctx.routeProps
    	];

    	var switch_value = ctx.component;

    	function switch_props(ctx) {
    		let switch_instance_props = {};
    		for (var i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}
    		return { props: switch_instance_props };
    	}

    	if (switch_value) {
    		var switch_instance = new switch_value(switch_props());
    	}

    	return {
    		c() {
    			if (switch_instance) switch_instance.$$.fragment.c();
    			switch_instance_anchor = empty();
    		},

    		m(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert(target, switch_instance_anchor, anchor);
    			current = true;
    		},

    		p(changed, ctx) {
    			var switch_instance_changes = (changed.$location || changed.routeParams || changed.routeProps) ? get_spread_update(switch_instance_spread_levels, [
    									(changed.$location) && { location: ctx.$location },
    			(changed.routeParams) && ctx.routeParams,
    			(changed.routeProps) && ctx.routeProps
    								]) : {};

    			if (switch_value !== (switch_value = ctx.component)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;
    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});
    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());

    					switch_instance.$$.fragment.c();
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			}

    			else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},

    		i(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);

    			current = true;
    		},

    		o(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(switch_instance_anchor);
    			}

    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};
    }

    function create_fragment$7(ctx) {
    	var if_block_anchor, current;

    	var if_block = (ctx.$activeRoute !== null && ctx.$activeRoute.route === ctx.route) && create_if_block$3(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},

    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p(changed, ctx) {
    			if (ctx.$activeRoute !== null && ctx.$activeRoute.route === ctx.route) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block$3(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();
    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});
    				check_outros();
    			}
    		},

    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d(detaching) {
    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach(if_block_anchor);
    			}
    		}
    	};
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let $activeRoute, $location;

    	

      let { path = "", component = null } = $$props;

      const { registerRoute, unregisterRoute, activeRoute } = getContext(ROUTER); component_subscribe($$self, activeRoute, $$value => { $activeRoute = $$value; $$invalidate('$activeRoute', $activeRoute); });
      const location = getContext(LOCATION); component_subscribe($$self, location, $$value => { $location = $$value; $$invalidate('$location', $location); });

      const route = {
        path,
        // If no path prop is given, this Route will act as the default Route
        // that is rendered if no other Route in the Router is a match.
        default: path === ""
      };
      let routeParams = {};
      let routeProps = {};

      registerRoute(route);

      // There is no need to unregister Routes in SSR since it will all be
      // thrown away anyway.
      if (typeof window !== "undefined") {
        onDestroy(() => {
          unregisterRoute(route);
        });
      }

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('path' in $$new_props) $$invalidate('path', path = $$new_props.path);
    		if ('component' in $$new_props) $$invalidate('component', component = $$new_props.component);
    		if ('$$scope' in $$new_props) $$invalidate('$$scope', $$scope = $$new_props.$$scope);
    	};

    	$$self.$$.update = ($$dirty = { $activeRoute: 1, $$props: 1 }) => {
    		if ($$dirty.$activeRoute) { if ($activeRoute && $activeRoute.route === route) {
            $$invalidate('routeParams', routeParams = $activeRoute.params);
          } }
    		{
            const { path, component, ...rest } = $$props;
            $$invalidate('routeProps', routeProps = rest);
          }
    	};

    	return {
    		path,
    		component,
    		activeRoute,
    		location,
    		route,
    		routeParams,
    		routeProps,
    		$activeRoute,
    		$location,
    		$$props: $$props = exclude_internal_props($$props),
    		$$slots,
    		$$scope
    	};
    }

    class Route extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, ["path", "component"]);
    	}
    }

    /* node_modules/svelte-routing/src/Link.svelte generated by Svelte v3.10.0 */

    function create_fragment$8(ctx) {
    	var a, current, dispose;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	var a_levels = [
    		{ href: ctx.href },
    		{ "aria-current": ctx.ariaCurrent },
    		ctx.props
    	];

    	var a_data = {};
    	for (var i = 0; i < a_levels.length; i += 1) {
    		a_data = assign(a_data, a_levels[i]);
    	}

    	return {
    		c() {
    			a = element("a");

    			if (default_slot) default_slot.c();

    			set_attributes(a, a_data);
    			dispose = listen(a, "click", ctx.onClick);
    		},

    		l(nodes) {
    			if (default_slot) default_slot.l(a_nodes);
    		},

    		m(target, anchor) {
    			insert(target, a, anchor);

    			if (default_slot) {
    				default_slot.m(a, null);
    			}

    			current = true;
    		},

    		p(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}

    			set_attributes(a, get_spread_update(a_levels, [
    				(changed.href) && { href: ctx.href },
    				(changed.ariaCurrent) && { "aria-current": ctx.ariaCurrent },
    				(changed.props) && ctx.props
    			]));
    		},

    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(a);
    			}

    			if (default_slot) default_slot.d(detaching);
    			dispose();
    		}
    	};
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let $base, $location;

    	

      let { to = "#", replace = false, state = {}, getProps = () => ({}) } = $$props;

      const { base } = getContext(ROUTER); component_subscribe($$self, base, $$value => { $base = $$value; $$invalidate('$base', $base); });
      const location = getContext(LOCATION); component_subscribe($$self, location, $$value => { $location = $$value; $$invalidate('$location', $location); });
      const dispatch = createEventDispatcher();

      let href, isPartiallyCurrent, isCurrent, props;

      function onClick(event) {
        dispatch("click", event);

        if (shouldNavigate(event)) {
          event.preventDefault();
          // Don't push another entry to the history stack when the user
          // clicks on a Link to the page they are currently on.
          const shouldReplace = $location.pathname === href || replace;
          navigate(href, { state, replace: shouldReplace });
        }
      }

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ('to' in $$props) $$invalidate('to', to = $$props.to);
    		if ('replace' in $$props) $$invalidate('replace', replace = $$props.replace);
    		if ('state' in $$props) $$invalidate('state', state = $$props.state);
    		if ('getProps' in $$props) $$invalidate('getProps', getProps = $$props.getProps);
    		if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
    	};

    	let ariaCurrent;

    	$$self.$$.update = ($$dirty = { to: 1, $base: 1, $location: 1, href: 1, isCurrent: 1, getProps: 1, isPartiallyCurrent: 1 }) => {
    		if ($$dirty.to || $$dirty.$base) { $$invalidate('href', href = to === "/" ? $base.uri : resolve(to, $base.uri)); }
    		if ($$dirty.$location || $$dirty.href) { $$invalidate('isPartiallyCurrent', isPartiallyCurrent = startsWith($location.pathname, href)); }
    		if ($$dirty.href || $$dirty.$location) { $$invalidate('isCurrent', isCurrent = href === $location.pathname); }
    		if ($$dirty.isCurrent) { $$invalidate('ariaCurrent', ariaCurrent = isCurrent ? "page" : undefined); }
    		if ($$dirty.getProps || $$dirty.$location || $$dirty.href || $$dirty.isPartiallyCurrent || $$dirty.isCurrent) { $$invalidate('props', props = getProps({
            location: $location,
            href,
            isPartiallyCurrent,
            isCurrent
          })); }
    	};

    	return {
    		to,
    		replace,
    		state,
    		getProps,
    		base,
    		location,
    		href,
    		props,
    		onClick,
    		ariaCurrent,
    		$$slots,
    		$$scope
    	};
    }

    class Link extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, ["to", "replace", "state", "getProps"]);
    	}
    }

    /* docs-src/index.svelte generated by Svelte v3.10.0 */

    function add_css$2() {
    	var style = element("style");
    	style.id = 'svelte-8gk5if-style';
    	style.textContent = ".layout.svelte-8gk5if{display:flex;position:relative;height:100vh;overflow:scroll}.aside.svelte-8gk5if{background:var(--secondary);position:sticky;top:0;bottom:0;left:0;padding:40px 40px 50px;flex:0 0 360px;color:#fff}.version.svelte-8gk5if{margin:30px 0 0;padding:12px}@media(max-width: 768px){.layout.svelte-8gk5if{flex-direction:column}.aside.svelte-8gk5if{width:100%;position:relative}}nav.svelte-8gk5if{display:flex;flex-direction:column}.wrapper.svelte-8gk5if{flex:1;width:100%}.container.svelte-8gk5if{max-width:900px;padding:40px;min-height:calc(100vh - 120px)}.logo.svelte-8gk5if{max-width:140px}footer.svelte-8gk5if{width:100%;background:var(--secondary);padding:20px;height:120px;color:#fff;display:flex;align-items:center;justify-content:flex-end}.avatar.svelte-8gk5if{width:48px;height:48px}.badge.svelte-8gk5if{padding:6px 10px;text-transform:uppercase;color:var(--secondary);font-weight:bold;margin-left:8px;font-size:11px;letter-spacing:1.2px;border-radius:50px;background:var(--primary-dark)}.nav-section.svelte-8gk5if{font-size:18px;margin-top:40px;margin-bottom:12px;font-weight:normal}.github.svelte-8gk5if{position:fixed;top:0;right:0;padding:0;z-index:1}.github.svelte-8gk5if img.svelte-8gk5if{width:100px;height:100px}";
    	append(document.head, style);
    }

    // (120:8) <Link to="/introduction">
    function create_default_slot_6(ctx) {
    	var t;

    	return {
    		c() {
    			t = text("Introduction");
    		},

    		m(target, anchor) {
    			insert(target, t, anchor);
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(t);
    			}
    		}
    	};
    }

    // (122:8) <Link to="/basic">
    function create_default_slot_5(ctx) {
    	var t;

    	return {
    		c() {
    			t = text("Basic");
    		},

    		m(target, anchor) {
    			insert(target, t, anchor);
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(t);
    			}
    		}
    	};
    }

    // (123:8) <Link to="/yup">
    function create_default_slot_4(ctx) {
    	var t;

    	return {
    		c() {
    			t = text("Yup validation");
    		},

    		m(target, anchor) {
    			insert(target, t, anchor);
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(t);
    			}
    		}
    	};
    }

    // (124:8) <Link to="/custom">
    function create_default_slot_3(ctx) {
    	var t;

    	return {
    		c() {
    			t = text("Custom validation");
    		},

    		m(target, anchor) {
    			insert(target, t, anchor);
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(t);
    			}
    		}
    	};
    }

    // (125:8) <Link to="/array">
    function create_default_slot_2(ctx) {
    	var t;

    	return {
    		c() {
    			t = text("Forms array");
    		},

    		m(target, anchor) {
    			insert(target, t, anchor);
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(t);
    			}
    		}
    	};
    }

    // (126:8) <Link to="/helpers">
    function create_default_slot_1(ctx) {
    	var t, span;

    	return {
    		c() {
    			t = text("Helper components\n          ");
    			span = element("span");
    			span.textContent = "new";
    			attr(span, "class", "badge svelte-8gk5if");
    		},

    		m(target, anchor) {
    			insert(target, t, anchor);
    			insert(target, span, anchor);
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(t);
    				detach(span);
    			}
    		}
    	};
    }

    // (113:0) <Router>
    function create_default_slot$1(ctx) {
    	var div1, aside, img, t0, p, t2, nav, h40, t4, t5, h41, t7, t8, t9, t10, t11, t12, main, a, t13, div0, t14, t15, t16, t17, t18, footer, current;

    	var link0 = new Link({
    		props: {
    		to: "/introduction",
    		$$slots: { default: [create_default_slot_6] },
    		$$scope: { ctx }
    	}
    	});

    	var link1 = new Link({
    		props: {
    		to: "/basic",
    		$$slots: { default: [create_default_slot_5] },
    		$$scope: { ctx }
    	}
    	});

    	var link2 = new Link({
    		props: {
    		to: "/yup",
    		$$slots: { default: [create_default_slot_4] },
    		$$scope: { ctx }
    	}
    	});

    	var link3 = new Link({
    		props: {
    		to: "/custom",
    		$$slots: { default: [create_default_slot_3] },
    		$$scope: { ctx }
    	}
    	});

    	var link4 = new Link({
    		props: {
    		to: "/array",
    		$$slots: { default: [create_default_slot_2] },
    		$$scope: { ctx }
    	}
    	});

    	var link5 = new Link({
    		props: {
    		to: "/helpers",
    		$$slots: { default: [create_default_slot_1] },
    		$$scope: { ctx }
    	}
    	});

    	var route0 = new Route({
    		props: { path: "/basic", component: Component }
    	});

    	var route1 = new Route({
    		props: { path: "/yup", component: Component$1 }
    	});

    	var route2 = new Route({
    		props: { path: "/array", component: Component$3 }
    	});

    	var route3 = new Route({
    		props: {
    		path: "/custom",
    		component: Component$2
    	}
    	});

    	var route4 = new Route({
    		props: {
    		path: "/helpers",
    		component: Component$4
    	}
    	});

    	return {
    		c() {
    			div1 = element("div");
    			aside = element("aside");
    			img = element("img");
    			t0 = space();
    			p = element("p");
    			p.textContent = "V1.0.0";
    			t2 = space();
    			nav = element("nav");
    			h40 = element("h4");
    			h40.textContent = "Getting started";
    			t4 = space();
    			link0.$$.fragment.c();
    			t5 = space();
    			h41 = element("h4");
    			h41.textContent = "Examples";
    			t7 = space();
    			link1.$$.fragment.c();
    			t8 = space();
    			link2.$$.fragment.c();
    			t9 = space();
    			link3.$$.fragment.c();
    			t10 = space();
    			link4.$$.fragment.c();
    			t11 = space();
    			link5.$$.fragment.c();
    			t12 = space();
    			main = element("main");
    			a = element("a");
    			a.innerHTML = `<img src="./github.png" alt="github repository for svelte forms lib" class="svelte-8gk5if">`;
    			t13 = space();
    			div0 = element("div");
    			route0.$$.fragment.c();
    			t14 = space();
    			route1.$$.fragment.c();
    			t15 = space();
    			route2.$$.fragment.c();
    			t16 = space();
    			route3.$$.fragment.c();
    			t17 = space();
    			route4.$$.fragment.c();
    			t18 = space();
    			footer = element("footer");
    			footer.innerHTML = `
			        Open source project by
			        <a href="https://www.tjinauyeung.com" target="_blank"><img class="avatar svelte-8gk5if" src="https://tjinauyeung.com/static/avatar-b2c241e7fd2f877f0c3948067254afc3.png" alt="avatar of Tjin Au Yeung"></a>`;
    			attr(img, "alt", "logo of svelte forms lib");
    			attr(img, "class", "logo svelte-8gk5if");
    			attr(img, "src", "./logo.png");
    			attr(p, "class", "version svelte-8gk5if");
    			attr(h40, "class", "nav-section svelte-8gk5if");
    			attr(h41, "class", "nav-section svelte-8gk5if");
    			attr(nav, "class", "svelte-8gk5if");
    			attr(aside, "class", "aside svelte-8gk5if");
    			attr(a, "class", "github svelte-8gk5if");
    			attr(a, "href", "https://github.com/tjinauyeung/svelte-forms-lib");
    			attr(a, "target", "_blank");
    			attr(div0, "class", "container svelte-8gk5if");
    			attr(footer, "class", "svelte-8gk5if");
    			attr(main, "class", "wrapper svelte-8gk5if");
    			attr(div1, "class", "layout svelte-8gk5if");
    		},

    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, aside);
    			append(aside, img);
    			append(aside, t0);
    			append(aside, p);
    			append(aside, t2);
    			append(aside, nav);
    			append(nav, h40);
    			append(nav, t4);
    			mount_component(link0, nav, null);
    			append(nav, t5);
    			append(nav, h41);
    			append(nav, t7);
    			mount_component(link1, nav, null);
    			append(nav, t8);
    			mount_component(link2, nav, null);
    			append(nav, t9);
    			mount_component(link3, nav, null);
    			append(nav, t10);
    			mount_component(link4, nav, null);
    			append(nav, t11);
    			mount_component(link5, nav, null);
    			append(div1, t12);
    			append(div1, main);
    			append(main, a);
    			append(main, t13);
    			append(main, div0);
    			mount_component(route0, div0, null);
    			append(div0, t14);
    			mount_component(route1, div0, null);
    			append(div0, t15);
    			mount_component(route2, div0, null);
    			append(div0, t16);
    			mount_component(route3, div0, null);
    			append(div0, t17);
    			mount_component(route4, div0, null);
    			append(main, t18);
    			append(main, footer);
    			current = true;
    		},

    		p(changed, ctx) {
    			var link0_changes = {};
    			if (changed.$$scope) link0_changes.$$scope = { changed, ctx };
    			link0.$set(link0_changes);

    			var link1_changes = {};
    			if (changed.$$scope) link1_changes.$$scope = { changed, ctx };
    			link1.$set(link1_changes);

    			var link2_changes = {};
    			if (changed.$$scope) link2_changes.$$scope = { changed, ctx };
    			link2.$set(link2_changes);

    			var link3_changes = {};
    			if (changed.$$scope) link3_changes.$$scope = { changed, ctx };
    			link3.$set(link3_changes);

    			var link4_changes = {};
    			if (changed.$$scope) link4_changes.$$scope = { changed, ctx };
    			link4.$set(link4_changes);

    			var link5_changes = {};
    			if (changed.$$scope) link5_changes.$$scope = { changed, ctx };
    			link5.$set(link5_changes);

    			var route0_changes = {};
    			if (changed.Basic) route0_changes.component = Component;
    			route0.$set(route0_changes);

    			var route1_changes = {};
    			if (changed.YupValidation) route1_changes.component = Component$1;
    			route1.$set(route1_changes);

    			var route2_changes = {};
    			if (changed.FormArray) route2_changes.component = Component$3;
    			route2.$set(route2_changes);

    			var route3_changes = {};
    			if (changed.CustomValidation) route3_changes.component = Component$2;
    			route3.$set(route3_changes);

    			var route4_changes = {};
    			if (changed.Helpers) route4_changes.component = Component$4;
    			route4.$set(route4_changes);
    		},

    		i(local) {
    			if (current) return;
    			transition_in(link0.$$.fragment, local);

    			transition_in(link1.$$.fragment, local);

    			transition_in(link2.$$.fragment, local);

    			transition_in(link3.$$.fragment, local);

    			transition_in(link4.$$.fragment, local);

    			transition_in(link5.$$.fragment, local);

    			transition_in(route0.$$.fragment, local);

    			transition_in(route1.$$.fragment, local);

    			transition_in(route2.$$.fragment, local);

    			transition_in(route3.$$.fragment, local);

    			transition_in(route4.$$.fragment, local);

    			current = true;
    		},

    		o(local) {
    			transition_out(link0.$$.fragment, local);
    			transition_out(link1.$$.fragment, local);
    			transition_out(link2.$$.fragment, local);
    			transition_out(link3.$$.fragment, local);
    			transition_out(link4.$$.fragment, local);
    			transition_out(link5.$$.fragment, local);
    			transition_out(route0.$$.fragment, local);
    			transition_out(route1.$$.fragment, local);
    			transition_out(route2.$$.fragment, local);
    			transition_out(route3.$$.fragment, local);
    			transition_out(route4.$$.fragment, local);
    			current = false;
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(div1);
    			}

    			destroy_component(link0);

    			destroy_component(link1);

    			destroy_component(link2);

    			destroy_component(link3);

    			destroy_component(link4);

    			destroy_component(link5);

    			destroy_component(route0);

    			destroy_component(route1);

    			destroy_component(route2);

    			destroy_component(route3);

    			destroy_component(route4);
    		}
    	};
    }

    function create_fragment$9(ctx) {
    	var current;

    	var router = new Router({
    		props: {
    		$$slots: { default: [create_default_slot$1] },
    		$$scope: { ctx }
    	}
    	});

    	return {
    		c() {
    			router.$$.fragment.c();
    		},

    		m(target, anchor) {
    			mount_component(router, target, anchor);
    			current = true;
    		},

    		p(changed, ctx) {
    			var router_changes = {};
    			if (changed.$$scope) router_changes.$$scope = { changed, ctx };
    			router.$set(router_changes);
    		},

    		i(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);

    			current = true;
    		},

    		o(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},

    		d(detaching) {
    			destroy_component(router, detaching);
    		}
    	};
    }

    class Index extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-8gk5if-style")) add_css$2();
    		init(this, options, null, create_fragment$9, safe_not_equal, []);
    	}
    }

    var index = new Index({
      target: document.body
    });

    return index;

}());
//# sourceMappingURL=bundle.js.map
