/*
 *   The MIT License (MIT)
 *   Copyright (c) 2019. Wise Wild Web
 *
 *   Permission is hereby granted, free of charge, to any person obtaining a copy
 *   of this software and associated documentation files (the "Software"), to deal
 *   in the Software without restriction, including without limitation the rights
 *   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *   copies of the Software, and to permit persons to whom the Software is
 *   furnished to do so, subject to the following conditions:
 *
 *   The above copyright notice and this permission notice shall be included in all
 *   copies or substantial portions of the Software.
 *
 *   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 *   SOFTWARE.
 *
 *   @author : Nathanael Braun
 *   @contact : n8tz.js@gmail.com
 */
import React            from "react";
import ReactDom         from 'react-dom';
import {renderToString} from "react-dom/server";
import {withScope, Scope} from "react-scopes";
import shortid          from 'shortid';
import AppScope         from './App.scope';

console.log(AppScope);
const ctrl = {
	renderTo( node, state = __STATE__ ) {
		let cScope = new Scope(AppScope, {
			    id         : "App",
			    autoDestroy: true
		    }),
		    App    = withScope(cScope)(require('./App').default);
		
		window.contexts = Scope.scopes;
		__STATE__ && cScope.restore(__STATE__);
		ReactDom.render(<App/>, node);
		
		debugger
		if ( process.env.NODE_ENV !== 'production' && module.hot ) {
			module.hot.accept('App/App', () => {
				//ReactDom.render(<App/>, node)
				ctrl.renderTo(node, state)
			});
			module.hot.accept('App/App.scope', () => {
				cScope.register(AppScope)
			});
		}
	},
	renderSSR( cfg, cb, _attempts = 0 ) {
		let rid     = shortid.generate(),
		    cScope  = new Scope(AppScope, {
			    // all scope require unique id ( or key to make id basing the parent scope )
			    id         : rid,
			    // when rendering from ssr React components don't retain theirs scopes so :
			    autoDestroy: false
		    }), App = withScope(cScope)(require('./App').default);
		
		cfg.state && cScope.restore(cfg.state, { alias: "App" });
		
		let html,
		    appHtml = renderToString(<App location={cfg.location}/>),
		    stable  = cScope.isStableTree();
		
		// should happen when all all stores are stabilized
		cScope.onceStableTree(state => {
			let nstate = cScope.serialize({ alias: "App" });
			
			if ( !stable && _attempts < 2 ) {// render 2 time is enough to render async data based on async data
				cfg.state = nstate;
				ctrl.renderSSR(cfg, cb, ++_attempts);
			}
			else {
				try {
					html = cfg.tpl.render(
						{
							app  : appHtml,
							state: JSON.stringify(nstate)
						}
					);
				} catch ( e ) {
					return cb(e)
				}
				
				cb(null, html, !stable && nstate)
			}
			cScope.destroy()
		})
	}
}

export default ctrl;