!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.poster=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var scrolling_canvas = require('./scrolling_canvas.js');
var canvas = require('./canvas.js');
var document_controller = require('./document_controller.js');
var document_model = require('./document_model.js');
var document_view = require('./document_view.js');
var pluginmanager = require('./plugins/manager.js');
var plugin = require('./plugins/plugin.js');
var renderer = require('./renderers/renderer.js');
var style = require('./style.js');
var utils = require('./utils.js');
var config = require('./config.js');
config = config.config;

/**
 * Canvas based text editor
 */
var Poster = function() {
    utils.PosterClass.call(this);

    // Create canvas
    this.canvas = new scrolling_canvas.ScrollingCanvas();
    this.el = this.canvas.el; // Convenience
    this._style = new style.Style();

    // Create model, controller, and view.
    var that = this;
    this.model = new document_model.DocumentModel();
    this.controller = new document_controller.DocumentController(this.canvas.el, this.model);
    this.view = new document_view.DocumentView(
        this.canvas, 
        this.model, 
        this.controller.cursors, 
        this._style,
        function() { return that.controller.clipboard.hidden_input === document.activeElement || that.canvas.focused; }
    );

    // Create properties
    this.property('style', function() {
        return that._style;
    });
    this.property('config', function() {
        return config;
    });
    this.property('value', function() {
        return that.model.text;
    }, function(value) {
        that.model.text = value;
    });
    this.property('width', function() {
        return that.view.width;
    }, function(value) {
        that.view.width = value;
        that.trigger('resized');
    });
    this.property('height', function() {
        return that.view.height;
    }, function(value) {
        that.view.height = value;
        that.trigger('resized');
    });
    this.property('language', function() {
        return that.view.language;
    }, function(value) {
        that.view.language = value;
    });

    // Load plugins.
    this.plugins = new pluginmanager.PluginManager(this);
    this.plugins.load('gutter');
    this.plugins.load('linenumbers');
};
utils.inherit(Poster, utils.PosterClass);

// Exports
exports.Poster = Poster;
exports.Canvas = plugin.PluginBase;
exports.PluginBase = plugin.PluginBase;
exports.RendererBase = renderer.RendererBase;
exports.utils = utils;

},{"./canvas.js":4,"./config.js":6,"./document_controller.js":9,"./document_model.js":10,"./document_view.js":11,"./plugins/manager.js":22,"./plugins/plugin.js":23,"./renderers/renderer.js":28,"./scrolling_canvas.js":31,"./style.js":32,"./utils.js":36}],2:[function(require,module,exports){
self = (typeof window !== 'undefined')
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

var Prism = (function(){

// Private helper vars
var lang = /\blang(?:uage)?-(?!\*)(\w+)\b/i;

var _ = self.Prism = {
	util: {
		encode: function (tokens) {
			if (tokens instanceof Token) {
				return new Token(tokens.type, _.util.encode(tokens.content), tokens.alias);
			} else if (_.util.type(tokens) === 'Array') {
				return tokens.map(_.util.encode);
			} else {
				return tokens.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\u00a0/g, ' ');
			}
		},

		type: function (o) {
			return Object.prototype.toString.call(o).match(/\[object (\w+)\]/)[1];
		},

		// Deep clone a language definition (e.g. to extend it)
		clone: function (o) {
			var type = _.util.type(o);

			switch (type) {
				case 'Object':
					var clone = {};

					for (var key in o) {
						if (o.hasOwnProperty(key)) {
							clone[key] = _.util.clone(o[key]);
						}
					}

					return clone;

				case 'Array':
					return o.slice();
			}

			return o;
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
		 * we cannot just provide an object, we need anobject and a key.
		 * @param inside The key (or language id) of the parent
		 * @param before The key to insert before. If not provided, the function appends instead.
		 * @param insert Object with the key/value pairs to insert
		 * @param root The object that contains `inside`. If equal to Prism.languages, it can be omitted.
		 */
		insertBefore: function (inside, before, insert, root) {
			root = root || _.languages;
			var grammar = root[inside];
			
			if (arguments.length == 2) {
				insert = arguments[1];
				
				for (var newToken in insert) {
					if (insert.hasOwnProperty(newToken)) {
						grammar[newToken] = insert[newToken];
					}
				}
				
				return grammar;
			}
			
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

					ret[token] = grammar[token];
				}
			}
			
			// Update references in other language definitions
			_.languages.DFS(_.languages, function(key, value) {
				if (value === root[inside] && key != inside) {
					this[key] = ret;
				}
			});

			return root[inside] = ret;
		},

		// Traverse a language definition with Depth First Search
		DFS: function(o, callback, type) {
			for (var i in o) {
				if (o.hasOwnProperty(i)) {
					callback.call(o, i, o[i], type || i);

					if (_.util.type(o[i]) === 'Object') {
						_.languages.DFS(o[i], callback);
					}
					else if (_.util.type(o[i]) === 'Array') {
						_.languages.DFS(o[i], callback, i);
					}
				}
			}
		}
	},

	highlightAll: function(async, callback) {
		var elements = document.querySelectorAll('code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code');

		for (var i=0, element; element = elements[i++];) {
			_.highlightElement(element, async === true, callback);
		}
	},

	highlightElement: function(element, async, callback) {
		// Find language
		var language, grammar, parent = element;

		while (parent && !lang.test(parent.className)) {
			parent = parent.parentNode;
		}

		if (parent) {
			language = (parent.className.match(lang) || [,''])[1];
			grammar = _.languages[language];
		}

		if (!grammar) {
			return;
		}

		// Set language on the element, if not present
		element.className = element.className.replace(lang, '').replace(/\s+/g, ' ') + ' language-' + language;

		// Set language on the parent, for styling
		parent = element.parentNode;

		if (/pre/i.test(parent.nodeName)) {
			parent.className = parent.className.replace(lang, '').replace(/\s+/g, ' ') + ' language-' + language;
		}

		var code = element.textContent;

		if(!code) {
			return;
		}

		var env = {
			element: element,
			language: language,
			grammar: grammar,
			code: code
		};

		_.hooks.run('before-highlight', env);

		if (async && self.Worker) {
			var worker = new Worker(_.filename);

			worker.onmessage = function(evt) {
				env.highlightedCode = Token.stringify(JSON.parse(evt.data), language);

				_.hooks.run('before-insert', env);

				env.element.innerHTML = env.highlightedCode;

				callback && callback.call(env.element);
				_.hooks.run('after-highlight', env);
			};

			worker.postMessage(JSON.stringify({
				language: env.language,
				code: env.code
			}));
		}
		else {
			env.highlightedCode = _.highlight(env.code, env.grammar, env.language)

			_.hooks.run('before-insert', env);

			env.element.innerHTML = env.highlightedCode;

			callback && callback.call(element);

			_.hooks.run('after-highlight', env);
		}
	},

	highlight: function (text, grammar, language) {
		var tokens = _.tokenize(text, grammar);
		return Token.stringify(_.util.encode(tokens), language);
	},

	tokenize: function(text, grammar, language) {
		var Token = _.Token;

		var strarr = [text];

		var rest = grammar.rest;

		if (rest) {
			for (var token in rest) {
				grammar[token] = rest[token];
			}

			delete grammar.rest;
		}

		tokenloop: for (var token in grammar) {
			if(!grammar.hasOwnProperty(token) || !grammar[token]) {
				continue;
			}

			var patterns = grammar[token];
			patterns = (_.util.type(patterns) === "Array") ? patterns : [patterns];

			for (var j = 0; j < patterns.length; ++j) {
				var pattern = patterns[j],
					inside = pattern.inside,
					lookbehind = !!pattern.lookbehind,
					lookbehindLength = 0,
					alias = pattern.alias;

				pattern = pattern.pattern || pattern;

				for (var i=0; i<strarr.length; i++) { // Don’t cache length as it changes during the loop

					var str = strarr[i];

					if (strarr.length > text.length) {
						// Something went terribly wrong, ABORT, ABORT!
						break tokenloop;
					}

					if (str instanceof Token) {
						continue;
					}

					pattern.lastIndex = 0;

					var match = pattern.exec(str);

					if (match) {
						if(lookbehind) {
							lookbehindLength = match[1].length;
						}

						var from = match.index - 1 + lookbehindLength,
							match = match[0].slice(lookbehindLength),
							len = match.length,
							to = from + len,
							before = str.slice(0, from + 1),
							after = str.slice(to + 1);

						var args = [i, 1];

						if (before) {
							args.push(before);
						}

						var wrapped = new Token(token, inside? _.tokenize(match, inside) : match, alias);

						args.push(wrapped);

						if (after) {
							args.push(after);
						}

						Array.prototype.splice.apply(strarr, args);
					}
				}
			}
		}

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
	}
};

var Token = _.Token = function(type, content, alias) {
	this.type = type;
	this.content = content;
	this.alias = alias;
};

Token.stringify = function(o, language, parent) {
	if (typeof o == 'string') {
		return o;
	}

	if (Object.prototype.toString.call(o) == '[object Array]') {
		return o.map(function(element) {
			return Token.stringify(element, language, o);
		}).join('');
	}

	var env = {
		type: o.type,
		content: Token.stringify(o.content, language, parent),
		tag: 'span',
		classes: ['token', o.type],
		attributes: {},
		language: language,
		parent: parent
	};

	if (env.type == 'comment') {
		env.attributes['spellcheck'] = 'true';
	}

	if (o.alias) {
		var aliases = _.util.type(o.alias) === 'Array' ? o.alias : [o.alias];
		Array.prototype.push.apply(env.classes, aliases);
	}

	_.hooks.run('wrap', env);

	var attributes = '';

	for (var name in env.attributes) {
		attributes += name + '="' + (env.attributes[name] || '') + '"';
	}

	return '<' + env.tag + ' class="' + env.classes.join(' ') + '" ' + attributes + '>' + env.content + '</' + env.tag + '>';

};

if (!self.document) {
	if (!self.addEventListener) {
		// in Node.js
		return self.Prism;
	}
 	// In worker
	self.addEventListener('message', function(evt) {
		var message = JSON.parse(evt.data),
		    lang = message.language,
		    code = message.code;

		self.postMessage(JSON.stringify(_.util.encode(_.tokenize(code, _.languages[lang]))));
		self.close();
	}, false);

	return self.Prism;
}

// Get current script and highlight
var script = document.getElementsByTagName('script');

script = script[script.length - 1];

if (script) {
	_.filename = script.src;

	if (document.addEventListener && !script.hasAttribute('data-manual')) {
		document.addEventListener('DOMContentLoaded', _.highlightAll);
	}
}

return self.Prism;

})();

if (typeof module !== 'undefined' && module.exports) {
	module.exports = Prism;
}

Prism.languages.markup = {
	'comment': /<!--[\w\W]*?-->/g,
	'prolog': /<\?.+?\?>/,
	'doctype': /<!DOCTYPE.+?>/,
	'cdata': /<!\[CDATA\[[\w\W]*?]]>/i,
	'tag': {
		pattern: /<\/?[\w:-]+\s*(?:\s+[\w:-]+(?:=(?:("|')(\\?[\w\W])*?\1|[^\s'">=]+))?\s*)*\/?>/gi,
		inside: {
			'tag': {
				pattern: /^<\/?[\w:-]+/i,
				inside: {
					'punctuation': /^<\/?/,
					'namespace': /^[\w-]+?:/
				}
			},
			'attr-value': {
				pattern: /=(?:('|")[\w\W]*?(\1)|[^\s>]+)/gi,
				inside: {
					'punctuation': /=|>|"/g
				}
			},
			'punctuation': /\/?>/g,
			'attr-name': {
				pattern: /[\w:-]+/g,
				inside: {
					'namespace': /^[\w-]+?:/
				}
			}

		}
	},
	'entity': /\&#?[\da-z]{1,8};/gi
};

// Plugin to make entity title show the real entity, idea by Roman Komarov
Prism.hooks.add('wrap', function(env) {

	if (env.type === 'entity') {
		env.attributes['title'] = env.content.replace(/&amp;/, '&');
	}
});

Prism.languages.clike = {
	'comment': [
		{
			pattern: /(^|[^\\])\/\*[\w\W]*?\*\//g,
			lookbehind: true
		},
		{
			pattern: /(^|[^\\:])\/\/.*?(\r?\n|$)/g,
			lookbehind: true
		}
	],
	'string': /("|')(\\?.)*?\1/g,
	'class-name': {
		pattern: /((?:(?:class|interface|extends|implements|trait|instanceof|new)\s+)|(?:catch\s+\())[a-z0-9_\.\\]+/ig,
		lookbehind: true,
		inside: {
			punctuation: /(\.|\\)/
		}
	},
	'keyword': /\b(if|else|while|do|for|return|in|instanceof|function|new|try|throw|catch|finally|null|break|continue)\b/g,
	'boolean': /\b(true|false)\b/g,
	'function': {
		pattern: /[a-z0-9_]+\(/ig,
		inside: {
			punctuation: /\(/
		}
	},
	'number': /\b-?(0x[\dA-Fa-f]+|\d*\.?\d+([Ee]-?\d+)?)\b/g,
	'operator': /[-+]{1,2}|!|<=?|>=?|={1,3}|&{1,2}|\|?\||\?|\*|\/|\~|\^|\%/g,
	'ignore': /&(lt|gt|amp);/gi,
	'punctuation': /[{}[\];(),.:]/g
};

Prism.languages.apacheconf = {
	'comment': /\#.*/g,
	'directive-inline': {
		pattern: /^\s*\b(AcceptFilter|AcceptPathInfo|AccessFileName|Action|AddAlt|AddAltByEncoding|AddAltByType|AddCharset|AddDefaultCharset|AddDescription|AddEncoding|AddHandler|AddIcon|AddIconByEncoding|AddIconByType|AddInputFilter|AddLanguage|AddModuleInfo|AddOutputFilter|AddOutputFilterByType|AddType|Alias|AliasMatch|Allow|AllowCONNECT|AllowEncodedSlashes|AllowMethods|AllowOverride|AllowOverrideList|Anonymous|Anonymous_LogEmail|Anonymous_MustGiveEmail|Anonymous_NoUserID|Anonymous_VerifyEmail|AsyncRequestWorkerFactor|AuthBasicAuthoritative|AuthBasicFake|AuthBasicProvider|AuthBasicUseDigestAlgorithm|AuthDBDUserPWQuery|AuthDBDUserRealmQuery|AuthDBMGroupFile|AuthDBMType|AuthDBMUserFile|AuthDigestAlgorithm|AuthDigestDomain|AuthDigestNonceLifetime|AuthDigestProvider|AuthDigestQop|AuthDigestShmemSize|AuthFormAuthoritative|AuthFormBody|AuthFormDisableNoStore|AuthFormFakeBasicAuth|AuthFormLocation|AuthFormLoginRequiredLocation|AuthFormLoginSuccessLocation|AuthFormLogoutLocation|AuthFormMethod|AuthFormMimetype|AuthFormPassword|AuthFormProvider|AuthFormSitePassphrase|AuthFormSize|AuthFormUsername|AuthGroupFile|AuthLDAPAuthorizePrefix|AuthLDAPBindAuthoritative|AuthLDAPBindDN|AuthLDAPBindPassword|AuthLDAPCharsetConfig|AuthLDAPCompareAsUser|AuthLDAPCompareDNOnServer|AuthLDAPDereferenceAliases|AuthLDAPGroupAttribute|AuthLDAPGroupAttributeIsDN|AuthLDAPInitialBindAsUser|AuthLDAPInitialBindPattern|AuthLDAPMaxSubGroupDepth|AuthLDAPRemoteUserAttribute|AuthLDAPRemoteUserIsDN|AuthLDAPSearchAsUser|AuthLDAPSubGroupAttribute|AuthLDAPSubGroupClass|AuthLDAPUrl|AuthMerging|AuthName|AuthnCacheContext|AuthnCacheEnable|AuthnCacheProvideFor|AuthnCacheSOCache|AuthnCacheTimeout|AuthnzFcgiCheckAuthnProvider|AuthnzFcgiDefineProvider|AuthType|AuthUserFile|AuthzDBDLoginToReferer|AuthzDBDQuery|AuthzDBDRedirectQuery|AuthzDBMType|AuthzSendForbiddenOnFailure|BalancerGrowth|BalancerInherit|BalancerMember|BalancerPersist|BrowserMatch|BrowserMatchNoCase|BufferedLogs|BufferSize|CacheDefaultExpire|CacheDetailHeader|CacheDirLength|CacheDirLevels|CacheDisable|CacheEnable|CacheFile|CacheHeader|CacheIgnoreCacheControl|CacheIgnoreHeaders|CacheIgnoreNoLastMod|CacheIgnoreQueryString|CacheIgnoreURLSessionIdentifiers|CacheKeyBaseURL|CacheLastModifiedFactor|CacheLock|CacheLockMaxAge|CacheLockPath|CacheMaxExpire|CacheMaxFileSize|CacheMinExpire|CacheMinFileSize|CacheNegotiatedDocs|CacheQuickHandler|CacheReadSize|CacheReadTime|CacheRoot|CacheSocache|CacheSocacheMaxSize|CacheSocacheMaxTime|CacheSocacheMinTime|CacheSocacheReadSize|CacheSocacheReadTime|CacheStaleOnError|CacheStoreExpired|CacheStoreNoStore|CacheStorePrivate|CGIDScriptTimeout|CGIMapExtension|CharsetDefault|CharsetOptions|CharsetSourceEnc|CheckCaseOnly|CheckSpelling|ChrootDir|ContentDigest|CookieDomain|CookieExpires|CookieName|CookieStyle|CookieTracking|CoreDumpDirectory|CustomLog|Dav|DavDepthInfinity|DavGenericLockDB|DavLockDB|DavMinTimeout|DBDExptime|DBDInitSQL|DBDKeep|DBDMax|DBDMin|DBDParams|DBDPersist|DBDPrepareSQL|DBDriver|DefaultIcon|DefaultLanguage|DefaultRuntimeDir|DefaultType|Define|DeflateBufferSize|DeflateCompressionLevel|DeflateFilterNote|DeflateInflateLimitRequestBody|DeflateInflateRatioBurst|DeflateInflateRatioLimit|DeflateMemLevel|DeflateWindowSize|Deny|DirectoryCheckHandler|DirectoryIndex|DirectoryIndexRedirect|DirectorySlash|DocumentRoot|DTracePrivileges|DumpIOInput|DumpIOOutput|EnableExceptionHook|EnableMMAP|EnableSendfile|Error|ErrorDocument|ErrorLog|ErrorLogFormat|Example|ExpiresActive|ExpiresByType|ExpiresDefault|ExtendedStatus|ExtFilterDefine|ExtFilterOptions|FallbackResource|FileETag|FilterChain|FilterDeclare|FilterProtocol|FilterProvider|FilterTrace|ForceLanguagePriority|ForceType|ForensicLog|GprofDir|GracefulShutdownTimeout|Group|Header|HeaderName|HeartbeatAddress|HeartbeatListen|HeartbeatMaxServers|HeartbeatStorage|HeartbeatStorage|HostnameLookups|IdentityCheck|IdentityCheckTimeout|ImapBase|ImapDefault|ImapMenu|Include|IncludeOptional|IndexHeadInsert|IndexIgnore|IndexIgnoreReset|IndexOptions|IndexOrderDefault|IndexStyleSheet|InputSed|ISAPIAppendLogToErrors|ISAPIAppendLogToQuery|ISAPICacheFile|ISAPIFakeAsync|ISAPILogNotSupported|ISAPIReadAheadBuffer|KeepAlive|KeepAliveTimeout|KeptBodySize|LanguagePriority|LDAPCacheEntries|LDAPCacheTTL|LDAPConnectionPoolTTL|LDAPConnectionTimeout|LDAPLibraryDebug|LDAPOpCacheEntries|LDAPOpCacheTTL|LDAPReferralHopLimit|LDAPReferrals|LDAPRetries|LDAPRetryDelay|LDAPSharedCacheFile|LDAPSharedCacheSize|LDAPTimeout|LDAPTrustedClientCert|LDAPTrustedGlobalCert|LDAPTrustedMode|LDAPVerifyServerCert|LimitInternalRecursion|LimitRequestBody|LimitRequestFields|LimitRequestFieldSize|LimitRequestLine|LimitXMLRequestBody|Listen|ListenBackLog|LoadFile|LoadModule|LogFormat|LogLevel|LogMessage|LuaAuthzProvider|LuaCodeCache|LuaHookAccessChecker|LuaHookAuthChecker|LuaHookCheckUserID|LuaHookFixups|LuaHookInsertFilter|LuaHookLog|LuaHookMapToStorage|LuaHookTranslateName|LuaHookTypeChecker|LuaInherit|LuaInputFilter|LuaMapHandler|LuaOutputFilter|LuaPackageCPath|LuaPackagePath|LuaQuickHandler|LuaRoot|LuaScope|MaxConnectionsPerChild|MaxKeepAliveRequests|MaxMemFree|MaxRangeOverlaps|MaxRangeReversals|MaxRanges|MaxRequestWorkers|MaxSpareServers|MaxSpareThreads|MaxThreads|MergeTrailers|MetaDir|MetaFiles|MetaSuffix|MimeMagicFile|MinSpareServers|MinSpareThreads|MMapFile|ModemStandard|ModMimeUsePathInfo|MultiviewsMatch|Mutex|NameVirtualHost|NoProxy|NWSSLTrustedCerts|NWSSLUpgradeable|Options|Order|OutputSed|PassEnv|PidFile|PrivilegesMode|Protocol|ProtocolEcho|ProxyAddHeaders|ProxyBadHeader|ProxyBlock|ProxyDomain|ProxyErrorOverride|ProxyExpressDBMFile|ProxyExpressDBMType|ProxyExpressEnable|ProxyFtpDirCharset|ProxyFtpEscapeWildcards|ProxyFtpListOnWildcard|ProxyHTMLBufSize|ProxyHTMLCharsetOut|ProxyHTMLDocType|ProxyHTMLEnable|ProxyHTMLEvents|ProxyHTMLExtended|ProxyHTMLFixups|ProxyHTMLInterp|ProxyHTMLLinks|ProxyHTMLMeta|ProxyHTMLStripComments|ProxyHTMLURLMap|ProxyIOBufferSize|ProxyMaxForwards|ProxyPass|ProxyPassInherit|ProxyPassInterpolateEnv|ProxyPassMatch|ProxyPassReverse|ProxyPassReverseCookieDomain|ProxyPassReverseCookiePath|ProxyPreserveHost|ProxyReceiveBufferSize|ProxyRemote|ProxyRemoteMatch|ProxyRequests|ProxySCGIInternalRedirect|ProxySCGISendfile|ProxySet|ProxySourceAddress|ProxyStatus|ProxyTimeout|ProxyVia|ReadmeName|ReceiveBufferSize|Redirect|RedirectMatch|RedirectPermanent|RedirectTemp|ReflectorHeader|RemoteIPHeader|RemoteIPInternalProxy|RemoteIPInternalProxyList|RemoteIPProxiesHeader|RemoteIPTrustedProxy|RemoteIPTrustedProxyList|RemoveCharset|RemoveEncoding|RemoveHandler|RemoveInputFilter|RemoveLanguage|RemoveOutputFilter|RemoveType|RequestHeader|RequestReadTimeout|Require|RewriteBase|RewriteCond|RewriteEngine|RewriteMap|RewriteOptions|RewriteRule|RLimitCPU|RLimitMEM|RLimitNPROC|Satisfy|ScoreBoardFile|Script|ScriptAlias|ScriptAliasMatch|ScriptInterpreterSource|ScriptLog|ScriptLogBuffer|ScriptLogLength|ScriptSock|SecureListen|SeeRequestTail|SendBufferSize|ServerAdmin|ServerAlias|ServerLimit|ServerName|ServerPath|ServerRoot|ServerSignature|ServerTokens|Session|SessionCookieName|SessionCookieName2|SessionCookieRemove|SessionCryptoCipher|SessionCryptoDriver|SessionCryptoPassphrase|SessionCryptoPassphraseFile|SessionDBDCookieName|SessionDBDCookieName2|SessionDBDCookieRemove|SessionDBDDeleteLabel|SessionDBDInsertLabel|SessionDBDPerUser|SessionDBDSelectLabel|SessionDBDUpdateLabel|SessionEnv|SessionExclude|SessionHeader|SessionInclude|SessionMaxAge|SetEnv|SetEnvIf|SetEnvIfExpr|SetEnvIfNoCase|SetHandler|SetInputFilter|SetOutputFilter|SSIEndTag|SSIErrorMsg|SSIETag|SSILastModified|SSILegacyExprParser|SSIStartTag|SSITimeFormat|SSIUndefinedEcho|SSLCACertificateFile|SSLCACertificatePath|SSLCADNRequestFile|SSLCADNRequestPath|SSLCARevocationCheck|SSLCARevocationFile|SSLCARevocationPath|SSLCertificateChainFile|SSLCertificateFile|SSLCertificateKeyFile|SSLCipherSuite|SSLCompression|SSLCryptoDevice|SSLEngine|SSLFIPS|SSLHonorCipherOrder|SSLInsecureRenegotiation|SSLOCSPDefaultResponder|SSLOCSPEnable|SSLOCSPOverrideResponder|SSLOCSPResponderTimeout|SSLOCSPResponseMaxAge|SSLOCSPResponseTimeSkew|SSLOCSPUseRequestNonce|SSLOpenSSLConfCmd|SSLOptions|SSLPassPhraseDialog|SSLProtocol|SSLProxyCACertificateFile|SSLProxyCACertificatePath|SSLProxyCARevocationCheck|SSLProxyCARevocationFile|SSLProxyCARevocationPath|SSLProxyCheckPeerCN|SSLProxyCheckPeerExpire|SSLProxyCheckPeerName|SSLProxyCipherSuite|SSLProxyEngine|SSLProxyMachineCertificateChainFile|SSLProxyMachineCertificateFile|SSLProxyMachineCertificatePath|SSLProxyProtocol|SSLProxyVerify|SSLProxyVerifyDepth|SSLRandomSeed|SSLRenegBufferSize|SSLRequire|SSLRequireSSL|SSLSessionCache|SSLSessionCacheTimeout|SSLSessionTicketKeyFile|SSLSRPUnknownUserSeed|SSLSRPVerifierFile|SSLStaplingCache|SSLStaplingErrorCacheTimeout|SSLStaplingFakeTryLater|SSLStaplingForceURL|SSLStaplingResponderTimeout|SSLStaplingResponseMaxAge|SSLStaplingResponseTimeSkew|SSLStaplingReturnResponderErrors|SSLStaplingStandardCacheTimeout|SSLStrictSNIVHostCheck|SSLUserName|SSLUseStapling|SSLVerifyClient|SSLVerifyDepth|StartServers|StartThreads|Substitute|Suexec|SuexecUserGroup|ThreadLimit|ThreadsPerChild|ThreadStackSize|TimeOut|TraceEnable|TransferLog|TypesConfig|UnDefine|UndefMacro|UnsetEnv|Use|UseCanonicalName|UseCanonicalPhysicalPort|User|UserDir|VHostCGIMode|VHostCGIPrivs|VHostGroup|VHostPrivs|VHostSecure|VHostUser|VirtualDocumentRoot|VirtualDocumentRootIP|VirtualScriptAlias|VirtualScriptAliasIP|WatchdogInterval|XBitHack|xml2EncAlias|xml2EncDefault|xml2StartParse)\b/gmi,
		alias: 'property'
	},
	'directive-block': {
		pattern: /<\/?\b(AuthnProviderAlias|AuthzProviderAlias|Directory|DirectoryMatch|Else|ElseIf|Files|FilesMatch|If|IfDefine|IfModule|IfVersion|Limit|LimitExcept|Location|LocationMatch|Macro|Proxy|RequireAll|RequireAny|RequireNone|VirtualHost)\b *.*>/gi,
		inside: {
			'directive-block': {
				pattern: /^<\/?\w+/,
				inside: {
					'punctuation': /^<\/?/
				},
				alias: 'tag'
			},
			'directive-block-parameter': {
				pattern: /.*[^>]/,
				inside: {
					'punctuation': /:/,
					'string': {
						pattern: /("|').*\1/g,
						inside: {
							'variable': /(\$|%)\{?(\w\.?(\+|\-|:)?)+\}?/g
						}
					}
				},
				alias: 'attr-value'
			},
			'punctuation': />/
		},
		alias: 'tag'
	},
	'directive-flags': {
		pattern: /\[(\w,?)+\]/g,
		alias: 'keyword'
	},
	'string': {
		pattern: /("|').*\1/g,
		inside: {
			'variable': /(\$|%)\{?(\w\.?(\+|\-|:)?)+\}?/g
		}
	},
	'variable': /(\$|%)\{?(\w\.?(\+|\-|:)?)+\}?/g,
	'regex': /\^?.*\$|\^.*\$?/g
};

Prism.languages.java = Prism.languages.extend('clike', {
	'keyword': /\b(abstract|continue|for|new|switch|assert|default|goto|package|synchronized|boolean|do|if|private|this|break|double|implements|protected|throw|byte|else|import|public|throws|case|enum|instanceof|return|transient|catch|extends|int|short|try|char|final|interface|static|void|class|finally|long|strictfp|volatile|const|float|native|super|while)\b/g,
	'number': /\b0b[01]+\b|\b0x[\da-f]*\.?[\da-fp\-]+\b|\b\d*\.?\d+[e]?[\d]*[df]\b|\W\d*\.?\d+\b/gi,
	'operator': {
		pattern: /(^|[^\.])(?:\+=|\+\+?|-=|--?|!=?|<{1,2}=?|>{1,3}=?|==?|&=|&&?|\|=|\|\|?|\?|\*=?|\/=?|%=?|\^=?|:|~)/gm,
		lookbehind: true
	}
});
Prism.languages.python= { 
	'comment': {
		pattern: /(^|[^\\])#.*?(\r?\n|$)/g,
		lookbehind: true
	},
	'string': /"""[\s\S]+?"""|("|')(\\?.)*?\1/g,
	'keyword' : /\b(as|assert|break|class|continue|def|del|elif|else|except|exec|finally|for|from|global|if|import|in|is|lambda|pass|print|raise|return|try|while|with|yield)\b/g,
	'boolean' : /\b(True|False)\b/g,
	'number' : /\b-?(0x)?\d*\.?[\da-f]+\b/g,
	'operator' : /[-+]{1,2}|=?&lt;|=?&gt;|!|={1,2}|(&){1,2}|(&amp;){1,2}|\|?\||\?|\*|\/|~|\^|%|\b(or|and|not)\b/g,
	'ignore' : /&(lt|gt|amp);/gi,
	'punctuation' : /[{}[\];(),.:]/g
};


Prism.languages.aspnet = Prism.languages.extend('markup', {
	'page-directive tag': {
		pattern: /<%\s*@.*%>/gi,
		inside: {
			'page-directive tag': /<%\s*@\s*(?:Assembly|Control|Implements|Import|Master|MasterType|OutputCache|Page|PreviousPageType|Reference|Register)?|%>/ig,
			rest: Prism.languages.markup.tag.inside
		}
	},
	'directive tag': {
		pattern: /<%.*%>/gi,
		inside: {
			'directive tag': /<%\s*?[$=%#:]{0,2}|%>/gi,
			rest: Prism.languages.csharp
		}
	}
});

// match directives of attribute value foo="<% Bar %>"
Prism.languages.insertBefore('inside', 'punctuation', {
	'directive tag': Prism.languages.aspnet['directive tag']
}, Prism.languages.aspnet.tag.inside["attr-value"]);

Prism.languages.insertBefore('aspnet', 'comment', {
	'asp comment': /<%--[\w\W]*?--%>/g
});

// script runat="server" contains csharp, not javascript
Prism.languages.insertBefore('aspnet', Prism.languages.javascript ? 'script' : 'tag', {
	'asp script': {
		pattern: /<script(?=.*runat=['"]?server['"]?)[\w\W]*?>[\w\W]*?<\/script>/ig,
		inside: {
			tag: {
				pattern: /<\/?script\s*(?:\s+[\w:-]+(?:=(?:("|')(\\?[\w\W])*?\1|\w+))?\s*)*\/?>/gi,
				inside: Prism.languages.aspnet.tag.inside
			},
			rest: Prism.languages.csharp || {}
		}
	}
});

// Hacks to fix eager tag matching finishing too early: <script src="<% Foo.Bar %>"> => <script src="<% Foo.Bar %>
if ( Prism.languages.aspnet.style ) {
	Prism.languages.aspnet.style.inside.tag.pattern = /<\/?style\s*(?:\s+[\w:-]+(?:=(?:("|')(\\?[\w\W])*?\1|\w+))?\s*)*\/?>/gi;
	Prism.languages.aspnet.style.inside.tag.inside = Prism.languages.aspnet.tag.inside;
}
if ( Prism.languages.aspnet.script ) {
	Prism.languages.aspnet.script.inside.tag.pattern = Prism.languages.aspnet['asp script'].inside.tag.pattern
	Prism.languages.aspnet.script.inside.tag.inside = Prism.languages.aspnet.tag.inside;
}
Prism.languages.css = {
	'comment': /\/\*[\w\W]*?\*\//g,
	'atrule': {
		pattern: /@[\w-]+?.*?(;|(?=\s*{))/gi,
		inside: {
			'punctuation': /[;:]/g
		}
	},
	'url': /url\((["']?).*?\1\)/gi,
	'selector': /[^\{\}\s][^\{\};]*(?=\s*\{)/g,
	'property': /(\b|\B)[\w-]+(?=\s*:)/ig,
	'string': /("|')(\\?.)*?\1/g,
	'important': /\B!important\b/gi,
	'punctuation': /[\{\};:]/g,
	'function': /[-a-z0-9]+(?=\()/ig
};

if (Prism.languages.markup) {
	Prism.languages.insertBefore('markup', 'tag', {
		'style': {
			pattern: /<style[\w\W]*?>[\w\W]*?<\/style>/ig,
			inside: {
				'tag': {
					pattern: /<style[\w\W]*?>|<\/style>/ig,
					inside: Prism.languages.markup.tag.inside
				},
				rest: Prism.languages.css
			},
			alias: 'language-css'
		}
	});
	
	Prism.languages.insertBefore('inside', 'attr-value', {
		'style-attr': {
			pattern: /\s*style=("|').+?\1/ig,
			inside: {
				'attr-name': {
					pattern: /^\s*style/ig,
					inside: Prism.languages.markup.tag.inside
				},
				'punctuation': /^\s*=\s*['"]|['"]\s*$/,
				'attr-value': {
					pattern: /.+/gi,
					inside: Prism.languages.css
				}
			},
			alias: 'language-css'
		}
	}, Prism.languages.markup.tag);
}
Prism.languages.javascript = Prism.languages.extend('clike', {
	'keyword': /\b(break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|finally|for|function|get|if|implements|import|in|instanceof|interface|let|new|null|package|private|protected|public|return|set|static|super|switch|this|throw|true|try|typeof|var|void|while|with|yield)\b/g,
	'number': /\b-?(0x[\dA-Fa-f]+|\d*\.?\d+([Ee]-?\d+)?|NaN|-?Infinity)\b/g
});

Prism.languages.insertBefore('javascript', 'keyword', {
	'regex': {
		pattern: /(^|[^/])\/(?!\/)(\[.+?]|\\.|[^/\r\n])+\/[gim]{0,3}(?=\s*($|[\r\n,.;})]))/g,
		lookbehind: true
	}
});

if (Prism.languages.markup) {
	Prism.languages.insertBefore('markup', 'tag', {
		'script': {
			pattern: /<script[\w\W]*?>[\w\W]*?<\/script>/ig,
			inside: {
				'tag': {
					pattern: /<script[\w\W]*?>|<\/script>/ig,
					inside: Prism.languages.markup.tag.inside
				},
				rest: Prism.languages.javascript
			},
			alias: 'language-javascript'
		}
	});
}

Prism.languages.rip = {
	'comment': /#[^\r\n]*(\r?\n|$)/g,

	'keyword': /(?:=>|->)|\b(?:class|if|else|switch|case|return|exit|try|catch|finally|raise)\b/g,

	'builtin': /\b(@|System)\b/g,

	'boolean': /\b(true|false)\b/g,

	'date': /\b\d{4}-\d{2}-\d{2}\b/g,
	'time': /\b\d{2}:\d{2}:\d{2}\b/g,
	'datetime': /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\b/g,

	'number': /[+-]?(?:(?:\d+\.\d+)|(?:\d+))/g,

	'character': /\B`[^\s\`\'",.:;#\/\\()<>\[\]{}]\b/g,

	'regex': {
		pattern: /(^|[^/])\/(?!\/)(\[.+?]|\\.|[^/\r\n])+\/(?=\s*($|[\r\n,.;})]))/g,
		lookbehind: true
	},

	'symbol': /:[^\d\s\`\'",.:;#\/\\()<>\[\]{}][^\s\`\'",.:;#\/\\()<>\[\]{}]*/g,
	'string': /("|')(\\?.)*?\1/g,

	'punctuation': /(?:\.{2,3})|[\`,.:;=\/\\()<>\[\]{}]/,

	'reference': /[^\d\s\`\'",.:;#\/\\()<>\[\]{}][^\s\`\'",.:;#\/\\()<>\[\]{}]*/g
};

// NOTES - follows first-first highlight method, block is locked after highlight, different from SyntaxHl
Prism.languages.autohotkey= {
	'comment': {
		pattern: /(^[^";\n]*("[^"\n]*?"[^"\n]*?)*)(;.*$|^\s*\/\*[\s\S]*\n\*\/)/gm,
		lookbehind: true
	},
	'string': /"(([^"\n\r]|"")*)"/gm,
	'function': /[^\(\); \t\,\n\+\*\-\=\?>:\\\/<\&%\[\]]+?(?=\()/gm,  //function - don't use .*\) in the end bcoz string locks it
	'tag': /^[ \t]*[^\s:]+?(?=:[^:])/gm,  //labels
	'variable': /\%\w+\%/g,
	'number': /\b-?(0x[\dA-Fa-f]+|\d*\.?\d+([Ee]-?\d+)?)\b/g,
	'operator': /[\+\-\*\\\/:=\?\&\|<>]/g,
	'punctuation': /[\{}[\]\(\):]/g,
	'boolean': /\b(true|false)\b/g,

	'selector': /\b(AutoTrim|BlockInput|Break|Click|ClipWait|Continue|Control|ControlClick|ControlFocus|ControlGet|ControlGetFocus|ControlGetPos|ControlGetText|ControlMove|ControlSend|ControlSendRaw|ControlSetText|CoordMode|Critical|DetectHiddenText|DetectHiddenWindows|Drive|DriveGet|DriveSpaceFree|EnvAdd|EnvDiv|EnvGet|EnvMult|EnvSet|EnvSub|EnvUpdate|Exit|ExitApp|FileAppend|FileCopy|FileCopyDir|FileCreateDir|FileCreateShortcut|FileDelete|FileEncoding|FileGetAttrib|FileGetShortcut|FileGetSize|FileGetTime|FileGetVersion|FileInstall|FileMove|FileMoveDir|FileRead|FileReadLine|FileRecycle|FileRecycleEmpty|FileRemoveDir|FileSelectFile|FileSelectFolder|FileSetAttrib|FileSetTime|FormatTime|GetKeyState|Gosub|Goto|GroupActivate|GroupAdd|GroupClose|GroupDeactivate|Gui|GuiControl|GuiControlGet|Hotkey|ImageSearch|IniDelete|IniRead|IniWrite|Input|InputBox|KeyWait|ListHotkeys|ListLines|ListVars|Loop|Menu|MouseClick|MouseClickDrag|MouseGetPos|MouseMove|MsgBox|OnExit|OutputDebug|Pause|PixelGetColor|PixelSearch|PostMessage|Process|Progress|Random|RegDelete|RegRead|RegWrite|Reload|Repeat|Return|Run|RunAs|RunWait|Send|SendEvent|SendInput|SendMessage|SendMode|SendPlay|SendRaw|SetBatchLines|SetCapslockState|SetControlDelay|SetDefaultMouseSpeed|SetEnv|SetFormat|SetKeyDelay|SetMouseDelay|SetNumlockState|SetScrollLockState|SetStoreCapslockMode|SetTimer|SetTitleMatchMode|SetWinDelay|SetWorkingDir|Shutdown|Sleep|Sort|SoundBeep|SoundGet|SoundGetWaveVolume|SoundPlay|SoundSet|SoundSetWaveVolume|SplashImage|SplashTextOff|SplashTextOn|SplitPath|StatusBarGetText|StatusBarWait|StringCaseSense|StringGetPos|StringLeft|StringLen|StringLower|StringMid|StringReplace|StringRight|StringSplit|StringTrimLeft|StringTrimRight|StringUpper|Suspend|SysGet|Thread|ToolTip|Transform|TrayTip|URLDownloadToFile|WinActivate|WinActivateBottom|WinClose|WinGet|WinGetActiveStats|WinGetActiveTitle|WinGetClass|WinGetPos|WinGetText|WinGetTitle|WinHide|WinKill|WinMaximize|WinMenuSelectItem|WinMinimize|WinMinimizeAll|WinMinimizeAllUndo|WinMove|WinRestore|WinSet|WinSetTitle|WinShow|WinWait|WinWaitActive|WinWaitClose|WinWaitNotActive)\b/i,

	'constant': /\b(a_ahkpath|a_ahkversion|a_appdata|a_appdatacommon|a_autotrim|a_batchlines|a_caretx|a_carety|a_computername|a_controldelay|a_cursor|a_dd|a_ddd|a_dddd|a_defaultmousespeed|a_desktop|a_desktopcommon|a_detecthiddentext|a_detecthiddenwindows|a_endchar|a_eventinfo|a_exitreason|a_formatfloat|a_formatinteger|a_gui|a_guievent|a_guicontrol|a_guicontrolevent|a_guiheight|a_guiwidth|a_guix|a_guiy|a_hour|a_iconfile|a_iconhidden|a_iconnumber|a_icontip|a_index|a_ipaddress1|a_ipaddress2|a_ipaddress3|a_ipaddress4|a_isadmin|a_iscompiled|a_iscritical|a_ispaused|a_issuspended|a_isunicode|a_keydelay|a_language|a_lasterror|a_linefile|a_linenumber|a_loopfield|a_loopfileattrib|a_loopfiledir|a_loopfileext|a_loopfilefullpath|a_loopfilelongpath|a_loopfilename|a_loopfileshortname|a_loopfileshortpath|a_loopfilesize|a_loopfilesizekb|a_loopfilesizemb|a_loopfiletimeaccessed|a_loopfiletimecreated|a_loopfiletimemodified|a_loopreadline|a_loopregkey|a_loopregname|a_loopregsubkey|a_loopregtimemodified|a_loopregtype|a_mday|a_min|a_mm|a_mmm|a_mmmm|a_mon|a_mousedelay|a_msec|a_mydocuments|a_now|a_nowutc|a_numbatchlines|a_ostype|a_osversion|a_priorhotkey|programfiles|a_programfiles|a_programs|a_programscommon|a_screenheight|a_screenwidth|a_scriptdir|a_scriptfullpath|a_scriptname|a_sec|a_space|a_startmenu|a_startmenucommon|a_startup|a_startupcommon|a_stringcasesense|a_tab|a_temp|a_thisfunc|a_thishotkey|a_thislabel|a_thismenu|a_thismenuitem|a_thismenuitempos|a_tickcount|a_timeidle|a_timeidlephysical|a_timesincepriorhotkey|a_timesincethishotkey|a_titlematchmode|a_titlematchmodespeed|a_username|a_wday|a_windelay|a_windir|a_workingdir|a_yday|a_year|a_yweek|a_yyyy|clipboard|clipboardall|comspec|errorlevel)\b/i,

	'builtin': /\b(abs|acos|asc|asin|atan|ceil|chr|class|cos|dllcall|exp|fileexist|Fileopen|floor|getkeystate|il_add|il_create|il_destroy|instr|substr|isfunc|islabel|IsObject|ln|log|lv_add|lv_delete|lv_deletecol|lv_getcount|lv_getnext|lv_gettext|lv_insert|lv_insertcol|lv_modify|lv_modifycol|lv_setimagelist|mod|onmessage|numget|numput|registercallback|regexmatch|regexreplace|round|sin|tan|sqrt|strlen|sb_seticon|sb_setparts|sb_settext|strsplit|tv_add|tv_delete|tv_getchild|tv_getcount|tv_getnext|tv_get|tv_getparent|tv_getprev|tv_getselection|tv_gettext|tv_modify|varsetcapacity|winactive|winexist|__New|__Call|__Get|__Set)\b/i,

	'symbol': /\b(alt|altdown|altup|appskey|backspace|browser_back|browser_favorites|browser_forward|browser_home|browser_refresh|browser_search|browser_stop|bs|capslock|control|ctrl|ctrlbreak|ctrldown|ctrlup|del|delete|down|end|enter|esc|escape|f1|f10|f11|f12|f13|f14|f15|f16|f17|f18|f19|f2|f20|f21|f22|f23|f24|f3|f4|f5|f6|f7|f8|f9|home|ins|insert|joy1|joy10|joy11|joy12|joy13|joy14|joy15|joy16|joy17|joy18|joy19|joy2|joy20|joy21|joy22|joy23|joy24|joy25|joy26|joy27|joy28|joy29|joy3|joy30|joy31|joy32|joy4|joy5|joy6|joy7|joy8|joy9|joyaxes|joybuttons|joyinfo|joyname|joypov|joyr|joyu|joyv|joyx|joyy|joyz|lalt|launch_app1|launch_app2|launch_mail|launch_media|lbutton|lcontrol|lctrl|left|lshift|lwin|lwindown|lwinup|mbutton|media_next|media_play_pause|media_prev|media_stop|numlock|numpad0|numpad1|numpad2|numpad3|numpad4|numpad5|numpad6|numpad7|numpad8|numpad9|numpadadd|numpadclear|numpaddel|numpaddiv|numpaddot|numpaddown|numpadend|numpadenter|numpadhome|numpadins|numpadleft|numpadmult|numpadpgdn|numpadpgup|numpadright|numpadsub|numpadup|pause|pgdn|pgup|printscreen|ralt|rbutton|rcontrol|rctrl|right|rshift|rwin|rwindown|rwinup|scrolllock|shift|shiftdown|shiftup|space|tab|up|volume_down|volume_mute|volume_up|wheeldown|wheelleft|wheelright|wheelup|xbutton1|xbutton2)\b/i,

	'important': /#\b(AllowSameLineComments|ClipboardTimeout|CommentFlag|ErrorStdOut|EscapeChar|HotkeyInterval|HotkeyModifierTimeout|Hotstring|IfWinActive|IfWinExist|IfWinNotActive|IfWinNotExist|Include|IncludeAgain|InstallKeybdHook|InstallMouseHook|KeyHistory|LTrim|MaxHotkeysPerInterval|MaxMem|MaxThreads|MaxThreadsBuffer|MaxThreadsPerHotkey|NoEnv|NoTrayIcon|Persistent|SingleInstance|UseHook|WinActivateForce)\b/i,

	'keyword': /\b(Abort|AboveNormal|Add|ahk_class|ahk_group|ahk_id|ahk_pid|All|Alnum|Alpha|AltSubmit|AltTab|AltTabAndMenu|AltTabMenu|AltTabMenuDismiss|AlwaysOnTop|AutoSize|Background|BackgroundTrans|BelowNormal|between|BitAnd|BitNot|BitOr|BitShiftLeft|BitShiftRight|BitXOr|Bold|Border|Button|ByRef|Checkbox|Checked|CheckedGray|Choose|ChooseString|Click|Close|Color|ComboBox|Contains|ControlList|Count|Date|DateTime|Days|DDL|Default|Delete|DeleteAll|Delimiter|Deref|Destroy|Digit|Disable|Disabled|DropDownList|Edit|Eject|Else|Enable|Enabled|Error|Exist|Exp|Expand|ExStyle|FileSystem|First|Flash|Float|FloatFast|Focus|Font|for|global|Grid|Group|GroupBox|GuiClose|GuiContextMenu|GuiDropFiles|GuiEscape|GuiSize|Hdr|Hidden|Hide|High|HKCC|HKCR|HKCU|HKEY_CLASSES_ROOT|HKEY_CURRENT_CONFIG|HKEY_CURRENT_USER|HKEY_LOCAL_MACHINE|HKEY_USERS|HKLM|HKU|Hours|HScroll|Icon|IconSmall|ID|IDLast|If|IfEqual|IfExist|IfGreater|IfGreaterOrEqual|IfInString|IfLess|IfLessOrEqual|IfMsgBox|IfNotEqual|IfNotExist|IfNotInString|IfWinActive|IfWinExist|IfWinNotActive|IfWinNotExist|Ignore|ImageList|in|Integer|IntegerFast|Interrupt|is|italic|Join|Label|LastFound|LastFoundExist|Limit|Lines|List|ListBox|ListView|Ln|local|Lock|Logoff|Low|Lower|Lowercase|MainWindow|Margin|Maximize|MaximizeBox|MaxSize|Minimize|MinimizeBox|MinMax|MinSize|Minutes|MonthCal|Mouse|Move|Multi|NA|No|NoActivate|NoDefault|NoHide|NoIcon|NoMainWindow|norm|Normal|NoSort|NoSortHdr|NoStandard|Not|NoTab|NoTimers|Number|Off|Ok|On|OwnDialogs|Owner|Parse|Password|Picture|Pixel|Pos|Pow|Priority|ProcessName|Radio|Range|Read|ReadOnly|Realtime|Redraw|REG_BINARY|REG_DWORD|REG_EXPAND_SZ|REG_MULTI_SZ|REG_SZ|Region|Relative|Rename|Report|Resize|Restore|Retry|RGB|Right|Screen|Seconds|Section|Serial|SetLabel|ShiftAltTab|Show|Single|Slider|SortDesc|Standard|static|Status|StatusBar|StatusCD|strike|Style|Submit|SysMenu|Tab|Tab2|TabStop|Text|Theme|Tile|ToggleCheck|ToggleEnable|ToolWindow|Top|Topmost|TransColor|Transparent|Tray|TreeView|TryAgain|Type|UnCheck|underline|Unicode|Unlock|UpDown|Upper|Uppercase|UseErrorLevel|Vis|VisFirst|Visible|VScroll|Wait|WaitClose|WantCtrlA|WantF2|WantReturn|While|Wrap|Xdigit|xm|xp|xs|Yes|ym|yp|ys)\b/i
};
// TODO:
// 		- Support for outline parameters
// 		- Support for tables

Prism.languages.gherkin = {
	'comment': {
		pattern: /(^|[^\\])(\/\*[\w\W]*?\*\/|((#)|(\/\/)).*?(\r?\n|$))/g,
		lookbehind: true
	},
	'string': /("|')(\\?.)*?\1/g,
	'atrule': /\b(And|Given|When|Then|In order to|As an|I want to|As a)\b/g,
	'keyword': /\b(Scenario Outline|Scenario|Feature|Background|Story)\b/g,
};

Prism.languages.latex = {
	'comment': /%.*?(\r?\n|$)$/m,
	'string': /(\$)(\\?.)*?\1/g,
	'punctuation': /[{}]/g,
	'selector': /\\[a-z;,:\.]*/i
}
/**
 * Original by Samuel Flores
 *
 * Adds the following new token classes:
 * 		constant, builtin, variable, symbol, regex
 */
Prism.languages.ruby = Prism.languages.extend('clike', {
	'comment': /#[^\r\n]*(\r?\n|$)/g,
	'keyword': /\b(alias|and|BEGIN|begin|break|case|class|def|define_method|defined|do|each|else|elsif|END|end|ensure|false|for|if|in|module|new|next|nil|not|or|raise|redo|require|rescue|retry|return|self|super|then|throw|true|undef|unless|until|when|while|yield)\b/g,
	'builtin': /\b(Array|Bignum|Binding|Class|Continuation|Dir|Exception|FalseClass|File|Stat|File|Fixnum|Fload|Hash|Integer|IO|MatchData|Method|Module|NilClass|Numeric|Object|Proc|Range|Regexp|String|Struct|TMS|Symbol|ThreadGroup|Thread|Time|TrueClass)\b/,
	'constant': /\b[A-Z][a-zA-Z_0-9]*[?!]?\b/g
});

Prism.languages.insertBefore('ruby', 'keyword', {
	'regex': {
		pattern: /(^|[^/])\/(?!\/)(\[.+?]|\\.|[^/\r\n])+\/[gim]{0,3}(?=\s*($|[\r\n,.;})]))/g,
		lookbehind: true
	},
	'variable': /[@$]+\b[a-zA-Z_][a-zA-Z_0-9]*[?!]?\b/g,
	'symbol': /:\b[a-zA-Z_][a-zA-Z_0-9]*[?!]?\b/g
});

Prism.languages.bash = Prism.languages.extend('clike', {
	'comment': {
		pattern: /(^|[^"{\\])(#.*?(\r?\n|$))/g,
		lookbehind: true
	},
	'string': {
		//allow multiline string
		pattern: /("|')(\\?[\s\S])*?\1/g,
		inside: {
			//'property' class reused for bash variables
			'property': /\$([a-zA-Z0-9_#\?\-\*!@]+|\{[^\}]+\})/g
		}
	},
	'keyword': /\b(if|then|else|elif|fi|for|break|continue|while|in|case|function|select|do|done|until|echo|exit|return|set|declare)\b/g
});

Prism.languages.insertBefore('bash', 'keyword', {
	//'property' class reused for bash variables
	'property': /\$([a-zA-Z0-9_#\?\-\*!@]+|\{[^}]+\})/g
});
Prism.languages.insertBefore('bash', 'comment', {
	//shebang must be before comment, 'important' class from css reused
	'important': /(^#!\s*\/bin\/bash)|(^#!\s*\/bin\/sh)/g
});

Prism.languages.git = {
	/*
	 * A simple one line comment like in a git status command
	 * For instance:
	 * $ git status
	 * # On branch infinite-scroll
	 * # Your branch and 'origin/sharedBranches/frontendTeam/infinite-scroll' have diverged,
	 * # and have 1 and 2 different commits each, respectively.
	 * nothing to commit (working directory clean)
	 */
	'comment': /^#.*$/m,

	/*
	 * a string (double and simple quote)
	 */
	'string': /("|')(\\?.)*?\1/gm,

	/*
	 * a git command. It starts with a random prompt finishing by a $, then "git" then some other parameters
	 * For instance:
	 * $ git add file.txt
	 */
	'command': {
		pattern: /^.*\$ git .*$/m,
		inside: {
			/*
			 * A git command can contain a parameter starting by a single or a double dash followed by a string
			 * For instance:
			 * $ git diff --cached
			 * $ git log -p
			 */
			'parameter': /\s(--|-)\w+/m
		}
	},

	/*
	 * Coordinates displayed in a git diff command
	 * For instance:
	 * $ git diff
	 * diff --git file.txt file.txt
	 * index 6214953..1d54a52 100644
	 * --- file.txt
	 * +++ file.txt
	 * @@ -1 +1,2 @@
	 * -Here's my tetx file
	 * +Here's my text file
	 * +And this is the second line
	 */
	'coord': /^@@.*@@$/m,

	/*
	 * Regexp to match the changed lines in a git diff output. Check the example above.
	 */
	'deleted': /^-(?!-).+$/m,
	'inserted': /^\+(?!\+).+$/m,

	/*
	 * Match a "commit [SHA1]" line in a git log output.
	 * For instance:
	 * $ git log
	 * commit a11a14ef7e26f2ca62d4b35eac455ce636d0dc09
	 * Author: lgiraudel
	 * Date:   Mon Feb 17 11:18:34 2014 +0100
	 *
	 *     Add of a new line
	 */
	'commit_sha1': /^commit \w{40}$/m
};

Prism.languages.scala = Prism.languages.extend('java', {
	'keyword': /(<-|=>)|\b(abstract|case|catch|class|def|do|else|extends|final|finally|for|forSome|if|implicit|import|lazy|match|new|null|object|override|package|private|protected|return|sealed|self|super|this|throw|trait|try|type|val|var|while|with|yield)\b/g,
	'builtin': /\b(String|Int|Long|Short|Byte|Boolean|Double|Float|Char|Any|AnyRef|AnyVal|Unit|Nothing)\b/g,
	'number': /\b0x[\da-f]*\.?[\da-f\-]+\b|\b\d*\.?\d+[e]?[\d]*[dfl]?\b/gi,
	'symbol': /'([^\d\s]\w*)/g,
	'string': /(""")[\W\w]*?\1|("|\/)[\W\w]*?\2|('.')/g
});
delete Prism.languages.scala['class-name','function'];

Prism.languages.c = Prism.languages.extend('clike', {
	// allow for c multiline strings
	'string': /("|')([^\n\\\1]|\\.|\\\r*\n)*?\1/g,
	'keyword': /\b(asm|typeof|inline|auto|break|case|char|const|continue|default|do|double|else|enum|extern|float|for|goto|if|int|long|register|return|short|signed|sizeof|static|struct|switch|typedef|union|unsigned|void|volatile|while)\b/g,
	'operator': /[-+]{1,2}|!=?|<{1,2}=?|>{1,2}=?|\->|={1,2}|\^|~|%|&{1,2}|\|?\||\?|\*|\//g
});

Prism.languages.insertBefore('c', 'string', {
	// property class reused for macro statements
	'property': {
		// allow for multiline macro definitions
		// spaces after the # character compile fine with gcc
		pattern: /((^|\n)\s*)#\s*[a-z]+([^\n\\]|\\.|\\\r*\n)*/gi,
		lookbehind: true,
		inside: {
			// highlight the path of the include statement as a string
			'string': {
				pattern: /(#\s*include\s*)(<.+?>|("|')(\\?.)+?\3)/g,
				lookbehind: true,
			}
		}
	}
});

delete Prism.languages.c['class-name'];
delete Prism.languages.c['boolean'];
Prism.languages.go = Prism.languages.extend('clike', {
	'keyword': /\b(break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go(to)?|if|import|interface|map|package|range|return|select|struct|switch|type|var)\b/g,
	'builtin': /\b(bool|byte|complex(64|128)|error|float(32|64)|rune|string|u?int(8|16|32|64|)|uintptr|append|cap|close|complex|copy|delete|imag|len|make|new|panic|print(ln)?|real|recover)\b/g,
	'boolean': /\b(_|iota|nil|true|false)\b/g,
	'operator': /([(){}\[\]]|[*\/%^!]=?|\+[=+]?|-[>=-]?|\|[=|]?|>[=>]?|<(<|[=-])?|==?|&(&|=|^=?)?|\.(\.\.)?|[,;]|:=?)/g,
	'number': /\b(-?(0x[a-f\d]+|(\d+\.?\d*|\.\d+)(e[-+]?\d+)?)i?)\b/ig,
	'string': /("|'|`)(\\?.|\r|\n)*?\1/g
});
delete Prism.languages.go['class-name'];

Prism.languages.nasm = {
    'comment': /;.*$/m,
    'string': /("|'|`)(\\?.)*?\1/gm,
    'label': {
        pattern: /^\s*[A-Za-z\._\?\$][\w\.\?\$@~#]*:/m,
        alias: 'function'
    },
    'keyword': [
        /\[?BITS (16|32|64)\]?/m,
        /^\s*section\s*[a-zA-Z\.]+:?/im,
        /(?:extern|global)[^;]*/im,
        /(?:CPU|FLOAT|DEFAULT).*$/m,
    ],
    'register': {
        pattern: /\b(?:st\d|[xyz]mm\d\d?|[cdt]r\d|r\d\d?[bwd]?|[er]?[abcd]x|[abcd][hl]|[er]?(bp|sp|si|di)|[cdefgs]s)\b/gi, 
        alias: 'variable'
    },
    'number': /(\b|-|(?=\$))(0[hHxX][\dA-Fa-f]*\.?[\dA-Fa-f]+([pP][+-]?\d+)?|\d[\dA-Fa-f]+[hHxX]|\$\d[\dA-Fa-f]*|0[oOqQ][0-7]+|[0-7]+[oOqQ]|0[bByY][01]+|[01]+[bByY]|0[dDtT]\d+|\d+[dDtT]?|\d*\.?\d+([Ee][+-]?\d+)?)\b/g,
    'operator': /[\[\]\*+\-\/%<>=&|\$!]/gm
};

Prism.languages.scheme = {
    'boolean' : /#(t|f){1}/,
    'comment' : /;.*/,
    'keyword' : {
	pattern : /([(])(define(-syntax|-library|-values)?|(case-)?lambda|let(-values|(rec)?(\*)?)?|else|if|cond|begin|delay|delay-force|parameterize|guard|set!|(quasi-)?quote|syntax-rules)/,
	lookbehind : true
    },
    'builtin' : {
	pattern :  /([(])(cons|car|cdr|null\?|pair\?|boolean\?|eof-object\?|char\?|procedure\?|number\?|port\?|string\?|vector\?|symbol\?|bytevector\?|list|call-with-current-continuation|call\/cc|append|abs|apply|eval)\b/,
	lookbehind : true
    },
    'string' :  /(["])(?:(?=(\\?))\2.)*?\1|'[^('|\s)]+/, //thanks http://stackoverflow.com/questions/171480/regex-grabbing-values-between-quotation-marks
    'number' : /(\s|\))[-+]?[0-9]*\.?[0-9]+((\s*)[-+]{1}(\s*)[0-9]*\.?[0-9]+i)?/,
    'operator': /(\*|\+|\-|\%|\/|<=|=>|>=|<|=|>)/,
    'function' : {
	pattern : /([(])[^(\s|\))]*\s/,
	lookbehind : true
    },
    'punctuation' : /[()]/
};

    

    

Prism.languages.groovy = Prism.languages.extend('clike', {
	'keyword': /\b(as|def|in|abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|extends|final|finally|float|for|goto|if|implements|import|instanceof|int|interface|long|native|new|package|private|protected|public|return|short|static|strictfp|super|switch|synchronized|this|throw|throws|trait|transient|try|void|volatile|while)\b/g,
	'string': /("""|''')[\W\w]*?\1|("|'|\/)[\W\w]*?\2|(\$\/)(\$\/\$|[\W\w])*?\/\$/g,
	'number': /\b0b[01_]+\b|\b0x[\da-f_]+(\.[\da-f_p\-]+)?\b|\b[\d_]+(\.[\d_]+[e]?[\d]*)?[glidf]\b|[\d_]+(\.[\d_]+)?\b/gi,
	'operator': {
		pattern: /(^|[^.])(={0,2}~|\?\.|\*?\.@|\.&|\.{1,2}(?!\.)|\.{2}<?(?=\w)|->|\?:|[-+]{1,2}|!|<=>|>{1,3}|<{1,2}|={1,2}|&{1,2}|\|{1,2}|\?|\*{1,2}|\/|\^|%)/g,
		lookbehind: true
	},
	'punctuation': /\.+|[{}[\];(),:$]/g
});

Prism.languages.insertBefore('groovy', 'punctuation', {
	'spock-block': /\b(setup|given|when|then|and|cleanup|expect|where):/g
});

Prism.languages.insertBefore('groovy', 'function', {
	'annotation': {
		pattern: /(^|[^.])@\w+/,
		lookbehind: true
	}
});

Prism.hooks.add('wrap', function(env) {
	if (env.language === 'groovy' && env.type === 'string') {
		var delimiter = env.content[0];

		if (delimiter != "'") {
			var pattern = /([^\\])(\$(\{.*?\}|[\w\.]+))/;
			if (delimiter === '$') {
				pattern = /([^\$])(\$(\{.*?\}|[\w\.]+))/;
			}
			env.content = Prism.highlight(env.content, {
				'expression': {
					pattern: pattern,
					lookbehind: true,
					inside: Prism.languages.groovy
				}
			});

			env.classes.push(delimiter === '/' ? 'regex' : 'gstring');
		}
	}
});

/**
 * Original by Jan T. Sott (http://github.com/idleberg)
 *
 * Includes all commands and plug-ins shipped with NSIS 3.0a2
 */
 Prism.languages.nsis = {
	'comment': {
		pattern: /(^|[^\\])(\/\*[\w\W]*?\*\/|(^|[^:])(#|;).*?(\r?\n|$))/g,
		lookbehind: true
	},
	'string': /("|')(\\?.)*?\1/g,
	'keyword': /\b(Abort|Add(BrandingImage|Size)|AdvSplash|Allow(RootDirInstall|SkipFiles)|AutoCloseWindow|Banner|BG(Font|Gradient|Image)|BrandingText|BringToFront|Call(\b|InstDLL)|Caption|ChangeUI|CheckBitmap|ClearErrors|CompletedText|ComponentText|CopyFiles|CRCCheck|Create(Directory|Font|ShortCut)|Delete(\b|INISec|INIStr|RegKey|RegValue)|Detail(Print|sButtonText)|Dialer|Dir(Text|Var|Verify)|EnableWindow|Enum(RegKey|RegValue)|Exch|Exec(\b|Shell|Wait)|ExpandEnvStrings|File(\b|BufSize|Close|ErrorText|Open|Read|ReadByte|ReadUTF16LE|ReadWord|WriteUTF16LE|Seek|Write|WriteByte|WriteWord)|Find(Close|First|Next|Window)|FlushINI|Get(CurInstType|CurrentAddress|DlgItem|DLLVersion|DLLVersionLocal|ErrorLevel|FileTime|FileTimeLocal|FullPathName|Function(\b|Address|End)|InstDirError|LabelAddress|TempFileName)|Goto|HideWindow|Icon|If(Abort|Errors|FileExists|RebootFlag|Silent)|InitPluginsDir|Install(ButtonText|Colors|Dir|DirRegKey)|InstProgressFlags|Inst(Type|TypeGetText|TypeSetText)|Int(Cmp|CmpU|Fmt|Op)|IsWindow|Lang(DLL|String)|License(BkColor|Data|ForceSelection|LangString|Text)|LoadLanguageFile|LockWindow|Log(Set|Text)|Manifest(DPIAware|SupportedOS)|Math|MessageBox|MiscButtonText|Name|Nop|ns(Dialogs|Exec)|NSISdl|OutFile|Page(\b|Callbacks)|Pop|Push|Quit|Read(EnvStr|INIStr|RegDWORD|RegStr)|Reboot|RegDLL|Rename|RequestExecutionLevel|ReserveFile|Return|RMDir|SearchPath|Section(\b|End|GetFlags|GetInstTypes|GetSize|GetText|Group|In|SetFlags|SetInstTypes|SetSize|SetText)|SendMessage|Set(AutoClose|BrandingImage|Compress|Compressor|CompressorDictSize|CtlColors|CurInstType|DatablockOptimize|DateSave|DetailsPrint|DetailsView|ErrorLevel|Errors|FileAttributes|Font|OutPath|Overwrite|PluginUnload|RebootFlag|RegView|ShellVarContext|Silent)|Show(InstDetails|UninstDetails|Window)|Silent(Install|UnInstall)|Sleep|SpaceTexts|Splash|StartMenu|Str(Cmp|CmpS|Cpy|Len)|SubCaption|System|Unicode|Uninstall(ButtonText|Caption|Icon|SubCaption|Text)|UninstPage|UnRegDLL|UserInfo|Var|VI(AddVersionKey|FileVersion|ProductVersion)|VPatch|WindowIcon|WriteINIStr|WriteRegBin|WriteRegDWORD|WriteRegExpandStr|Write(RegStr|Uninstaller)|XPStyle)\b/g,
	'property': /\b(admin|all|auto|both|colored|false|force|hide|highest|lastused|leave|listonly|none|normal|notset|off|on|open|print|show|silent|silentlog|smooth|textonly|true|user|ARCHIVE|FILE_(ATTRIBUTE_ARCHIVE|ATTRIBUTE_NORMAL|ATTRIBUTE_OFFLINE|ATTRIBUTE_READONLY|ATTRIBUTE_SYSTEM|ATTRIBUTE_TEMPORARY)|HK(CR|CU|DD|LM|PD|U)|HKEY_(CLASSES_ROOT|CURRENT_CONFIG|CURRENT_USER|DYN_DATA|LOCAL_MACHINE|PERFORMANCE_DATA|USERS)|ID(ABORT|CANCEL|IGNORE|NO|OK|RETRY|YES)|MB_(ABORTRETRYIGNORE|DEFBUTTON1|DEFBUTTON2|DEFBUTTON3|DEFBUTTON4|ICONEXCLAMATION|ICONINFORMATION|ICONQUESTION|ICONSTOP|OK|OKCANCEL|RETRYCANCEL|RIGHT|RTLREADING|SETFOREGROUND|TOPMOST|USERICON|YESNO)|NORMAL|OFFLINE|READONLY|SHCTX|SHELL_CONTEXT|SYSTEM|TEMPORARY)\b/g,
	'variable': /(\$(\(|\{)?[-_\w]+)(\)|\})?/i,
	'number': /\b-?(0x[\dA-Fa-f]+|\d*\.?\d+([Ee]-?\d+)?)\b/g,
	'operator': /[-+]{1,2}|&lt;=?|>=?|={1,3}|(&amp;){1,2}|\|?\||\?|\*|\/|\~|\^|\%/g,
	'punctuation': /[{}[\];(),.:]/g,
	'important': /\!(addincludedir|addplugindir|appendfile|cd|define|delfile|echo|else|endif|error|execute|finalize|getdllversionsystem|ifdef|ifmacrodef|ifmacrondef|ifndef|if|include|insertmacro|macroend|macro|makensis|packhdr|searchparse|searchreplace|tempfile|undef|verbose|warning)\b/gi,
};

Prism.languages.scss = Prism.languages.extend('css', {
	'comment': {
		pattern: /(^|[^\\])(\/\*[\w\W]*?\*\/|\/\/.*?(\r?\n|$))/g,
		lookbehind: true
	},
	// aturle is just the @***, not the entire rule (to highlight var & stuffs)
	// + add ability to highlight number & unit for media queries
	'atrule': /@[\w-]+(?=\s+(\(|\{|;))/gi,
	// url, compassified
	'url': /([-a-z]+-)*url(?=\()/gi,
	// CSS selector regex is not appropriate for Sass
	// since there can be lot more things (var, @ directive, nesting..)
	// a selector must start at the end of a property or after a brace (end of other rules or nesting)
	// it can contain some caracters that aren't used for defining rules or end of selector, & (parent selector), or interpolated variable
	// the end of a selector is found when there is no rules in it ( {} or {\s}) or if there is a property (because an interpolated var
	// can "pass" as a selector- e.g: proper#{$erty})
	// this one was ard to do, so please be careful if you edit this one :)
	'selector': /([^@;\{\}\(\)]?([^@;\{\}\(\)]|&|\#\{\$[-_\w]+\})+)(?=\s*\{(\}|\s|[^\}]+(:|\{)[^\}]+))/gm
});

Prism.languages.insertBefore('scss', 'atrule', {
	'keyword': /@(if|else if|else|for|each|while|import|extend|debug|warn|mixin|include|function|return|content)|(?=@for\s+\$[-_\w]+\s)+from/i
});

Prism.languages.insertBefore('scss', 'property', {
	// var and interpolated vars
	'variable': /((\$[-_\w]+)|(#\{\$[-_\w]+\}))/i
});

Prism.languages.insertBefore('scss', 'ignore', {
	'placeholder': /%[-_\w]+/i,
	'statement': /\B!(default|optional)\b/gi,
	'boolean': /\b(true|false)\b/g,
	'null': /\b(null)\b/g,
	'operator': /\s+([-+]{1,2}|={1,2}|!=|\|?\||\?|\*|\/|\%)\s+/g
});

Prism.languages.coffeescript = Prism.languages.extend('javascript', {
	'comment': [
		/([#]{3}\s*\r?\n(.*\s*\r*\n*)\s*?\r?\n[#]{3})/g,
		/(\s|^)([#]{1}[^#^\r^\n]{2,}?(\r?\n|$))/g
	],
	'keyword': /\b(this|window|delete|class|extends|namespace|extend|ar|let|if|else|while|do|for|each|of|return|in|instanceof|new|with|typeof|try|catch|finally|null|undefined|break|continue)\b/g
});

Prism.languages.insertBefore('coffeescript', 'keyword', {
	'function': {
		pattern: /[a-z|A-z]+\s*[:|=]\s*(\([.|a-z\s|,|:|{|}|\"|\'|=]*\))?\s*-&gt;/gi,
		inside: {
			'function-name': /[_?a-z-|A-Z-]+(\s*[:|=])| @[_?$?a-z-|A-Z-]+(\s*)| /g,
			'operator': /[-+]{1,2}|!|=?&lt;|=?&gt;|={1,2}|(&amp;){1,2}|\|?\||\?|\*|\//g
		}
	},
	'attr-name': /[_?a-z-|A-Z-]+(\s*:)| @[_?$?a-z-|A-Z-]+(\s*)| /g
});

Prism.languages.handlebars = {
	'expression': {
		pattern: /\{\{\{[\w\W]+?\}\}\}|\{\{[\w\W]+?\}\}/g,
		inside: {
			'comment': {
				pattern: /(\{\{)![\w\W]*(?=\}\})/g,
				lookbehind: true
			},
			'delimiter': {
				pattern: /^\{\{\{?|\}\}\}?$/ig,
				alias: 'punctuation'
			},
			'string': /(["'])(\\?.)+?\1/g,
			'number': /\b-?(0x[\dA-Fa-f]+|\d*\.?\d+([Ee]-?\d+)?)\b/g,
			'boolean': /\b(true|false)\b/g,
			'block': {
				pattern: /^(\s*~?\s*)[#\/]\w+/ig,
				lookbehind: true,
				alias: 'keyword'
			},
			'brackets': {
				pattern: /\[[^\]]+\]/,
				inside: {
					punctuation: /\[|\]/g,
					variable: /[\w\W]+/g
				}
			},
			'punctuation': /[!"#%&'()*+,.\/;<=>@\[\\\]^`{|}~]/g,
			'variable': /[^!"#%&'()*+,.\/;<=>@\[\\\]^`{|}~]+/g
		}
	}
};

if (Prism.languages.markup) {

	// Tokenize all inline Handlebars expressions that are wrapped in {{ }} or {{{ }}}
	// This allows for easy Handlebars + markup highlighting
	Prism.hooks.add('before-highlight', function(env) {
		console.log(env.language);
		if (env.language !== 'handlebars') {
			return;
		}

		env.tokenStack = [];

		env.backupCode = env.code;
		env.code = env.code.replace(/\{\{\{[\w\W]+?\}\}\}|\{\{[\w\W]+?\}\}/ig, function(match) {
			console.log(match);
			env.tokenStack.push(match);

			return '___HANDLEBARS' + env.tokenStack.length + '___';
		});
	});

	// Restore env.code for other plugins (e.g. line-numbers)
	Prism.hooks.add('before-insert', function(env) {
		if (env.language === 'handlebars') {
			env.code = env.backupCode;
			delete env.backupCode;
		}
	});

	// Re-insert the tokens after highlighting
	Prism.hooks.add('after-highlight', function(env) {
		if (env.language !== 'handlebars') {
			return;
		}

		for (var i = 0, t; t = env.tokenStack[i]; i++) {
			env.highlightedCode = env.highlightedCode.replace('___HANDLEBARS' + (i + 1) + '___', Prism.highlight(t, env.grammar, 'handlebars'));
		}

		env.element.innerHTML = env.highlightedCode;
	});

	// Wrap tokens in classes that are missing them
	Prism.hooks.add('wrap', function(env) {
		if (env.language === 'handlebars' && env.type === 'markup') {
			env.content = env.content.replace(/(___HANDLEBARS[0-9]+___)/g, "<span class=\"token handlebars\">$1</span>");
		}
	});

	// Add the rules before all others
	Prism.languages.insertBefore('handlebars', 'expression', {
		'markup': {
			pattern: /<[^?]\/?(.*?)>/g,
			inside: Prism.languages.markup
		},
		'handlebars': /___HANDLEBARS[0-9]+___/g
	});
}


Prism.languages.objectivec = Prism.languages.extend('c', {
	'keyword': /(\b(asm|typeof|inline|auto|break|case|char|const|continue|default|do|double|else|enum|extern|float|for|goto|if|int|long|register|return|short|signed|sizeof|static|struct|switch|typedef|union|unsigned|void|volatile|while|in|self|super)\b)|((?=[\w|@])(@interface|@end|@implementation|@protocol|@class|@public|@protected|@private|@property|@try|@catch|@finally|@throw|@synthesize|@dynamic|@selector)\b)/g,
	'string': /(?:("|')([^\n\\\1]|\\.|\\\r*\n)*?\1)|(@"([^\n\\"]|\\.|\\\r*\n)*?")/g,
	'operator': /[-+]{1,2}|!=?|<{1,2}=?|>{1,2}=?|\->|={1,2}|\^|~|%|&{1,2}|\|?\||\?|\*|\/|@/g
});

Prism.languages.sql= { 
	'comment': {
		pattern: /(^|[^\\])(\/\*[\w\W]*?\*\/|((--)|(\/\/)|#).*?(\r?\n|$))/g,
		lookbehind: true
	},
	'string' : {
		pattern: /(^|[^@])("|')(\\?[\s\S])*?\2/g,
		lookbehind: true
	},
	'variable': /@[\w.$]+|@("|'|`)(\\?[\s\S])+?\1/g,
	'function': /\b(?:COUNT|SUM|AVG|MIN|MAX|FIRST|LAST|UCASE|LCASE|MID|LEN|ROUND|NOW|FORMAT)(?=\s*\()/ig, // Should we highlight user defined functions too?
	'keyword': /\b(?:ACTION|ADD|AFTER|ALGORITHM|ALTER|ANALYZE|APPLY|AS|ASC|AUTHORIZATION|BACKUP|BDB|BEGIN|BERKELEYDB|BIGINT|BINARY|BIT|BLOB|BOOL|BOOLEAN|BREAK|BROWSE|BTREE|BULK|BY|CALL|CASCADE|CASCADED|CASE|CHAIN|CHAR VARYING|CHARACTER VARYING|CHECK|CHECKPOINT|CLOSE|CLUSTERED|COALESCE|COLUMN|COLUMNS|COMMENT|COMMIT|COMMITTED|COMPUTE|CONNECT|CONSISTENT|CONSTRAINT|CONTAINS|CONTAINSTABLE|CONTINUE|CONVERT|CREATE|CROSS|CURRENT|CURRENT_DATE|CURRENT_TIME|CURRENT_TIMESTAMP|CURRENT_USER|CURSOR|DATA|DATABASE|DATABASES|DATETIME|DBCC|DEALLOCATE|DEC|DECIMAL|DECLARE|DEFAULT|DEFINER|DELAYED|DELETE|DENY|DESC|DESCRIBE|DETERMINISTIC|DISABLE|DISCARD|DISK|DISTINCT|DISTINCTROW|DISTRIBUTED|DO|DOUBLE|DOUBLE PRECISION|DROP|DUMMY|DUMP|DUMPFILE|DUPLICATE KEY|ELSE|ENABLE|ENCLOSED BY|END|ENGINE|ENUM|ERRLVL|ERRORS|ESCAPE|ESCAPED BY|EXCEPT|EXEC|EXECUTE|EXIT|EXPLAIN|EXTENDED|FETCH|FIELDS|FILE|FILLFACTOR|FIRST|FIXED|FLOAT|FOLLOWING|FOR|FOR EACH ROW|FORCE|FOREIGN|FREETEXT|FREETEXTTABLE|FROM|FULL|FUNCTION|GEOMETRY|GEOMETRYCOLLECTION|GLOBAL|GOTO|GRANT|GROUP|HANDLER|HASH|HAVING|HOLDLOCK|IDENTITY|IDENTITY_INSERT|IDENTITYCOL|IF|IGNORE|IMPORT|INDEX|INFILE|INNER|INNODB|INOUT|INSERT|INT|INTEGER|INTERSECT|INTO|INVOKER|ISOLATION LEVEL|JOIN|KEY|KEYS|KILL|LANGUAGE SQL|LAST|LEFT|LIMIT|LINENO|LINES|LINESTRING|LOAD|LOCAL|LOCK|LONGBLOB|LONGTEXT|MATCH|MATCHED|MEDIUMBLOB|MEDIUMINT|MEDIUMTEXT|MERGE|MIDDLEINT|MODIFIES SQL DATA|MODIFY|MULTILINESTRING|MULTIPOINT|MULTIPOLYGON|NATIONAL|NATIONAL CHAR VARYING|NATIONAL CHARACTER|NATIONAL CHARACTER VARYING|NATIONAL VARCHAR|NATURAL|NCHAR|NCHAR VARCHAR|NEXT|NO|NO SQL|NOCHECK|NOCYCLE|NONCLUSTERED|NULLIF|NUMERIC|OF|OFF|OFFSETS|ON|OPEN|OPENDATASOURCE|OPENQUERY|OPENROWSET|OPTIMIZE|OPTION|OPTIONALLY|ORDER|OUT|OUTER|OUTFILE|OVER|PARTIAL|PARTITION|PERCENT|PIVOT|PLAN|POINT|POLYGON|PRECEDING|PRECISION|PREV|PRIMARY|PRINT|PRIVILEGES|PROC|PROCEDURE|PUBLIC|PURGE|QUICK|RAISERROR|READ|READS SQL DATA|READTEXT|REAL|RECONFIGURE|REFERENCES|RELEASE|RENAME|REPEATABLE|REPLICATION|REQUIRE|RESTORE|RESTRICT|RETURN|RETURNS|REVOKE|RIGHT|ROLLBACK|ROUTINE|ROWCOUNT|ROWGUIDCOL|ROWS?|RTREE|RULE|SAVE|SAVEPOINT|SCHEMA|SELECT|SERIAL|SERIALIZABLE|SESSION|SESSION_USER|SET|SETUSER|SHARE MODE|SHOW|SHUTDOWN|SIMPLE|SMALLINT|SNAPSHOT|SOME|SONAME|START|STARTING BY|STATISTICS|STATUS|STRIPED|SYSTEM_USER|TABLE|TABLES|TABLESPACE|TEMP(?:ORARY)?|TEMPTABLE|TERMINATED BY|TEXT|TEXTSIZE|THEN|TIMESTAMP|TINYBLOB|TINYINT|TINYTEXT|TO|TOP|TRAN|TRANSACTION|TRANSACTIONS|TRIGGER|TRUNCATE|TSEQUAL|TYPE|TYPES|UNBOUNDED|UNCOMMITTED|UNDEFINED|UNION|UNPIVOT|UPDATE|UPDATETEXT|USAGE|USE|USER|USING|VALUE|VALUES|VARBINARY|VARCHAR|VARCHARACTER|VARYING|VIEW|WAITFOR|WARNINGS|WHEN|WHERE|WHILE|WITH|WITH ROLLUP|WITHIN|WORK|WRITE|WRITETEXT)\b/gi,
	'boolean': /\b(?:TRUE|FALSE|NULL)\b/gi,
	'number': /\b-?(0x)?\d*\.?[\da-f]+\b/g,
	'operator': /\b(?:ALL|AND|ANY|BETWEEN|EXISTS|IN|LIKE|NOT|OR|IS|UNIQUE|CHARACTER SET|COLLATE|DIV|OFFSET|REGEXP|RLIKE|SOUNDS LIKE|XOR)\b|[-+]{1}|!|[=<>]{1,2}|(&){1,2}|\|?\||\?|\*|\//gi,
	'punctuation': /[;[\]()`,.]/g
};
Prism.languages.haskell= {
	'comment': {
		pattern: /(^|[^-!#$%*+=\?&@|~.:<>^\\])(--[^-!#$%*+=\?&@|~.:<>^\\].*(\r?\n|$)|{-[\w\W]*?-})/gm,
		lookbehind: true
	},
	'char': /'([^\\"]|\\([abfnrtv\\"'&]|\^[A-Z@[\]\^_]|NUL|SOH|STX|ETX|EOT|ENQ|ACK|BEL|BS|HT|LF|VT|FF|CR|SO|SI|DLE|DC1|DC2|DC3|DC4|NAK|SYN|ETB|CAN|EM|SUB|ESC|FS|GS|RS|US|SP|DEL|\d+|o[0-7]+|x[0-9a-fA-F]+))'/g,
	'string': /"([^\\"]|\\([abfnrtv\\"'&]|\^[A-Z@[\]\^_]|NUL|SOH|STX|ETX|EOT|ENQ|ACK|BEL|BS|HT|LF|VT|FF|CR|SO|SI|DLE|DC1|DC2|DC3|DC4|NAK|SYN|ETB|CAN|EM|SUB|ESC|FS|GS|RS|US|SP|DEL|\d+|o[0-7]+|x[0-9a-fA-F]+)|\\\s+\\)*"/g,
	'keyword' : /\b(case|class|data|deriving|do|else|if|in|infixl|infixr|instance|let|module|newtype|of|primitive|then|type|where)\b/g,
	'import_statement' : {
		// The imported or hidden names are not included in this import
		// statement. This is because we want to highlight those exactly like
		// we do for the names in the program.
		pattern: /(\n|^)\s*(import)\s+(qualified\s+)?(([A-Z][_a-zA-Z0-9']*)(\.[A-Z][_a-zA-Z0-9']*)*)(\s+(as)\s+(([A-Z][_a-zA-Z0-9']*)(\.[A-Z][_a-zA-Z0-9']*)*))?(\s+hiding\b)?/gm,
		inside: {
			'keyword': /\b(import|qualified|as|hiding)\b/g
		}
	},
	// These are builtin variables only. Constructors are highlighted later as a constant.
	'builtin': /\b(abs|acos|acosh|all|and|any|appendFile|approxRational|asTypeOf|asin|asinh|atan|atan2|atanh|basicIORun|break|catch|ceiling|chr|compare|concat|concatMap|const|cos|cosh|curry|cycle|decodeFloat|denominator|digitToInt|div|divMod|drop|dropWhile|either|elem|encodeFloat|enumFrom|enumFromThen|enumFromThenTo|enumFromTo|error|even|exp|exponent|fail|filter|flip|floatDigits|floatRadix|floatRange|floor|fmap|foldl|foldl1|foldr|foldr1|fromDouble|fromEnum|fromInt|fromInteger|fromIntegral|fromRational|fst|gcd|getChar|getContents|getLine|group|head|id|inRange|index|init|intToDigit|interact|ioError|isAlpha|isAlphaNum|isAscii|isControl|isDenormalized|isDigit|isHexDigit|isIEEE|isInfinite|isLower|isNaN|isNegativeZero|isOctDigit|isPrint|isSpace|isUpper|iterate|last|lcm|length|lex|lexDigits|lexLitChar|lines|log|logBase|lookup|map|mapM|mapM_|max|maxBound|maximum|maybe|min|minBound|minimum|mod|negate|not|notElem|null|numerator|odd|or|ord|otherwise|pack|pi|pred|primExitWith|print|product|properFraction|putChar|putStr|putStrLn|quot|quotRem|range|rangeSize|read|readDec|readFile|readFloat|readHex|readIO|readInt|readList|readLitChar|readLn|readOct|readParen|readSigned|reads|readsPrec|realToFrac|recip|rem|repeat|replicate|return|reverse|round|scaleFloat|scanl|scanl1|scanr|scanr1|seq|sequence|sequence_|show|showChar|showInt|showList|showLitChar|showParen|showSigned|showString|shows|showsPrec|significand|signum|sin|sinh|snd|sort|span|splitAt|sqrt|subtract|succ|sum|tail|take|takeWhile|tan|tanh|threadToIOResult|toEnum|toInt|toInteger|toLower|toRational|toUpper|truncate|uncurry|undefined|unlines|until|unwords|unzip|unzip3|userError|words|writeFile|zip|zip3|zipWith|zipWith3)\b/g,
	// decimal integers and floating point numbers | octal integers | hexadecimal integers
	'number' : /\b(\d+(\.\d+)?([eE][+-]?\d+)?|0[Oo][0-7]+|0[Xx][0-9a-fA-F]+)\b/g,
	// Most of this is needed because of the meaning of a single '.'.
	// If it stands alone freely, it is the function composition.
	// It may also be a separator between a module name and an identifier => no
	// operator. If it comes together with other special characters it is an
	// operator too.
	'operator' : /\s\.\s|([-!#$%*+=\?&@|~:<>^\\]*\.[-!#$%*+=\?&@|~:<>^\\]+)|([-!#$%*+=\?&@|~:<>^\\]+\.[-!#$%*+=\?&@|~:<>^\\]*)|[-!#$%*+=\?&@|~:<>^\\]+|(`([A-Z][_a-zA-Z0-9']*\.)*[_a-z][_a-zA-Z0-9']*`)/g,
	// In Haskell, nearly everything is a variable, do not highlight these.
	'hvariable': /\b([A-Z][_a-zA-Z0-9']*\.)*[_a-z][_a-zA-Z0-9']*\b/g,
	'constant': /\b([A-Z][_a-zA-Z0-9']*\.)*[A-Z][_a-zA-Z0-9']*\b/g,
	'punctuation' : /[{}[\];(),.:]/g
};

Prism.languages.perl = {
	'comment': [
		{
			// POD
			pattern: /((?:^|\n)\s*)=\w+[\s\S]*?=cut.+/g,
			lookbehind: true
		},
		{
			pattern: /(^|[^\\$])#.*?(\r?\n|$)/g,
			lookbehind: true
		}
	],
	// TODO Could be nice to handle Heredoc too.
	'string': [
		// q/.../
		/\b(?:q|qq|qx|qw)\s*([^a-zA-Z0-9\s\{\(\[<])(\\?.)*?\s*\1/g,
	
		// q a...a
		/\b(?:q|qq|qx|qw)\s+([a-zA-Z0-9])(\\?.)*?\s*\1/g,
	
		// q(...)
		/\b(?:q|qq|qx|qw)\s*\(([^()]|\\.)*\s*\)/g,
	
		// q{...}
		/\b(?:q|qq|qx|qw)\s*\{([^{}]|\\.)*\s*\}/g,
	
		// q[...]
		/\b(?:q|qq|qx|qw)\s*\[([^[\]]|\\.)*\s*\]/g,
	
		// q<...>
		/\b(?:q|qq|qx|qw)\s*<([^<>]|\\.)*\s*>/g,

		// "...", '...', `...`
		/("|'|`)(\\?.)*?\1/g
	],
	'regex': [
		// m/.../
		/\b(?:m|qr)\s*([^a-zA-Z0-9\s\{\(\[<])(\\?.)*?\s*\1[msixpodualgc]*/g,
	
		// m a...a
		/\b(?:m|qr)\s+([a-zA-Z0-9])(\\?.)*?\s*\1[msixpodualgc]*/g,
	
		// m(...)
		/\b(?:m|qr)\s*\(([^()]|\\.)*\s*\)[msixpodualgc]*/g,
	
		// m{...}
		/\b(?:m|qr)\s*\{([^{}]|\\.)*\s*\}[msixpodualgc]*/g,
	
		// m[...]
		/\b(?:m|qr)\s*\[([^[\]]|\\.)*\s*\][msixpodualgc]*/g,
	
		// m<...>
		/\b(?:m|qr)\s*<([^<>]|\\.)*\s*>[msixpodualgc]*/g,
	
		// s/.../.../
		/\b(?:s|tr|y)\s*([^a-zA-Z0-9\s\{\(\[<])(\\?.)*?\s*\1\s*((?!\1).|\\.)*\s*\1[msixpodualgcer]*/g,
	
		// s a...a...a
		/\b(?:s|tr|y)\s+([a-zA-Z0-9])(\\?.)*?\s*\1\s*((?!\1).|\\.)*\s*\1[msixpodualgcer]*/g,
	
		// s(...)(...)
		/\b(?:s|tr|y)\s*\(([^()]|\\.)*\s*\)\s*\(\s*([^()]|\\.)*\s*\)[msixpodualgcer]*/g,
	
		// s{...}{...}
		/\b(?:s|tr|y)\s*\{([^{}]|\\.)*\s*\}\s*\{\s*([^{}]|\\.)*\s*\}[msixpodualgcer]*/g,
	
		// s[...][...]
		/\b(?:s|tr|y)\s*\[([^[\]]|\\.)*\s*\]\s*\[\s*([^[\]]|\\.)*\s*\][msixpodualgcer]*/g,
	
		// s<...><...>
		/\b(?:s|tr|y)\s*<([^<>]|\\.)*\s*>\s*<\s*([^<>]|\\.)*\s*>[msixpodualgcer]*/g,
	
		// /.../
		/\/(\[.+?]|\\.|[^\/\r\n])*\/[msixpodualgc]*(?=\s*($|[\r\n,.;})&|\-+*=~<>!?^]|(lt|gt|le|ge|eq|ne|cmp|not|and|or|xor|x)\b))/g
	],

	// FIXME Not sure about the handling of ::, ', and #
	'variable': [
		// ${^POSTMATCH}
		/[&*\$@%]\{\^[A-Z]+\}/g,
		// $^V
		/[&*\$@%]\^[A-Z_]/g,
		// ${...}
		/[&*\$@%]#?(?=\{)/,
		// $foo
		/[&*\$@%]#?((::)*'?(?!\d)[\w$]+)+(::)*/ig,
		// $1
		/[&*\$@%]\d+/g,
		// $_, @_, %!
		/[\$@%][!"#\$%&'()*+,\-.\/:;<=>?@[\\\]^_`{|}~]/g
	],
	'filehandle': {
		// <>, <FOO>, _
		pattern: /<(?!=).*>|\b_\b/g,
		alias: 'symbol'
	},
	'vstring': {
		// v1.2, 1.2.3
		pattern: /v\d+(\.\d+)*|\d+(\.\d+){2,}/g,
		alias: 'string'
	},
	'function': {
		pattern: /sub [a-z0-9_]+/ig,
		inside: {
			keyword: /sub/
		}
	},
	'keyword': /\b(any|break|continue|default|delete|die|do|else|elsif|eval|for|foreach|given|goto|if|last|local|my|next|our|package|print|redo|require|say|state|sub|switch|undef|unless|until|use|when|while)\b/g,
	'number': /(\n|\b)-?(0x[\dA-Fa-f](_?[\dA-Fa-f])*|0b[01](_?[01])*|(\d(_?\d)*)?\.?\d(_?\d)*([Ee]-?\d+)?)\b/g,
	'operator': /-[rwxoRWXOezsfdlpSbctugkTBMAC]\b|[-+*=~\/|&]{1,2}|<=?|>=?|\.{1,3}|[!?\\^]|\b(lt|gt|le|ge|eq|ne|cmp|not|and|or|xor|x)\b/g,
	'punctuation': /[{}[\];(),:]/g
};

// issues: nested multiline comments, highlighting inside string interpolations
Prism.languages.swift = Prism.languages.extend('clike', {
	'keyword': /\b(as|associativity|break|case|class|continue|convenience|default|deinit|didSet|do|dynamicType|else|enum|extension|fallthrough|final|for|func|get|if|import|in|infix|init|inout|internal|is|lazy|left|let|mutating|new|none|nonmutating|operator|optional|override|postfix|precedence|prefix|private|protocol|public|required|return|right|safe|self|Self|set|static|struct|subscript|super|switch|Type|typealias|unowned|unowned|unsafe|var|weak|where|while|willSet|__COLUMN__|__FILE__|__FUNCTION__|__LINE__)\b/g,
	'number': /\b([\d_]+(\.[\de_]+)?|0x[a-f0-9_]+(\.[a-f0-9p_]+)?|0b[01_]+|0o[0-7_]+)\b/gi,
	'constant': /\b(nil|[A-Z_]{2,}|k[A-Z][A-Za-z_]+)\b/g,
	'atrule': /\@\b(IBOutlet|IBDesignable|IBAction|IBInspectable|class_protocol|exported|noreturn|NSCopying|NSManaged|objc|UIApplicationMain|auto_closure)\b/g,
	'builtin': /\b([A-Z]\S+|abs|advance|alignof|alignofValue|assert|contains|count|countElements|debugPrint|debugPrintln|distance|dropFirst|dropLast|dump|enumerate|equal|filter|find|first|getVaList|indices|isEmpty|join|last|lazy|lexicographicalCompare|map|max|maxElement|min|minElement|numericCast|overlaps|partition|prefix|print|println|reduce|reflect|reverse|sizeof|sizeofValue|sort|sorted|split|startsWith|stride|strideof|strideofValue|suffix|swap|toDebugString|toString|transcode|underestimateCount|unsafeBitCast|withExtendedLifetime|withUnsafeMutablePointer|withUnsafeMutablePointers|withUnsafePointer|withUnsafePointers|withVaList)\b/g
});

Prism.languages.cpp = Prism.languages.extend('c', {
	'keyword': /\b(alignas|alignof|asm|auto|bool|break|case|catch|char|char16_t|char32_t|class|compl|const|constexpr|const_cast|continue|decltype|default|delete|delete\[\]|do|double|dynamic_cast|else|enum|explicit|export|extern|float|for|friend|goto|if|inline|int|long|mutable|namespace|new|new\[\]|noexcept|nullptr|operator|private|protected|public|register|reinterpret_cast|return|short|signed|sizeof|static|static_assert|static_cast|struct|switch|template|this|thread_local|throw|try|typedef|typeid|typename|union|unsigned|using|virtual|void|volatile|wchar_t|while)\b/g,
	'boolean': /\b(true|false)\b/g,
	'operator': /[-+]{1,2}|!=?|<{1,2}=?|>{1,2}=?|\->|:{1,2}|={1,2}|\^|~|%|&{1,2}|\|?\||\?|\*|\/|\b(and|and_eq|bitand|bitor|not|not_eq|or|or_eq|xor|xor_eq)\b/g
});

Prism.languages.insertBefore('cpp', 'keyword', {
	'class-name': {
		pattern: /(class\s+)[a-z0-9_]+/ig,
		lookbehind: true,
	},
});
Prism.languages.http = {
    'request-line': {
        pattern: /^(POST|GET|PUT|DELETE|OPTIONS|PATCH|TRACE|CONNECT)\b\shttps?:\/\/\S+\sHTTP\/[0-9.]+/g,
        inside: {
            // HTTP Verb
            property: /^\b(POST|GET|PUT|DELETE|OPTIONS|PATCH|TRACE|CONNECT)\b/g,
            // Path or query argument
            'attr-name': /:\w+/g
        }
    },
    'response-status': {
        pattern: /^HTTP\/1.[01] [0-9]+.*/g,
        inside: {
            // Status, e.g. 200 OK
            property: /[0-9]+[A-Z\s-]+$/ig
        }
    },
    // HTTP header name
    keyword: /^[\w-]+:(?=.+)/gm
};

// Create a mapping of Content-Type headers to language definitions
var httpLanguages = {
    'application/json': Prism.languages.javascript,
    'application/xml': Prism.languages.markup,
    'text/xml': Prism.languages.markup,
    'text/html': Prism.languages.markup
};

// Insert each content type parser that has its associated language
// currently loaded.
for (var contentType in httpLanguages) {
    if (httpLanguages[contentType]) {
        var options = {};
        options[contentType] = {
            pattern: new RegExp('(content-type:\\s*' + contentType + '[\\w\\W]*?)\\n\\n[\\w\\W]*', 'gi'),
            lookbehind: true,
            inside: {
                rest: httpLanguages[contentType]
            }
        };
        Prism.languages.insertBefore('http', 'keyword', options);
    }
}

Prism.languages.insertBefore('php', 'variable', {
	'this': /\$this/g,
	'global': /\$_?(GLOBALS|SERVER|GET|POST|FILES|REQUEST|SESSION|ENV|COOKIE|HTTP_RAW_POST_DATA|argc|argv|php_errormsg|http_response_header)/g,
	'scope': {
		pattern: /\b[\w\\]+::/g,
		inside: {
			keyword: /(static|self|parent)/,
			punctuation: /(::|\\)/
		}
	}
});
Prism.languages.twig = {
	'comment': /\{\#[\s\S]*?\#\}/g,
	'tag': {
		pattern: /(\{\{[\s\S]*?\}\}|\{\%[\s\S]*?\%\})/g,
		inside: {
			'ld': {
				pattern: /^(\{\{\-?|\{\%\-?\s*\w+)/,
				inside: {
					'punctuation': /^(\{\{|\{\%)\-?/,
					'keyword': /\w+/
				}
			},
			'rd': {
				pattern: /\-?(\%\}|\}\})$/,
				inside: {
					'punctuation': /.*/
				}
			},
			'string': {
				pattern: /("|')(\\?.)*?\1/g,
				inside: {
					'punctuation': /^('|")|('|")$/g
				}
			},
			'keyword': /\b(if)\b/g,
			'boolean': /\b(true|false|null)\b/g,
			'number': /\b-?(0x[\dA-Fa-f]+|\d*\.?\d+([Ee]-?\d+)?)\b/g,
			'operator': /==|=|\!=|<|>|>=|<=|\+|\-|~|\*|\/|\/\/|%|\*\*|\|/g,
			'space-operator': {
				pattern: /(\s)(\b(not|b\-and|b\-xor|b\-or|and|or|in|matches|starts with|ends with|is)\b|\?|:|\?\:)(?=\s)/g,
				lookbehind: true,
				inside: {
					'operator': /.*/
				}
			},
			'property': /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g,
			'punctuation': /\(|\)|\[\]|\[|\]|\{|\}|\:|\.|,/g
		}
	},

	// The rest can be parsed as HTML
	'other': {
		pattern: /[\s\S]*/,
		inside: Prism.languages.markup
	}
};

Prism.languages.csharp = Prism.languages.extend('clike', {
	'keyword': /\b(abstract|as|base|bool|break|byte|case|catch|char|checked|class|const|continue|decimal|default|delegate|do|double|else|enum|event|explicit|extern|false|finally|fixed|float|for|foreach|goto|if|implicit|in|int|interface|internal|is|lock|long|namespace|new|null|object|operator|out|override|params|private|protected|public|readonly|ref|return|sbyte|sealed|short|sizeof|stackalloc|static|string|struct|switch|this|throw|true|try|typeof|uint|ulong|unchecked|unsafe|ushort|using|virtual|void|volatile|while|add|alias|ascending|async|await|descending|dynamic|from|get|global|group|into|join|let|orderby|partial|remove|select|set|value|var|where|yield)\b/g,
	'string': /@?("|')(\\?.)*?\1/g,
	'preprocessor': /^\s*#.*/gm,
	'number': /\b-?(0x)?\d*\.?\d+\b/g
});

Prism.languages.ini= {
	'comment': /^\s*;.*$/gm,
	'important': /\[.*?\]/gm,
	'constant': /^\s*[^\s\=]+?(?=[ \t]*\=)/gm,
	'attr-value': {
		pattern: /\=.*/gm, 
		inside: {
			'punctuation': /^[\=]/g
		}
	}
};
/**
 * Original by Aaron Harun: http://aahacreative.com/2012/07/31/php-syntax-highlighting-prism/
 * Modified by Miles Johnson: http://milesj.me
 *
 * Supports the following:
 * 		- Extends clike syntax
 * 		- Support for PHP 5.3+ (namespaces, traits, generators, etc)
 * 		- Smarter constant and function matching
 *
 * Adds the following new token classes:
 * 		constant, delimiter, variable, function, package
 */

Prism.languages.php = Prism.languages.extend('clike', {
	'keyword': /\b(and|or|xor|array|as|break|case|cfunction|class|const|continue|declare|default|die|do|else|elseif|enddeclare|endfor|endforeach|endif|endswitch|endwhile|extends|for|foreach|function|include|include_once|global|if|new|return|static|switch|use|require|require_once|var|while|abstract|interface|public|implements|private|protected|parent|throw|null|echo|print|trait|namespace|final|yield|goto|instanceof|finally|try|catch)\b/ig,
	'constant': /\b[A-Z0-9_]{2,}\b/g,
	'comment': {
		pattern: /(^|[^\\])(\/\*[\w\W]*?\*\/|(^|[^:])(\/\/|#).*?(\r?\n|$))/g,
		lookbehind: true
	}
});

Prism.languages.insertBefore('php', 'keyword', {
	'delimiter': /(\?>|<\?php|<\?)/ig,
	'variable': /(\$\w+)\b/ig,
	'package': {
		pattern: /(\\|namespace\s+|use\s+)[\w\\]+/g,
		lookbehind: true,
		inside: {
			punctuation: /\\/
		}
	}
});

// Must be defined after the function pattern
Prism.languages.insertBefore('php', 'operator', {
	'property': {
		pattern: /(->)[\w]+/g,
		lookbehind: true
	}
});

// Add HTML support of the markup language exists
if (Prism.languages.markup) {

	// Tokenize all inline PHP blocks that are wrapped in <?php ?>
	// This allows for easy PHP + markup highlighting
	Prism.hooks.add('before-highlight', function(env) {
		if (env.language !== 'php') {
			return;
		}

		env.tokenStack = [];

		env.backupCode = env.code;
		env.code = env.code.replace(/(?:<\?php|<\?)[\w\W]*?(?:\?>)/ig, function(match) {
			env.tokenStack.push(match);

			return '{{{PHP' + env.tokenStack.length + '}}}';
		});
	});

	// Restore env.code for other plugins (e.g. line-numbers)
	Prism.hooks.add('before-insert', function(env) {
		if (env.language === 'php') {
			env.code = env.backupCode;
			delete env.backupCode;
		}
	});

	// Re-insert the tokens after highlighting
	Prism.hooks.add('after-highlight', function(env) {
		if (env.language !== 'php') {
			return;
		}

		for (var i = 0, t; t = env.tokenStack[i]; i++) {
			env.highlightedCode = env.highlightedCode.replace('{{{PHP' + (i + 1) + '}}}', Prism.highlight(t, env.grammar, 'php'));
		}

		env.element.innerHTML = env.highlightedCode;
	});

	// Wrap tokens in classes that are missing them
	Prism.hooks.add('wrap', function(env) {
		if (env.language === 'php' && env.type === 'markup') {
			env.content = env.content.replace(/(\{\{\{PHP[0-9]+\}\}\})/g, "<span class=\"token php\">$1</span>");
		}
	});

	// Add the rules before all others
	Prism.languages.insertBefore('php', 'comment', {
		'markup': {
			pattern: /<[^?]\/?(.*?)>/g,
			inside: Prism.languages.markup
		},
		'php': /\{\{\{PHP[0-9]+\}\}\}/g
	});
}

},{}],3:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('./utils.js');

/**
 * Animation helper.
 */
var Animator = function(duration) {
    utils.PosterClass.call(this);
    this.duration = duration;
    this._start = Date.now();
};
utils.inherit(Animator, utils.PosterClass);

/**
 * Get the time in the animation
 * @return {float} between 0 and 1
 */
Animator.prototype.time = function() {
    var elapsed = Date.now() - this._start;
    return (elapsed % this.duration) / this.duration;
};

/**
 * Reset the animation progress to 0.
 */
Animator.prototype.reset = function() {
    this._start = Date.now();
};

exports.Animator = Animator;
},{"./utils.js":36}],4:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var utils = require('./utils.js');
var config = require('./config.js');
config = config.config;

/**
 * HTML canvas with drawing convinience functions.
 */
var Canvas = function() {
    this._rendered_region = [null, null, null, null]; // x1,y1,x2,y2

    utils.PosterClass.call(this);
    this._layout();
    this._init_properties();
    this._last_set_options = {};

    this._text_size_cache = {};
    this._text_size_array = [];
    this._text_size_cache_size = 1000;

    // Set default size.
    this.width = 400;
    this.height = 300;
};
utils.inherit(Canvas, utils.PosterClass);

/**
 * Layout the elements for the canvas.
 * Creates `this.el`
 */
Canvas.prototype._layout = function() {
    this._canvas = document.createElement('canvas');
    this._canvas.setAttribute('class', 'poster hidden-canvas');
    this.context = this._canvas.getContext('2d');
        
    // Stretch the image for retina support.
    this.scale(2,2);
};

/**
 * Make the properties of the class.
 */
Canvas.prototype._init_properties = function() {
    var that = this;

    /**
     * Height of the canvas
     * @return {float}
     */
    this.property('height', function() { 
        return that._canvas.height / 2; 
    }, function(value) {
        that._canvas.setAttribute('height', value * 2);
        
        // Stretch the image for retina support.
        this.scale(2,2);
        this._touch();
    });

    /**
     * Width of the canvas
     * @return {float}
     */
    this.property('width', function() { 
        return that._canvas.width / 2; 
    }, function(value) {
        that._canvas.setAttribute('width', value * 2);
        
        // Stretch the image for retina support.
        this.scale(2,2);
        this._touch();
    });

    /**
     * Region of the canvas that has been rendered to
     * @return {dictionary} dictionary describing a rectangle {x,y,width,height}
     *                      null if canvas has changed since last check
     */
    this.property('rendered_region', function() {
        return this.get_rendered_region(true);
    });
};

/**
 * Gets the region of the canvas that has been rendered to.
 * @param  {boolean} (optional) reset - resets the region.
 */
Canvas.prototype.get_rendered_region = function(reset) {
    var rendered_region = this._rendered_region;
    if (rendered_region[0] === null) return null;

    if (reset) this._rendered_region = [null, null, null, null];
    return {
        x: this._tx(rendered_region[0], true),
        y: this._ty(rendered_region[1], true),
        width: (this._tx(rendered_region[2]) - this._tx(rendered_region[0])), 
        height: (this._ty(rendered_region[3]) - this._ty(rendered_region[1])),
    };
};

/**
 * Erases the cached rendering options.
 * 
 * This should be called if a font is not rendering properly.  A font may not
 * render properly if it was was used within Poster before it was loaded by the
 * browser. i.e. If font 'FontA' is used within Poster, but hasn't been loaded
 * yet by the browser, Poster will use a temporary font instead of 'FontA'.
 * Because Poster is unaware of when fonts are loaded (TODO attempt to fix this)
 * by the browser, once 'FontA' is actually loaded, the temporary font will
 * continue to be used.  Clearing the cache makes Poster attempt to reload that
 * font.
 */
Canvas.prototype.erase_options_cache = function() {
    this._last_set_options = {};
};

/**
 * Draws a rectangle
 * @param  {float} x
 * @param  {float} y
 * @param  {float} width
 * @param  {float} height
 * @param  {dictionary} options, see _apply_options() for details
 */
Canvas.prototype.draw_rectangle = function(x, y, width, height, options) {
    var tx = this._tx(x);
    var ty = this._ty(y);
    this.context.beginPath();
    this.context.rect(tx, ty, width, height);
    this._do_draw(options);
    this._touch(tx, ty, tx+width, ty+height);
};

/**
 * Draws a circle
 * @param  {float} x
 * @param  {float} y
 * @param  {float} r
 * @param  {dictionary} options, see _apply_options() for details
 */
Canvas.prototype.draw_circle = function(x, y, r, options) {
    var tx = this._tx(x);
    var ty = this._ty(y);
    this.context.beginPath();
    this.context.arc(tx, ty, r, 0, 2 * Math.PI);
    this._do_draw(options);
    this._touch(tx-r, ty-r, tx+r, ty+r);
};

/**
 * Draws an image
 * @param  {img element} img
 * @param  {float} x
 * @param  {float} y
 * @param  {float} (optional) width
 * @param  {float} (optional) height
 * @param  {object} (optional) clip_bounds - Where to clip from the source.
 */
Canvas.prototype.draw_image = function(img, x, y, width, height, clip_bounds) {
    var tx = this._tx(x);
    var ty = this._ty(y);
    width = width || img.width;
    height = height || img.height;
    img = img._canvas ? img._canvas : img;
    if (clip_bounds) {
        // Horizontally offset the image operation by one pixel along each 
        // border to eliminate the strange white l&r border artifacts.
        var hoffset = 1;
        this.context.drawImage(img, 
            (this._tx(clip_bounds.x) - hoffset) * 2, // Retina support
            this._ty(clip_bounds.y) * 2, // Retina support
            (clip_bounds.width + 2*hoffset) * 2, // Retina support
            clip_bounds.height * 2, // Retina support
            tx-hoffset, ty, width + 2*hoffset, height);
    } else {
        this.context.drawImage(img, tx, ty, width, height);
    }
    this._touch(tx, ty, tx + width, ty + height);
};

/**
 * Draws a line
 * @param  {float} x1
 * @param  {float} y1
 * @param  {float} x2
 * @param  {float} y2
 * @param  {dictionary} options, see _apply_options() for details
 */
Canvas.prototype.draw_line = function(x1, y1, x2, y2, options) {
    var tx1 = this._tx(x1);
    var ty1 = this._ty(y1);
    var tx2 = this._tx(x2);
    var ty2 = this._ty(y2);
    this.context.beginPath();
    this.context.moveTo(tx1, ty1);
    this.context.lineTo(tx2, ty2);
    this._do_draw(options);
    this._touch(tx1, ty1, tx2, ty2);
};

/**
 * Draws a poly line
 * @param  {array} points - array of points.  Each point is
 *                          an array itself, of the form [x, y] 
 *                          where x and y are floating point
 *                          values.
 * @param  {dictionary} options, see _apply_options() for details
 */
Canvas.prototype.draw_polyline = function(points, options) {
    if (points.length < 2) {
        throw new Error('Poly line must have atleast two points.');
    } else {
        this.context.beginPath();
        var point = points[0];
        this.context.moveTo(this._tx(point[0]), this._ty(point[1]));

        var minx = this.width;
        var miny = this.height;
        var maxx = 0;
        var maxy = 0;
        for (var i = 1; i < points.length; i++) {
            point = points[i];
            var tx = this._tx(point[0]);
            var ty = this._ty(point[1]);
            this.context.lineTo(tx, ty);

            minx = Math.min(tx, minx);
            miny = Math.min(ty, miny);
            maxx = Math.max(tx, maxx);
            maxy = Math.max(ty, maxy);
        }
        this._do_draw(options); 
        this._touch(minx, miny, maxx, maxy);   
    }
};

/**
 * Draws a text string
 * @param  {float} x
 * @param  {float} y
 * @param  {string} text string or callback that resolves to a string.
 * @param  {dictionary} options, see _apply_options() for details
 */
Canvas.prototype.draw_text = function(x, y, text, options) {
    var tx = this._tx(x);
    var ty = this._ty(y);
    text = this._process_tabs(text);
    options = this._apply_options(options);
    // 'fill' the text by default when neither a stroke or fill 
    // is defined.  Otherwise only fill if a fill is defined.
    if (options.fill || !options.stroke) {
        this.context.fillText(text, tx, ty);
    }
    // Only stroke if a stroke is defined.
    if (options.stroke) {
        this.context.strokeText(text, tx, ty);       
    }

    // Mark the region as dirty.
    var width = this.measure_text(text, options);
    var height = this._font_height;
    this._touch(tx, ty, tx + width, ty + height); 
};

/**
 * Get's a chunk of the canvas as a raw image.
 * @param  {float} (optional) x
 * @param  {float} (optional) y
 * @param  {float} (optional) width
 * @param  {float} (optional) height
 * @return {image} canvas image data
 */
Canvas.prototype.get_raw_image = function(x, y, width, height) {
    console.warn('get_raw_image image is slow, use canvas references instead with draw_image');
    if (x===undefined) {
        x = 0;
    } else {
        x = this._tx(x);
    }
    if (y===undefined) {
        y = 0;
    } else {
        y = this._ty(y);
    }
    if (width === undefined) width = this.width;
    if (height === undefined) height = this.height;

    // Multiply by two for pixel doubling.
    x = 2 * x;
    y = 2 * y;
    width = 2 * width;
    height = 2 * height;
    
    // Update the cached image if it's not the requested one.
    var region = [x, y, width, height];
    if (!(this._cached_timestamp === this._modified && utils.compare_arrays(region, this._cached_region))) {
        this._cached_image = this.context.getImageData(x, y, width, height);
        this._cached_timestamp = this._modified;
        this._cached_region = region;
    }

    // Return the cached image.
    return this._cached_image;
};

/**
 * Put's a raw image on the canvas somewhere.
 * @param  {float} x
 * @param  {float} y
 * @return {image} canvas image data
 */
Canvas.prototype.put_raw_image = function(img, x, y) {
    console.warn('put_raw_image image is slow, use draw_image instead');
    var tx = this._tx(x);
    var ty = this._ty(y);
    // Multiply by two for pixel doubling.
    ret = this.context.putImageData(img, tx*2, ty*2);
    this._touch(tx, ty, this.width, this.height); // Don't know size of image
    return ret;
};

/**
 * Measures the width of a text string.
 * @param  {string} text
 * @param  {dictionary} options, see _apply_options() for details
 * @return {float} width
 */
Canvas.prototype.measure_text = function(text, options) {
    options = this._apply_options(options);
    text = this._process_tabs(text);

    // Cache the size if it's not already cached.
    if (this._text_size_cache[text] === undefined) {
        this._text_size_cache[text] = this.context.measureText(text).width;
        this._text_size_array.push(text);

        // Remove the oldest item in the array if the cache is too large.
        while (this._text_size_array.length > this._text_size_cache_size) {
            var oldest = this._text_size_array.shift();
            delete this._text_size_cache[oldest];
        }
    }
    
    // Use the cached size.
    return this._text_size_cache[text];
};

/**
 * Create a linear gradient
 * @param  {float} x1
 * @param  {float} y1
 * @param  {float} x2
 * @param  {float} y2
 * @param  {array} color_stops - array of [float, color] pairs
 */
Canvas.prototype.gradient = function(x1, y1, x2, y2, color_stops) {
    var gradient = this.context.createLinearGradient(x1, y1, x2, y2);
    for (var i = 0; i < color_stops.length; i++) {
        gradient.addColorStop(color_stops[i][0], color_stops[i][1]);
    }
    return gradient;
};

/**
 * Clear's the canvas.
 * @param  {object} (optional) region, {x,y,width,height}
 */
Canvas.prototype.clear = function(region) {
    if (region) {
        var tx = this._tx(region.x);
        var ty = this._ty(region.y);
        this.context.clearRect(tx, ty, region.width, region.height);
        this._touch(tx, ty, tx + region.width, ty + region.height);
    } else {
        this.context.clearRect(0, 0, this.width, this.height);
        this._touch();
    }
};

/**
 * Scale the current drawing.
 * @param  {float} x
 * @param  {float} y  
 */
Canvas.prototype.scale = function(x, y) {
    this.context.scale(x, y);
    this._touch();
};

/**
 * Finishes the drawing operation using the set of provided options.
 * @param  {dictionary} (optional) dictionary that 
 *  resolves to a dictionary.
 */
Canvas.prototype._do_draw = function(options) {
    options = this._apply_options(options);

    // Only fill if a fill is defined.
    if (options.fill) {
        this.context.fill();
    }
    // Stroke by default, if no stroke or fill is defined.  Otherwise
    // only stroke if a stroke is defined.
    if (options.stroke || !options.fill) {
        this.context.stroke();
    }
};

/**
 * Applies a dictionary of drawing options to the pen.
 * @param  {dictionary} options
 *      alpha {float} Opacity (0-1)
 *      composite_operation {string} How new images are 
 *          drawn onto an existing image.  Possible values
 *          are `source-over`, `source-atop`, `source-in`, 
 *          `source-out`, `destination-over`, 
 *          `destination-atop`, `destination-in`, 
 *          `destination-out`, `lighter`, `copy`, or `xor`.
 *      line_cap {string} End cap style for lines.
 *          Possible values are 'butt', 'round', or 'square'.
 *      line_join {string} How to render where two lines
 *          meet.  Possible values are 'bevel', 'round', or
 *          'miter'.
 *      line_width {float} How thick lines are.
 *      line_miter_limit {float} Max length of miters.
 *      line_color {string} Color of the line.
 *      fill_color {string} Color to fill the shape.
 *      color {string} Color to stroke and fill the shape.
 *          Lower priority to line_color and fill_color.
 *      font_style {string}
 *      font_variant {string}
 *      font_weight {string}
 *      font_size {string}
 *      font_family {string}
 *      text_align {string} Horizontal alignment of text.  
 *          Possible values are `start`, `end`, `center`,
 *          `left`, or `right`.
 *      text_baseline {string} Vertical alignment of text.
 *          Possible values are `alphabetic`, `top`, 
 *          `hanging`, `middle`, `ideographic`, or 
 *          `bottom`.
 * @return {dictionary} options, resolved.
 */
Canvas.prototype._apply_options = function(options) {
    options = options || {};
    options = utils.resolve_callable(options);

    // Special options.
    var set_options = {};
    set_options.globalAlpha = (options.alpha===undefined ? 1.0 : options.alpha);
    set_options.globalCompositeOperation = options.composite_operation || 'source-over';
    
    // Line style.
    set_options.lineCap = options.line_cap || 'butt';
    set_options.lineJoin = options.line_join || 'bevel';
    set_options.lineWidth = options.line_width===undefined ? 1.0 : options.line_width;
    set_options.miterLimit = options.line_miter_limit===undefined ? 10 : options.line_miter_limit;
    this.context.strokeStyle = options.line_color || options.color || 'black'; // TODO: Support gradient
    options.stroke = (options.line_color !== undefined || options.line_width !== undefined);

    // Fill style.
    this.context.fillStyle = options.fill_color || options.color || 'red'; // TODO: Support gradient
    options.fill = options.fill_color !== undefined;

    // Font style.
    var pixels = function(x) {
        if (x !== undefined && x !== null) {
            if (Number.isFinite(x)) {
                return String(x) + 'px';
            } else {
                return x;
            }
        } else {
            return null;
        }
    };
    var font_style = options.font_style || '';
    var font_variant = options.font_variant || '';
    var font_weight = options.font_weight || '';
    this._font_height = options.font_size || 12;
    var font_size = pixels(this._font_height);
    var font_family = options.font_family || 'Arial';
    var font = font_style + ' ' + font_variant + ' ' + font_weight + ' ' + font_size + ' ' + font_family;
    set_options.font = font;

    // Text style.
    set_options.textAlign = options.text_align || 'left';
    set_options.textBaseline = options.text_baseline || 'top';

    // TODO: Support shadows.
    
    // Empty the measure text cache if the font is changed.
    if (set_options.font !== this._last_set_options.font) {
        this._text_size_cache = {};
        this._text_size_array = [];
    }
    
    // Set the options on the context object.  Only set options that
    // have changed since the last call.
    for (var key in set_options) {
        if (set_options.hasOwnProperty(key)) {
            if (this._last_set_options[key] !== set_options[key]) {
                this._last_set_options[key] = set_options[key];
                this.context[key] = set_options[key];
            }
        }
    }

    return options;
};

/**
 * Update the timestamp that the canvas was modified and
 * the region that has contents rendered to it.
 */
Canvas.prototype._touch = function(x1, y1, x2, y2) {
    this._modified = Date.now();

    var all_undefined = (x1===undefined && y1===undefined && x2===undefined && y2===undefined);
    var one_nan = (isNaN(x1*x2*y1*y2));
    if (one_nan || all_undefined) {
        this._rendered_region = [0, 0, this.width, this.height];
        return;
    }

    // Set the render region.
    var comparitor = function(old_value, new_value, comparison) {
        if (old_value === null || old_value === undefined || new_value === null || new_value === undefined) {
            return new_value;
        } else {
            return comparison.call(undefined, old_value, new_value);
        }
    };

    this._rendered_region[0] = comparitor(this._rendered_region[0], comparitor(x1, x2, Math.min), Math.min);
    this._rendered_region[1] = comparitor(this._rendered_region[1], comparitor(y1, y2, Math.min), Math.min);
    this._rendered_region[2] = comparitor(this._rendered_region[2], comparitor(x1, x2, Math.max), Math.max);
    this._rendered_region[3] = comparitor(this._rendered_region[3], comparitor(y1, y2, Math.max), Math.max);
};

/**
 * Transform an x value before rendering.
 * @param  {float} x
 * @param  {boolean} inverse - perform inverse transformation
 * @return {float}
 */
Canvas.prototype._tx = function(x, inverse) { return x; };

/**
 * Transform a y value before rendering.
 * @param  {float} y
 * @param  {boolean} inverse - perform inverse transformation
 * @return {float}
 */
Canvas.prototype._ty = function(y, inverse) { return y; };

/**
 * Convert tab characters to the config defined number of space 
 * characters for rendering.
 * @param  {string} s - input string
 * @return {string} output string
 */
Canvas.prototype._process_tabs = function(s) {
    var space_tab = '';
    for (var i = 0; i < (config.tab_width || 1); i++) {
        space_tab += ' ';
    }
    return s.replace(/\t/g, space_tab);
};

// Exports
exports.Canvas = Canvas;

},{"./config.js":6,"./utils.js":36}],5:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('./utils.js');

/**
 * Eventful clipboard support
 *
 * WARNING:  This class is a hudge kludge that works around the prehistoric
 * clipboard support (lack thereof) in modern webrowsers.  It creates a hidden
 * textbox which is focused.  The programmer must call `set_clippable` to change
 * what will be copied when the user hits keys corresponding to a copy 
 * operation.  Events `copy`, `cut`, and `paste` are raised by this class.
 */
var Clipboard = function(el) {
    utils.PosterClass.call(this);
    this._el = el;

    // Create a textbox that's hidden.
    this.hidden_input = document.createElement('textarea');
    this.hidden_input.setAttribute('class', 'poster hidden-clipboard');
    el.appendChild(this.hidden_input);

    this._bind_events();
};
utils.inherit(Clipboard, utils.PosterClass);

/**
 * Set what will be copied when the user copies.
 * @param {string} text
 */
Clipboard.prototype.set_clippable = function(text) {
    this._clippable = text;
    this.hidden_input.value = this._clippable;
    this._focus();
}; 

/**
 * Focus the hidden text area.
 * @return {null}
 */
Clipboard.prototype._focus = function() {
    this.hidden_input.focus();
    this.hidden_input.select();
};

/**
 * Handle when the user pastes into the textbox.
 * @return {null}
 */
Clipboard.prototype._handle_paste = function(e) {
    var pasted = e.clipboardData.getData(e.clipboardData.types[0]);
    utils.cancel_bubble(e);
    this.trigger('paste', pasted);
};

/**
 * Bind events of the hidden textbox.
 * @return {null}
 */
Clipboard.prototype._bind_events = function() {
    var that = this;

    // Listen to el's focus event.  If el is focused, focus the hidden input
    // instead.
    utils.hook(this._el, 'onfocus', utils.proxy(this._focus, this));

    utils.hook(this.hidden_input, 'onpaste', utils.proxy(this._handle_paste, this));
    utils.hook(this.hidden_input, 'oncut', function(e) {
        // Trigger the event in a timeout so it fires after the system event.
        setTimeout(function(){
            that.trigger('cut', that._clippable);
        }, 0);
    });
    utils.hook(this.hidden_input, 'oncopy', function(e) {
        that.trigger('copy', that._clippable);
    });
    utils.hook(this.hidden_input, 'onkeypress', function() {
        setTimeout(function() {
            that.hidden_input.value = that._clippable;
            that._focus();
        }, 0);
    });
    utils.hook(this.hidden_input, 'onkeyup', function() {
        setTimeout(function() {
            that.hidden_input.value = that._clippable;
            that._focus();
        }, 0);
    });
};

exports.Clipboard = Clipboard;

},{"./utils.js":36}],6:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('./utils.js');
var config = new utils.PosterClass([
    'highlight_draw', // boolean - Whether or not to highlight re-renders
    'highlight_blit', // boolean - Whether or not to highlight blit regions
    'newline_width', // integer - Width of newline characters
    'tab_width', // integer - Tab character width measured in space characters
    'use_spaces', // boolean - Use spaces for indents instead of tabs
    'history_group_delay', // integer - Time (ms) to wait for another historical event
                        // before automatically grouping them (related to undo and redo 
                        // actions)
]);

// Set defaults
config.tab_width = 4;
config.use_spaces = true;
config.history_group_delay = 100;

exports.config = config;

},{"./utils.js":36}],7:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var keymap = require('./events/map.js');
var register = keymap.Map.register;

var utils = require('./utils.js');
var config = require('./config.js');
config = config.config;

/**
 * Input cursor.
 */
var Cursor = function(model, push_history) {
    utils.PosterClass.call(this);
    this._model = model;
    this._push_history = push_history;

    this.primary_row = 0;
    this.primary_char = 0;
    this.secondary_row = 0;
    this.secondary_char = 0;

    this._init_properties();
    this._register_api();
};
utils.inherit(Cursor, utils.PosterClass);

/**
 * Unregister the actions and event listeners of this cursor.
 */
Cursor.prototype.unregister = function() {
    keymap.unregister_by_tag(this);
};

/**
 * Gets the state of the cursor.
 * @return {object} state
 */
Cursor.prototype.get_state = function() {
    return {
        primary_row: this.primary_row,
        primary_char: this.primary_char,
        secondary_row: this.secondary_row,
        secondary_char: this.secondary_char,
        _memory_char: this._memory_char
    };
};

/**
 * Sets the state of the cursor.
 * @param {object} state
 * @param {boolean} [historical] - Defaults to true.  Whether this should be recorded in history.
 */
Cursor.prototype.set_state = function(state, historical) {
    if (state) {
        var old_state = {};
        for (var key in state) {
            if (state.hasOwnProperty(key)) {
                old_state[key] = this[key];
                this[key] = state[key];
            }
        }

        if (historical === undefined || historical === true) {
            this._push_history('set_state', [state], 'set_state', [old_state]);
        }
        this.trigger('change');
    }
};

/**
 * Moves the primary cursor a given offset.
 * @param  {integer} x
 * @param  {integer} y
 * @param  {boolean} (optional) hop=false - hop to the other side of the
 *                   selected region if the primary is on the opposite of the
 *                   direction of motion.
 * @return {null}
 */
Cursor.prototype.move_primary = function(x, y, hop) {
    if (hop) {
        if (this.primary_row != this.secondary_row || this.primary_char != this.secondary_char) {
            var start_row = this.start_row;
            var start_char = this.start_char;
            var end_row = this.end_row;
            var end_char = this.end_char;
            if (x<0 || y<0) {
                this.primary_row = start_row;
                this.primary_char = start_char;
                this.secondary_row = end_row;
                this.secondary_char = end_char;
            } else {
                this.primary_row = end_row;
                this.primary_char = end_char;
                this.secondary_row = start_row;
                this.secondary_char = start_char;
            }
        }
    }

    if (x < 0) {
        if (this.primary_char + x < 0) {
            if (this.primary_row === 0) {
                this.primary_char = 0;
            } else {
                this.primary_row -= 1;
                this.primary_char = this._model._rows[this.primary_row].length;
            }
        } else {
            this.primary_char += x;
        }
    } else if (x > 0) {
        if (this.primary_char + x > this._model._rows[this.primary_row].length) {
            if (this.primary_row === this._model._rows.length - 1) {
                this.primary_char = this._model._rows[this.primary_row].length;
            } else {
                this.primary_row += 1;
                this.primary_char = 0;
            }
        } else {
            this.primary_char += x;
        }
    }

    // Remember the character position, vertical navigation across empty lines
    // shouldn't cause the horizontal position to be lost.
    if (x !== 0) {
        this._memory_char = this.primary_char;
    }

    if (y !== 0) {
        this.primary_row += y;
        this.primary_row = Math.min(Math.max(this.primary_row, 0), this._model._rows.length-1);
        if (this._memory_char !== undefined) {
            this.primary_char = this._memory_char;
        }
        if (this.primary_char > this._model._rows[this.primary_row].length) {
            this.primary_char = this._model._rows[this.primary_row].length;
        }
    }

    this.trigger('change'); 
};

/**
 * Walk the primary cursor in a direction until a not-text character is found.
 * @param  {integer} direction
 * @return {null}
 */
Cursor.prototype.word_primary = function(direction) {
    // Make sure direction is 1 or -1.
    direction = direction < 0 ? -1 : 1;

    // If moving left and at end of row, move up a row if possible.
    if (this.primary_char === 0 && direction == -1) {
        if (this.primary_row !== 0) {
            this.primary_row--;
            this.primary_char = this._model._rows[this.primary_row].length;
            this._memory_char = this.primary_char;
            this.trigger('change'); 
        }
        return;
    }

    // If moving right and at end of row, move down a row if possible.
    if (this.primary_char >= this._model._rows[this.primary_row].length && direction == 1) {
        if (this.primary_row < this._model._rows.length-1) {
            this.primary_row++;
            this.primary_char = 0;
            this._memory_char = this.primary_char;
            this.trigger('change'); 
        }
        return;
    }

    var i = this.primary_char;
    var hit_text = false;
    var row_text = this._model._rows[this.primary_row];
    if (direction == -1) {
        while (0 < i && !(hit_text && utils.not_text(row_text[i-1]))) {
            hit_text = hit_text || !utils.not_text(row_text[i-1]);
            i += direction;
        }
    } else {
        while (i < row_text.length && !(hit_text && utils.not_text(row_text[i]))) {
            hit_text = hit_text || !utils.not_text(row_text[i]);
            i += direction;
        }
    }

    this.primary_char = i;
    this._memory_char = this.primary_char;
    this.trigger('change'); 
};

/**
 * Select all of the text.
 * @return {null}
 */
Cursor.prototype.select_all = function() {
    this.primary_row = this._model._rows.length-1;
    this.primary_char = this._model._rows[this.primary_row].length;
    this.secondary_row = 0;
    this.secondary_char = 0;
    this.trigger('change'); 
};

/**
 * Move the primary cursor to the line end.
 * @return {null}
 */
Cursor.prototype.primary_goto_end = function() {
    // Get the start of the actual content, skipping the whitespace.
    var row_text = this._model._rows[this.primary_row];
    var trimmed = row_text.trim();
    var start = row_text.indexOf(trimmed);
    var target = row_text.length;
    if (0 < start && start < row_text.length && this.primary_char !== start + trimmed.length) {
        target = start + trimmed.length;
    }

    // Move the cursor.
    this.primary_char = target;
    this._memory_char = this.primary_char;
    this.trigger('change'); 
};

/**
 * Move the primary cursor to the line start.
 * @return {null}
 */
Cursor.prototype.primary_goto_start = function() {
    // Get the start of the actual content, skipping the whitespace.
    var row_text = this._model._rows[this.primary_row];
    var start = row_text.indexOf(row_text.trim());
    var target = 0;
    if (0 < start && start < row_text.length && this.primary_char !== start) {
        target = start;
    }

    // Move the cursor.
    this.primary_char = target;
    this._memory_char = this.primary_char;
    this.trigger('change'); 
};

/**
 * Selects a word at the given location.
 * @param {integer} row_index
 * @param {integer} char_index
 */
Cursor.prototype.select_word = function(row_index, char_index) {
    this.set_both(row_index, char_index);
    this.word_primary(-1);
    this._reset_secondary();
    this.word_primary(1);
};

/**
 * Set the primary cursor position
 * @param {integer} row_index
 * @param {integer} char_index
 */
Cursor.prototype.set_primary = function(row_index, char_index) {
    this.primary_row = row_index;
    this.primary_char = char_index;

    // Remember the character position, vertical navigation across empty lines
    // shouldn't cause the horizontal position to be lost.
    this._memory_char = this.primary_char;

    this.trigger('change'); 
};

/**
 * Set the secondary cursor position
 * @param {integer} row_index
 * @param {integer} char_index
 */
Cursor.prototype.set_secondary = function(row_index, char_index) {
    this.secondary_row = row_index;
    this.secondary_char = char_index;
    this.trigger('change'); 
};

/**
 * Sets both the primary and secondary cursor positions
 * @param {integer} row_index
 * @param {integer} char_index
 */
Cursor.prototype.set_both = function(row_index, char_index) {
    this.primary_row = row_index;
    this.primary_char = char_index;
    this.secondary_row = row_index;
    this.secondary_char = char_index;

    // Remember the character position, vertical navigation across empty lines
    // shouldn't cause the horizontal position to be lost.
    this._memory_char = this.primary_char;

    this.trigger('change'); 
};

/**
 * Handles when a key is pressed.
 * @param  {Event} e - original key press event.
 * @return {null}
 */
Cursor.prototype.keypress = function(e) {
    var char_code = e.which || e.keyCode;
    var char_typed = String.fromCharCode(char_code);
    this.remove_selected();
    this._historical(function() {
        this._model_add_text(this.primary_row, this.primary_char, char_typed);
    });
    this.move_primary(1, 0);
    this._reset_secondary();
    return true;
};

/**
 * Indent
 * @param  {Event} e - original key press event.
 * @return {null}
 */
Cursor.prototype.indent = function(e) {
    var indent = this._make_indents()[0];
    this._historical(function() {
        if (this.primary_row == this.secondary_row && this.primary_char == this.secondary_char) {
            this._model_add_text(this.primary_row, this.primary_char, indent);
        } else {
            for (var row = this.start_row; row <= this.end_row; row++) {
                this._model_add_text(row, 0, indent);
            }
        }
    });
    this.primary_char += indent.length;
    this._memory_char = this.primary_char;
    this.secondary_char += indent.length;
    this.trigger('change');
    return true;
};

/**
 * Unindent
 * @param  {Event} e - original key press event.
 * @return {null}
 */
Cursor.prototype.unindent = function(e) {
    var indents = this._make_indents();
    var removed_start = 0;
    var removed_end = 0;

    // If no text is selected, remove the indent preceding the
    // cursor if it exists.
    this._historical(function() {
        if (this.primary_row == this.secondary_row && this.primary_char == this.secondary_char) {
            for (var i = 0; i < indents.length; i++) {
                var indent = indents[i];
                if (this.primary_char >= indent.length) {
                    var before = this._model.get_text(this.primary_row, this.primary_char-indent.length, this.primary_row, this.primary_char);
                    if (before == indent) {
                        this._model_remove_text(this.primary_row, this.primary_char-indent.length, this.primary_row, this.primary_char);
                        removed_start = indent.length;
                        removed_end = indent.length;
                        break;
                    }
                }
            }

        // Text is selected.  Remove the an indent from the begining
        // of each row if it exists.
        } else {
            for (var row = this.start_row; row <= this.end_row; row++) {
                for (var i = 0; i < indents.length; i++) {
                    var indent = indents[i];
                    if (this._model._rows[row].length >= indent.length) {
                        if (this._model._rows[row].substring(0, indent.length) == indent) {
                            this._model_remove_text(row, 0, row, indent.length);
                            if (row == this.start_row) removed_start = indent.length;
                            if (row == this.end_row) removed_end = indent.length;
                            break;
                        }
                    };
                }
            }
        }
    });
    
    // Move the selected characters backwards if indents were removed.
    var start_is_primary = (this.primary_row == this.start_row && this.primary_char == this.start_char);
    if (start_is_primary) {
        this.primary_char -= removed_start;
        this.secondary_char -= removed_end;
    } else {
        this.primary_char -= removed_end;
        this.secondary_char -= removed_start;
    }
    this._memory_char = this.primary_char;
    if (removed_end || removed_start) this.trigger('change');
    return true;
};

/**
 * Insert a newline
 * @return {null}
 */
Cursor.prototype.newline = function(e) {
    this.remove_selected();

    // Get the blank space at the begining of the line.
    var line_text = this._model.get_text(this.primary_row, 0, this.primary_row, this.primary_char);
    var spaceless = line_text.trim();
    var left = line_text.length;
    if (spaceless.length > 0) {
        left = line_text.indexOf(spaceless);
    }
    var indent = line_text.substring(0, left);
    
    this._historical(function() {
        this._model_add_text(this.primary_row, this.primary_char, '\n' + indent);
    });
    this.primary_row += 1;
    this.primary_char = indent.length;
    this._memory_char = this.primary_char;
    this._reset_secondary();
    return true;
};

/**
 * Insert text
 * @param  {string} text
 * @return {null}
 */
Cursor.prototype.insert_text = function(text) {
    this.remove_selected();
    this._historical(function() {
        this._model_add_text(this.primary_row, this.primary_char, text);
    });
    
    // Move cursor to the end.
    if (text.indexOf('\n')==-1) {
        this.primary_char = this.start_char + text.length;
    } else {
        var lines = text.split('\n');
        this.primary_row += lines.length - 1;
        this.primary_char = lines[lines.length-1].length;
    }
    this._reset_secondary();

    this.trigger('change'); 
    return true;
};

/**
 * Paste text
 * @param  {string} text
 * @return {null}
 */
Cursor.prototype.paste = function(text) {
    if (this._copied_row === text) {
        this._historical(function() {
            this._model_add_row(this.primary_row, text);
        });
        this.primary_row++;
        this.secondary_row++;
        this.trigger('change'); 
    } else {
        this.insert_text(text);
    }
};

/**
 * Remove the selected text
 * @return {boolean} true if text was removed.
 */
Cursor.prototype.remove_selected = function() {
    if (this.primary_row !== this.secondary_row || this.primary_char !== this.secondary_char) {
        var row_index = this.start_row;
        var char_index = this.start_char;
        this._historical(function() {
            this._model_remove_text(this.start_row, this.start_char, this.end_row, this.end_char);
        });
        this.primary_row = row_index;
        this.primary_char = char_index;
        this._reset_secondary();
        this.trigger('change'); 
        return true;
    }
    return false;
};

/**
 * Gets the selected text.
 * @return {string} selected text
 */
Cursor.prototype.get = function() {
    if (this.primary_row == this.secondary_row && this.primary_char == this.secondary_char) {
        return this._model._rows[this.primary_row];
    } else {
        return this._model.get_text(this.start_row, this.start_char, this.end_row, this.end_char);
    }
};

/**
 * Cuts the selected text.
 * @return {string} selected text
 */
Cursor.prototype.cut = function() {
    var text = this.get();
    if (this.primary_row == this.secondary_row && this.primary_char == this.secondary_char) {
        this._copied_row = this._model._rows[this.primary_row];    
        this._historical(function() {
            this._model_remove_row(this.primary_row);
        });
    } else {
        this._copied_row = null;
        this.remove_selected();
    }
    return text;
};

/**
 * Copies the selected text.
 * @return {string} selected text
 */
Cursor.prototype.copy = function() {
    var text = this.get();
    if (this.primary_row == this.secondary_row && this.primary_char == this.secondary_char) {
        this._copied_row = this._model._rows[this.primary_row];
    } else {
        this._copied_row = null;
    }
    return text;
};

/**
 * Delete forward, typically called by `delete` keypress.
 * @return {null}
 */
Cursor.prototype.delete_forward = function() {
    if (!this.remove_selected()) {
        this.move_primary(1, 0);
        this.remove_selected();
    }
    return true;
};

/**
 * Delete backward, typically called by `backspace` keypress.
 * @return {null}
 */
Cursor.prototype.delete_backward = function() {
    if (!this.remove_selected()) {
        this.move_primary(-1, 0);
        this.remove_selected();
    }
    return true;
};

/**
 * Delete one word backwards.
 * @return {boolean} success
 */
Cursor.prototype.delete_word_left = function() {
    if (!this.remove_selected()) {
        if (this.primary_char === 0) {
            this.word_primary(-1); 
            this.remove_selected();
        } else {
            // Walk backwards until char index is 0 or
            // a different type of character is hit.
            var row = this._model._rows[this.primary_row];
            var i = this.primary_char - 1;
            var start_not_text = utils.not_text(row[i]);
            while (i >= 0 && utils.not_text(row[i]) == start_not_text) {
                i--;
            }
            this.secondary_char = i+1;
            this.remove_selected();
        }
    }
    return true;
};

/**
 * Delete one word forwards.
 * @return {boolean} success
 */
Cursor.prototype.delete_word_right = function() {
    if (!this.remove_selected()) {
        var row = this._model._rows[this.primary_row];
        if (this.primary_char === row.length) {
            this.word_primary(1); 
            this.remove_selected();
        } else {
            // Walk forwards until char index is at end or
            // a different type of character is hit.
            var i = this.primary_char;
            var start_not_text = utils.not_text(row[i]);
            while (i < row.length && utils.not_text(row[i]) == start_not_text) {
                i++;
            }
            this.secondary_char = i;
            this.remove_selected();
        }
    }
    this._end_historical_move();
    return true;
};

/**
 * Reset the secondary cursor to the value of the primary.
 * @return {[type]} [description]
 */
Cursor.prototype._reset_secondary = function() {
    this.secondary_row = this.primary_row;
    this.secondary_char = this.primary_char;

    this.trigger('change'); 
};

/**
 * Create the properties of the cursor.
 * @return {null}
 */
Cursor.prototype._init_properties = function() {
    var that = this;
    this.property('start_row', function() { return Math.min(that.primary_row, that.secondary_row); });
    this.property('end_row', function() { return Math.max(that.primary_row, that.secondary_row); });
    this.property('start_char', function() {
        if (that.primary_row < that.secondary_row || (that.primary_row == that.secondary_row && that.primary_char <= that.secondary_char)) {
            return that.primary_char;
        } else {
            return that.secondary_char;
        }
    });
    this.property('end_char', function() {
        if (that.primary_row < that.secondary_row || (that.primary_row == that.secondary_row && that.primary_char <= that.secondary_char)) {
            return that.secondary_char;
        } else {
            return that.primary_char;
        }
    });
};

/**
 * Adds text to the model while keeping track of the history.
 * @param  {integer} row_index
 * @param  {integer} char_index
 * @param  {string} text
 */
Cursor.prototype._model_add_text = function(row_index, char_index, text) {
    var lines = text.split('\n');
    this._push_history(
        '_model_add_text', 
        [row_index, char_index, text], 
        '_model_remove_text', 
        [row_index, char_index, row_index + lines.length - 1, lines.length > 1 ? lines[lines.length-1].length : char_index + text.length], 
        config.history_group_delay || 100);
    this._model.add_text(row_index, char_index, text);
};

/**
 * Removes text from the model while keeping track of the history.
 * @param  {integer} start_row
 * @param  {integer} start_char
 * @param  {integer} end_row
 * @param  {integer} end_char
 */
Cursor.prototype._model_remove_text = function(start_row, start_char, end_row, end_char) {
    var text = this._model.get_text(start_row, start_char, end_row, end_char);
    this._push_history(
        '_model_remove_text', 
        [start_row, start_char, end_row, end_char], 
        '_model_add_text', 
        [start_row, start_char, text], 
        config.history_group_delay || 100);
    this._model.remove_text(start_row, start_char, end_row, end_char);
};

/**
 * Adds a row of text while keeping track of the history.
 * @param  {integer} row_index
 * @param  {string} text
 */
Cursor.prototype._model_add_row = function(row_index, text) {
    this._push_history(
        '_model_add_row', 
        [row_index, text], 
        '_model_remove_row', 
        [row_index], 
        config.history_group_delay || 100);
    this._model.add_row(row_index, text);

};

/**
 * Removes a row of text while keeping track of the history.
 * @param  {integer} row_index
 */
Cursor.prototype._model_remove_row = function(row_index) {
    this._push_history(
        '_model_remove_row', 
        [row_index], 
        '_model_add_row', 
        [row_index, this._model._rows[row_index]], 
        config.history_group_delay || 100);
    this._model.remove_row(row_index);
};

/**
 * Record the before and after positions of the cursor for history.
 * @param  {function} f - executes with `this` context
 */
Cursor.prototype._historical = function(f) {
    this._start_historical_move();
    var ret = f.apply(this);
    this._end_historical_move();
    return ret;
};

/**
 * Record the starting state of the cursor for the history buffer.
 */
Cursor.prototype._start_historical_move = function() {
    if (!this._historical_start) {
        this._historical_start = this.get_state();
    }
};

/**
 * Record the ending state of the cursor for the history buffer, then
 * push a reversable action describing the change of the cursor.
 */
Cursor.prototype._end_historical_move = function() {
    this._push_history(
        'set_state', 
        [this.get_state()], 
        'set_state', 
        [this._historical_start], 
        config.history_group_delay || 100);
    this._historical_start = null;
};

/**
 * Makes a list of indentation strings used to indent one level,
 * ordered by usage preference.
 * @return {string}
 */
Cursor.prototype._make_indents = function() {
    var indents = [];
    if (config.use_spaces) {
        var indent = '';
        for (var i = 0; i < config.tab_width; i++) {
            indent += ' ';
            indents.push(indent);
        }
        indents.reverse();
    }
    indents.push('\t');
    return indents;
};

/**
 * Registers an action API with the map
 * @return {null}
 */
Cursor.prototype._register_api = function() {
    var that = this;
    register('cursor.set_state', utils.proxy(this.set_state, this), this);
    register('cursor.remove_selected', utils.proxy(this.remove_selected, this), this);
    register('cursor.keypress', utils.proxy(this.keypress, this), this);
    register('cursor.indent', utils.proxy(this.indent, this), this);
    register('cursor.unindent', utils.proxy(this.unindent, this), this);
    register('cursor.newline', utils.proxy(this.newline, this), this);
    register('cursor.insert_text', utils.proxy(this.insert_text, this), this);
    register('cursor.delete_backward', utils.proxy(this.delete_backward, this), this);
    register('cursor.delete_forward', utils.proxy(this.delete_forward, this), this);
    register('cursor.delete_word_left', utils.proxy(this.delete_word_left, this), this);
    register('cursor.delete_word_right', utils.proxy(this.delete_word_right, this), this);
    register('cursor.select_all', utils.proxy(this.select_all, this), this);
    register('cursor.left', function() { that.move_primary(-1, 0, true); that._reset_secondary(); return true; });
    register('cursor.right', function() { that.move_primary(1, 0, true); that._reset_secondary(); return true; });
    register('cursor.up', function() { that.move_primary(0, -1, true); that._reset_secondary(); return true; });
    register('cursor.down', function() { that.move_primary(0, 1, true); that._reset_secondary(); return true; });
    register('cursor.select_left', function() { that.move_primary(-1, 0); return true; });
    register('cursor.select_right', function() { that.move_primary(1, 0); return true; });
    register('cursor.select_up', function() { that.move_primary(0, -1); return true; });
    register('cursor.select_down', function() { that.move_primary(0, 1); return true; });
    register('cursor.word_left', function() { that.word_primary(-1); that._reset_secondary(); return true; });
    register('cursor.word_right', function() { that.word_primary(1); that._reset_secondary(); return true; });
    register('cursor.select_word_left', function() { that.word_primary(-1); return true; });
    register('cursor.select_word_right', function() { that.word_primary(1); return true; });
    register('cursor.line_start', function() { that.primary_goto_start(); that._reset_secondary(); return true; });
    register('cursor.line_end', function() { that.primary_goto_end(); that._reset_secondary(); return true; });
    register('cursor.select_line_start', function() { that.primary_goto_start(); return true; });
    register('cursor.select_line_end', function() { that.primary_goto_end(); return true; });
};

exports.Cursor = Cursor;
},{"./config.js":6,"./events/map.js":13,"./utils.js":36}],8:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var keymap = require('./events/map.js');
var register = keymap.Map.register;

var cursor = require('./cursor.js');
var utils = require('./utils.js');
/**
 * Manages one or more cursors
 */
var Cursors = function(model, clipboard, history) {
    utils.PosterClass.call(this);
    this._model = model;
    this.get_row_char = undefined;
    this.cursors = [];
    this._selecting_text = false;
    this._clipboard = clipboard;
    this._active_cursor = null;
    this._history = history;

    // Create initial cursor.
    this.create(undefined, false);

    // Register actions.
    register('cursors._cursor_proxy', utils.proxy(this._cursor_proxy, this));
    register('cursors.create', utils.proxy(this.create, this));
    register('cursors.single', utils.proxy(this.single, this));
    register('cursors.pop', utils.proxy(this.pop, this));
    register('cursors.start_selection', utils.proxy(this.start_selection, this));
    register('cursors.set_selection', utils.proxy(this.set_selection, this));
    register('cursors.start_set_selection', utils.proxy(this.start_set_selection, this));
    register('cursors.end_selection', utils.proxy(this.end_selection, this));
    register('cursors.select_word', utils.proxy(this.select_word, this));

    // Bind clipboard events.
    this._clipboard.on('cut', utils.proxy(this._handle_cut, this));
    this._clipboard.on('copy', utils.proxy(this._handle_copy, this));
    this._clipboard.on('paste', utils.proxy(this._handle_paste, this));
};
utils.inherit(Cursors, utils.PosterClass);

/**
 * Handles history proxy events for individual cursors.
 * @param  {integer} cursor_index
 * @param  {string} function_name
 * @param  {array} function_params
 */
Cursors.prototype._cursor_proxy = function(cursor_index, function_name, function_params) {
    if (cursor_index < this.cursors.length) {
        var cursor = this.cursors[cursor_index];
        cursor[function_name].apply(cursor, function_params);
    }
};

/**
 * Creates a cursor and manages it.
 * @param {object} [state] state to apply to the new cursor.
 * @param {boolean} [reversable] - defaults to true, is action reversable.
 * @return {Cursor} cursor
 */
Cursors.prototype.create = function(state, reversable) {
    // Record this action in history.
    if (reversable === undefined || reversable === true) {
        this._history.push_action('cursors.create', arguments, 'cursors.pop', []);
    }

    // Create a proxying history method for the cursor itself.
    var index = this.cursors.length;
    var that = this;
    var history_proxy = function(forward_name, forward_params, backward_name, backward_params, autogroup_delay) {
        that._history.push_action(
            'cursors._cursor_proxy', [index, forward_name, forward_params],
            'cursors._cursor_proxy', [index, backward_name, backward_params],
            autogroup_delay);
    };

    // Create the cursor.
    var new_cursor = new cursor.Cursor(this._model, history_proxy);
    this.cursors.push(new_cursor);

    // Set the initial properties of the cursor.
    new_cursor.set_state(state, false);

    // Listen for cursor change events.
    var that = this;
    new_cursor.on('change', function() {
        that.trigger('change', new_cursor);
        that._update_selection();
    });
    that.trigger('change', new_cursor);

    return new_cursor;
};

/**
 * Remove every cursor except for the first one.
 */
Cursors.prototype.single = function() {
    while (this.cursors.length > 1) {
        this.pop();
    }
};

/**
 * Remove the last cursor.
 * @returns {Cursor} last cursor or null
 */
Cursors.prototype.pop = function() {
    if (this.cursors.length > 1) {

        // Remove the last cursor and unregister it.
        var cursor = this.cursors.pop();
        cursor.unregister();
        cursor.off('change');

        // Record this action in history.
        this._history.push_action('cursors.pop', [], 'cursors.create', [cursor.get_state()]);

        // Alert listeners of changes.
        this.trigger('change');
        return cursor;
    }
    return null;
};

/**
 * Handles when the selected text is copied to the clipboard.
 * @param  {string} text - by val text that was cut
 * @return {null}
 */
Cursors.prototype._handle_copy = function(text) {
    this.cursors.forEach(function(cursor) {
        cursor.copy();
    });
};

/**
 * Handles when the selected text is cut to the clipboard.
 * @param  {string} text - by val text that was cut
 * @return {null}
 */
Cursors.prototype._handle_cut = function(text) {
    this.cursors.forEach(function(cursor) {
        cursor.cut();
    });
};

/**
 * Handles when text is pasted into the document.
 * @param  {string} text
 * @return {null}
 */
Cursors.prototype._handle_paste = function(text) {

    // If the modulus of the number of cursors and the number of pasted lines
    // of text is zero, split the cut lines among the cursors.
    var lines = text.split('\n');
    if (this.cursors.length > 1 && lines.length > 1 && lines.length % this.cursors.length === 0) {
        var lines_per_cursor = lines.length / this.cursors.length;
        this.cursors.forEach(function(cursor, index) {
            cursor.insert_text(lines.slice(
                index * lines_per_cursor, 
                index * lines_per_cursor + lines_per_cursor).join('\n'));
        });
    } else {
        this.cursors.forEach(function(cursor) {
            cursor.paste(text);
        });
    }
};

/**
 * Update the clippable text based on new selection.
 * @return {null}
 */
Cursors.prototype._update_selection = function() {
    
    // Copy all of the selected text.
    var selections = [];
    this.cursors.forEach(function(cursor) {
        selections.push(cursor.get());
    });

    // Make the copied text clippable.
    this._clipboard.set_clippable(selections.join('\n'));
};

/**
 * Starts selecting text from mouse coordinates.
 * @param  {MouseEvent} e - mouse event containing the coordinates.
 * @return {null}
 */
Cursors.prototype.start_selection = function(e) {
    var x = e.offsetX;
    var y = e.offsetY;

    this._selecting_text = true;
    if (this.get_row_char) {
        var location = this.get_row_char(x, y);
        this.cursors[0].set_both(location.row_index, location.char_index);
    }
};

/**
 * Finalizes the selection of text.
 * @return {null}
 */
Cursors.prototype.end_selection = function() {
    this._selecting_text = false;
};

/**
 * Sets the endpoint of text selection from mouse coordinates.
 * @param  {MouseEvent} e - mouse event containing the coordinates.
 * @return {null}
 */
Cursors.prototype.set_selection = function(e) {
    var x = e.offsetX;
    var y = e.offsetY;
    if (this._selecting_text && this.get_row_char) {
        var location = this.get_row_char(x, y);
        this.cursors[this.cursors.length-1].set_primary(location.row_index, location.char_index);
    }
};

/**
 * Sets the endpoint of text selection from mouse coordinates.
 * Different than set_selection because it doesn't need a call
 * to start_selection to work.
 * @param  {MouseEvent} e - mouse event containing the coordinates.
 * @return {null}
 */
Cursors.prototype.start_set_selection = function(e) {
    this._selecting_text = true;
    this.set_selection(e);
};

/**
 * Selects a word at the given mouse coordinates.
 * @param  {MouseEvent} e - mouse event containing the coordinates.
 * @return {null}
 */
Cursors.prototype.select_word = function(e) {
    var x = e.offsetX;
    var y = e.offsetY;
    if (this.get_row_char) {
        var location = this.get_row_char(x, y);
        this.cursors[this.cursors.length-1].select_word(location.row_index, location.char_index);
    }
};

// Exports
exports.Cursors = Cursors;

},{"./cursor.js":7,"./events/map.js":13,"./utils.js":36}],9:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('./utils.js');
var normalizer = require('./events/normalizer.js');
var keymap = require('./events/map.js');
var default_keymap = require('./events/default.js');
var cursors = require('./cursors.js');
var clipboard = require('./clipboard.js');
var history = require('./history.js');

/**
 * Controller for a DocumentModel.
 */
var DocumentController = function(el, model) {
    utils.PosterClass.call(this);
    this.clipboard = new clipboard.Clipboard(el);
    this.normalizer = new normalizer.Normalizer();
    this.normalizer.listen_to(el);
    this.normalizer.listen_to(this.clipboard.hidden_input);
    this.map = new keymap.Map(this.normalizer);
    this.map.map(default_keymap.map);
    this.history = new history.History(this.map)
    this.cursors = new cursors.Cursors(model, this.clipboard, this.history);
};
utils.inherit(DocumentController, utils.PosterClass);

// Exports
exports.DocumentController = DocumentController;

},{"./clipboard.js":5,"./cursors.js":8,"./events/default.js":12,"./events/map.js":13,"./events/normalizer.js":14,"./history.js":17,"./utils.js":36}],10:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('./utils.js');
var superset = require('./superset.js');

/**
 * Model containing all of the document's data (text).
 */
var DocumentModel = function() {
    utils.PosterClass.call(this);
    this._rows = [];
    this._row_tags = [];
    this._tag_lock = 0;
    this._pending_tag_events = false;
    this._init_properties();
};
utils.inherit(DocumentModel, utils.PosterClass);

/**
 * Acquire a lock on tag events
 *
 * Prevents tag events from firing.
 * @return {integer} lock count
 */
DocumentModel.prototype.acquire_tag_event_lock = function() {
    return this._tag_lock++;
};

/**
 * Release a lock on tag events
 * @return {integer} lock count
 */
DocumentModel.prototype.release_tag_event_lock = function() {
    this._tag_lock--;
    if (this._tag_lock < 0) {
        this._tag_lock = 0;
    }
    if (this._tag_lock === 0 && this._pending_tag_events) {
        this._pending_tag_events = false;
        this.trigger_tag_events();
    }
    return this._tag_lock;
};

/**
 * Triggers the tag change events.
 * @return {null}
 */
DocumentModel.prototype.trigger_tag_events = function(rows) {
    if (this._tag_lock === 0) {
        this.trigger('tags_changed', this._pending_tag_events_rows);
        this._pending_tag_events_rows = undefined;
    } else {
        this._pending_tag_events = true;
        if (this._pending_tag_events_rows) {
            this._pending_tag_events_rows = this._pending_tag_events_rows.concat(rows);
        } else {
            this._pending_tag_events_rows = rows;
        }
    }
};

/**
 * Sets a 'tag' on the text specified.
 * @param {integer} start_row - row the tag starts on
 * @param {integer} start_char - index, in the row, of the first tagged character
 * @param {integer} end_row - row the tag ends on
 * @param {integer} end_char - index, in the row, of the last tagged character
 * @param {string} tag_name
 * @param {any} tag_value - overrides any previous tags
 */
DocumentModel.prototype.set_tag = function(start_row, start_char, end_row, end_char, tag_name, tag_value) {
    var coords = this.validate_coords.apply(this, arguments);
    var rows = [];
    for (var row = coords.start_row; row <= coords.end_row; row++) {

        // Make sure the superset is defined for the row/tag_name pair.
        var row_tags = this._row_tags[row];
        if (row_tags[tag_name] === undefined) {
            row_tags[tag_name] = new superset.Superset();
        }

        // Get the start and end char indicies.
        var s = coords.start_char;
        var e = coords.end_char;
        if (row > coords.start_row) s = 0;
        if (row < coords.end_row) e = this._rows[row].length - 1;

        // Set the value for the range.
        row_tags[tag_name].set(s, e, tag_value);
        rows.push(row);
    }
    this.trigger_tag_events(rows);
};

/**
 * Removed all of the tags on the document.
 * @param  {integer} start_row
 * @param  {integer} end_row
 * @return {null}
 */
DocumentModel.prototype.clear_tags = function(start_row, end_row) {
    start_row = start_row !== undefined ? start_row : 0;
    end_row = end_row !== undefined ? end_row : this._row_tags.length - 1;
    var rows = [];
    for (var i = start_row; i <= end_row; i++) {
        this._row_tags[i] = {};
        rows.push(i);
    }
    this.trigger_tag_events(rows);
};

/**
 * Get the tag value applied to the character.
 * @param  {string} tag_name
 * @param  {integer} row_index
 * @param  {integer} char_index
 * @return {object} value or undefined
 */
DocumentModel.prototype.get_tag_value = function(tag_name, row_index, char_index) {

    // Loop through the tags on this row.
    var row_tags = this._row_tags[row_index][tag_name];
    if (row_tags !== undefined) {
        var tag_array = row_tags.array;
        for (var i = 0; i < tag_array.length; i++) {
            // Check if within.
            if (tag_array[i][0] <= char_index && char_index <= tag_array[i][1]) {
                return tag_array[i][2];
            }
        }
    }
    return undefined;
};

/**
 * Get the tag values applied to the specific range.
 * @param  {string} tag_name
 * @param  {integer} start_row
 * @param  {integer} start_char
 * @param  {integer} end_row
 * @param  {integer} end_char
 * @return {array} array of values
 */
DocumentModel.prototype.get_tag_values = function(tag_name, start_row, start_char, end_row, end_char) {
    var coords = this.validate_coords.call(this, start_row, start_char, end_row, end_char);
    var values = [];
    for (var row = coords.start_row; row <= coords.end_row; row++) {

        // Get the start and end char indicies.
        var s = coords.start_char;
        var e = coords.end_char;
        if (row > coords.start_row) s = 0;
        if (row < coords.end_row) e = this._rows[row].length - 1;

        // Loop through the tags on this row.
        var row_tags = this._row_tags[row][tag_name];
        if (row_tags !== undefined) {
            var tag_array = row_tags.array;
            for (var i = 0; i < tag_array.length; i++) {
                var ns = tag_array[i][0];
                var ne = tag_array[i][1];

                // Check if the areas insersect.
                if (ns <= e && ne >= s) {
                    var tag = tag_array[i][2];
                    if (values.indexOf(tag) == -1) {
                        values.push(tag);
                    }
                }
            }
        }
    }
    return values;
};

/**
 * Adds text efficiently somewhere in the document.
 * @param {integer} row_index  
 * @param {integer} char_index 
 * @param {string} text
 */
DocumentModel.prototype.add_text = function(row_index, char_index, text) {
    var coords = this.validate_coords.apply(this, Array.prototype.slice.call(arguments, 0,2));
    var old_text = this._rows[coords.start_row];
    // If the text has a new line in it, just re-set
    // the rows list.
    if (text.indexOf('\n') != -1) {
        var new_rows = [];
        if (coords.start_row > 0) {
            new_rows = this._rows.slice(0, coords.start_row);
        }

        var old_row_start = old_text.substring(0, coords.start_char);
        var old_row_end = old_text.substring(coords.start_char);
        var split_text = text.split('\n');
        new_rows.push(old_row_start + split_text[0]);

        if (split_text.length > 2) {
            new_rows = new_rows.concat(split_text.slice(1,split_text.length-1));
        }

        new_rows.push(split_text[split_text.length-1] + old_row_end);

        if (coords.start_row+1 < this._rows.length) {
            new_rows = new_rows.concat(this._rows.slice(coords.start_row+1));
        }

        this._rows = new_rows;
        this._resized_rows();
        this.trigger('row_changed', old_text, coords.start_row);
        this.trigger('rows_added', coords.start_row + 1, coords.start_row + split_text.length - 1);
        this.trigger('changed');

    // Text doesn't have any new lines, just modify the
    // line and then trigger the row changed event.
    } else {
        this._rows[coords.start_row] = old_text.substring(0, coords.start_char) + text + old_text.substring(coords.start_char);
        this.trigger('row_changed', old_text, coords.start_row);
        this.trigger('changed');
    }
};

/**
 * Removes a block of text from the document
 * @param  {integer} start_row
 * @param  {integer} start_char
 * @param  {integer} end_row
 * @param  {integer} end_char
 * @return {null}
 */
DocumentModel.prototype.remove_text = function(start_row, start_char, end_row, end_char) {
    var coords = this.validate_coords.apply(this, arguments);
    var old_text = this._rows[coords.start_row];
    if (coords.start_row == coords.end_row) {
        this._rows[coords.start_row] = this._rows[coords.start_row].substring(0, coords.start_char) + this._rows[coords.start_row].substring(coords.end_char);
    } else {
        this._rows[coords.start_row] = this._rows[coords.start_row].substring(0, coords.start_char) + this._rows[coords.end_row].substring(coords.end_char);
    }

    if (coords.end_row - coords.start_row > 0) {
        var rows_removed = this._rows.splice(coords.start_row + 1, coords.end_row - coords.start_row);
        this._resized_rows();

        // If there are more deleted rows than rows remaining, it
        // is faster to run a calculation on the remaining rows than
        // to run it on the rows removed.
        if (rows_removed.length > this._rows.length) {
            this.trigger('text_changed');
            this.trigger('changed');
        } else {
            this.trigger('row_changed', old_text, coords.start_row);
            this.trigger('rows_removed', rows_removed);
            this.trigger('changed');
        }
    } else if (coords.end_row == coords.start_row) {
        this.trigger('row_changed', old_text, coords.start_row);
        this.trigger('changed');
    }
};

/**
 * Remove a row from the document.
 * @param  {integer} row_index
 * @return {null}
 */
DocumentModel.prototype.remove_row = function(row_index) {
    if (0 < row_index && row_index < this._rows.length) {
        var rows_removed = this._rows.splice(row_index, 1);
        this._resized_rows();
        this.trigger('rows_removed', rows_removed);
        this.trigger('changed');
    }
};

/**
 * Gets a chunk of text.
 * @param  {integer} start_row
 * @param  {integer} start_char
 * @param  {integer} end_row
 * @param  {integer} end_char
 * @return {string}
 */
DocumentModel.prototype.get_text = function(start_row, start_char, end_row, end_char) {
    var coords = this.validate_coords.apply(this, arguments);
    if (coords.start_row==coords.end_row) {
        return this._rows[coords.start_row].substring(coords.start_char, coords.end_char);
    } else {
        var text = [];
        text.push(this._rows[coords.start_row].substring(coords.start_char));
        if (coords.end_row - coords.start_row > 1) {
            for (var i = coords.start_row + 1; i < coords.end_row; i++) {
                text.push(this._rows[i]);
            }
        }
        text.push(this._rows[coords.end_row].substring(0, coords.end_char));
        return text.join('\n');
    }
};

/**
 * Add a row to the document
 * @param {integer} row_index
 * @param {string} text - new row's text
 */
DocumentModel.prototype.add_row = function(row_index, text) {
    var new_rows = [];
    if (row_index > 0) {
        new_rows = this._rows.slice(0, row_index);
    }
    new_rows.push(text);
    if (row_index < this._rows.length) {
        new_rows = new_rows.concat(this._rows.slice(row_index));
    }

    this._rows = new_rows;
    this._resized_rows();
    this.trigger('rows_added', row_index, row_index);
    this.trigger('changed');
};

/**
 * Validates row, character coordinates in the document.
 * @param  {integer} start_row
 * @param  {integer} start_char
 * @param  {integer} (optional) end_row
 * @param  {integer} (optional) end_char
 * @return {dictionary} dictionary containing validated coordinates {start_row, 
 *                      start_char, end_row, end_char}
 */
DocumentModel.prototype.validate_coords = function(start_row, start_char, end_row, end_char) {

    // Make sure the values aren't undefined.
    if (start_row === undefined) start_row = 0;
    if (start_char === undefined) start_char = 0;
    if (end_row === undefined) end_row = start_row;
    if (end_char === undefined) end_char = start_char;

    // Make sure the values are within the bounds of the contents.
    if (this._rows.length === 0) {
        start_row = 0;
        start_char = 0;
        end_row = 0;
        end_char = 0;
    } else {
        if (start_row >= this._rows.length) start_row = this._rows.length - 1;
        if (start_row < 0) start_row = 0;
        if (end_row >= this._rows.length) end_row = this._rows.length - 1;
        if (end_row < 0) end_row = 0;

        if (start_char > this._rows[start_row].length) start_char = this._rows[start_row].length;
        if (start_char < 0) start_char = 0;
        if (end_char > this._rows[end_row].length) end_char = this._rows[end_row].length;
        if (end_char < 0) end_char = 0;
    }

    // Make sure the start is before the end.
    if (start_row > end_row || (start_row == end_row && start_char > end_char)) {
        return {
            start_row: end_row,
            start_char: end_char,
            end_row: start_row,
            end_char: start_char,
        };
    } else {
        return {
            start_row: start_row,
            start_char: start_char,
            end_row: end_row,
            end_char: end_char,
        };
    }
};

/**
 * Gets the text of the document.
 * @return {string}
 */
DocumentModel.prototype._get_text = function() {
    return this._rows.join('\n');
};

/**
 * Sets the text of the document.
 * Complexity O(N) for N rows
 * @param {string} value
 */
DocumentModel.prototype._set_text = function(value) {
    this._rows = value.split('\n');
    this._resized_rows();
    this.trigger('text_changed');
    this.trigger('changed');
};

/**
 * Updates _row's partner arrays.
 * @return {null} 
 */
DocumentModel.prototype._resized_rows = function() {

    // Make sure there are as many tag rows as there are text rows.
    while (this._row_tags.length < this._rows.length) {
        this._row_tags.push({});
    }
    if (this._row_tags.length > this._rows.length) {
        this._row_tags.splice(this._rows.length, this._row_tags.length - this._rows.length);
    }
};

/**
 * Create the document's properties.
 * @return {null}
 */
DocumentModel.prototype._init_properties = function() {    
    var that = this;
    this.property('rows', function() { 
        // Return a shallow copy of the array so it cannot be modified.
        return [].concat(that._rows); 
    });
    this.property('text', 
        utils.proxy(this._get_text, this), 
        utils.proxy(this._set_text, this));
};

exports.DocumentModel = DocumentModel;
},{"./superset.js":35,"./utils.js":36}],11:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('./utils.js');

// Renderers
var batch = require('./renderers/batch.js');
var highlighted_row = require('./renderers/highlighted_row.js');
var cursors = require('./renderers/cursors.js');
var selections = require('./renderers/selections.js');
var color = require('./renderers/color.js');
var highlighter = require('./highlighters/prism.js');

/**
 * Visual representation of a DocumentModel instance
 * @param {Canvas} canvas instance
 * @param {DocumentModel} model instance
 * @param {Cursors} cursors_model instance
 * @param {Style} style - describes rendering style
 * @param {function} has_focus - function that checks if the text area has focus
 */
var DocumentView = function(canvas, model, cursors_model, style, has_focus) {
    this._model = model;

    // Create child renderers.
    var row_renderer = new highlighted_row.HighlightedRowRenderer(model, canvas, style);
    row_renderer.margin_left = 2;
    row_renderer.margin_top = 2;
    this.row_renderer = row_renderer;
    
    // Make sure changes made to the cursor(s) are within the visible region.
    cursors_model.on('change', function(cursor) {
        var row_index = cursor.primary_row;
        var char_index = cursor.primary_char;

        var top = row_renderer.get_row_top(row_index);
        var height = row_renderer.get_row_height(row_index);
        var left = row_renderer.measure_partial_row_width(row_index, char_index) + row_renderer.margin_left;
        var bottom = top + height;

        var canvas_height = canvas.height - 20;
        if (bottom > canvas.scroll_top + canvas_height) {
            canvas.scroll_top = bottom - canvas_height;
        } else if (top < canvas.scroll_top) {
            canvas.scroll_top = top;
        }

        var canvas_width = canvas.width - 20;
        if (left > canvas.scroll_left + canvas_width) {
            canvas.scroll_left = left - canvas_width;
        } else if (left < canvas.scroll_left) {
            canvas.scroll_left = left;
        }
    });

    var cursors_renderer = new cursors.CursorsRenderer(
        cursors_model, 
        style, 
        row_renderer,
        has_focus);
    var selections_renderer = new selections.SelectionsRenderer(
        cursors_model, 
        style, 
        row_renderer,
        has_focus,
        cursors_renderer);

    // Create the background renderer
    var color_renderer = new color.ColorRenderer();
    color_renderer.color = style.background || 'white';
    style.on('changed:style', function() { color_renderer.color = style.background; });

    // Create the document highlighter, which needs to know about the currently
    // rendered rows in order to know where to highlight.
    this.highlighter = new highlighter.PrismHighlighter(model, row_renderer);

    // Pass get_row_char into cursors.
    cursors_model.get_row_char = utils.proxy(row_renderer.get_row_char, row_renderer);

    // Call base constructor.
    batch.BatchRenderer.call(this, [
        color_renderer,
        selections_renderer,
        row_renderer,
        cursors_renderer,
    ], canvas);

    // Hookup render events.
    this._canvas.on('redraw', utils.proxy(this.render, this));
    this._model.on('changed', utils.proxy(canvas.redraw, canvas));

    // Create properties
    var that = this;
    this.property('language', function() {
        return that._language;
    }, function(value) {
        that.highlighter.load(value);
        that._language = value;
    });
};
utils.inherit(DocumentView, batch.BatchRenderer);

exports.DocumentView = DocumentView;
},{"./highlighters/prism.js":16,"./renderers/batch.js":24,"./renderers/color.js":25,"./renderers/cursors.js":26,"./renderers/highlighted_row.js":27,"./renderers/selections.js":30,"./utils.js":36}],12:[function(require,module,exports){
// OSX bindings
if (navigator.appVersion.indexOf("Mac") != -1) {
    exports.map = {
        'alt-leftarrow' : 'cursor.word_left',
        'alt-rightarrow' : 'cursor.word_right',
        'shift-alt-leftarrow' : 'cursor.select_word_left',
        'shift-alt-rightarrow' : 'cursor.select_word_right',
        'alt-backspace' : 'cursor.delete_word_left',
        'alt-delete' : 'cursor.delete_word_right',
        'meta-leftarrow' : 'cursor.line_start',
        'meta-rightarrow' : 'cursor.line_end',
        'shift-meta-leftarrow' : 'cursor.select_line_start',
        'shift-meta-rightarrow' : 'cursor.select_line_end',
        'meta-a' : 'cursor.select_all',
        'meta-z' : 'history.undo',
        'meta-y' : 'history.redo',
    };

// Non OSX bindings
} else {
    exports.map = {
        'ctrl-leftarrow' : 'cursor.word_left',
        'ctrl-rightarrow' : 'cursor.word_right',
        'ctrl-backspace' : 'cursor.delete_word_left',
        'ctrl-delete' : 'cursor.delete_word_right',
        'shift-ctrl-leftarrow' : 'cursor.select_word_left',
        'shift-ctrl-rightarrow' : 'cursor.select_word_right',
        'home' : 'cursor.line_start',
        'end' : 'cursor.line_end',
        'shift-home' : 'cursor.select_line_start',
        'shift-end' : 'cursor.select_line_end',
        'ctrl-a' : 'cursor.select_all',
        'ctrl-z' : 'history.undo',
        'ctrl-y' : 'history.redo',
    };

}

// Common bindings
exports.map['keypress'] = 'cursor.keypress';
exports.map['enter'] = 'cursor.newline';
exports.map['delete'] = 'cursor.delete_forward';
exports.map['backspace'] = 'cursor.delete_backward';
exports.map['leftarrow'] = 'cursor.left';
exports.map['rightarrow'] = 'cursor.right';
exports.map['uparrow'] = 'cursor.up';
exports.map['downarrow'] = 'cursor.down';
exports.map['shift-leftarrow'] = 'cursor.select_left';
exports.map['shift-rightarrow'] = 'cursor.select_right';
exports.map['shift-uparrow'] = 'cursor.select_up';
exports.map['shift-downarrow'] = 'cursor.select_down';
exports.map['mouse0-dblclick'] = 'cursors.select_word';
exports.map['mouse0-down'] = 'cursors.start_selection';
exports.map['mouse-move'] = 'cursors.set_selection';
exports.map['mouse0-up'] = 'cursors.end_selection';
exports.map['shift-mouse0-up'] = 'cursors.end_selection';
exports.map['shift-mouse0-down'] = 'cursors.start_set_selection';
exports.map['shift-mouse-move'] = 'cursors.set_selection';
exports.map['tab'] = 'cursor.indent';
exports.map['shift-tab'] = 'cursor.unindent';
exports.map['escape'] = 'cursors.single';

},{}],13:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var utils = require('../utils.js');

/**
 * Event normalizer
 *
 * Listens to DOM events and emits 'cleaned' versions of those events.
 */
var Map = function(normalizer) {
    utils.PosterClass.call(this);
    this._map = {};

    // Create normalizer property
    this._normalizer = null;
    this._proxy_handle_event = utils.proxy(this._handle_event, this);
    var that = this;
    this.property('normalizer', function() {
        return that._normalizer;
    }, function(value) {
        // Remove event handler.
        if (that._normalizer) that._normalizer.off_all(that._proxy_handle_event);
        // Set, and add event handler.
        that._normalizer = value;
        if (value) value.on_all(that._proxy_handle_event);
    });

    // If defined, set the normalizer.
    if (normalizer) this.normalizer = normalizer;
};
utils.inherit(Map, utils.PosterClass);

/**
 * Map of API methods by name.
 * @type {dictionary}
 */
Map.registry = {};
Map._registry_tags = {};

/**
 * Registers an action.
 * @param  {string} name - name of the action
 * @param  {function} f
 * @param  {Object} (optional) tag - allows you to specify a tag
 *                  which can be used with the `unregister_by_tag`
 *                  method to quickly unregister actions with
 *                  the tag specified.
 * @return {null}
 */
Map.register = function(name, f, tag) {
    if (utils.is_array(Map.registry[name])) {
        Map.registry[name].push(f);
    } else {
        if (Map.registry[name]===undefined) {
            Map.registry[name] = f;
        } else {
            Map.registry[name] = [Map.registry[name], f];
        }
    }

    if (tag) {
        if (Map._registry_tags[tag] === undefined) {
            Map._registry_tags[tag] = [];
        }
        Map._registry_tags[tag].push({name: name, f: f});
    }
};

/**
 * Unregister an action.
 * @param  {string} name - name of the action
 * @param  {function} f
 * @return {boolean} true if action was found and unregistered
 */
Map.unregister = function(name, f) {
    if (utils.is_array(Map.registry[name])) {
        var index = Map.registry[name].indexOf(f);
        if (index != -1) {
            Map.registry[name].splice(index, 1);
            return true;
        }
    } else if (Map.registry[name] == f) {
        delete Map.registry[name];
        return true;
    }
    return false;
};

/**
 * Unregisters all of the actions registered with a given tag.
 * @param  {Object} tag - specified in Map.register.
 * @return {boolean} true if the tag was found and deleted.
 */
Map.unregister_by_tag = function(tag) {
    if (Map._registry_tags[tag]) {
        Map._registry_tags[tag].forEach(function(registration) {
            Map.unregister(registration.name, registration.f);
        });
        delete Map._registry_tags[tag];
        return true;
    }
};

/**
 * Append event actions to the map.
 *
 * This method has two signatures.  If a single argument
 * is passed to it, that argument is treated like a
 * dictionary.  If more than one argument is passed to it,
 * each argument is treated as alternating key, value
 * pairs of a dictionary.
 *
 * The map allows you to register actions for keys.
 * Example:
 *     map.append_map({
 *         'ctrl-a': 'cursors.select_all',
 *     })
 *
 * Multiple actions can be registered for a single event.
 * The actions are executed sequentially, until one action
 * returns `true` in which case the execution haults.  This
 * allows actions to run conditionally.
 * Example:
 *     // Implementing a dual mode editor, you may have two
 *     // functions to register for one key. i.e.:
 *     var do_a = function(e) {
 *         if (mode=='edit') {
 *             console.log('A');
 *             return true;
 *         }
 *     }
 *     var do_b = function(e) {
 *         if (mode=='command') {
 *             console.log('B');
 *             return true;
 *         }
 *     }
 *
 *     // To register both for one key
 *     Map.register('action_a', do_a);
 *     Map.register('action_b', do_b);
 *     map.append_map({
 *         'alt-v': ['action_a', 'action_b'],
 *     });
 * 
 * @return {null}
 */
Map.prototype.append_map = function() {
    var that = this;
    var parsed = this._parse_map_arguments(arguments);
    Object.keys(parsed).forEach(function(key) {
        if (that._map[key] === undefined) {
            that._map[key] = parsed[key];
        } else {
            that._map[key] = that._map[key].concat(parsed[key]);
        }
    });
};

/**
 * Alias for `append_map`.
 * @type {function}
 */
Map.prototype.map = Map.prototype.append_map;

/**
 * Prepend event actions to the map.
 *
 * See the doc for `append_map` for a detailed description of
 * possible input values.
 * @return {null}
 */
Map.prototype.prepend_map = function() {
    var that = this;
    var parsed = this._parse_map_arguments(arguments);
    Object.keys(parsed).forEach(function(key) {
        if (that._map[key] === undefined) {
            that._map[key] = parsed[key];
        } else {
            that._map[key] = parsed[key].concat(that._map[key]);
        }
    });
};

/**
 * Unmap event actions in the map.
 *
 * See the doc for `append_map` for a detailed description of
 * possible input values.
 * @return {null}
 */
Map.prototype.unmap = function() {
    var that = this;
    var parsed = this._parse_map_arguments(arguments);
    Object.keys(parsed).forEach(function(key) {
        if (that._map[key] !== undefined) {
            parsed[key].forEach(function(value) {
                var index = that._map[key].indexOf(value);
                if (index != -1) {
                    that._map[key].splice(index, 1);
                }
            });
        }
    });
};

/**
 * Get a modifiable array of the actions for a particular event.
 * @param  {string} event
 * @return {array} by ref copy of the actions registered to an event.
 */
Map.prototype.get_mapping = function(event) {
    return this._map[this._normalize_event_name(event)];
};

/**
 * Invokes the callbacks of an action by name.
 * @param  {string} name
 * @param  {array} [args] - arguments to pass to the action callback[s]
 * @return {boolean} true if one or more of the actions returned true
 */
Map.prototype.invoke = function(name, args) {
    var action_callbacks = Map.registry[name];
    if (action_callbacks) {
        if (utils.is_array(action_callbacks)) {
            var returns = [];
            action_callbacks.forEach(function(action_callback) {
                returns.append(action_callback.apply(undefined, args)===true);
            });

            // If one of the action callbacks returned true, cancel bubbling.
            if (returns.some(function(x) {return x;})) {
                return true;
            }
        } else {
            if (action_callbacks.apply(undefined, args)===true) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Parse the arguments to a map function.
 * @param  {arguments array} args
 * @return {dictionary} parsed results
 */
Map.prototype._parse_map_arguments = function(args) {
    var parsed = {};
    var that = this;

    // One arument, treat it as a dictionary of event names and
    // actions.
    if (args.length == 1) {
        Object.keys(args[0]).forEach(function(key) {
            var value = args[0][key];
            var normalized_key = that._normalize_event_name(key);

            // If the value is not an array, wrap it in one.
            if (!utils.is_array(value)) {
                value = [value];
            }

            // If the key is already defined, concat the values to
            // it.  Otherwise, set it.
            if (parsed[normalized_key] === undefined) {
                parsed[normalized_key] = value;
            } else {
                parsed[normalized_key] = parsed[normalized_key].concat(value);
            }
        });

    // More than one argument.  Treat as the format:
    // event_name1, action1, event_name2, action2, ..., event_nameN, actionN
    } else {
        for (var i=0; i<Math.floor(args.length/2); i++) {
            var key = that._normalize_event_name(args[2*i]);
            var value = args[2*i + 1];
            if (parsed[key]===undefined) {
                parsed[key] = [value];
            } else {
                parsed[key].push(value);
            }
        }
    }
    return parsed;
};

/**
 * Handles a normalized event.
 * @param  {string} name - name of the event
 * @param  {Event} e - browser Event object
 * @return {null}
 */
Map.prototype._handle_event = function(name, e) {
    var that = this;
    var normalized_event = this._normalize_event_name(name);
    var actions = this._map[normalized_event];
    if (actions) {
        actions.forEach(function(action) {
            if (that.invoke(action, [e])) {
                utils.cancel_bubble(e);
            }
        });
    }
    return false;
};

/**
 * Alphabetically sorts keys in event name, so
 * @param  {string} name - event name
 * @return {string} normalized event name
 */
Map.prototype._normalize_event_name = function(name) {
    return name.toLowerCase().trim().split('-').sort().join('-');
};

// Exports
exports.Map = Map;

},{"../utils.js":36}],14:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var utils = require('../utils.js');

/**
 * Event normalizer
 *
 * Listens to DOM events and emits 'cleaned' versions of those events.
 */
var Normalizer = function() {
    utils.PosterClass.call(this);
    this._el_hooks = {};
};
utils.inherit(Normalizer, utils.PosterClass);

/**
 * Listen to the events of an element.
 * @param  {HTMLElement} el
 * @return {null}
 */
Normalizer.prototype.listen_to = function(el) {
    var hooks = [];
    hooks.push(utils.hook(el, 'onkeypress', this._proxy('press', this._handle_keypress_event, el)));
    hooks.push(utils.hook(el, 'onkeydown',  this._proxy('down', this._handle_keyboard_event, el)));
    hooks.push(utils.hook(el, 'onkeyup',  this._proxy('up', this._handle_keyboard_event, el)));
    hooks.push(utils.hook(el, 'ondblclick',  this._proxy('dblclick', this._handle_mouse_event, el)));
    hooks.push(utils.hook(el, 'onclick',  this._proxy('click', this._handle_mouse_event, el)));
    hooks.push(utils.hook(el, 'onmousedown',  this._proxy('down', this._handle_mouse_event, el)));
    hooks.push(utils.hook(el, 'onmouseup',  this._proxy('up', this._handle_mouse_event, el)));
    hooks.push(utils.hook(el, 'onmousemove',  this._proxy('move', this._handle_mousemove_event, el)));
    this._el_hooks[el] = hooks;
};

/**
 * Stops listening to an element.
 * @param  {HTMLElement} el
 * @return {null}
 */
Normalizer.prototype.stop_listening_to = function(el) {
    if (this._el_hooks[el] !== undefined) {
        this._el_hooks[el].forEach(function(hook) {
            hook.unhook();
        });
        delete this._el_hooks[el];
    }
};

/**
 * Handles when a mouse event occurs
 * @param  {HTMLElement} el
 * @param  {Event} e
 * @return {null}
 */
Normalizer.prototype._handle_mouse_event = function(el, event_name, e) {
    e = e || window.event;
    this.trigger(this._modifier_string(e) + 'mouse' + e.button + '-' + event_name, e);
};

/**
 * Handles when a mouse event occurs
 * @param  {HTMLElement} el
 * @param  {Event} e
 * @return {null}
 */
Normalizer.prototype._handle_mousemove_event = function(el, event_name, e) {
    e = e || window.event;
    this.trigger(this._modifier_string(e) + 'mouse' + '-' + event_name, e);
};

/**
 * Handles when a keyboard event occurs
 * @param  {HTMLElement} el
 * @param  {Event} e
 * @return {null}
 */
Normalizer.prototype._handle_keyboard_event = function(el, event_name, e) {
    e = e || window.event;
    var keyname = this._lookup_keycode(e.keyCode);
    if (keyname !== undefined) {
        this.trigger(this._modifier_string(e) + keyname + '-' + event_name, e);

        if (event_name=='down') {            
            this.trigger(this._modifier_string(e) + keyname, e);
        }
    }
    this.trigger(this._modifier_string(e) + String(e.keyCode) + '-' + event_name, e);
    this.trigger('key' + event_name, e);
};

/**
 * Handles when a keypress event occurs
 * @param  {HTMLElement} el
 * @param  {Event} e
 * @return {null}
 */
Normalizer.prototype._handle_keypress_event = function(el, event_name, e) {
    this.trigger('keypress', e);
};

/**
 * Creates an element event proxy.
 * @param  {function} f
 * @param  {string} event_name
 * @param  {HTMLElement} el
 * @return {null}
 */
Normalizer.prototype._proxy = function(event_name, f, el) {
    var that = this;
    return function() {
        var args = [el, event_name].concat(Array.prototype.slice.call(arguments, 0));
        return f.apply(that, args);
    };
};

/**
 * Create a modifiers string from an event.
 * @param  {Event} e
 * @return {string} dash separated modifier string
 */
Normalizer.prototype._modifier_string = function(e) {
    var modifiers = [];
    if (e.ctrlKey) modifiers.push('ctrl');
    if (e.altKey) modifiers.push('alt');
    if (e.metaKey) modifiers.push('meta');
    if (e.shiftKey) modifiers.push('shift');
    var string = modifiers.sort().join('-');
    if (string.length > 0) string = string + '-';
    return string;
};

/**
 * Lookup the human friendly name for a keycode.
 * @param  {integer} keycode
 * @return {string} key name
 */
Normalizer.prototype._lookup_keycode = function(keycode) {
    if (112 <= keycode && keycode <= 123) { // F1-F12
        return 'f' + (keycode-111);
    } else if (48 <= keycode && keycode <= 57) { // 0-9
        return String(keycode-48);
    } else if (65 <= keycode && keycode <= 90) { // A-Z
        return 'abcdefghijklmnopqrstuvwxyz'.substring(String(keycode-65), String(keycode-64));
    } else {
        var codes = {
            8: 'backspace',
            9: 'tab',
            13: 'enter',
            16: 'shift',
            17: 'ctrl',
            18: 'alt',
            19: 'pause',
            20: 'capslock',
            27: 'esc',
            32: 'space',
            33: 'pageup',
            34: 'pagedown',
            35: 'end',
            36: 'home',
            37: 'leftarrow',
            38: 'uparrow',
            39: 'rightarrow',
            40: 'downarrow',
            44: 'printscreen',
            45: 'insert',
            46: 'delete',
            91: 'windows',
            93: 'menu',
            144: 'numlock',
            145: 'scrolllock',
            188: 'comma',
            190: 'period',
            191: 'fowardslash',
            192: 'tilde',
            219: 'leftbracket',
            220: 'backslash',
            221: 'rightbracket',
            222: 'quote',
        };
        return codes[keycode];
    } 
    // TODO: this function is missing some browser specific
    // keycode mappings.
};

// Exports
exports.Normalizer = Normalizer;

},{"../utils.js":36}],15:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('../utils.js');

/**
 * Listens to a model and higlights the text accordingly.
 * @param {DocumentModel} model
 */
var HighlighterBase = function(model, row_renderer) {
    utils.PosterClass.call(this);
    this._model = model;
    this._row_renderer = row_renderer;
    this._queued = null;
    this.delay = 15; //ms

    // Bind events.
    this._row_renderer.on('rows_changed', utils.proxy(this._handle_scroll, this));
    this._model.on('text_changed', utils.proxy(this._handle_text_change, this));
    this._model.on('row_changed', utils.proxy(this._handle_text_change, this));
};
utils.inherit(HighlighterBase, utils.PosterClass);

/**
 * Highlight the document
 * @return {null}
 */
HighlighterBase.prototype.highlight = function(start_row, end_row) {
    throw new Error('Not implemented');
};

/**
 * Queues a highlight operation.
 *
 * If a highlight operation is already queued, don't queue
 * another one.  This ensures that the highlighting is
 * frame rate locked.  Highlighting is an expensive operation.
 * @return {null}
 */
HighlighterBase.prototype._queue_highlighter = function() {
    if (this._queued === null) {
        var that = this;
        this._queued = setTimeout(function() {
            that._model.acquire_tag_event_lock();
            try {
                var visible_rows = that._row_renderer.get_visible_rows();
                var top_row = visible_rows.top_row;
                var bottom_row = visible_rows.bottom_row;
                that.highlight(top_row, bottom_row);
            } finally {
                that._model.release_tag_event_lock();
                that._queued = null;
            }
        }, this.delay);
    }
};

/**
 * Handles when the visible row indicies are changed.
 * @return {null}
 */
HighlighterBase.prototype._handle_scroll = function(start_row, end_row) {
    this._queue_highlighter();
};

/**
 * Handles when the text changes.
 * @return {null}
 */
HighlighterBase.prototype._handle_text_change = function() {
    this._queue_highlighter();
};

// Exports
exports.HighlighterBase = HighlighterBase;

},{"../utils.js":36}],16:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var utils = require('../utils.js');
var superset = require('../superset.js');
var highlighter = require('./highlighter.js');
var prism = require('../../components/prism.js');

/**
 * Listens to a model and highlights the text accordingly.
 * @param {DocumentModel} model
 */
var PrismHighlighter = function(model, row_renderer) {
    highlighter.HighlighterBase.call(this, model, row_renderer);

    // Look back and forward this many rows for contextually 
    // sensitive highlighting.
    this._row_padding = 30;
    this._language = null;

    // Properties
    this.property('languages', function() {
        var languages = [];
        for (var l in prism.languages) {
            if (prism.languages.hasOwnProperty(l)) {
                if (["extend", "insertBefore", "DFS"].indexOf(l) == -1) {
                    languages.push(l);
                }
            }
        }
        return languages;
    });
};
utils.inherit(PrismHighlighter, highlighter.HighlighterBase);

/**
 * Highlight the document
 * @return {null}
 */
PrismHighlighter.prototype.highlight = function(start_row, end_row) {
    // Get the first and last rows that should be highlighted.
    start_row = Math.max(0, start_row - this._row_padding);
    end_row = Math.min(this._model._rows.length - 1, end_row + this._row_padding);

    // Abort if language isn't specified.
    if (!this._language) return;
    
    // Get the text of the rows.
    var text = this._model.get_text(start_row, 0, end_row, this._model._rows[end_row].length);

    // Figure out where each tag belongs.
    var highlights = this._highlight(text); // [start_index, end_index, tag]
    
    // Calculate Poster tags
    var that = this;
    highlights.forEach(function(highlight) {

        // Translate tag character indicies to row, char coordinates.
        var before_rows = text.substring(0, highlight[0]).split('\n');
        var group_start_row = start_row + before_rows.length - 1;
        var group_start_char = before_rows[before_rows.length - 1].length;
        var after_rows = text.substring(0, highlight[1]).split('\n');
        var group_end_row = start_row + after_rows.length - 1;
        var group_end_char = after_rows[after_rows.length - 1].length;

        // Apply tag if it's not already applied.
        var tag = highlight[2].toLowerCase();
        var existing_tags = that._model.get_tag_values('syntax', group_start_row, group_start_char, group_end_row, group_end_char);
        if (existing_tags.length !== 1 || existing_tags[0] !== tag) {
            that._model.set_tag(group_start_row, group_start_char, group_end_row, group_end_char, 'syntax', tag);
        }
    });
};

/**
 * Find each part of text that needs to be highlighted.
 * @param  {string} text
 * @return {array} list containing items of the form [start_index, end_index, tag]
 */
PrismHighlighter.prototype._highlight = function(text) {

    // Tokenize using prism.js
    var tokens = prism.tokenize(text, this._language);

    // Convert the tokens into [start_index, end_index, tag]
    var left = 0;
    var flatten = function(tokens, prefix) {
        if (!prefix) { prefix = []; }
        var flat = [];
        for (var i = 0; i < tokens.length; i++) {
            var token = tokens[i];
            if (token.content) {
                flat = flat.concat(flatten([].concat(token.content), prefix.concat(token.type)));
            } else {
                if (prefix.length > 0) {
                    flat.push([left, left + token.length, prefix.join(' ')]);
                }
                left += token.length;
            }
        }
        return flat;
    };
    var tags = flatten(tokens);

    // Use a superset to reduce overlapping tags.
    var set = new superset.Superset();
    set.set(0, text.length-1, '');
    tags.forEach(function(tag) {
        set.set(tag[0], tag[1]-1, tag[2]);
    });
    return set.array;
};

/**
 * Loads a syntax by language name.
 * @param  {string or dictionary} language
 * @return {boolean} success
 */
PrismHighlighter.prototype.load = function(language) {
    try {
        // Check if the language exists.
        if (prism.languages[language] === undefined) {
            throw new Error('Language does not exist!');
        }
        this._language = prism.languages[language];
        this._queue_highlighter();
        return true;
    } catch (e) {
        console.error('Error loading language', e);
        this._language = null;
        return false;
    }
};

// Exports
exports.PrismHighlighter = PrismHighlighter;

},{"../../components/prism.js":2,"../superset.js":35,"../utils.js":36,"./highlighter.js":15}],17:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('./utils.js');
var keymap = require('./events/map.js');

/**
 * Reversible action history.
 */
var History = function(map) {
    utils.PosterClass.call(this);
    this._map = map;
    this._actions = [];
    this._action_groups = [];
    this._undone = [];
    this._autogroup = null;
    this._action_lock = false;

    keymap.Map.register('history.undo', utils.proxy(this.undo, this));
    keymap.Map.register('history.redo', utils.proxy(this.redo, this));
};
utils.inherit(History, utils.PosterClass);

/**
 * Push a reversible action to the history.
 * @param  {string} forward_name - name of the forward action
 * @param  {array} forward_params - parameters to use when invoking the forward action
 * @param  {string} backward_name - name of the backward action
 * @param  {array} backward_params - parameters to use when invoking the backward action
 * @param  {float} [autogroup_delay] - time to wait to automatically group the actions.
 *                                     If this is undefined, autogrouping will not occur.
 */
History.prototype.push_action = function(forward_name, forward_params, backward_name, backward_params, autogroup_delay) {
    if (this._action_lock) return;

    this._actions.push({
        forward: {
            name: forward_name,
            parameters: forward_params,
        },
        backward: {
            name: backward_name,
            parameters: backward_params,
        }
    });
    this._undone = [];

    // If a delay is defined, prepare a timeout to autogroup.
    if (autogroup_delay !== undefined) {

        // If another timeout was already set, cancel it.
        if (this._autogroup !== null) {
            clearTimeout(this._autogroup);
        }

        // Set a new timeout.
        var that = this;
        this._autogroup = setTimeout(function() {
            that.group_actions();
        }, autogroup_delay);
    };
};

/**
 * Commit the pushed actions to one group.
 */
History.prototype.group_actions = function() {
    this._autogroup = null;
    if (this._action_lock) return;
    
    this._action_groups.push(this._actions);
    this._actions = [];
    this._undone = [];
};

/**
 * Undo one set of actions.
 */
History.prototype.undo = function() {
    // If a timeout is set, group now.
    if (this._autogroup !== null) {
        clearTimeout(this._autogroup);
        this.group_actions();
    }

    var undo;
    if (this._actions.length > 0) {
        undo = this._actions;
    } else if (this._action_groups.length > 0) {
        undo = this._action_groups.pop();
        undo.reverse();
    } else {
        return true;
    }

    // Undo the actions.
    if (!this._action_lock) {
        this._action_lock = true;
        try {
            var that = this;
            undo.forEach(function(action) {
                that._map.invoke(action.backward.name, action.backward.parameters);
            });
        } finally {
            this._action_lock = false;
        }
    }

    // Allow the action to be redone.
    this._undone.push(undo);
    return true;
};

/**
 * Redo one set of actions.
 */
History.prototype.redo = function() {
    if (this._undone.length > 0) {
        var redo = this._undone.pop();
        
        // Redo the actions.
        if (!this._action_lock) {
            this._action_lock = true;
            try {
                var that = this;
                redo.forEach(function(action) {
                    that._map.invoke(action.forward.name, action.forward.parameters);
                });
            } finally {
                this._action_lock = false;
            }
        }

        // Allow the action to be undone.
        this._action_groups.push(redo);
    }
    return true;
};

exports.History = History;

},{"./events/map.js":13,"./utils.js":36}],18:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var plugin = require('../plugin.js');
var utils = require('../../utils.js');
var renderer = require('./renderer.js');

/**
 * Gutter plugin.
 */
var Gutter = function() {
    plugin.PluginBase.call(this);
    this.on('load', this._handle_load, this);
    this.on('unload', this._handle_unload, this);

    // Create a gutter_width property that is adjustable.
    this._gutter_width = 50;
    var that = this;
    this.property('gutter_width', function() {
        return that._gutter_width;
    }, utils.proxy(this._set_width, this));
    this.property('renderer', function() {
        return that._renderer;
    });
};
utils.inherit(Gutter, plugin.PluginBase);

/**
 * Sets the gutter's width.
 * @param {integer} value - width in pixels
 */
Gutter.prototype._set_width = function(value) {
    if (this._gutter_width !== value) {
        if (this.loaded) {
            this.poster.view.row_renderer.margin_left += value - this._gutter_width;
        }
        this._gutter_width = value;
        this.trigger('changed');
    }
};

/**
 * Handles when the plugin is loaded.
 */
Gutter.prototype._handle_load = function() {
    this.poster.view.row_renderer.margin_left += this._gutter_width;
    this._renderer = new renderer.GutterRenderer(this);
    this.register_renderer(this._renderer);
};

/**
 * Handles when the plugin is unloaded.
 */
Gutter.prototype._handle_unload = function() {
    // Remove all listeners to this plugin's changed event.
    this._renderer.unregister();
    this.poster.view.row_renderer.margin_left -= this._gutter_width;
};

exports.Gutter = Gutter;

},{"../../utils.js":36,"../plugin.js":23,"./renderer.js":19}],19:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var renderer = require('../../renderers/renderer.js');
var utils = require('../../utils.js');

/**
 * Renderers the gutter.
 */
var GutterRenderer = function(gutter) {
    renderer.RendererBase.call(this, undefined, {parent_independent: true});
    this._gutter  = gutter;
    var that = this;
    this._gutter.on('changed', function() {
        that._render();
        that.trigger('changed');
    });
    this._hovering = false;
};
utils.inherit(GutterRenderer, renderer.RendererBase);

/**
 * Handles rendering
 * Only re-render when scrolled horizontally.
 */
GutterRenderer.prototype.render = function(scroll) {
    // Scrolled right xor hovering
    var left = this._gutter.poster.canvas.scroll_left;
    if ((left > 0) ^ this._hovering) {
        this._hovering = left > 0;
        this._render();
    }
};

/**
 * Renders the gutter
 */
GutterRenderer.prototype._render = function() {
    this._canvas.clear();
    var width = this._gutter.gutter_width;
    this._canvas.draw_rectangle(
        0, 0, width, this.height, 
        {
            fill_color: this._gutter.poster.style.gutter,
        }
    );

    // If the gutter is hovering over content, draw a drop shadow.
    if (this._hovering) {
        var shadow_width = 15;
        var gradient = this._canvas.gradient(
            width, 0, width+shadow_width, 0, this._gutter.poster.style.gutter_shadow ||
            [
                [0, 'black'], 
                [1, 'transparent']
            ]);
        this._canvas.draw_rectangle(
            width, 0, shadow_width, this.height, 
            {
                fill_color: gradient,
                alpha: 0.35,
            }
        );

    }
};

/**
 * Unregister the event listeners
 * @param  {Poster} poster
 * @param  {Gutter} gutter
 */
GutterRenderer.prototype.unregister = function() {
    this._gutter.off('changed', this._render);
};

exports.GutterRenderer = GutterRenderer;

},{"../../renderers/renderer.js":28,"../../utils.js":36}],20:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var plugin = require('../plugin.js');
var utils = require('../../utils.js');
var renderer = require('./renderer.js');

/**
 * Line numbers plugin.
 */
var LineNumbers = function() {
    plugin.PluginBase.call(this);
    this.on('load', this._handle_load, this);
    this.on('unload', this._handle_unload, this);
};
utils.inherit(LineNumbers, plugin.PluginBase);

/**
 * Handles when the plugin is loaded.
 */
LineNumbers.prototype._handle_load = function() {
    this._renderer = new renderer.LineNumbersRenderer(this);
    this.register_renderer(this._renderer);
};

/**
 * Handles when the plugin is unloaded.
 */
LineNumbers.prototype._handle_unload = function() {
    // Remove all listeners to this plugin's changed event.
    this._renderer.unregister();
};

exports.LineNumbers = LineNumbers;

},{"../../utils.js":36,"../plugin.js":23,"./renderer.js":21}],21:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var renderer = require('../../renderers/renderer.js');
var utils = require('../../utils.js');
var canvas = require('../../canvas.js');

/**
 * Renderers the line numbers.
 */
var LineNumbersRenderer = function(plugin) {
    renderer.RendererBase.call(this, undefined, {parent_independent: true});
    this._plugin  = plugin;
    this._top = null;
    this._top_row = null;
    this._character_width = null;
    this._last_row_count = null;

    // Find gutter plugin, listen to its change event.
    var manager = this._plugin.poster.plugins;
    this._gutter = manager.find('gutter')[0];
    this._gutter.renderer.on('changed', this._gutter_resize, this);

    // Get row renderer.
    this._row_renderer = this._plugin.poster.view.row_renderer;

    // Double buffer.
    this._text_canvas = new canvas.Canvas();
    this._tmp_canvas = new canvas.Canvas();
    this._text_canvas.width = this._gutter.gutter_width;
    this._tmp_canvas.width = this._gutter.gutter_width;

    // Adjust every buffer's size when the height changes.
    var that = this;
    this.property('height', function() {
        return that._canvas.height;
    }, function(value) {
        that._canvas.height = value;

        // The text canvas should be the right height to fit all of the lines
        // that will be rendered in the base canvas.  This includes the lines
        // that are partially rendered at the top and bottom of the base canvas.
        var row_height = that._row_renderer.get_row_height();
        that._row_height = row_height;
        that._visible_row_count = Math.ceil(value/row_height) + 1;
        that._text_canvas.height = that._visible_row_count * row_height;
        that._tmp_canvas.height = that._text_canvas.height;
        that.rerender();
        that.trigger('changed');
    });
    this.height = this.height;

    // Adjust the gutter size when the number of lines in the document changes.
    this._plugin.poster.model.on('text_changed', utils.proxy(this._handle_text_change, this));
    this._plugin.poster.model.on('rows_added', utils.proxy(this._handle_text_change, this));
    this._plugin.poster.model.on('rows_removed', utils.proxy(this._handle_text_change, this));
    this._handle_text_change();
};
utils.inherit(LineNumbersRenderer, renderer.RendererBase);

/**
 * Handles rendering
 * Only re-render when scrolled vertically.
 */
LineNumbersRenderer.prototype.render = function(scroll) {
    var top = this._gutter.poster.canvas.scroll_top;
    if (this._top === null || this._top !== top) {
        this._top = top;
        this._render();
    }
};

/**
 * Renders the line numbers
 */
LineNumbersRenderer.prototype._render = function() {
    // Measure the width of numerical characters if not done yet.
    if (this._character_width===null) {
        this._character_width = this._text_canvas.measure_text('0123456789', {
            font_family: 'monospace',
            font_size: 14,
        }) / 10.0;
        this._handle_text_change();
    }

    // Update the text buffer if needed.
    var top_row = this._row_renderer.get_row_char(0, this._top).row_index;
    var lines = this._plugin.poster.model._rows.length;
    if (this._top_row !== top_row) {
        this._last_row_count = lines;
        var last_top_row = this._top_row;
        this._top_row = top_row;
        
        // Recycle rows if possible.
        var row_scroll = this._top_row - last_top_row;
        var row_delta = Math.abs(row_scroll);
        if (this._top_row !== null && row_delta < this._visible_row_count) {

            // Get a snapshot of the text before the scroll.
            this._tmp_canvas.clear();
            this._tmp_canvas.draw_image(this._text_canvas, 0, 0);

            // Render the new rows.
            this._text_canvas.clear();
            if (this._top_row < last_top_row) {
                // Scrolled up the document (the scrollbar moved up, page down)
                this._render_rows(this._top_row, row_delta);
            } else {
                // Scrolled down the document (the scrollbar moved down, page up)
                this._render_rows(this._top_row + this._visible_row_count - row_delta, row_delta);
            }
            
            // Use the old content to fill in the rest.
            this._text_canvas.draw_image(this._tmp_canvas, 0, -row_scroll * this._row_height);
        } else {
            // Draw everything.
            this._text_canvas.clear();
            this._render_rows(this._top_row, this._visible_row_count);
        }
    }
    
    // Render the buffer at the correct offset.
    this._canvas.clear();
    this._canvas.draw_image(
        this._text_canvas,
        0, 
        this._row_renderer.get_row_top(this._top_row) - this._row_renderer.top);
};

LineNumbersRenderer.prototype.rerender = function() {
    // Draw everything.
    this._character_width = null;
    this._text_canvas.erase_options_cache();
    this._text_canvas.clear();
    this._render_rows(this._top_row, this._visible_row_count);

    // Render the buffer at the correct offset.
    this._canvas.clear();
    this._canvas.draw_image(
        this._text_canvas,
        0, 
        this._row_renderer.get_row_top(this._top_row) - this._row_renderer.top);
};

/**
 * Renders a set of line numbers.
 * @param  {integer} start_row
 * @param  {integer} num_rows
 */
LineNumbersRenderer.prototype._render_rows = function(start_row, num_rows) {
    var lines = this._plugin.poster.model._rows.length;
    for (var i = start_row; i < start_row + num_rows; i++) {
        if (i < lines) {
            var y = (i - this._top_row) * this._row_height;
            if (this._plugin.poster.config.highlight_draw) {
                this._text_canvas.draw_rectangle(0, y, this._text_canvas.width, this._row_height, {
                    fill_color: utils.random_color(),
                });
            }

            this._text_canvas.draw_text(10, y, String(i+1), {
                font_family: 'monospace',
                font_size: 14,
                color: this._plugin.poster.style.gutter_text || 'black',
            });
        }
    }

};

/**
 * Handles when the number of lines in the editor changes.
 */
LineNumbersRenderer.prototype._handle_text_change = function() {
    var lines = this._plugin.poster.model._rows.length;
    var digit_width = Math.max(2, Math.ceil(Math.log10(lines+1)) + 1);
    var char_width = this._character_width || 10.0;
    this._gutter.gutter_width = digit_width * char_width + 8.0;

    if (lines !== this._last_row_count) {
        this.rerender();
        this.trigger('changed');
    }
};

/**
 * Handles when the gutter is resized
 */
LineNumbersRenderer.prototype._gutter_resize = function() {
    this._text_canvas.width = this._gutter.gutter_width;
    this._tmp_canvas.width = this._gutter.gutter_width; 
    this.rerender();
    this.trigger('changed');
};

/**
 * Unregister the event listeners
 * @param  {Poster} poster
 * @param  {Gutter} gutter
 */
LineNumbersRenderer.prototype.unregister = function() {
    this._gutter.off('changed', this._render);
};

exports.LineNumbersRenderer = LineNumbersRenderer;

},{"../../canvas.js":4,"../../renderers/renderer.js":28,"../../utils.js":36}],22:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('../utils.js');
var pluginbase = require('./plugin.js');
var gutter = require('./gutter/gutter.js');
var linenumbers = require('./linenumbers/linenumbers.js');

/**
 * Plugin manager class
 */
var PluginManager = function(poster) {
    utils.PosterClass.call(this);
    this._poster = poster;

    // Populate built-in plugin list.
    this._internal_plugins = {};
    this._internal_plugins.gutter = gutter.Gutter;
    this._internal_plugins.linenumbers = linenumbers.LineNumbers;

    // Properties
    this._plugins = [];
    var that = this;
    this.property('plugins', function() {
        return [].concat(that._plugins);
    });
};
utils.inherit(PluginManager, utils.PosterClass);

/**
 * Loads a plugin
 * @param  {string or PluginBase} plugin
 * @returns {boolean} success
 */
PluginManager.prototype.load = function(plugin) {
    if (!(plugin instanceof pluginbase.PluginBase)) {
        var plugin_class = this._internal_plugins[plugin];
        if (plugin_class !== undefined) {
            plugin = new plugin_class();
        }
    }

    if (plugin instanceof pluginbase.PluginBase) {
        this._plugins.push(plugin);
        plugin._load(this, this._poster);
        return true;
    }
    return false;
};

/**
 * Unloads a plugin
 * @param  {PluginBase} plugin
 * @returns {boolean} success
 */
PluginManager.prototype.unload = function(plugin) {
    var index = this._plugins.indexOf(plugin);
    if (index != -1) {
        this._plugins.splice(index, 1);
        plugin._unload();
        return true;
    }
    return false;
};

/**
 * Finds the instance of a plugin.
 * @param  {string or type} plugin_class - name of internal plugin or plugin class
 * @return {array} of plugin instances
 */
PluginManager.prototype.find = function(plugin_class) {
    if (this._internal_plugins[plugin_class] !== undefined) {
        plugin_class = this._internal_plugins[plugin_class];
    }

    var found = [];
    for (var i = 0; i < this._plugins.length; i++) {
        if (this._plugins[i] instanceof plugin_class) {
            found.push(this._plugins[i]);
        }
    }
    return found;
};

exports.PluginManager = PluginManager;

},{"../utils.js":36,"./gutter/gutter.js":18,"./linenumbers/linenumbers.js":20,"./plugin.js":23}],23:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('../utils.js');

/**
 * Plugin base class
 */
var PluginBase = function() {
    utils.PosterClass.call(this);
    this._renderers = [];
    this.loaded = false;

    // Properties
    this._poster = null;
    var that = this;
    this.property('poster', function() {
        return that._poster;
    });
};
utils.inherit(PluginBase, utils.PosterClass);

/**
 * Loads the plugin
 */
PluginBase.prototype._load = function(manager, poster) {
    this._poster = poster;
    this._manager = manager;
    this.loaded = true;

    this.trigger('load');
};

/**
 * Unloads this plugin
 */
PluginBase.prototype.unload = function() {
    this._manager.unload(this);
};

/**
 * Trigger unload event
 */
PluginBase.prototype._unload = function() {
    // Unregister all renderers.
    for (var i = 0; i < this._renderers.length; i++) {
        this._unregister_renderer(this._renderers[i]);
    }
    this.loaded = false;
    this.trigger('unload');
};

/**
 * Registers a renderer
 * @param  {RendererBase} renderer
 */
PluginBase.prototype.register_renderer = function(renderer) {
    this._renderers.push(renderer);
    this.poster.view.add_renderer(renderer);
};

/**
 * Unregisters a renderer and removes it from the internal list.
 * @param  {RendererBase} renderer
 */
PluginBase.prototype.unregister_renderer = function(renderer) {
    var index = this._renderers.indexOf(renderer);
    if (index !== -1) {
        this._renderers.splice(index, 1);
    }

    this._unregister_renderer(renderer);
};

/**
 * Unregisters a renderer
 * @param  {RendererBase} renderer
 */
PluginBase.prototype._unregister_renderer = function(renderer) {
    this.poster.view.remove_renderer(renderer);
};

exports.PluginBase = PluginBase;

},{"../utils.js":36}],24:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('../utils.js');
var renderer = require('./renderer.js');
var config = require('../config.js');
config = config.config;

/**
 * Groups multiple renderers
 * @param {array} renderers - array of renderers
 * @param {Canvas} canvas
 */
var BatchRenderer = function(renderers, canvas) {
    renderer.RendererBase.call(this, canvas);
    this._render_lock = false;
    this._renderers = renderers;

    // Listen to the layers, if one layer changes, recompose
    // the full image by copying them all again.
    var that = this;
    this._renderers.forEach(function(renderer) {
        renderer.on('changed', function() {
            var rendered_region = renderer._canvas.rendered_region;
            that._copy_renderers(rendered_region);
        });
    });
    
    // Create properties.
    this.property('width', function() {
        return that._canvas.width;
    }, function(value) {
        that._canvas.width = value;
        that._renderers.forEach(function(renderer) {
            renderer.width = value;
        });
    });
    this.property('height', function() {
        return that._canvas.height;
    }, function(value) {
        that._canvas.height = value;
        that._renderers.forEach(function(renderer) {
            renderer.height = value;
        });
    });
};
utils.inherit(BatchRenderer, renderer.RendererBase);

/**
 * Adds a renderer
 */
BatchRenderer.prototype.add_renderer = function(renderer) {
    var that = this;
    this._renderers.push(renderer);
    renderer.on('changed', function() {
        var rendered_region = renderer._canvas.rendered_region;
        that._copy_renderers(rendered_region);
    });
};

/**
 * Removes a renderer
 */
BatchRenderer.prototype.remove_renderer = function(renderer) {
    var index = this._renderers.indexOf(renderer);
    if (index !== -1) {
        this._renderers.splice(index, 1);
        renderer.off('changed');
    }
};

/**
 * Render to the canvas
 * @param {dictionary} (optional) scroll - How much the canvas was scrolled.  This
 *                     is a dictionary of the form {x: float, y: float}
 * @return {null}
 */
BatchRenderer.prototype.render = function(scroll) {
    if (!this._render_lock) {
        try {
            this._render_lock = true;

            var that = this;
            this._renderers.forEach(function(renderer) {

                // Apply the rendering coordinate transforms of the parent.
                if (!renderer.options.parent_independent) {
                    renderer._canvas._tx = utils.proxy(that._canvas._tx, that._canvas);
                    renderer._canvas._ty = utils.proxy(that._canvas._ty, that._canvas);
                }
            });

            // Tell each renderer to render and keep track of the region
            // that has freshly rendered contents.
            var rendered_region = null;
            this._renderers.forEach(function(renderer) {
                 // Tell the renderer to render itself.
                renderer.render(scroll);

                var new_region = renderer._canvas.rendered_region;
                if (rendered_region===null) {
                    rendered_region = new_region;
                } else if (new_region !== null) {
                    
                    // Calculate the sum of the two dirty regions.
                    var x1 = rendered_region.x;
                    var x2 = rendered_region.x + rendered_region.width;
                    var y1 = rendered_region.y;
                    var y2 = rendered_region.y + rendered_region.height;
                    
                    x1 = Math.min(x1, new_region.x);
                    x2 = Math.max(x2, new_region.x + new_region.width);
                    y1 = Math.min(y1, new_region.y);
                    y2 = Math.max(y2, new_region.y + new_region.height);
                    
                    rendered_region.x = x1;
                    rendered_region.y = y1;
                    rendered_region.width = x2 - x1;
                    rendered_region.height = y2 - y1;
                }
            });

            // Copy the results to self.
            this._copy_renderers(rendered_region);
        } finally {
            this._render_lock = false;
        }
    }
};

/**
 * Copies all the renderer layers to the canvas.
 * @return {null}
 */
BatchRenderer.prototype._copy_renderers = function(region) {
    var that = this;
    this._canvas.clear(region);
    this._renderers.forEach(function(renderer) {
        that._copy_renderer(renderer, region);
    });

    // Debug, higlight blit region.
    if (region && config.highlight_blit) {
        this._canvas.draw_rectangle(region.x, region.y, region.width, region.height, {color: utils.random_color()});
    }
};

/**
 * Copy a renderer to the canvas.
 * @param  {RendererBase} renderer
 * @param  {object} (optional) region 
 */
BatchRenderer.prototype._copy_renderer = function(renderer, region) {
    if (region) {

        // Copy a region.
        this._canvas.draw_image(
            renderer._canvas, 
            region.x, region.y, region.width, region.height,
            region);

    } else {

        // Copy the entire image.
        this._canvas.draw_image(
            renderer._canvas, 
            this.left, 
            this.top, 
            this._canvas.width, 
            this._canvas.height);   
    }
};

// Exports
exports.BatchRenderer = BatchRenderer;

},{"../config.js":6,"../utils.js":36,"./renderer.js":28}],25:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('../utils.js');
var renderer = require('./renderer.js');

/**
 * Renders to a canvas
 * @param {Canvas} default_canvas
 */
var ColorRenderer = function() {
    // Create with the option 'parent_independent' to disable
    // parent coordinate translations from being applied by 
    // a batch renderer.
    renderer.RendererBase.call(this, undefined, {parent_independent: true});
    this._rendered = false;
    
    // Create properties.
    var that = this;
    this.property('width', function() {
        return that._canvas.width;
    }, function(value) {
        that._canvas.width = value;
        that._render();

        // Tell parent layer this one has changed.
        this.trigger('changed');
    });
    this.property('height', function() {
        return that._canvas.height;
    }, function(value) {
        that._canvas.height = value;
        that._render();

        // Tell parent layer this one has changed.
        this.trigger('changed');
    });
    this.property('color', function() {
        return that._color;
    }, function(value) {
        that._color = value;
        that._render();

        // Tell parent layer this one has changed.
        this.trigger('changed');
    });
};
utils.inherit(ColorRenderer, renderer.RendererBase);

/**
 * Render to the canvas
 * @param {dictionary} (optional) scroll - How much the canvas was scrolled.  This
 *                     is a dictionary of the form {x: float, y: float}
 * @return {null}
 */
ColorRenderer.prototype.render = function(scroll) {
    if (!this._rendered) {
        this._render();
        this._rendered = true;
    }
};

/**
 * Render a frame.
 * @return {null}
 */
ColorRenderer.prototype._render = function() {
    this._canvas.clear();
    this._canvas.draw_rectangle(0, 0, this._canvas.width, this._canvas.height, {fill_color: this._color});
};

// Exports
exports.ColorRenderer = ColorRenderer;

},{"../utils.js":36,"./renderer.js":28}],26:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var animator = require('../animator.js');
var utils = require('../utils.js');
var renderer = require('./renderer.js');

/**
 * Render document cursors
 *
 * TODO: Only render visible.
 */
var CursorsRenderer = function(cursors, style, row_renderer, has_focus) {
    renderer.RendererBase.call(this);
    this.style = style;
    this._has_focus = has_focus;
    this._cursors = cursors;
    this._last_drawn_cursors = [];

    this._row_renderer = row_renderer;
    // TODO: Remove the following block.
    this._get_visible_rows = utils.proxy(row_renderer.get_visible_rows, row_renderer);
    this._get_row_height = utils.proxy(row_renderer.get_row_height, row_renderer);
    this._get_row_top = utils.proxy(row_renderer.get_row_top, row_renderer);
    this._measure_partial_row = utils.proxy(row_renderer.measure_partial_row_width, row_renderer);
    
    this._blink_animator = new animator.Animator(1000);
    this._fps = 2;

    // Start the cursor rendering clock.
    this._render_clock();
    this._last_rendered = null;

    // Watch for cursor change events.
    var that = this;
    var rerender = function() {
        that._blink_animator.reset();
        that.render();
        // Tell parent layer this one has changed.
        that.trigger('changed');
    };
    this._cursors.on('change', rerender);
};
utils.inherit(CursorsRenderer, renderer.RendererBase);

/**
 * Render to the canvas
 * Note: This method is called often, so it's important that it's
 * optimized for speed.
 * @return {null}
 */
CursorsRenderer.prototype.render = function(scroll) {
    var that = this;

    // Remove the previously drawn cursors, if any.
    if (scroll !== undefined) {
        this._canvas.clear();
        utils.clear_array(this._last_drawn_cursors);
    } else {
        if (this._last_drawn_cursors.length > 0) {
            this._last_drawn_cursors.forEach(function(cursor_box) {

                // Remove 1px space around the cursor box too for anti-aliasing.
                that._canvas.clear({
                    x: cursor_box.x - 1,
                    y: cursor_box.y - 1,
                    width: cursor_box.width + 2,
                    height: cursor_box.height + 2,
                });
            });
            utils.clear_array(this._last_drawn_cursors);
        }    
    }
    

    // Only render if the canvas has focus.
    if (this._has_focus() && this._blink_animator.time() < 0.5) {
        this._cursors.cursors.forEach(function(cursor) {
            // Get the visible rows.
            var visible_rows = that._get_visible_rows();

            // If a cursor doesn't have a position, render it at the
            // beginning of the document.
            var row_index = cursor.primary_row || 0;
            var char_index = cursor.primary_char || 0;

            // Draw the cursor.
            var height = that._get_row_height(row_index);
            var multiplier = that.style.cursor_height || 1.0;
            var offset = (height - (multiplier*height)) / 2;
            height *= multiplier;
            if (visible_rows.top_row <= row_index && row_index <= visible_rows.bottom_row) {
                var cursor_box = {
                    x: char_index === 0 ? that._row_renderer.margin_left : that._measure_partial_row(row_index, char_index) + that._row_renderer.margin_left,
                    y: that._get_row_top(row_index) + offset,
                    width: that.style.cursor_width===undefined ? 1.0 : that.style.cursor_width,
                    height: height,
                };
                that._last_drawn_cursors.push(cursor_box);

                that._canvas.draw_rectangle(
                    cursor_box.x, 
                    cursor_box.y, 
                    cursor_box.width, 
                    cursor_box.height, 
                    {
                        fill_color: that.style.cursor || 'back',
                    }
                );
            }   
        });
    }
    this._last_rendered = Date.now();
};

/**
 * Clock for rendering the cursor.
 * @return {null}
 */
CursorsRenderer.prototype._render_clock = function() {
    // If the canvas is focused, redraw.
    if (this._has_focus()) {
        var first_render = !this._was_focused;
        this._was_focused = true;
        this.render();
        // Tell parent layer this one has changed.
        this.trigger('changed');
        if (first_render) this.trigger('toggle');

    // The canvas isn't focused.  If this is the first time
    // it hasn't been focused, render again without the 
    // cursors.
    } else if (this._was_focused) {
        this._was_focused = false;
        this.render();
        // Tell parent layer this one has changed.
        this.trigger('changed');
        this.trigger('toggle');
    }

    // Timer.
    setTimeout(utils.proxy(this._render_clock, this), 1000 / this._fps);
};

// Exports
exports.CursorsRenderer = CursorsRenderer;

},{"../animator.js":3,"../utils.js":36,"./renderer.js":28}],27:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('../utils.js');
var row = require('./row.js');
var config = require('../config.js');
config = config.config;

/**
 * Render the text rows of a DocumentModel.
 * @param {DocumentModel} model instance
 */
var HighlightedRowRenderer = function(model, scrolling_canvas, style) {
    row.RowRenderer.call(this, model, scrolling_canvas);
    this.style = style;

    var that = this;
    model.on('tags_changed', function(rows) {
        var visible_rows = that.get_visible_rows();
        var row_visible = false;
        for (var i = 0; i < rows.length; i++) {
            if (visible_rows.top_row <= rows[i] && rows[i] <= visible_rows.bottom_row) {
                row_visible = true;
                break;
            }
        }

        // If at least one of the rows whos tags changed is visible,
        // re-render.
        if (row_visible) {
            that.render();
            that.trigger('changed');
        }
    });
};
utils.inherit(HighlightedRowRenderer, row.RowRenderer);

/**
 * Render a single row
 * @param  {integer} index
 * @param  {float} x
 * @param  {float} y
 * @return {null}
 */
HighlightedRowRenderer.prototype._render_row = function(index, x ,y) {
    if (index < 0 || this._model._rows.length <= index) return;
    
    var groups = this._get_groups(index);
    var left = x;
    for (var i=0; i<groups.length; i++) {
        var width = this._text_canvas.measure_text(groups[i].text, groups[i].options);
        
        if (config.highlight_draw) {
            this._text_canvas.draw_rectangle(left, y, width, this.get_row_height(i), {
                fill_color: utils.random_color(),
            });
        }

        this._text_canvas.draw_text(left, y, groups[i].text, groups[i].options);
        left += width;
    }
};

/**
 * Get render groups for a row.
 * @param  {integer} index of the row
 * @return {array} array of renderings, each rendering is an array of
 *                 the form {options, text}.
 */
HighlightedRowRenderer.prototype._get_groups = function(index) {
    if (index < 0 || this._model._rows.length <= index) return;

    var row_text = this._model._rows[index];
    var groups = [];
    var last_syntax = null;
    var char_index = 0;
    var start = 0;
    for (char_index; char_index<row_text.length; char_index++) {
        var syntax = this._model.get_tag_value('syntax', index, char_index);
        if (!this._compare_syntax(last_syntax,syntax)) {
            if (char_index !== 0) {
                groups.push({options: this._get_options(last_syntax), text: row_text.substring(start, char_index)});
            }
            last_syntax = syntax;
            start = char_index;
        }   
    }
    groups.push({options: this._get_options(last_syntax), text: row_text.substring(start)});

    return groups;
};

/**
 * Creates a style options dictionary from a syntax tag.
 * @param  {string} syntax
 * @return {null}
 */
HighlightedRowRenderer.prototype._get_options = function(syntax) {
    var render_options = utils.shallow_copy(this._base_options);
    
    // Highlight if a sytax item and style are provided.
    if (this.style) {

        // If this is a nested syntax item, use the most specific part
        // which is defined in the active style.
        if (syntax && syntax.indexOf(' ') != -1) {
            var parts = syntax.split(' ');
            for (var i = parts.length - 1; i >= 0; i--) {
                if (this.style[parts[i]]) {
                    syntax = parts[i];
                    break;
                }
            }
        }

        // Style if the syntax item is defined in the style.
        if (syntax && this.style[syntax]) {
            render_options.color = this.style[syntax];
        } else {
            render_options.color = this.style.text || 'black';
        }
    }
    
    return render_options;
};

/**
 * Compare two syntaxs.
 * @param  {string} a - syntax
 * @param  {string} b - syntax
 * @return {bool} true if a and b are equal
 */
HighlightedRowRenderer.prototype._compare_syntax = function(a, b) {
    return a === b;
};

// Exports
exports.HighlightedRowRenderer = HighlightedRowRenderer;

},{"../config.js":6,"../utils.js":36,"./row.js":29}],28:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var canvas = require('../canvas.js');
var utils = require('../utils.js');

/**
 * Renders to a canvas
 * @param {Canvas} default_canvas
 */
var RendererBase = function(default_canvas, options) {
    utils.PosterClass.call(this);
    this.options = options || {};
    this._canvas = default_canvas ? default_canvas : new canvas.Canvas();
    
    // Create properties.
    var that = this;
    this.property('width', function() {
        return that._canvas.width;
    }, function(value) {
        that._canvas.width = value;
    });
    this.property('height', function() {
        return that._canvas.height;
    }, function(value) {
        that._canvas.height = value;
    });
    this.property('top', function() {
        return -that._canvas._ty(0);
    });
    this.property('left', function() {
        return -that._canvas._tx(0);
    });
};
utils.inherit(RendererBase, utils.PosterClass);

/**
 * Render to the canvas
 * @param {dictionary} (optional) scroll - How much the canvas was scrolled.  This
 *                     is a dictionary of the form {x: float, y: float}
 * @return {null}
 */
RendererBase.prototype.render = function(scroll) {
    throw new Error('Not implemented');
};

// Exports
exports.RendererBase = RendererBase;

},{"../canvas.js":4,"../utils.js":36}],29:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var canvas = require('../canvas.js');
var utils = require('../utils.js');
var renderer = require('./renderer.js');

/**
 * Render the text rows of a DocumentModel.
 * @param {DocumentModel} model instance
 */
var RowRenderer = function(model, scrolling_canvas) {
    this._model = model;
    this._visible_row_count = 0;

    // Setup canvases
    this._text_canvas = new canvas.Canvas();
    this._tmp_canvas = new canvas.Canvas();
    this._scrolling_canvas = scrolling_canvas;
    this._row_width_counts = {}; // Dictionary of widths -> row count 

    // Base
    renderer.RendererBase.call(this);

    // Set some basic rendering properties.
    this._base_options = {
        font_family: 'monospace',
        font_size: 14,
    };
    this._line_spacing = 2;

    // Create properties.
    var that = this;
    this.property('width', function() {
        return that._canvas.width;
    }, function(value) {
        that._canvas.width = value;
        that._text_canvas.width = value;
        that._tmp_canvas.width = value;
    });
    this.property('height', function() {
        return that._canvas.height;
    }, function(value) {
        that._canvas.height = value;

        // The text canvas should be the right height to fit all of the lines
        // that will be rendered in the base canvas.  This includes the lines
        // that are partially rendered at the top and bottom of the base canvas.
        var row_height = that.get_row_height();
        that._visible_row_count = Math.ceil(value/row_height) + 1;
        that._text_canvas.height = that._visible_row_count * row_height;
        that._tmp_canvas.height = that._text_canvas.height;
    });
    this._margin_left = 0;
    this.property('margin_left', function() {
        return that._margin_left;
    }, function(value) {
        
        // Update internal value.
        var delta = value - that._margin_left;
        that._margin_left = value;

        // Intelligently change the document's width, without causing
        // a complete O(N) width recalculation.
        var new_counts = {};
        for (var width in this._row_width_counts) {
            if (this._row_width_counts.hasOwnProperty(width)) {
                new_counts[width+delta] = this._row_width_counts[width];
            }
        }
        this._row_width_counts = new_counts
        this._scrolling_canvas.scroll_width += delta;

        // Re-render with new margin.
        that.render();
        // Tell parent layer this one has changed.
        that.trigger('changed');
    });
    this._margin_top = 0;
    this.property('margin_top', function() {
        return that._margin_top;
    }, function(value) {
        // Update the scrollbars.
        that._scrolling_canvas.scroll_height += value - that._margin_top;

        // Update internal value.
        that._margin_top = value;

        // Re-render with new margin.
        that.render();
        // Tell parent layer this one has changed.
        that.trigger('changed');
    });

    // Set initial canvas sizes.  These lines may look redundant, but beware
    // because they actually cause an appropriate width and height to be set for
    // the text canvas because of the properties declared above.
    this.width = this._canvas.width;
    this.height = this._canvas.height;

    this._model.on('text_changed', utils.proxy(this._handle_value_changed, this));
    this._model.on('rows_added', utils.proxy(this._handle_rows_added, this));
    this._model.on('rows_removed', utils.proxy(this._handle_rows_removed, this));
    this._model.on('row_changed', utils.proxy(this._handle_row_changed, this)); // TODO: Implement my event.
};
utils.inherit(RowRenderer, renderer.RendererBase);

/**
 * Render to the canvas
 * Note: This method is called often, so it's important that it's
 * optimized for speed.
 * @param {dictionary} (optional) scroll - How much the canvas was scrolled.  This
 *                     is a dictionary of the form {x: float, y: float}
 * @return {null}
 */
RowRenderer.prototype.render = function(scroll) {

    // If only the y axis was scrolled, blit the good contents and just render
    // what's missing.
    var partial_redraw = (scroll && scroll.x === 0 && Math.abs(scroll.y) < this._canvas.height);

    // Update the text rendering
    var visible_rows = this.get_visible_rows();
    this._render_text_canvas(-this._scrolling_canvas.scroll_left+this._margin_left, visible_rows.top_row, !partial_redraw);

    // Copy the text image to this canvas
    this._canvas.clear();
    this._canvas.draw_image(
        this._text_canvas, 
        this._scrolling_canvas.scroll_left, 
        this.get_row_top(visible_rows.top_row));
};

/**
 * Render text to the text canvas.
 *
 * Later, the main rendering function can use this rendered text to draw the
 * base canvas.
 * @param  {float} x_offset - horizontal offset of the text
 * @param  {integer} top_row
 * @param  {boolean} force_redraw - redraw the contents even if they are
 *                                the same as the cached contents.
 * @return {null}          
 */
RowRenderer.prototype._render_text_canvas = function(x_offset, top_row, force_redraw) {

    // Try to reuse some of the already rendered text if possible.
    var rendered = false;
    var row_height = this.get_row_height();
    if (!force_redraw && this._last_rendered_offset === x_offset) {
        var last_top = this._last_rendered_row;
        var scroll = top_row - last_top; // Positive = user scrolling downward.
        if (scroll < this._last_rendered_row_count) {

            // Get a snapshot of the text before the scroll.
            this._tmp_canvas.clear();
            this._tmp_canvas.draw_image(this._text_canvas, 0, 0);

            // Render the new text.
            var saved_rows = this._last_rendered_row_count - Math.abs(scroll);
            var new_rows = this._visible_row_count - saved_rows;
            if (scroll > 0) {
                // Render the bottom.
                this._text_canvas.clear();
                for (i = top_row+saved_rows; i < top_row+this._visible_row_count; i++) {     
                    this._render_row(i, x_offset, (i - top_row) * row_height);
                }
            } else if (scroll < 0) {
                // Render the top.
                this._text_canvas.clear();
                for (i = top_row; i < top_row+new_rows; i++) {   
                    this._render_row(i, x_offset, (i - top_row) * row_height);
                }
            } else {
                // Nothing has changed.
                return;
            }
            
            // Use the old content to fill in the rest.
            this._text_canvas.draw_image(this._tmp_canvas, 0, -scroll * this.get_row_height());
            this.trigger('rows_changed', top_row, top_row + this._visible_row_count - 1);
            rendered = true;
        }
    }

    // Full rendering.
    if (!rendered) {
        this._text_canvas.clear();

        // Render till there are no rows left, or the top of the row is
        // below the bottom of the visible area.
        for (i = top_row; i < top_row + this._visible_row_count; i++) {        
            this._render_row(i, x_offset, (i - top_row) * row_height);
        }   
        this.trigger('rows_changed', top_row, top_row + this._visible_row_count - 1);
    }

    // Remember for delta rendering.
    this._last_rendered_row = top_row;
    this._last_rendered_row_count = this._visible_row_count;
    this._last_rendered_offset = x_offset;
};

/**
 * Gets the row and character indicies closest to given control space coordinates.
 * @param  {float} cursor_x - x value, 0 is the left of the canvas.
 * @param  {float} cursor_y - y value, 0 is the top of the canvas.
 * @return {dictionary} dictionary of the form {row_index, char_index}
 */
RowRenderer.prototype.get_row_char = function(cursor_x, cursor_y) {
    var row_index = Math.floor((cursor_y - this._margin_top) / this.get_row_height());

    // Find the character index.
    var widths = [0];
    try {
        for (var length=1; length<=this._model._rows[row_index].length; length++) {
            widths.push(this.measure_partial_row_width(row_index, length));
        }
    } catch (e) {
        // Nom nom nom...
    }
    var coords = this._model.validate_coords(row_index, utils.find_closest(widths, cursor_x - this._margin_left));
    return {
        row_index: coords.start_row,
        char_index: coords.start_char,
    };
};

/**
 * Measures the partial width of a text row.
 * @param  {integer} index
 * @param  {integer} (optional) length - number of characters
 * @return {float} width
 */
RowRenderer.prototype.measure_partial_row_width = function(index, length) {
    if (0 > index || index >= this._model._rows.length) {
        return 0; 
    }

    var text = this._model._rows[index];
    text = (length === undefined) ? text : text.substring(0, length);

    return this._canvas.measure_text(text, this._base_options);
};

/**
 * Measures a strings width.
 * @param  {string} text - text to measure the width of
 * @param  {integer} [index] - row index, can be used to apply size sensitive 
 *                             formatting to the text.
 * @return {float} width
 */
RowRenderer.prototype._measure_text_width = function(text) {
    return this._canvas.measure_text(text, this._base_options);
};

/**
 * Measures the height of a text row as if it were rendered.
 * @param  {integer} (optional) index
 * @return {float} height
 */
RowRenderer.prototype.get_row_height = function(index) {
    return this._base_options.font_size + this._line_spacing;
};

/**
 * Gets the top of the row when rendered
 * @param  {integer} index
 * @return {null}
 */
RowRenderer.prototype.get_row_top = function(index) {
    return index * this.get_row_height() + this._margin_top;
};

/**
 * Gets the visible rows.
 * @return {dictionary} dictionary containing information about 
 *                      the visible rows.  Format {top_row, 
 *                      bottom_row, row_count}.
 */
RowRenderer.prototype.get_visible_rows = function() {

    // Find the row closest to the scroll top.  If that row is below
    // the scroll top, use the partially displayed row above it.
    var top_row = Math.max(0, Math.floor((this._scrolling_canvas.scroll_top - this._margin_top)  / this.get_row_height()));

    // Find the row closest to the scroll bottom.  If that row is above
    // the scroll bottom, use the partially displayed row below it.
    var row_count = Math.ceil(this._canvas.height / this.get_row_height());
    var bottom_row = top_row + row_count;

    // Row count + 1 to include first row.
    return {top_row: top_row, bottom_row: bottom_row, row_count: row_count+1};
};

/**
 * Handles when the model's value changes
 * Complexity: O(N) for N rows of text.
 * @return {null}
 */
RowRenderer.prototype._handle_value_changed = function() {

    // Calculate the document width.
    this._row_width_counts = {};
    var document_width = 0;
    for (var i=0; i<this._model._rows.length; i++) {
        var width = this._measure_row_width(i) + this._margin_left;
        document_width = Math.max(width, document_width);
        if (this._row_width_counts[width] === undefined) {
            this._row_width_counts[width] = 1;
        } else {
            this._row_width_counts[width]++;
        }
    }
    this._scrolling_canvas.scroll_width = document_width;
    this._scrolling_canvas.scroll_height = this._model._rows.length * this.get_row_height() + this._margin_top;
};

/**
 * Handles when one of the model's rows change
 * @return {null}
 */
RowRenderer.prototype._handle_row_changed = function(text, index) {
    var new_width = this._measure_row_width(index) + this._margin_left;
    var old_width = this._measure_text_width(text, index) + this._margin_left;
    if (this._row_width_counts[old_width] == 1) {
        delete this._row_width_counts[old_width];
    } else {
        this._row_width_counts[old_width]--;        
    }

    if (this._row_width_counts[new_width] !== undefined) {
        this._row_width_counts[new_width]++;
    } else {
        this._row_width_counts[new_width] = 1;
    }

    this._scrolling_canvas.scroll_width = this._find_largest_width();
};

/**
 * Handles when one or more rows are added to the model
 *
 * Assumes constant row height.
 * @param  {integer} start
 * @param  {integer} end
 * @return {null}
 */
RowRenderer.prototype._handle_rows_added = function(start, end) {
    this._scrolling_canvas.scroll_height += (end - start + 1) * this.get_row_height();
    
    for (var i = start; i <= end; i++) { 
        var new_width = this._measure_row_width(i) + this._margin_left;
        if (this._row_width_counts[new_width] !== undefined) {
            this._row_width_counts[new_width]++;
        } else {
            this._row_width_counts[new_width] = 1;
        }
    }

    this._scrolling_canvas.scroll_width = this._find_largest_width();
};

/**
 * Handles when one or more rows are removed from the model
 *
 * Assumes constant row height.
 * @param  {array} rows
 * @param  {integer} [index]
 * @return {null}
 */
RowRenderer.prototype._handle_rows_removed = function(rows, index) {
    // Decrease the scrolling height based on the number of rows removed.
    this._scrolling_canvas.scroll_height -= rows.length * this.get_row_height();

    for (var i = 0; i < rows.length; i++) {
        var old_width = this._measure_text_width(rows[i], i + index) + this._margin_left;
        if (this._row_width_counts[old_width] == 1) {
            delete this._row_width_counts[old_width];
        } else {
            this._row_width_counts[old_width]--;        
        }
    }

    this._scrolling_canvas.scroll_width = this._find_largest_width();
};

/**
 * Render a single row
 * @param  {integer} index
 * @param  {float} x
 * @param  {float} y
 * @return {null}
 */
RowRenderer.prototype._render_row = function(index, x ,y) {
    this._text_canvas.draw_text(x, y, this._model._rows[index], this._base_options);
};

/**
 * Measures the width of a text row as if it were rendered.
 * @param  {integer} index
 * @return {float} width
 */
RowRenderer.prototype._measure_row_width = function(index) {
    return this.measure_partial_row_width(index, this._model._rows[index].length);
};

/**
 * Find the largest width in the width row count dictionary.
 * @return {float} width
 */
RowRenderer.prototype._find_largest_width = function() {
    var values = Object.keys(this._row_width_counts);
    values.sort(function(a, b){ 
        return parseFloat(b) - parseFloat(a); 
    });
    return parseFloat(values[0]);
};

// Exports
exports.RowRenderer = RowRenderer;

},{"../canvas.js":4,"../utils.js":36,"./renderer.js":28}],30:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var animator = require('../animator.js');
var utils = require('../utils.js');
var renderer = require('./renderer.js');
var config = require('../config.js');
config = config.config;

/**
 * Render document selection boxes
 *
 * TODO: Only render visible.
 */
var SelectionsRenderer = function(cursors, style, row_renderer, has_focus, cursors_renderer) {
    renderer.RendererBase.call(this);
    this._dirty = null;
    this.style = style;
    this._has_focus = has_focus;

    // When the cursors change, redraw the selection box(es).
    this._cursors = cursors;
    var that = this;
    var rerender = function() {
        that.render();
        // Tell parent layer this one has changed.
        that.trigger('changed');
    };
    this._cursors.on('change', rerender);

    // When the style is changed, redraw the selection box(es).
    this.style.on('change', rerender);
    config.on('change', rerender);

    this._row_renderer = row_renderer;
    // TODO: Remove the following block.
    this._get_visible_rows = utils.proxy(row_renderer.get_visible_rows, row_renderer);
    this._get_row_height = utils.proxy(row_renderer.get_row_height, row_renderer);
    this._get_row_top = utils.proxy(row_renderer.get_row_top, row_renderer);
    this._measure_partial_row = utils.proxy(row_renderer.measure_partial_row_width, row_renderer);

    // When the cursor is hidden/shown, redraw the selection.
    cursors_renderer.on('toggle', function() {
        that.render();
        // Tell parent layer this one has changed.
        that.trigger('changed');
    });
};
utils.inherit(SelectionsRenderer, renderer.RendererBase);

/**
 * Render to the canvas
 * Note: This method is called often, so it's important that it's
 * optimized for speed.
 * @return {null}
 */
SelectionsRenderer.prototype.render = function(scroll) {
    // If old contents exist, remove them.
    var that = this;
    if (this._dirty === null || scroll !== undefined) {
        that._canvas.clear();
        this._dirty = null;
    } else {
        that._canvas.clear({
            x: this._dirty.x1-1,
            y: this._dirty.y1-1,
            width: this._dirty.x2 - this._dirty.x1+2,
            height: this._dirty.y2 - this._dirty.y1+2,
        });
        this._dirty = null;
    }

    // Get newline width.
    var newline_width = config.newline_width;
    if (newline_width === undefined || newline_width === null) {
        newline_width = 2;
    }

    // Only render if the canvas has focus.
    this._cursors.cursors.forEach(function(cursor) {
        // Get the visible rows.
        var visible_rows = that._get_visible_rows();

        // Draw the selection box.
        if (cursor.start_row !== null && cursor.start_char !== null &&
            cursor.end_row !== null && cursor.end_char !== null) {
            

            for (var i = Math.max(cursor.start_row, visible_rows.top_row); 
                i <= Math.min(cursor.end_row, visible_rows.bottom_row); 
                i++) {

                var left = that._row_renderer.margin_left;
                if (i == cursor.start_row && cursor.start_char > 0) {
                    left += that._measure_partial_row(i, cursor.start_char);
                }

                var selection_color;
                if (that._has_focus()) {
                    selection_color = that.style.selection || 'skyblue';
                } else {
                    selection_color = that.style.selection_unfocused || 'gray';
                }

                var width;
                if (i !== cursor.end_row) {
                    width = that._measure_partial_row(i) - left + that._row_renderer.margin_left + newline_width;
                } else {
                    width = that._measure_partial_row(i, cursor.end_char);

                    // If this isn't the first selected row, make sure atleast the newline
                    // is visibily selected at the beginning of the row by making sure that
                    // the selection box is atleast the size of a newline character (as
                    // defined by the user config).
                    if (i !== cursor.start_row) {
                        width = Math.max(newline_width, width);
                    }

                    width = width - left + that._row_renderer.margin_left;
                }
                
                var block = {
                    left: left, 
                    top: that._get_row_top(i), 
                    width: width, 
                    height: that._get_row_height(i)
                };

                that._canvas.draw_rectangle(
                    block.left, block.top, block.width, block.height,
                    {
                        fill_color: selection_color,
                    }
                );

                if (that._dirty===null) {
                    that._dirty = {};
                    that._dirty.x1 = block.left;
                    that._dirty.y1 = block.top;
                    that._dirty.x2 = block.left + block.width;
                    that._dirty.y2 = block.top + block.height;
                } else {
                    that._dirty.x1 = Math.min(block.left, that._dirty.x1);
                    that._dirty.y1 = Math.min(block.top, that._dirty.y1);
                    that._dirty.x2 = Math.max(block.left + block.width, that._dirty.x2);
                    that._dirty.y2 = Math.max(block.top + block.height, that._dirty.y2);
                }
            }
        }
    });
};

// Exports
exports.SelectionsRenderer = SelectionsRenderer;

},{"../animator.js":3,"../config.js":6,"../utils.js":36,"./renderer.js":28}],31:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var canvas = require('./canvas.js');
var utils = require('./utils.js');

/**
 * HTML canvas with drawing convinience functions.
 */
var ScrollingCanvas = function() {
    canvas.Canvas.call(this);
    this._bind_events();
    this._old_scroll_left = 0;
    this._old_scroll_top = 0;

    // Set default size.
    this.width = 400;
    this.height = 300;
};
utils.inherit(ScrollingCanvas, canvas.Canvas);

/**
 * Causes the canvas contents to be redrawn.
 * @return {null}
 */
ScrollingCanvas.prototype.redraw = function(scroll) {
    this.clear();
    this.trigger('redraw', scroll);
};

/**
 * Layout the elements for the canvas.
 * Creates `this.el`
 * 
 * @return {null}
 */
ScrollingCanvas.prototype._layout = function() {
    canvas.Canvas.prototype._layout.call(this);
    // Change the canvas class so it's not hidden.
    this._canvas.setAttribute('class', 'canvas');

    this.el = document.createElement('div');
    this.el.setAttribute('class', 'poster scroll-window');
    this.el.setAttribute('tabindex', 0);
    this._scroll_bars = document.createElement('div');
    this._scroll_bars.setAttribute('class', 'scroll-bars');
    this._touch_pane = document.createElement('div');
    this._touch_pane.setAttribute('class', 'touch-pane');
    this._dummy = document.createElement('div');
    this._dummy.setAttribute('class', 'scroll-dummy');

    this.el.appendChild(this._canvas);
    this.el.appendChild(this._scroll_bars);
    this._scroll_bars.appendChild(this._dummy);
    this._scroll_bars.appendChild(this._touch_pane);
};

/**
 * Make the properties of the class.
 * @return {null}
 */
ScrollingCanvas.prototype._init_properties = function() {
    var that = this;

    /**
     * Width of the scrollable canvas area
     */
    this.property('scroll_width', function() {
        // Get
        return that._scroll_width || 0;
    }, function(value) {
        // Set
        that._scroll_width = value;
        that._move_dummy(that._scroll_width, that._scroll_height || 0);
    });

    /**
     * Height of the scrollable canvas area.
     */
    this.property('scroll_height', function() {
        // Get
        return that._scroll_height || 0;
    }, function(value) {
        // Set
        that._scroll_height = value;
        that._move_dummy(that._scroll_width || 0, that._scroll_height);
    });

    /**
     * Top most pixel in the scrolled window.
     */
    this.property('scroll_top', function() {
        // Get
        return that._scroll_bars.scrollTop;
    }, function(value) {
        // Set
        that._scroll_bars.scrollTop = value;
        that._handle_scroll();
    });

    /**
     * Left most pixel in the scrolled window.
     */
    this.property('scroll_left', function() {
        // Get
        return that._scroll_bars.scrollLeft;
    }, function(value) {
        // Set
        that._scroll_bars.scrollLeft = value;
        that._handle_scroll();
    });

    /**
     * Height of the canvas
     * @return {float}
     */
    this.property('height', function() { 
        return that._canvas.height / 2; 
    }, function(value) {
        that._canvas.setAttribute('height', value * 2);
        that.el.setAttribute('style', 'width: ' + that.width + 'px; height: ' + value + 'px;');

        that.trigger('resize', {height: value});
        that._try_redraw();
        
        // Stretch the image for retina support.
        this.scale(2,2);
    });

    /**
     * Width of the canvas
     * @return {float}
     */
    this.property('width', function() { 
        return that._canvas.width / 2; 
    }, function(value) {
        that._canvas.setAttribute('width', value * 2);
        that.el.setAttribute('style', 'width: ' + value + 'px; height: ' + that.height + 'px;');

        that.trigger('resize', {width: value});
        that._try_redraw();
        
        // Stretch the image for retina support.
        this.scale(2,2);
    });

    /**
     * Is the canvas or related elements focused?
     * @return {boolean}
     */
    this.property('focused', function() {
        return document.activeElement === that.el ||
            document.activeElement === that._scroll_bars ||
            document.activeElement === that._dummy ||
            document.activeElement === that._canvas;
    });
};

/**
 * Bind to the events of the canvas.
 * @return {null}
 */
ScrollingCanvas.prototype._bind_events = function() {
    var that = this;

    // Trigger scroll and redraw events on scroll.
    this._scroll_bars.onscroll = function(e) {
        that.trigger('scroll', e);
        that._handle_scroll();
    };

    // Prevent scroll bar handled mouse events from bubbling.
    var scrollbar_event = function(e) {
        if (e.target !== that._touch_pane) {
            utils.cancel_bubble(e);
        }
    };
    this._scroll_bars.onmousedown = scrollbar_event;
    this._scroll_bars.onmouseup = scrollbar_event;
    this._scroll_bars.onclick = scrollbar_event;
    this._scroll_bars.ondblclick = scrollbar_event;
};

/**
 * Handles when the canvas is scrolled.
 */
ScrollingCanvas.prototype._handle_scroll = function() {
    if (this._old_scroll_top !== undefined && this._old_scroll_left !== undefined) {
        var scroll = {
            x: this.scroll_left - this._old_scroll_left,
            y: this.scroll_top - this._old_scroll_top,
        };
        this._try_redraw(scroll);
    } else {
        this._try_redraw();
    }
    this._old_scroll_left = this.scroll_left;
    this._old_scroll_top = this.scroll_top;
};

/**
 * Queries to see if redraw is okay, and then redraws if it is.
 * @return {boolean} true if redraw happened.
 */
ScrollingCanvas.prototype._try_redraw = function(scroll) {
    if (this._query_redraw()) {
        this.redraw(scroll);
        return true;
    }
    return false;
};

/**
 * Trigger the 'query_redraw' event.
 * @return {boolean} true if control should redraw itself.
 */
ScrollingCanvas.prototype._query_redraw = function() {
    return this.trigger('query_redraw').every(function(x) { return x; }); 
};

/**
 * Moves the dummy element that causes the scrollbar to appear.
 * @param  {float} x
 * @param  {float} y
 * @return {null}
 */
ScrollingCanvas.prototype._move_dummy = function(x, y) {
    this._dummy.setAttribute('style', 'left: ' + String(x) + 'px; top: ' + String(y) + 'px;');
    this._touch_pane.setAttribute('style', 
        'width: ' + String(Math.max(x, this._scroll_bars.clientWidth)) + 'px; ' +
        'height: ' + String(Math.max(y, this._scroll_bars.clientHeight)) + 'px;');
};

/**
 * Transform an x value based on scroll position.
 * @param  {float} x
 * @param  {boolean} inverse - perform inverse transformation
 * @return {float}
 */
ScrollingCanvas.prototype._tx = function(x, inverse) { return x - (inverse?-1:1) * this.scroll_left; };

/**
 * Transform a y value based on scroll position.
 * @param  {float} y
 * @param  {boolean} inverse - perform inverse transformation
 * @return {float}
 */
ScrollingCanvas.prototype._ty = function(y, inverse) { return y - (inverse?-1:1) * this.scroll_top; };

// Exports
exports.ScrollingCanvas = ScrollingCanvas;

},{"./canvas.js":4,"./utils.js":36}],32:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('./utils.js');
var styles = require('./styles/init.js');

/**
 * Style
 */
var Style = function() {
    utils.PosterClass.call(this, [
        'comment',
        'string',
        'class-name',
        'keyword',
        'boolean',
        'function',
        'operator',
        'number',
        'ignore',
        'punctuation',

        'cursor',
        'cursor_width',
        'cursor_height',
        'selection',
        'selection_unfocused',

        'text',
        'background',
        'gutter',
        'gutter_text',
        'gutter_shadow'
    ]);

    // Load the default style.
    this.load('peacock');
};
utils.inherit(Style, utils.PosterClass);

/**
 * Load a rendering style
 * @param  {string or dictionary} style - name of the built-in style 
 *         or style dictionary itself.
 * @return {boolean} success
 */
Style.prototype.load = function(style) {
    try {
        // Load the style if it's built-in.
        if (styles.styles[style]) {
            style = styles.styles[style].style;
        }

        // Read each attribute of the style.
        for (var key in style) {
            if (style.hasOwnProperty(key)) {
                this[key] = style[key];
            }
        }
        
        return true;
    } catch (e) {
        console.error('Error loading style', e);
        return false;
    }
};

exports.Style = Style;
},{"./styles/init.js":33,"./utils.js":36}],33:[function(require,module,exports){
exports.styles = {
    "peacock": require("./peacock.js"),
};

},{"./peacock.js":34}],34:[function(require,module,exports){
exports.style = {
    comment: '#7a7267',
    string: '#bcd42a',
    'class-name': '#ede0ce',
    keyword: '#26A6A6',
    boolean: '#bcd42a',
    function: '#ff5d38',
    operator: '#26A6A6',
    number: '#bcd42a',
    ignore: '#cccccc',
    punctuation: '#ede0ce',

    cursor: '#f8f8f0',
    cursor_width: 1.0,
    cursor_height: 1.1,
    selection: '#df3d18',
    selection_unfocused: '#4f1d08',

    text: '#ede0ce',
    background: '#2b2a27',
    gutter: '#2b2a27',
    gutter_text: '#7a7267',
    gutter_shadow: [
        [0, 'black'], 
        [1, 'transparent']
    ],
};


},{}],35:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('./utils.js');

/**
 * Superset
 */
var Superset = function() {
    utils.PosterClass.call(this);
    this._array = [];
    
    var that = this;
    this.property('array', function() {
        that._clean();
        return that._array;
    });
};
utils.inherit(Superset, utils.PosterClass);

/**
 * Clears the set
 */
Superset.prototype.clear = function() {
    utils.clear_array(this._array);
};

/**
 * Set the state of a region.
 * @param {integer} start - index, inclusive
 * @param {integer} stop - index, inclusive
 * @param {object} state
 */
Superset.prototype.set = function(start, stop, state) {
    this._set(start, stop, state, 0);
};

/**
 * Set the state of a region.
 * @param {integer} start - index, inclusive
 * @param {integer} stop - index, inclusive
 * @param {object} state
 * @param {integer} integer - current recursion index
 */
Superset.prototype._set = function(start, stop, state, index) {
    // Make sure start and stop are in correct order.
    if (start > stop) {
        return;
    }
    var ns = start;
    var ne = stop;

    // Handle intersections.
    for (; index < this._array.length; index++) {
        var s = this._array[index][0];
        var e = this._array[index][1];
        var old_state = this._array[index][2];
        if (ns <= e && ne >= s) {
            this._array.splice(index, 1);
            // keep
            this._insert(index, s, ns - 1, old_state);
            // replace
            this._insert(index, Math.max(s, ns), Math.min(e, ne), state);
            // keep
            this._insert(index, ne + 1, e, old_state);
            // new
            this._set(ns, s - 1, state, index);
            this._set(e + 1, ne, state, index);
            return;
        }
    }

    // Doesn't intersect with anything.
    this._array.push([ns, ne, state]);
};

/**
 * Inserts an entry.
 * @param  {integer} index
 * @param  {integer} start
 * @param  {integer} end  
 * @param  {object} state
 */
Superset.prototype._insert = function(index, start, end, state) {
    if (start > end) return;
    this._array.splice(index, 0, [start, end, state]);
};

/**
 * Joins consequtive states.
 */
Superset.prototype._clean = function() {

    // Sort.
    this._array.sort(function (a, b) {
        return a[0] - b[0];
    });

    // Join consequtive.
    for (var i = 0; i < this._array.length - 1; i++) {
        if (this._array[i][1] === this._array[i+1][0]-1 && this._array[i][2] === this._array[i+1][2]) {
            this._array[i][1] = this._array[i+1][1];
            this._array.splice(i+1, 1);
            i--;
        }
    }
};

exports.Superset = Superset;

},{"./utils.js":36}],36:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

/**
 * Base class with helpful utilities
 * @param {array} [eventful_properties] list of property names (strings)
 *                to create and wire change events to.
 */
var PosterClass = function(eventful_properties) {
    this._events = {};
    this._on_all = [];

    // Construct eventful properties.
    if (eventful_properties && eventful_properties.length>0) {
        var that = this;
        for (var i=0; i<eventful_properties.length; i++) {
            (function(name) {
                that.property(name, function() {
                    return that['_' + name];
                }, function(value) {
                    that.trigger('change:' + name, value);
                    that.trigger('change', name, value);
                    that['_' + name] = value;
                    that.trigger('changed:' + name);
                    that.trigger('changed', name);
                });
            })(eventful_properties[i]);
        }
    }
};

/**
 * Define a property for the class
 * @param  {string} name
 * @param  {function} getter
 * @param  {function} setter
 * @return {null}
 */
PosterClass.prototype.property = function(name, getter, setter) {
    Object.defineProperty(this, name, {
        get: getter,
        set: setter,
        configurable: true
    });
};

/**
 * Register an event listener
 * @param  {string} event
 * @param  {function} handler
 * @param  {object} context
 * @return {null}
 */
PosterClass.prototype.on = function(event, handler, context) {
    event = event.trim().toLowerCase();

    // Make sure a list for the event exists.
    if (!this._events[event]) { this._events[event] = []; }

    // Push the handler and the context to the event's callback list.
    this._events[event].push([handler, context]);
};

/**
 * Unregister one or all event listeners for a specific event
 * @param  {string} event
 * @param  {callback} (optional) handler
 * @return {null}
 */
PosterClass.prototype.off = function(event, handler) {
    event = event.trim().toLowerCase();
    
    // If a handler is specified, remove all the callbacks
    // with that handler.  Otherwise, just remove all of
    // the registered callbacks.
    if (handler) {
        this._events[event] = this._events[event].filter(function(callback) {
            return callback[0] !== handler;
        });
    } else {
        this._events[event] = [];
    }
};

/**
 * Register a global event handler. 
 * 
 * A global event handler fires for any event that's
 * triggered.
 * @param  {string} handler - function that accepts one
 *                            argument, the name of the
 *                            event,
 * @return {null}
 */
PosterClass.prototype.on_all = function(handler) {
    var index = this._on_all.indexOf(handler);
    if (index === -1) {
        this._on_all.push(handler);
    }
};

/**
 * Unregister a global event handler.
 * @param  {[type]} handler
 * @return {boolean} true if a handler was removed
 */
PosterClass.prototype.off_all = function(handler) {
    var index = this._on_all.indexOf(handler);
    if (index != -1) {
        this._on_all.splice(index, 1);
        return true;
    }
    return false;
};

/**
 * Triggers the callbacks of an event to fire.
 * @param  {string} event
 * @return {array} array of return values
 */
PosterClass.prototype.trigger = function(event) {
    event = event.trim().toLowerCase();

    // Convert arguments to an array and call callbacks.
    var args = Array.prototype.slice.call(arguments);
    args.splice(0,1);

    // Trigger global handlers first.
    this._on_all.forEach(function(handler) {
        handler.apply(this, [event].concat(args));
    });

    // Trigger individual handlers second.
    var events = this._events[event];
    if (events) {
        var returns = [];
        events.forEach(function(callback) {
            returns.push(callback[0].apply(callback[1], args));
        });
        return returns;
    }
    return [];
};

/**
 * Cause one class to inherit from another
 * @param  {type} child
 * @param  {type} parent
 * @return {null}
 */
var inherit = function(child, parent) {
    child.prototype = Object.create(parent.prototype, {});
};

/**
 * Checks if a value is callable
 * @param  {any} value
 * @return {boolean}
 */
var callable = function(value) {
    return typeof value == 'function';
};

/**
 * Calls the value if it's callable and returns it's return.
 * Otherwise returns the value as-is.
 * @param  {any} value
 * @return {any}
 */
var resolve_callable = function(value) {
    if (callable(value)) {
        return value.call(this);
    } else {
        return value;
    }
};

/**
 * Creates a proxy to a function so it is called in the correct context.
 * @return {function} proxied function.
 */
var proxy = function(f, context) {
    if (f===undefined) { throw new Error('f cannot be undefined'); }
    return function() { return f.apply(context, arguments); };
};

/**
 * Clears an array in place.
 *
 * Despite an O(N) complexity, this seems to be the fastest way to clear
 * a list in place in Javascript. 
 * Benchmark: http://jsperf.com/empty-javascript-array
 * Complexity: O(N)
 * @param  {array} array
 * @return {null}
 */
var clear_array = function(array) {
    while (array.length > 0) {
        array.pop();
    }
};

/**
 * Checks if a value is an array
 * @param  {any} x
 * @return {boolean} true if value is an array
 */
var is_array = function(x) {
    return x instanceof Array;
};

/**
 * Find the closest value in a list
 * 
 * Interpolation search algorithm.  
 * Complexity: O(lg(lg(N)))
 * @param  {array} sorted - sorted array of numbers
 * @param  {float} x - number to try to find
 * @return {integer} index of the value that's closest to x
 */
var find_closest = function(sorted, x) {
    var min = sorted[0];
    var max = sorted[sorted.length-1];
    if (x < min) return 0;
    if (x > max) return sorted.length-1;
    if (sorted.length == 2) {
        if (max - x > x - min) {
            return 0;
        } else {
            return 1;
        }
    }
    var rate = (max - min) / sorted.length;
    if (rate === 0) return 0;
    var guess = Math.floor(x / rate);
    if (sorted[guess] == x) {
        return guess;
    } else if (guess > 0 && sorted[guess-1] < x && x < sorted[guess]) {
        return find_closest(sorted.slice(guess-1, guess+1), x) + guess-1;
    } else if (guess < sorted.length-1 && sorted[guess] < x && x < sorted[guess+1]) {
        return find_closest(sorted.slice(guess, guess+2), x) + guess;
    } else if (sorted[guess] > x) {
        return find_closest(sorted.slice(0, guess), x);
    } else if (sorted[guess] < x) {
        return find_closest(sorted.slice(guess+1), x) + guess+1;
    }
};

/**
 * Make a shallow copy of a dictionary.
 * @param  {dictionary} x
 * @return {dictionary}
 */
var shallow_copy = function(x) {
    var y = {};
    for (var key in x) {
        if (x.hasOwnProperty(key)) {
            y[key] = x[key];
        }
    }
    return y;
};

/**
 * Hooks a function.
 * @param  {object} obj - object to hook
 * @param  {string} method - name of the function to hook
 * @param  {function} hook - function to call before the original
 * @return {object} hook reference, object with an `unhook` method
 */
var hook = function(obj, method, hook) {

    // If the original has already been hooked, add this hook to the list 
    // of hooks.
    if (obj[method] && obj[method].original && obj[method].hooks) {
        obj[method].hooks.push(hook);
    } else {
        // Create the hooked function
        var hooks = [hook];
        var original = obj[method];
        var hooked = function() {
            var args = arguments;
            var ret;
            var results;
            var that = this;
            hooks.forEach(function(hook) {
                results = hook.apply(that, args);
                ret = ret !== undefined ? ret : results;
            });
            if (original) {
                results = original.apply(this, args);
            }
            return ret !== undefined ? ret : results;
        };
        hooked.original = original;
        hooked.hooks = hooks;
        obj[method] = hooked;
    }

    // Return unhook method.
    return {
        unhook: function() {
            var index = obj[method].hooks.indexOf(hook);
            if (index != -1) {
                obj[method].hooks.splice(index, 1);
            }

            if (obj[method].hooks.length === 0) {
                obj[method] = obj[method].original;
            }
        },
    };
    
};

/**
 * Cancels event bubbling.
 * @param  {event} e
 * @return {null}
 */
var cancel_bubble = function(e) {
    if (e.stopPropagation) e.stopPropagation();
    if (e.cancelBubble !== null) e.cancelBubble = true;
    if (e.preventDefault) e.preventDefault();
};

/**
 * Generates a random color string
 * @return {string} hexadecimal color string
 */
var random_color = function() {
    var random_byte = function() { 
        var b = Math.round(Math.random() * 255).toString(16);
        return b.length == 1 ? '0' + b : b;
    };
    return '#' + random_byte() + random_byte() + random_byte();
};

/**
 * Compare two arrays by contents for equality.
 * @param  {array} x
 * @param  {array} y
 * @return {boolean}
 */
var compare_arrays = function(x, y) {
    if (x.length != y.length) return false;
    for (i=0; i<x.length; i++) {
        if (x[i]!==y[i]) return false;
    }
    return true;
};

/**
 * Find all the occurances of a regular expression inside a string.
 * @param  {string} text - string to look in
 * @param  {string} re - regular expression to find
 * @return {array} array of [start_index, end_index] pairs
 */
var findall = function(text, re, flags) {
    re = new RegExp(re, flags || 'gm');
    var results;
    var found = [];
    while ((results = re.exec(text)) !== null) {
        var end_index = results.index + (results[0].length || 1);
        found.push([results.index, end_index]);
        re.lastIndex = Math.max(end_index, re.lastIndex);
    }
    return found;
};

/**
 * Checks if the character isn't text.
 * @param  {char} c - character
 * @return {boolean} true if the character is not text.
 */
var not_text = function(c) {
    return 'abcdefghijklmnopqrstuvwxyz1234567890_'.indexOf(c.toLowerCase()) == -1;
};

/**
 * Merges objects
 * @param  {array} objects
 * @return {object} new object, result of merged objects
 */
var merge = function(objects) {
    var result = {};
    for (var i = 0; i < objects.length; i++) {
        for (var key in objects[i]) {
            if (objects[i].hasOwnProperty(key)) {
                result[key] = objects[i][key];
            }
        }
    }
    return result;
};

// Export names.
exports.PosterClass = PosterClass;
exports.inherit = inherit;
exports.callable = callable;
exports.resolve_callable = resolve_callable;
exports.proxy = proxy;
exports.clear_array = clear_array;
exports.is_array = is_array;
exports.find_closest = find_closest;
exports.shallow_copy = shallow_copy;
exports.hook = hook;
exports.cancel_bubble = cancel_bubble;
exports.random_color = random_color;
exports.compare_arrays = compare_arrays;
exports.findall = findall;
exports.not_text = not_text;
exports.merge = merge;

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzb3VyY2UvanMvcG9zdGVyLmpzIiwic291cmNlL2NvbXBvbmVudHMvcHJpc20uanMiLCJzb3VyY2UvanMvYW5pbWF0b3IuanMiLCJzb3VyY2UvanMvY2FudmFzLmpzIiwic291cmNlL2pzL2NsaXBib2FyZC5qcyIsInNvdXJjZS9qcy9jb25maWcuanMiLCJzb3VyY2UvanMvY3Vyc29yLmpzIiwic291cmNlL2pzL2N1cnNvcnMuanMiLCJzb3VyY2UvanMvZG9jdW1lbnRfY29udHJvbGxlci5qcyIsInNvdXJjZS9qcy9kb2N1bWVudF9tb2RlbC5qcyIsInNvdXJjZS9qcy9kb2N1bWVudF92aWV3LmpzIiwic291cmNlL2pzL2V2ZW50cy9kZWZhdWx0LmpzIiwic291cmNlL2pzL2V2ZW50cy9tYXAuanMiLCJzb3VyY2UvanMvZXZlbnRzL25vcm1hbGl6ZXIuanMiLCJzb3VyY2UvanMvaGlnaGxpZ2h0ZXJzL2hpZ2hsaWdodGVyLmpzIiwic291cmNlL2pzL2hpZ2hsaWdodGVycy9wcmlzbS5qcyIsInNvdXJjZS9qcy9oaXN0b3J5LmpzIiwic291cmNlL2pzL3BsdWdpbnMvZ3V0dGVyL2d1dHRlci5qcyIsInNvdXJjZS9qcy9wbHVnaW5zL2d1dHRlci9yZW5kZXJlci5qcyIsInNvdXJjZS9qcy9wbHVnaW5zL2xpbmVudW1iZXJzL2xpbmVudW1iZXJzLmpzIiwic291cmNlL2pzL3BsdWdpbnMvbGluZW51bWJlcnMvcmVuZGVyZXIuanMiLCJzb3VyY2UvanMvcGx1Z2lucy9tYW5hZ2VyLmpzIiwic291cmNlL2pzL3BsdWdpbnMvcGx1Z2luLmpzIiwic291cmNlL2pzL3JlbmRlcmVycy9iYXRjaC5qcyIsInNvdXJjZS9qcy9yZW5kZXJlcnMvY29sb3IuanMiLCJzb3VyY2UvanMvcmVuZGVyZXJzL2N1cnNvcnMuanMiLCJzb3VyY2UvanMvcmVuZGVyZXJzL2hpZ2hsaWdodGVkX3Jvdy5qcyIsInNvdXJjZS9qcy9yZW5kZXJlcnMvcmVuZGVyZXIuanMiLCJzb3VyY2UvanMvcmVuZGVyZXJzL3Jvdy5qcyIsInNvdXJjZS9qcy9yZW5kZXJlcnMvc2VsZWN0aW9ucy5qcyIsInNvdXJjZS9qcy9zY3JvbGxpbmdfY2FudmFzLmpzIiwic291cmNlL2pzL3N0eWxlLmpzIiwic291cmNlL2pzL3N0eWxlcy9pbml0LmpzIiwic291cmNlL2pzL3N0eWxlcy9wZWFjb2NrLmpzIiwic291cmNlL2pzL3N1cGVyc2V0LmpzIiwic291cmNlL2pzL3V0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwa0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNWpCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1UEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4YUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9UQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM01BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwYUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIHNjcm9sbGluZ19jYW52YXMgPSByZXF1aXJlKCcuL3Njcm9sbGluZ19jYW52YXMuanMnKTtcbnZhciBjYW52YXMgPSByZXF1aXJlKCcuL2NhbnZhcy5qcycpO1xudmFyIGRvY3VtZW50X2NvbnRyb2xsZXIgPSByZXF1aXJlKCcuL2RvY3VtZW50X2NvbnRyb2xsZXIuanMnKTtcbnZhciBkb2N1bWVudF9tb2RlbCA9IHJlcXVpcmUoJy4vZG9jdW1lbnRfbW9kZWwuanMnKTtcbnZhciBkb2N1bWVudF92aWV3ID0gcmVxdWlyZSgnLi9kb2N1bWVudF92aWV3LmpzJyk7XG52YXIgcGx1Z2lubWFuYWdlciA9IHJlcXVpcmUoJy4vcGx1Z2lucy9tYW5hZ2VyLmpzJyk7XG52YXIgcGx1Z2luID0gcmVxdWlyZSgnLi9wbHVnaW5zL3BsdWdpbi5qcycpO1xudmFyIHJlbmRlcmVyID0gcmVxdWlyZSgnLi9yZW5kZXJlcnMvcmVuZGVyZXIuanMnKTtcbnZhciBzdHlsZSA9IHJlcXVpcmUoJy4vc3R5bGUuanMnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcbnZhciBjb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZy5qcycpO1xuY29uZmlnID0gY29uZmlnLmNvbmZpZztcblxuLyoqXG4gKiBDYW52YXMgYmFzZWQgdGV4dCBlZGl0b3JcbiAqL1xudmFyIFBvc3RlciA9IGZ1bmN0aW9uKCkge1xuICAgIHV0aWxzLlBvc3RlckNsYXNzLmNhbGwodGhpcyk7XG5cbiAgICAvLyBDcmVhdGUgY2FudmFzXG4gICAgdGhpcy5jYW52YXMgPSBuZXcgc2Nyb2xsaW5nX2NhbnZhcy5TY3JvbGxpbmdDYW52YXMoKTtcbiAgICB0aGlzLmVsID0gdGhpcy5jYW52YXMuZWw7IC8vIENvbnZlbmllbmNlXG4gICAgdGhpcy5fc3R5bGUgPSBuZXcgc3R5bGUuU3R5bGUoKTtcblxuICAgIC8vIENyZWF0ZSBtb2RlbCwgY29udHJvbGxlciwgYW5kIHZpZXcuXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMubW9kZWwgPSBuZXcgZG9jdW1lbnRfbW9kZWwuRG9jdW1lbnRNb2RlbCgpO1xuICAgIHRoaXMuY29udHJvbGxlciA9IG5ldyBkb2N1bWVudF9jb250cm9sbGVyLkRvY3VtZW50Q29udHJvbGxlcih0aGlzLmNhbnZhcy5lbCwgdGhpcy5tb2RlbCk7XG4gICAgdGhpcy52aWV3ID0gbmV3IGRvY3VtZW50X3ZpZXcuRG9jdW1lbnRWaWV3KFxuICAgICAgICB0aGlzLmNhbnZhcywgXG4gICAgICAgIHRoaXMubW9kZWwsIFxuICAgICAgICB0aGlzLmNvbnRyb2xsZXIuY3Vyc29ycywgXG4gICAgICAgIHRoaXMuX3N0eWxlLFxuICAgICAgICBmdW5jdGlvbigpIHsgcmV0dXJuIHRoYXQuY29udHJvbGxlci5jbGlwYm9hcmQuaGlkZGVuX2lucHV0ID09PSBkb2N1bWVudC5hY3RpdmVFbGVtZW50IHx8IHRoYXQuY2FudmFzLmZvY3VzZWQ7IH1cbiAgICApO1xuXG4gICAgLy8gQ3JlYXRlIHByb3BlcnRpZXNcbiAgICB0aGlzLnByb3BlcnR5KCdzdHlsZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fc3R5bGU7XG4gICAgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgnY29uZmlnJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBjb25maWc7XG4gICAgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgndmFsdWUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQubW9kZWwudGV4dDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Lm1vZGVsLnRleHQgPSB2YWx1ZTtcbiAgICB9KTtcbiAgICB0aGlzLnByb3BlcnR5KCd3aWR0aCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC52aWV3LndpZHRoO1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQudmlldy53aWR0aCA9IHZhbHVlO1xuICAgICAgICB0aGF0LnRyaWdnZXIoJ3Jlc2l6ZWQnKTtcbiAgICB9KTtcbiAgICB0aGlzLnByb3BlcnR5KCdoZWlnaHQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQudmlldy5oZWlnaHQ7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC52aWV3LmhlaWdodCA9IHZhbHVlO1xuICAgICAgICB0aGF0LnRyaWdnZXIoJ3Jlc2l6ZWQnKTtcbiAgICB9KTtcbiAgICB0aGlzLnByb3BlcnR5KCdsYW5ndWFnZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC52aWV3Lmxhbmd1YWdlO1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQudmlldy5sYW5ndWFnZSA9IHZhbHVlO1xuICAgIH0pO1xuXG4gICAgLy8gTG9hZCBwbHVnaW5zLlxuICAgIHRoaXMucGx1Z2lucyA9IG5ldyBwbHVnaW5tYW5hZ2VyLlBsdWdpbk1hbmFnZXIodGhpcyk7XG4gICAgdGhpcy5wbHVnaW5zLmxvYWQoJ2d1dHRlcicpO1xuICAgIHRoaXMucGx1Z2lucy5sb2FkKCdsaW5lbnVtYmVycycpO1xufTtcbnV0aWxzLmluaGVyaXQoUG9zdGVyLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuUG9zdGVyID0gUG9zdGVyO1xuZXhwb3J0cy5DYW52YXMgPSBwbHVnaW4uUGx1Z2luQmFzZTtcbmV4cG9ydHMuUGx1Z2luQmFzZSA9IHBsdWdpbi5QbHVnaW5CYXNlO1xuZXhwb3J0cy5SZW5kZXJlckJhc2UgPSByZW5kZXJlci5SZW5kZXJlckJhc2U7XG5leHBvcnRzLnV0aWxzID0gdXRpbHM7XG4iLCJzZWxmID0gKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKVxuXHQ/IHdpbmRvdyAgIC8vIGlmIGluIGJyb3dzZXJcblx0OiAoXG5cdFx0KHR5cGVvZiBXb3JrZXJHbG9iYWxTY29wZSAhPT0gJ3VuZGVmaW5lZCcgJiYgc2VsZiBpbnN0YW5jZW9mIFdvcmtlckdsb2JhbFNjb3BlKVxuXHRcdD8gc2VsZiAvLyBpZiBpbiB3b3JrZXJcblx0XHQ6IHt9ICAgLy8gaWYgaW4gbm9kZSBqc1xuXHQpO1xuXG4vKipcbiAqIFByaXNtOiBMaWdodHdlaWdodCwgcm9idXN0LCBlbGVnYW50IHN5bnRheCBoaWdobGlnaHRpbmdcbiAqIE1JVCBsaWNlbnNlIGh0dHA6Ly93d3cub3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvbWl0LWxpY2Vuc2UucGhwL1xuICogQGF1dGhvciBMZWEgVmVyb3UgaHR0cDovL2xlYS52ZXJvdS5tZVxuICovXG5cbnZhciBQcmlzbSA9IChmdW5jdGlvbigpe1xuXG4vLyBQcml2YXRlIGhlbHBlciB2YXJzXG52YXIgbGFuZyA9IC9cXGJsYW5nKD86dWFnZSk/LSg/IVxcKikoXFx3KylcXGIvaTtcblxudmFyIF8gPSBzZWxmLlByaXNtID0ge1xuXHR1dGlsOiB7XG5cdFx0ZW5jb2RlOiBmdW5jdGlvbiAodG9rZW5zKSB7XG5cdFx0XHRpZiAodG9rZW5zIGluc3RhbmNlb2YgVG9rZW4pIHtcblx0XHRcdFx0cmV0dXJuIG5ldyBUb2tlbih0b2tlbnMudHlwZSwgXy51dGlsLmVuY29kZSh0b2tlbnMuY29udGVudCksIHRva2Vucy5hbGlhcyk7XG5cdFx0XHR9IGVsc2UgaWYgKF8udXRpbC50eXBlKHRva2VucykgPT09ICdBcnJheScpIHtcblx0XHRcdFx0cmV0dXJuIHRva2Vucy5tYXAoXy51dGlsLmVuY29kZSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gdG9rZW5zLnJlcGxhY2UoLyYvZywgJyZhbXA7JykucmVwbGFjZSgvPC9nLCAnJmx0OycpLnJlcGxhY2UoL1xcdTAwYTAvZywgJyAnKTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0dHlwZTogZnVuY3Rpb24gKG8pIHtcblx0XHRcdHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobykubWF0Y2goL1xcW29iamVjdCAoXFx3KylcXF0vKVsxXTtcblx0XHR9LFxuXG5cdFx0Ly8gRGVlcCBjbG9uZSBhIGxhbmd1YWdlIGRlZmluaXRpb24gKGUuZy4gdG8gZXh0ZW5kIGl0KVxuXHRcdGNsb25lOiBmdW5jdGlvbiAobykge1xuXHRcdFx0dmFyIHR5cGUgPSBfLnV0aWwudHlwZShvKTtcblxuXHRcdFx0c3dpdGNoICh0eXBlKSB7XG5cdFx0XHRcdGNhc2UgJ09iamVjdCc6XG5cdFx0XHRcdFx0dmFyIGNsb25lID0ge307XG5cblx0XHRcdFx0XHRmb3IgKHZhciBrZXkgaW4gbykge1xuXHRcdFx0XHRcdFx0aWYgKG8uaGFzT3duUHJvcGVydHkoa2V5KSkge1xuXHRcdFx0XHRcdFx0XHRjbG9uZVtrZXldID0gXy51dGlsLmNsb25lKG9ba2V5XSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0cmV0dXJuIGNsb25lO1xuXG5cdFx0XHRcdGNhc2UgJ0FycmF5Jzpcblx0XHRcdFx0XHRyZXR1cm4gby5zbGljZSgpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gbztcblx0XHR9XG5cdH0sXG5cblx0bGFuZ3VhZ2VzOiB7XG5cdFx0ZXh0ZW5kOiBmdW5jdGlvbiAoaWQsIHJlZGVmKSB7XG5cdFx0XHR2YXIgbGFuZyA9IF8udXRpbC5jbG9uZShfLmxhbmd1YWdlc1tpZF0pO1xuXG5cdFx0XHRmb3IgKHZhciBrZXkgaW4gcmVkZWYpIHtcblx0XHRcdFx0bGFuZ1trZXldID0gcmVkZWZba2V5XTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGxhbmc7XG5cdFx0fSxcblxuXHRcdC8qKlxuXHRcdCAqIEluc2VydCBhIHRva2VuIGJlZm9yZSBhbm90aGVyIHRva2VuIGluIGEgbGFuZ3VhZ2UgbGl0ZXJhbFxuXHRcdCAqIEFzIHRoaXMgbmVlZHMgdG8gcmVjcmVhdGUgdGhlIG9iamVjdCAod2UgY2Fubm90IGFjdHVhbGx5IGluc2VydCBiZWZvcmUga2V5cyBpbiBvYmplY3QgbGl0ZXJhbHMpLFxuXHRcdCAqIHdlIGNhbm5vdCBqdXN0IHByb3ZpZGUgYW4gb2JqZWN0LCB3ZSBuZWVkIGFub2JqZWN0IGFuZCBhIGtleS5cblx0XHQgKiBAcGFyYW0gaW5zaWRlIFRoZSBrZXkgKG9yIGxhbmd1YWdlIGlkKSBvZiB0aGUgcGFyZW50XG5cdFx0ICogQHBhcmFtIGJlZm9yZSBUaGUga2V5IHRvIGluc2VydCBiZWZvcmUuIElmIG5vdCBwcm92aWRlZCwgdGhlIGZ1bmN0aW9uIGFwcGVuZHMgaW5zdGVhZC5cblx0XHQgKiBAcGFyYW0gaW5zZXJ0IE9iamVjdCB3aXRoIHRoZSBrZXkvdmFsdWUgcGFpcnMgdG8gaW5zZXJ0XG5cdFx0ICogQHBhcmFtIHJvb3QgVGhlIG9iamVjdCB0aGF0IGNvbnRhaW5zIGBpbnNpZGVgLiBJZiBlcXVhbCB0byBQcmlzbS5sYW5ndWFnZXMsIGl0IGNhbiBiZSBvbWl0dGVkLlxuXHRcdCAqL1xuXHRcdGluc2VydEJlZm9yZTogZnVuY3Rpb24gKGluc2lkZSwgYmVmb3JlLCBpbnNlcnQsIHJvb3QpIHtcblx0XHRcdHJvb3QgPSByb290IHx8IF8ubGFuZ3VhZ2VzO1xuXHRcdFx0dmFyIGdyYW1tYXIgPSByb290W2luc2lkZV07XG5cdFx0XHRcblx0XHRcdGlmIChhcmd1bWVudHMubGVuZ3RoID09IDIpIHtcblx0XHRcdFx0aW5zZXJ0ID0gYXJndW1lbnRzWzFdO1xuXHRcdFx0XHRcblx0XHRcdFx0Zm9yICh2YXIgbmV3VG9rZW4gaW4gaW5zZXJ0KSB7XG5cdFx0XHRcdFx0aWYgKGluc2VydC5oYXNPd25Qcm9wZXJ0eShuZXdUb2tlbikpIHtcblx0XHRcdFx0XHRcdGdyYW1tYXJbbmV3VG9rZW5dID0gaW5zZXJ0W25ld1Rva2VuXTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdHJldHVybiBncmFtbWFyO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHR2YXIgcmV0ID0ge307XG5cblx0XHRcdGZvciAodmFyIHRva2VuIGluIGdyYW1tYXIpIHtcblxuXHRcdFx0XHRpZiAoZ3JhbW1hci5oYXNPd25Qcm9wZXJ0eSh0b2tlbikpIHtcblxuXHRcdFx0XHRcdGlmICh0b2tlbiA9PSBiZWZvcmUpIHtcblxuXHRcdFx0XHRcdFx0Zm9yICh2YXIgbmV3VG9rZW4gaW4gaW5zZXJ0KSB7XG5cblx0XHRcdFx0XHRcdFx0aWYgKGluc2VydC5oYXNPd25Qcm9wZXJ0eShuZXdUb2tlbikpIHtcblx0XHRcdFx0XHRcdFx0XHRyZXRbbmV3VG9rZW5dID0gaW5zZXJ0W25ld1Rva2VuXTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHJldFt0b2tlbl0gPSBncmFtbWFyW3Rva2VuXTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHQvLyBVcGRhdGUgcmVmZXJlbmNlcyBpbiBvdGhlciBsYW5ndWFnZSBkZWZpbml0aW9uc1xuXHRcdFx0Xy5sYW5ndWFnZXMuREZTKF8ubGFuZ3VhZ2VzLCBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG5cdFx0XHRcdGlmICh2YWx1ZSA9PT0gcm9vdFtpbnNpZGVdICYmIGtleSAhPSBpbnNpZGUpIHtcblx0XHRcdFx0XHR0aGlzW2tleV0gPSByZXQ7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0XHRyZXR1cm4gcm9vdFtpbnNpZGVdID0gcmV0O1xuXHRcdH0sXG5cblx0XHQvLyBUcmF2ZXJzZSBhIGxhbmd1YWdlIGRlZmluaXRpb24gd2l0aCBEZXB0aCBGaXJzdCBTZWFyY2hcblx0XHRERlM6IGZ1bmN0aW9uKG8sIGNhbGxiYWNrLCB0eXBlKSB7XG5cdFx0XHRmb3IgKHZhciBpIGluIG8pIHtcblx0XHRcdFx0aWYgKG8uaGFzT3duUHJvcGVydHkoaSkpIHtcblx0XHRcdFx0XHRjYWxsYmFjay5jYWxsKG8sIGksIG9baV0sIHR5cGUgfHwgaSk7XG5cblx0XHRcdFx0XHRpZiAoXy51dGlsLnR5cGUob1tpXSkgPT09ICdPYmplY3QnKSB7XG5cdFx0XHRcdFx0XHRfLmxhbmd1YWdlcy5ERlMob1tpXSwgY2FsbGJhY2spO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIGlmIChfLnV0aWwudHlwZShvW2ldKSA9PT0gJ0FycmF5Jykge1xuXHRcdFx0XHRcdFx0Xy5sYW5ndWFnZXMuREZTKG9baV0sIGNhbGxiYWNrLCBpKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cblx0aGlnaGxpZ2h0QWxsOiBmdW5jdGlvbihhc3luYywgY2FsbGJhY2spIHtcblx0XHR2YXIgZWxlbWVudHMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdjb2RlW2NsYXNzKj1cImxhbmd1YWdlLVwiXSwgW2NsYXNzKj1cImxhbmd1YWdlLVwiXSBjb2RlLCBjb2RlW2NsYXNzKj1cImxhbmctXCJdLCBbY2xhc3MqPVwibGFuZy1cIl0gY29kZScpO1xuXG5cdFx0Zm9yICh2YXIgaT0wLCBlbGVtZW50OyBlbGVtZW50ID0gZWxlbWVudHNbaSsrXTspIHtcblx0XHRcdF8uaGlnaGxpZ2h0RWxlbWVudChlbGVtZW50LCBhc3luYyA9PT0gdHJ1ZSwgY2FsbGJhY2spO1xuXHRcdH1cblx0fSxcblxuXHRoaWdobGlnaHRFbGVtZW50OiBmdW5jdGlvbihlbGVtZW50LCBhc3luYywgY2FsbGJhY2spIHtcblx0XHQvLyBGaW5kIGxhbmd1YWdlXG5cdFx0dmFyIGxhbmd1YWdlLCBncmFtbWFyLCBwYXJlbnQgPSBlbGVtZW50O1xuXG5cdFx0d2hpbGUgKHBhcmVudCAmJiAhbGFuZy50ZXN0KHBhcmVudC5jbGFzc05hbWUpKSB7XG5cdFx0XHRwYXJlbnQgPSBwYXJlbnQucGFyZW50Tm9kZTtcblx0XHR9XG5cblx0XHRpZiAocGFyZW50KSB7XG5cdFx0XHRsYW5ndWFnZSA9IChwYXJlbnQuY2xhc3NOYW1lLm1hdGNoKGxhbmcpIHx8IFssJyddKVsxXTtcblx0XHRcdGdyYW1tYXIgPSBfLmxhbmd1YWdlc1tsYW5ndWFnZV07XG5cdFx0fVxuXG5cdFx0aWYgKCFncmFtbWFyKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Ly8gU2V0IGxhbmd1YWdlIG9uIHRoZSBlbGVtZW50LCBpZiBub3QgcHJlc2VudFxuXHRcdGVsZW1lbnQuY2xhc3NOYW1lID0gZWxlbWVudC5jbGFzc05hbWUucmVwbGFjZShsYW5nLCAnJykucmVwbGFjZSgvXFxzKy9nLCAnICcpICsgJyBsYW5ndWFnZS0nICsgbGFuZ3VhZ2U7XG5cblx0XHQvLyBTZXQgbGFuZ3VhZ2Ugb24gdGhlIHBhcmVudCwgZm9yIHN0eWxpbmdcblx0XHRwYXJlbnQgPSBlbGVtZW50LnBhcmVudE5vZGU7XG5cblx0XHRpZiAoL3ByZS9pLnRlc3QocGFyZW50Lm5vZGVOYW1lKSkge1xuXHRcdFx0cGFyZW50LmNsYXNzTmFtZSA9IHBhcmVudC5jbGFzc05hbWUucmVwbGFjZShsYW5nLCAnJykucmVwbGFjZSgvXFxzKy9nLCAnICcpICsgJyBsYW5ndWFnZS0nICsgbGFuZ3VhZ2U7XG5cdFx0fVxuXG5cdFx0dmFyIGNvZGUgPSBlbGVtZW50LnRleHRDb250ZW50O1xuXG5cdFx0aWYoIWNvZGUpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHR2YXIgZW52ID0ge1xuXHRcdFx0ZWxlbWVudDogZWxlbWVudCxcblx0XHRcdGxhbmd1YWdlOiBsYW5ndWFnZSxcblx0XHRcdGdyYW1tYXI6IGdyYW1tYXIsXG5cdFx0XHRjb2RlOiBjb2RlXG5cdFx0fTtcblxuXHRcdF8uaG9va3MucnVuKCdiZWZvcmUtaGlnaGxpZ2h0JywgZW52KTtcblxuXHRcdGlmIChhc3luYyAmJiBzZWxmLldvcmtlcikge1xuXHRcdFx0dmFyIHdvcmtlciA9IG5ldyBXb3JrZXIoXy5maWxlbmFtZSk7XG5cblx0XHRcdHdvcmtlci5vbm1lc3NhZ2UgPSBmdW5jdGlvbihldnQpIHtcblx0XHRcdFx0ZW52LmhpZ2hsaWdodGVkQ29kZSA9IFRva2VuLnN0cmluZ2lmeShKU09OLnBhcnNlKGV2dC5kYXRhKSwgbGFuZ3VhZ2UpO1xuXG5cdFx0XHRcdF8uaG9va3MucnVuKCdiZWZvcmUtaW5zZXJ0JywgZW52KTtcblxuXHRcdFx0XHRlbnYuZWxlbWVudC5pbm5lckhUTUwgPSBlbnYuaGlnaGxpZ2h0ZWRDb2RlO1xuXG5cdFx0XHRcdGNhbGxiYWNrICYmIGNhbGxiYWNrLmNhbGwoZW52LmVsZW1lbnQpO1xuXHRcdFx0XHRfLmhvb2tzLnJ1bignYWZ0ZXItaGlnaGxpZ2h0JywgZW52KTtcblx0XHRcdH07XG5cblx0XHRcdHdvcmtlci5wb3N0TWVzc2FnZShKU09OLnN0cmluZ2lmeSh7XG5cdFx0XHRcdGxhbmd1YWdlOiBlbnYubGFuZ3VhZ2UsXG5cdFx0XHRcdGNvZGU6IGVudi5jb2RlXG5cdFx0XHR9KSk7XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0ZW52LmhpZ2hsaWdodGVkQ29kZSA9IF8uaGlnaGxpZ2h0KGVudi5jb2RlLCBlbnYuZ3JhbW1hciwgZW52Lmxhbmd1YWdlKVxuXG5cdFx0XHRfLmhvb2tzLnJ1bignYmVmb3JlLWluc2VydCcsIGVudik7XG5cblx0XHRcdGVudi5lbGVtZW50LmlubmVySFRNTCA9IGVudi5oaWdobGlnaHRlZENvZGU7XG5cblx0XHRcdGNhbGxiYWNrICYmIGNhbGxiYWNrLmNhbGwoZWxlbWVudCk7XG5cblx0XHRcdF8uaG9va3MucnVuKCdhZnRlci1oaWdobGlnaHQnLCBlbnYpO1xuXHRcdH1cblx0fSxcblxuXHRoaWdobGlnaHQ6IGZ1bmN0aW9uICh0ZXh0LCBncmFtbWFyLCBsYW5ndWFnZSkge1xuXHRcdHZhciB0b2tlbnMgPSBfLnRva2VuaXplKHRleHQsIGdyYW1tYXIpO1xuXHRcdHJldHVybiBUb2tlbi5zdHJpbmdpZnkoXy51dGlsLmVuY29kZSh0b2tlbnMpLCBsYW5ndWFnZSk7XG5cdH0sXG5cblx0dG9rZW5pemU6IGZ1bmN0aW9uKHRleHQsIGdyYW1tYXIsIGxhbmd1YWdlKSB7XG5cdFx0dmFyIFRva2VuID0gXy5Ub2tlbjtcblxuXHRcdHZhciBzdHJhcnIgPSBbdGV4dF07XG5cblx0XHR2YXIgcmVzdCA9IGdyYW1tYXIucmVzdDtcblxuXHRcdGlmIChyZXN0KSB7XG5cdFx0XHRmb3IgKHZhciB0b2tlbiBpbiByZXN0KSB7XG5cdFx0XHRcdGdyYW1tYXJbdG9rZW5dID0gcmVzdFt0b2tlbl07XG5cdFx0XHR9XG5cblx0XHRcdGRlbGV0ZSBncmFtbWFyLnJlc3Q7XG5cdFx0fVxuXG5cdFx0dG9rZW5sb29wOiBmb3IgKHZhciB0b2tlbiBpbiBncmFtbWFyKSB7XG5cdFx0XHRpZighZ3JhbW1hci5oYXNPd25Qcm9wZXJ0eSh0b2tlbikgfHwgIWdyYW1tYXJbdG9rZW5dKSB7XG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgcGF0dGVybnMgPSBncmFtbWFyW3Rva2VuXTtcblx0XHRcdHBhdHRlcm5zID0gKF8udXRpbC50eXBlKHBhdHRlcm5zKSA9PT0gXCJBcnJheVwiKSA/IHBhdHRlcm5zIDogW3BhdHRlcm5zXTtcblxuXHRcdFx0Zm9yICh2YXIgaiA9IDA7IGogPCBwYXR0ZXJucy5sZW5ndGg7ICsraikge1xuXHRcdFx0XHR2YXIgcGF0dGVybiA9IHBhdHRlcm5zW2pdLFxuXHRcdFx0XHRcdGluc2lkZSA9IHBhdHRlcm4uaW5zaWRlLFxuXHRcdFx0XHRcdGxvb2tiZWhpbmQgPSAhIXBhdHRlcm4ubG9va2JlaGluZCxcblx0XHRcdFx0XHRsb29rYmVoaW5kTGVuZ3RoID0gMCxcblx0XHRcdFx0XHRhbGlhcyA9IHBhdHRlcm4uYWxpYXM7XG5cblx0XHRcdFx0cGF0dGVybiA9IHBhdHRlcm4ucGF0dGVybiB8fCBwYXR0ZXJuO1xuXG5cdFx0XHRcdGZvciAodmFyIGk9MDsgaTxzdHJhcnIubGVuZ3RoOyBpKyspIHsgLy8gRG9u4oCZdCBjYWNoZSBsZW5ndGggYXMgaXQgY2hhbmdlcyBkdXJpbmcgdGhlIGxvb3BcblxuXHRcdFx0XHRcdHZhciBzdHIgPSBzdHJhcnJbaV07XG5cblx0XHRcdFx0XHRpZiAoc3RyYXJyLmxlbmd0aCA+IHRleHQubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHQvLyBTb21ldGhpbmcgd2VudCB0ZXJyaWJseSB3cm9uZywgQUJPUlQsIEFCT1JUIVxuXHRcdFx0XHRcdFx0YnJlYWsgdG9rZW5sb29wO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmIChzdHIgaW5zdGFuY2VvZiBUb2tlbikge1xuXHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0cGF0dGVybi5sYXN0SW5kZXggPSAwO1xuXG5cdFx0XHRcdFx0dmFyIG1hdGNoID0gcGF0dGVybi5leGVjKHN0cik7XG5cblx0XHRcdFx0XHRpZiAobWF0Y2gpIHtcblx0XHRcdFx0XHRcdGlmKGxvb2tiZWhpbmQpIHtcblx0XHRcdFx0XHRcdFx0bG9va2JlaGluZExlbmd0aCA9IG1hdGNoWzFdLmxlbmd0aDtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0dmFyIGZyb20gPSBtYXRjaC5pbmRleCAtIDEgKyBsb29rYmVoaW5kTGVuZ3RoLFxuXHRcdFx0XHRcdFx0XHRtYXRjaCA9IG1hdGNoWzBdLnNsaWNlKGxvb2tiZWhpbmRMZW5ndGgpLFxuXHRcdFx0XHRcdFx0XHRsZW4gPSBtYXRjaC5sZW5ndGgsXG5cdFx0XHRcdFx0XHRcdHRvID0gZnJvbSArIGxlbixcblx0XHRcdFx0XHRcdFx0YmVmb3JlID0gc3RyLnNsaWNlKDAsIGZyb20gKyAxKSxcblx0XHRcdFx0XHRcdFx0YWZ0ZXIgPSBzdHIuc2xpY2UodG8gKyAxKTtcblxuXHRcdFx0XHRcdFx0dmFyIGFyZ3MgPSBbaSwgMV07XG5cblx0XHRcdFx0XHRcdGlmIChiZWZvcmUpIHtcblx0XHRcdFx0XHRcdFx0YXJncy5wdXNoKGJlZm9yZSk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdHZhciB3cmFwcGVkID0gbmV3IFRva2VuKHRva2VuLCBpbnNpZGU/IF8udG9rZW5pemUobWF0Y2gsIGluc2lkZSkgOiBtYXRjaCwgYWxpYXMpO1xuXG5cdFx0XHRcdFx0XHRhcmdzLnB1c2god3JhcHBlZCk7XG5cblx0XHRcdFx0XHRcdGlmIChhZnRlcikge1xuXHRcdFx0XHRcdFx0XHRhcmdzLnB1c2goYWZ0ZXIpO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRBcnJheS5wcm90b3R5cGUuc3BsaWNlLmFwcGx5KHN0cmFyciwgYXJncyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHN0cmFycjtcblx0fSxcblxuXHRob29rczoge1xuXHRcdGFsbDoge30sXG5cblx0XHRhZGQ6IGZ1bmN0aW9uIChuYW1lLCBjYWxsYmFjaykge1xuXHRcdFx0dmFyIGhvb2tzID0gXy5ob29rcy5hbGw7XG5cblx0XHRcdGhvb2tzW25hbWVdID0gaG9va3NbbmFtZV0gfHwgW107XG5cblx0XHRcdGhvb2tzW25hbWVdLnB1c2goY2FsbGJhY2spO1xuXHRcdH0sXG5cblx0XHRydW46IGZ1bmN0aW9uIChuYW1lLCBlbnYpIHtcblx0XHRcdHZhciBjYWxsYmFja3MgPSBfLmhvb2tzLmFsbFtuYW1lXTtcblxuXHRcdFx0aWYgKCFjYWxsYmFja3MgfHwgIWNhbGxiYWNrcy5sZW5ndGgpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRmb3IgKHZhciBpPTAsIGNhbGxiYWNrOyBjYWxsYmFjayA9IGNhbGxiYWNrc1tpKytdOykge1xuXHRcdFx0XHRjYWxsYmFjayhlbnYpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufTtcblxudmFyIFRva2VuID0gXy5Ub2tlbiA9IGZ1bmN0aW9uKHR5cGUsIGNvbnRlbnQsIGFsaWFzKSB7XG5cdHRoaXMudHlwZSA9IHR5cGU7XG5cdHRoaXMuY29udGVudCA9IGNvbnRlbnQ7XG5cdHRoaXMuYWxpYXMgPSBhbGlhcztcbn07XG5cblRva2VuLnN0cmluZ2lmeSA9IGZ1bmN0aW9uKG8sIGxhbmd1YWdlLCBwYXJlbnQpIHtcblx0aWYgKHR5cGVvZiBvID09ICdzdHJpbmcnKSB7XG5cdFx0cmV0dXJuIG87XG5cdH1cblxuXHRpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pID09ICdbb2JqZWN0IEFycmF5XScpIHtcblx0XHRyZXR1cm4gby5tYXAoZnVuY3Rpb24oZWxlbWVudCkge1xuXHRcdFx0cmV0dXJuIFRva2VuLnN0cmluZ2lmeShlbGVtZW50LCBsYW5ndWFnZSwgbyk7XG5cdFx0fSkuam9pbignJyk7XG5cdH1cblxuXHR2YXIgZW52ID0ge1xuXHRcdHR5cGU6IG8udHlwZSxcblx0XHRjb250ZW50OiBUb2tlbi5zdHJpbmdpZnkoby5jb250ZW50LCBsYW5ndWFnZSwgcGFyZW50KSxcblx0XHR0YWc6ICdzcGFuJyxcblx0XHRjbGFzc2VzOiBbJ3Rva2VuJywgby50eXBlXSxcblx0XHRhdHRyaWJ1dGVzOiB7fSxcblx0XHRsYW5ndWFnZTogbGFuZ3VhZ2UsXG5cdFx0cGFyZW50OiBwYXJlbnRcblx0fTtcblxuXHRpZiAoZW52LnR5cGUgPT0gJ2NvbW1lbnQnKSB7XG5cdFx0ZW52LmF0dHJpYnV0ZXNbJ3NwZWxsY2hlY2snXSA9ICd0cnVlJztcblx0fVxuXG5cdGlmIChvLmFsaWFzKSB7XG5cdFx0dmFyIGFsaWFzZXMgPSBfLnV0aWwudHlwZShvLmFsaWFzKSA9PT0gJ0FycmF5JyA/IG8uYWxpYXMgOiBbby5hbGlhc107XG5cdFx0QXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkoZW52LmNsYXNzZXMsIGFsaWFzZXMpO1xuXHR9XG5cblx0Xy5ob29rcy5ydW4oJ3dyYXAnLCBlbnYpO1xuXG5cdHZhciBhdHRyaWJ1dGVzID0gJyc7XG5cblx0Zm9yICh2YXIgbmFtZSBpbiBlbnYuYXR0cmlidXRlcykge1xuXHRcdGF0dHJpYnV0ZXMgKz0gbmFtZSArICc9XCInICsgKGVudi5hdHRyaWJ1dGVzW25hbWVdIHx8ICcnKSArICdcIic7XG5cdH1cblxuXHRyZXR1cm4gJzwnICsgZW52LnRhZyArICcgY2xhc3M9XCInICsgZW52LmNsYXNzZXMuam9pbignICcpICsgJ1wiICcgKyBhdHRyaWJ1dGVzICsgJz4nICsgZW52LmNvbnRlbnQgKyAnPC8nICsgZW52LnRhZyArICc+JztcblxufTtcblxuaWYgKCFzZWxmLmRvY3VtZW50KSB7XG5cdGlmICghc2VsZi5hZGRFdmVudExpc3RlbmVyKSB7XG5cdFx0Ly8gaW4gTm9kZS5qc1xuXHRcdHJldHVybiBzZWxmLlByaXNtO1xuXHR9XG4gXHQvLyBJbiB3b3JrZXJcblx0c2VsZi5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24oZXZ0KSB7XG5cdFx0dmFyIG1lc3NhZ2UgPSBKU09OLnBhcnNlKGV2dC5kYXRhKSxcblx0XHQgICAgbGFuZyA9IG1lc3NhZ2UubGFuZ3VhZ2UsXG5cdFx0ICAgIGNvZGUgPSBtZXNzYWdlLmNvZGU7XG5cblx0XHRzZWxmLnBvc3RNZXNzYWdlKEpTT04uc3RyaW5naWZ5KF8udXRpbC5lbmNvZGUoXy50b2tlbml6ZShjb2RlLCBfLmxhbmd1YWdlc1tsYW5nXSkpKSk7XG5cdFx0c2VsZi5jbG9zZSgpO1xuXHR9LCBmYWxzZSk7XG5cblx0cmV0dXJuIHNlbGYuUHJpc207XG59XG5cbi8vIEdldCBjdXJyZW50IHNjcmlwdCBhbmQgaGlnaGxpZ2h0XG52YXIgc2NyaXB0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3NjcmlwdCcpO1xuXG5zY3JpcHQgPSBzY3JpcHRbc2NyaXB0Lmxlbmd0aCAtIDFdO1xuXG5pZiAoc2NyaXB0KSB7XG5cdF8uZmlsZW5hbWUgPSBzY3JpcHQuc3JjO1xuXG5cdGlmIChkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyICYmICFzY3JpcHQuaGFzQXR0cmlidXRlKCdkYXRhLW1hbnVhbCcpKSB7XG5cdFx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIF8uaGlnaGxpZ2h0QWxsKTtcblx0fVxufVxuXG5yZXR1cm4gc2VsZi5QcmlzbTtcblxufSkoKTtcblxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG5cdG1vZHVsZS5leHBvcnRzID0gUHJpc207XG59XG5cblByaXNtLmxhbmd1YWdlcy5tYXJrdXAgPSB7XG5cdCdjb21tZW50JzogLzwhLS1bXFx3XFxXXSo/LS0+L2csXG5cdCdwcm9sb2cnOiAvPFxcPy4rP1xcPz4vLFxuXHQnZG9jdHlwZSc6IC88IURPQ1RZUEUuKz8+Lyxcblx0J2NkYXRhJzogLzwhXFxbQ0RBVEFcXFtbXFx3XFxXXSo/XV0+L2ksXG5cdCd0YWcnOiB7XG5cdFx0cGF0dGVybjogLzxcXC8/W1xcdzotXStcXHMqKD86XFxzK1tcXHc6LV0rKD86PSg/OihcInwnKShcXFxcP1tcXHdcXFddKSo/XFwxfFteXFxzJ1wiPj1dKykpP1xccyopKlxcLz8+L2dpLFxuXHRcdGluc2lkZToge1xuXHRcdFx0J3RhZyc6IHtcblx0XHRcdFx0cGF0dGVybjogL148XFwvP1tcXHc6LV0rL2ksXG5cdFx0XHRcdGluc2lkZToge1xuXHRcdFx0XHRcdCdwdW5jdHVhdGlvbic6IC9ePFxcLz8vLFxuXHRcdFx0XHRcdCduYW1lc3BhY2UnOiAvXltcXHctXSs/Oi9cblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdCdhdHRyLXZhbHVlJzoge1xuXHRcdFx0XHRwYXR0ZXJuOiAvPSg/OignfFwiKVtcXHdcXFddKj8oXFwxKXxbXlxccz5dKykvZ2ksXG5cdFx0XHRcdGluc2lkZToge1xuXHRcdFx0XHRcdCdwdW5jdHVhdGlvbic6IC89fD58XCIvZ1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0J3B1bmN0dWF0aW9uJzogL1xcLz8+L2csXG5cdFx0XHQnYXR0ci1uYW1lJzoge1xuXHRcdFx0XHRwYXR0ZXJuOiAvW1xcdzotXSsvZyxcblx0XHRcdFx0aW5zaWRlOiB7XG5cdFx0XHRcdFx0J25hbWVzcGFjZSc6IC9eW1xcdy1dKz86L1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHR9XG5cdH0sXG5cdCdlbnRpdHknOiAvXFwmIz9bXFxkYS16XXsxLDh9Oy9naVxufTtcblxuLy8gUGx1Z2luIHRvIG1ha2UgZW50aXR5IHRpdGxlIHNob3cgdGhlIHJlYWwgZW50aXR5LCBpZGVhIGJ5IFJvbWFuIEtvbWFyb3ZcblByaXNtLmhvb2tzLmFkZCgnd3JhcCcsIGZ1bmN0aW9uKGVudikge1xuXG5cdGlmIChlbnYudHlwZSA9PT0gJ2VudGl0eScpIHtcblx0XHRlbnYuYXR0cmlidXRlc1sndGl0bGUnXSA9IGVudi5jb250ZW50LnJlcGxhY2UoLyZhbXA7LywgJyYnKTtcblx0fVxufSk7XG5cblByaXNtLmxhbmd1YWdlcy5jbGlrZSA9IHtcblx0J2NvbW1lbnQnOiBbXG5cdFx0e1xuXHRcdFx0cGF0dGVybjogLyhefFteXFxcXF0pXFwvXFwqW1xcd1xcV10qP1xcKlxcLy9nLFxuXHRcdFx0bG9va2JlaGluZDogdHJ1ZVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0cGF0dGVybjogLyhefFteXFxcXDpdKVxcL1xcLy4qPyhcXHI/XFxufCQpL2csXG5cdFx0XHRsb29rYmVoaW5kOiB0cnVlXG5cdFx0fVxuXHRdLFxuXHQnc3RyaW5nJzogLyhcInwnKShcXFxcPy4pKj9cXDEvZyxcblx0J2NsYXNzLW5hbWUnOiB7XG5cdFx0cGF0dGVybjogLygoPzooPzpjbGFzc3xpbnRlcmZhY2V8ZXh0ZW5kc3xpbXBsZW1lbnRzfHRyYWl0fGluc3RhbmNlb2Z8bmV3KVxccyspfCg/OmNhdGNoXFxzK1xcKCkpW2EtejAtOV9cXC5cXFxcXSsvaWcsXG5cdFx0bG9va2JlaGluZDogdHJ1ZSxcblx0XHRpbnNpZGU6IHtcblx0XHRcdHB1bmN0dWF0aW9uOiAvKFxcLnxcXFxcKS9cblx0XHR9XG5cdH0sXG5cdCdrZXl3b3JkJzogL1xcYihpZnxlbHNlfHdoaWxlfGRvfGZvcnxyZXR1cm58aW58aW5zdGFuY2VvZnxmdW5jdGlvbnxuZXd8dHJ5fHRocm93fGNhdGNofGZpbmFsbHl8bnVsbHxicmVha3xjb250aW51ZSlcXGIvZyxcblx0J2Jvb2xlYW4nOiAvXFxiKHRydWV8ZmFsc2UpXFxiL2csXG5cdCdmdW5jdGlvbic6IHtcblx0XHRwYXR0ZXJuOiAvW2EtejAtOV9dK1xcKC9pZyxcblx0XHRpbnNpZGU6IHtcblx0XHRcdHB1bmN0dWF0aW9uOiAvXFwoL1xuXHRcdH1cblx0fSxcblx0J251bWJlcic6IC9cXGItPygweFtcXGRBLUZhLWZdK3xcXGQqXFwuP1xcZCsoW0VlXS0/XFxkKyk/KVxcYi9nLFxuXHQnb3BlcmF0b3InOiAvWy0rXXsxLDJ9fCF8PD0/fD49P3w9ezEsM318JnsxLDJ9fFxcfD9cXHx8XFw/fFxcKnxcXC98XFx+fFxcXnxcXCUvZyxcblx0J2lnbm9yZSc6IC8mKGx0fGd0fGFtcCk7L2dpLFxuXHQncHVuY3R1YXRpb24nOiAvW3t9W1xcXTsoKSwuOl0vZ1xufTtcblxuUHJpc20ubGFuZ3VhZ2VzLmFwYWNoZWNvbmYgPSB7XG5cdCdjb21tZW50JzogL1xcIy4qL2csXG5cdCdkaXJlY3RpdmUtaW5saW5lJzoge1xuXHRcdHBhdHRlcm46IC9eXFxzKlxcYihBY2NlcHRGaWx0ZXJ8QWNjZXB0UGF0aEluZm98QWNjZXNzRmlsZU5hbWV8QWN0aW9ufEFkZEFsdHxBZGRBbHRCeUVuY29kaW5nfEFkZEFsdEJ5VHlwZXxBZGRDaGFyc2V0fEFkZERlZmF1bHRDaGFyc2V0fEFkZERlc2NyaXB0aW9ufEFkZEVuY29kaW5nfEFkZEhhbmRsZXJ8QWRkSWNvbnxBZGRJY29uQnlFbmNvZGluZ3xBZGRJY29uQnlUeXBlfEFkZElucHV0RmlsdGVyfEFkZExhbmd1YWdlfEFkZE1vZHVsZUluZm98QWRkT3V0cHV0RmlsdGVyfEFkZE91dHB1dEZpbHRlckJ5VHlwZXxBZGRUeXBlfEFsaWFzfEFsaWFzTWF0Y2h8QWxsb3d8QWxsb3dDT05ORUNUfEFsbG93RW5jb2RlZFNsYXNoZXN8QWxsb3dNZXRob2RzfEFsbG93T3ZlcnJpZGV8QWxsb3dPdmVycmlkZUxpc3R8QW5vbnltb3VzfEFub255bW91c19Mb2dFbWFpbHxBbm9ueW1vdXNfTXVzdEdpdmVFbWFpbHxBbm9ueW1vdXNfTm9Vc2VySUR8QW5vbnltb3VzX1ZlcmlmeUVtYWlsfEFzeW5jUmVxdWVzdFdvcmtlckZhY3RvcnxBdXRoQmFzaWNBdXRob3JpdGF0aXZlfEF1dGhCYXNpY0Zha2V8QXV0aEJhc2ljUHJvdmlkZXJ8QXV0aEJhc2ljVXNlRGlnZXN0QWxnb3JpdGhtfEF1dGhEQkRVc2VyUFdRdWVyeXxBdXRoREJEVXNlclJlYWxtUXVlcnl8QXV0aERCTUdyb3VwRmlsZXxBdXRoREJNVHlwZXxBdXRoREJNVXNlckZpbGV8QXV0aERpZ2VzdEFsZ29yaXRobXxBdXRoRGlnZXN0RG9tYWlufEF1dGhEaWdlc3ROb25jZUxpZmV0aW1lfEF1dGhEaWdlc3RQcm92aWRlcnxBdXRoRGlnZXN0UW9wfEF1dGhEaWdlc3RTaG1lbVNpemV8QXV0aEZvcm1BdXRob3JpdGF0aXZlfEF1dGhGb3JtQm9keXxBdXRoRm9ybURpc2FibGVOb1N0b3JlfEF1dGhGb3JtRmFrZUJhc2ljQXV0aHxBdXRoRm9ybUxvY2F0aW9ufEF1dGhGb3JtTG9naW5SZXF1aXJlZExvY2F0aW9ufEF1dGhGb3JtTG9naW5TdWNjZXNzTG9jYXRpb258QXV0aEZvcm1Mb2dvdXRMb2NhdGlvbnxBdXRoRm9ybU1ldGhvZHxBdXRoRm9ybU1pbWV0eXBlfEF1dGhGb3JtUGFzc3dvcmR8QXV0aEZvcm1Qcm92aWRlcnxBdXRoRm9ybVNpdGVQYXNzcGhyYXNlfEF1dGhGb3JtU2l6ZXxBdXRoRm9ybVVzZXJuYW1lfEF1dGhHcm91cEZpbGV8QXV0aExEQVBBdXRob3JpemVQcmVmaXh8QXV0aExEQVBCaW5kQXV0aG9yaXRhdGl2ZXxBdXRoTERBUEJpbmRETnxBdXRoTERBUEJpbmRQYXNzd29yZHxBdXRoTERBUENoYXJzZXRDb25maWd8QXV0aExEQVBDb21wYXJlQXNVc2VyfEF1dGhMREFQQ29tcGFyZUROT25TZXJ2ZXJ8QXV0aExEQVBEZXJlZmVyZW5jZUFsaWFzZXN8QXV0aExEQVBHcm91cEF0dHJpYnV0ZXxBdXRoTERBUEdyb3VwQXR0cmlidXRlSXNETnxBdXRoTERBUEluaXRpYWxCaW5kQXNVc2VyfEF1dGhMREFQSW5pdGlhbEJpbmRQYXR0ZXJufEF1dGhMREFQTWF4U3ViR3JvdXBEZXB0aHxBdXRoTERBUFJlbW90ZVVzZXJBdHRyaWJ1dGV8QXV0aExEQVBSZW1vdGVVc2VySXNETnxBdXRoTERBUFNlYXJjaEFzVXNlcnxBdXRoTERBUFN1Ykdyb3VwQXR0cmlidXRlfEF1dGhMREFQU3ViR3JvdXBDbGFzc3xBdXRoTERBUFVybHxBdXRoTWVyZ2luZ3xBdXRoTmFtZXxBdXRobkNhY2hlQ29udGV4dHxBdXRobkNhY2hlRW5hYmxlfEF1dGhuQ2FjaGVQcm92aWRlRm9yfEF1dGhuQ2FjaGVTT0NhY2hlfEF1dGhuQ2FjaGVUaW1lb3V0fEF1dGhuekZjZ2lDaGVja0F1dGhuUHJvdmlkZXJ8QXV0aG56RmNnaURlZmluZVByb3ZpZGVyfEF1dGhUeXBlfEF1dGhVc2VyRmlsZXxBdXRoekRCRExvZ2luVG9SZWZlcmVyfEF1dGh6REJEUXVlcnl8QXV0aHpEQkRSZWRpcmVjdFF1ZXJ5fEF1dGh6REJNVHlwZXxBdXRoelNlbmRGb3JiaWRkZW5PbkZhaWx1cmV8QmFsYW5jZXJHcm93dGh8QmFsYW5jZXJJbmhlcml0fEJhbGFuY2VyTWVtYmVyfEJhbGFuY2VyUGVyc2lzdHxCcm93c2VyTWF0Y2h8QnJvd3Nlck1hdGNoTm9DYXNlfEJ1ZmZlcmVkTG9nc3xCdWZmZXJTaXplfENhY2hlRGVmYXVsdEV4cGlyZXxDYWNoZURldGFpbEhlYWRlcnxDYWNoZURpckxlbmd0aHxDYWNoZURpckxldmVsc3xDYWNoZURpc2FibGV8Q2FjaGVFbmFibGV8Q2FjaGVGaWxlfENhY2hlSGVhZGVyfENhY2hlSWdub3JlQ2FjaGVDb250cm9sfENhY2hlSWdub3JlSGVhZGVyc3xDYWNoZUlnbm9yZU5vTGFzdE1vZHxDYWNoZUlnbm9yZVF1ZXJ5U3RyaW5nfENhY2hlSWdub3JlVVJMU2Vzc2lvbklkZW50aWZpZXJzfENhY2hlS2V5QmFzZVVSTHxDYWNoZUxhc3RNb2RpZmllZEZhY3RvcnxDYWNoZUxvY2t8Q2FjaGVMb2NrTWF4QWdlfENhY2hlTG9ja1BhdGh8Q2FjaGVNYXhFeHBpcmV8Q2FjaGVNYXhGaWxlU2l6ZXxDYWNoZU1pbkV4cGlyZXxDYWNoZU1pbkZpbGVTaXplfENhY2hlTmVnb3RpYXRlZERvY3N8Q2FjaGVRdWlja0hhbmRsZXJ8Q2FjaGVSZWFkU2l6ZXxDYWNoZVJlYWRUaW1lfENhY2hlUm9vdHxDYWNoZVNvY2FjaGV8Q2FjaGVTb2NhY2hlTWF4U2l6ZXxDYWNoZVNvY2FjaGVNYXhUaW1lfENhY2hlU29jYWNoZU1pblRpbWV8Q2FjaGVTb2NhY2hlUmVhZFNpemV8Q2FjaGVTb2NhY2hlUmVhZFRpbWV8Q2FjaGVTdGFsZU9uRXJyb3J8Q2FjaGVTdG9yZUV4cGlyZWR8Q2FjaGVTdG9yZU5vU3RvcmV8Q2FjaGVTdG9yZVByaXZhdGV8Q0dJRFNjcmlwdFRpbWVvdXR8Q0dJTWFwRXh0ZW5zaW9ufENoYXJzZXREZWZhdWx0fENoYXJzZXRPcHRpb25zfENoYXJzZXRTb3VyY2VFbmN8Q2hlY2tDYXNlT25seXxDaGVja1NwZWxsaW5nfENocm9vdERpcnxDb250ZW50RGlnZXN0fENvb2tpZURvbWFpbnxDb29raWVFeHBpcmVzfENvb2tpZU5hbWV8Q29va2llU3R5bGV8Q29va2llVHJhY2tpbmd8Q29yZUR1bXBEaXJlY3Rvcnl8Q3VzdG9tTG9nfERhdnxEYXZEZXB0aEluZmluaXR5fERhdkdlbmVyaWNMb2NrREJ8RGF2TG9ja0RCfERhdk1pblRpbWVvdXR8REJERXhwdGltZXxEQkRJbml0U1FMfERCREtlZXB8REJETWF4fERCRE1pbnxEQkRQYXJhbXN8REJEUGVyc2lzdHxEQkRQcmVwYXJlU1FMfERCRHJpdmVyfERlZmF1bHRJY29ufERlZmF1bHRMYW5ndWFnZXxEZWZhdWx0UnVudGltZURpcnxEZWZhdWx0VHlwZXxEZWZpbmV8RGVmbGF0ZUJ1ZmZlclNpemV8RGVmbGF0ZUNvbXByZXNzaW9uTGV2ZWx8RGVmbGF0ZUZpbHRlck5vdGV8RGVmbGF0ZUluZmxhdGVMaW1pdFJlcXVlc3RCb2R5fERlZmxhdGVJbmZsYXRlUmF0aW9CdXJzdHxEZWZsYXRlSW5mbGF0ZVJhdGlvTGltaXR8RGVmbGF0ZU1lbUxldmVsfERlZmxhdGVXaW5kb3dTaXplfERlbnl8RGlyZWN0b3J5Q2hlY2tIYW5kbGVyfERpcmVjdG9yeUluZGV4fERpcmVjdG9yeUluZGV4UmVkaXJlY3R8RGlyZWN0b3J5U2xhc2h8RG9jdW1lbnRSb290fERUcmFjZVByaXZpbGVnZXN8RHVtcElPSW5wdXR8RHVtcElPT3V0cHV0fEVuYWJsZUV4Y2VwdGlvbkhvb2t8RW5hYmxlTU1BUHxFbmFibGVTZW5kZmlsZXxFcnJvcnxFcnJvckRvY3VtZW50fEVycm9yTG9nfEVycm9yTG9nRm9ybWF0fEV4YW1wbGV8RXhwaXJlc0FjdGl2ZXxFeHBpcmVzQnlUeXBlfEV4cGlyZXNEZWZhdWx0fEV4dGVuZGVkU3RhdHVzfEV4dEZpbHRlckRlZmluZXxFeHRGaWx0ZXJPcHRpb25zfEZhbGxiYWNrUmVzb3VyY2V8RmlsZUVUYWd8RmlsdGVyQ2hhaW58RmlsdGVyRGVjbGFyZXxGaWx0ZXJQcm90b2NvbHxGaWx0ZXJQcm92aWRlcnxGaWx0ZXJUcmFjZXxGb3JjZUxhbmd1YWdlUHJpb3JpdHl8Rm9yY2VUeXBlfEZvcmVuc2ljTG9nfEdwcm9mRGlyfEdyYWNlZnVsU2h1dGRvd25UaW1lb3V0fEdyb3VwfEhlYWRlcnxIZWFkZXJOYW1lfEhlYXJ0YmVhdEFkZHJlc3N8SGVhcnRiZWF0TGlzdGVufEhlYXJ0YmVhdE1heFNlcnZlcnN8SGVhcnRiZWF0U3RvcmFnZXxIZWFydGJlYXRTdG9yYWdlfEhvc3RuYW1lTG9va3Vwc3xJZGVudGl0eUNoZWNrfElkZW50aXR5Q2hlY2tUaW1lb3V0fEltYXBCYXNlfEltYXBEZWZhdWx0fEltYXBNZW51fEluY2x1ZGV8SW5jbHVkZU9wdGlvbmFsfEluZGV4SGVhZEluc2VydHxJbmRleElnbm9yZXxJbmRleElnbm9yZVJlc2V0fEluZGV4T3B0aW9uc3xJbmRleE9yZGVyRGVmYXVsdHxJbmRleFN0eWxlU2hlZXR8SW5wdXRTZWR8SVNBUElBcHBlbmRMb2dUb0Vycm9yc3xJU0FQSUFwcGVuZExvZ1RvUXVlcnl8SVNBUElDYWNoZUZpbGV8SVNBUElGYWtlQXN5bmN8SVNBUElMb2dOb3RTdXBwb3J0ZWR8SVNBUElSZWFkQWhlYWRCdWZmZXJ8S2VlcEFsaXZlfEtlZXBBbGl2ZVRpbWVvdXR8S2VwdEJvZHlTaXplfExhbmd1YWdlUHJpb3JpdHl8TERBUENhY2hlRW50cmllc3xMREFQQ2FjaGVUVEx8TERBUENvbm5lY3Rpb25Qb29sVFRMfExEQVBDb25uZWN0aW9uVGltZW91dHxMREFQTGlicmFyeURlYnVnfExEQVBPcENhY2hlRW50cmllc3xMREFQT3BDYWNoZVRUTHxMREFQUmVmZXJyYWxIb3BMaW1pdHxMREFQUmVmZXJyYWxzfExEQVBSZXRyaWVzfExEQVBSZXRyeURlbGF5fExEQVBTaGFyZWRDYWNoZUZpbGV8TERBUFNoYXJlZENhY2hlU2l6ZXxMREFQVGltZW91dHxMREFQVHJ1c3RlZENsaWVudENlcnR8TERBUFRydXN0ZWRHbG9iYWxDZXJ0fExEQVBUcnVzdGVkTW9kZXxMREFQVmVyaWZ5U2VydmVyQ2VydHxMaW1pdEludGVybmFsUmVjdXJzaW9ufExpbWl0UmVxdWVzdEJvZHl8TGltaXRSZXF1ZXN0RmllbGRzfExpbWl0UmVxdWVzdEZpZWxkU2l6ZXxMaW1pdFJlcXVlc3RMaW5lfExpbWl0WE1MUmVxdWVzdEJvZHl8TGlzdGVufExpc3RlbkJhY2tMb2d8TG9hZEZpbGV8TG9hZE1vZHVsZXxMb2dGb3JtYXR8TG9nTGV2ZWx8TG9nTWVzc2FnZXxMdWFBdXRoelByb3ZpZGVyfEx1YUNvZGVDYWNoZXxMdWFIb29rQWNjZXNzQ2hlY2tlcnxMdWFIb29rQXV0aENoZWNrZXJ8THVhSG9va0NoZWNrVXNlcklEfEx1YUhvb2tGaXh1cHN8THVhSG9va0luc2VydEZpbHRlcnxMdWFIb29rTG9nfEx1YUhvb2tNYXBUb1N0b3JhZ2V8THVhSG9va1RyYW5zbGF0ZU5hbWV8THVhSG9va1R5cGVDaGVja2VyfEx1YUluaGVyaXR8THVhSW5wdXRGaWx0ZXJ8THVhTWFwSGFuZGxlcnxMdWFPdXRwdXRGaWx0ZXJ8THVhUGFja2FnZUNQYXRofEx1YVBhY2thZ2VQYXRofEx1YVF1aWNrSGFuZGxlcnxMdWFSb290fEx1YVNjb3BlfE1heENvbm5lY3Rpb25zUGVyQ2hpbGR8TWF4S2VlcEFsaXZlUmVxdWVzdHN8TWF4TWVtRnJlZXxNYXhSYW5nZU92ZXJsYXBzfE1heFJhbmdlUmV2ZXJzYWxzfE1heFJhbmdlc3xNYXhSZXF1ZXN0V29ya2Vyc3xNYXhTcGFyZVNlcnZlcnN8TWF4U3BhcmVUaHJlYWRzfE1heFRocmVhZHN8TWVyZ2VUcmFpbGVyc3xNZXRhRGlyfE1ldGFGaWxlc3xNZXRhU3VmZml4fE1pbWVNYWdpY0ZpbGV8TWluU3BhcmVTZXJ2ZXJzfE1pblNwYXJlVGhyZWFkc3xNTWFwRmlsZXxNb2RlbVN0YW5kYXJkfE1vZE1pbWVVc2VQYXRoSW5mb3xNdWx0aXZpZXdzTWF0Y2h8TXV0ZXh8TmFtZVZpcnR1YWxIb3N0fE5vUHJveHl8TldTU0xUcnVzdGVkQ2VydHN8TldTU0xVcGdyYWRlYWJsZXxPcHRpb25zfE9yZGVyfE91dHB1dFNlZHxQYXNzRW52fFBpZEZpbGV8UHJpdmlsZWdlc01vZGV8UHJvdG9jb2x8UHJvdG9jb2xFY2hvfFByb3h5QWRkSGVhZGVyc3xQcm94eUJhZEhlYWRlcnxQcm94eUJsb2NrfFByb3h5RG9tYWlufFByb3h5RXJyb3JPdmVycmlkZXxQcm94eUV4cHJlc3NEQk1GaWxlfFByb3h5RXhwcmVzc0RCTVR5cGV8UHJveHlFeHByZXNzRW5hYmxlfFByb3h5RnRwRGlyQ2hhcnNldHxQcm94eUZ0cEVzY2FwZVdpbGRjYXJkc3xQcm94eUZ0cExpc3RPbldpbGRjYXJkfFByb3h5SFRNTEJ1ZlNpemV8UHJveHlIVE1MQ2hhcnNldE91dHxQcm94eUhUTUxEb2NUeXBlfFByb3h5SFRNTEVuYWJsZXxQcm94eUhUTUxFdmVudHN8UHJveHlIVE1MRXh0ZW5kZWR8UHJveHlIVE1MRml4dXBzfFByb3h5SFRNTEludGVycHxQcm94eUhUTUxMaW5rc3xQcm94eUhUTUxNZXRhfFByb3h5SFRNTFN0cmlwQ29tbWVudHN8UHJveHlIVE1MVVJMTWFwfFByb3h5SU9CdWZmZXJTaXplfFByb3h5TWF4Rm9yd2FyZHN8UHJveHlQYXNzfFByb3h5UGFzc0luaGVyaXR8UHJveHlQYXNzSW50ZXJwb2xhdGVFbnZ8UHJveHlQYXNzTWF0Y2h8UHJveHlQYXNzUmV2ZXJzZXxQcm94eVBhc3NSZXZlcnNlQ29va2llRG9tYWlufFByb3h5UGFzc1JldmVyc2VDb29raWVQYXRofFByb3h5UHJlc2VydmVIb3N0fFByb3h5UmVjZWl2ZUJ1ZmZlclNpemV8UHJveHlSZW1vdGV8UHJveHlSZW1vdGVNYXRjaHxQcm94eVJlcXVlc3RzfFByb3h5U0NHSUludGVybmFsUmVkaXJlY3R8UHJveHlTQ0dJU2VuZGZpbGV8UHJveHlTZXR8UHJveHlTb3VyY2VBZGRyZXNzfFByb3h5U3RhdHVzfFByb3h5VGltZW91dHxQcm94eVZpYXxSZWFkbWVOYW1lfFJlY2VpdmVCdWZmZXJTaXplfFJlZGlyZWN0fFJlZGlyZWN0TWF0Y2h8UmVkaXJlY3RQZXJtYW5lbnR8UmVkaXJlY3RUZW1wfFJlZmxlY3RvckhlYWRlcnxSZW1vdGVJUEhlYWRlcnxSZW1vdGVJUEludGVybmFsUHJveHl8UmVtb3RlSVBJbnRlcm5hbFByb3h5TGlzdHxSZW1vdGVJUFByb3hpZXNIZWFkZXJ8UmVtb3RlSVBUcnVzdGVkUHJveHl8UmVtb3RlSVBUcnVzdGVkUHJveHlMaXN0fFJlbW92ZUNoYXJzZXR8UmVtb3ZlRW5jb2Rpbmd8UmVtb3ZlSGFuZGxlcnxSZW1vdmVJbnB1dEZpbHRlcnxSZW1vdmVMYW5ndWFnZXxSZW1vdmVPdXRwdXRGaWx0ZXJ8UmVtb3ZlVHlwZXxSZXF1ZXN0SGVhZGVyfFJlcXVlc3RSZWFkVGltZW91dHxSZXF1aXJlfFJld3JpdGVCYXNlfFJld3JpdGVDb25kfFJld3JpdGVFbmdpbmV8UmV3cml0ZU1hcHxSZXdyaXRlT3B0aW9uc3xSZXdyaXRlUnVsZXxSTGltaXRDUFV8UkxpbWl0TUVNfFJMaW1pdE5QUk9DfFNhdGlzZnl8U2NvcmVCb2FyZEZpbGV8U2NyaXB0fFNjcmlwdEFsaWFzfFNjcmlwdEFsaWFzTWF0Y2h8U2NyaXB0SW50ZXJwcmV0ZXJTb3VyY2V8U2NyaXB0TG9nfFNjcmlwdExvZ0J1ZmZlcnxTY3JpcHRMb2dMZW5ndGh8U2NyaXB0U29ja3xTZWN1cmVMaXN0ZW58U2VlUmVxdWVzdFRhaWx8U2VuZEJ1ZmZlclNpemV8U2VydmVyQWRtaW58U2VydmVyQWxpYXN8U2VydmVyTGltaXR8U2VydmVyTmFtZXxTZXJ2ZXJQYXRofFNlcnZlclJvb3R8U2VydmVyU2lnbmF0dXJlfFNlcnZlclRva2Vuc3xTZXNzaW9ufFNlc3Npb25Db29raWVOYW1lfFNlc3Npb25Db29raWVOYW1lMnxTZXNzaW9uQ29va2llUmVtb3ZlfFNlc3Npb25DcnlwdG9DaXBoZXJ8U2Vzc2lvbkNyeXB0b0RyaXZlcnxTZXNzaW9uQ3J5cHRvUGFzc3BocmFzZXxTZXNzaW9uQ3J5cHRvUGFzc3BocmFzZUZpbGV8U2Vzc2lvbkRCRENvb2tpZU5hbWV8U2Vzc2lvbkRCRENvb2tpZU5hbWUyfFNlc3Npb25EQkRDb29raWVSZW1vdmV8U2Vzc2lvbkRCRERlbGV0ZUxhYmVsfFNlc3Npb25EQkRJbnNlcnRMYWJlbHxTZXNzaW9uREJEUGVyVXNlcnxTZXNzaW9uREJEU2VsZWN0TGFiZWx8U2Vzc2lvbkRCRFVwZGF0ZUxhYmVsfFNlc3Npb25FbnZ8U2Vzc2lvbkV4Y2x1ZGV8U2Vzc2lvbkhlYWRlcnxTZXNzaW9uSW5jbHVkZXxTZXNzaW9uTWF4QWdlfFNldEVudnxTZXRFbnZJZnxTZXRFbnZJZkV4cHJ8U2V0RW52SWZOb0Nhc2V8U2V0SGFuZGxlcnxTZXRJbnB1dEZpbHRlcnxTZXRPdXRwdXRGaWx0ZXJ8U1NJRW5kVGFnfFNTSUVycm9yTXNnfFNTSUVUYWd8U1NJTGFzdE1vZGlmaWVkfFNTSUxlZ2FjeUV4cHJQYXJzZXJ8U1NJU3RhcnRUYWd8U1NJVGltZUZvcm1hdHxTU0lVbmRlZmluZWRFY2hvfFNTTENBQ2VydGlmaWNhdGVGaWxlfFNTTENBQ2VydGlmaWNhdGVQYXRofFNTTENBRE5SZXF1ZXN0RmlsZXxTU0xDQUROUmVxdWVzdFBhdGh8U1NMQ0FSZXZvY2F0aW9uQ2hlY2t8U1NMQ0FSZXZvY2F0aW9uRmlsZXxTU0xDQVJldm9jYXRpb25QYXRofFNTTENlcnRpZmljYXRlQ2hhaW5GaWxlfFNTTENlcnRpZmljYXRlRmlsZXxTU0xDZXJ0aWZpY2F0ZUtleUZpbGV8U1NMQ2lwaGVyU3VpdGV8U1NMQ29tcHJlc3Npb258U1NMQ3J5cHRvRGV2aWNlfFNTTEVuZ2luZXxTU0xGSVBTfFNTTEhvbm9yQ2lwaGVyT3JkZXJ8U1NMSW5zZWN1cmVSZW5lZ290aWF0aW9ufFNTTE9DU1BEZWZhdWx0UmVzcG9uZGVyfFNTTE9DU1BFbmFibGV8U1NMT0NTUE92ZXJyaWRlUmVzcG9uZGVyfFNTTE9DU1BSZXNwb25kZXJUaW1lb3V0fFNTTE9DU1BSZXNwb25zZU1heEFnZXxTU0xPQ1NQUmVzcG9uc2VUaW1lU2tld3xTU0xPQ1NQVXNlUmVxdWVzdE5vbmNlfFNTTE9wZW5TU0xDb25mQ21kfFNTTE9wdGlvbnN8U1NMUGFzc1BocmFzZURpYWxvZ3xTU0xQcm90b2NvbHxTU0xQcm94eUNBQ2VydGlmaWNhdGVGaWxlfFNTTFByb3h5Q0FDZXJ0aWZpY2F0ZVBhdGh8U1NMUHJveHlDQVJldm9jYXRpb25DaGVja3xTU0xQcm94eUNBUmV2b2NhdGlvbkZpbGV8U1NMUHJveHlDQVJldm9jYXRpb25QYXRofFNTTFByb3h5Q2hlY2tQZWVyQ058U1NMUHJveHlDaGVja1BlZXJFeHBpcmV8U1NMUHJveHlDaGVja1BlZXJOYW1lfFNTTFByb3h5Q2lwaGVyU3VpdGV8U1NMUHJveHlFbmdpbmV8U1NMUHJveHlNYWNoaW5lQ2VydGlmaWNhdGVDaGFpbkZpbGV8U1NMUHJveHlNYWNoaW5lQ2VydGlmaWNhdGVGaWxlfFNTTFByb3h5TWFjaGluZUNlcnRpZmljYXRlUGF0aHxTU0xQcm94eVByb3RvY29sfFNTTFByb3h5VmVyaWZ5fFNTTFByb3h5VmVyaWZ5RGVwdGh8U1NMUmFuZG9tU2VlZHxTU0xSZW5lZ0J1ZmZlclNpemV8U1NMUmVxdWlyZXxTU0xSZXF1aXJlU1NMfFNTTFNlc3Npb25DYWNoZXxTU0xTZXNzaW9uQ2FjaGVUaW1lb3V0fFNTTFNlc3Npb25UaWNrZXRLZXlGaWxlfFNTTFNSUFVua25vd25Vc2VyU2VlZHxTU0xTUlBWZXJpZmllckZpbGV8U1NMU3RhcGxpbmdDYWNoZXxTU0xTdGFwbGluZ0Vycm9yQ2FjaGVUaW1lb3V0fFNTTFN0YXBsaW5nRmFrZVRyeUxhdGVyfFNTTFN0YXBsaW5nRm9yY2VVUkx8U1NMU3RhcGxpbmdSZXNwb25kZXJUaW1lb3V0fFNTTFN0YXBsaW5nUmVzcG9uc2VNYXhBZ2V8U1NMU3RhcGxpbmdSZXNwb25zZVRpbWVTa2V3fFNTTFN0YXBsaW5nUmV0dXJuUmVzcG9uZGVyRXJyb3JzfFNTTFN0YXBsaW5nU3RhbmRhcmRDYWNoZVRpbWVvdXR8U1NMU3RyaWN0U05JVkhvc3RDaGVja3xTU0xVc2VyTmFtZXxTU0xVc2VTdGFwbGluZ3xTU0xWZXJpZnlDbGllbnR8U1NMVmVyaWZ5RGVwdGh8U3RhcnRTZXJ2ZXJzfFN0YXJ0VGhyZWFkc3xTdWJzdGl0dXRlfFN1ZXhlY3xTdWV4ZWNVc2VyR3JvdXB8VGhyZWFkTGltaXR8VGhyZWFkc1BlckNoaWxkfFRocmVhZFN0YWNrU2l6ZXxUaW1lT3V0fFRyYWNlRW5hYmxlfFRyYW5zZmVyTG9nfFR5cGVzQ29uZmlnfFVuRGVmaW5lfFVuZGVmTWFjcm98VW5zZXRFbnZ8VXNlfFVzZUNhbm9uaWNhbE5hbWV8VXNlQ2Fub25pY2FsUGh5c2ljYWxQb3J0fFVzZXJ8VXNlckRpcnxWSG9zdENHSU1vZGV8Vkhvc3RDR0lQcml2c3xWSG9zdEdyb3VwfFZIb3N0UHJpdnN8Vkhvc3RTZWN1cmV8Vkhvc3RVc2VyfFZpcnR1YWxEb2N1bWVudFJvb3R8VmlydHVhbERvY3VtZW50Um9vdElQfFZpcnR1YWxTY3JpcHRBbGlhc3xWaXJ0dWFsU2NyaXB0QWxpYXNJUHxXYXRjaGRvZ0ludGVydmFsfFhCaXRIYWNrfHhtbDJFbmNBbGlhc3x4bWwyRW5jRGVmYXVsdHx4bWwyU3RhcnRQYXJzZSlcXGIvZ21pLFxuXHRcdGFsaWFzOiAncHJvcGVydHknXG5cdH0sXG5cdCdkaXJlY3RpdmUtYmxvY2snOiB7XG5cdFx0cGF0dGVybjogLzxcXC8/XFxiKEF1dGhuUHJvdmlkZXJBbGlhc3xBdXRoelByb3ZpZGVyQWxpYXN8RGlyZWN0b3J5fERpcmVjdG9yeU1hdGNofEVsc2V8RWxzZUlmfEZpbGVzfEZpbGVzTWF0Y2h8SWZ8SWZEZWZpbmV8SWZNb2R1bGV8SWZWZXJzaW9ufExpbWl0fExpbWl0RXhjZXB0fExvY2F0aW9ufExvY2F0aW9uTWF0Y2h8TWFjcm98UHJveHl8UmVxdWlyZUFsbHxSZXF1aXJlQW55fFJlcXVpcmVOb25lfFZpcnR1YWxIb3N0KVxcYiAqLio+L2dpLFxuXHRcdGluc2lkZToge1xuXHRcdFx0J2RpcmVjdGl2ZS1ibG9jayc6IHtcblx0XHRcdFx0cGF0dGVybjogL148XFwvP1xcdysvLFxuXHRcdFx0XHRpbnNpZGU6IHtcblx0XHRcdFx0XHQncHVuY3R1YXRpb24nOiAvXjxcXC8/L1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRhbGlhczogJ3RhZydcblx0XHRcdH0sXG5cdFx0XHQnZGlyZWN0aXZlLWJsb2NrLXBhcmFtZXRlcic6IHtcblx0XHRcdFx0cGF0dGVybjogLy4qW14+XS8sXG5cdFx0XHRcdGluc2lkZToge1xuXHRcdFx0XHRcdCdwdW5jdHVhdGlvbic6IC86Lyxcblx0XHRcdFx0XHQnc3RyaW5nJzoge1xuXHRcdFx0XHRcdFx0cGF0dGVybjogLyhcInwnKS4qXFwxL2csXG5cdFx0XHRcdFx0XHRpbnNpZGU6IHtcblx0XHRcdFx0XHRcdFx0J3ZhcmlhYmxlJzogLyhcXCR8JSlcXHs/KFxcd1xcLj8oXFwrfFxcLXw6KT8pK1xcfT8vZ1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0YWxpYXM6ICdhdHRyLXZhbHVlJ1xuXHRcdFx0fSxcblx0XHRcdCdwdW5jdHVhdGlvbic6IC8+L1xuXHRcdH0sXG5cdFx0YWxpYXM6ICd0YWcnXG5cdH0sXG5cdCdkaXJlY3RpdmUtZmxhZ3MnOiB7XG5cdFx0cGF0dGVybjogL1xcWyhcXHcsPykrXFxdL2csXG5cdFx0YWxpYXM6ICdrZXl3b3JkJ1xuXHR9LFxuXHQnc3RyaW5nJzoge1xuXHRcdHBhdHRlcm46IC8oXCJ8JykuKlxcMS9nLFxuXHRcdGluc2lkZToge1xuXHRcdFx0J3ZhcmlhYmxlJzogLyhcXCR8JSlcXHs/KFxcd1xcLj8oXFwrfFxcLXw6KT8pK1xcfT8vZ1xuXHRcdH1cblx0fSxcblx0J3ZhcmlhYmxlJzogLyhcXCR8JSlcXHs/KFxcd1xcLj8oXFwrfFxcLXw6KT8pK1xcfT8vZyxcblx0J3JlZ2V4JzogL1xcXj8uKlxcJHxcXF4uKlxcJD8vZ1xufTtcblxuUHJpc20ubGFuZ3VhZ2VzLmphdmEgPSBQcmlzbS5sYW5ndWFnZXMuZXh0ZW5kKCdjbGlrZScsIHtcblx0J2tleXdvcmQnOiAvXFxiKGFic3RyYWN0fGNvbnRpbnVlfGZvcnxuZXd8c3dpdGNofGFzc2VydHxkZWZhdWx0fGdvdG98cGFja2FnZXxzeW5jaHJvbml6ZWR8Ym9vbGVhbnxkb3xpZnxwcml2YXRlfHRoaXN8YnJlYWt8ZG91YmxlfGltcGxlbWVudHN8cHJvdGVjdGVkfHRocm93fGJ5dGV8ZWxzZXxpbXBvcnR8cHVibGljfHRocm93c3xjYXNlfGVudW18aW5zdGFuY2VvZnxyZXR1cm58dHJhbnNpZW50fGNhdGNofGV4dGVuZHN8aW50fHNob3J0fHRyeXxjaGFyfGZpbmFsfGludGVyZmFjZXxzdGF0aWN8dm9pZHxjbGFzc3xmaW5hbGx5fGxvbmd8c3RyaWN0ZnB8dm9sYXRpbGV8Y29uc3R8ZmxvYXR8bmF0aXZlfHN1cGVyfHdoaWxlKVxcYi9nLFxuXHQnbnVtYmVyJzogL1xcYjBiWzAxXStcXGJ8XFxiMHhbXFxkYS1mXSpcXC4/W1xcZGEtZnBcXC1dK1xcYnxcXGJcXGQqXFwuP1xcZCtbZV0/W1xcZF0qW2RmXVxcYnxcXFdcXGQqXFwuP1xcZCtcXGIvZ2ksXG5cdCdvcGVyYXRvcic6IHtcblx0XHRwYXR0ZXJuOiAvKF58W15cXC5dKSg/OlxcKz18XFwrXFwrP3wtPXwtLT98IT0/fDx7MSwyfT0/fD57MSwzfT0/fD09P3wmPXwmJj98XFx8PXxcXHxcXHw/fFxcP3xcXCo9P3xcXC89P3wlPT98XFxePT98Onx+KS9nbSxcblx0XHRsb29rYmVoaW5kOiB0cnVlXG5cdH1cbn0pO1xuUHJpc20ubGFuZ3VhZ2VzLnB5dGhvbj0geyBcblx0J2NvbW1lbnQnOiB7XG5cdFx0cGF0dGVybjogLyhefFteXFxcXF0pIy4qPyhcXHI/XFxufCQpL2csXG5cdFx0bG9va2JlaGluZDogdHJ1ZVxuXHR9LFxuXHQnc3RyaW5nJzogL1wiXCJcIltcXHNcXFNdKz9cIlwiXCJ8KFwifCcpKFxcXFw/LikqP1xcMS9nLFxuXHQna2V5d29yZCcgOiAvXFxiKGFzfGFzc2VydHxicmVha3xjbGFzc3xjb250aW51ZXxkZWZ8ZGVsfGVsaWZ8ZWxzZXxleGNlcHR8ZXhlY3xmaW5hbGx5fGZvcnxmcm9tfGdsb2JhbHxpZnxpbXBvcnR8aW58aXN8bGFtYmRhfHBhc3N8cHJpbnR8cmFpc2V8cmV0dXJufHRyeXx3aGlsZXx3aXRofHlpZWxkKVxcYi9nLFxuXHQnYm9vbGVhbicgOiAvXFxiKFRydWV8RmFsc2UpXFxiL2csXG5cdCdudW1iZXInIDogL1xcYi0/KDB4KT9cXGQqXFwuP1tcXGRhLWZdK1xcYi9nLFxuXHQnb3BlcmF0b3InIDogL1stK117MSwyfXw9PyZsdDt8PT8mZ3Q7fCF8PXsxLDJ9fCgmKXsxLDJ9fCgmYW1wOyl7MSwyfXxcXHw/XFx8fFxcP3xcXCp8XFwvfH58XFxefCV8XFxiKG9yfGFuZHxub3QpXFxiL2csXG5cdCdpZ25vcmUnIDogLyYobHR8Z3R8YW1wKTsvZ2ksXG5cdCdwdW5jdHVhdGlvbicgOiAvW3t9W1xcXTsoKSwuOl0vZ1xufTtcblxuXG5QcmlzbS5sYW5ndWFnZXMuYXNwbmV0ID0gUHJpc20ubGFuZ3VhZ2VzLmV4dGVuZCgnbWFya3VwJywge1xuXHQncGFnZS1kaXJlY3RpdmUgdGFnJzoge1xuXHRcdHBhdHRlcm46IC88JVxccypALiolPi9naSxcblx0XHRpbnNpZGU6IHtcblx0XHRcdCdwYWdlLWRpcmVjdGl2ZSB0YWcnOiAvPCVcXHMqQFxccyooPzpBc3NlbWJseXxDb250cm9sfEltcGxlbWVudHN8SW1wb3J0fE1hc3RlcnxNYXN0ZXJUeXBlfE91dHB1dENhY2hlfFBhZ2V8UHJldmlvdXNQYWdlVHlwZXxSZWZlcmVuY2V8UmVnaXN0ZXIpP3wlPi9pZyxcblx0XHRcdHJlc3Q6IFByaXNtLmxhbmd1YWdlcy5tYXJrdXAudGFnLmluc2lkZVxuXHRcdH1cblx0fSxcblx0J2RpcmVjdGl2ZSB0YWcnOiB7XG5cdFx0cGF0dGVybjogLzwlLiolPi9naSxcblx0XHRpbnNpZGU6IHtcblx0XHRcdCdkaXJlY3RpdmUgdGFnJzogLzwlXFxzKj9bJD0lIzpdezAsMn18JT4vZ2ksXG5cdFx0XHRyZXN0OiBQcmlzbS5sYW5ndWFnZXMuY3NoYXJwXG5cdFx0fVxuXHR9XG59KTtcblxuLy8gbWF0Y2ggZGlyZWN0aXZlcyBvZiBhdHRyaWJ1dGUgdmFsdWUgZm9vPVwiPCUgQmFyICU+XCJcblByaXNtLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoJ2luc2lkZScsICdwdW5jdHVhdGlvbicsIHtcblx0J2RpcmVjdGl2ZSB0YWcnOiBQcmlzbS5sYW5ndWFnZXMuYXNwbmV0WydkaXJlY3RpdmUgdGFnJ11cbn0sIFByaXNtLmxhbmd1YWdlcy5hc3BuZXQudGFnLmluc2lkZVtcImF0dHItdmFsdWVcIl0pO1xuXG5QcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKCdhc3BuZXQnLCAnY29tbWVudCcsIHtcblx0J2FzcCBjb21tZW50JzogLzwlLS1bXFx3XFxXXSo/LS0lPi9nXG59KTtcblxuLy8gc2NyaXB0IHJ1bmF0PVwic2VydmVyXCIgY29udGFpbnMgY3NoYXJwLCBub3QgamF2YXNjcmlwdFxuUHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZSgnYXNwbmV0JywgUHJpc20ubGFuZ3VhZ2VzLmphdmFzY3JpcHQgPyAnc2NyaXB0JyA6ICd0YWcnLCB7XG5cdCdhc3Agc2NyaXB0Jzoge1xuXHRcdHBhdHRlcm46IC88c2NyaXB0KD89LipydW5hdD1bJ1wiXT9zZXJ2ZXJbJ1wiXT8pW1xcd1xcV10qPz5bXFx3XFxXXSo/PFxcL3NjcmlwdD4vaWcsXG5cdFx0aW5zaWRlOiB7XG5cdFx0XHR0YWc6IHtcblx0XHRcdFx0cGF0dGVybjogLzxcXC8/c2NyaXB0XFxzKig/OlxccytbXFx3Oi1dKyg/Oj0oPzooXCJ8JykoXFxcXD9bXFx3XFxXXSkqP1xcMXxcXHcrKSk/XFxzKikqXFwvPz4vZ2ksXG5cdFx0XHRcdGluc2lkZTogUHJpc20ubGFuZ3VhZ2VzLmFzcG5ldC50YWcuaW5zaWRlXG5cdFx0XHR9LFxuXHRcdFx0cmVzdDogUHJpc20ubGFuZ3VhZ2VzLmNzaGFycCB8fCB7fVxuXHRcdH1cblx0fVxufSk7XG5cbi8vIEhhY2tzIHRvIGZpeCBlYWdlciB0YWcgbWF0Y2hpbmcgZmluaXNoaW5nIHRvbyBlYXJseTogPHNjcmlwdCBzcmM9XCI8JSBGb28uQmFyICU+XCI+ID0+IDxzY3JpcHQgc3JjPVwiPCUgRm9vLkJhciAlPlxuaWYgKCBQcmlzbS5sYW5ndWFnZXMuYXNwbmV0LnN0eWxlICkge1xuXHRQcmlzbS5sYW5ndWFnZXMuYXNwbmV0LnN0eWxlLmluc2lkZS50YWcucGF0dGVybiA9IC88XFwvP3N0eWxlXFxzKig/OlxccytbXFx3Oi1dKyg/Oj0oPzooXCJ8JykoXFxcXD9bXFx3XFxXXSkqP1xcMXxcXHcrKSk/XFxzKikqXFwvPz4vZ2k7XG5cdFByaXNtLmxhbmd1YWdlcy5hc3BuZXQuc3R5bGUuaW5zaWRlLnRhZy5pbnNpZGUgPSBQcmlzbS5sYW5ndWFnZXMuYXNwbmV0LnRhZy5pbnNpZGU7XG59XG5pZiAoIFByaXNtLmxhbmd1YWdlcy5hc3BuZXQuc2NyaXB0ICkge1xuXHRQcmlzbS5sYW5ndWFnZXMuYXNwbmV0LnNjcmlwdC5pbnNpZGUudGFnLnBhdHRlcm4gPSBQcmlzbS5sYW5ndWFnZXMuYXNwbmV0Wydhc3Agc2NyaXB0J10uaW5zaWRlLnRhZy5wYXR0ZXJuXG5cdFByaXNtLmxhbmd1YWdlcy5hc3BuZXQuc2NyaXB0Lmluc2lkZS50YWcuaW5zaWRlID0gUHJpc20ubGFuZ3VhZ2VzLmFzcG5ldC50YWcuaW5zaWRlO1xufVxuUHJpc20ubGFuZ3VhZ2VzLmNzcyA9IHtcblx0J2NvbW1lbnQnOiAvXFwvXFwqW1xcd1xcV10qP1xcKlxcLy9nLFxuXHQnYXRydWxlJzoge1xuXHRcdHBhdHRlcm46IC9AW1xcdy1dKz8uKj8oO3woPz1cXHMqeykpL2dpLFxuXHRcdGluc2lkZToge1xuXHRcdFx0J3B1bmN0dWF0aW9uJzogL1s7Ol0vZ1xuXHRcdH1cblx0fSxcblx0J3VybCc6IC91cmxcXCgoW1wiJ10/KS4qP1xcMVxcKS9naSxcblx0J3NlbGVjdG9yJzogL1teXFx7XFx9XFxzXVteXFx7XFx9O10qKD89XFxzKlxceykvZyxcblx0J3Byb3BlcnR5JzogLyhcXGJ8XFxCKVtcXHctXSsoPz1cXHMqOikvaWcsXG5cdCdzdHJpbmcnOiAvKFwifCcpKFxcXFw/LikqP1xcMS9nLFxuXHQnaW1wb3J0YW50JzogL1xcQiFpbXBvcnRhbnRcXGIvZ2ksXG5cdCdwdW5jdHVhdGlvbic6IC9bXFx7XFx9OzpdL2csXG5cdCdmdW5jdGlvbic6IC9bLWEtejAtOV0rKD89XFwoKS9pZ1xufTtcblxuaWYgKFByaXNtLmxhbmd1YWdlcy5tYXJrdXApIHtcblx0UHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZSgnbWFya3VwJywgJ3RhZycsIHtcblx0XHQnc3R5bGUnOiB7XG5cdFx0XHRwYXR0ZXJuOiAvPHN0eWxlW1xcd1xcV10qPz5bXFx3XFxXXSo/PFxcL3N0eWxlPi9pZyxcblx0XHRcdGluc2lkZToge1xuXHRcdFx0XHQndGFnJzoge1xuXHRcdFx0XHRcdHBhdHRlcm46IC88c3R5bGVbXFx3XFxXXSo/Pnw8XFwvc3R5bGU+L2lnLFxuXHRcdFx0XHRcdGluc2lkZTogUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cC50YWcuaW5zaWRlXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHJlc3Q6IFByaXNtLmxhbmd1YWdlcy5jc3Ncblx0XHRcdH0sXG5cdFx0XHRhbGlhczogJ2xhbmd1YWdlLWNzcydcblx0XHR9XG5cdH0pO1xuXHRcblx0UHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZSgnaW5zaWRlJywgJ2F0dHItdmFsdWUnLCB7XG5cdFx0J3N0eWxlLWF0dHInOiB7XG5cdFx0XHRwYXR0ZXJuOiAvXFxzKnN0eWxlPShcInwnKS4rP1xcMS9pZyxcblx0XHRcdGluc2lkZToge1xuXHRcdFx0XHQnYXR0ci1uYW1lJzoge1xuXHRcdFx0XHRcdHBhdHRlcm46IC9eXFxzKnN0eWxlL2lnLFxuXHRcdFx0XHRcdGluc2lkZTogUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cC50YWcuaW5zaWRlXG5cdFx0XHRcdH0sXG5cdFx0XHRcdCdwdW5jdHVhdGlvbic6IC9eXFxzKj1cXHMqWydcIl18WydcIl1cXHMqJC8sXG5cdFx0XHRcdCdhdHRyLXZhbHVlJzoge1xuXHRcdFx0XHRcdHBhdHRlcm46IC8uKy9naSxcblx0XHRcdFx0XHRpbnNpZGU6IFByaXNtLmxhbmd1YWdlcy5jc3Ncblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGFsaWFzOiAnbGFuZ3VhZ2UtY3NzJ1xuXHRcdH1cblx0fSwgUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cC50YWcpO1xufVxuUHJpc20ubGFuZ3VhZ2VzLmphdmFzY3JpcHQgPSBQcmlzbS5sYW5ndWFnZXMuZXh0ZW5kKCdjbGlrZScsIHtcblx0J2tleXdvcmQnOiAvXFxiKGJyZWFrfGNhc2V8Y2F0Y2h8Y2xhc3N8Y29uc3R8Y29udGludWV8ZGVidWdnZXJ8ZGVmYXVsdHxkZWxldGV8ZG98ZWxzZXxlbnVtfGV4cG9ydHxleHRlbmRzfGZhbHNlfGZpbmFsbHl8Zm9yfGZ1bmN0aW9ufGdldHxpZnxpbXBsZW1lbnRzfGltcG9ydHxpbnxpbnN0YW5jZW9mfGludGVyZmFjZXxsZXR8bmV3fG51bGx8cGFja2FnZXxwcml2YXRlfHByb3RlY3RlZHxwdWJsaWN8cmV0dXJufHNldHxzdGF0aWN8c3VwZXJ8c3dpdGNofHRoaXN8dGhyb3d8dHJ1ZXx0cnl8dHlwZW9mfHZhcnx2b2lkfHdoaWxlfHdpdGh8eWllbGQpXFxiL2csXG5cdCdudW1iZXInOiAvXFxiLT8oMHhbXFxkQS1GYS1mXSt8XFxkKlxcLj9cXGQrKFtFZV0tP1xcZCspP3xOYU58LT9JbmZpbml0eSlcXGIvZ1xufSk7XG5cblByaXNtLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoJ2phdmFzY3JpcHQnLCAna2V5d29yZCcsIHtcblx0J3JlZ2V4Jzoge1xuXHRcdHBhdHRlcm46IC8oXnxbXi9dKVxcLyg/IVxcLykoXFxbLis/XXxcXFxcLnxbXi9cXHJcXG5dKStcXC9bZ2ltXXswLDN9KD89XFxzKigkfFtcXHJcXG4sLjt9KV0pKS9nLFxuXHRcdGxvb2tiZWhpbmQ6IHRydWVcblx0fVxufSk7XG5cbmlmIChQcmlzbS5sYW5ndWFnZXMubWFya3VwKSB7XG5cdFByaXNtLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoJ21hcmt1cCcsICd0YWcnLCB7XG5cdFx0J3NjcmlwdCc6IHtcblx0XHRcdHBhdHRlcm46IC88c2NyaXB0W1xcd1xcV10qPz5bXFx3XFxXXSo/PFxcL3NjcmlwdD4vaWcsXG5cdFx0XHRpbnNpZGU6IHtcblx0XHRcdFx0J3RhZyc6IHtcblx0XHRcdFx0XHRwYXR0ZXJuOiAvPHNjcmlwdFtcXHdcXFddKj8+fDxcXC9zY3JpcHQ+L2lnLFxuXHRcdFx0XHRcdGluc2lkZTogUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cC50YWcuaW5zaWRlXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHJlc3Q6IFByaXNtLmxhbmd1YWdlcy5qYXZhc2NyaXB0XG5cdFx0XHR9LFxuXHRcdFx0YWxpYXM6ICdsYW5ndWFnZS1qYXZhc2NyaXB0J1xuXHRcdH1cblx0fSk7XG59XG5cblByaXNtLmxhbmd1YWdlcy5yaXAgPSB7XG5cdCdjb21tZW50JzogLyNbXlxcclxcbl0qKFxccj9cXG58JCkvZyxcblxuXHQna2V5d29yZCc6IC8oPzo9PnwtPil8XFxiKD86Y2xhc3N8aWZ8ZWxzZXxzd2l0Y2h8Y2FzZXxyZXR1cm58ZXhpdHx0cnl8Y2F0Y2h8ZmluYWxseXxyYWlzZSlcXGIvZyxcblxuXHQnYnVpbHRpbic6IC9cXGIoQHxTeXN0ZW0pXFxiL2csXG5cblx0J2Jvb2xlYW4nOiAvXFxiKHRydWV8ZmFsc2UpXFxiL2csXG5cblx0J2RhdGUnOiAvXFxiXFxkezR9LVxcZHsyfS1cXGR7Mn1cXGIvZyxcblx0J3RpbWUnOiAvXFxiXFxkezJ9OlxcZHsyfTpcXGR7Mn1cXGIvZyxcblx0J2RhdGV0aW1lJzogL1xcYlxcZHs0fS1cXGR7Mn0tXFxkezJ9VFxcZHsyfTpcXGR7Mn06XFxkezJ9XFxiL2csXG5cblx0J251bWJlcic6IC9bKy1dPyg/Oig/OlxcZCtcXC5cXGQrKXwoPzpcXGQrKSkvZyxcblxuXHQnY2hhcmFjdGVyJzogL1xcQmBbXlxcc1xcYFxcJ1wiLC46OyNcXC9cXFxcKCk8PlxcW1xcXXt9XVxcYi9nLFxuXG5cdCdyZWdleCc6IHtcblx0XHRwYXR0ZXJuOiAvKF58W14vXSlcXC8oPyFcXC8pKFxcWy4rP118XFxcXC58W14vXFxyXFxuXSkrXFwvKD89XFxzKigkfFtcXHJcXG4sLjt9KV0pKS9nLFxuXHRcdGxvb2tiZWhpbmQ6IHRydWVcblx0fSxcblxuXHQnc3ltYm9sJzogLzpbXlxcZFxcc1xcYFxcJ1wiLC46OyNcXC9cXFxcKCk8PlxcW1xcXXt9XVteXFxzXFxgXFwnXCIsLjo7I1xcL1xcXFwoKTw+XFxbXFxde31dKi9nLFxuXHQnc3RyaW5nJzogLyhcInwnKShcXFxcPy4pKj9cXDEvZyxcblxuXHQncHVuY3R1YXRpb24nOiAvKD86XFwuezIsM30pfFtcXGAsLjo7PVxcL1xcXFwoKTw+XFxbXFxde31dLyxcblxuXHQncmVmZXJlbmNlJzogL1teXFxkXFxzXFxgXFwnXCIsLjo7I1xcL1xcXFwoKTw+XFxbXFxde31dW15cXHNcXGBcXCdcIiwuOjsjXFwvXFxcXCgpPD5cXFtcXF17fV0qL2dcbn07XG5cbi8vIE5PVEVTIC0gZm9sbG93cyBmaXJzdC1maXJzdCBoaWdobGlnaHQgbWV0aG9kLCBibG9jayBpcyBsb2NrZWQgYWZ0ZXIgaGlnaGxpZ2h0LCBkaWZmZXJlbnQgZnJvbSBTeW50YXhIbFxyXG5QcmlzbS5sYW5ndWFnZXMuYXV0b2hvdGtleT0ge1xyXG5cdCdjb21tZW50Jzoge1xyXG5cdFx0cGF0dGVybjogLyheW15cIjtcXG5dKihcIlteXCJcXG5dKj9cIlteXCJcXG5dKj8pKikoOy4qJHxeXFxzKlxcL1xcKltcXHNcXFNdKlxcblxcKlxcLykvZ20sXHJcblx0XHRsb29rYmVoaW5kOiB0cnVlXHJcblx0fSxcclxuXHQnc3RyaW5nJzogL1wiKChbXlwiXFxuXFxyXXxcIlwiKSopXCIvZ20sXHJcblx0J2Z1bmN0aW9uJzogL1teXFwoXFwpOyBcXHRcXCxcXG5cXCtcXCpcXC1cXD1cXD8+OlxcXFxcXC88XFwmJVxcW1xcXV0rPyg/PVxcKCkvZ20sICAvL2Z1bmN0aW9uIC0gZG9uJ3QgdXNlIC4qXFwpIGluIHRoZSBlbmQgYmNveiBzdHJpbmcgbG9ja3MgaXRcclxuXHQndGFnJzogL15bIFxcdF0qW15cXHM6XSs/KD89OlteOl0pL2dtLCAgLy9sYWJlbHNcclxuXHQndmFyaWFibGUnOiAvXFwlXFx3K1xcJS9nLFxyXG5cdCdudW1iZXInOiAvXFxiLT8oMHhbXFxkQS1GYS1mXSt8XFxkKlxcLj9cXGQrKFtFZV0tP1xcZCspPylcXGIvZyxcclxuXHQnb3BlcmF0b3InOiAvW1xcK1xcLVxcKlxcXFxcXC86PVxcP1xcJlxcfDw+XS9nLFxyXG5cdCdwdW5jdHVhdGlvbic6IC9bXFx7fVtcXF1cXChcXCk6XS9nLFxyXG5cdCdib29sZWFuJzogL1xcYih0cnVlfGZhbHNlKVxcYi9nLFxyXG5cclxuXHQnc2VsZWN0b3InOiAvXFxiKEF1dG9UcmltfEJsb2NrSW5wdXR8QnJlYWt8Q2xpY2t8Q2xpcFdhaXR8Q29udGludWV8Q29udHJvbHxDb250cm9sQ2xpY2t8Q29udHJvbEZvY3VzfENvbnRyb2xHZXR8Q29udHJvbEdldEZvY3VzfENvbnRyb2xHZXRQb3N8Q29udHJvbEdldFRleHR8Q29udHJvbE1vdmV8Q29udHJvbFNlbmR8Q29udHJvbFNlbmRSYXd8Q29udHJvbFNldFRleHR8Q29vcmRNb2RlfENyaXRpY2FsfERldGVjdEhpZGRlblRleHR8RGV0ZWN0SGlkZGVuV2luZG93c3xEcml2ZXxEcml2ZUdldHxEcml2ZVNwYWNlRnJlZXxFbnZBZGR8RW52RGl2fEVudkdldHxFbnZNdWx0fEVudlNldHxFbnZTdWJ8RW52VXBkYXRlfEV4aXR8RXhpdEFwcHxGaWxlQXBwZW5kfEZpbGVDb3B5fEZpbGVDb3B5RGlyfEZpbGVDcmVhdGVEaXJ8RmlsZUNyZWF0ZVNob3J0Y3V0fEZpbGVEZWxldGV8RmlsZUVuY29kaW5nfEZpbGVHZXRBdHRyaWJ8RmlsZUdldFNob3J0Y3V0fEZpbGVHZXRTaXplfEZpbGVHZXRUaW1lfEZpbGVHZXRWZXJzaW9ufEZpbGVJbnN0YWxsfEZpbGVNb3ZlfEZpbGVNb3ZlRGlyfEZpbGVSZWFkfEZpbGVSZWFkTGluZXxGaWxlUmVjeWNsZXxGaWxlUmVjeWNsZUVtcHR5fEZpbGVSZW1vdmVEaXJ8RmlsZVNlbGVjdEZpbGV8RmlsZVNlbGVjdEZvbGRlcnxGaWxlU2V0QXR0cmlifEZpbGVTZXRUaW1lfEZvcm1hdFRpbWV8R2V0S2V5U3RhdGV8R29zdWJ8R290b3xHcm91cEFjdGl2YXRlfEdyb3VwQWRkfEdyb3VwQ2xvc2V8R3JvdXBEZWFjdGl2YXRlfEd1aXxHdWlDb250cm9sfEd1aUNvbnRyb2xHZXR8SG90a2V5fEltYWdlU2VhcmNofEluaURlbGV0ZXxJbmlSZWFkfEluaVdyaXRlfElucHV0fElucHV0Qm94fEtleVdhaXR8TGlzdEhvdGtleXN8TGlzdExpbmVzfExpc3RWYXJzfExvb3B8TWVudXxNb3VzZUNsaWNrfE1vdXNlQ2xpY2tEcmFnfE1vdXNlR2V0UG9zfE1vdXNlTW92ZXxNc2dCb3h8T25FeGl0fE91dHB1dERlYnVnfFBhdXNlfFBpeGVsR2V0Q29sb3J8UGl4ZWxTZWFyY2h8UG9zdE1lc3NhZ2V8UHJvY2Vzc3xQcm9ncmVzc3xSYW5kb218UmVnRGVsZXRlfFJlZ1JlYWR8UmVnV3JpdGV8UmVsb2FkfFJlcGVhdHxSZXR1cm58UnVufFJ1bkFzfFJ1bldhaXR8U2VuZHxTZW5kRXZlbnR8U2VuZElucHV0fFNlbmRNZXNzYWdlfFNlbmRNb2RlfFNlbmRQbGF5fFNlbmRSYXd8U2V0QmF0Y2hMaW5lc3xTZXRDYXBzbG9ja1N0YXRlfFNldENvbnRyb2xEZWxheXxTZXREZWZhdWx0TW91c2VTcGVlZHxTZXRFbnZ8U2V0Rm9ybWF0fFNldEtleURlbGF5fFNldE1vdXNlRGVsYXl8U2V0TnVtbG9ja1N0YXRlfFNldFNjcm9sbExvY2tTdGF0ZXxTZXRTdG9yZUNhcHNsb2NrTW9kZXxTZXRUaW1lcnxTZXRUaXRsZU1hdGNoTW9kZXxTZXRXaW5EZWxheXxTZXRXb3JraW5nRGlyfFNodXRkb3dufFNsZWVwfFNvcnR8U291bmRCZWVwfFNvdW5kR2V0fFNvdW5kR2V0V2F2ZVZvbHVtZXxTb3VuZFBsYXl8U291bmRTZXR8U291bmRTZXRXYXZlVm9sdW1lfFNwbGFzaEltYWdlfFNwbGFzaFRleHRPZmZ8U3BsYXNoVGV4dE9ufFNwbGl0UGF0aHxTdGF0dXNCYXJHZXRUZXh0fFN0YXR1c0JhcldhaXR8U3RyaW5nQ2FzZVNlbnNlfFN0cmluZ0dldFBvc3xTdHJpbmdMZWZ0fFN0cmluZ0xlbnxTdHJpbmdMb3dlcnxTdHJpbmdNaWR8U3RyaW5nUmVwbGFjZXxTdHJpbmdSaWdodHxTdHJpbmdTcGxpdHxTdHJpbmdUcmltTGVmdHxTdHJpbmdUcmltUmlnaHR8U3RyaW5nVXBwZXJ8U3VzcGVuZHxTeXNHZXR8VGhyZWFkfFRvb2xUaXB8VHJhbnNmb3JtfFRyYXlUaXB8VVJMRG93bmxvYWRUb0ZpbGV8V2luQWN0aXZhdGV8V2luQWN0aXZhdGVCb3R0b218V2luQ2xvc2V8V2luR2V0fFdpbkdldEFjdGl2ZVN0YXRzfFdpbkdldEFjdGl2ZVRpdGxlfFdpbkdldENsYXNzfFdpbkdldFBvc3xXaW5HZXRUZXh0fFdpbkdldFRpdGxlfFdpbkhpZGV8V2luS2lsbHxXaW5NYXhpbWl6ZXxXaW5NZW51U2VsZWN0SXRlbXxXaW5NaW5pbWl6ZXxXaW5NaW5pbWl6ZUFsbHxXaW5NaW5pbWl6ZUFsbFVuZG98V2luTW92ZXxXaW5SZXN0b3JlfFdpblNldHxXaW5TZXRUaXRsZXxXaW5TaG93fFdpbldhaXR8V2luV2FpdEFjdGl2ZXxXaW5XYWl0Q2xvc2V8V2luV2FpdE5vdEFjdGl2ZSlcXGIvaSxcclxuXHJcblx0J2NvbnN0YW50JzogL1xcYihhX2Foa3BhdGh8YV9haGt2ZXJzaW9ufGFfYXBwZGF0YXxhX2FwcGRhdGFjb21tb258YV9hdXRvdHJpbXxhX2JhdGNobGluZXN8YV9jYXJldHh8YV9jYXJldHl8YV9jb21wdXRlcm5hbWV8YV9jb250cm9sZGVsYXl8YV9jdXJzb3J8YV9kZHxhX2RkZHxhX2RkZGR8YV9kZWZhdWx0bW91c2VzcGVlZHxhX2Rlc2t0b3B8YV9kZXNrdG9wY29tbW9ufGFfZGV0ZWN0aGlkZGVudGV4dHxhX2RldGVjdGhpZGRlbndpbmRvd3N8YV9lbmRjaGFyfGFfZXZlbnRpbmZvfGFfZXhpdHJlYXNvbnxhX2Zvcm1hdGZsb2F0fGFfZm9ybWF0aW50ZWdlcnxhX2d1aXxhX2d1aWV2ZW50fGFfZ3VpY29udHJvbHxhX2d1aWNvbnRyb2xldmVudHxhX2d1aWhlaWdodHxhX2d1aXdpZHRofGFfZ3VpeHxhX2d1aXl8YV9ob3VyfGFfaWNvbmZpbGV8YV9pY29uaGlkZGVufGFfaWNvbm51bWJlcnxhX2ljb250aXB8YV9pbmRleHxhX2lwYWRkcmVzczF8YV9pcGFkZHJlc3MyfGFfaXBhZGRyZXNzM3xhX2lwYWRkcmVzczR8YV9pc2FkbWlufGFfaXNjb21waWxlZHxhX2lzY3JpdGljYWx8YV9pc3BhdXNlZHxhX2lzc3VzcGVuZGVkfGFfaXN1bmljb2RlfGFfa2V5ZGVsYXl8YV9sYW5ndWFnZXxhX2xhc3RlcnJvcnxhX2xpbmVmaWxlfGFfbGluZW51bWJlcnxhX2xvb3BmaWVsZHxhX2xvb3BmaWxlYXR0cmlifGFfbG9vcGZpbGVkaXJ8YV9sb29wZmlsZWV4dHxhX2xvb3BmaWxlZnVsbHBhdGh8YV9sb29wZmlsZWxvbmdwYXRofGFfbG9vcGZpbGVuYW1lfGFfbG9vcGZpbGVzaG9ydG5hbWV8YV9sb29wZmlsZXNob3J0cGF0aHxhX2xvb3BmaWxlc2l6ZXxhX2xvb3BmaWxlc2l6ZWtifGFfbG9vcGZpbGVzaXplbWJ8YV9sb29wZmlsZXRpbWVhY2Nlc3NlZHxhX2xvb3BmaWxldGltZWNyZWF0ZWR8YV9sb29wZmlsZXRpbWVtb2RpZmllZHxhX2xvb3ByZWFkbGluZXxhX2xvb3ByZWdrZXl8YV9sb29wcmVnbmFtZXxhX2xvb3ByZWdzdWJrZXl8YV9sb29wcmVndGltZW1vZGlmaWVkfGFfbG9vcHJlZ3R5cGV8YV9tZGF5fGFfbWlufGFfbW18YV9tbW18YV9tbW1tfGFfbW9ufGFfbW91c2VkZWxheXxhX21zZWN8YV9teWRvY3VtZW50c3xhX25vd3xhX25vd3V0Y3xhX251bWJhdGNobGluZXN8YV9vc3R5cGV8YV9vc3ZlcnNpb258YV9wcmlvcmhvdGtleXxwcm9ncmFtZmlsZXN8YV9wcm9ncmFtZmlsZXN8YV9wcm9ncmFtc3xhX3Byb2dyYW1zY29tbW9ufGFfc2NyZWVuaGVpZ2h0fGFfc2NyZWVud2lkdGh8YV9zY3JpcHRkaXJ8YV9zY3JpcHRmdWxscGF0aHxhX3NjcmlwdG5hbWV8YV9zZWN8YV9zcGFjZXxhX3N0YXJ0bWVudXxhX3N0YXJ0bWVudWNvbW1vbnxhX3N0YXJ0dXB8YV9zdGFydHVwY29tbW9ufGFfc3RyaW5nY2FzZXNlbnNlfGFfdGFifGFfdGVtcHxhX3RoaXNmdW5jfGFfdGhpc2hvdGtleXxhX3RoaXNsYWJlbHxhX3RoaXNtZW51fGFfdGhpc21lbnVpdGVtfGFfdGhpc21lbnVpdGVtcG9zfGFfdGlja2NvdW50fGFfdGltZWlkbGV8YV90aW1laWRsZXBoeXNpY2FsfGFfdGltZXNpbmNlcHJpb3Job3RrZXl8YV90aW1lc2luY2V0aGlzaG90a2V5fGFfdGl0bGVtYXRjaG1vZGV8YV90aXRsZW1hdGNobW9kZXNwZWVkfGFfdXNlcm5hbWV8YV93ZGF5fGFfd2luZGVsYXl8YV93aW5kaXJ8YV93b3JraW5nZGlyfGFfeWRheXxhX3llYXJ8YV95d2Vla3xhX3l5eXl8Y2xpcGJvYXJkfGNsaXBib2FyZGFsbHxjb21zcGVjfGVycm9ybGV2ZWwpXFxiL2ksXHJcblxyXG5cdCdidWlsdGluJzogL1xcYihhYnN8YWNvc3xhc2N8YXNpbnxhdGFufGNlaWx8Y2hyfGNsYXNzfGNvc3xkbGxjYWxsfGV4cHxmaWxlZXhpc3R8RmlsZW9wZW58Zmxvb3J8Z2V0a2V5c3RhdGV8aWxfYWRkfGlsX2NyZWF0ZXxpbF9kZXN0cm95fGluc3RyfHN1YnN0cnxpc2Z1bmN8aXNsYWJlbHxJc09iamVjdHxsbnxsb2d8bHZfYWRkfGx2X2RlbGV0ZXxsdl9kZWxldGVjb2x8bHZfZ2V0Y291bnR8bHZfZ2V0bmV4dHxsdl9nZXR0ZXh0fGx2X2luc2VydHxsdl9pbnNlcnRjb2x8bHZfbW9kaWZ5fGx2X21vZGlmeWNvbHxsdl9zZXRpbWFnZWxpc3R8bW9kfG9ubWVzc2FnZXxudW1nZXR8bnVtcHV0fHJlZ2lzdGVyY2FsbGJhY2t8cmVnZXhtYXRjaHxyZWdleHJlcGxhY2V8cm91bmR8c2lufHRhbnxzcXJ0fHN0cmxlbnxzYl9zZXRpY29ufHNiX3NldHBhcnRzfHNiX3NldHRleHR8c3Ryc3BsaXR8dHZfYWRkfHR2X2RlbGV0ZXx0dl9nZXRjaGlsZHx0dl9nZXRjb3VudHx0dl9nZXRuZXh0fHR2X2dldHx0dl9nZXRwYXJlbnR8dHZfZ2V0cHJldnx0dl9nZXRzZWxlY3Rpb258dHZfZ2V0dGV4dHx0dl9tb2RpZnl8dmFyc2V0Y2FwYWNpdHl8d2luYWN0aXZlfHdpbmV4aXN0fF9fTmV3fF9fQ2FsbHxfX0dldHxfX1NldClcXGIvaSxcclxuXHJcblx0J3N5bWJvbCc6IC9cXGIoYWx0fGFsdGRvd258YWx0dXB8YXBwc2tleXxiYWNrc3BhY2V8YnJvd3Nlcl9iYWNrfGJyb3dzZXJfZmF2b3JpdGVzfGJyb3dzZXJfZm9yd2FyZHxicm93c2VyX2hvbWV8YnJvd3Nlcl9yZWZyZXNofGJyb3dzZXJfc2VhcmNofGJyb3dzZXJfc3RvcHxic3xjYXBzbG9ja3xjb250cm9sfGN0cmx8Y3RybGJyZWFrfGN0cmxkb3dufGN0cmx1cHxkZWx8ZGVsZXRlfGRvd258ZW5kfGVudGVyfGVzY3xlc2NhcGV8ZjF8ZjEwfGYxMXxmMTJ8ZjEzfGYxNHxmMTV8ZjE2fGYxN3xmMTh8ZjE5fGYyfGYyMHxmMjF8ZjIyfGYyM3xmMjR8ZjN8ZjR8ZjV8ZjZ8Zjd8Zjh8Zjl8aG9tZXxpbnN8aW5zZXJ0fGpveTF8am95MTB8am95MTF8am95MTJ8am95MTN8am95MTR8am95MTV8am95MTZ8am95MTd8am95MTh8am95MTl8am95Mnxqb3kyMHxqb3kyMXxqb3kyMnxqb3kyM3xqb3kyNHxqb3kyNXxqb3kyNnxqb3kyN3xqb3kyOHxqb3kyOXxqb3kzfGpveTMwfGpveTMxfGpveTMyfGpveTR8am95NXxqb3k2fGpveTd8am95OHxqb3k5fGpveWF4ZXN8am95YnV0dG9uc3xqb3lpbmZvfGpveW5hbWV8am95cG92fGpveXJ8am95dXxqb3l2fGpveXh8am95eXxqb3l6fGxhbHR8bGF1bmNoX2FwcDF8bGF1bmNoX2FwcDJ8bGF1bmNoX21haWx8bGF1bmNoX21lZGlhfGxidXR0b258bGNvbnRyb2x8bGN0cmx8bGVmdHxsc2hpZnR8bHdpbnxsd2luZG93bnxsd2ludXB8bWJ1dHRvbnxtZWRpYV9uZXh0fG1lZGlhX3BsYXlfcGF1c2V8bWVkaWFfcHJldnxtZWRpYV9zdG9wfG51bWxvY2t8bnVtcGFkMHxudW1wYWQxfG51bXBhZDJ8bnVtcGFkM3xudW1wYWQ0fG51bXBhZDV8bnVtcGFkNnxudW1wYWQ3fG51bXBhZDh8bnVtcGFkOXxudW1wYWRhZGR8bnVtcGFkY2xlYXJ8bnVtcGFkZGVsfG51bXBhZGRpdnxudW1wYWRkb3R8bnVtcGFkZG93bnxudW1wYWRlbmR8bnVtcGFkZW50ZXJ8bnVtcGFkaG9tZXxudW1wYWRpbnN8bnVtcGFkbGVmdHxudW1wYWRtdWx0fG51bXBhZHBnZG58bnVtcGFkcGd1cHxudW1wYWRyaWdodHxudW1wYWRzdWJ8bnVtcGFkdXB8cGF1c2V8cGdkbnxwZ3VwfHByaW50c2NyZWVufHJhbHR8cmJ1dHRvbnxyY29udHJvbHxyY3RybHxyaWdodHxyc2hpZnR8cndpbnxyd2luZG93bnxyd2ludXB8c2Nyb2xsbG9ja3xzaGlmdHxzaGlmdGRvd258c2hpZnR1cHxzcGFjZXx0YWJ8dXB8dm9sdW1lX2Rvd258dm9sdW1lX211dGV8dm9sdW1lX3VwfHdoZWVsZG93bnx3aGVlbGxlZnR8d2hlZWxyaWdodHx3aGVlbHVwfHhidXR0b24xfHhidXR0b24yKVxcYi9pLFxyXG5cclxuXHQnaW1wb3J0YW50JzogLyNcXGIoQWxsb3dTYW1lTGluZUNvbW1lbnRzfENsaXBib2FyZFRpbWVvdXR8Q29tbWVudEZsYWd8RXJyb3JTdGRPdXR8RXNjYXBlQ2hhcnxIb3RrZXlJbnRlcnZhbHxIb3RrZXlNb2RpZmllclRpbWVvdXR8SG90c3RyaW5nfElmV2luQWN0aXZlfElmV2luRXhpc3R8SWZXaW5Ob3RBY3RpdmV8SWZXaW5Ob3RFeGlzdHxJbmNsdWRlfEluY2x1ZGVBZ2FpbnxJbnN0YWxsS2V5YmRIb29rfEluc3RhbGxNb3VzZUhvb2t8S2V5SGlzdG9yeXxMVHJpbXxNYXhIb3RrZXlzUGVySW50ZXJ2YWx8TWF4TWVtfE1heFRocmVhZHN8TWF4VGhyZWFkc0J1ZmZlcnxNYXhUaHJlYWRzUGVySG90a2V5fE5vRW52fE5vVHJheUljb258UGVyc2lzdGVudHxTaW5nbGVJbnN0YW5jZXxVc2VIb29rfFdpbkFjdGl2YXRlRm9yY2UpXFxiL2ksXHJcblxyXG5cdCdrZXl3b3JkJzogL1xcYihBYm9ydHxBYm92ZU5vcm1hbHxBZGR8YWhrX2NsYXNzfGFoa19ncm91cHxhaGtfaWR8YWhrX3BpZHxBbGx8QWxudW18QWxwaGF8QWx0U3VibWl0fEFsdFRhYnxBbHRUYWJBbmRNZW51fEFsdFRhYk1lbnV8QWx0VGFiTWVudURpc21pc3N8QWx3YXlzT25Ub3B8QXV0b1NpemV8QmFja2dyb3VuZHxCYWNrZ3JvdW5kVHJhbnN8QmVsb3dOb3JtYWx8YmV0d2VlbnxCaXRBbmR8Qml0Tm90fEJpdE9yfEJpdFNoaWZ0TGVmdHxCaXRTaGlmdFJpZ2h0fEJpdFhPcnxCb2xkfEJvcmRlcnxCdXR0b258QnlSZWZ8Q2hlY2tib3h8Q2hlY2tlZHxDaGVja2VkR3JheXxDaG9vc2V8Q2hvb3NlU3RyaW5nfENsaWNrfENsb3NlfENvbG9yfENvbWJvQm94fENvbnRhaW5zfENvbnRyb2xMaXN0fENvdW50fERhdGV8RGF0ZVRpbWV8RGF5c3xEREx8RGVmYXVsdHxEZWxldGV8RGVsZXRlQWxsfERlbGltaXRlcnxEZXJlZnxEZXN0cm95fERpZ2l0fERpc2FibGV8RGlzYWJsZWR8RHJvcERvd25MaXN0fEVkaXR8RWplY3R8RWxzZXxFbmFibGV8RW5hYmxlZHxFcnJvcnxFeGlzdHxFeHB8RXhwYW5kfEV4U3R5bGV8RmlsZVN5c3RlbXxGaXJzdHxGbGFzaHxGbG9hdHxGbG9hdEZhc3R8Rm9jdXN8Rm9udHxmb3J8Z2xvYmFsfEdyaWR8R3JvdXB8R3JvdXBCb3h8R3VpQ2xvc2V8R3VpQ29udGV4dE1lbnV8R3VpRHJvcEZpbGVzfEd1aUVzY2FwZXxHdWlTaXplfEhkcnxIaWRkZW58SGlkZXxIaWdofEhLQ0N8SEtDUnxIS0NVfEhLRVlfQ0xBU1NFU19ST09UfEhLRVlfQ1VSUkVOVF9DT05GSUd8SEtFWV9DVVJSRU5UX1VTRVJ8SEtFWV9MT0NBTF9NQUNISU5FfEhLRVlfVVNFUlN8SEtMTXxIS1V8SG91cnN8SFNjcm9sbHxJY29ufEljb25TbWFsbHxJRHxJRExhc3R8SWZ8SWZFcXVhbHxJZkV4aXN0fElmR3JlYXRlcnxJZkdyZWF0ZXJPckVxdWFsfElmSW5TdHJpbmd8SWZMZXNzfElmTGVzc09yRXF1YWx8SWZNc2dCb3h8SWZOb3RFcXVhbHxJZk5vdEV4aXN0fElmTm90SW5TdHJpbmd8SWZXaW5BY3RpdmV8SWZXaW5FeGlzdHxJZldpbk5vdEFjdGl2ZXxJZldpbk5vdEV4aXN0fElnbm9yZXxJbWFnZUxpc3R8aW58SW50ZWdlcnxJbnRlZ2VyRmFzdHxJbnRlcnJ1cHR8aXN8aXRhbGljfEpvaW58TGFiZWx8TGFzdEZvdW5kfExhc3RGb3VuZEV4aXN0fExpbWl0fExpbmVzfExpc3R8TGlzdEJveHxMaXN0Vmlld3xMbnxsb2NhbHxMb2NrfExvZ29mZnxMb3d8TG93ZXJ8TG93ZXJjYXNlfE1haW5XaW5kb3d8TWFyZ2lufE1heGltaXplfE1heGltaXplQm94fE1heFNpemV8TWluaW1pemV8TWluaW1pemVCb3h8TWluTWF4fE1pblNpemV8TWludXRlc3xNb250aENhbHxNb3VzZXxNb3ZlfE11bHRpfE5BfE5vfE5vQWN0aXZhdGV8Tm9EZWZhdWx0fE5vSGlkZXxOb0ljb258Tm9NYWluV2luZG93fG5vcm18Tm9ybWFsfE5vU29ydHxOb1NvcnRIZHJ8Tm9TdGFuZGFyZHxOb3R8Tm9UYWJ8Tm9UaW1lcnN8TnVtYmVyfE9mZnxPa3xPbnxPd25EaWFsb2dzfE93bmVyfFBhcnNlfFBhc3N3b3JkfFBpY3R1cmV8UGl4ZWx8UG9zfFBvd3xQcmlvcml0eXxQcm9jZXNzTmFtZXxSYWRpb3xSYW5nZXxSZWFkfFJlYWRPbmx5fFJlYWx0aW1lfFJlZHJhd3xSRUdfQklOQVJZfFJFR19EV09SRHxSRUdfRVhQQU5EX1NafFJFR19NVUxUSV9TWnxSRUdfU1p8UmVnaW9ufFJlbGF0aXZlfFJlbmFtZXxSZXBvcnR8UmVzaXplfFJlc3RvcmV8UmV0cnl8UkdCfFJpZ2h0fFNjcmVlbnxTZWNvbmRzfFNlY3Rpb258U2VyaWFsfFNldExhYmVsfFNoaWZ0QWx0VGFifFNob3d8U2luZ2xlfFNsaWRlcnxTb3J0RGVzY3xTdGFuZGFyZHxzdGF0aWN8U3RhdHVzfFN0YXR1c0JhcnxTdGF0dXNDRHxzdHJpa2V8U3R5bGV8U3VibWl0fFN5c01lbnV8VGFifFRhYjJ8VGFiU3RvcHxUZXh0fFRoZW1lfFRpbGV8VG9nZ2xlQ2hlY2t8VG9nZ2xlRW5hYmxlfFRvb2xXaW5kb3d8VG9wfFRvcG1vc3R8VHJhbnNDb2xvcnxUcmFuc3BhcmVudHxUcmF5fFRyZWVWaWV3fFRyeUFnYWlufFR5cGV8VW5DaGVja3x1bmRlcmxpbmV8VW5pY29kZXxVbmxvY2t8VXBEb3dufFVwcGVyfFVwcGVyY2FzZXxVc2VFcnJvckxldmVsfFZpc3xWaXNGaXJzdHxWaXNpYmxlfFZTY3JvbGx8V2FpdHxXYWl0Q2xvc2V8V2FudEN0cmxBfFdhbnRGMnxXYW50UmV0dXJufFdoaWxlfFdyYXB8WGRpZ2l0fHhtfHhwfHhzfFllc3x5bXx5cHx5cylcXGIvaVxyXG59O1xuLy8gVE9ETzpcbi8vIFx0XHQtIFN1cHBvcnQgZm9yIG91dGxpbmUgcGFyYW1ldGVyc1xuLy8gXHRcdC0gU3VwcG9ydCBmb3IgdGFibGVzXG5cblByaXNtLmxhbmd1YWdlcy5naGVya2luID0ge1xuXHQnY29tbWVudCc6IHtcblx0XHRwYXR0ZXJuOiAvKF58W15cXFxcXSkoXFwvXFwqW1xcd1xcV10qP1xcKlxcL3woKCMpfChcXC9cXC8pKS4qPyhcXHI/XFxufCQpKS9nLFxuXHRcdGxvb2tiZWhpbmQ6IHRydWVcblx0fSxcblx0J3N0cmluZyc6IC8oXCJ8JykoXFxcXD8uKSo/XFwxL2csXG5cdCdhdHJ1bGUnOiAvXFxiKEFuZHxHaXZlbnxXaGVufFRoZW58SW4gb3JkZXIgdG98QXMgYW58SSB3YW50IHRvfEFzIGEpXFxiL2csXG5cdCdrZXl3b3JkJzogL1xcYihTY2VuYXJpbyBPdXRsaW5lfFNjZW5hcmlvfEZlYXR1cmV8QmFja2dyb3VuZHxTdG9yeSlcXGIvZyxcbn07XG5cblByaXNtLmxhbmd1YWdlcy5sYXRleCA9IHtcblx0J2NvbW1lbnQnOiAvJS4qPyhcXHI/XFxufCQpJC9tLFxuXHQnc3RyaW5nJzogLyhcXCQpKFxcXFw/LikqP1xcMS9nLFxuXHQncHVuY3R1YXRpb24nOiAvW3t9XS9nLFxuXHQnc2VsZWN0b3InOiAvXFxcXFthLXo7LDpcXC5dKi9pXG59XG4vKipcbiAqIE9yaWdpbmFsIGJ5IFNhbXVlbCBGbG9yZXNcbiAqXG4gKiBBZGRzIHRoZSBmb2xsb3dpbmcgbmV3IHRva2VuIGNsYXNzZXM6XG4gKiBcdFx0Y29uc3RhbnQsIGJ1aWx0aW4sIHZhcmlhYmxlLCBzeW1ib2wsIHJlZ2V4XG4gKi9cblByaXNtLmxhbmd1YWdlcy5ydWJ5ID0gUHJpc20ubGFuZ3VhZ2VzLmV4dGVuZCgnY2xpa2UnLCB7XG5cdCdjb21tZW50JzogLyNbXlxcclxcbl0qKFxccj9cXG58JCkvZyxcblx0J2tleXdvcmQnOiAvXFxiKGFsaWFzfGFuZHxCRUdJTnxiZWdpbnxicmVha3xjYXNlfGNsYXNzfGRlZnxkZWZpbmVfbWV0aG9kfGRlZmluZWR8ZG98ZWFjaHxlbHNlfGVsc2lmfEVORHxlbmR8ZW5zdXJlfGZhbHNlfGZvcnxpZnxpbnxtb2R1bGV8bmV3fG5leHR8bmlsfG5vdHxvcnxyYWlzZXxyZWRvfHJlcXVpcmV8cmVzY3VlfHJldHJ5fHJldHVybnxzZWxmfHN1cGVyfHRoZW58dGhyb3d8dHJ1ZXx1bmRlZnx1bmxlc3N8dW50aWx8d2hlbnx3aGlsZXx5aWVsZClcXGIvZyxcblx0J2J1aWx0aW4nOiAvXFxiKEFycmF5fEJpZ251bXxCaW5kaW5nfENsYXNzfENvbnRpbnVhdGlvbnxEaXJ8RXhjZXB0aW9ufEZhbHNlQ2xhc3N8RmlsZXxTdGF0fEZpbGV8Rml4bnVtfEZsb2FkfEhhc2h8SW50ZWdlcnxJT3xNYXRjaERhdGF8TWV0aG9kfE1vZHVsZXxOaWxDbGFzc3xOdW1lcmljfE9iamVjdHxQcm9jfFJhbmdlfFJlZ2V4cHxTdHJpbmd8U3RydWN0fFRNU3xTeW1ib2x8VGhyZWFkR3JvdXB8VGhyZWFkfFRpbWV8VHJ1ZUNsYXNzKVxcYi8sXG5cdCdjb25zdGFudCc6IC9cXGJbQS1aXVthLXpBLVpfMC05XSpbPyFdP1xcYi9nXG59KTtcblxuUHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZSgncnVieScsICdrZXl3b3JkJywge1xuXHQncmVnZXgnOiB7XG5cdFx0cGF0dGVybjogLyhefFteL10pXFwvKD8hXFwvKShcXFsuKz9dfFxcXFwufFteL1xcclxcbl0pK1xcL1tnaW1dezAsM30oPz1cXHMqKCR8W1xcclxcbiwuO30pXSkpL2csXG5cdFx0bG9va2JlaGluZDogdHJ1ZVxuXHR9LFxuXHQndmFyaWFibGUnOiAvW0AkXStcXGJbYS16QS1aX11bYS16QS1aXzAtOV0qWz8hXT9cXGIvZyxcblx0J3N5bWJvbCc6IC86XFxiW2EtekEtWl9dW2EtekEtWl8wLTldKls/IV0/XFxiL2dcbn0pO1xuXG5QcmlzbS5sYW5ndWFnZXMuYmFzaCA9IFByaXNtLmxhbmd1YWdlcy5leHRlbmQoJ2NsaWtlJywge1xuXHQnY29tbWVudCc6IHtcblx0XHRwYXR0ZXJuOiAvKF58W15cIntcXFxcXSkoIy4qPyhcXHI/XFxufCQpKS9nLFxuXHRcdGxvb2tiZWhpbmQ6IHRydWVcblx0fSxcblx0J3N0cmluZyc6IHtcblx0XHQvL2FsbG93IG11bHRpbGluZSBzdHJpbmdcblx0XHRwYXR0ZXJuOiAvKFwifCcpKFxcXFw/W1xcc1xcU10pKj9cXDEvZyxcblx0XHRpbnNpZGU6IHtcblx0XHRcdC8vJ3Byb3BlcnR5JyBjbGFzcyByZXVzZWQgZm9yIGJhc2ggdmFyaWFibGVzXG5cdFx0XHQncHJvcGVydHknOiAvXFwkKFthLXpBLVowLTlfI1xcP1xcLVxcKiFAXSt8XFx7W15cXH1dK1xcfSkvZ1xuXHRcdH1cblx0fSxcblx0J2tleXdvcmQnOiAvXFxiKGlmfHRoZW58ZWxzZXxlbGlmfGZpfGZvcnxicmVha3xjb250aW51ZXx3aGlsZXxpbnxjYXNlfGZ1bmN0aW9ufHNlbGVjdHxkb3xkb25lfHVudGlsfGVjaG98ZXhpdHxyZXR1cm58c2V0fGRlY2xhcmUpXFxiL2dcbn0pO1xuXG5QcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKCdiYXNoJywgJ2tleXdvcmQnLCB7XG5cdC8vJ3Byb3BlcnR5JyBjbGFzcyByZXVzZWQgZm9yIGJhc2ggdmFyaWFibGVzXG5cdCdwcm9wZXJ0eSc6IC9cXCQoW2EtekEtWjAtOV8jXFw/XFwtXFwqIUBdK3xcXHtbXn1dK1xcfSkvZ1xufSk7XG5QcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKCdiYXNoJywgJ2NvbW1lbnQnLCB7XG5cdC8vc2hlYmFuZyBtdXN0IGJlIGJlZm9yZSBjb21tZW50LCAnaW1wb3J0YW50JyBjbGFzcyBmcm9tIGNzcyByZXVzZWRcblx0J2ltcG9ydGFudCc6IC8oXiMhXFxzKlxcL2JpblxcL2Jhc2gpfCheIyFcXHMqXFwvYmluXFwvc2gpL2dcbn0pO1xuXG5QcmlzbS5sYW5ndWFnZXMuZ2l0ID0ge1xuXHQvKlxuXHQgKiBBIHNpbXBsZSBvbmUgbGluZSBjb21tZW50IGxpa2UgaW4gYSBnaXQgc3RhdHVzIGNvbW1hbmRcblx0ICogRm9yIGluc3RhbmNlOlxuXHQgKiAkIGdpdCBzdGF0dXNcblx0ICogIyBPbiBicmFuY2ggaW5maW5pdGUtc2Nyb2xsXG5cdCAqICMgWW91ciBicmFuY2ggYW5kICdvcmlnaW4vc2hhcmVkQnJhbmNoZXMvZnJvbnRlbmRUZWFtL2luZmluaXRlLXNjcm9sbCcgaGF2ZSBkaXZlcmdlZCxcblx0ICogIyBhbmQgaGF2ZSAxIGFuZCAyIGRpZmZlcmVudCBjb21taXRzIGVhY2gsIHJlc3BlY3RpdmVseS5cblx0ICogbm90aGluZyB0byBjb21taXQgKHdvcmtpbmcgZGlyZWN0b3J5IGNsZWFuKVxuXHQgKi9cblx0J2NvbW1lbnQnOiAvXiMuKiQvbSxcblxuXHQvKlxuXHQgKiBhIHN0cmluZyAoZG91YmxlIGFuZCBzaW1wbGUgcXVvdGUpXG5cdCAqL1xuXHQnc3RyaW5nJzogLyhcInwnKShcXFxcPy4pKj9cXDEvZ20sXG5cblx0Lypcblx0ICogYSBnaXQgY29tbWFuZC4gSXQgc3RhcnRzIHdpdGggYSByYW5kb20gcHJvbXB0IGZpbmlzaGluZyBieSBhICQsIHRoZW4gXCJnaXRcIiB0aGVuIHNvbWUgb3RoZXIgcGFyYW1ldGVyc1xuXHQgKiBGb3IgaW5zdGFuY2U6XG5cdCAqICQgZ2l0IGFkZCBmaWxlLnR4dFxuXHQgKi9cblx0J2NvbW1hbmQnOiB7XG5cdFx0cGF0dGVybjogL14uKlxcJCBnaXQgLiokL20sXG5cdFx0aW5zaWRlOiB7XG5cdFx0XHQvKlxuXHRcdFx0ICogQSBnaXQgY29tbWFuZCBjYW4gY29udGFpbiBhIHBhcmFtZXRlciBzdGFydGluZyBieSBhIHNpbmdsZSBvciBhIGRvdWJsZSBkYXNoIGZvbGxvd2VkIGJ5IGEgc3RyaW5nXG5cdFx0XHQgKiBGb3IgaW5zdGFuY2U6XG5cdFx0XHQgKiAkIGdpdCBkaWZmIC0tY2FjaGVkXG5cdFx0XHQgKiAkIGdpdCBsb2cgLXBcblx0XHRcdCAqL1xuXHRcdFx0J3BhcmFtZXRlcic6IC9cXHMoLS18LSlcXHcrL21cblx0XHR9XG5cdH0sXG5cblx0Lypcblx0ICogQ29vcmRpbmF0ZXMgZGlzcGxheWVkIGluIGEgZ2l0IGRpZmYgY29tbWFuZFxuXHQgKiBGb3IgaW5zdGFuY2U6XG5cdCAqICQgZ2l0IGRpZmZcblx0ICogZGlmZiAtLWdpdCBmaWxlLnR4dCBmaWxlLnR4dFxuXHQgKiBpbmRleCA2MjE0OTUzLi4xZDU0YTUyIDEwMDY0NFxuXHQgKiAtLS0gZmlsZS50eHRcblx0ICogKysrIGZpbGUudHh0XG5cdCAqIEBAIC0xICsxLDIgQEBcblx0ICogLUhlcmUncyBteSB0ZXR4IGZpbGVcblx0ICogK0hlcmUncyBteSB0ZXh0IGZpbGVcblx0ICogK0FuZCB0aGlzIGlzIHRoZSBzZWNvbmQgbGluZVxuXHQgKi9cblx0J2Nvb3JkJzogL15AQC4qQEAkL20sXG5cblx0Lypcblx0ICogUmVnZXhwIHRvIG1hdGNoIHRoZSBjaGFuZ2VkIGxpbmVzIGluIGEgZ2l0IGRpZmYgb3V0cHV0LiBDaGVjayB0aGUgZXhhbXBsZSBhYm92ZS5cblx0ICovXG5cdCdkZWxldGVkJzogL14tKD8hLSkuKyQvbSxcblx0J2luc2VydGVkJzogL15cXCsoPyFcXCspLiskL20sXG5cblx0Lypcblx0ICogTWF0Y2ggYSBcImNvbW1pdCBbU0hBMV1cIiBsaW5lIGluIGEgZ2l0IGxvZyBvdXRwdXQuXG5cdCAqIEZvciBpbnN0YW5jZTpcblx0ICogJCBnaXQgbG9nXG5cdCAqIGNvbW1pdCBhMTFhMTRlZjdlMjZmMmNhNjJkNGIzNWVhYzQ1NWNlNjM2ZDBkYzA5XG5cdCAqIEF1dGhvcjogbGdpcmF1ZGVsXG5cdCAqIERhdGU6ICAgTW9uIEZlYiAxNyAxMToxODozNCAyMDE0ICswMTAwXG5cdCAqXG5cdCAqICAgICBBZGQgb2YgYSBuZXcgbGluZVxuXHQgKi9cblx0J2NvbW1pdF9zaGExJzogL15jb21taXQgXFx3ezQwfSQvbVxufTtcblxuUHJpc20ubGFuZ3VhZ2VzLnNjYWxhID0gUHJpc20ubGFuZ3VhZ2VzLmV4dGVuZCgnamF2YScsIHtcblx0J2tleXdvcmQnOiAvKDwtfD0+KXxcXGIoYWJzdHJhY3R8Y2FzZXxjYXRjaHxjbGFzc3xkZWZ8ZG98ZWxzZXxleHRlbmRzfGZpbmFsfGZpbmFsbHl8Zm9yfGZvclNvbWV8aWZ8aW1wbGljaXR8aW1wb3J0fGxhenl8bWF0Y2h8bmV3fG51bGx8b2JqZWN0fG92ZXJyaWRlfHBhY2thZ2V8cHJpdmF0ZXxwcm90ZWN0ZWR8cmV0dXJufHNlYWxlZHxzZWxmfHN1cGVyfHRoaXN8dGhyb3d8dHJhaXR8dHJ5fHR5cGV8dmFsfHZhcnx3aGlsZXx3aXRofHlpZWxkKVxcYi9nLFxuXHQnYnVpbHRpbic6IC9cXGIoU3RyaW5nfEludHxMb25nfFNob3J0fEJ5dGV8Qm9vbGVhbnxEb3VibGV8RmxvYXR8Q2hhcnxBbnl8QW55UmVmfEFueVZhbHxVbml0fE5vdGhpbmcpXFxiL2csXG5cdCdudW1iZXInOiAvXFxiMHhbXFxkYS1mXSpcXC4/W1xcZGEtZlxcLV0rXFxifFxcYlxcZCpcXC4/XFxkK1tlXT9bXFxkXSpbZGZsXT9cXGIvZ2ksXG5cdCdzeW1ib2wnOiAvJyhbXlxcZFxcc11cXHcqKS9nLFxuXHQnc3RyaW5nJzogLyhcIlwiXCIpW1xcV1xcd10qP1xcMXwoXCJ8XFwvKVtcXFdcXHddKj9cXDJ8KCcuJykvZ1xufSk7XG5kZWxldGUgUHJpc20ubGFuZ3VhZ2VzLnNjYWxhWydjbGFzcy1uYW1lJywnZnVuY3Rpb24nXTtcblxuUHJpc20ubGFuZ3VhZ2VzLmMgPSBQcmlzbS5sYW5ndWFnZXMuZXh0ZW5kKCdjbGlrZScsIHtcblx0Ly8gYWxsb3cgZm9yIGMgbXVsdGlsaW5lIHN0cmluZ3Ncblx0J3N0cmluZyc6IC8oXCJ8JykoW15cXG5cXFxcXFwxXXxcXFxcLnxcXFxcXFxyKlxcbikqP1xcMS9nLFxuXHQna2V5d29yZCc6IC9cXGIoYXNtfHR5cGVvZnxpbmxpbmV8YXV0b3xicmVha3xjYXNlfGNoYXJ8Y29uc3R8Y29udGludWV8ZGVmYXVsdHxkb3xkb3VibGV8ZWxzZXxlbnVtfGV4dGVybnxmbG9hdHxmb3J8Z290b3xpZnxpbnR8bG9uZ3xyZWdpc3RlcnxyZXR1cm58c2hvcnR8c2lnbmVkfHNpemVvZnxzdGF0aWN8c3RydWN0fHN3aXRjaHx0eXBlZGVmfHVuaW9ufHVuc2lnbmVkfHZvaWR8dm9sYXRpbGV8d2hpbGUpXFxiL2csXG5cdCdvcGVyYXRvcic6IC9bLStdezEsMn18IT0/fDx7MSwyfT0/fD57MSwyfT0/fFxcLT58PXsxLDJ9fFxcXnx+fCV8JnsxLDJ9fFxcfD9cXHx8XFw/fFxcKnxcXC8vZ1xufSk7XG5cblByaXNtLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoJ2MnLCAnc3RyaW5nJywge1xuXHQvLyBwcm9wZXJ0eSBjbGFzcyByZXVzZWQgZm9yIG1hY3JvIHN0YXRlbWVudHNcblx0J3Byb3BlcnR5Jzoge1xuXHRcdC8vIGFsbG93IGZvciBtdWx0aWxpbmUgbWFjcm8gZGVmaW5pdGlvbnNcblx0XHQvLyBzcGFjZXMgYWZ0ZXIgdGhlICMgY2hhcmFjdGVyIGNvbXBpbGUgZmluZSB3aXRoIGdjY1xuXHRcdHBhdHRlcm46IC8oKF58XFxuKVxccyopI1xccypbYS16XSsoW15cXG5cXFxcXXxcXFxcLnxcXFxcXFxyKlxcbikqL2dpLFxuXHRcdGxvb2tiZWhpbmQ6IHRydWUsXG5cdFx0aW5zaWRlOiB7XG5cdFx0XHQvLyBoaWdobGlnaHQgdGhlIHBhdGggb2YgdGhlIGluY2x1ZGUgc3RhdGVtZW50IGFzIGEgc3RyaW5nXG5cdFx0XHQnc3RyaW5nJzoge1xuXHRcdFx0XHRwYXR0ZXJuOiAvKCNcXHMqaW5jbHVkZVxccyopKDwuKz8+fChcInwnKShcXFxcPy4pKz9cXDMpL2csXG5cdFx0XHRcdGxvb2tiZWhpbmQ6IHRydWUsXG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59KTtcblxuZGVsZXRlIFByaXNtLmxhbmd1YWdlcy5jWydjbGFzcy1uYW1lJ107XG5kZWxldGUgUHJpc20ubGFuZ3VhZ2VzLmNbJ2Jvb2xlYW4nXTtcblByaXNtLmxhbmd1YWdlcy5nbyA9IFByaXNtLmxhbmd1YWdlcy5leHRlbmQoJ2NsaWtlJywge1xuXHQna2V5d29yZCc6IC9cXGIoYnJlYWt8Y2FzZXxjaGFufGNvbnN0fGNvbnRpbnVlfGRlZmF1bHR8ZGVmZXJ8ZWxzZXxmYWxsdGhyb3VnaHxmb3J8ZnVuY3xnbyh0byk/fGlmfGltcG9ydHxpbnRlcmZhY2V8bWFwfHBhY2thZ2V8cmFuZ2V8cmV0dXJufHNlbGVjdHxzdHJ1Y3R8c3dpdGNofHR5cGV8dmFyKVxcYi9nLFxuXHQnYnVpbHRpbic6IC9cXGIoYm9vbHxieXRlfGNvbXBsZXgoNjR8MTI4KXxlcnJvcnxmbG9hdCgzMnw2NCl8cnVuZXxzdHJpbmd8dT9pbnQoOHwxNnwzMnw2NHwpfHVpbnRwdHJ8YXBwZW5kfGNhcHxjbG9zZXxjb21wbGV4fGNvcHl8ZGVsZXRlfGltYWd8bGVufG1ha2V8bmV3fHBhbmljfHByaW50KGxuKT98cmVhbHxyZWNvdmVyKVxcYi9nLFxuXHQnYm9vbGVhbic6IC9cXGIoX3xpb3RhfG5pbHx0cnVlfGZhbHNlKVxcYi9nLFxuXHQnb3BlcmF0b3InOiAvKFsoKXt9XFxbXFxdXXxbKlxcLyVeIV09P3xcXCtbPStdP3wtWz49LV0/fFxcfFs9fF0/fD5bPT5dP3w8KDx8Wz0tXSk/fD09P3wmKCZ8PXxePT8pP3xcXC4oXFwuXFwuKT98Wyw7XXw6PT8pL2csXG5cdCdudW1iZXInOiAvXFxiKC0/KDB4W2EtZlxcZF0rfChcXGQrXFwuP1xcZCp8XFwuXFxkKykoZVstK10/XFxkKyk/KWk/KVxcYi9pZyxcblx0J3N0cmluZyc6IC8oXCJ8J3xgKShcXFxcPy58XFxyfFxcbikqP1xcMS9nXG59KTtcbmRlbGV0ZSBQcmlzbS5sYW5ndWFnZXMuZ29bJ2NsYXNzLW5hbWUnXTtcblxuUHJpc20ubGFuZ3VhZ2VzLm5hc20gPSB7XG4gICAgJ2NvbW1lbnQnOiAvOy4qJC9tLFxuICAgICdzdHJpbmcnOiAvKFwifCd8YCkoXFxcXD8uKSo/XFwxL2dtLFxuICAgICdsYWJlbCc6IHtcbiAgICAgICAgcGF0dGVybjogL15cXHMqW0EtWmEtelxcLl9cXD9cXCRdW1xcd1xcLlxcP1xcJEB+I10qOi9tLFxuICAgICAgICBhbGlhczogJ2Z1bmN0aW9uJ1xuICAgIH0sXG4gICAgJ2tleXdvcmQnOiBbXG4gICAgICAgIC9cXFs/QklUUyAoMTZ8MzJ8NjQpXFxdPy9tLFxuICAgICAgICAvXlxccypzZWN0aW9uXFxzKlthLXpBLVpcXC5dKzo/L2ltLFxuICAgICAgICAvKD86ZXh0ZXJufGdsb2JhbClbXjtdKi9pbSxcbiAgICAgICAgLyg/OkNQVXxGTE9BVHxERUZBVUxUKS4qJC9tLFxuICAgIF0sXG4gICAgJ3JlZ2lzdGVyJzoge1xuICAgICAgICBwYXR0ZXJuOiAvXFxiKD86c3RcXGR8W3h5el1tbVxcZFxcZD98W2NkdF1yXFxkfHJcXGRcXGQ/W2J3ZF0/fFtlcl0/W2FiY2RdeHxbYWJjZF1baGxdfFtlcl0/KGJwfHNwfHNpfGRpKXxbY2RlZmdzXXMpXFxiL2dpLCBcbiAgICAgICAgYWxpYXM6ICd2YXJpYWJsZSdcbiAgICB9LFxuICAgICdudW1iZXInOiAvKFxcYnwtfCg/PVxcJCkpKDBbaEh4WF1bXFxkQS1GYS1mXSpcXC4/W1xcZEEtRmEtZl0rKFtwUF1bKy1dP1xcZCspP3xcXGRbXFxkQS1GYS1mXStbaEh4WF18XFwkXFxkW1xcZEEtRmEtZl0qfDBbb09xUV1bMC03XSt8WzAtN10rW29PcVFdfDBbYkJ5WV1bMDFdK3xbMDFdK1tiQnlZXXwwW2REdFRdXFxkK3xcXGQrW2REdFRdP3xcXGQqXFwuP1xcZCsoW0VlXVsrLV0/XFxkKyk/KVxcYi9nLFxuICAgICdvcGVyYXRvcic6IC9bXFxbXFxdXFwqK1xcLVxcLyU8Pj0mfFxcJCFdL2dtXG59O1xuXG5QcmlzbS5sYW5ndWFnZXMuc2NoZW1lID0ge1xuICAgICdib29sZWFuJyA6IC8jKHR8Zil7MX0vLFxuICAgICdjb21tZW50JyA6IC87LiovLFxuICAgICdrZXl3b3JkJyA6IHtcblx0cGF0dGVybiA6IC8oWyhdKShkZWZpbmUoLXN5bnRheHwtbGlicmFyeXwtdmFsdWVzKT98KGNhc2UtKT9sYW1iZGF8bGV0KC12YWx1ZXN8KHJlYyk/KFxcKik/KT98ZWxzZXxpZnxjb25kfGJlZ2lufGRlbGF5fGRlbGF5LWZvcmNlfHBhcmFtZXRlcml6ZXxndWFyZHxzZXQhfChxdWFzaS0pP3F1b3RlfHN5bnRheC1ydWxlcykvLFxuXHRsb29rYmVoaW5kIDogdHJ1ZVxuICAgIH0sXG4gICAgJ2J1aWx0aW4nIDoge1xuXHRwYXR0ZXJuIDogIC8oWyhdKShjb25zfGNhcnxjZHJ8bnVsbFxcP3xwYWlyXFw/fGJvb2xlYW5cXD98ZW9mLW9iamVjdFxcP3xjaGFyXFw/fHByb2NlZHVyZVxcP3xudW1iZXJcXD98cG9ydFxcP3xzdHJpbmdcXD98dmVjdG9yXFw/fHN5bWJvbFxcP3xieXRldmVjdG9yXFw/fGxpc3R8Y2FsbC13aXRoLWN1cnJlbnQtY29udGludWF0aW9ufGNhbGxcXC9jY3xhcHBlbmR8YWJzfGFwcGx5fGV2YWwpXFxiLyxcblx0bG9va2JlaGluZCA6IHRydWVcbiAgICB9LFxuICAgICdzdHJpbmcnIDogIC8oW1wiXSkoPzooPz0oXFxcXD8pKVxcMi4pKj9cXDF8J1teKCd8XFxzKV0rLywgLy90aGFua3MgaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xNzE0ODAvcmVnZXgtZ3JhYmJpbmctdmFsdWVzLWJldHdlZW4tcXVvdGF0aW9uLW1hcmtzXG4gICAgJ251bWJlcicgOiAvKFxcc3xcXCkpWy0rXT9bMC05XSpcXC4/WzAtOV0rKChcXHMqKVstK117MX0oXFxzKilbMC05XSpcXC4/WzAtOV0raSk/LyxcbiAgICAnb3BlcmF0b3InOiAvKFxcKnxcXCt8XFwtfFxcJXxcXC98PD18PT58Pj18PHw9fD4pLyxcbiAgICAnZnVuY3Rpb24nIDoge1xuXHRwYXR0ZXJuIDogLyhbKF0pW14oXFxzfFxcKSldKlxccy8sXG5cdGxvb2tiZWhpbmQgOiB0cnVlXG4gICAgfSxcbiAgICAncHVuY3R1YXRpb24nIDogL1soKV0vXG59O1xuXG4gICAgXG5cbiAgICBcblxuUHJpc20ubGFuZ3VhZ2VzLmdyb292eSA9IFByaXNtLmxhbmd1YWdlcy5leHRlbmQoJ2NsaWtlJywge1xuXHQna2V5d29yZCc6IC9cXGIoYXN8ZGVmfGlufGFic3RyYWN0fGFzc2VydHxib29sZWFufGJyZWFrfGJ5dGV8Y2FzZXxjYXRjaHxjaGFyfGNsYXNzfGNvbnN0fGNvbnRpbnVlfGRlZmF1bHR8ZG98ZG91YmxlfGVsc2V8ZW51bXxleHRlbmRzfGZpbmFsfGZpbmFsbHl8ZmxvYXR8Zm9yfGdvdG98aWZ8aW1wbGVtZW50c3xpbXBvcnR8aW5zdGFuY2VvZnxpbnR8aW50ZXJmYWNlfGxvbmd8bmF0aXZlfG5ld3xwYWNrYWdlfHByaXZhdGV8cHJvdGVjdGVkfHB1YmxpY3xyZXR1cm58c2hvcnR8c3RhdGljfHN0cmljdGZwfHN1cGVyfHN3aXRjaHxzeW5jaHJvbml6ZWR8dGhpc3x0aHJvd3x0aHJvd3N8dHJhaXR8dHJhbnNpZW50fHRyeXx2b2lkfHZvbGF0aWxlfHdoaWxlKVxcYi9nLFxuXHQnc3RyaW5nJzogLyhcIlwiXCJ8JycnKVtcXFdcXHddKj9cXDF8KFwifCd8XFwvKVtcXFdcXHddKj9cXDJ8KFxcJFxcLykoXFwkXFwvXFwkfFtcXFdcXHddKSo/XFwvXFwkL2csXG5cdCdudW1iZXInOiAvXFxiMGJbMDFfXStcXGJ8XFxiMHhbXFxkYS1mX10rKFxcLltcXGRhLWZfcFxcLV0rKT9cXGJ8XFxiW1xcZF9dKyhcXC5bXFxkX10rW2VdP1tcXGRdKik/W2dsaWRmXVxcYnxbXFxkX10rKFxcLltcXGRfXSspP1xcYi9naSxcblx0J29wZXJhdG9yJzoge1xuXHRcdHBhdHRlcm46IC8oXnxbXi5dKSg9ezAsMn1+fFxcP1xcLnxcXCo/XFwuQHxcXC4mfFxcLnsxLDJ9KD8hXFwuKXxcXC57Mn08Pyg/PVxcdyl8LT58XFw/OnxbLStdezEsMn18IXw8PT58PnsxLDN9fDx7MSwyfXw9ezEsMn18JnsxLDJ9fFxcfHsxLDJ9fFxcP3xcXCp7MSwyfXxcXC98XFxefCUpL2csXG5cdFx0bG9va2JlaGluZDogdHJ1ZVxuXHR9LFxuXHQncHVuY3R1YXRpb24nOiAvXFwuK3xbe31bXFxdOygpLDokXS9nXG59KTtcblxuUHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZSgnZ3Jvb3Z5JywgJ3B1bmN0dWF0aW9uJywge1xuXHQnc3BvY2stYmxvY2snOiAvXFxiKHNldHVwfGdpdmVufHdoZW58dGhlbnxhbmR8Y2xlYW51cHxleHBlY3R8d2hlcmUpOi9nXG59KTtcblxuUHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZSgnZ3Jvb3Z5JywgJ2Z1bmN0aW9uJywge1xuXHQnYW5ub3RhdGlvbic6IHtcblx0XHRwYXR0ZXJuOiAvKF58W14uXSlAXFx3Ky8sXG5cdFx0bG9va2JlaGluZDogdHJ1ZVxuXHR9XG59KTtcblxuUHJpc20uaG9va3MuYWRkKCd3cmFwJywgZnVuY3Rpb24oZW52KSB7XG5cdGlmIChlbnYubGFuZ3VhZ2UgPT09ICdncm9vdnknICYmIGVudi50eXBlID09PSAnc3RyaW5nJykge1xuXHRcdHZhciBkZWxpbWl0ZXIgPSBlbnYuY29udGVudFswXTtcblxuXHRcdGlmIChkZWxpbWl0ZXIgIT0gXCInXCIpIHtcblx0XHRcdHZhciBwYXR0ZXJuID0gLyhbXlxcXFxdKShcXCQoXFx7Lio/XFx9fFtcXHdcXC5dKykpLztcblx0XHRcdGlmIChkZWxpbWl0ZXIgPT09ICckJykge1xuXHRcdFx0XHRwYXR0ZXJuID0gLyhbXlxcJF0pKFxcJChcXHsuKj9cXH18W1xcd1xcLl0rKSkvO1xuXHRcdFx0fVxuXHRcdFx0ZW52LmNvbnRlbnQgPSBQcmlzbS5oaWdobGlnaHQoZW52LmNvbnRlbnQsIHtcblx0XHRcdFx0J2V4cHJlc3Npb24nOiB7XG5cdFx0XHRcdFx0cGF0dGVybjogcGF0dGVybixcblx0XHRcdFx0XHRsb29rYmVoaW5kOiB0cnVlLFxuXHRcdFx0XHRcdGluc2lkZTogUHJpc20ubGFuZ3VhZ2VzLmdyb292eVxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdFx0ZW52LmNsYXNzZXMucHVzaChkZWxpbWl0ZXIgPT09ICcvJyA/ICdyZWdleCcgOiAnZ3N0cmluZycpO1xuXHRcdH1cblx0fVxufSk7XG5cbi8qKlxuICogT3JpZ2luYWwgYnkgSmFuIFQuIFNvdHQgKGh0dHA6Ly9naXRodWIuY29tL2lkbGViZXJnKVxuICpcbiAqIEluY2x1ZGVzIGFsbCBjb21tYW5kcyBhbmQgcGx1Zy1pbnMgc2hpcHBlZCB3aXRoIE5TSVMgMy4wYTJcbiAqL1xuIFByaXNtLmxhbmd1YWdlcy5uc2lzID0ge1xuXHQnY29tbWVudCc6IHtcblx0XHRwYXR0ZXJuOiAvKF58W15cXFxcXSkoXFwvXFwqW1xcd1xcV10qP1xcKlxcL3woXnxbXjpdKSgjfDspLio/KFxccj9cXG58JCkpL2csXG5cdFx0bG9va2JlaGluZDogdHJ1ZVxuXHR9LFxuXHQnc3RyaW5nJzogLyhcInwnKShcXFxcPy4pKj9cXDEvZyxcblx0J2tleXdvcmQnOiAvXFxiKEFib3J0fEFkZChCcmFuZGluZ0ltYWdlfFNpemUpfEFkdlNwbGFzaHxBbGxvdyhSb290RGlySW5zdGFsbHxTa2lwRmlsZXMpfEF1dG9DbG9zZVdpbmRvd3xCYW5uZXJ8QkcoRm9udHxHcmFkaWVudHxJbWFnZSl8QnJhbmRpbmdUZXh0fEJyaW5nVG9Gcm9udHxDYWxsKFxcYnxJbnN0RExMKXxDYXB0aW9ufENoYW5nZVVJfENoZWNrQml0bWFwfENsZWFyRXJyb3JzfENvbXBsZXRlZFRleHR8Q29tcG9uZW50VGV4dHxDb3B5RmlsZXN8Q1JDQ2hlY2t8Q3JlYXRlKERpcmVjdG9yeXxGb250fFNob3J0Q3V0KXxEZWxldGUoXFxifElOSVNlY3xJTklTdHJ8UmVnS2V5fFJlZ1ZhbHVlKXxEZXRhaWwoUHJpbnR8c0J1dHRvblRleHQpfERpYWxlcnxEaXIoVGV4dHxWYXJ8VmVyaWZ5KXxFbmFibGVXaW5kb3d8RW51bShSZWdLZXl8UmVnVmFsdWUpfEV4Y2h8RXhlYyhcXGJ8U2hlbGx8V2FpdCl8RXhwYW5kRW52U3RyaW5nc3xGaWxlKFxcYnxCdWZTaXplfENsb3NlfEVycm9yVGV4dHxPcGVufFJlYWR8UmVhZEJ5dGV8UmVhZFVURjE2TEV8UmVhZFdvcmR8V3JpdGVVVEYxNkxFfFNlZWt8V3JpdGV8V3JpdGVCeXRlfFdyaXRlV29yZCl8RmluZChDbG9zZXxGaXJzdHxOZXh0fFdpbmRvdyl8Rmx1c2hJTkl8R2V0KEN1ckluc3RUeXBlfEN1cnJlbnRBZGRyZXNzfERsZ0l0ZW18RExMVmVyc2lvbnxETExWZXJzaW9uTG9jYWx8RXJyb3JMZXZlbHxGaWxlVGltZXxGaWxlVGltZUxvY2FsfEZ1bGxQYXRoTmFtZXxGdW5jdGlvbihcXGJ8QWRkcmVzc3xFbmQpfEluc3REaXJFcnJvcnxMYWJlbEFkZHJlc3N8VGVtcEZpbGVOYW1lKXxHb3RvfEhpZGVXaW5kb3d8SWNvbnxJZihBYm9ydHxFcnJvcnN8RmlsZUV4aXN0c3xSZWJvb3RGbGFnfFNpbGVudCl8SW5pdFBsdWdpbnNEaXJ8SW5zdGFsbChCdXR0b25UZXh0fENvbG9yc3xEaXJ8RGlyUmVnS2V5KXxJbnN0UHJvZ3Jlc3NGbGFnc3xJbnN0KFR5cGV8VHlwZUdldFRleHR8VHlwZVNldFRleHQpfEludChDbXB8Q21wVXxGbXR8T3ApfElzV2luZG93fExhbmcoRExMfFN0cmluZyl8TGljZW5zZShCa0NvbG9yfERhdGF8Rm9yY2VTZWxlY3Rpb258TGFuZ1N0cmluZ3xUZXh0KXxMb2FkTGFuZ3VhZ2VGaWxlfExvY2tXaW5kb3d8TG9nKFNldHxUZXh0KXxNYW5pZmVzdChEUElBd2FyZXxTdXBwb3J0ZWRPUyl8TWF0aHxNZXNzYWdlQm94fE1pc2NCdXR0b25UZXh0fE5hbWV8Tm9wfG5zKERpYWxvZ3N8RXhlYyl8TlNJU2RsfE91dEZpbGV8UGFnZShcXGJ8Q2FsbGJhY2tzKXxQb3B8UHVzaHxRdWl0fFJlYWQoRW52U3RyfElOSVN0cnxSZWdEV09SRHxSZWdTdHIpfFJlYm9vdHxSZWdETEx8UmVuYW1lfFJlcXVlc3RFeGVjdXRpb25MZXZlbHxSZXNlcnZlRmlsZXxSZXR1cm58Uk1EaXJ8U2VhcmNoUGF0aHxTZWN0aW9uKFxcYnxFbmR8R2V0RmxhZ3N8R2V0SW5zdFR5cGVzfEdldFNpemV8R2V0VGV4dHxHcm91cHxJbnxTZXRGbGFnc3xTZXRJbnN0VHlwZXN8U2V0U2l6ZXxTZXRUZXh0KXxTZW5kTWVzc2FnZXxTZXQoQXV0b0Nsb3NlfEJyYW5kaW5nSW1hZ2V8Q29tcHJlc3N8Q29tcHJlc3NvcnxDb21wcmVzc29yRGljdFNpemV8Q3RsQ29sb3JzfEN1ckluc3RUeXBlfERhdGFibG9ja09wdGltaXplfERhdGVTYXZlfERldGFpbHNQcmludHxEZXRhaWxzVmlld3xFcnJvckxldmVsfEVycm9yc3xGaWxlQXR0cmlidXRlc3xGb250fE91dFBhdGh8T3ZlcndyaXRlfFBsdWdpblVubG9hZHxSZWJvb3RGbGFnfFJlZ1ZpZXd8U2hlbGxWYXJDb250ZXh0fFNpbGVudCl8U2hvdyhJbnN0RGV0YWlsc3xVbmluc3REZXRhaWxzfFdpbmRvdyl8U2lsZW50KEluc3RhbGx8VW5JbnN0YWxsKXxTbGVlcHxTcGFjZVRleHRzfFNwbGFzaHxTdGFydE1lbnV8U3RyKENtcHxDbXBTfENweXxMZW4pfFN1YkNhcHRpb258U3lzdGVtfFVuaWNvZGV8VW5pbnN0YWxsKEJ1dHRvblRleHR8Q2FwdGlvbnxJY29ufFN1YkNhcHRpb258VGV4dCl8VW5pbnN0UGFnZXxVblJlZ0RMTHxVc2VySW5mb3xWYXJ8VkkoQWRkVmVyc2lvbktleXxGaWxlVmVyc2lvbnxQcm9kdWN0VmVyc2lvbil8VlBhdGNofFdpbmRvd0ljb258V3JpdGVJTklTdHJ8V3JpdGVSZWdCaW58V3JpdGVSZWdEV09SRHxXcml0ZVJlZ0V4cGFuZFN0cnxXcml0ZShSZWdTdHJ8VW5pbnN0YWxsZXIpfFhQU3R5bGUpXFxiL2csXG5cdCdwcm9wZXJ0eSc6IC9cXGIoYWRtaW58YWxsfGF1dG98Ym90aHxjb2xvcmVkfGZhbHNlfGZvcmNlfGhpZGV8aGlnaGVzdHxsYXN0dXNlZHxsZWF2ZXxsaXN0b25seXxub25lfG5vcm1hbHxub3RzZXR8b2ZmfG9ufG9wZW58cHJpbnR8c2hvd3xzaWxlbnR8c2lsZW50bG9nfHNtb290aHx0ZXh0b25seXx0cnVlfHVzZXJ8QVJDSElWRXxGSUxFXyhBVFRSSUJVVEVfQVJDSElWRXxBVFRSSUJVVEVfTk9STUFMfEFUVFJJQlVURV9PRkZMSU5FfEFUVFJJQlVURV9SRUFET05MWXxBVFRSSUJVVEVfU1lTVEVNfEFUVFJJQlVURV9URU1QT1JBUlkpfEhLKENSfENVfEREfExNfFBEfFUpfEhLRVlfKENMQVNTRVNfUk9PVHxDVVJSRU5UX0NPTkZJR3xDVVJSRU5UX1VTRVJ8RFlOX0RBVEF8TE9DQUxfTUFDSElORXxQRVJGT1JNQU5DRV9EQVRBfFVTRVJTKXxJRChBQk9SVHxDQU5DRUx8SUdOT1JFfE5PfE9LfFJFVFJZfFlFUyl8TUJfKEFCT1JUUkVUUllJR05PUkV8REVGQlVUVE9OMXxERUZCVVRUT04yfERFRkJVVFRPTjN8REVGQlVUVE9ONHxJQ09ORVhDTEFNQVRJT058SUNPTklORk9STUFUSU9OfElDT05RVUVTVElPTnxJQ09OU1RPUHxPS3xPS0NBTkNFTHxSRVRSWUNBTkNFTHxSSUdIVHxSVExSRUFESU5HfFNFVEZPUkVHUk9VTkR8VE9QTU9TVHxVU0VSSUNPTnxZRVNOTyl8Tk9STUFMfE9GRkxJTkV8UkVBRE9OTFl8U0hDVFh8U0hFTExfQ09OVEVYVHxTWVNURU18VEVNUE9SQVJZKVxcYi9nLFxuXHQndmFyaWFibGUnOiAvKFxcJChcXCh8XFx7KT9bLV9cXHddKykoXFwpfFxcfSk/L2ksXG5cdCdudW1iZXInOiAvXFxiLT8oMHhbXFxkQS1GYS1mXSt8XFxkKlxcLj9cXGQrKFtFZV0tP1xcZCspPylcXGIvZyxcblx0J29wZXJhdG9yJzogL1stK117MSwyfXwmbHQ7PT98Pj0/fD17MSwzfXwoJmFtcDspezEsMn18XFx8P1xcfHxcXD98XFwqfFxcL3xcXH58XFxefFxcJS9nLFxuXHQncHVuY3R1YXRpb24nOiAvW3t9W1xcXTsoKSwuOl0vZyxcblx0J2ltcG9ydGFudCc6IC9cXCEoYWRkaW5jbHVkZWRpcnxhZGRwbHVnaW5kaXJ8YXBwZW5kZmlsZXxjZHxkZWZpbmV8ZGVsZmlsZXxlY2hvfGVsc2V8ZW5kaWZ8ZXJyb3J8ZXhlY3V0ZXxmaW5hbGl6ZXxnZXRkbGx2ZXJzaW9uc3lzdGVtfGlmZGVmfGlmbWFjcm9kZWZ8aWZtYWNyb25kZWZ8aWZuZGVmfGlmfGluY2x1ZGV8aW5zZXJ0bWFjcm98bWFjcm9lbmR8bWFjcm98bWFrZW5zaXN8cGFja2hkcnxzZWFyY2hwYXJzZXxzZWFyY2hyZXBsYWNlfHRlbXBmaWxlfHVuZGVmfHZlcmJvc2V8d2FybmluZylcXGIvZ2ksXG59O1xuXG5QcmlzbS5sYW5ndWFnZXMuc2NzcyA9IFByaXNtLmxhbmd1YWdlcy5leHRlbmQoJ2NzcycsIHtcblx0J2NvbW1lbnQnOiB7XG5cdFx0cGF0dGVybjogLyhefFteXFxcXF0pKFxcL1xcKltcXHdcXFddKj9cXCpcXC98XFwvXFwvLio/KFxccj9cXG58JCkpL2csXG5cdFx0bG9va2JlaGluZDogdHJ1ZVxuXHR9LFxuXHQvLyBhdHVybGUgaXMganVzdCB0aGUgQCoqKiwgbm90IHRoZSBlbnRpcmUgcnVsZSAodG8gaGlnaGxpZ2h0IHZhciAmIHN0dWZmcylcblx0Ly8gKyBhZGQgYWJpbGl0eSB0byBoaWdobGlnaHQgbnVtYmVyICYgdW5pdCBmb3IgbWVkaWEgcXVlcmllc1xuXHQnYXRydWxlJzogL0BbXFx3LV0rKD89XFxzKyhcXCh8XFx7fDspKS9naSxcblx0Ly8gdXJsLCBjb21wYXNzaWZpZWRcblx0J3VybCc6IC8oWy1hLXpdKy0pKnVybCg/PVxcKCkvZ2ksXG5cdC8vIENTUyBzZWxlY3RvciByZWdleCBpcyBub3QgYXBwcm9wcmlhdGUgZm9yIFNhc3Ncblx0Ly8gc2luY2UgdGhlcmUgY2FuIGJlIGxvdCBtb3JlIHRoaW5ncyAodmFyLCBAIGRpcmVjdGl2ZSwgbmVzdGluZy4uKVxuXHQvLyBhIHNlbGVjdG9yIG11c3Qgc3RhcnQgYXQgdGhlIGVuZCBvZiBhIHByb3BlcnR5IG9yIGFmdGVyIGEgYnJhY2UgKGVuZCBvZiBvdGhlciBydWxlcyBvciBuZXN0aW5nKVxuXHQvLyBpdCBjYW4gY29udGFpbiBzb21lIGNhcmFjdGVycyB0aGF0IGFyZW4ndCB1c2VkIGZvciBkZWZpbmluZyBydWxlcyBvciBlbmQgb2Ygc2VsZWN0b3IsICYgKHBhcmVudCBzZWxlY3RvciksIG9yIGludGVycG9sYXRlZCB2YXJpYWJsZVxuXHQvLyB0aGUgZW5kIG9mIGEgc2VsZWN0b3IgaXMgZm91bmQgd2hlbiB0aGVyZSBpcyBubyBydWxlcyBpbiBpdCAoIHt9IG9yIHtcXHN9KSBvciBpZiB0aGVyZSBpcyBhIHByb3BlcnR5IChiZWNhdXNlIGFuIGludGVycG9sYXRlZCB2YXJcblx0Ly8gY2FuIFwicGFzc1wiIGFzIGEgc2VsZWN0b3ItIGUuZzogcHJvcGVyI3skZXJ0eX0pXG5cdC8vIHRoaXMgb25lIHdhcyBhcmQgdG8gZG8sIHNvIHBsZWFzZSBiZSBjYXJlZnVsIGlmIHlvdSBlZGl0IHRoaXMgb25lIDopXG5cdCdzZWxlY3Rvcic6IC8oW15AO1xce1xcfVxcKFxcKV0/KFteQDtcXHtcXH1cXChcXCldfCZ8XFwjXFx7XFwkWy1fXFx3XStcXH0pKykoPz1cXHMqXFx7KFxcfXxcXHN8W15cXH1dKyg6fFxceylbXlxcfV0rKSkvZ21cbn0pO1xuXG5QcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKCdzY3NzJywgJ2F0cnVsZScsIHtcblx0J2tleXdvcmQnOiAvQChpZnxlbHNlIGlmfGVsc2V8Zm9yfGVhY2h8d2hpbGV8aW1wb3J0fGV4dGVuZHxkZWJ1Z3x3YXJufG1peGlufGluY2x1ZGV8ZnVuY3Rpb258cmV0dXJufGNvbnRlbnQpfCg/PUBmb3JcXHMrXFwkWy1fXFx3XStcXHMpK2Zyb20vaVxufSk7XG5cblByaXNtLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoJ3Njc3MnLCAncHJvcGVydHknLCB7XG5cdC8vIHZhciBhbmQgaW50ZXJwb2xhdGVkIHZhcnNcblx0J3ZhcmlhYmxlJzogLygoXFwkWy1fXFx3XSspfCgjXFx7XFwkWy1fXFx3XStcXH0pKS9pXG59KTtcblxuUHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZSgnc2NzcycsICdpZ25vcmUnLCB7XG5cdCdwbGFjZWhvbGRlcic6IC8lWy1fXFx3XSsvaSxcblx0J3N0YXRlbWVudCc6IC9cXEIhKGRlZmF1bHR8b3B0aW9uYWwpXFxiL2dpLFxuXHQnYm9vbGVhbic6IC9cXGIodHJ1ZXxmYWxzZSlcXGIvZyxcblx0J251bGwnOiAvXFxiKG51bGwpXFxiL2csXG5cdCdvcGVyYXRvcic6IC9cXHMrKFstK117MSwyfXw9ezEsMn18IT18XFx8P1xcfHxcXD98XFwqfFxcL3xcXCUpXFxzKy9nXG59KTtcblxuUHJpc20ubGFuZ3VhZ2VzLmNvZmZlZXNjcmlwdCA9IFByaXNtLmxhbmd1YWdlcy5leHRlbmQoJ2phdmFzY3JpcHQnLCB7XG5cdCdjb21tZW50JzogW1xuXHRcdC8oWyNdezN9XFxzKlxccj9cXG4oLipcXHMqXFxyKlxcbiopXFxzKj9cXHI/XFxuWyNdezN9KS9nLFxuXHRcdC8oXFxzfF4pKFsjXXsxfVteI15cXHJeXFxuXXsyLH0/KFxccj9cXG58JCkpL2dcblx0XSxcblx0J2tleXdvcmQnOiAvXFxiKHRoaXN8d2luZG93fGRlbGV0ZXxjbGFzc3xleHRlbmRzfG5hbWVzcGFjZXxleHRlbmR8YXJ8bGV0fGlmfGVsc2V8d2hpbGV8ZG98Zm9yfGVhY2h8b2Z8cmV0dXJufGlufGluc3RhbmNlb2Z8bmV3fHdpdGh8dHlwZW9mfHRyeXxjYXRjaHxmaW5hbGx5fG51bGx8dW5kZWZpbmVkfGJyZWFrfGNvbnRpbnVlKVxcYi9nXG59KTtcblxuUHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZSgnY29mZmVlc2NyaXB0JywgJ2tleXdvcmQnLCB7XG5cdCdmdW5jdGlvbic6IHtcblx0XHRwYXR0ZXJuOiAvW2EtenxBLXpdK1xccypbOnw9XVxccyooXFwoWy58YS16XFxzfCx8Onx7fH18XFxcInxcXCd8PV0qXFwpKT9cXHMqLSZndDsvZ2ksXG5cdFx0aW5zaWRlOiB7XG5cdFx0XHQnZnVuY3Rpb24tbmFtZSc6IC9bXz9hLXotfEEtWi1dKyhcXHMqWzp8PV0pfCBAW18/JD9hLXotfEEtWi1dKyhcXHMqKXwgL2csXG5cdFx0XHQnb3BlcmF0b3InOiAvWy0rXXsxLDJ9fCF8PT8mbHQ7fD0/Jmd0O3w9ezEsMn18KCZhbXA7KXsxLDJ9fFxcfD9cXHx8XFw/fFxcKnxcXC8vZ1xuXHRcdH1cblx0fSxcblx0J2F0dHItbmFtZSc6IC9bXz9hLXotfEEtWi1dKyhcXHMqOil8IEBbXz8kP2Etei18QS1aLV0rKFxccyopfCAvZ1xufSk7XG5cblByaXNtLmxhbmd1YWdlcy5oYW5kbGViYXJzID0ge1xuXHQnZXhwcmVzc2lvbic6IHtcblx0XHRwYXR0ZXJuOiAvXFx7XFx7XFx7W1xcd1xcV10rP1xcfVxcfVxcfXxcXHtcXHtbXFx3XFxXXSs/XFx9XFx9L2csXG5cdFx0aW5zaWRlOiB7XG5cdFx0XHQnY29tbWVudCc6IHtcblx0XHRcdFx0cGF0dGVybjogLyhcXHtcXHspIVtcXHdcXFddKig/PVxcfVxcfSkvZyxcblx0XHRcdFx0bG9va2JlaGluZDogdHJ1ZVxuXHRcdFx0fSxcblx0XHRcdCdkZWxpbWl0ZXInOiB7XG5cdFx0XHRcdHBhdHRlcm46IC9eXFx7XFx7XFx7P3xcXH1cXH1cXH0/JC9pZyxcblx0XHRcdFx0YWxpYXM6ICdwdW5jdHVhdGlvbidcblx0XHRcdH0sXG5cdFx0XHQnc3RyaW5nJzogLyhbXCInXSkoXFxcXD8uKSs/XFwxL2csXG5cdFx0XHQnbnVtYmVyJzogL1xcYi0/KDB4W1xcZEEtRmEtZl0rfFxcZCpcXC4/XFxkKyhbRWVdLT9cXGQrKT8pXFxiL2csXG5cdFx0XHQnYm9vbGVhbic6IC9cXGIodHJ1ZXxmYWxzZSlcXGIvZyxcblx0XHRcdCdibG9jayc6IHtcblx0XHRcdFx0cGF0dGVybjogL14oXFxzKn4/XFxzKilbI1xcL11cXHcrL2lnLFxuXHRcdFx0XHRsb29rYmVoaW5kOiB0cnVlLFxuXHRcdFx0XHRhbGlhczogJ2tleXdvcmQnXG5cdFx0XHR9LFxuXHRcdFx0J2JyYWNrZXRzJzoge1xuXHRcdFx0XHRwYXR0ZXJuOiAvXFxbW15cXF1dK1xcXS8sXG5cdFx0XHRcdGluc2lkZToge1xuXHRcdFx0XHRcdHB1bmN0dWF0aW9uOiAvXFxbfFxcXS9nLFxuXHRcdFx0XHRcdHZhcmlhYmxlOiAvW1xcd1xcV10rL2dcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdCdwdW5jdHVhdGlvbic6IC9bIVwiIyUmJygpKissLlxcLzs8PT5AXFxbXFxcXFxcXV5ge3x9fl0vZyxcblx0XHRcdCd2YXJpYWJsZSc6IC9bXiFcIiMlJicoKSorLC5cXC87PD0+QFxcW1xcXFxcXF1eYHt8fX5dKy9nXG5cdFx0fVxuXHR9XG59O1xuXG5pZiAoUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cCkge1xuXG5cdC8vIFRva2VuaXplIGFsbCBpbmxpbmUgSGFuZGxlYmFycyBleHByZXNzaW9ucyB0aGF0IGFyZSB3cmFwcGVkIGluIHt7IH19IG9yIHt7eyB9fX1cblx0Ly8gVGhpcyBhbGxvd3MgZm9yIGVhc3kgSGFuZGxlYmFycyArIG1hcmt1cCBoaWdobGlnaHRpbmdcblx0UHJpc20uaG9va3MuYWRkKCdiZWZvcmUtaGlnaGxpZ2h0JywgZnVuY3Rpb24oZW52KSB7XG5cdFx0Y29uc29sZS5sb2coZW52Lmxhbmd1YWdlKTtcblx0XHRpZiAoZW52Lmxhbmd1YWdlICE9PSAnaGFuZGxlYmFycycpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRlbnYudG9rZW5TdGFjayA9IFtdO1xuXG5cdFx0ZW52LmJhY2t1cENvZGUgPSBlbnYuY29kZTtcblx0XHRlbnYuY29kZSA9IGVudi5jb2RlLnJlcGxhY2UoL1xce1xce1xce1tcXHdcXFddKz9cXH1cXH1cXH18XFx7XFx7W1xcd1xcV10rP1xcfVxcfS9pZywgZnVuY3Rpb24obWF0Y2gpIHtcblx0XHRcdGNvbnNvbGUubG9nKG1hdGNoKTtcblx0XHRcdGVudi50b2tlblN0YWNrLnB1c2gobWF0Y2gpO1xuXG5cdFx0XHRyZXR1cm4gJ19fX0hBTkRMRUJBUlMnICsgZW52LnRva2VuU3RhY2subGVuZ3RoICsgJ19fXyc7XG5cdFx0fSk7XG5cdH0pO1xuXG5cdC8vIFJlc3RvcmUgZW52LmNvZGUgZm9yIG90aGVyIHBsdWdpbnMgKGUuZy4gbGluZS1udW1iZXJzKVxuXHRQcmlzbS5ob29rcy5hZGQoJ2JlZm9yZS1pbnNlcnQnLCBmdW5jdGlvbihlbnYpIHtcblx0XHRpZiAoZW52Lmxhbmd1YWdlID09PSAnaGFuZGxlYmFycycpIHtcblx0XHRcdGVudi5jb2RlID0gZW52LmJhY2t1cENvZGU7XG5cdFx0XHRkZWxldGUgZW52LmJhY2t1cENvZGU7XG5cdFx0fVxuXHR9KTtcblxuXHQvLyBSZS1pbnNlcnQgdGhlIHRva2VucyBhZnRlciBoaWdobGlnaHRpbmdcblx0UHJpc20uaG9va3MuYWRkKCdhZnRlci1oaWdobGlnaHQnLCBmdW5jdGlvbihlbnYpIHtcblx0XHRpZiAoZW52Lmxhbmd1YWdlICE9PSAnaGFuZGxlYmFycycpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRmb3IgKHZhciBpID0gMCwgdDsgdCA9IGVudi50b2tlblN0YWNrW2ldOyBpKyspIHtcblx0XHRcdGVudi5oaWdobGlnaHRlZENvZGUgPSBlbnYuaGlnaGxpZ2h0ZWRDb2RlLnJlcGxhY2UoJ19fX0hBTkRMRUJBUlMnICsgKGkgKyAxKSArICdfX18nLCBQcmlzbS5oaWdobGlnaHQodCwgZW52LmdyYW1tYXIsICdoYW5kbGViYXJzJykpO1xuXHRcdH1cblxuXHRcdGVudi5lbGVtZW50LmlubmVySFRNTCA9IGVudi5oaWdobGlnaHRlZENvZGU7XG5cdH0pO1xuXG5cdC8vIFdyYXAgdG9rZW5zIGluIGNsYXNzZXMgdGhhdCBhcmUgbWlzc2luZyB0aGVtXG5cdFByaXNtLmhvb2tzLmFkZCgnd3JhcCcsIGZ1bmN0aW9uKGVudikge1xuXHRcdGlmIChlbnYubGFuZ3VhZ2UgPT09ICdoYW5kbGViYXJzJyAmJiBlbnYudHlwZSA9PT0gJ21hcmt1cCcpIHtcblx0XHRcdGVudi5jb250ZW50ID0gZW52LmNvbnRlbnQucmVwbGFjZSgvKF9fX0hBTkRMRUJBUlNbMC05XStfX18pL2csIFwiPHNwYW4gY2xhc3M9XFxcInRva2VuIGhhbmRsZWJhcnNcXFwiPiQxPC9zcGFuPlwiKTtcblx0XHR9XG5cdH0pO1xuXG5cdC8vIEFkZCB0aGUgcnVsZXMgYmVmb3JlIGFsbCBvdGhlcnNcblx0UHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZSgnaGFuZGxlYmFycycsICdleHByZXNzaW9uJywge1xuXHRcdCdtYXJrdXAnOiB7XG5cdFx0XHRwYXR0ZXJuOiAvPFteP11cXC8/KC4qPyk+L2csXG5cdFx0XHRpbnNpZGU6IFByaXNtLmxhbmd1YWdlcy5tYXJrdXBcblx0XHR9LFxuXHRcdCdoYW5kbGViYXJzJzogL19fX0hBTkRMRUJBUlNbMC05XStfX18vZ1xuXHR9KTtcbn1cblxuXG5QcmlzbS5sYW5ndWFnZXMub2JqZWN0aXZlYyA9IFByaXNtLmxhbmd1YWdlcy5leHRlbmQoJ2MnLCB7XG5cdCdrZXl3b3JkJzogLyhcXGIoYXNtfHR5cGVvZnxpbmxpbmV8YXV0b3xicmVha3xjYXNlfGNoYXJ8Y29uc3R8Y29udGludWV8ZGVmYXVsdHxkb3xkb3VibGV8ZWxzZXxlbnVtfGV4dGVybnxmbG9hdHxmb3J8Z290b3xpZnxpbnR8bG9uZ3xyZWdpc3RlcnxyZXR1cm58c2hvcnR8c2lnbmVkfHNpemVvZnxzdGF0aWN8c3RydWN0fHN3aXRjaHx0eXBlZGVmfHVuaW9ufHVuc2lnbmVkfHZvaWR8dm9sYXRpbGV8d2hpbGV8aW58c2VsZnxzdXBlcilcXGIpfCgoPz1bXFx3fEBdKShAaW50ZXJmYWNlfEBlbmR8QGltcGxlbWVudGF0aW9ufEBwcm90b2NvbHxAY2xhc3N8QHB1YmxpY3xAcHJvdGVjdGVkfEBwcml2YXRlfEBwcm9wZXJ0eXxAdHJ5fEBjYXRjaHxAZmluYWxseXxAdGhyb3d8QHN5bnRoZXNpemV8QGR5bmFtaWN8QHNlbGVjdG9yKVxcYikvZyxcblx0J3N0cmluZyc6IC8oPzooXCJ8JykoW15cXG5cXFxcXFwxXXxcXFxcLnxcXFxcXFxyKlxcbikqP1xcMSl8KEBcIihbXlxcblxcXFxcIl18XFxcXC58XFxcXFxccipcXG4pKj9cIikvZyxcblx0J29wZXJhdG9yJzogL1stK117MSwyfXwhPT98PHsxLDJ9PT98PnsxLDJ9PT98XFwtPnw9ezEsMn18XFxefH58JXwmezEsMn18XFx8P1xcfHxcXD98XFwqfFxcL3xAL2dcbn0pO1xuXG5QcmlzbS5sYW5ndWFnZXMuc3FsPSB7IFxuXHQnY29tbWVudCc6IHtcblx0XHRwYXR0ZXJuOiAvKF58W15cXFxcXSkoXFwvXFwqW1xcd1xcV10qP1xcKlxcL3woKC0tKXwoXFwvXFwvKXwjKS4qPyhcXHI/XFxufCQpKS9nLFxuXHRcdGxvb2tiZWhpbmQ6IHRydWVcblx0fSxcblx0J3N0cmluZycgOiB7XG5cdFx0cGF0dGVybjogLyhefFteQF0pKFwifCcpKFxcXFw/W1xcc1xcU10pKj9cXDIvZyxcblx0XHRsb29rYmVoaW5kOiB0cnVlXG5cdH0sXG5cdCd2YXJpYWJsZSc6IC9AW1xcdy4kXSt8QChcInwnfGApKFxcXFw/W1xcc1xcU10pKz9cXDEvZyxcblx0J2Z1bmN0aW9uJzogL1xcYig/OkNPVU5UfFNVTXxBVkd8TUlOfE1BWHxGSVJTVHxMQVNUfFVDQVNFfExDQVNFfE1JRHxMRU58Uk9VTkR8Tk9XfEZPUk1BVCkoPz1cXHMqXFwoKS9pZywgLy8gU2hvdWxkIHdlIGhpZ2hsaWdodCB1c2VyIGRlZmluZWQgZnVuY3Rpb25zIHRvbz9cblx0J2tleXdvcmQnOiAvXFxiKD86QUNUSU9OfEFERHxBRlRFUnxBTEdPUklUSE18QUxURVJ8QU5BTFlaRXxBUFBMWXxBU3xBU0N8QVVUSE9SSVpBVElPTnxCQUNLVVB8QkRCfEJFR0lOfEJFUktFTEVZREJ8QklHSU5UfEJJTkFSWXxCSVR8QkxPQnxCT09MfEJPT0xFQU58QlJFQUt8QlJPV1NFfEJUUkVFfEJVTEt8Qll8Q0FMTHxDQVNDQURFfENBU0NBREVEfENBU0V8Q0hBSU58Q0hBUiBWQVJZSU5HfENIQVJBQ1RFUiBWQVJZSU5HfENIRUNLfENIRUNLUE9JTlR8Q0xPU0V8Q0xVU1RFUkVEfENPQUxFU0NFfENPTFVNTnxDT0xVTU5TfENPTU1FTlR8Q09NTUlUfENPTU1JVFRFRHxDT01QVVRFfENPTk5FQ1R8Q09OU0lTVEVOVHxDT05TVFJBSU5UfENPTlRBSU5TfENPTlRBSU5TVEFCTEV8Q09OVElOVUV8Q09OVkVSVHxDUkVBVEV8Q1JPU1N8Q1VSUkVOVHxDVVJSRU5UX0RBVEV8Q1VSUkVOVF9USU1FfENVUlJFTlRfVElNRVNUQU1QfENVUlJFTlRfVVNFUnxDVVJTT1J8REFUQXxEQVRBQkFTRXxEQVRBQkFTRVN8REFURVRJTUV8REJDQ3xERUFMTE9DQVRFfERFQ3xERUNJTUFMfERFQ0xBUkV8REVGQVVMVHxERUZJTkVSfERFTEFZRUR8REVMRVRFfERFTll8REVTQ3xERVNDUklCRXxERVRFUk1JTklTVElDfERJU0FCTEV8RElTQ0FSRHxESVNLfERJU1RJTkNUfERJU1RJTkNUUk9XfERJU1RSSUJVVEVEfERPfERPVUJMRXxET1VCTEUgUFJFQ0lTSU9OfERST1B8RFVNTVl8RFVNUHxEVU1QRklMRXxEVVBMSUNBVEUgS0VZfEVMU0V8RU5BQkxFfEVOQ0xPU0VEIEJZfEVORHxFTkdJTkV8RU5VTXxFUlJMVkx8RVJST1JTfEVTQ0FQRXxFU0NBUEVEIEJZfEVYQ0VQVHxFWEVDfEVYRUNVVEV8RVhJVHxFWFBMQUlOfEVYVEVOREVEfEZFVENIfEZJRUxEU3xGSUxFfEZJTExGQUNUT1J8RklSU1R8RklYRUR8RkxPQVR8Rk9MTE9XSU5HfEZPUnxGT1IgRUFDSCBST1d8Rk9SQ0V8Rk9SRUlHTnxGUkVFVEVYVHxGUkVFVEVYVFRBQkxFfEZST018RlVMTHxGVU5DVElPTnxHRU9NRVRSWXxHRU9NRVRSWUNPTExFQ1RJT058R0xPQkFMfEdPVE98R1JBTlR8R1JPVVB8SEFORExFUnxIQVNIfEhBVklOR3xIT0xETE9DS3xJREVOVElUWXxJREVOVElUWV9JTlNFUlR8SURFTlRJVFlDT0x8SUZ8SUdOT1JFfElNUE9SVHxJTkRFWHxJTkZJTEV8SU5ORVJ8SU5OT0RCfElOT1VUfElOU0VSVHxJTlR8SU5URUdFUnxJTlRFUlNFQ1R8SU5UT3xJTlZPS0VSfElTT0xBVElPTiBMRVZFTHxKT0lOfEtFWXxLRVlTfEtJTEx8TEFOR1VBR0UgU1FMfExBU1R8TEVGVHxMSU1JVHxMSU5FTk98TElORVN8TElORVNUUklOR3xMT0FEfExPQ0FMfExPQ0t8TE9OR0JMT0J8TE9OR1RFWFR8TUFUQ0h8TUFUQ0hFRHxNRURJVU1CTE9CfE1FRElVTUlOVHxNRURJVU1URVhUfE1FUkdFfE1JRERMRUlOVHxNT0RJRklFUyBTUUwgREFUQXxNT0RJRll8TVVMVElMSU5FU1RSSU5HfE1VTFRJUE9JTlR8TVVMVElQT0xZR09OfE5BVElPTkFMfE5BVElPTkFMIENIQVIgVkFSWUlOR3xOQVRJT05BTCBDSEFSQUNURVJ8TkFUSU9OQUwgQ0hBUkFDVEVSIFZBUllJTkd8TkFUSU9OQUwgVkFSQ0hBUnxOQVRVUkFMfE5DSEFSfE5DSEFSIFZBUkNIQVJ8TkVYVHxOT3xOTyBTUUx8Tk9DSEVDS3xOT0NZQ0xFfE5PTkNMVVNURVJFRHxOVUxMSUZ8TlVNRVJJQ3xPRnxPRkZ8T0ZGU0VUU3xPTnxPUEVOfE9QRU5EQVRBU09VUkNFfE9QRU5RVUVSWXxPUEVOUk9XU0VUfE9QVElNSVpFfE9QVElPTnxPUFRJT05BTExZfE9SREVSfE9VVHxPVVRFUnxPVVRGSUxFfE9WRVJ8UEFSVElBTHxQQVJUSVRJT058UEVSQ0VOVHxQSVZPVHxQTEFOfFBPSU5UfFBPTFlHT058UFJFQ0VESU5HfFBSRUNJU0lPTnxQUkVWfFBSSU1BUll8UFJJTlR8UFJJVklMRUdFU3xQUk9DfFBST0NFRFVSRXxQVUJMSUN8UFVSR0V8UVVJQ0t8UkFJU0VSUk9SfFJFQUR8UkVBRFMgU1FMIERBVEF8UkVBRFRFWFR8UkVBTHxSRUNPTkZJR1VSRXxSRUZFUkVOQ0VTfFJFTEVBU0V8UkVOQU1FfFJFUEVBVEFCTEV8UkVQTElDQVRJT058UkVRVUlSRXxSRVNUT1JFfFJFU1RSSUNUfFJFVFVSTnxSRVRVUk5TfFJFVk9LRXxSSUdIVHxST0xMQkFDS3xST1VUSU5FfFJPV0NPVU5UfFJPV0dVSURDT0x8Uk9XUz98UlRSRUV8UlVMRXxTQVZFfFNBVkVQT0lOVHxTQ0hFTUF8U0VMRUNUfFNFUklBTHxTRVJJQUxJWkFCTEV8U0VTU0lPTnxTRVNTSU9OX1VTRVJ8U0VUfFNFVFVTRVJ8U0hBUkUgTU9ERXxTSE9XfFNIVVRET1dOfFNJTVBMRXxTTUFMTElOVHxTTkFQU0hPVHxTT01FfFNPTkFNRXxTVEFSVHxTVEFSVElORyBCWXxTVEFUSVNUSUNTfFNUQVRVU3xTVFJJUEVEfFNZU1RFTV9VU0VSfFRBQkxFfFRBQkxFU3xUQUJMRVNQQUNFfFRFTVAoPzpPUkFSWSk/fFRFTVBUQUJMRXxURVJNSU5BVEVEIEJZfFRFWFR8VEVYVFNJWkV8VEhFTnxUSU1FU1RBTVB8VElOWUJMT0J8VElOWUlOVHxUSU5ZVEVYVHxUT3xUT1B8VFJBTnxUUkFOU0FDVElPTnxUUkFOU0FDVElPTlN8VFJJR0dFUnxUUlVOQ0FURXxUU0VRVUFMfFRZUEV8VFlQRVN8VU5CT1VOREVEfFVOQ09NTUlUVEVEfFVOREVGSU5FRHxVTklPTnxVTlBJVk9UfFVQREFURXxVUERBVEVURVhUfFVTQUdFfFVTRXxVU0VSfFVTSU5HfFZBTFVFfFZBTFVFU3xWQVJCSU5BUll8VkFSQ0hBUnxWQVJDSEFSQUNURVJ8VkFSWUlOR3xWSUVXfFdBSVRGT1J8V0FSTklOR1N8V0hFTnxXSEVSRXxXSElMRXxXSVRIfFdJVEggUk9MTFVQfFdJVEhJTnxXT1JLfFdSSVRFfFdSSVRFVEVYVClcXGIvZ2ksXG5cdCdib29sZWFuJzogL1xcYig/OlRSVUV8RkFMU0V8TlVMTClcXGIvZ2ksXG5cdCdudW1iZXInOiAvXFxiLT8oMHgpP1xcZCpcXC4/W1xcZGEtZl0rXFxiL2csXG5cdCdvcGVyYXRvcic6IC9cXGIoPzpBTEx8QU5EfEFOWXxCRVRXRUVOfEVYSVNUU3xJTnxMSUtFfE5PVHxPUnxJU3xVTklRVUV8Q0hBUkFDVEVSIFNFVHxDT0xMQVRFfERJVnxPRkZTRVR8UkVHRVhQfFJMSUtFfFNPVU5EUyBMSUtFfFhPUilcXGJ8Wy0rXXsxfXwhfFs9PD5dezEsMn18KCYpezEsMn18XFx8P1xcfHxcXD98XFwqfFxcLy9naSxcblx0J3B1bmN0dWF0aW9uJzogL1s7W1xcXSgpYCwuXS9nXG59O1xuUHJpc20ubGFuZ3VhZ2VzLmhhc2tlbGw9IHtcblx0J2NvbW1lbnQnOiB7XG5cdFx0cGF0dGVybjogLyhefFteLSEjJCUqKz1cXD8mQHx+Ljo8Pl5cXFxcXSkoLS1bXi0hIyQlKis9XFw/JkB8fi46PD5eXFxcXF0uKihcXHI/XFxufCQpfHstW1xcd1xcV10qPy19KS9nbSxcblx0XHRsb29rYmVoaW5kOiB0cnVlXG5cdH0sXG5cdCdjaGFyJzogLycoW15cXFxcXCJdfFxcXFwoW2FiZm5ydHZcXFxcXCInJl18XFxeW0EtWkBbXFxdXFxeX118TlVMfFNPSHxTVFh8RVRYfEVPVHxFTlF8QUNLfEJFTHxCU3xIVHxMRnxWVHxGRnxDUnxTT3xTSXxETEV8REMxfERDMnxEQzN8REM0fE5BS3xTWU58RVRCfENBTnxFTXxTVUJ8RVNDfEZTfEdTfFJTfFVTfFNQfERFTHxcXGQrfG9bMC03XSt8eFswLTlhLWZBLUZdKykpJy9nLFxuXHQnc3RyaW5nJzogL1wiKFteXFxcXFwiXXxcXFxcKFthYmZucnR2XFxcXFwiJyZdfFxcXltBLVpAW1xcXVxcXl9dfE5VTHxTT0h8U1RYfEVUWHxFT1R8RU5RfEFDS3xCRUx8QlN8SFR8TEZ8VlR8RkZ8Q1J8U098U0l8RExFfERDMXxEQzJ8REMzfERDNHxOQUt8U1lOfEVUQnxDQU58RU18U1VCfEVTQ3xGU3xHU3xSU3xVU3xTUHxERUx8XFxkK3xvWzAtN10rfHhbMC05YS1mQS1GXSspfFxcXFxcXHMrXFxcXCkqXCIvZyxcblx0J2tleXdvcmQnIDogL1xcYihjYXNlfGNsYXNzfGRhdGF8ZGVyaXZpbmd8ZG98ZWxzZXxpZnxpbnxpbmZpeGx8aW5maXhyfGluc3RhbmNlfGxldHxtb2R1bGV8bmV3dHlwZXxvZnxwcmltaXRpdmV8dGhlbnx0eXBlfHdoZXJlKVxcYi9nLFxuXHQnaW1wb3J0X3N0YXRlbWVudCcgOiB7XG5cdFx0Ly8gVGhlIGltcG9ydGVkIG9yIGhpZGRlbiBuYW1lcyBhcmUgbm90IGluY2x1ZGVkIGluIHRoaXMgaW1wb3J0XG5cdFx0Ly8gc3RhdGVtZW50LiBUaGlzIGlzIGJlY2F1c2Ugd2Ugd2FudCB0byBoaWdobGlnaHQgdGhvc2UgZXhhY3RseSBsaWtlXG5cdFx0Ly8gd2UgZG8gZm9yIHRoZSBuYW1lcyBpbiB0aGUgcHJvZ3JhbS5cblx0XHRwYXR0ZXJuOiAvKFxcbnxeKVxccyooaW1wb3J0KVxccysocXVhbGlmaWVkXFxzKyk/KChbQS1aXVtfYS16QS1aMC05J10qKShcXC5bQS1aXVtfYS16QS1aMC05J10qKSopKFxccysoYXMpXFxzKygoW0EtWl1bX2EtekEtWjAtOSddKikoXFwuW0EtWl1bX2EtekEtWjAtOSddKikqKSk/KFxccytoaWRpbmdcXGIpPy9nbSxcblx0XHRpbnNpZGU6IHtcblx0XHRcdCdrZXl3b3JkJzogL1xcYihpbXBvcnR8cXVhbGlmaWVkfGFzfGhpZGluZylcXGIvZ1xuXHRcdH1cblx0fSxcblx0Ly8gVGhlc2UgYXJlIGJ1aWx0aW4gdmFyaWFibGVzIG9ubHkuIENvbnN0cnVjdG9ycyBhcmUgaGlnaGxpZ2h0ZWQgbGF0ZXIgYXMgYSBjb25zdGFudC5cblx0J2J1aWx0aW4nOiAvXFxiKGFic3xhY29zfGFjb3NofGFsbHxhbmR8YW55fGFwcGVuZEZpbGV8YXBwcm94UmF0aW9uYWx8YXNUeXBlT2Z8YXNpbnxhc2luaHxhdGFufGF0YW4yfGF0YW5ofGJhc2ljSU9SdW58YnJlYWt8Y2F0Y2h8Y2VpbGluZ3xjaHJ8Y29tcGFyZXxjb25jYXR8Y29uY2F0TWFwfGNvbnN0fGNvc3xjb3NofGN1cnJ5fGN5Y2xlfGRlY29kZUZsb2F0fGRlbm9taW5hdG9yfGRpZ2l0VG9JbnR8ZGl2fGRpdk1vZHxkcm9wfGRyb3BXaGlsZXxlaXRoZXJ8ZWxlbXxlbmNvZGVGbG9hdHxlbnVtRnJvbXxlbnVtRnJvbVRoZW58ZW51bUZyb21UaGVuVG98ZW51bUZyb21Ub3xlcnJvcnxldmVufGV4cHxleHBvbmVudHxmYWlsfGZpbHRlcnxmbGlwfGZsb2F0RGlnaXRzfGZsb2F0UmFkaXh8ZmxvYXRSYW5nZXxmbG9vcnxmbWFwfGZvbGRsfGZvbGRsMXxmb2xkcnxmb2xkcjF8ZnJvbURvdWJsZXxmcm9tRW51bXxmcm9tSW50fGZyb21JbnRlZ2VyfGZyb21JbnRlZ3JhbHxmcm9tUmF0aW9uYWx8ZnN0fGdjZHxnZXRDaGFyfGdldENvbnRlbnRzfGdldExpbmV8Z3JvdXB8aGVhZHxpZHxpblJhbmdlfGluZGV4fGluaXR8aW50VG9EaWdpdHxpbnRlcmFjdHxpb0Vycm9yfGlzQWxwaGF8aXNBbHBoYU51bXxpc0FzY2lpfGlzQ29udHJvbHxpc0Rlbm9ybWFsaXplZHxpc0RpZ2l0fGlzSGV4RGlnaXR8aXNJRUVFfGlzSW5maW5pdGV8aXNMb3dlcnxpc05hTnxpc05lZ2F0aXZlWmVyb3xpc09jdERpZ2l0fGlzUHJpbnR8aXNTcGFjZXxpc1VwcGVyfGl0ZXJhdGV8bGFzdHxsY218bGVuZ3RofGxleHxsZXhEaWdpdHN8bGV4TGl0Q2hhcnxsaW5lc3xsb2d8bG9nQmFzZXxsb29rdXB8bWFwfG1hcE18bWFwTV98bWF4fG1heEJvdW5kfG1heGltdW18bWF5YmV8bWlufG1pbkJvdW5kfG1pbmltdW18bW9kfG5lZ2F0ZXxub3R8bm90RWxlbXxudWxsfG51bWVyYXRvcnxvZGR8b3J8b3JkfG90aGVyd2lzZXxwYWNrfHBpfHByZWR8cHJpbUV4aXRXaXRofHByaW50fHByb2R1Y3R8cHJvcGVyRnJhY3Rpb258cHV0Q2hhcnxwdXRTdHJ8cHV0U3RyTG58cXVvdHxxdW90UmVtfHJhbmdlfHJhbmdlU2l6ZXxyZWFkfHJlYWREZWN8cmVhZEZpbGV8cmVhZEZsb2F0fHJlYWRIZXh8cmVhZElPfHJlYWRJbnR8cmVhZExpc3R8cmVhZExpdENoYXJ8cmVhZExufHJlYWRPY3R8cmVhZFBhcmVufHJlYWRTaWduZWR8cmVhZHN8cmVhZHNQcmVjfHJlYWxUb0ZyYWN8cmVjaXB8cmVtfHJlcGVhdHxyZXBsaWNhdGV8cmV0dXJufHJldmVyc2V8cm91bmR8c2NhbGVGbG9hdHxzY2FubHxzY2FubDF8c2NhbnJ8c2NhbnIxfHNlcXxzZXF1ZW5jZXxzZXF1ZW5jZV98c2hvd3xzaG93Q2hhcnxzaG93SW50fHNob3dMaXN0fHNob3dMaXRDaGFyfHNob3dQYXJlbnxzaG93U2lnbmVkfHNob3dTdHJpbmd8c2hvd3N8c2hvd3NQcmVjfHNpZ25pZmljYW5kfHNpZ251bXxzaW58c2luaHxzbmR8c29ydHxzcGFufHNwbGl0QXR8c3FydHxzdWJ0cmFjdHxzdWNjfHN1bXx0YWlsfHRha2V8dGFrZVdoaWxlfHRhbnx0YW5ofHRocmVhZFRvSU9SZXN1bHR8dG9FbnVtfHRvSW50fHRvSW50ZWdlcnx0b0xvd2VyfHRvUmF0aW9uYWx8dG9VcHBlcnx0cnVuY2F0ZXx1bmN1cnJ5fHVuZGVmaW5lZHx1bmxpbmVzfHVudGlsfHVud29yZHN8dW56aXB8dW56aXAzfHVzZXJFcnJvcnx3b3Jkc3x3cml0ZUZpbGV8emlwfHppcDN8emlwV2l0aHx6aXBXaXRoMylcXGIvZyxcblx0Ly8gZGVjaW1hbCBpbnRlZ2VycyBhbmQgZmxvYXRpbmcgcG9pbnQgbnVtYmVycyB8IG9jdGFsIGludGVnZXJzIHwgaGV4YWRlY2ltYWwgaW50ZWdlcnNcblx0J251bWJlcicgOiAvXFxiKFxcZCsoXFwuXFxkKyk/KFtlRV1bKy1dP1xcZCspP3wwW09vXVswLTddK3wwW1h4XVswLTlhLWZBLUZdKylcXGIvZyxcblx0Ly8gTW9zdCBvZiB0aGlzIGlzIG5lZWRlZCBiZWNhdXNlIG9mIHRoZSBtZWFuaW5nIG9mIGEgc2luZ2xlICcuJy5cblx0Ly8gSWYgaXQgc3RhbmRzIGFsb25lIGZyZWVseSwgaXQgaXMgdGhlIGZ1bmN0aW9uIGNvbXBvc2l0aW9uLlxuXHQvLyBJdCBtYXkgYWxzbyBiZSBhIHNlcGFyYXRvciBiZXR3ZWVuIGEgbW9kdWxlIG5hbWUgYW5kIGFuIGlkZW50aWZpZXIgPT4gbm9cblx0Ly8gb3BlcmF0b3IuIElmIGl0IGNvbWVzIHRvZ2V0aGVyIHdpdGggb3RoZXIgc3BlY2lhbCBjaGFyYWN0ZXJzIGl0IGlzIGFuXG5cdC8vIG9wZXJhdG9yIHRvby5cblx0J29wZXJhdG9yJyA6IC9cXHNcXC5cXHN8KFstISMkJSorPVxcPyZAfH46PD5eXFxcXF0qXFwuWy0hIyQlKis9XFw/JkB8fjo8Pl5cXFxcXSspfChbLSEjJCUqKz1cXD8mQHx+Ojw+XlxcXFxdK1xcLlstISMkJSorPVxcPyZAfH46PD5eXFxcXF0qKXxbLSEjJCUqKz1cXD8mQHx+Ojw+XlxcXFxdK3woYChbQS1aXVtfYS16QS1aMC05J10qXFwuKSpbX2Etel1bX2EtekEtWjAtOSddKmApL2csXG5cdC8vIEluIEhhc2tlbGwsIG5lYXJseSBldmVyeXRoaW5nIGlzIGEgdmFyaWFibGUsIGRvIG5vdCBoaWdobGlnaHQgdGhlc2UuXG5cdCdodmFyaWFibGUnOiAvXFxiKFtBLVpdW19hLXpBLVowLTknXSpcXC4pKltfYS16XVtfYS16QS1aMC05J10qXFxiL2csXG5cdCdjb25zdGFudCc6IC9cXGIoW0EtWl1bX2EtekEtWjAtOSddKlxcLikqW0EtWl1bX2EtekEtWjAtOSddKlxcYi9nLFxuXHQncHVuY3R1YXRpb24nIDogL1t7fVtcXF07KCksLjpdL2dcbn07XG5cblByaXNtLmxhbmd1YWdlcy5wZXJsID0ge1xuXHQnY29tbWVudCc6IFtcblx0XHR7XG5cdFx0XHQvLyBQT0Rcblx0XHRcdHBhdHRlcm46IC8oKD86XnxcXG4pXFxzKik9XFx3K1tcXHNcXFNdKj89Y3V0LisvZyxcblx0XHRcdGxvb2tiZWhpbmQ6IHRydWVcblx0XHR9LFxuXHRcdHtcblx0XHRcdHBhdHRlcm46IC8oXnxbXlxcXFwkXSkjLio/KFxccj9cXG58JCkvZyxcblx0XHRcdGxvb2tiZWhpbmQ6IHRydWVcblx0XHR9XG5cdF0sXG5cdC8vIFRPRE8gQ291bGQgYmUgbmljZSB0byBoYW5kbGUgSGVyZWRvYyB0b28uXG5cdCdzdHJpbmcnOiBbXG5cdFx0Ly8gcS8uLi4vXG5cdFx0L1xcYig/OnF8cXF8cXh8cXcpXFxzKihbXmEtekEtWjAtOVxcc1xce1xcKFxcWzxdKShcXFxcPy4pKj9cXHMqXFwxL2csXG5cdFxuXHRcdC8vIHEgYS4uLmFcblx0XHQvXFxiKD86cXxxcXxxeHxxdylcXHMrKFthLXpBLVowLTldKShcXFxcPy4pKj9cXHMqXFwxL2csXG5cdFxuXHRcdC8vIHEoLi4uKVxuXHRcdC9cXGIoPzpxfHFxfHF4fHF3KVxccypcXCgoW14oKV18XFxcXC4pKlxccypcXCkvZyxcblx0XG5cdFx0Ly8gcXsuLi59XG5cdFx0L1xcYig/OnF8cXF8cXh8cXcpXFxzKlxceyhbXnt9XXxcXFxcLikqXFxzKlxcfS9nLFxuXHRcblx0XHQvLyBxWy4uLl1cblx0XHQvXFxiKD86cXxxcXxxeHxxdylcXHMqXFxbKFteW1xcXV18XFxcXC4pKlxccypcXF0vZyxcblx0XG5cdFx0Ly8gcTwuLi4+XG5cdFx0L1xcYig/OnF8cXF8cXh8cXcpXFxzKjwoW148Pl18XFxcXC4pKlxccyo+L2csXG5cblx0XHQvLyBcIi4uLlwiLCAnLi4uJywgYC4uLmBcblx0XHQvKFwifCd8YCkoXFxcXD8uKSo/XFwxL2dcblx0XSxcblx0J3JlZ2V4JzogW1xuXHRcdC8vIG0vLi4uL1xuXHRcdC9cXGIoPzptfHFyKVxccyooW15hLXpBLVowLTlcXHNcXHtcXChcXFs8XSkoXFxcXD8uKSo/XFxzKlxcMVttc2l4cG9kdWFsZ2NdKi9nLFxuXHRcblx0XHQvLyBtIGEuLi5hXG5cdFx0L1xcYig/Om18cXIpXFxzKyhbYS16QS1aMC05XSkoXFxcXD8uKSo/XFxzKlxcMVttc2l4cG9kdWFsZ2NdKi9nLFxuXHRcblx0XHQvLyBtKC4uLilcblx0XHQvXFxiKD86bXxxcilcXHMqXFwoKFteKCldfFxcXFwuKSpcXHMqXFwpW21zaXhwb2R1YWxnY10qL2csXG5cdFxuXHRcdC8vIG17Li4ufVxuXHRcdC9cXGIoPzptfHFyKVxccypcXHsoW157fV18XFxcXC4pKlxccypcXH1bbXNpeHBvZHVhbGdjXSovZyxcblx0XG5cdFx0Ly8gbVsuLi5dXG5cdFx0L1xcYig/Om18cXIpXFxzKlxcWyhbXltcXF1dfFxcXFwuKSpcXHMqXFxdW21zaXhwb2R1YWxnY10qL2csXG5cdFxuXHRcdC8vIG08Li4uPlxuXHRcdC9cXGIoPzptfHFyKVxccyo8KFtePD5dfFxcXFwuKSpcXHMqPlttc2l4cG9kdWFsZ2NdKi9nLFxuXHRcblx0XHQvLyBzLy4uLi8uLi4vXG5cdFx0L1xcYig/OnN8dHJ8eSlcXHMqKFteYS16QS1aMC05XFxzXFx7XFwoXFxbPF0pKFxcXFw/LikqP1xccypcXDFcXHMqKCg/IVxcMSkufFxcXFwuKSpcXHMqXFwxW21zaXhwb2R1YWxnY2VyXSovZyxcblx0XG5cdFx0Ly8gcyBhLi4uYS4uLmFcblx0XHQvXFxiKD86c3x0cnx5KVxccysoW2EtekEtWjAtOV0pKFxcXFw/LikqP1xccypcXDFcXHMqKCg/IVxcMSkufFxcXFwuKSpcXHMqXFwxW21zaXhwb2R1YWxnY2VyXSovZyxcblx0XG5cdFx0Ly8gcyguLi4pKC4uLilcblx0XHQvXFxiKD86c3x0cnx5KVxccypcXCgoW14oKV18XFxcXC4pKlxccypcXClcXHMqXFwoXFxzKihbXigpXXxcXFxcLikqXFxzKlxcKVttc2l4cG9kdWFsZ2Nlcl0qL2csXG5cdFxuXHRcdC8vIHN7Li4ufXsuLi59XG5cdFx0L1xcYig/OnN8dHJ8eSlcXHMqXFx7KFtee31dfFxcXFwuKSpcXHMqXFx9XFxzKlxce1xccyooW157fV18XFxcXC4pKlxccypcXH1bbXNpeHBvZHVhbGdjZXJdKi9nLFxuXHRcblx0XHQvLyBzWy4uLl1bLi4uXVxuXHRcdC9cXGIoPzpzfHRyfHkpXFxzKlxcWyhbXltcXF1dfFxcXFwuKSpcXHMqXFxdXFxzKlxcW1xccyooW15bXFxdXXxcXFxcLikqXFxzKlxcXVttc2l4cG9kdWFsZ2Nlcl0qL2csXG5cdFxuXHRcdC8vIHM8Li4uPjwuLi4+XG5cdFx0L1xcYig/OnN8dHJ8eSlcXHMqPChbXjw+XXxcXFxcLikqXFxzKj5cXHMqPFxccyooW148Pl18XFxcXC4pKlxccyo+W21zaXhwb2R1YWxnY2VyXSovZyxcblx0XG5cdFx0Ly8gLy4uLi9cblx0XHQvXFwvKFxcWy4rP118XFxcXC58W15cXC9cXHJcXG5dKSpcXC9bbXNpeHBvZHVhbGdjXSooPz1cXHMqKCR8W1xcclxcbiwuO30pJnxcXC0rKj1+PD4hP15dfChsdHxndHxsZXxnZXxlcXxuZXxjbXB8bm90fGFuZHxvcnx4b3J8eClcXGIpKS9nXG5cdF0sXG5cblx0Ly8gRklYTUUgTm90IHN1cmUgYWJvdXQgdGhlIGhhbmRsaW5nIG9mIDo6LCAnLCBhbmQgI1xuXHQndmFyaWFibGUnOiBbXG5cdFx0Ly8gJHteUE9TVE1BVENIfVxuXHRcdC9bJipcXCRAJV1cXHtcXF5bQS1aXStcXH0vZyxcblx0XHQvLyAkXlZcblx0XHQvWyYqXFwkQCVdXFxeW0EtWl9dL2csXG5cdFx0Ly8gJHsuLi59XG5cdFx0L1smKlxcJEAlXSM/KD89XFx7KS8sXG5cdFx0Ly8gJGZvb1xuXHRcdC9bJipcXCRAJV0jPygoOjopKic/KD8hXFxkKVtcXHckXSspKyg6OikqL2lnLFxuXHRcdC8vICQxXG5cdFx0L1smKlxcJEAlXVxcZCsvZyxcblx0XHQvLyAkXywgQF8sICUhXG5cdFx0L1tcXCRAJV1bIVwiI1xcJCUmJygpKissXFwtLlxcLzo7PD0+P0BbXFxcXFxcXV5fYHt8fX5dL2dcblx0XSxcblx0J2ZpbGVoYW5kbGUnOiB7XG5cdFx0Ly8gPD4sIDxGT08+LCBfXG5cdFx0cGF0dGVybjogLzwoPyE9KS4qPnxcXGJfXFxiL2csXG5cdFx0YWxpYXM6ICdzeW1ib2wnXG5cdH0sXG5cdCd2c3RyaW5nJzoge1xuXHRcdC8vIHYxLjIsIDEuMi4zXG5cdFx0cGF0dGVybjogL3ZcXGQrKFxcLlxcZCspKnxcXGQrKFxcLlxcZCspezIsfS9nLFxuXHRcdGFsaWFzOiAnc3RyaW5nJ1xuXHR9LFxuXHQnZnVuY3Rpb24nOiB7XG5cdFx0cGF0dGVybjogL3N1YiBbYS16MC05X10rL2lnLFxuXHRcdGluc2lkZToge1xuXHRcdFx0a2V5d29yZDogL3N1Yi9cblx0XHR9XG5cdH0sXG5cdCdrZXl3b3JkJzogL1xcYihhbnl8YnJlYWt8Y29udGludWV8ZGVmYXVsdHxkZWxldGV8ZGllfGRvfGVsc2V8ZWxzaWZ8ZXZhbHxmb3J8Zm9yZWFjaHxnaXZlbnxnb3RvfGlmfGxhc3R8bG9jYWx8bXl8bmV4dHxvdXJ8cGFja2FnZXxwcmludHxyZWRvfHJlcXVpcmV8c2F5fHN0YXRlfHN1Ynxzd2l0Y2h8dW5kZWZ8dW5sZXNzfHVudGlsfHVzZXx3aGVufHdoaWxlKVxcYi9nLFxuXHQnbnVtYmVyJzogLyhcXG58XFxiKS0/KDB4W1xcZEEtRmEtZl0oXz9bXFxkQS1GYS1mXSkqfDBiWzAxXShfP1swMV0pKnwoXFxkKF8/XFxkKSopP1xcLj9cXGQoXz9cXGQpKihbRWVdLT9cXGQrKT8pXFxiL2csXG5cdCdvcGVyYXRvcic6IC8tW3J3eG9SV1hPZXpzZmRscFNiY3R1Z2tUQk1BQ11cXGJ8Wy0rKj1+XFwvfCZdezEsMn18PD0/fD49P3xcXC57MSwzfXxbIT9cXFxcXl18XFxiKGx0fGd0fGxlfGdlfGVxfG5lfGNtcHxub3R8YW5kfG9yfHhvcnx4KVxcYi9nLFxuXHQncHVuY3R1YXRpb24nOiAvW3t9W1xcXTsoKSw6XS9nXG59O1xuXG4vLyBpc3N1ZXM6IG5lc3RlZCBtdWx0aWxpbmUgY29tbWVudHMsIGhpZ2hsaWdodGluZyBpbnNpZGUgc3RyaW5nIGludGVycG9sYXRpb25zXG5QcmlzbS5sYW5ndWFnZXMuc3dpZnQgPSBQcmlzbS5sYW5ndWFnZXMuZXh0ZW5kKCdjbGlrZScsIHtcblx0J2tleXdvcmQnOiAvXFxiKGFzfGFzc29jaWF0aXZpdHl8YnJlYWt8Y2FzZXxjbGFzc3xjb250aW51ZXxjb252ZW5pZW5jZXxkZWZhdWx0fGRlaW5pdHxkaWRTZXR8ZG98ZHluYW1pY1R5cGV8ZWxzZXxlbnVtfGV4dGVuc2lvbnxmYWxsdGhyb3VnaHxmaW5hbHxmb3J8ZnVuY3xnZXR8aWZ8aW1wb3J0fGlufGluZml4fGluaXR8aW5vdXR8aW50ZXJuYWx8aXN8bGF6eXxsZWZ0fGxldHxtdXRhdGluZ3xuZXd8bm9uZXxub25tdXRhdGluZ3xvcGVyYXRvcnxvcHRpb25hbHxvdmVycmlkZXxwb3N0Zml4fHByZWNlZGVuY2V8cHJlZml4fHByaXZhdGV8cHJvdG9jb2x8cHVibGljfHJlcXVpcmVkfHJldHVybnxyaWdodHxzYWZlfHNlbGZ8U2VsZnxzZXR8c3RhdGljfHN0cnVjdHxzdWJzY3JpcHR8c3VwZXJ8c3dpdGNofFR5cGV8dHlwZWFsaWFzfHVub3duZWR8dW5vd25lZHx1bnNhZmV8dmFyfHdlYWt8d2hlcmV8d2hpbGV8d2lsbFNldHxfX0NPTFVNTl9ffF9fRklMRV9ffF9fRlVOQ1RJT05fX3xfX0xJTkVfXylcXGIvZyxcblx0J251bWJlcic6IC9cXGIoW1xcZF9dKyhcXC5bXFxkZV9dKyk/fDB4W2EtZjAtOV9dKyhcXC5bYS1mMC05cF9dKyk/fDBiWzAxX10rfDBvWzAtN19dKylcXGIvZ2ksXG5cdCdjb25zdGFudCc6IC9cXGIobmlsfFtBLVpfXXsyLH18a1tBLVpdW0EtWmEtel9dKylcXGIvZyxcblx0J2F0cnVsZSc6IC9cXEBcXGIoSUJPdXRsZXR8SUJEZXNpZ25hYmxlfElCQWN0aW9ufElCSW5zcGVjdGFibGV8Y2xhc3NfcHJvdG9jb2x8ZXhwb3J0ZWR8bm9yZXR1cm58TlNDb3B5aW5nfE5TTWFuYWdlZHxvYmpjfFVJQXBwbGljYXRpb25NYWlufGF1dG9fY2xvc3VyZSlcXGIvZyxcblx0J2J1aWx0aW4nOiAvXFxiKFtBLVpdXFxTK3xhYnN8YWR2YW5jZXxhbGlnbm9mfGFsaWdub2ZWYWx1ZXxhc3NlcnR8Y29udGFpbnN8Y291bnR8Y291bnRFbGVtZW50c3xkZWJ1Z1ByaW50fGRlYnVnUHJpbnRsbnxkaXN0YW5jZXxkcm9wRmlyc3R8ZHJvcExhc3R8ZHVtcHxlbnVtZXJhdGV8ZXF1YWx8ZmlsdGVyfGZpbmR8Zmlyc3R8Z2V0VmFMaXN0fGluZGljZXN8aXNFbXB0eXxqb2lufGxhc3R8bGF6eXxsZXhpY29ncmFwaGljYWxDb21wYXJlfG1hcHxtYXh8bWF4RWxlbWVudHxtaW58bWluRWxlbWVudHxudW1lcmljQ2FzdHxvdmVybGFwc3xwYXJ0aXRpb258cHJlZml4fHByaW50fHByaW50bG58cmVkdWNlfHJlZmxlY3R8cmV2ZXJzZXxzaXplb2Z8c2l6ZW9mVmFsdWV8c29ydHxzb3J0ZWR8c3BsaXR8c3RhcnRzV2l0aHxzdHJpZGV8c3RyaWRlb2Z8c3RyaWRlb2ZWYWx1ZXxzdWZmaXh8c3dhcHx0b0RlYnVnU3RyaW5nfHRvU3RyaW5nfHRyYW5zY29kZXx1bmRlcmVzdGltYXRlQ291bnR8dW5zYWZlQml0Q2FzdHx3aXRoRXh0ZW5kZWRMaWZldGltZXx3aXRoVW5zYWZlTXV0YWJsZVBvaW50ZXJ8d2l0aFVuc2FmZU11dGFibGVQb2ludGVyc3x3aXRoVW5zYWZlUG9pbnRlcnx3aXRoVW5zYWZlUG9pbnRlcnN8d2l0aFZhTGlzdClcXGIvZ1xufSk7XG5cblByaXNtLmxhbmd1YWdlcy5jcHAgPSBQcmlzbS5sYW5ndWFnZXMuZXh0ZW5kKCdjJywge1xuXHQna2V5d29yZCc6IC9cXGIoYWxpZ25hc3xhbGlnbm9mfGFzbXxhdXRvfGJvb2x8YnJlYWt8Y2FzZXxjYXRjaHxjaGFyfGNoYXIxNl90fGNoYXIzMl90fGNsYXNzfGNvbXBsfGNvbnN0fGNvbnN0ZXhwcnxjb25zdF9jYXN0fGNvbnRpbnVlfGRlY2x0eXBlfGRlZmF1bHR8ZGVsZXRlfGRlbGV0ZVxcW1xcXXxkb3xkb3VibGV8ZHluYW1pY19jYXN0fGVsc2V8ZW51bXxleHBsaWNpdHxleHBvcnR8ZXh0ZXJufGZsb2F0fGZvcnxmcmllbmR8Z290b3xpZnxpbmxpbmV8aW50fGxvbmd8bXV0YWJsZXxuYW1lc3BhY2V8bmV3fG5ld1xcW1xcXXxub2V4Y2VwdHxudWxscHRyfG9wZXJhdG9yfHByaXZhdGV8cHJvdGVjdGVkfHB1YmxpY3xyZWdpc3RlcnxyZWludGVycHJldF9jYXN0fHJldHVybnxzaG9ydHxzaWduZWR8c2l6ZW9mfHN0YXRpY3xzdGF0aWNfYXNzZXJ0fHN0YXRpY19jYXN0fHN0cnVjdHxzd2l0Y2h8dGVtcGxhdGV8dGhpc3x0aHJlYWRfbG9jYWx8dGhyb3d8dHJ5fHR5cGVkZWZ8dHlwZWlkfHR5cGVuYW1lfHVuaW9ufHVuc2lnbmVkfHVzaW5nfHZpcnR1YWx8dm9pZHx2b2xhdGlsZXx3Y2hhcl90fHdoaWxlKVxcYi9nLFxuXHQnYm9vbGVhbic6IC9cXGIodHJ1ZXxmYWxzZSlcXGIvZyxcblx0J29wZXJhdG9yJzogL1stK117MSwyfXwhPT98PHsxLDJ9PT98PnsxLDJ9PT98XFwtPnw6ezEsMn18PXsxLDJ9fFxcXnx+fCV8JnsxLDJ9fFxcfD9cXHx8XFw/fFxcKnxcXC98XFxiKGFuZHxhbmRfZXF8Yml0YW5kfGJpdG9yfG5vdHxub3RfZXF8b3J8b3JfZXF8eG9yfHhvcl9lcSlcXGIvZ1xufSk7XG5cblByaXNtLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoJ2NwcCcsICdrZXl3b3JkJywge1xuXHQnY2xhc3MtbmFtZSc6IHtcblx0XHRwYXR0ZXJuOiAvKGNsYXNzXFxzKylbYS16MC05X10rL2lnLFxuXHRcdGxvb2tiZWhpbmQ6IHRydWUsXG5cdH0sXG59KTtcblByaXNtLmxhbmd1YWdlcy5odHRwID0ge1xuICAgICdyZXF1ZXN0LWxpbmUnOiB7XG4gICAgICAgIHBhdHRlcm46IC9eKFBPU1R8R0VUfFBVVHxERUxFVEV8T1BUSU9OU3xQQVRDSHxUUkFDRXxDT05ORUNUKVxcYlxcc2h0dHBzPzpcXC9cXC9cXFMrXFxzSFRUUFxcL1swLTkuXSsvZyxcbiAgICAgICAgaW5zaWRlOiB7XG4gICAgICAgICAgICAvLyBIVFRQIFZlcmJcbiAgICAgICAgICAgIHByb3BlcnR5OiAvXlxcYihQT1NUfEdFVHxQVVR8REVMRVRFfE9QVElPTlN8UEFUQ0h8VFJBQ0V8Q09OTkVDVClcXGIvZyxcbiAgICAgICAgICAgIC8vIFBhdGggb3IgcXVlcnkgYXJndW1lbnRcbiAgICAgICAgICAgICdhdHRyLW5hbWUnOiAvOlxcdysvZ1xuICAgICAgICB9XG4gICAgfSxcbiAgICAncmVzcG9uc2Utc3RhdHVzJzoge1xuICAgICAgICBwYXR0ZXJuOiAvXkhUVFBcXC8xLlswMV0gWzAtOV0rLiovZyxcbiAgICAgICAgaW5zaWRlOiB7XG4gICAgICAgICAgICAvLyBTdGF0dXMsIGUuZy4gMjAwIE9LXG4gICAgICAgICAgICBwcm9wZXJ0eTogL1swLTldK1tBLVpcXHMtXSskL2lnXG4gICAgICAgIH1cbiAgICB9LFxuICAgIC8vIEhUVFAgaGVhZGVyIG5hbWVcbiAgICBrZXl3b3JkOiAvXltcXHctXSs6KD89LispL2dtXG59O1xuXG4vLyBDcmVhdGUgYSBtYXBwaW5nIG9mIENvbnRlbnQtVHlwZSBoZWFkZXJzIHRvIGxhbmd1YWdlIGRlZmluaXRpb25zXG52YXIgaHR0cExhbmd1YWdlcyA9IHtcbiAgICAnYXBwbGljYXRpb24vanNvbic6IFByaXNtLmxhbmd1YWdlcy5qYXZhc2NyaXB0LFxuICAgICdhcHBsaWNhdGlvbi94bWwnOiBQcmlzbS5sYW5ndWFnZXMubWFya3VwLFxuICAgICd0ZXh0L3htbCc6IFByaXNtLmxhbmd1YWdlcy5tYXJrdXAsXG4gICAgJ3RleHQvaHRtbCc6IFByaXNtLmxhbmd1YWdlcy5tYXJrdXBcbn07XG5cbi8vIEluc2VydCBlYWNoIGNvbnRlbnQgdHlwZSBwYXJzZXIgdGhhdCBoYXMgaXRzIGFzc29jaWF0ZWQgbGFuZ3VhZ2Vcbi8vIGN1cnJlbnRseSBsb2FkZWQuXG5mb3IgKHZhciBjb250ZW50VHlwZSBpbiBodHRwTGFuZ3VhZ2VzKSB7XG4gICAgaWYgKGh0dHBMYW5ndWFnZXNbY29udGVudFR5cGVdKSB7XG4gICAgICAgIHZhciBvcHRpb25zID0ge307XG4gICAgICAgIG9wdGlvbnNbY29udGVudFR5cGVdID0ge1xuICAgICAgICAgICAgcGF0dGVybjogbmV3IFJlZ0V4cCgnKGNvbnRlbnQtdHlwZTpcXFxccyonICsgY29udGVudFR5cGUgKyAnW1xcXFx3XFxcXFddKj8pXFxcXG5cXFxcbltcXFxcd1xcXFxXXSonLCAnZ2knKSxcbiAgICAgICAgICAgIGxvb2tiZWhpbmQ6IHRydWUsXG4gICAgICAgICAgICBpbnNpZGU6IHtcbiAgICAgICAgICAgICAgICByZXN0OiBodHRwTGFuZ3VhZ2VzW2NvbnRlbnRUeXBlXVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBQcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKCdodHRwJywgJ2tleXdvcmQnLCBvcHRpb25zKTtcbiAgICB9XG59XG5cblByaXNtLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoJ3BocCcsICd2YXJpYWJsZScsIHtcblx0J3RoaXMnOiAvXFwkdGhpcy9nLFxuXHQnZ2xvYmFsJzogL1xcJF8/KEdMT0JBTFN8U0VSVkVSfEdFVHxQT1NUfEZJTEVTfFJFUVVFU1R8U0VTU0lPTnxFTlZ8Q09PS0lFfEhUVFBfUkFXX1BPU1RfREFUQXxhcmdjfGFyZ3Z8cGhwX2Vycm9ybXNnfGh0dHBfcmVzcG9uc2VfaGVhZGVyKS9nLFxuXHQnc2NvcGUnOiB7XG5cdFx0cGF0dGVybjogL1xcYltcXHdcXFxcXSs6Oi9nLFxuXHRcdGluc2lkZToge1xuXHRcdFx0a2V5d29yZDogLyhzdGF0aWN8c2VsZnxwYXJlbnQpLyxcblx0XHRcdHB1bmN0dWF0aW9uOiAvKDo6fFxcXFwpL1xuXHRcdH1cblx0fVxufSk7XG5QcmlzbS5sYW5ndWFnZXMudHdpZyA9IHtcblx0J2NvbW1lbnQnOiAvXFx7XFwjW1xcc1xcU10qP1xcI1xcfS9nLFxuXHQndGFnJzoge1xuXHRcdHBhdHRlcm46IC8oXFx7XFx7W1xcc1xcU10qP1xcfVxcfXxcXHtcXCVbXFxzXFxTXSo/XFwlXFx9KS9nLFxuXHRcdGluc2lkZToge1xuXHRcdFx0J2xkJzoge1xuXHRcdFx0XHRwYXR0ZXJuOiAvXihcXHtcXHtcXC0/fFxce1xcJVxcLT9cXHMqXFx3KykvLFxuXHRcdFx0XHRpbnNpZGU6IHtcblx0XHRcdFx0XHQncHVuY3R1YXRpb24nOiAvXihcXHtcXHt8XFx7XFwlKVxcLT8vLFxuXHRcdFx0XHRcdCdrZXl3b3JkJzogL1xcdysvXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHQncmQnOiB7XG5cdFx0XHRcdHBhdHRlcm46IC9cXC0/KFxcJVxcfXxcXH1cXH0pJC8sXG5cdFx0XHRcdGluc2lkZToge1xuXHRcdFx0XHRcdCdwdW5jdHVhdGlvbic6IC8uKi9cblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdCdzdHJpbmcnOiB7XG5cdFx0XHRcdHBhdHRlcm46IC8oXCJ8JykoXFxcXD8uKSo/XFwxL2csXG5cdFx0XHRcdGluc2lkZToge1xuXHRcdFx0XHRcdCdwdW5jdHVhdGlvbic6IC9eKCd8XCIpfCgnfFwiKSQvZ1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0J2tleXdvcmQnOiAvXFxiKGlmKVxcYi9nLFxuXHRcdFx0J2Jvb2xlYW4nOiAvXFxiKHRydWV8ZmFsc2V8bnVsbClcXGIvZyxcblx0XHRcdCdudW1iZXInOiAvXFxiLT8oMHhbXFxkQS1GYS1mXSt8XFxkKlxcLj9cXGQrKFtFZV0tP1xcZCspPylcXGIvZyxcblx0XHRcdCdvcGVyYXRvcic6IC89PXw9fFxcIT18PHw+fD49fDw9fFxcK3xcXC18fnxcXCp8XFwvfFxcL1xcL3wlfFxcKlxcKnxcXHwvZyxcblx0XHRcdCdzcGFjZS1vcGVyYXRvcic6IHtcblx0XHRcdFx0cGF0dGVybjogLyhcXHMpKFxcYihub3R8YlxcLWFuZHxiXFwteG9yfGJcXC1vcnxhbmR8b3J8aW58bWF0Y2hlc3xzdGFydHMgd2l0aHxlbmRzIHdpdGh8aXMpXFxifFxcP3w6fFxcP1xcOikoPz1cXHMpL2csXG5cdFx0XHRcdGxvb2tiZWhpbmQ6IHRydWUsXG5cdFx0XHRcdGluc2lkZToge1xuXHRcdFx0XHRcdCdvcGVyYXRvcic6IC8uKi9cblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdCdwcm9wZXJ0eSc6IC9cXGJbYS16QS1aX11bYS16QS1aMC05X10qXFxiL2csXG5cdFx0XHQncHVuY3R1YXRpb24nOiAvXFwofFxcKXxcXFtcXF18XFxbfFxcXXxcXHt8XFx9fFxcOnxcXC58LC9nXG5cdFx0fVxuXHR9LFxuXG5cdC8vIFRoZSByZXN0IGNhbiBiZSBwYXJzZWQgYXMgSFRNTFxuXHQnb3RoZXInOiB7XG5cdFx0cGF0dGVybjogL1tcXHNcXFNdKi8sXG5cdFx0aW5zaWRlOiBQcmlzbS5sYW5ndWFnZXMubWFya3VwXG5cdH1cbn07XG5cblByaXNtLmxhbmd1YWdlcy5jc2hhcnAgPSBQcmlzbS5sYW5ndWFnZXMuZXh0ZW5kKCdjbGlrZScsIHtcblx0J2tleXdvcmQnOiAvXFxiKGFic3RyYWN0fGFzfGJhc2V8Ym9vbHxicmVha3xieXRlfGNhc2V8Y2F0Y2h8Y2hhcnxjaGVja2VkfGNsYXNzfGNvbnN0fGNvbnRpbnVlfGRlY2ltYWx8ZGVmYXVsdHxkZWxlZ2F0ZXxkb3xkb3VibGV8ZWxzZXxlbnVtfGV2ZW50fGV4cGxpY2l0fGV4dGVybnxmYWxzZXxmaW5hbGx5fGZpeGVkfGZsb2F0fGZvcnxmb3JlYWNofGdvdG98aWZ8aW1wbGljaXR8aW58aW50fGludGVyZmFjZXxpbnRlcm5hbHxpc3xsb2NrfGxvbmd8bmFtZXNwYWNlfG5ld3xudWxsfG9iamVjdHxvcGVyYXRvcnxvdXR8b3ZlcnJpZGV8cGFyYW1zfHByaXZhdGV8cHJvdGVjdGVkfHB1YmxpY3xyZWFkb25seXxyZWZ8cmV0dXJufHNieXRlfHNlYWxlZHxzaG9ydHxzaXplb2Z8c3RhY2thbGxvY3xzdGF0aWN8c3RyaW5nfHN0cnVjdHxzd2l0Y2h8dGhpc3x0aHJvd3x0cnVlfHRyeXx0eXBlb2Z8dWludHx1bG9uZ3x1bmNoZWNrZWR8dW5zYWZlfHVzaG9ydHx1c2luZ3x2aXJ0dWFsfHZvaWR8dm9sYXRpbGV8d2hpbGV8YWRkfGFsaWFzfGFzY2VuZGluZ3xhc3luY3xhd2FpdHxkZXNjZW5kaW5nfGR5bmFtaWN8ZnJvbXxnZXR8Z2xvYmFsfGdyb3VwfGludG98am9pbnxsZXR8b3JkZXJieXxwYXJ0aWFsfHJlbW92ZXxzZWxlY3R8c2V0fHZhbHVlfHZhcnx3aGVyZXx5aWVsZClcXGIvZyxcblx0J3N0cmluZyc6IC9APyhcInwnKShcXFxcPy4pKj9cXDEvZyxcblx0J3ByZXByb2Nlc3Nvcic6IC9eXFxzKiMuKi9nbSxcblx0J251bWJlcic6IC9cXGItPygweCk/XFxkKlxcLj9cXGQrXFxiL2dcbn0pO1xuXG5QcmlzbS5sYW5ndWFnZXMuaW5pPSB7XHJcblx0J2NvbW1lbnQnOiAvXlxccyo7LiokL2dtLFxyXG5cdCdpbXBvcnRhbnQnOiAvXFxbLio/XFxdL2dtLFxyXG5cdCdjb25zdGFudCc6IC9eXFxzKlteXFxzXFw9XSs/KD89WyBcXHRdKlxcPSkvZ20sXHJcblx0J2F0dHItdmFsdWUnOiB7XHJcblx0XHRwYXR0ZXJuOiAvXFw9LiovZ20sIFxyXG5cdFx0aW5zaWRlOiB7XHJcblx0XHRcdCdwdW5jdHVhdGlvbic6IC9eW1xcPV0vZ1xyXG5cdFx0fVxyXG5cdH1cclxufTtcbi8qKlxuICogT3JpZ2luYWwgYnkgQWFyb24gSGFydW46IGh0dHA6Ly9hYWhhY3JlYXRpdmUuY29tLzIwMTIvMDcvMzEvcGhwLXN5bnRheC1oaWdobGlnaHRpbmctcHJpc20vXG4gKiBNb2RpZmllZCBieSBNaWxlcyBKb2huc29uOiBodHRwOi8vbWlsZXNqLm1lXG4gKlxuICogU3VwcG9ydHMgdGhlIGZvbGxvd2luZzpcbiAqIFx0XHQtIEV4dGVuZHMgY2xpa2Ugc3ludGF4XG4gKiBcdFx0LSBTdXBwb3J0IGZvciBQSFAgNS4zKyAobmFtZXNwYWNlcywgdHJhaXRzLCBnZW5lcmF0b3JzLCBldGMpXG4gKiBcdFx0LSBTbWFydGVyIGNvbnN0YW50IGFuZCBmdW5jdGlvbiBtYXRjaGluZ1xuICpcbiAqIEFkZHMgdGhlIGZvbGxvd2luZyBuZXcgdG9rZW4gY2xhc3NlczpcbiAqIFx0XHRjb25zdGFudCwgZGVsaW1pdGVyLCB2YXJpYWJsZSwgZnVuY3Rpb24sIHBhY2thZ2VcbiAqL1xuXG5QcmlzbS5sYW5ndWFnZXMucGhwID0gUHJpc20ubGFuZ3VhZ2VzLmV4dGVuZCgnY2xpa2UnLCB7XG5cdCdrZXl3b3JkJzogL1xcYihhbmR8b3J8eG9yfGFycmF5fGFzfGJyZWFrfGNhc2V8Y2Z1bmN0aW9ufGNsYXNzfGNvbnN0fGNvbnRpbnVlfGRlY2xhcmV8ZGVmYXVsdHxkaWV8ZG98ZWxzZXxlbHNlaWZ8ZW5kZGVjbGFyZXxlbmRmb3J8ZW5kZm9yZWFjaHxlbmRpZnxlbmRzd2l0Y2h8ZW5kd2hpbGV8ZXh0ZW5kc3xmb3J8Zm9yZWFjaHxmdW5jdGlvbnxpbmNsdWRlfGluY2x1ZGVfb25jZXxnbG9iYWx8aWZ8bmV3fHJldHVybnxzdGF0aWN8c3dpdGNofHVzZXxyZXF1aXJlfHJlcXVpcmVfb25jZXx2YXJ8d2hpbGV8YWJzdHJhY3R8aW50ZXJmYWNlfHB1YmxpY3xpbXBsZW1lbnRzfHByaXZhdGV8cHJvdGVjdGVkfHBhcmVudHx0aHJvd3xudWxsfGVjaG98cHJpbnR8dHJhaXR8bmFtZXNwYWNlfGZpbmFsfHlpZWxkfGdvdG98aW5zdGFuY2VvZnxmaW5hbGx5fHRyeXxjYXRjaClcXGIvaWcsXG5cdCdjb25zdGFudCc6IC9cXGJbQS1aMC05X117Mix9XFxiL2csXG5cdCdjb21tZW50Jzoge1xuXHRcdHBhdHRlcm46IC8oXnxbXlxcXFxdKShcXC9cXCpbXFx3XFxXXSo/XFwqXFwvfChefFteOl0pKFxcL1xcL3wjKS4qPyhcXHI/XFxufCQpKS9nLFxuXHRcdGxvb2tiZWhpbmQ6IHRydWVcblx0fVxufSk7XG5cblByaXNtLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoJ3BocCcsICdrZXl3b3JkJywge1xuXHQnZGVsaW1pdGVyJzogLyhcXD8+fDxcXD9waHB8PFxcPykvaWcsXG5cdCd2YXJpYWJsZSc6IC8oXFwkXFx3KylcXGIvaWcsXG5cdCdwYWNrYWdlJzoge1xuXHRcdHBhdHRlcm46IC8oXFxcXHxuYW1lc3BhY2VcXHMrfHVzZVxccyspW1xcd1xcXFxdKy9nLFxuXHRcdGxvb2tiZWhpbmQ6IHRydWUsXG5cdFx0aW5zaWRlOiB7XG5cdFx0XHRwdW5jdHVhdGlvbjogL1xcXFwvXG5cdFx0fVxuXHR9XG59KTtcblxuLy8gTXVzdCBiZSBkZWZpbmVkIGFmdGVyIHRoZSBmdW5jdGlvbiBwYXR0ZXJuXG5QcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKCdwaHAnLCAnb3BlcmF0b3InLCB7XG5cdCdwcm9wZXJ0eSc6IHtcblx0XHRwYXR0ZXJuOiAvKC0+KVtcXHddKy9nLFxuXHRcdGxvb2tiZWhpbmQ6IHRydWVcblx0fVxufSk7XG5cbi8vIEFkZCBIVE1MIHN1cHBvcnQgb2YgdGhlIG1hcmt1cCBsYW5ndWFnZSBleGlzdHNcbmlmIChQcmlzbS5sYW5ndWFnZXMubWFya3VwKSB7XG5cblx0Ly8gVG9rZW5pemUgYWxsIGlubGluZSBQSFAgYmxvY2tzIHRoYXQgYXJlIHdyYXBwZWQgaW4gPD9waHAgPz5cblx0Ly8gVGhpcyBhbGxvd3MgZm9yIGVhc3kgUEhQICsgbWFya3VwIGhpZ2hsaWdodGluZ1xuXHRQcmlzbS5ob29rcy5hZGQoJ2JlZm9yZS1oaWdobGlnaHQnLCBmdW5jdGlvbihlbnYpIHtcblx0XHRpZiAoZW52Lmxhbmd1YWdlICE9PSAncGhwJykge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGVudi50b2tlblN0YWNrID0gW107XG5cblx0XHRlbnYuYmFja3VwQ29kZSA9IGVudi5jb2RlO1xuXHRcdGVudi5jb2RlID0gZW52LmNvZGUucmVwbGFjZSgvKD86PFxcP3BocHw8XFw/KVtcXHdcXFddKj8oPzpcXD8+KS9pZywgZnVuY3Rpb24obWF0Y2gpIHtcblx0XHRcdGVudi50b2tlblN0YWNrLnB1c2gobWF0Y2gpO1xuXG5cdFx0XHRyZXR1cm4gJ3t7e1BIUCcgKyBlbnYudG9rZW5TdGFjay5sZW5ndGggKyAnfX19Jztcblx0XHR9KTtcblx0fSk7XG5cblx0Ly8gUmVzdG9yZSBlbnYuY29kZSBmb3Igb3RoZXIgcGx1Z2lucyAoZS5nLiBsaW5lLW51bWJlcnMpXG5cdFByaXNtLmhvb2tzLmFkZCgnYmVmb3JlLWluc2VydCcsIGZ1bmN0aW9uKGVudikge1xuXHRcdGlmIChlbnYubGFuZ3VhZ2UgPT09ICdwaHAnKSB7XG5cdFx0XHRlbnYuY29kZSA9IGVudi5iYWNrdXBDb2RlO1xuXHRcdFx0ZGVsZXRlIGVudi5iYWNrdXBDb2RlO1xuXHRcdH1cblx0fSk7XG5cblx0Ly8gUmUtaW5zZXJ0IHRoZSB0b2tlbnMgYWZ0ZXIgaGlnaGxpZ2h0aW5nXG5cdFByaXNtLmhvb2tzLmFkZCgnYWZ0ZXItaGlnaGxpZ2h0JywgZnVuY3Rpb24oZW52KSB7XG5cdFx0aWYgKGVudi5sYW5ndWFnZSAhPT0gJ3BocCcpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRmb3IgKHZhciBpID0gMCwgdDsgdCA9IGVudi50b2tlblN0YWNrW2ldOyBpKyspIHtcblx0XHRcdGVudi5oaWdobGlnaHRlZENvZGUgPSBlbnYuaGlnaGxpZ2h0ZWRDb2RlLnJlcGxhY2UoJ3t7e1BIUCcgKyAoaSArIDEpICsgJ319fScsIFByaXNtLmhpZ2hsaWdodCh0LCBlbnYuZ3JhbW1hciwgJ3BocCcpKTtcblx0XHR9XG5cblx0XHRlbnYuZWxlbWVudC5pbm5lckhUTUwgPSBlbnYuaGlnaGxpZ2h0ZWRDb2RlO1xuXHR9KTtcblxuXHQvLyBXcmFwIHRva2VucyBpbiBjbGFzc2VzIHRoYXQgYXJlIG1pc3NpbmcgdGhlbVxuXHRQcmlzbS5ob29rcy5hZGQoJ3dyYXAnLCBmdW5jdGlvbihlbnYpIHtcblx0XHRpZiAoZW52Lmxhbmd1YWdlID09PSAncGhwJyAmJiBlbnYudHlwZSA9PT0gJ21hcmt1cCcpIHtcblx0XHRcdGVudi5jb250ZW50ID0gZW52LmNvbnRlbnQucmVwbGFjZSgvKFxce1xce1xce1BIUFswLTldK1xcfVxcfVxcfSkvZywgXCI8c3BhbiBjbGFzcz1cXFwidG9rZW4gcGhwXFxcIj4kMTwvc3Bhbj5cIik7XG5cdFx0fVxuXHR9KTtcblxuXHQvLyBBZGQgdGhlIHJ1bGVzIGJlZm9yZSBhbGwgb3RoZXJzXG5cdFByaXNtLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoJ3BocCcsICdjb21tZW50Jywge1xuXHRcdCdtYXJrdXAnOiB7XG5cdFx0XHRwYXR0ZXJuOiAvPFteP11cXC8/KC4qPyk+L2csXG5cdFx0XHRpbnNpZGU6IFByaXNtLmxhbmd1YWdlcy5tYXJrdXBcblx0XHR9LFxuXHRcdCdwaHAnOiAvXFx7XFx7XFx7UEhQWzAtOV0rXFx9XFx9XFx9L2dcblx0fSk7XG59XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG5cbi8qKlxuICogQW5pbWF0aW9uIGhlbHBlci5cbiAqL1xudmFyIEFuaW1hdG9yID0gZnVuY3Rpb24oZHVyYXRpb24pIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuZHVyYXRpb24gPSBkdXJhdGlvbjtcbiAgICB0aGlzLl9zdGFydCA9IERhdGUubm93KCk7XG59O1xudXRpbHMuaW5oZXJpdChBbmltYXRvciwgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vKipcbiAqIEdldCB0aGUgdGltZSBpbiB0aGUgYW5pbWF0aW9uXG4gKiBAcmV0dXJuIHtmbG9hdH0gYmV0d2VlbiAwIGFuZCAxXG4gKi9cbkFuaW1hdG9yLnByb3RvdHlwZS50aW1lID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGVsYXBzZWQgPSBEYXRlLm5vdygpIC0gdGhpcy5fc3RhcnQ7XG4gICAgcmV0dXJuIChlbGFwc2VkICUgdGhpcy5kdXJhdGlvbikgLyB0aGlzLmR1cmF0aW9uO1xufTtcblxuLyoqXG4gKiBSZXNldCB0aGUgYW5pbWF0aW9uIHByb2dyZXNzIHRvIDAuXG4gKi9cbkFuaW1hdG9yLnByb3RvdHlwZS5yZXNldCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3N0YXJ0ID0gRGF0ZS5ub3coKTtcbn07XG5cbmV4cG9ydHMuQW5pbWF0b3IgPSBBbmltYXRvcjsiLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xudmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnLmpzJyk7XG5jb25maWcgPSBjb25maWcuY29uZmlnO1xuXG4vKipcbiAqIEhUTUwgY2FudmFzIHdpdGggZHJhd2luZyBjb252aW5pZW5jZSBmdW5jdGlvbnMuXG4gKi9cbnZhciBDYW52YXMgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9yZW5kZXJlZF9yZWdpb24gPSBbbnVsbCwgbnVsbCwgbnVsbCwgbnVsbF07IC8vIHgxLHkxLHgyLHkyXG5cbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX2xheW91dCgpO1xuICAgIHRoaXMuX2luaXRfcHJvcGVydGllcygpO1xuICAgIHRoaXMuX2xhc3Rfc2V0X29wdGlvbnMgPSB7fTtcblxuICAgIHRoaXMuX3RleHRfc2l6ZV9jYWNoZSA9IHt9O1xuICAgIHRoaXMuX3RleHRfc2l6ZV9hcnJheSA9IFtdO1xuICAgIHRoaXMuX3RleHRfc2l6ZV9jYWNoZV9zaXplID0gMTAwMDtcblxuICAgIC8vIFNldCBkZWZhdWx0IHNpemUuXG4gICAgdGhpcy53aWR0aCA9IDQwMDtcbiAgICB0aGlzLmhlaWdodCA9IDMwMDtcbn07XG51dGlscy5pbmhlcml0KENhbnZhcywgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vKipcbiAqIExheW91dCB0aGUgZWxlbWVudHMgZm9yIHRoZSBjYW52YXMuXG4gKiBDcmVhdGVzIGB0aGlzLmVsYFxuICovXG5DYW52YXMucHJvdG90eXBlLl9sYXlvdXQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9jYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICB0aGlzLl9jYW52YXMuc2V0QXR0cmlidXRlKCdjbGFzcycsICdwb3N0ZXIgaGlkZGVuLWNhbnZhcycpO1xuICAgIHRoaXMuY29udGV4dCA9IHRoaXMuX2NhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgICAgICBcbiAgICAvLyBTdHJldGNoIHRoZSBpbWFnZSBmb3IgcmV0aW5hIHN1cHBvcnQuXG4gICAgdGhpcy5zY2FsZSgyLDIpO1xufTtcblxuLyoqXG4gKiBNYWtlIHRoZSBwcm9wZXJ0aWVzIG9mIHRoZSBjbGFzcy5cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5faW5pdF9wcm9wZXJ0aWVzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogSGVpZ2h0IG9mIHRoZSBjYW52YXNcbiAgICAgKiBAcmV0dXJuIHtmbG9hdH1cbiAgICAgKi9cbiAgICB0aGlzLnByb3BlcnR5KCdoZWlnaHQnLCBmdW5jdGlvbigpIHsgXG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMuaGVpZ2h0IC8gMjsgXG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC5fY2FudmFzLnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgdmFsdWUgKiAyKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFN0cmV0Y2ggdGhlIGltYWdlIGZvciByZXRpbmEgc3VwcG9ydC5cbiAgICAgICAgdGhpcy5zY2FsZSgyLDIpO1xuICAgICAgICB0aGlzLl90b3VjaCgpO1xuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogV2lkdGggb2YgdGhlIGNhbnZhc1xuICAgICAqIEByZXR1cm4ge2Zsb2F0fVxuICAgICAqL1xuICAgIHRoaXMucHJvcGVydHkoJ3dpZHRoJywgZnVuY3Rpb24oKSB7IFxuICAgICAgICByZXR1cm4gdGhhdC5fY2FudmFzLndpZHRoIC8gMjsgXG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC5fY2FudmFzLnNldEF0dHJpYnV0ZSgnd2lkdGgnLCB2YWx1ZSAqIDIpO1xuICAgICAgICBcbiAgICAgICAgLy8gU3RyZXRjaCB0aGUgaW1hZ2UgZm9yIHJldGluYSBzdXBwb3J0LlxuICAgICAgICB0aGlzLnNjYWxlKDIsMik7XG4gICAgICAgIHRoaXMuX3RvdWNoKCk7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBSZWdpb24gb2YgdGhlIGNhbnZhcyB0aGF0IGhhcyBiZWVuIHJlbmRlcmVkIHRvXG4gICAgICogQHJldHVybiB7ZGljdGlvbmFyeX0gZGljdGlvbmFyeSBkZXNjcmliaW5nIGEgcmVjdGFuZ2xlIHt4LHksd2lkdGgsaGVpZ2h0fVxuICAgICAqICAgICAgICAgICAgICAgICAgICAgIG51bGwgaWYgY2FudmFzIGhhcyBjaGFuZ2VkIHNpbmNlIGxhc3QgY2hlY2tcbiAgICAgKi9cbiAgICB0aGlzLnByb3BlcnR5KCdyZW5kZXJlZF9yZWdpb24nLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0X3JlbmRlcmVkX3JlZ2lvbih0cnVlKTtcbiAgICB9KTtcbn07XG5cbi8qKlxuICogR2V0cyB0aGUgcmVnaW9uIG9mIHRoZSBjYW52YXMgdGhhdCBoYXMgYmVlbiByZW5kZXJlZCB0by5cbiAqIEBwYXJhbSAge2Jvb2xlYW59IChvcHRpb25hbCkgcmVzZXQgLSByZXNldHMgdGhlIHJlZ2lvbi5cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5nZXRfcmVuZGVyZWRfcmVnaW9uID0gZnVuY3Rpb24ocmVzZXQpIHtcbiAgICB2YXIgcmVuZGVyZWRfcmVnaW9uID0gdGhpcy5fcmVuZGVyZWRfcmVnaW9uO1xuICAgIGlmIChyZW5kZXJlZF9yZWdpb25bMF0gPT09IG51bGwpIHJldHVybiBudWxsO1xuXG4gICAgaWYgKHJlc2V0KSB0aGlzLl9yZW5kZXJlZF9yZWdpb24gPSBbbnVsbCwgbnVsbCwgbnVsbCwgbnVsbF07XG4gICAgcmV0dXJuIHtcbiAgICAgICAgeDogdGhpcy5fdHgocmVuZGVyZWRfcmVnaW9uWzBdLCB0cnVlKSxcbiAgICAgICAgeTogdGhpcy5fdHkocmVuZGVyZWRfcmVnaW9uWzFdLCB0cnVlKSxcbiAgICAgICAgd2lkdGg6ICh0aGlzLl90eChyZW5kZXJlZF9yZWdpb25bMl0pIC0gdGhpcy5fdHgocmVuZGVyZWRfcmVnaW9uWzBdKSksIFxuICAgICAgICBoZWlnaHQ6ICh0aGlzLl90eShyZW5kZXJlZF9yZWdpb25bM10pIC0gdGhpcy5fdHkocmVuZGVyZWRfcmVnaW9uWzFdKSksXG4gICAgfTtcbn07XG5cbi8qKlxuICogRXJhc2VzIHRoZSBjYWNoZWQgcmVuZGVyaW5nIG9wdGlvbnMuXG4gKiBcbiAqIFRoaXMgc2hvdWxkIGJlIGNhbGxlZCBpZiBhIGZvbnQgaXMgbm90IHJlbmRlcmluZyBwcm9wZXJseS4gIEEgZm9udCBtYXkgbm90XG4gKiByZW5kZXIgcHJvcGVybHkgaWYgaXQgd2FzIHdhcyB1c2VkIHdpdGhpbiBQb3N0ZXIgYmVmb3JlIGl0IHdhcyBsb2FkZWQgYnkgdGhlXG4gKiBicm93c2VyLiBpLmUuIElmIGZvbnQgJ0ZvbnRBJyBpcyB1c2VkIHdpdGhpbiBQb3N0ZXIsIGJ1dCBoYXNuJ3QgYmVlbiBsb2FkZWRcbiAqIHlldCBieSB0aGUgYnJvd3NlciwgUG9zdGVyIHdpbGwgdXNlIGEgdGVtcG9yYXJ5IGZvbnQgaW5zdGVhZCBvZiAnRm9udEEnLlxuICogQmVjYXVzZSBQb3N0ZXIgaXMgdW5hd2FyZSBvZiB3aGVuIGZvbnRzIGFyZSBsb2FkZWQgKFRPRE8gYXR0ZW1wdCB0byBmaXggdGhpcylcbiAqIGJ5IHRoZSBicm93c2VyLCBvbmNlICdGb250QScgaXMgYWN0dWFsbHkgbG9hZGVkLCB0aGUgdGVtcG9yYXJ5IGZvbnQgd2lsbFxuICogY29udGludWUgdG8gYmUgdXNlZC4gIENsZWFyaW5nIHRoZSBjYWNoZSBtYWtlcyBQb3N0ZXIgYXR0ZW1wdCB0byByZWxvYWQgdGhhdFxuICogZm9udC5cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5lcmFzZV9vcHRpb25zX2NhY2hlID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fbGFzdF9zZXRfb3B0aW9ucyA9IHt9O1xufTtcblxuLyoqXG4gKiBEcmF3cyBhIHJlY3RhbmdsZVxuICogQHBhcmFtICB7ZmxvYXR9IHhcbiAqIEBwYXJhbSAge2Zsb2F0fSB5XG4gKiBAcGFyYW0gIHtmbG9hdH0gd2lkdGhcbiAqIEBwYXJhbSAge2Zsb2F0fSBoZWlnaHRcbiAqIEBwYXJhbSAge2RpY3Rpb25hcnl9IG9wdGlvbnMsIHNlZSBfYXBwbHlfb3B0aW9ucygpIGZvciBkZXRhaWxzXG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuZHJhd19yZWN0YW5nbGUgPSBmdW5jdGlvbih4LCB5LCB3aWR0aCwgaGVpZ2h0LCBvcHRpb25zKSB7XG4gICAgdmFyIHR4ID0gdGhpcy5fdHgoeCk7XG4gICAgdmFyIHR5ID0gdGhpcy5fdHkoeSk7XG4gICAgdGhpcy5jb250ZXh0LmJlZ2luUGF0aCgpO1xuICAgIHRoaXMuY29udGV4dC5yZWN0KHR4LCB0eSwgd2lkdGgsIGhlaWdodCk7XG4gICAgdGhpcy5fZG9fZHJhdyhvcHRpb25zKTtcbiAgICB0aGlzLl90b3VjaCh0eCwgdHksIHR4K3dpZHRoLCB0eStoZWlnaHQpO1xufTtcblxuLyoqXG4gKiBEcmF3cyBhIGNpcmNsZVxuICogQHBhcmFtICB7ZmxvYXR9IHhcbiAqIEBwYXJhbSAge2Zsb2F0fSB5XG4gKiBAcGFyYW0gIHtmbG9hdH0gclxuICogQHBhcmFtICB7ZGljdGlvbmFyeX0gb3B0aW9ucywgc2VlIF9hcHBseV9vcHRpb25zKCkgZm9yIGRldGFpbHNcbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5kcmF3X2NpcmNsZSA9IGZ1bmN0aW9uKHgsIHksIHIsIG9wdGlvbnMpIHtcbiAgICB2YXIgdHggPSB0aGlzLl90eCh4KTtcbiAgICB2YXIgdHkgPSB0aGlzLl90eSh5KTtcbiAgICB0aGlzLmNvbnRleHQuYmVnaW5QYXRoKCk7XG4gICAgdGhpcy5jb250ZXh0LmFyYyh0eCwgdHksIHIsIDAsIDIgKiBNYXRoLlBJKTtcbiAgICB0aGlzLl9kb19kcmF3KG9wdGlvbnMpO1xuICAgIHRoaXMuX3RvdWNoKHR4LXIsIHR5LXIsIHR4K3IsIHR5K3IpO1xufTtcblxuLyoqXG4gKiBEcmF3cyBhbiBpbWFnZVxuICogQHBhcmFtICB7aW1nIGVsZW1lbnR9IGltZ1xuICogQHBhcmFtICB7ZmxvYXR9IHhcbiAqIEBwYXJhbSAge2Zsb2F0fSB5XG4gKiBAcGFyYW0gIHtmbG9hdH0gKG9wdGlvbmFsKSB3aWR0aFxuICogQHBhcmFtICB7ZmxvYXR9IChvcHRpb25hbCkgaGVpZ2h0XG4gKiBAcGFyYW0gIHtvYmplY3R9IChvcHRpb25hbCkgY2xpcF9ib3VuZHMgLSBXaGVyZSB0byBjbGlwIGZyb20gdGhlIHNvdXJjZS5cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5kcmF3X2ltYWdlID0gZnVuY3Rpb24oaW1nLCB4LCB5LCB3aWR0aCwgaGVpZ2h0LCBjbGlwX2JvdW5kcykge1xuICAgIHZhciB0eCA9IHRoaXMuX3R4KHgpO1xuICAgIHZhciB0eSA9IHRoaXMuX3R5KHkpO1xuICAgIHdpZHRoID0gd2lkdGggfHwgaW1nLndpZHRoO1xuICAgIGhlaWdodCA9IGhlaWdodCB8fCBpbWcuaGVpZ2h0O1xuICAgIGltZyA9IGltZy5fY2FudmFzID8gaW1nLl9jYW52YXMgOiBpbWc7XG4gICAgaWYgKGNsaXBfYm91bmRzKSB7XG4gICAgICAgIC8vIEhvcml6b250YWxseSBvZmZzZXQgdGhlIGltYWdlIG9wZXJhdGlvbiBieSBvbmUgcGl4ZWwgYWxvbmcgZWFjaCBcbiAgICAgICAgLy8gYm9yZGVyIHRvIGVsaW1pbmF0ZSB0aGUgc3RyYW5nZSB3aGl0ZSBsJnIgYm9yZGVyIGFydGlmYWN0cy5cbiAgICAgICAgdmFyIGhvZmZzZXQgPSAxO1xuICAgICAgICB0aGlzLmNvbnRleHQuZHJhd0ltYWdlKGltZywgXG4gICAgICAgICAgICAodGhpcy5fdHgoY2xpcF9ib3VuZHMueCkgLSBob2Zmc2V0KSAqIDIsIC8vIFJldGluYSBzdXBwb3J0XG4gICAgICAgICAgICB0aGlzLl90eShjbGlwX2JvdW5kcy55KSAqIDIsIC8vIFJldGluYSBzdXBwb3J0XG4gICAgICAgICAgICAoY2xpcF9ib3VuZHMud2lkdGggKyAyKmhvZmZzZXQpICogMiwgLy8gUmV0aW5hIHN1cHBvcnRcbiAgICAgICAgICAgIGNsaXBfYm91bmRzLmhlaWdodCAqIDIsIC8vIFJldGluYSBzdXBwb3J0XG4gICAgICAgICAgICB0eC1ob2Zmc2V0LCB0eSwgd2lkdGggKyAyKmhvZmZzZXQsIGhlaWdodCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5jb250ZXh0LmRyYXdJbWFnZShpbWcsIHR4LCB0eSwgd2lkdGgsIGhlaWdodCk7XG4gICAgfVxuICAgIHRoaXMuX3RvdWNoKHR4LCB0eSwgdHggKyB3aWR0aCwgdHkgKyBoZWlnaHQpO1xufTtcblxuLyoqXG4gKiBEcmF3cyBhIGxpbmVcbiAqIEBwYXJhbSAge2Zsb2F0fSB4MVxuICogQHBhcmFtICB7ZmxvYXR9IHkxXG4gKiBAcGFyYW0gIHtmbG9hdH0geDJcbiAqIEBwYXJhbSAge2Zsb2F0fSB5MlxuICogQHBhcmFtICB7ZGljdGlvbmFyeX0gb3B0aW9ucywgc2VlIF9hcHBseV9vcHRpb25zKCkgZm9yIGRldGFpbHNcbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5kcmF3X2xpbmUgPSBmdW5jdGlvbih4MSwgeTEsIHgyLCB5Miwgb3B0aW9ucykge1xuICAgIHZhciB0eDEgPSB0aGlzLl90eCh4MSk7XG4gICAgdmFyIHR5MSA9IHRoaXMuX3R5KHkxKTtcbiAgICB2YXIgdHgyID0gdGhpcy5fdHgoeDIpO1xuICAgIHZhciB0eTIgPSB0aGlzLl90eSh5Mik7XG4gICAgdGhpcy5jb250ZXh0LmJlZ2luUGF0aCgpO1xuICAgIHRoaXMuY29udGV4dC5tb3ZlVG8odHgxLCB0eTEpO1xuICAgIHRoaXMuY29udGV4dC5saW5lVG8odHgyLCB0eTIpO1xuICAgIHRoaXMuX2RvX2RyYXcob3B0aW9ucyk7XG4gICAgdGhpcy5fdG91Y2godHgxLCB0eTEsIHR4MiwgdHkyKTtcbn07XG5cbi8qKlxuICogRHJhd3MgYSBwb2x5IGxpbmVcbiAqIEBwYXJhbSAge2FycmF5fSBwb2ludHMgLSBhcnJheSBvZiBwb2ludHMuICBFYWNoIHBvaW50IGlzXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgYW4gYXJyYXkgaXRzZWxmLCBvZiB0aGUgZm9ybSBbeCwgeV0gXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgd2hlcmUgeCBhbmQgeSBhcmUgZmxvYXRpbmcgcG9pbnRcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZXMuXG4gKiBAcGFyYW0gIHtkaWN0aW9uYXJ5fSBvcHRpb25zLCBzZWUgX2FwcGx5X29wdGlvbnMoKSBmb3IgZGV0YWlsc1xuICovXG5DYW52YXMucHJvdG90eXBlLmRyYXdfcG9seWxpbmUgPSBmdW5jdGlvbihwb2ludHMsIG9wdGlvbnMpIHtcbiAgICBpZiAocG9pbnRzLmxlbmd0aCA8IDIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQb2x5IGxpbmUgbXVzdCBoYXZlIGF0bGVhc3QgdHdvIHBvaW50cy4nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmNvbnRleHQuYmVnaW5QYXRoKCk7XG4gICAgICAgIHZhciBwb2ludCA9IHBvaW50c1swXTtcbiAgICAgICAgdGhpcy5jb250ZXh0Lm1vdmVUbyh0aGlzLl90eChwb2ludFswXSksIHRoaXMuX3R5KHBvaW50WzFdKSk7XG5cbiAgICAgICAgdmFyIG1pbnggPSB0aGlzLndpZHRoO1xuICAgICAgICB2YXIgbWlueSA9IHRoaXMuaGVpZ2h0O1xuICAgICAgICB2YXIgbWF4eCA9IDA7XG4gICAgICAgIHZhciBtYXh5ID0gMDtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBwb2ludHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHBvaW50ID0gcG9pbnRzW2ldO1xuICAgICAgICAgICAgdmFyIHR4ID0gdGhpcy5fdHgocG9pbnRbMF0pO1xuICAgICAgICAgICAgdmFyIHR5ID0gdGhpcy5fdHkocG9pbnRbMV0pO1xuICAgICAgICAgICAgdGhpcy5jb250ZXh0LmxpbmVUbyh0eCwgdHkpO1xuXG4gICAgICAgICAgICBtaW54ID0gTWF0aC5taW4odHgsIG1pbngpO1xuICAgICAgICAgICAgbWlueSA9IE1hdGgubWluKHR5LCBtaW55KTtcbiAgICAgICAgICAgIG1heHggPSBNYXRoLm1heCh0eCwgbWF4eCk7XG4gICAgICAgICAgICBtYXh5ID0gTWF0aC5tYXgodHksIG1heHkpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2RvX2RyYXcob3B0aW9ucyk7IFxuICAgICAgICB0aGlzLl90b3VjaChtaW54LCBtaW55LCBtYXh4LCBtYXh5KTsgICBcbiAgICB9XG59O1xuXG4vKipcbiAqIERyYXdzIGEgdGV4dCBzdHJpbmdcbiAqIEBwYXJhbSAge2Zsb2F0fSB4XG4gKiBAcGFyYW0gIHtmbG9hdH0geVxuICogQHBhcmFtICB7c3RyaW5nfSB0ZXh0IHN0cmluZyBvciBjYWxsYmFjayB0aGF0IHJlc29sdmVzIHRvIGEgc3RyaW5nLlxuICogQHBhcmFtICB7ZGljdGlvbmFyeX0gb3B0aW9ucywgc2VlIF9hcHBseV9vcHRpb25zKCkgZm9yIGRldGFpbHNcbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5kcmF3X3RleHQgPSBmdW5jdGlvbih4LCB5LCB0ZXh0LCBvcHRpb25zKSB7XG4gICAgdmFyIHR4ID0gdGhpcy5fdHgoeCk7XG4gICAgdmFyIHR5ID0gdGhpcy5fdHkoeSk7XG4gICAgdGV4dCA9IHRoaXMuX3Byb2Nlc3NfdGFicyh0ZXh0KTtcbiAgICBvcHRpb25zID0gdGhpcy5fYXBwbHlfb3B0aW9ucyhvcHRpb25zKTtcbiAgICAvLyAnZmlsbCcgdGhlIHRleHQgYnkgZGVmYXVsdCB3aGVuIG5laXRoZXIgYSBzdHJva2Ugb3IgZmlsbCBcbiAgICAvLyBpcyBkZWZpbmVkLiAgT3RoZXJ3aXNlIG9ubHkgZmlsbCBpZiBhIGZpbGwgaXMgZGVmaW5lZC5cbiAgICBpZiAob3B0aW9ucy5maWxsIHx8ICFvcHRpb25zLnN0cm9rZSkge1xuICAgICAgICB0aGlzLmNvbnRleHQuZmlsbFRleHQodGV4dCwgdHgsIHR5KTtcbiAgICB9XG4gICAgLy8gT25seSBzdHJva2UgaWYgYSBzdHJva2UgaXMgZGVmaW5lZC5cbiAgICBpZiAob3B0aW9ucy5zdHJva2UpIHtcbiAgICAgICAgdGhpcy5jb250ZXh0LnN0cm9rZVRleHQodGV4dCwgdHgsIHR5KTsgICAgICAgXG4gICAgfVxuXG4gICAgLy8gTWFyayB0aGUgcmVnaW9uIGFzIGRpcnR5LlxuICAgIHZhciB3aWR0aCA9IHRoaXMubWVhc3VyZV90ZXh0KHRleHQsIG9wdGlvbnMpO1xuICAgIHZhciBoZWlnaHQgPSB0aGlzLl9mb250X2hlaWdodDtcbiAgICB0aGlzLl90b3VjaCh0eCwgdHksIHR4ICsgd2lkdGgsIHR5ICsgaGVpZ2h0KTsgXG59O1xuXG4vKipcbiAqIEdldCdzIGEgY2h1bmsgb2YgdGhlIGNhbnZhcyBhcyBhIHJhdyBpbWFnZS5cbiAqIEBwYXJhbSAge2Zsb2F0fSAob3B0aW9uYWwpIHhcbiAqIEBwYXJhbSAge2Zsb2F0fSAob3B0aW9uYWwpIHlcbiAqIEBwYXJhbSAge2Zsb2F0fSAob3B0aW9uYWwpIHdpZHRoXG4gKiBAcGFyYW0gIHtmbG9hdH0gKG9wdGlvbmFsKSBoZWlnaHRcbiAqIEByZXR1cm4ge2ltYWdlfSBjYW52YXMgaW1hZ2UgZGF0YVxuICovXG5DYW52YXMucHJvdG90eXBlLmdldF9yYXdfaW1hZ2UgPSBmdW5jdGlvbih4LCB5LCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgY29uc29sZS53YXJuKCdnZXRfcmF3X2ltYWdlIGltYWdlIGlzIHNsb3csIHVzZSBjYW52YXMgcmVmZXJlbmNlcyBpbnN0ZWFkIHdpdGggZHJhd19pbWFnZScpO1xuICAgIGlmICh4PT09dW5kZWZpbmVkKSB7XG4gICAgICAgIHggPSAwO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHggPSB0aGlzLl90eCh4KTtcbiAgICB9XG4gICAgaWYgKHk9PT11bmRlZmluZWQpIHtcbiAgICAgICAgeSA9IDA7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgeSA9IHRoaXMuX3R5KHkpO1xuICAgIH1cbiAgICBpZiAod2lkdGggPT09IHVuZGVmaW5lZCkgd2lkdGggPSB0aGlzLndpZHRoO1xuICAgIGlmIChoZWlnaHQgPT09IHVuZGVmaW5lZCkgaGVpZ2h0ID0gdGhpcy5oZWlnaHQ7XG5cbiAgICAvLyBNdWx0aXBseSBieSB0d28gZm9yIHBpeGVsIGRvdWJsaW5nLlxuICAgIHggPSAyICogeDtcbiAgICB5ID0gMiAqIHk7XG4gICAgd2lkdGggPSAyICogd2lkdGg7XG4gICAgaGVpZ2h0ID0gMiAqIGhlaWdodDtcbiAgICBcbiAgICAvLyBVcGRhdGUgdGhlIGNhY2hlZCBpbWFnZSBpZiBpdCdzIG5vdCB0aGUgcmVxdWVzdGVkIG9uZS5cbiAgICB2YXIgcmVnaW9uID0gW3gsIHksIHdpZHRoLCBoZWlnaHRdO1xuICAgIGlmICghKHRoaXMuX2NhY2hlZF90aW1lc3RhbXAgPT09IHRoaXMuX21vZGlmaWVkICYmIHV0aWxzLmNvbXBhcmVfYXJyYXlzKHJlZ2lvbiwgdGhpcy5fY2FjaGVkX3JlZ2lvbikpKSB7XG4gICAgICAgIHRoaXMuX2NhY2hlZF9pbWFnZSA9IHRoaXMuY29udGV4dC5nZXRJbWFnZURhdGEoeCwgeSwgd2lkdGgsIGhlaWdodCk7XG4gICAgICAgIHRoaXMuX2NhY2hlZF90aW1lc3RhbXAgPSB0aGlzLl9tb2RpZmllZDtcbiAgICAgICAgdGhpcy5fY2FjaGVkX3JlZ2lvbiA9IHJlZ2lvbjtcbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gdGhlIGNhY2hlZCBpbWFnZS5cbiAgICByZXR1cm4gdGhpcy5fY2FjaGVkX2ltYWdlO1xufTtcblxuLyoqXG4gKiBQdXQncyBhIHJhdyBpbWFnZSBvbiB0aGUgY2FudmFzIHNvbWV3aGVyZS5cbiAqIEBwYXJhbSAge2Zsb2F0fSB4XG4gKiBAcGFyYW0gIHtmbG9hdH0geVxuICogQHJldHVybiB7aW1hZ2V9IGNhbnZhcyBpbWFnZSBkYXRhXG4gKi9cbkNhbnZhcy5wcm90b3R5cGUucHV0X3Jhd19pbWFnZSA9IGZ1bmN0aW9uKGltZywgeCwgeSkge1xuICAgIGNvbnNvbGUud2FybigncHV0X3Jhd19pbWFnZSBpbWFnZSBpcyBzbG93LCB1c2UgZHJhd19pbWFnZSBpbnN0ZWFkJyk7XG4gICAgdmFyIHR4ID0gdGhpcy5fdHgoeCk7XG4gICAgdmFyIHR5ID0gdGhpcy5fdHkoeSk7XG4gICAgLy8gTXVsdGlwbHkgYnkgdHdvIGZvciBwaXhlbCBkb3VibGluZy5cbiAgICByZXQgPSB0aGlzLmNvbnRleHQucHV0SW1hZ2VEYXRhKGltZywgdHgqMiwgdHkqMik7XG4gICAgdGhpcy5fdG91Y2godHgsIHR5LCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCk7IC8vIERvbid0IGtub3cgc2l6ZSBvZiBpbWFnZVxuICAgIHJldHVybiByZXQ7XG59O1xuXG4vKipcbiAqIE1lYXN1cmVzIHRoZSB3aWR0aCBvZiBhIHRleHQgc3RyaW5nLlxuICogQHBhcmFtICB7c3RyaW5nfSB0ZXh0XG4gKiBAcGFyYW0gIHtkaWN0aW9uYXJ5fSBvcHRpb25zLCBzZWUgX2FwcGx5X29wdGlvbnMoKSBmb3IgZGV0YWlsc1xuICogQHJldHVybiB7ZmxvYXR9IHdpZHRoXG4gKi9cbkNhbnZhcy5wcm90b3R5cGUubWVhc3VyZV90ZXh0ID0gZnVuY3Rpb24odGV4dCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSB0aGlzLl9hcHBseV9vcHRpb25zKG9wdGlvbnMpO1xuICAgIHRleHQgPSB0aGlzLl9wcm9jZXNzX3RhYnModGV4dCk7XG5cbiAgICAvLyBDYWNoZSB0aGUgc2l6ZSBpZiBpdCdzIG5vdCBhbHJlYWR5IGNhY2hlZC5cbiAgICBpZiAodGhpcy5fdGV4dF9zaXplX2NhY2hlW3RleHRdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5fdGV4dF9zaXplX2NhY2hlW3RleHRdID0gdGhpcy5jb250ZXh0Lm1lYXN1cmVUZXh0KHRleHQpLndpZHRoO1xuICAgICAgICB0aGlzLl90ZXh0X3NpemVfYXJyYXkucHVzaCh0ZXh0KTtcblxuICAgICAgICAvLyBSZW1vdmUgdGhlIG9sZGVzdCBpdGVtIGluIHRoZSBhcnJheSBpZiB0aGUgY2FjaGUgaXMgdG9vIGxhcmdlLlxuICAgICAgICB3aGlsZSAodGhpcy5fdGV4dF9zaXplX2FycmF5Lmxlbmd0aCA+IHRoaXMuX3RleHRfc2l6ZV9jYWNoZV9zaXplKSB7XG4gICAgICAgICAgICB2YXIgb2xkZXN0ID0gdGhpcy5fdGV4dF9zaXplX2FycmF5LnNoaWZ0KCk7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fdGV4dF9zaXplX2NhY2hlW29sZGVzdF07XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLy8gVXNlIHRoZSBjYWNoZWQgc2l6ZS5cbiAgICByZXR1cm4gdGhpcy5fdGV4dF9zaXplX2NhY2hlW3RleHRdO1xufTtcblxuLyoqXG4gKiBDcmVhdGUgYSBsaW5lYXIgZ3JhZGllbnRcbiAqIEBwYXJhbSAge2Zsb2F0fSB4MVxuICogQHBhcmFtICB7ZmxvYXR9IHkxXG4gKiBAcGFyYW0gIHtmbG9hdH0geDJcbiAqIEBwYXJhbSAge2Zsb2F0fSB5MlxuICogQHBhcmFtICB7YXJyYXl9IGNvbG9yX3N0b3BzIC0gYXJyYXkgb2YgW2Zsb2F0LCBjb2xvcl0gcGFpcnNcbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5ncmFkaWVudCA9IGZ1bmN0aW9uKHgxLCB5MSwgeDIsIHkyLCBjb2xvcl9zdG9wcykge1xuICAgIHZhciBncmFkaWVudCA9IHRoaXMuY29udGV4dC5jcmVhdGVMaW5lYXJHcmFkaWVudCh4MSwgeTEsIHgyLCB5Mik7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb2xvcl9zdG9wcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBncmFkaWVudC5hZGRDb2xvclN0b3AoY29sb3Jfc3RvcHNbaV1bMF0sIGNvbG9yX3N0b3BzW2ldWzFdKTtcbiAgICB9XG4gICAgcmV0dXJuIGdyYWRpZW50O1xufTtcblxuLyoqXG4gKiBDbGVhcidzIHRoZSBjYW52YXMuXG4gKiBAcGFyYW0gIHtvYmplY3R9IChvcHRpb25hbCkgcmVnaW9uLCB7eCx5LHdpZHRoLGhlaWdodH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uKHJlZ2lvbikge1xuICAgIGlmIChyZWdpb24pIHtcbiAgICAgICAgdmFyIHR4ID0gdGhpcy5fdHgocmVnaW9uLngpO1xuICAgICAgICB2YXIgdHkgPSB0aGlzLl90eShyZWdpb24ueSk7XG4gICAgICAgIHRoaXMuY29udGV4dC5jbGVhclJlY3QodHgsIHR5LCByZWdpb24ud2lkdGgsIHJlZ2lvbi5oZWlnaHQpO1xuICAgICAgICB0aGlzLl90b3VjaCh0eCwgdHksIHR4ICsgcmVnaW9uLndpZHRoLCB0eSArIHJlZ2lvbi5oZWlnaHQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuY29udGV4dC5jbGVhclJlY3QoMCwgMCwgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQpO1xuICAgICAgICB0aGlzLl90b3VjaCgpO1xuICAgIH1cbn07XG5cbi8qKlxuICogU2NhbGUgdGhlIGN1cnJlbnQgZHJhd2luZy5cbiAqIEBwYXJhbSAge2Zsb2F0fSB4XG4gKiBAcGFyYW0gIHtmbG9hdH0geSAgXG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuc2NhbGUgPSBmdW5jdGlvbih4LCB5KSB7XG4gICAgdGhpcy5jb250ZXh0LnNjYWxlKHgsIHkpO1xuICAgIHRoaXMuX3RvdWNoKCk7XG59O1xuXG4vKipcbiAqIEZpbmlzaGVzIHRoZSBkcmF3aW5nIG9wZXJhdGlvbiB1c2luZyB0aGUgc2V0IG9mIHByb3ZpZGVkIG9wdGlvbnMuXG4gKiBAcGFyYW0gIHtkaWN0aW9uYXJ5fSAob3B0aW9uYWwpIGRpY3Rpb25hcnkgdGhhdCBcbiAqICByZXNvbHZlcyB0byBhIGRpY3Rpb25hcnkuXG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuX2RvX2RyYXcgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IHRoaXMuX2FwcGx5X29wdGlvbnMob3B0aW9ucyk7XG5cbiAgICAvLyBPbmx5IGZpbGwgaWYgYSBmaWxsIGlzIGRlZmluZWQuXG4gICAgaWYgKG9wdGlvbnMuZmlsbCkge1xuICAgICAgICB0aGlzLmNvbnRleHQuZmlsbCgpO1xuICAgIH1cbiAgICAvLyBTdHJva2UgYnkgZGVmYXVsdCwgaWYgbm8gc3Ryb2tlIG9yIGZpbGwgaXMgZGVmaW5lZC4gIE90aGVyd2lzZVxuICAgIC8vIG9ubHkgc3Ryb2tlIGlmIGEgc3Ryb2tlIGlzIGRlZmluZWQuXG4gICAgaWYgKG9wdGlvbnMuc3Ryb2tlIHx8ICFvcHRpb25zLmZpbGwpIHtcbiAgICAgICAgdGhpcy5jb250ZXh0LnN0cm9rZSgpO1xuICAgIH1cbn07XG5cbi8qKlxuICogQXBwbGllcyBhIGRpY3Rpb25hcnkgb2YgZHJhd2luZyBvcHRpb25zIHRvIHRoZSBwZW4uXG4gKiBAcGFyYW0gIHtkaWN0aW9uYXJ5fSBvcHRpb25zXG4gKiAgICAgIGFscGhhIHtmbG9hdH0gT3BhY2l0eSAoMC0xKVxuICogICAgICBjb21wb3NpdGVfb3BlcmF0aW9uIHtzdHJpbmd9IEhvdyBuZXcgaW1hZ2VzIGFyZSBcbiAqICAgICAgICAgIGRyYXduIG9udG8gYW4gZXhpc3RpbmcgaW1hZ2UuICBQb3NzaWJsZSB2YWx1ZXNcbiAqICAgICAgICAgIGFyZSBgc291cmNlLW92ZXJgLCBgc291cmNlLWF0b3BgLCBgc291cmNlLWluYCwgXG4gKiAgICAgICAgICBgc291cmNlLW91dGAsIGBkZXN0aW5hdGlvbi1vdmVyYCwgXG4gKiAgICAgICAgICBgZGVzdGluYXRpb24tYXRvcGAsIGBkZXN0aW5hdGlvbi1pbmAsIFxuICogICAgICAgICAgYGRlc3RpbmF0aW9uLW91dGAsIGBsaWdodGVyYCwgYGNvcHlgLCBvciBgeG9yYC5cbiAqICAgICAgbGluZV9jYXAge3N0cmluZ30gRW5kIGNhcCBzdHlsZSBmb3IgbGluZXMuXG4gKiAgICAgICAgICBQb3NzaWJsZSB2YWx1ZXMgYXJlICdidXR0JywgJ3JvdW5kJywgb3IgJ3NxdWFyZScuXG4gKiAgICAgIGxpbmVfam9pbiB7c3RyaW5nfSBIb3cgdG8gcmVuZGVyIHdoZXJlIHR3byBsaW5lc1xuICogICAgICAgICAgbWVldC4gIFBvc3NpYmxlIHZhbHVlcyBhcmUgJ2JldmVsJywgJ3JvdW5kJywgb3JcbiAqICAgICAgICAgICdtaXRlcicuXG4gKiAgICAgIGxpbmVfd2lkdGgge2Zsb2F0fSBIb3cgdGhpY2sgbGluZXMgYXJlLlxuICogICAgICBsaW5lX21pdGVyX2xpbWl0IHtmbG9hdH0gTWF4IGxlbmd0aCBvZiBtaXRlcnMuXG4gKiAgICAgIGxpbmVfY29sb3Ige3N0cmluZ30gQ29sb3Igb2YgdGhlIGxpbmUuXG4gKiAgICAgIGZpbGxfY29sb3Ige3N0cmluZ30gQ29sb3IgdG8gZmlsbCB0aGUgc2hhcGUuXG4gKiAgICAgIGNvbG9yIHtzdHJpbmd9IENvbG9yIHRvIHN0cm9rZSBhbmQgZmlsbCB0aGUgc2hhcGUuXG4gKiAgICAgICAgICBMb3dlciBwcmlvcml0eSB0byBsaW5lX2NvbG9yIGFuZCBmaWxsX2NvbG9yLlxuICogICAgICBmb250X3N0eWxlIHtzdHJpbmd9XG4gKiAgICAgIGZvbnRfdmFyaWFudCB7c3RyaW5nfVxuICogICAgICBmb250X3dlaWdodCB7c3RyaW5nfVxuICogICAgICBmb250X3NpemUge3N0cmluZ31cbiAqICAgICAgZm9udF9mYW1pbHkge3N0cmluZ31cbiAqICAgICAgdGV4dF9hbGlnbiB7c3RyaW5nfSBIb3Jpem9udGFsIGFsaWdubWVudCBvZiB0ZXh0LiAgXG4gKiAgICAgICAgICBQb3NzaWJsZSB2YWx1ZXMgYXJlIGBzdGFydGAsIGBlbmRgLCBgY2VudGVyYCxcbiAqICAgICAgICAgIGBsZWZ0YCwgb3IgYHJpZ2h0YC5cbiAqICAgICAgdGV4dF9iYXNlbGluZSB7c3RyaW5nfSBWZXJ0aWNhbCBhbGlnbm1lbnQgb2YgdGV4dC5cbiAqICAgICAgICAgIFBvc3NpYmxlIHZhbHVlcyBhcmUgYGFscGhhYmV0aWNgLCBgdG9wYCwgXG4gKiAgICAgICAgICBgaGFuZ2luZ2AsIGBtaWRkbGVgLCBgaWRlb2dyYXBoaWNgLCBvciBcbiAqICAgICAgICAgIGBib3R0b21gLlxuICogQHJldHVybiB7ZGljdGlvbmFyeX0gb3B0aW9ucywgcmVzb2x2ZWQuXG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuX2FwcGx5X29wdGlvbnMgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgb3B0aW9ucyA9IHV0aWxzLnJlc29sdmVfY2FsbGFibGUob3B0aW9ucyk7XG5cbiAgICAvLyBTcGVjaWFsIG9wdGlvbnMuXG4gICAgdmFyIHNldF9vcHRpb25zID0ge307XG4gICAgc2V0X29wdGlvbnMuZ2xvYmFsQWxwaGEgPSAob3B0aW9ucy5hbHBoYT09PXVuZGVmaW5lZCA/IDEuMCA6IG9wdGlvbnMuYWxwaGEpO1xuICAgIHNldF9vcHRpb25zLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbiA9IG9wdGlvbnMuY29tcG9zaXRlX29wZXJhdGlvbiB8fCAnc291cmNlLW92ZXInO1xuICAgIFxuICAgIC8vIExpbmUgc3R5bGUuXG4gICAgc2V0X29wdGlvbnMubGluZUNhcCA9IG9wdGlvbnMubGluZV9jYXAgfHwgJ2J1dHQnO1xuICAgIHNldF9vcHRpb25zLmxpbmVKb2luID0gb3B0aW9ucy5saW5lX2pvaW4gfHwgJ2JldmVsJztcbiAgICBzZXRfb3B0aW9ucy5saW5lV2lkdGggPSBvcHRpb25zLmxpbmVfd2lkdGg9PT11bmRlZmluZWQgPyAxLjAgOiBvcHRpb25zLmxpbmVfd2lkdGg7XG4gICAgc2V0X29wdGlvbnMubWl0ZXJMaW1pdCA9IG9wdGlvbnMubGluZV9taXRlcl9saW1pdD09PXVuZGVmaW5lZCA/IDEwIDogb3B0aW9ucy5saW5lX21pdGVyX2xpbWl0O1xuICAgIHRoaXMuY29udGV4dC5zdHJva2VTdHlsZSA9IG9wdGlvbnMubGluZV9jb2xvciB8fCBvcHRpb25zLmNvbG9yIHx8ICdibGFjayc7IC8vIFRPRE86IFN1cHBvcnQgZ3JhZGllbnRcbiAgICBvcHRpb25zLnN0cm9rZSA9IChvcHRpb25zLmxpbmVfY29sb3IgIT09IHVuZGVmaW5lZCB8fCBvcHRpb25zLmxpbmVfd2lkdGggIT09IHVuZGVmaW5lZCk7XG5cbiAgICAvLyBGaWxsIHN0eWxlLlxuICAgIHRoaXMuY29udGV4dC5maWxsU3R5bGUgPSBvcHRpb25zLmZpbGxfY29sb3IgfHwgb3B0aW9ucy5jb2xvciB8fCAncmVkJzsgLy8gVE9ETzogU3VwcG9ydCBncmFkaWVudFxuICAgIG9wdGlvbnMuZmlsbCA9IG9wdGlvbnMuZmlsbF9jb2xvciAhPT0gdW5kZWZpbmVkO1xuXG4gICAgLy8gRm9udCBzdHlsZS5cbiAgICB2YXIgcGl4ZWxzID0gZnVuY3Rpb24oeCkge1xuICAgICAgICBpZiAoeCAhPT0gdW5kZWZpbmVkICYmIHggIT09IG51bGwpIHtcbiAgICAgICAgICAgIGlmIChOdW1iZXIuaXNGaW5pdGUoeCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gU3RyaW5nKHgpICsgJ3B4JztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHg7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdmFyIGZvbnRfc3R5bGUgPSBvcHRpb25zLmZvbnRfc3R5bGUgfHwgJyc7XG4gICAgdmFyIGZvbnRfdmFyaWFudCA9IG9wdGlvbnMuZm9udF92YXJpYW50IHx8ICcnO1xuICAgIHZhciBmb250X3dlaWdodCA9IG9wdGlvbnMuZm9udF93ZWlnaHQgfHwgJyc7XG4gICAgdGhpcy5fZm9udF9oZWlnaHQgPSBvcHRpb25zLmZvbnRfc2l6ZSB8fCAxMjtcbiAgICB2YXIgZm9udF9zaXplID0gcGl4ZWxzKHRoaXMuX2ZvbnRfaGVpZ2h0KTtcbiAgICB2YXIgZm9udF9mYW1pbHkgPSBvcHRpb25zLmZvbnRfZmFtaWx5IHx8ICdBcmlhbCc7XG4gICAgdmFyIGZvbnQgPSBmb250X3N0eWxlICsgJyAnICsgZm9udF92YXJpYW50ICsgJyAnICsgZm9udF93ZWlnaHQgKyAnICcgKyBmb250X3NpemUgKyAnICcgKyBmb250X2ZhbWlseTtcbiAgICBzZXRfb3B0aW9ucy5mb250ID0gZm9udDtcblxuICAgIC8vIFRleHQgc3R5bGUuXG4gICAgc2V0X29wdGlvbnMudGV4dEFsaWduID0gb3B0aW9ucy50ZXh0X2FsaWduIHx8ICdsZWZ0JztcbiAgICBzZXRfb3B0aW9ucy50ZXh0QmFzZWxpbmUgPSBvcHRpb25zLnRleHRfYmFzZWxpbmUgfHwgJ3RvcCc7XG5cbiAgICAvLyBUT0RPOiBTdXBwb3J0IHNoYWRvd3MuXG4gICAgXG4gICAgLy8gRW1wdHkgdGhlIG1lYXN1cmUgdGV4dCBjYWNoZSBpZiB0aGUgZm9udCBpcyBjaGFuZ2VkLlxuICAgIGlmIChzZXRfb3B0aW9ucy5mb250ICE9PSB0aGlzLl9sYXN0X3NldF9vcHRpb25zLmZvbnQpIHtcbiAgICAgICAgdGhpcy5fdGV4dF9zaXplX2NhY2hlID0ge307XG4gICAgICAgIHRoaXMuX3RleHRfc2l6ZV9hcnJheSA9IFtdO1xuICAgIH1cbiAgICBcbiAgICAvLyBTZXQgdGhlIG9wdGlvbnMgb24gdGhlIGNvbnRleHQgb2JqZWN0LiAgT25seSBzZXQgb3B0aW9ucyB0aGF0XG4gICAgLy8gaGF2ZSBjaGFuZ2VkIHNpbmNlIHRoZSBsYXN0IGNhbGwuXG4gICAgZm9yICh2YXIga2V5IGluIHNldF9vcHRpb25zKSB7XG4gICAgICAgIGlmIChzZXRfb3B0aW9ucy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5fbGFzdF9zZXRfb3B0aW9uc1trZXldICE9PSBzZXRfb3B0aW9uc1trZXldKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fbGFzdF9zZXRfb3B0aW9uc1trZXldID0gc2V0X29wdGlvbnNba2V5XTtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbnRleHRba2V5XSA9IHNldF9vcHRpb25zW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gb3B0aW9ucztcbn07XG5cbi8qKlxuICogVXBkYXRlIHRoZSB0aW1lc3RhbXAgdGhhdCB0aGUgY2FudmFzIHdhcyBtb2RpZmllZCBhbmRcbiAqIHRoZSByZWdpb24gdGhhdCBoYXMgY29udGVudHMgcmVuZGVyZWQgdG8gaXQuXG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuX3RvdWNoID0gZnVuY3Rpb24oeDEsIHkxLCB4MiwgeTIpIHtcbiAgICB0aGlzLl9tb2RpZmllZCA9IERhdGUubm93KCk7XG5cbiAgICB2YXIgYWxsX3VuZGVmaW5lZCA9ICh4MT09PXVuZGVmaW5lZCAmJiB5MT09PXVuZGVmaW5lZCAmJiB4Mj09PXVuZGVmaW5lZCAmJiB5Mj09PXVuZGVmaW5lZCk7XG4gICAgdmFyIG9uZV9uYW4gPSAoaXNOYU4oeDEqeDIqeTEqeTIpKTtcbiAgICBpZiAob25lX25hbiB8fCBhbGxfdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuX3JlbmRlcmVkX3JlZ2lvbiA9IFswLCAwLCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodF07XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBTZXQgdGhlIHJlbmRlciByZWdpb24uXG4gICAgdmFyIGNvbXBhcml0b3IgPSBmdW5jdGlvbihvbGRfdmFsdWUsIG5ld192YWx1ZSwgY29tcGFyaXNvbikge1xuICAgICAgICBpZiAob2xkX3ZhbHVlID09PSBudWxsIHx8IG9sZF92YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IG5ld192YWx1ZSA9PT0gbnVsbCB8fCBuZXdfdmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ld192YWx1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBjb21wYXJpc29uLmNhbGwodW5kZWZpbmVkLCBvbGRfdmFsdWUsIG5ld192YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdGhpcy5fcmVuZGVyZWRfcmVnaW9uWzBdID0gY29tcGFyaXRvcih0aGlzLl9yZW5kZXJlZF9yZWdpb25bMF0sIGNvbXBhcml0b3IoeDEsIHgyLCBNYXRoLm1pbiksIE1hdGgubWluKTtcbiAgICB0aGlzLl9yZW5kZXJlZF9yZWdpb25bMV0gPSBjb21wYXJpdG9yKHRoaXMuX3JlbmRlcmVkX3JlZ2lvblsxXSwgY29tcGFyaXRvcih5MSwgeTIsIE1hdGgubWluKSwgTWF0aC5taW4pO1xuICAgIHRoaXMuX3JlbmRlcmVkX3JlZ2lvblsyXSA9IGNvbXBhcml0b3IodGhpcy5fcmVuZGVyZWRfcmVnaW9uWzJdLCBjb21wYXJpdG9yKHgxLCB4MiwgTWF0aC5tYXgpLCBNYXRoLm1heCk7XG4gICAgdGhpcy5fcmVuZGVyZWRfcmVnaW9uWzNdID0gY29tcGFyaXRvcih0aGlzLl9yZW5kZXJlZF9yZWdpb25bM10sIGNvbXBhcml0b3IoeTEsIHkyLCBNYXRoLm1heCksIE1hdGgubWF4KTtcbn07XG5cbi8qKlxuICogVHJhbnNmb3JtIGFuIHggdmFsdWUgYmVmb3JlIHJlbmRlcmluZy5cbiAqIEBwYXJhbSAge2Zsb2F0fSB4XG4gKiBAcGFyYW0gIHtib29sZWFufSBpbnZlcnNlIC0gcGVyZm9ybSBpbnZlcnNlIHRyYW5zZm9ybWF0aW9uXG4gKiBAcmV0dXJuIHtmbG9hdH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5fdHggPSBmdW5jdGlvbih4LCBpbnZlcnNlKSB7IHJldHVybiB4OyB9O1xuXG4vKipcbiAqIFRyYW5zZm9ybSBhIHkgdmFsdWUgYmVmb3JlIHJlbmRlcmluZy5cbiAqIEBwYXJhbSAge2Zsb2F0fSB5XG4gKiBAcGFyYW0gIHtib29sZWFufSBpbnZlcnNlIC0gcGVyZm9ybSBpbnZlcnNlIHRyYW5zZm9ybWF0aW9uXG4gKiBAcmV0dXJuIHtmbG9hdH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5fdHkgPSBmdW5jdGlvbih5LCBpbnZlcnNlKSB7IHJldHVybiB5OyB9O1xuXG4vKipcbiAqIENvbnZlcnQgdGFiIGNoYXJhY3RlcnMgdG8gdGhlIGNvbmZpZyBkZWZpbmVkIG51bWJlciBvZiBzcGFjZSBcbiAqIGNoYXJhY3RlcnMgZm9yIHJlbmRlcmluZy5cbiAqIEBwYXJhbSAge3N0cmluZ30gcyAtIGlucHV0IHN0cmluZ1xuICogQHJldHVybiB7c3RyaW5nfSBvdXRwdXQgc3RyaW5nXG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuX3Byb2Nlc3NfdGFicyA9IGZ1bmN0aW9uKHMpIHtcbiAgICB2YXIgc3BhY2VfdGFiID0gJyc7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCAoY29uZmlnLnRhYl93aWR0aCB8fCAxKTsgaSsrKSB7XG4gICAgICAgIHNwYWNlX3RhYiArPSAnICc7XG4gICAgfVxuICAgIHJldHVybiBzLnJlcGxhY2UoL1xcdC9nLCBzcGFjZV90YWIpO1xufTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5DYW52YXMgPSBDYW52YXM7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG5cbi8qKlxuICogRXZlbnRmdWwgY2xpcGJvYXJkIHN1cHBvcnRcbiAqXG4gKiBXQVJOSU5HOiAgVGhpcyBjbGFzcyBpcyBhIGh1ZGdlIGtsdWRnZSB0aGF0IHdvcmtzIGFyb3VuZCB0aGUgcHJlaGlzdG9yaWNcbiAqIGNsaXBib2FyZCBzdXBwb3J0IChsYWNrIHRoZXJlb2YpIGluIG1vZGVybiB3ZWJyb3dzZXJzLiAgSXQgY3JlYXRlcyBhIGhpZGRlblxuICogdGV4dGJveCB3aGljaCBpcyBmb2N1c2VkLiAgVGhlIHByb2dyYW1tZXIgbXVzdCBjYWxsIGBzZXRfY2xpcHBhYmxlYCB0byBjaGFuZ2VcbiAqIHdoYXQgd2lsbCBiZSBjb3BpZWQgd2hlbiB0aGUgdXNlciBoaXRzIGtleXMgY29ycmVzcG9uZGluZyB0byBhIGNvcHkgXG4gKiBvcGVyYXRpb24uICBFdmVudHMgYGNvcHlgLCBgY3V0YCwgYW5kIGBwYXN0ZWAgYXJlIHJhaXNlZCBieSB0aGlzIGNsYXNzLlxuICovXG52YXIgQ2xpcGJvYXJkID0gZnVuY3Rpb24oZWwpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX2VsID0gZWw7XG5cbiAgICAvLyBDcmVhdGUgYSB0ZXh0Ym94IHRoYXQncyBoaWRkZW4uXG4gICAgdGhpcy5oaWRkZW5faW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZXh0YXJlYScpO1xuICAgIHRoaXMuaGlkZGVuX2lucHV0LnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAncG9zdGVyIGhpZGRlbi1jbGlwYm9hcmQnKTtcbiAgICBlbC5hcHBlbmRDaGlsZCh0aGlzLmhpZGRlbl9pbnB1dCk7XG5cbiAgICB0aGlzLl9iaW5kX2V2ZW50cygpO1xufTtcbnV0aWxzLmluaGVyaXQoQ2xpcGJvYXJkLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8qKlxuICogU2V0IHdoYXQgd2lsbCBiZSBjb3BpZWQgd2hlbiB0aGUgdXNlciBjb3BpZXMuXG4gKiBAcGFyYW0ge3N0cmluZ30gdGV4dFxuICovXG5DbGlwYm9hcmQucHJvdG90eXBlLnNldF9jbGlwcGFibGUgPSBmdW5jdGlvbih0ZXh0KSB7XG4gICAgdGhpcy5fY2xpcHBhYmxlID0gdGV4dDtcbiAgICB0aGlzLmhpZGRlbl9pbnB1dC52YWx1ZSA9IHRoaXMuX2NsaXBwYWJsZTtcbiAgICB0aGlzLl9mb2N1cygpO1xufTsgXG5cbi8qKlxuICogRm9jdXMgdGhlIGhpZGRlbiB0ZXh0IGFyZWEuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DbGlwYm9hcmQucHJvdG90eXBlLl9mb2N1cyA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuaGlkZGVuX2lucHV0LmZvY3VzKCk7XG4gICAgdGhpcy5oaWRkZW5faW5wdXQuc2VsZWN0KCk7XG59O1xuXG4vKipcbiAqIEhhbmRsZSB3aGVuIHRoZSB1c2VyIHBhc3RlcyBpbnRvIHRoZSB0ZXh0Ym94LlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2xpcGJvYXJkLnByb3RvdHlwZS5faGFuZGxlX3Bhc3RlID0gZnVuY3Rpb24oZSkge1xuICAgIHZhciBwYXN0ZWQgPSBlLmNsaXBib2FyZERhdGEuZ2V0RGF0YShlLmNsaXBib2FyZERhdGEudHlwZXNbMF0pO1xuICAgIHV0aWxzLmNhbmNlbF9idWJibGUoZSk7XG4gICAgdGhpcy50cmlnZ2VyKCdwYXN0ZScsIHBhc3RlZCk7XG59O1xuXG4vKipcbiAqIEJpbmQgZXZlbnRzIG9mIHRoZSBoaWRkZW4gdGV4dGJveC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkNsaXBib2FyZC5wcm90b3R5cGUuX2JpbmRfZXZlbnRzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuXG4gICAgLy8gTGlzdGVuIHRvIGVsJ3MgZm9jdXMgZXZlbnQuICBJZiBlbCBpcyBmb2N1c2VkLCBmb2N1cyB0aGUgaGlkZGVuIGlucHV0XG4gICAgLy8gaW5zdGVhZC5cbiAgICB1dGlscy5ob29rKHRoaXMuX2VsLCAnb25mb2N1cycsIHV0aWxzLnByb3h5KHRoaXMuX2ZvY3VzLCB0aGlzKSk7XG5cbiAgICB1dGlscy5ob29rKHRoaXMuaGlkZGVuX2lucHV0LCAnb25wYXN0ZScsIHV0aWxzLnByb3h5KHRoaXMuX2hhbmRsZV9wYXN0ZSwgdGhpcykpO1xuICAgIHV0aWxzLmhvb2sodGhpcy5oaWRkZW5faW5wdXQsICdvbmN1dCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgLy8gVHJpZ2dlciB0aGUgZXZlbnQgaW4gYSB0aW1lb3V0IHNvIGl0IGZpcmVzIGFmdGVyIHRoZSBzeXN0ZW0gZXZlbnQuXG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHRoYXQudHJpZ2dlcignY3V0JywgdGhhdC5fY2xpcHBhYmxlKTtcbiAgICAgICAgfSwgMCk7XG4gICAgfSk7XG4gICAgdXRpbHMuaG9vayh0aGlzLmhpZGRlbl9pbnB1dCwgJ29uY29weScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgdGhhdC50cmlnZ2VyKCdjb3B5JywgdGhhdC5fY2xpcHBhYmxlKTtcbiAgICB9KTtcbiAgICB1dGlscy5ob29rKHRoaXMuaGlkZGVuX2lucHV0LCAnb25rZXlwcmVzcycsIGZ1bmN0aW9uKCkge1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhhdC5oaWRkZW5faW5wdXQudmFsdWUgPSB0aGF0Ll9jbGlwcGFibGU7XG4gICAgICAgICAgICB0aGF0Ll9mb2N1cygpO1xuICAgICAgICB9LCAwKTtcbiAgICB9KTtcbiAgICB1dGlscy5ob29rKHRoaXMuaGlkZGVuX2lucHV0LCAnb25rZXl1cCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhhdC5oaWRkZW5faW5wdXQudmFsdWUgPSB0aGF0Ll9jbGlwcGFibGU7XG4gICAgICAgICAgICB0aGF0Ll9mb2N1cygpO1xuICAgICAgICB9LCAwKTtcbiAgICB9KTtcbn07XG5cbmV4cG9ydHMuQ2xpcGJvYXJkID0gQ2xpcGJvYXJkO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xudmFyIGNvbmZpZyA9IG5ldyB1dGlscy5Qb3N0ZXJDbGFzcyhbXG4gICAgJ2hpZ2hsaWdodF9kcmF3JywgLy8gYm9vbGVhbiAtIFdoZXRoZXIgb3Igbm90IHRvIGhpZ2hsaWdodCByZS1yZW5kZXJzXG4gICAgJ2hpZ2hsaWdodF9ibGl0JywgLy8gYm9vbGVhbiAtIFdoZXRoZXIgb3Igbm90IHRvIGhpZ2hsaWdodCBibGl0IHJlZ2lvbnNcbiAgICAnbmV3bGluZV93aWR0aCcsIC8vIGludGVnZXIgLSBXaWR0aCBvZiBuZXdsaW5lIGNoYXJhY3RlcnNcbiAgICAndGFiX3dpZHRoJywgLy8gaW50ZWdlciAtIFRhYiBjaGFyYWN0ZXIgd2lkdGggbWVhc3VyZWQgaW4gc3BhY2UgY2hhcmFjdGVyc1xuICAgICd1c2Vfc3BhY2VzJywgLy8gYm9vbGVhbiAtIFVzZSBzcGFjZXMgZm9yIGluZGVudHMgaW5zdGVhZCBvZiB0YWJzXG4gICAgJ2hpc3RvcnlfZ3JvdXBfZGVsYXknLCAvLyBpbnRlZ2VyIC0gVGltZSAobXMpIHRvIHdhaXQgZm9yIGFub3RoZXIgaGlzdG9yaWNhbCBldmVudFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYmVmb3JlIGF1dG9tYXRpY2FsbHkgZ3JvdXBpbmcgdGhlbSAocmVsYXRlZCB0byB1bmRvIGFuZCByZWRvIFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYWN0aW9ucylcbl0pO1xuXG4vLyBTZXQgZGVmYXVsdHNcbmNvbmZpZy50YWJfd2lkdGggPSA0O1xuY29uZmlnLnVzZV9zcGFjZXMgPSB0cnVlO1xuY29uZmlnLmhpc3RvcnlfZ3JvdXBfZGVsYXkgPSAxMDA7XG5cbmV4cG9ydHMuY29uZmlnID0gY29uZmlnO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cbnZhciBrZXltYXAgPSByZXF1aXJlKCcuL2V2ZW50cy9tYXAuanMnKTtcbnZhciByZWdpc3RlciA9IGtleW1hcC5NYXAucmVnaXN0ZXI7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcbnZhciBjb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZy5qcycpO1xuY29uZmlnID0gY29uZmlnLmNvbmZpZztcblxuLyoqXG4gKiBJbnB1dCBjdXJzb3IuXG4gKi9cbnZhciBDdXJzb3IgPSBmdW5jdGlvbihtb2RlbCwgcHVzaF9oaXN0b3J5KSB7XG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzKTtcbiAgICB0aGlzLl9tb2RlbCA9IG1vZGVsO1xuICAgIHRoaXMuX3B1c2hfaGlzdG9yeSA9IHB1c2hfaGlzdG9yeTtcblxuICAgIHRoaXMucHJpbWFyeV9yb3cgPSAwO1xuICAgIHRoaXMucHJpbWFyeV9jaGFyID0gMDtcbiAgICB0aGlzLnNlY29uZGFyeV9yb3cgPSAwO1xuICAgIHRoaXMuc2Vjb25kYXJ5X2NoYXIgPSAwO1xuXG4gICAgdGhpcy5faW5pdF9wcm9wZXJ0aWVzKCk7XG4gICAgdGhpcy5fcmVnaXN0ZXJfYXBpKCk7XG59O1xudXRpbHMuaW5oZXJpdChDdXJzb3IsIHV0aWxzLlBvc3RlckNsYXNzKTtcblxuLyoqXG4gKiBVbnJlZ2lzdGVyIHRoZSBhY3Rpb25zIGFuZCBldmVudCBsaXN0ZW5lcnMgb2YgdGhpcyBjdXJzb3IuXG4gKi9cbkN1cnNvci5wcm90b3R5cGUudW5yZWdpc3RlciA9IGZ1bmN0aW9uKCkge1xuICAgIGtleW1hcC51bnJlZ2lzdGVyX2J5X3RhZyh0aGlzKTtcbn07XG5cbi8qKlxuICogR2V0cyB0aGUgc3RhdGUgb2YgdGhlIGN1cnNvci5cbiAqIEByZXR1cm4ge29iamVjdH0gc3RhdGVcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5nZXRfc3RhdGUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBwcmltYXJ5X3JvdzogdGhpcy5wcmltYXJ5X3JvdyxcbiAgICAgICAgcHJpbWFyeV9jaGFyOiB0aGlzLnByaW1hcnlfY2hhcixcbiAgICAgICAgc2Vjb25kYXJ5X3JvdzogdGhpcy5zZWNvbmRhcnlfcm93LFxuICAgICAgICBzZWNvbmRhcnlfY2hhcjogdGhpcy5zZWNvbmRhcnlfY2hhcixcbiAgICAgICAgX21lbW9yeV9jaGFyOiB0aGlzLl9tZW1vcnlfY2hhclxuICAgIH07XG59O1xuXG4vKipcbiAqIFNldHMgdGhlIHN0YXRlIG9mIHRoZSBjdXJzb3IuXG4gKiBAcGFyYW0ge29iamVjdH0gc3RhdGVcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW2hpc3RvcmljYWxdIC0gRGVmYXVsdHMgdG8gdHJ1ZS4gIFdoZXRoZXIgdGhpcyBzaG91bGQgYmUgcmVjb3JkZWQgaW4gaGlzdG9yeS5cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5zZXRfc3RhdGUgPSBmdW5jdGlvbihzdGF0ZSwgaGlzdG9yaWNhbCkge1xuICAgIGlmIChzdGF0ZSkge1xuICAgICAgICB2YXIgb2xkX3N0YXRlID0ge307XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBzdGF0ZSkge1xuICAgICAgICAgICAgaWYgKHN0YXRlLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICBvbGRfc3RhdGVba2V5XSA9IHRoaXNba2V5XTtcbiAgICAgICAgICAgICAgICB0aGlzW2tleV0gPSBzdGF0ZVtrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGhpc3RvcmljYWwgPT09IHVuZGVmaW5lZCB8fCBoaXN0b3JpY2FsID09PSB0cnVlKSB7XG4gICAgICAgICAgICB0aGlzLl9wdXNoX2hpc3RvcnkoJ3NldF9zdGF0ZScsIFtzdGF0ZV0sICdzZXRfc3RhdGUnLCBbb2xkX3N0YXRlXSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIE1vdmVzIHRoZSBwcmltYXJ5IGN1cnNvciBhIGdpdmVuIG9mZnNldC5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IHhcbiAqIEBwYXJhbSAge2ludGVnZXJ9IHlcbiAqIEBwYXJhbSAge2Jvb2xlYW59IChvcHRpb25hbCkgaG9wPWZhbHNlIC0gaG9wIHRvIHRoZSBvdGhlciBzaWRlIG9mIHRoZVxuICogICAgICAgICAgICAgICAgICAgc2VsZWN0ZWQgcmVnaW9uIGlmIHRoZSBwcmltYXJ5IGlzIG9uIHRoZSBvcHBvc2l0ZSBvZiB0aGVcbiAqICAgICAgICAgICAgICAgICAgIGRpcmVjdGlvbiBvZiBtb3Rpb24uXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3IucHJvdG90eXBlLm1vdmVfcHJpbWFyeSA9IGZ1bmN0aW9uKHgsIHksIGhvcCkge1xuICAgIGlmIChob3ApIHtcbiAgICAgICAgaWYgKHRoaXMucHJpbWFyeV9yb3cgIT0gdGhpcy5zZWNvbmRhcnlfcm93IHx8IHRoaXMucHJpbWFyeV9jaGFyICE9IHRoaXMuc2Vjb25kYXJ5X2NoYXIpIHtcbiAgICAgICAgICAgIHZhciBzdGFydF9yb3cgPSB0aGlzLnN0YXJ0X3JvdztcbiAgICAgICAgICAgIHZhciBzdGFydF9jaGFyID0gdGhpcy5zdGFydF9jaGFyO1xuICAgICAgICAgICAgdmFyIGVuZF9yb3cgPSB0aGlzLmVuZF9yb3c7XG4gICAgICAgICAgICB2YXIgZW5kX2NoYXIgPSB0aGlzLmVuZF9jaGFyO1xuICAgICAgICAgICAgaWYgKHg8MCB8fCB5PDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLnByaW1hcnlfcm93ID0gc3RhcnRfcm93O1xuICAgICAgICAgICAgICAgIHRoaXMucHJpbWFyeV9jaGFyID0gc3RhcnRfY2hhcjtcbiAgICAgICAgICAgICAgICB0aGlzLnNlY29uZGFyeV9yb3cgPSBlbmRfcm93O1xuICAgICAgICAgICAgICAgIHRoaXMuc2Vjb25kYXJ5X2NoYXIgPSBlbmRfY2hhcjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wcmltYXJ5X3JvdyA9IGVuZF9yb3c7XG4gICAgICAgICAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgPSBlbmRfY2hhcjtcbiAgICAgICAgICAgICAgICB0aGlzLnNlY29uZGFyeV9yb3cgPSBzdGFydF9yb3c7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWNvbmRhcnlfY2hhciA9IHN0YXJ0X2NoYXI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoeCA8IDApIHtcbiAgICAgICAgaWYgKHRoaXMucHJpbWFyeV9jaGFyICsgeCA8IDApIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnByaW1hcnlfcm93ID09PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgPSAwO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnByaW1hcnlfcm93IC09IDE7XG4gICAgICAgICAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgPSB0aGlzLl9tb2RlbC5fcm93c1t0aGlzLnByaW1hcnlfcm93XS5sZW5ndGg7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnByaW1hcnlfY2hhciArPSB4O1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmICh4ID4gMCkge1xuICAgICAgICBpZiAodGhpcy5wcmltYXJ5X2NoYXIgKyB4ID4gdGhpcy5fbW9kZWwuX3Jvd3NbdGhpcy5wcmltYXJ5X3Jvd10ubGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5wcmltYXJ5X3JvdyA9PT0gdGhpcy5fbW9kZWwuX3Jvd3MubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgICAgIHRoaXMucHJpbWFyeV9jaGFyID0gdGhpcy5fbW9kZWwuX3Jvd3NbdGhpcy5wcmltYXJ5X3Jvd10ubGVuZ3RoO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnByaW1hcnlfcm93ICs9IDE7XG4gICAgICAgICAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgKz0geDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFJlbWVtYmVyIHRoZSBjaGFyYWN0ZXIgcG9zaXRpb24sIHZlcnRpY2FsIG5hdmlnYXRpb24gYWNyb3NzIGVtcHR5IGxpbmVzXG4gICAgLy8gc2hvdWxkbid0IGNhdXNlIHRoZSBob3Jpem9udGFsIHBvc2l0aW9uIHRvIGJlIGxvc3QuXG4gICAgaWYgKHggIT09IDApIHtcbiAgICAgICAgdGhpcy5fbWVtb3J5X2NoYXIgPSB0aGlzLnByaW1hcnlfY2hhcjtcbiAgICB9XG5cbiAgICBpZiAoeSAhPT0gMCkge1xuICAgICAgICB0aGlzLnByaW1hcnlfcm93ICs9IHk7XG4gICAgICAgIHRoaXMucHJpbWFyeV9yb3cgPSBNYXRoLm1pbihNYXRoLm1heCh0aGlzLnByaW1hcnlfcm93LCAwKSwgdGhpcy5fbW9kZWwuX3Jvd3MubGVuZ3RoLTEpO1xuICAgICAgICBpZiAodGhpcy5fbWVtb3J5X2NoYXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgPSB0aGlzLl9tZW1vcnlfY2hhcjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5wcmltYXJ5X2NoYXIgPiB0aGlzLl9tb2RlbC5fcm93c1t0aGlzLnByaW1hcnlfcm93XS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMucHJpbWFyeV9jaGFyID0gdGhpcy5fbW9kZWwuX3Jvd3NbdGhpcy5wcmltYXJ5X3Jvd10ubGVuZ3RoO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnKTsgXG59O1xuXG4vKipcbiAqIFdhbGsgdGhlIHByaW1hcnkgY3Vyc29yIGluIGEgZGlyZWN0aW9uIHVudGlsIGEgbm90LXRleHQgY2hhcmFjdGVyIGlzIGZvdW5kLlxuICogQHBhcmFtICB7aW50ZWdlcn0gZGlyZWN0aW9uXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3IucHJvdG90eXBlLndvcmRfcHJpbWFyeSA9IGZ1bmN0aW9uKGRpcmVjdGlvbikge1xuICAgIC8vIE1ha2Ugc3VyZSBkaXJlY3Rpb24gaXMgMSBvciAtMS5cbiAgICBkaXJlY3Rpb24gPSBkaXJlY3Rpb24gPCAwID8gLTEgOiAxO1xuXG4gICAgLy8gSWYgbW92aW5nIGxlZnQgYW5kIGF0IGVuZCBvZiByb3csIG1vdmUgdXAgYSByb3cgaWYgcG9zc2libGUuXG4gICAgaWYgKHRoaXMucHJpbWFyeV9jaGFyID09PSAwICYmIGRpcmVjdGlvbiA9PSAtMSkge1xuICAgICAgICBpZiAodGhpcy5wcmltYXJ5X3JvdyAhPT0gMCkge1xuICAgICAgICAgICAgdGhpcy5wcmltYXJ5X3Jvdy0tO1xuICAgICAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgPSB0aGlzLl9tb2RlbC5fcm93c1t0aGlzLnByaW1hcnlfcm93XS5sZW5ndGg7XG4gICAgICAgICAgICB0aGlzLl9tZW1vcnlfY2hhciA9IHRoaXMucHJpbWFyeV9jaGFyO1xuICAgICAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnKTsgXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIElmIG1vdmluZyByaWdodCBhbmQgYXQgZW5kIG9mIHJvdywgbW92ZSBkb3duIGEgcm93IGlmIHBvc3NpYmxlLlxuICAgIGlmICh0aGlzLnByaW1hcnlfY2hhciA+PSB0aGlzLl9tb2RlbC5fcm93c1t0aGlzLnByaW1hcnlfcm93XS5sZW5ndGggJiYgZGlyZWN0aW9uID09IDEpIHtcbiAgICAgICAgaWYgKHRoaXMucHJpbWFyeV9yb3cgPCB0aGlzLl9tb2RlbC5fcm93cy5sZW5ndGgtMSkge1xuICAgICAgICAgICAgdGhpcy5wcmltYXJ5X3JvdysrO1xuICAgICAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgPSAwO1xuICAgICAgICAgICAgdGhpcy5fbWVtb3J5X2NoYXIgPSB0aGlzLnByaW1hcnlfY2hhcjtcbiAgICAgICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgaSA9IHRoaXMucHJpbWFyeV9jaGFyO1xuICAgIHZhciBoaXRfdGV4dCA9IGZhbHNlO1xuICAgIHZhciByb3dfdGV4dCA9IHRoaXMuX21vZGVsLl9yb3dzW3RoaXMucHJpbWFyeV9yb3ddO1xuICAgIGlmIChkaXJlY3Rpb24gPT0gLTEpIHtcbiAgICAgICAgd2hpbGUgKDAgPCBpICYmICEoaGl0X3RleHQgJiYgdXRpbHMubm90X3RleHQocm93X3RleHRbaS0xXSkpKSB7XG4gICAgICAgICAgICBoaXRfdGV4dCA9IGhpdF90ZXh0IHx8ICF1dGlscy5ub3RfdGV4dChyb3dfdGV4dFtpLTFdKTtcbiAgICAgICAgICAgIGkgKz0gZGlyZWN0aW9uO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgd2hpbGUgKGkgPCByb3dfdGV4dC5sZW5ndGggJiYgIShoaXRfdGV4dCAmJiB1dGlscy5ub3RfdGV4dChyb3dfdGV4dFtpXSkpKSB7XG4gICAgICAgICAgICBoaXRfdGV4dCA9IGhpdF90ZXh0IHx8ICF1dGlscy5ub3RfdGV4dChyb3dfdGV4dFtpXSk7XG4gICAgICAgICAgICBpICs9IGRpcmVjdGlvbjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMucHJpbWFyeV9jaGFyID0gaTtcbiAgICB0aGlzLl9tZW1vcnlfY2hhciA9IHRoaXMucHJpbWFyeV9jaGFyO1xuICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxufTtcblxuLyoqXG4gKiBTZWxlY3QgYWxsIG9mIHRoZSB0ZXh0LlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5zZWxlY3RfYWxsID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5wcmltYXJ5X3JvdyA9IHRoaXMuX21vZGVsLl9yb3dzLmxlbmd0aC0xO1xuICAgIHRoaXMucHJpbWFyeV9jaGFyID0gdGhpcy5fbW9kZWwuX3Jvd3NbdGhpcy5wcmltYXJ5X3Jvd10ubGVuZ3RoO1xuICAgIHRoaXMuc2Vjb25kYXJ5X3JvdyA9IDA7XG4gICAgdGhpcy5zZWNvbmRhcnlfY2hhciA9IDA7XG4gICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnKTsgXG59O1xuXG4vKipcbiAqIE1vdmUgdGhlIHByaW1hcnkgY3Vyc29yIHRvIHRoZSBsaW5lIGVuZC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUucHJpbWFyeV9nb3RvX2VuZCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIEdldCB0aGUgc3RhcnQgb2YgdGhlIGFjdHVhbCBjb250ZW50LCBza2lwcGluZyB0aGUgd2hpdGVzcGFjZS5cbiAgICB2YXIgcm93X3RleHQgPSB0aGlzLl9tb2RlbC5fcm93c1t0aGlzLnByaW1hcnlfcm93XTtcbiAgICB2YXIgdHJpbW1lZCA9IHJvd190ZXh0LnRyaW0oKTtcbiAgICB2YXIgc3RhcnQgPSByb3dfdGV4dC5pbmRleE9mKHRyaW1tZWQpO1xuICAgIHZhciB0YXJnZXQgPSByb3dfdGV4dC5sZW5ndGg7XG4gICAgaWYgKDAgPCBzdGFydCAmJiBzdGFydCA8IHJvd190ZXh0Lmxlbmd0aCAmJiB0aGlzLnByaW1hcnlfY2hhciAhPT0gc3RhcnQgKyB0cmltbWVkLmxlbmd0aCkge1xuICAgICAgICB0YXJnZXQgPSBzdGFydCArIHRyaW1tZWQubGVuZ3RoO1xuICAgIH1cblxuICAgIC8vIE1vdmUgdGhlIGN1cnNvci5cbiAgICB0aGlzLnByaW1hcnlfY2hhciA9IHRhcmdldDtcbiAgICB0aGlzLl9tZW1vcnlfY2hhciA9IHRoaXMucHJpbWFyeV9jaGFyO1xuICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxufTtcblxuLyoqXG4gKiBNb3ZlIHRoZSBwcmltYXJ5IGN1cnNvciB0byB0aGUgbGluZSBzdGFydC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUucHJpbWFyeV9nb3RvX3N0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gR2V0IHRoZSBzdGFydCBvZiB0aGUgYWN0dWFsIGNvbnRlbnQsIHNraXBwaW5nIHRoZSB3aGl0ZXNwYWNlLlxuICAgIHZhciByb3dfdGV4dCA9IHRoaXMuX21vZGVsLl9yb3dzW3RoaXMucHJpbWFyeV9yb3ddO1xuICAgIHZhciBzdGFydCA9IHJvd190ZXh0LmluZGV4T2Yocm93X3RleHQudHJpbSgpKTtcbiAgICB2YXIgdGFyZ2V0ID0gMDtcbiAgICBpZiAoMCA8IHN0YXJ0ICYmIHN0YXJ0IDwgcm93X3RleHQubGVuZ3RoICYmIHRoaXMucHJpbWFyeV9jaGFyICE9PSBzdGFydCkge1xuICAgICAgICB0YXJnZXQgPSBzdGFydDtcbiAgICB9XG5cbiAgICAvLyBNb3ZlIHRoZSBjdXJzb3IuXG4gICAgdGhpcy5wcmltYXJ5X2NoYXIgPSB0YXJnZXQ7XG4gICAgdGhpcy5fbWVtb3J5X2NoYXIgPSB0aGlzLnByaW1hcnlfY2hhcjtcbiAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZScpOyBcbn07XG5cbi8qKlxuICogU2VsZWN0cyBhIHdvcmQgYXQgdGhlIGdpdmVuIGxvY2F0aW9uLlxuICogQHBhcmFtIHtpbnRlZ2VyfSByb3dfaW5kZXhcbiAqIEBwYXJhbSB7aW50ZWdlcn0gY2hhcl9pbmRleFxuICovXG5DdXJzb3IucHJvdG90eXBlLnNlbGVjdF93b3JkID0gZnVuY3Rpb24ocm93X2luZGV4LCBjaGFyX2luZGV4KSB7XG4gICAgdGhpcy5zZXRfYm90aChyb3dfaW5kZXgsIGNoYXJfaW5kZXgpO1xuICAgIHRoaXMud29yZF9wcmltYXJ5KC0xKTtcbiAgICB0aGlzLl9yZXNldF9zZWNvbmRhcnkoKTtcbiAgICB0aGlzLndvcmRfcHJpbWFyeSgxKTtcbn07XG5cbi8qKlxuICogU2V0IHRoZSBwcmltYXJ5IGN1cnNvciBwb3NpdGlvblxuICogQHBhcmFtIHtpbnRlZ2VyfSByb3dfaW5kZXhcbiAqIEBwYXJhbSB7aW50ZWdlcn0gY2hhcl9pbmRleFxuICovXG5DdXJzb3IucHJvdG90eXBlLnNldF9wcmltYXJ5ID0gZnVuY3Rpb24ocm93X2luZGV4LCBjaGFyX2luZGV4KSB7XG4gICAgdGhpcy5wcmltYXJ5X3JvdyA9IHJvd19pbmRleDtcbiAgICB0aGlzLnByaW1hcnlfY2hhciA9IGNoYXJfaW5kZXg7XG5cbiAgICAvLyBSZW1lbWJlciB0aGUgY2hhcmFjdGVyIHBvc2l0aW9uLCB2ZXJ0aWNhbCBuYXZpZ2F0aW9uIGFjcm9zcyBlbXB0eSBsaW5lc1xuICAgIC8vIHNob3VsZG4ndCBjYXVzZSB0aGUgaG9yaXpvbnRhbCBwb3NpdGlvbiB0byBiZSBsb3N0LlxuICAgIHRoaXMuX21lbW9yeV9jaGFyID0gdGhpcy5wcmltYXJ5X2NoYXI7XG5cbiAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZScpOyBcbn07XG5cbi8qKlxuICogU2V0IHRoZSBzZWNvbmRhcnkgY3Vyc29yIHBvc2l0aW9uXG4gKiBAcGFyYW0ge2ludGVnZXJ9IHJvd19pbmRleFxuICogQHBhcmFtIHtpbnRlZ2VyfSBjaGFyX2luZGV4XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuc2V0X3NlY29uZGFyeSA9IGZ1bmN0aW9uKHJvd19pbmRleCwgY2hhcl9pbmRleCkge1xuICAgIHRoaXMuc2Vjb25kYXJ5X3JvdyA9IHJvd19pbmRleDtcbiAgICB0aGlzLnNlY29uZGFyeV9jaGFyID0gY2hhcl9pbmRleDtcbiAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZScpOyBcbn07XG5cbi8qKlxuICogU2V0cyBib3RoIHRoZSBwcmltYXJ5IGFuZCBzZWNvbmRhcnkgY3Vyc29yIHBvc2l0aW9uc1xuICogQHBhcmFtIHtpbnRlZ2VyfSByb3dfaW5kZXhcbiAqIEBwYXJhbSB7aW50ZWdlcn0gY2hhcl9pbmRleFxuICovXG5DdXJzb3IucHJvdG90eXBlLnNldF9ib3RoID0gZnVuY3Rpb24ocm93X2luZGV4LCBjaGFyX2luZGV4KSB7XG4gICAgdGhpcy5wcmltYXJ5X3JvdyA9IHJvd19pbmRleDtcbiAgICB0aGlzLnByaW1hcnlfY2hhciA9IGNoYXJfaW5kZXg7XG4gICAgdGhpcy5zZWNvbmRhcnlfcm93ID0gcm93X2luZGV4O1xuICAgIHRoaXMuc2Vjb25kYXJ5X2NoYXIgPSBjaGFyX2luZGV4O1xuXG4gICAgLy8gUmVtZW1iZXIgdGhlIGNoYXJhY3RlciBwb3NpdGlvbiwgdmVydGljYWwgbmF2aWdhdGlvbiBhY3Jvc3MgZW1wdHkgbGluZXNcbiAgICAvLyBzaG91bGRuJ3QgY2F1c2UgdGhlIGhvcml6b250YWwgcG9zaXRpb24gdG8gYmUgbG9zdC5cbiAgICB0aGlzLl9tZW1vcnlfY2hhciA9IHRoaXMucHJpbWFyeV9jaGFyO1xuXG4gICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnKTsgXG59O1xuXG4vKipcbiAqIEhhbmRsZXMgd2hlbiBhIGtleSBpcyBwcmVzc2VkLlxuICogQHBhcmFtICB7RXZlbnR9IGUgLSBvcmlnaW5hbCBrZXkgcHJlc3MgZXZlbnQuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3IucHJvdG90eXBlLmtleXByZXNzID0gZnVuY3Rpb24oZSkge1xuICAgIHZhciBjaGFyX2NvZGUgPSBlLndoaWNoIHx8IGUua2V5Q29kZTtcbiAgICB2YXIgY2hhcl90eXBlZCA9IFN0cmluZy5mcm9tQ2hhckNvZGUoY2hhcl9jb2RlKTtcbiAgICB0aGlzLnJlbW92ZV9zZWxlY3RlZCgpO1xuICAgIHRoaXMuX2hpc3RvcmljYWwoZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuX21vZGVsX2FkZF90ZXh0KHRoaXMucHJpbWFyeV9yb3csIHRoaXMucHJpbWFyeV9jaGFyLCBjaGFyX3R5cGVkKTtcbiAgICB9KTtcbiAgICB0aGlzLm1vdmVfcHJpbWFyeSgxLCAwKTtcbiAgICB0aGlzLl9yZXNldF9zZWNvbmRhcnkoKTtcbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogSW5kZW50XG4gKiBAcGFyYW0gIHtFdmVudH0gZSAtIG9yaWdpbmFsIGtleSBwcmVzcyBldmVudC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuaW5kZW50ID0gZnVuY3Rpb24oZSkge1xuICAgIHZhciBpbmRlbnQgPSB0aGlzLl9tYWtlX2luZGVudHMoKVswXTtcbiAgICB0aGlzLl9oaXN0b3JpY2FsKGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodGhpcy5wcmltYXJ5X3JvdyA9PSB0aGlzLnNlY29uZGFyeV9yb3cgJiYgdGhpcy5wcmltYXJ5X2NoYXIgPT0gdGhpcy5zZWNvbmRhcnlfY2hhcikge1xuICAgICAgICAgICAgdGhpcy5fbW9kZWxfYWRkX3RleHQodGhpcy5wcmltYXJ5X3JvdywgdGhpcy5wcmltYXJ5X2NoYXIsIGluZGVudCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKHZhciByb3cgPSB0aGlzLnN0YXJ0X3Jvdzsgcm93IDw9IHRoaXMuZW5kX3Jvdzsgcm93KyspIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9tb2RlbF9hZGRfdGV4dChyb3csIDAsIGluZGVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICB0aGlzLnByaW1hcnlfY2hhciArPSBpbmRlbnQubGVuZ3RoO1xuICAgIHRoaXMuX21lbW9yeV9jaGFyID0gdGhpcy5wcmltYXJ5X2NoYXI7XG4gICAgdGhpcy5zZWNvbmRhcnlfY2hhciArPSBpbmRlbnQubGVuZ3RoO1xuICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIFVuaW5kZW50XG4gKiBAcGFyYW0gIHtFdmVudH0gZSAtIG9yaWdpbmFsIGtleSBwcmVzcyBldmVudC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUudW5pbmRlbnQgPSBmdW5jdGlvbihlKSB7XG4gICAgdmFyIGluZGVudHMgPSB0aGlzLl9tYWtlX2luZGVudHMoKTtcbiAgICB2YXIgcmVtb3ZlZF9zdGFydCA9IDA7XG4gICAgdmFyIHJlbW92ZWRfZW5kID0gMDtcblxuICAgIC8vIElmIG5vIHRleHQgaXMgc2VsZWN0ZWQsIHJlbW92ZSB0aGUgaW5kZW50IHByZWNlZGluZyB0aGVcbiAgICAvLyBjdXJzb3IgaWYgaXQgZXhpc3RzLlxuICAgIHRoaXMuX2hpc3RvcmljYWwoZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aGlzLnByaW1hcnlfcm93ID09IHRoaXMuc2Vjb25kYXJ5X3JvdyAmJiB0aGlzLnByaW1hcnlfY2hhciA9PSB0aGlzLnNlY29uZGFyeV9jaGFyKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGluZGVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgaW5kZW50ID0gaW5kZW50c1tpXTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5wcmltYXJ5X2NoYXIgPj0gaW5kZW50Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYmVmb3JlID0gdGhpcy5fbW9kZWwuZ2V0X3RleHQodGhpcy5wcmltYXJ5X3JvdywgdGhpcy5wcmltYXJ5X2NoYXItaW5kZW50Lmxlbmd0aCwgdGhpcy5wcmltYXJ5X3JvdywgdGhpcy5wcmltYXJ5X2NoYXIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYmVmb3JlID09IGluZGVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fbW9kZWxfcmVtb3ZlX3RleHQodGhpcy5wcmltYXJ5X3JvdywgdGhpcy5wcmltYXJ5X2NoYXItaW5kZW50Lmxlbmd0aCwgdGhpcy5wcmltYXJ5X3JvdywgdGhpcy5wcmltYXJ5X2NoYXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVtb3ZlZF9zdGFydCA9IGluZGVudC5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgICAgICByZW1vdmVkX2VuZCA9IGluZGVudC5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAvLyBUZXh0IGlzIHNlbGVjdGVkLiAgUmVtb3ZlIHRoZSBhbiBpbmRlbnQgZnJvbSB0aGUgYmVnaW5pbmdcbiAgICAgICAgLy8gb2YgZWFjaCByb3cgaWYgaXQgZXhpc3RzLlxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yICh2YXIgcm93ID0gdGhpcy5zdGFydF9yb3c7IHJvdyA8PSB0aGlzLmVuZF9yb3c7IHJvdysrKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpbmRlbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBpbmRlbnQgPSBpbmRlbnRzW2ldO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5fbW9kZWwuX3Jvd3Nbcm93XS5sZW5ndGggPj0gaW5kZW50Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuX21vZGVsLl9yb3dzW3Jvd10uc3Vic3RyaW5nKDAsIGluZGVudC5sZW5ndGgpID09IGluZGVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX21vZGVsX3JlbW92ZV90ZXh0KHJvdywgMCwgcm93LCBpbmRlbnQubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocm93ID09IHRoaXMuc3RhcnRfcm93KSByZW1vdmVkX3N0YXJ0ID0gaW5kZW50Lmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocm93ID09IHRoaXMuZW5kX3JvdykgcmVtb3ZlZF9lbmQgPSBpbmRlbnQubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuICAgIFxuICAgIC8vIE1vdmUgdGhlIHNlbGVjdGVkIGNoYXJhY3RlcnMgYmFja3dhcmRzIGlmIGluZGVudHMgd2VyZSByZW1vdmVkLlxuICAgIHZhciBzdGFydF9pc19wcmltYXJ5ID0gKHRoaXMucHJpbWFyeV9yb3cgPT0gdGhpcy5zdGFydF9yb3cgJiYgdGhpcy5wcmltYXJ5X2NoYXIgPT0gdGhpcy5zdGFydF9jaGFyKTtcbiAgICBpZiAoc3RhcnRfaXNfcHJpbWFyeSkge1xuICAgICAgICB0aGlzLnByaW1hcnlfY2hhciAtPSByZW1vdmVkX3N0YXJ0O1xuICAgICAgICB0aGlzLnNlY29uZGFyeV9jaGFyIC09IHJlbW92ZWRfZW5kO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMucHJpbWFyeV9jaGFyIC09IHJlbW92ZWRfZW5kO1xuICAgICAgICB0aGlzLnNlY29uZGFyeV9jaGFyIC09IHJlbW92ZWRfc3RhcnQ7XG4gICAgfVxuICAgIHRoaXMuX21lbW9yeV9jaGFyID0gdGhpcy5wcmltYXJ5X2NoYXI7XG4gICAgaWYgKHJlbW92ZWRfZW5kIHx8IHJlbW92ZWRfc3RhcnQpIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIEluc2VydCBhIG5ld2xpbmVcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUubmV3bGluZSA9IGZ1bmN0aW9uKGUpIHtcbiAgICB0aGlzLnJlbW92ZV9zZWxlY3RlZCgpO1xuXG4gICAgLy8gR2V0IHRoZSBibGFuayBzcGFjZSBhdCB0aGUgYmVnaW5pbmcgb2YgdGhlIGxpbmUuXG4gICAgdmFyIGxpbmVfdGV4dCA9IHRoaXMuX21vZGVsLmdldF90ZXh0KHRoaXMucHJpbWFyeV9yb3csIDAsIHRoaXMucHJpbWFyeV9yb3csIHRoaXMucHJpbWFyeV9jaGFyKTtcbiAgICB2YXIgc3BhY2VsZXNzID0gbGluZV90ZXh0LnRyaW0oKTtcbiAgICB2YXIgbGVmdCA9IGxpbmVfdGV4dC5sZW5ndGg7XG4gICAgaWYgKHNwYWNlbGVzcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGxlZnQgPSBsaW5lX3RleHQuaW5kZXhPZihzcGFjZWxlc3MpO1xuICAgIH1cbiAgICB2YXIgaW5kZW50ID0gbGluZV90ZXh0LnN1YnN0cmluZygwLCBsZWZ0KTtcbiAgICBcbiAgICB0aGlzLl9oaXN0b3JpY2FsKGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLl9tb2RlbF9hZGRfdGV4dCh0aGlzLnByaW1hcnlfcm93LCB0aGlzLnByaW1hcnlfY2hhciwgJ1xcbicgKyBpbmRlbnQpO1xuICAgIH0pO1xuICAgIHRoaXMucHJpbWFyeV9yb3cgKz0gMTtcbiAgICB0aGlzLnByaW1hcnlfY2hhciA9IGluZGVudC5sZW5ndGg7XG4gICAgdGhpcy5fbWVtb3J5X2NoYXIgPSB0aGlzLnByaW1hcnlfY2hhcjtcbiAgICB0aGlzLl9yZXNldF9zZWNvbmRhcnkoKTtcbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogSW5zZXJ0IHRleHRcbiAqIEBwYXJhbSAge3N0cmluZ30gdGV4dFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5pbnNlcnRfdGV4dCA9IGZ1bmN0aW9uKHRleHQpIHtcbiAgICB0aGlzLnJlbW92ZV9zZWxlY3RlZCgpO1xuICAgIHRoaXMuX2hpc3RvcmljYWwoZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuX21vZGVsX2FkZF90ZXh0KHRoaXMucHJpbWFyeV9yb3csIHRoaXMucHJpbWFyeV9jaGFyLCB0ZXh0KTtcbiAgICB9KTtcbiAgICBcbiAgICAvLyBNb3ZlIGN1cnNvciB0byB0aGUgZW5kLlxuICAgIGlmICh0ZXh0LmluZGV4T2YoJ1xcbicpPT0tMSkge1xuICAgICAgICB0aGlzLnByaW1hcnlfY2hhciA9IHRoaXMuc3RhcnRfY2hhciArIHRleHQubGVuZ3RoO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBsaW5lcyA9IHRleHQuc3BsaXQoJ1xcbicpO1xuICAgICAgICB0aGlzLnByaW1hcnlfcm93ICs9IGxpbmVzLmxlbmd0aCAtIDE7XG4gICAgICAgIHRoaXMucHJpbWFyeV9jaGFyID0gbGluZXNbbGluZXMubGVuZ3RoLTFdLmxlbmd0aDtcbiAgICB9XG4gICAgdGhpcy5fcmVzZXRfc2Vjb25kYXJ5KCk7XG5cbiAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZScpOyBcbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogUGFzdGUgdGV4dFxuICogQHBhcmFtICB7c3RyaW5nfSB0ZXh0XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3IucHJvdG90eXBlLnBhc3RlID0gZnVuY3Rpb24odGV4dCkge1xuICAgIGlmICh0aGlzLl9jb3BpZWRfcm93ID09PSB0ZXh0KSB7XG4gICAgICAgIHRoaXMuX2hpc3RvcmljYWwoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGlzLl9tb2RlbF9hZGRfcm93KHRoaXMucHJpbWFyeV9yb3csIHRleHQpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5wcmltYXJ5X3JvdysrO1xuICAgICAgICB0aGlzLnNlY29uZGFyeV9yb3crKztcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnKTsgXG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5pbnNlcnRfdGV4dCh0ZXh0KTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFJlbW92ZSB0aGUgc2VsZWN0ZWQgdGV4dFxuICogQHJldHVybiB7Ym9vbGVhbn0gdHJ1ZSBpZiB0ZXh0IHdhcyByZW1vdmVkLlxuICovXG5DdXJzb3IucHJvdG90eXBlLnJlbW92ZV9zZWxlY3RlZCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLnByaW1hcnlfcm93ICE9PSB0aGlzLnNlY29uZGFyeV9yb3cgfHwgdGhpcy5wcmltYXJ5X2NoYXIgIT09IHRoaXMuc2Vjb25kYXJ5X2NoYXIpIHtcbiAgICAgICAgdmFyIHJvd19pbmRleCA9IHRoaXMuc3RhcnRfcm93O1xuICAgICAgICB2YXIgY2hhcl9pbmRleCA9IHRoaXMuc3RhcnRfY2hhcjtcbiAgICAgICAgdGhpcy5faGlzdG9yaWNhbChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHRoaXMuX21vZGVsX3JlbW92ZV90ZXh0KHRoaXMuc3RhcnRfcm93LCB0aGlzLnN0YXJ0X2NoYXIsIHRoaXMuZW5kX3JvdywgdGhpcy5lbmRfY2hhcik7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLnByaW1hcnlfcm93ID0gcm93X2luZGV4O1xuICAgICAgICB0aGlzLnByaW1hcnlfY2hhciA9IGNoYXJfaW5kZXg7XG4gICAgICAgIHRoaXMuX3Jlc2V0X3NlY29uZGFyeSgpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZScpOyBcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn07XG5cbi8qKlxuICogR2V0cyB0aGUgc2VsZWN0ZWQgdGV4dC5cbiAqIEByZXR1cm4ge3N0cmluZ30gc2VsZWN0ZWQgdGV4dFxuICovXG5DdXJzb3IucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLnByaW1hcnlfcm93ID09IHRoaXMuc2Vjb25kYXJ5X3JvdyAmJiB0aGlzLnByaW1hcnlfY2hhciA9PSB0aGlzLnNlY29uZGFyeV9jaGFyKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9tb2RlbC5fcm93c1t0aGlzLnByaW1hcnlfcm93XTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdGhpcy5fbW9kZWwuZ2V0X3RleHQodGhpcy5zdGFydF9yb3csIHRoaXMuc3RhcnRfY2hhciwgdGhpcy5lbmRfcm93LCB0aGlzLmVuZF9jaGFyKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEN1dHMgdGhlIHNlbGVjdGVkIHRleHQuXG4gKiBAcmV0dXJuIHtzdHJpbmd9IHNlbGVjdGVkIHRleHRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5jdXQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGV4dCA9IHRoaXMuZ2V0KCk7XG4gICAgaWYgKHRoaXMucHJpbWFyeV9yb3cgPT0gdGhpcy5zZWNvbmRhcnlfcm93ICYmIHRoaXMucHJpbWFyeV9jaGFyID09IHRoaXMuc2Vjb25kYXJ5X2NoYXIpIHtcbiAgICAgICAgdGhpcy5fY29waWVkX3JvdyA9IHRoaXMuX21vZGVsLl9yb3dzW3RoaXMucHJpbWFyeV9yb3ddOyAgICBcbiAgICAgICAgdGhpcy5faGlzdG9yaWNhbChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHRoaXMuX21vZGVsX3JlbW92ZV9yb3codGhpcy5wcmltYXJ5X3Jvdyk7XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2NvcGllZF9yb3cgPSBudWxsO1xuICAgICAgICB0aGlzLnJlbW92ZV9zZWxlY3RlZCgpO1xuICAgIH1cbiAgICByZXR1cm4gdGV4dDtcbn07XG5cbi8qKlxuICogQ29waWVzIHRoZSBzZWxlY3RlZCB0ZXh0LlxuICogQHJldHVybiB7c3RyaW5nfSBzZWxlY3RlZCB0ZXh0XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0ZXh0ID0gdGhpcy5nZXQoKTtcbiAgICBpZiAodGhpcy5wcmltYXJ5X3JvdyA9PSB0aGlzLnNlY29uZGFyeV9yb3cgJiYgdGhpcy5wcmltYXJ5X2NoYXIgPT0gdGhpcy5zZWNvbmRhcnlfY2hhcikge1xuICAgICAgICB0aGlzLl9jb3BpZWRfcm93ID0gdGhpcy5fbW9kZWwuX3Jvd3NbdGhpcy5wcmltYXJ5X3Jvd107XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fY29waWVkX3JvdyA9IG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0ZXh0O1xufTtcblxuLyoqXG4gKiBEZWxldGUgZm9yd2FyZCwgdHlwaWNhbGx5IGNhbGxlZCBieSBgZGVsZXRlYCBrZXlwcmVzcy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuZGVsZXRlX2ZvcndhcmQgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoIXRoaXMucmVtb3ZlX3NlbGVjdGVkKCkpIHtcbiAgICAgICAgdGhpcy5tb3ZlX3ByaW1hcnkoMSwgMCk7XG4gICAgICAgIHRoaXMucmVtb3ZlX3NlbGVjdGVkKCk7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBEZWxldGUgYmFja3dhcmQsIHR5cGljYWxseSBjYWxsZWQgYnkgYGJhY2tzcGFjZWAga2V5cHJlc3MuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3IucHJvdG90eXBlLmRlbGV0ZV9iYWNrd2FyZCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICghdGhpcy5yZW1vdmVfc2VsZWN0ZWQoKSkge1xuICAgICAgICB0aGlzLm1vdmVfcHJpbWFyeSgtMSwgMCk7XG4gICAgICAgIHRoaXMucmVtb3ZlX3NlbGVjdGVkKCk7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBEZWxldGUgb25lIHdvcmQgYmFja3dhcmRzLlxuICogQHJldHVybiB7Ym9vbGVhbn0gc3VjY2Vzc1xuICovXG5DdXJzb3IucHJvdG90eXBlLmRlbGV0ZV93b3JkX2xlZnQgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoIXRoaXMucmVtb3ZlX3NlbGVjdGVkKCkpIHtcbiAgICAgICAgaWYgKHRoaXMucHJpbWFyeV9jaGFyID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLndvcmRfcHJpbWFyeSgtMSk7IFxuICAgICAgICAgICAgdGhpcy5yZW1vdmVfc2VsZWN0ZWQoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFdhbGsgYmFja3dhcmRzIHVudGlsIGNoYXIgaW5kZXggaXMgMCBvclxuICAgICAgICAgICAgLy8gYSBkaWZmZXJlbnQgdHlwZSBvZiBjaGFyYWN0ZXIgaXMgaGl0LlxuICAgICAgICAgICAgdmFyIHJvdyA9IHRoaXMuX21vZGVsLl9yb3dzW3RoaXMucHJpbWFyeV9yb3ddO1xuICAgICAgICAgICAgdmFyIGkgPSB0aGlzLnByaW1hcnlfY2hhciAtIDE7XG4gICAgICAgICAgICB2YXIgc3RhcnRfbm90X3RleHQgPSB1dGlscy5ub3RfdGV4dChyb3dbaV0pO1xuICAgICAgICAgICAgd2hpbGUgKGkgPj0gMCAmJiB1dGlscy5ub3RfdGV4dChyb3dbaV0pID09IHN0YXJ0X25vdF90ZXh0KSB7XG4gICAgICAgICAgICAgICAgaS0tO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5zZWNvbmRhcnlfY2hhciA9IGkrMTtcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlX3NlbGVjdGVkKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIERlbGV0ZSBvbmUgd29yZCBmb3J3YXJkcy5cbiAqIEByZXR1cm4ge2Jvb2xlYW59IHN1Y2Nlc3NcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5kZWxldGVfd29yZF9yaWdodCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICghdGhpcy5yZW1vdmVfc2VsZWN0ZWQoKSkge1xuICAgICAgICB2YXIgcm93ID0gdGhpcy5fbW9kZWwuX3Jvd3NbdGhpcy5wcmltYXJ5X3Jvd107XG4gICAgICAgIGlmICh0aGlzLnByaW1hcnlfY2hhciA9PT0gcm93Lmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy53b3JkX3ByaW1hcnkoMSk7IFxuICAgICAgICAgICAgdGhpcy5yZW1vdmVfc2VsZWN0ZWQoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFdhbGsgZm9yd2FyZHMgdW50aWwgY2hhciBpbmRleCBpcyBhdCBlbmQgb3JcbiAgICAgICAgICAgIC8vIGEgZGlmZmVyZW50IHR5cGUgb2YgY2hhcmFjdGVyIGlzIGhpdC5cbiAgICAgICAgICAgIHZhciBpID0gdGhpcy5wcmltYXJ5X2NoYXI7XG4gICAgICAgICAgICB2YXIgc3RhcnRfbm90X3RleHQgPSB1dGlscy5ub3RfdGV4dChyb3dbaV0pO1xuICAgICAgICAgICAgd2hpbGUgKGkgPCByb3cubGVuZ3RoICYmIHV0aWxzLm5vdF90ZXh0KHJvd1tpXSkgPT0gc3RhcnRfbm90X3RleHQpIHtcbiAgICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnNlY29uZGFyeV9jaGFyID0gaTtcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlX3NlbGVjdGVkKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5fZW5kX2hpc3RvcmljYWxfbW92ZSgpO1xuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBSZXNldCB0aGUgc2Vjb25kYXJ5IGN1cnNvciB0byB0aGUgdmFsdWUgb2YgdGhlIHByaW1hcnkuXG4gKiBAcmV0dXJuIHtbdHlwZV19IFtkZXNjcmlwdGlvbl1cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5fcmVzZXRfc2Vjb25kYXJ5ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zZWNvbmRhcnlfcm93ID0gdGhpcy5wcmltYXJ5X3JvdztcbiAgICB0aGlzLnNlY29uZGFyeV9jaGFyID0gdGhpcy5wcmltYXJ5X2NoYXI7XG5cbiAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZScpOyBcbn07XG5cbi8qKlxuICogQ3JlYXRlIHRoZSBwcm9wZXJ0aWVzIG9mIHRoZSBjdXJzb3IuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3IucHJvdG90eXBlLl9pbml0X3Byb3BlcnRpZXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhpcy5wcm9wZXJ0eSgnc3RhcnRfcm93JywgZnVuY3Rpb24oKSB7IHJldHVybiBNYXRoLm1pbih0aGF0LnByaW1hcnlfcm93LCB0aGF0LnNlY29uZGFyeV9yb3cpOyB9KTtcbiAgICB0aGlzLnByb3BlcnR5KCdlbmRfcm93JywgZnVuY3Rpb24oKSB7IHJldHVybiBNYXRoLm1heCh0aGF0LnByaW1hcnlfcm93LCB0aGF0LnNlY29uZGFyeV9yb3cpOyB9KTtcbiAgICB0aGlzLnByb3BlcnR5KCdzdGFydF9jaGFyJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aGF0LnByaW1hcnlfcm93IDwgdGhhdC5zZWNvbmRhcnlfcm93IHx8ICh0aGF0LnByaW1hcnlfcm93ID09IHRoYXQuc2Vjb25kYXJ5X3JvdyAmJiB0aGF0LnByaW1hcnlfY2hhciA8PSB0aGF0LnNlY29uZGFyeV9jaGFyKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoYXQucHJpbWFyeV9jaGFyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoYXQuc2Vjb25kYXJ5X2NoYXI7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICB0aGlzLnByb3BlcnR5KCdlbmRfY2hhcicsIGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodGhhdC5wcmltYXJ5X3JvdyA8IHRoYXQuc2Vjb25kYXJ5X3JvdyB8fCAodGhhdC5wcmltYXJ5X3JvdyA9PSB0aGF0LnNlY29uZGFyeV9yb3cgJiYgdGhhdC5wcmltYXJ5X2NoYXIgPD0gdGhhdC5zZWNvbmRhcnlfY2hhcikpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGF0LnNlY29uZGFyeV9jaGFyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoYXQucHJpbWFyeV9jaGFyO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIEFkZHMgdGV4dCB0byB0aGUgbW9kZWwgd2hpbGUga2VlcGluZyB0cmFjayBvZiB0aGUgaGlzdG9yeS5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IHJvd19pbmRleFxuICogQHBhcmFtICB7aW50ZWdlcn0gY2hhcl9pbmRleFxuICogQHBhcmFtICB7c3RyaW5nfSB0ZXh0XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuX21vZGVsX2FkZF90ZXh0ID0gZnVuY3Rpb24ocm93X2luZGV4LCBjaGFyX2luZGV4LCB0ZXh0KSB7XG4gICAgdmFyIGxpbmVzID0gdGV4dC5zcGxpdCgnXFxuJyk7XG4gICAgdGhpcy5fcHVzaF9oaXN0b3J5KFxuICAgICAgICAnX21vZGVsX2FkZF90ZXh0JywgXG4gICAgICAgIFtyb3dfaW5kZXgsIGNoYXJfaW5kZXgsIHRleHRdLCBcbiAgICAgICAgJ19tb2RlbF9yZW1vdmVfdGV4dCcsIFxuICAgICAgICBbcm93X2luZGV4LCBjaGFyX2luZGV4LCByb3dfaW5kZXggKyBsaW5lcy5sZW5ndGggLSAxLCBsaW5lcy5sZW5ndGggPiAxID8gbGluZXNbbGluZXMubGVuZ3RoLTFdLmxlbmd0aCA6IGNoYXJfaW5kZXggKyB0ZXh0Lmxlbmd0aF0sIFxuICAgICAgICBjb25maWcuaGlzdG9yeV9ncm91cF9kZWxheSB8fCAxMDApO1xuICAgIHRoaXMuX21vZGVsLmFkZF90ZXh0KHJvd19pbmRleCwgY2hhcl9pbmRleCwgdGV4dCk7XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgdGV4dCBmcm9tIHRoZSBtb2RlbCB3aGlsZSBrZWVwaW5nIHRyYWNrIG9mIHRoZSBoaXN0b3J5LlxuICogQHBhcmFtICB7aW50ZWdlcn0gc3RhcnRfcm93XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBzdGFydF9jaGFyXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBlbmRfcm93XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBlbmRfY2hhclxuICovXG5DdXJzb3IucHJvdG90eXBlLl9tb2RlbF9yZW1vdmVfdGV4dCA9IGZ1bmN0aW9uKHN0YXJ0X3Jvdywgc3RhcnRfY2hhciwgZW5kX3JvdywgZW5kX2NoYXIpIHtcbiAgICB2YXIgdGV4dCA9IHRoaXMuX21vZGVsLmdldF90ZXh0KHN0YXJ0X3Jvdywgc3RhcnRfY2hhciwgZW5kX3JvdywgZW5kX2NoYXIpO1xuICAgIHRoaXMuX3B1c2hfaGlzdG9yeShcbiAgICAgICAgJ19tb2RlbF9yZW1vdmVfdGV4dCcsIFxuICAgICAgICBbc3RhcnRfcm93LCBzdGFydF9jaGFyLCBlbmRfcm93LCBlbmRfY2hhcl0sIFxuICAgICAgICAnX21vZGVsX2FkZF90ZXh0JywgXG4gICAgICAgIFtzdGFydF9yb3csIHN0YXJ0X2NoYXIsIHRleHRdLCBcbiAgICAgICAgY29uZmlnLmhpc3RvcnlfZ3JvdXBfZGVsYXkgfHwgMTAwKTtcbiAgICB0aGlzLl9tb2RlbC5yZW1vdmVfdGV4dChzdGFydF9yb3csIHN0YXJ0X2NoYXIsIGVuZF9yb3csIGVuZF9jaGFyKTtcbn07XG5cbi8qKlxuICogQWRkcyBhIHJvdyBvZiB0ZXh0IHdoaWxlIGtlZXBpbmcgdHJhY2sgb2YgdGhlIGhpc3RvcnkuXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSByb3dfaW5kZXhcbiAqIEBwYXJhbSAge3N0cmluZ30gdGV4dFxuICovXG5DdXJzb3IucHJvdG90eXBlLl9tb2RlbF9hZGRfcm93ID0gZnVuY3Rpb24ocm93X2luZGV4LCB0ZXh0KSB7XG4gICAgdGhpcy5fcHVzaF9oaXN0b3J5KFxuICAgICAgICAnX21vZGVsX2FkZF9yb3cnLCBcbiAgICAgICAgW3Jvd19pbmRleCwgdGV4dF0sIFxuICAgICAgICAnX21vZGVsX3JlbW92ZV9yb3cnLCBcbiAgICAgICAgW3Jvd19pbmRleF0sIFxuICAgICAgICBjb25maWcuaGlzdG9yeV9ncm91cF9kZWxheSB8fCAxMDApO1xuICAgIHRoaXMuX21vZGVsLmFkZF9yb3cocm93X2luZGV4LCB0ZXh0KTtcblxufTtcblxuLyoqXG4gKiBSZW1vdmVzIGEgcm93IG9mIHRleHQgd2hpbGUga2VlcGluZyB0cmFjayBvZiB0aGUgaGlzdG9yeS5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IHJvd19pbmRleFxuICovXG5DdXJzb3IucHJvdG90eXBlLl9tb2RlbF9yZW1vdmVfcm93ID0gZnVuY3Rpb24ocm93X2luZGV4KSB7XG4gICAgdGhpcy5fcHVzaF9oaXN0b3J5KFxuICAgICAgICAnX21vZGVsX3JlbW92ZV9yb3cnLCBcbiAgICAgICAgW3Jvd19pbmRleF0sIFxuICAgICAgICAnX21vZGVsX2FkZF9yb3cnLCBcbiAgICAgICAgW3Jvd19pbmRleCwgdGhpcy5fbW9kZWwuX3Jvd3Nbcm93X2luZGV4XV0sIFxuICAgICAgICBjb25maWcuaGlzdG9yeV9ncm91cF9kZWxheSB8fCAxMDApO1xuICAgIHRoaXMuX21vZGVsLnJlbW92ZV9yb3cocm93X2luZGV4KTtcbn07XG5cbi8qKlxuICogUmVjb3JkIHRoZSBiZWZvcmUgYW5kIGFmdGVyIHBvc2l0aW9ucyBvZiB0aGUgY3Vyc29yIGZvciBoaXN0b3J5LlxuICogQHBhcmFtICB7ZnVuY3Rpb259IGYgLSBleGVjdXRlcyB3aXRoIGB0aGlzYCBjb250ZXh0XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuX2hpc3RvcmljYWwgPSBmdW5jdGlvbihmKSB7XG4gICAgdGhpcy5fc3RhcnRfaGlzdG9yaWNhbF9tb3ZlKCk7XG4gICAgdmFyIHJldCA9IGYuYXBwbHkodGhpcyk7XG4gICAgdGhpcy5fZW5kX2hpc3RvcmljYWxfbW92ZSgpO1xuICAgIHJldHVybiByZXQ7XG59O1xuXG4vKipcbiAqIFJlY29yZCB0aGUgc3RhcnRpbmcgc3RhdGUgb2YgdGhlIGN1cnNvciBmb3IgdGhlIGhpc3RvcnkgYnVmZmVyLlxuICovXG5DdXJzb3IucHJvdG90eXBlLl9zdGFydF9oaXN0b3JpY2FsX21vdmUgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoIXRoaXMuX2hpc3RvcmljYWxfc3RhcnQpIHtcbiAgICAgICAgdGhpcy5faGlzdG9yaWNhbF9zdGFydCA9IHRoaXMuZ2V0X3N0YXRlKCk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBSZWNvcmQgdGhlIGVuZGluZyBzdGF0ZSBvZiB0aGUgY3Vyc29yIGZvciB0aGUgaGlzdG9yeSBidWZmZXIsIHRoZW5cbiAqIHB1c2ggYSByZXZlcnNhYmxlIGFjdGlvbiBkZXNjcmliaW5nIHRoZSBjaGFuZ2Ugb2YgdGhlIGN1cnNvci5cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5fZW5kX2hpc3RvcmljYWxfbW92ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3B1c2hfaGlzdG9yeShcbiAgICAgICAgJ3NldF9zdGF0ZScsIFxuICAgICAgICBbdGhpcy5nZXRfc3RhdGUoKV0sIFxuICAgICAgICAnc2V0X3N0YXRlJywgXG4gICAgICAgIFt0aGlzLl9oaXN0b3JpY2FsX3N0YXJ0XSwgXG4gICAgICAgIGNvbmZpZy5oaXN0b3J5X2dyb3VwX2RlbGF5IHx8IDEwMCk7XG4gICAgdGhpcy5faGlzdG9yaWNhbF9zdGFydCA9IG51bGw7XG59O1xuXG4vKipcbiAqIE1ha2VzIGEgbGlzdCBvZiBpbmRlbnRhdGlvbiBzdHJpbmdzIHVzZWQgdG8gaW5kZW50IG9uZSBsZXZlbCxcbiAqIG9yZGVyZWQgYnkgdXNhZ2UgcHJlZmVyZW5jZS5cbiAqIEByZXR1cm4ge3N0cmluZ31cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5fbWFrZV9pbmRlbnRzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGluZGVudHMgPSBbXTtcbiAgICBpZiAoY29uZmlnLnVzZV9zcGFjZXMpIHtcbiAgICAgICAgdmFyIGluZGVudCA9ICcnO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvbmZpZy50YWJfd2lkdGg7IGkrKykge1xuICAgICAgICAgICAgaW5kZW50ICs9ICcgJztcbiAgICAgICAgICAgIGluZGVudHMucHVzaChpbmRlbnQpO1xuICAgICAgICB9XG4gICAgICAgIGluZGVudHMucmV2ZXJzZSgpO1xuICAgIH1cbiAgICBpbmRlbnRzLnB1c2goJ1xcdCcpO1xuICAgIHJldHVybiBpbmRlbnRzO1xufTtcblxuLyoqXG4gKiBSZWdpc3RlcnMgYW4gYWN0aW9uIEFQSSB3aXRoIHRoZSBtYXBcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuX3JlZ2lzdGVyX2FwaSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICByZWdpc3RlcignY3Vyc29yLnNldF9zdGF0ZScsIHV0aWxzLnByb3h5KHRoaXMuc2V0X3N0YXRlLCB0aGlzKSwgdGhpcyk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5yZW1vdmVfc2VsZWN0ZWQnLCB1dGlscy5wcm94eSh0aGlzLnJlbW92ZV9zZWxlY3RlZCwgdGhpcyksIHRoaXMpO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3Iua2V5cHJlc3MnLCB1dGlscy5wcm94eSh0aGlzLmtleXByZXNzLCB0aGlzKSwgdGhpcyk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5pbmRlbnQnLCB1dGlscy5wcm94eSh0aGlzLmluZGVudCwgdGhpcyksIHRoaXMpO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3IudW5pbmRlbnQnLCB1dGlscy5wcm94eSh0aGlzLnVuaW5kZW50LCB0aGlzKSwgdGhpcyk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5uZXdsaW5lJywgdXRpbHMucHJveHkodGhpcy5uZXdsaW5lLCB0aGlzKSwgdGhpcyk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5pbnNlcnRfdGV4dCcsIHV0aWxzLnByb3h5KHRoaXMuaW5zZXJ0X3RleHQsIHRoaXMpLCB0aGlzKTtcbiAgICByZWdpc3RlcignY3Vyc29yLmRlbGV0ZV9iYWNrd2FyZCcsIHV0aWxzLnByb3h5KHRoaXMuZGVsZXRlX2JhY2t3YXJkLCB0aGlzKSwgdGhpcyk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5kZWxldGVfZm9yd2FyZCcsIHV0aWxzLnByb3h5KHRoaXMuZGVsZXRlX2ZvcndhcmQsIHRoaXMpLCB0aGlzKTtcbiAgICByZWdpc3RlcignY3Vyc29yLmRlbGV0ZV93b3JkX2xlZnQnLCB1dGlscy5wcm94eSh0aGlzLmRlbGV0ZV93b3JkX2xlZnQsIHRoaXMpLCB0aGlzKTtcbiAgICByZWdpc3RlcignY3Vyc29yLmRlbGV0ZV93b3JkX3JpZ2h0JywgdXRpbHMucHJveHkodGhpcy5kZWxldGVfd29yZF9yaWdodCwgdGhpcyksIHRoaXMpO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3Iuc2VsZWN0X2FsbCcsIHV0aWxzLnByb3h5KHRoaXMuc2VsZWN0X2FsbCwgdGhpcyksIHRoaXMpO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3IubGVmdCcsIGZ1bmN0aW9uKCkgeyB0aGF0Lm1vdmVfcHJpbWFyeSgtMSwgMCwgdHJ1ZSk7IHRoYXQuX3Jlc2V0X3NlY29uZGFyeSgpOyByZXR1cm4gdHJ1ZTsgfSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5yaWdodCcsIGZ1bmN0aW9uKCkgeyB0aGF0Lm1vdmVfcHJpbWFyeSgxLCAwLCB0cnVlKTsgdGhhdC5fcmVzZXRfc2Vjb25kYXJ5KCk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLnVwJywgZnVuY3Rpb24oKSB7IHRoYXQubW92ZV9wcmltYXJ5KDAsIC0xLCB0cnVlKTsgdGhhdC5fcmVzZXRfc2Vjb25kYXJ5KCk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLmRvd24nLCBmdW5jdGlvbigpIHsgdGhhdC5tb3ZlX3ByaW1hcnkoMCwgMSwgdHJ1ZSk7IHRoYXQuX3Jlc2V0X3NlY29uZGFyeSgpOyByZXR1cm4gdHJ1ZTsgfSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5zZWxlY3RfbGVmdCcsIGZ1bmN0aW9uKCkgeyB0aGF0Lm1vdmVfcHJpbWFyeSgtMSwgMCk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLnNlbGVjdF9yaWdodCcsIGZ1bmN0aW9uKCkgeyB0aGF0Lm1vdmVfcHJpbWFyeSgxLCAwKTsgcmV0dXJuIHRydWU7IH0pO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3Iuc2VsZWN0X3VwJywgZnVuY3Rpb24oKSB7IHRoYXQubW92ZV9wcmltYXJ5KDAsIC0xKTsgcmV0dXJuIHRydWU7IH0pO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3Iuc2VsZWN0X2Rvd24nLCBmdW5jdGlvbigpIHsgdGhhdC5tb3ZlX3ByaW1hcnkoMCwgMSk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLndvcmRfbGVmdCcsIGZ1bmN0aW9uKCkgeyB0aGF0LndvcmRfcHJpbWFyeSgtMSk7IHRoYXQuX3Jlc2V0X3NlY29uZGFyeSgpOyByZXR1cm4gdHJ1ZTsgfSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci53b3JkX3JpZ2h0JywgZnVuY3Rpb24oKSB7IHRoYXQud29yZF9wcmltYXJ5KDEpOyB0aGF0Ll9yZXNldF9zZWNvbmRhcnkoKTsgcmV0dXJuIHRydWU7IH0pO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3Iuc2VsZWN0X3dvcmRfbGVmdCcsIGZ1bmN0aW9uKCkgeyB0aGF0LndvcmRfcHJpbWFyeSgtMSk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLnNlbGVjdF93b3JkX3JpZ2h0JywgZnVuY3Rpb24oKSB7IHRoYXQud29yZF9wcmltYXJ5KDEpOyByZXR1cm4gdHJ1ZTsgfSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5saW5lX3N0YXJ0JywgZnVuY3Rpb24oKSB7IHRoYXQucHJpbWFyeV9nb3RvX3N0YXJ0KCk7IHRoYXQuX3Jlc2V0X3NlY29uZGFyeSgpOyByZXR1cm4gdHJ1ZTsgfSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5saW5lX2VuZCcsIGZ1bmN0aW9uKCkgeyB0aGF0LnByaW1hcnlfZ290b19lbmQoKTsgdGhhdC5fcmVzZXRfc2Vjb25kYXJ5KCk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLnNlbGVjdF9saW5lX3N0YXJ0JywgZnVuY3Rpb24oKSB7IHRoYXQucHJpbWFyeV9nb3RvX3N0YXJ0KCk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLnNlbGVjdF9saW5lX2VuZCcsIGZ1bmN0aW9uKCkgeyB0aGF0LnByaW1hcnlfZ290b19lbmQoKTsgcmV0dXJuIHRydWU7IH0pO1xufTtcblxuZXhwb3J0cy5DdXJzb3IgPSBDdXJzb3I7IiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cbnZhciBrZXltYXAgPSByZXF1aXJlKCcuL2V2ZW50cy9tYXAuanMnKTtcbnZhciByZWdpc3RlciA9IGtleW1hcC5NYXAucmVnaXN0ZXI7XG5cbnZhciBjdXJzb3IgPSByZXF1aXJlKCcuL2N1cnNvci5qcycpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xuLyoqXG4gKiBNYW5hZ2VzIG9uZSBvciBtb3JlIGN1cnNvcnNcbiAqL1xudmFyIEN1cnNvcnMgPSBmdW5jdGlvbihtb2RlbCwgY2xpcGJvYXJkLCBoaXN0b3J5KSB7XG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzKTtcbiAgICB0aGlzLl9tb2RlbCA9IG1vZGVsO1xuICAgIHRoaXMuZ2V0X3Jvd19jaGFyID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuY3Vyc29ycyA9IFtdO1xuICAgIHRoaXMuX3NlbGVjdGluZ190ZXh0ID0gZmFsc2U7XG4gICAgdGhpcy5fY2xpcGJvYXJkID0gY2xpcGJvYXJkO1xuICAgIHRoaXMuX2FjdGl2ZV9jdXJzb3IgPSBudWxsO1xuICAgIHRoaXMuX2hpc3RvcnkgPSBoaXN0b3J5O1xuXG4gICAgLy8gQ3JlYXRlIGluaXRpYWwgY3Vyc29yLlxuICAgIHRoaXMuY3JlYXRlKHVuZGVmaW5lZCwgZmFsc2UpO1xuXG4gICAgLy8gUmVnaXN0ZXIgYWN0aW9ucy5cbiAgICByZWdpc3RlcignY3Vyc29ycy5fY3Vyc29yX3Byb3h5JywgdXRpbHMucHJveHkodGhpcy5fY3Vyc29yX3Byb3h5LCB0aGlzKSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvcnMuY3JlYXRlJywgdXRpbHMucHJveHkodGhpcy5jcmVhdGUsIHRoaXMpKTtcbiAgICByZWdpc3RlcignY3Vyc29ycy5zaW5nbGUnLCB1dGlscy5wcm94eSh0aGlzLnNpbmdsZSwgdGhpcykpO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3JzLnBvcCcsIHV0aWxzLnByb3h5KHRoaXMucG9wLCB0aGlzKSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvcnMuc3RhcnRfc2VsZWN0aW9uJywgdXRpbHMucHJveHkodGhpcy5zdGFydF9zZWxlY3Rpb24sIHRoaXMpKTtcbiAgICByZWdpc3RlcignY3Vyc29ycy5zZXRfc2VsZWN0aW9uJywgdXRpbHMucHJveHkodGhpcy5zZXRfc2VsZWN0aW9uLCB0aGlzKSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvcnMuc3RhcnRfc2V0X3NlbGVjdGlvbicsIHV0aWxzLnByb3h5KHRoaXMuc3RhcnRfc2V0X3NlbGVjdGlvbiwgdGhpcykpO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3JzLmVuZF9zZWxlY3Rpb24nLCB1dGlscy5wcm94eSh0aGlzLmVuZF9zZWxlY3Rpb24sIHRoaXMpKTtcbiAgICByZWdpc3RlcignY3Vyc29ycy5zZWxlY3Rfd29yZCcsIHV0aWxzLnByb3h5KHRoaXMuc2VsZWN0X3dvcmQsIHRoaXMpKTtcblxuICAgIC8vIEJpbmQgY2xpcGJvYXJkIGV2ZW50cy5cbiAgICB0aGlzLl9jbGlwYm9hcmQub24oJ2N1dCcsIHV0aWxzLnByb3h5KHRoaXMuX2hhbmRsZV9jdXQsIHRoaXMpKTtcbiAgICB0aGlzLl9jbGlwYm9hcmQub24oJ2NvcHknLCB1dGlscy5wcm94eSh0aGlzLl9oYW5kbGVfY29weSwgdGhpcykpO1xuICAgIHRoaXMuX2NsaXBib2FyZC5vbigncGFzdGUnLCB1dGlscy5wcm94eSh0aGlzLl9oYW5kbGVfcGFzdGUsIHRoaXMpKTtcbn07XG51dGlscy5pbmhlcml0KEN1cnNvcnMsIHV0aWxzLlBvc3RlckNsYXNzKTtcblxuLyoqXG4gKiBIYW5kbGVzIGhpc3RvcnkgcHJveHkgZXZlbnRzIGZvciBpbmRpdmlkdWFsIGN1cnNvcnMuXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBjdXJzb3JfaW5kZXhcbiAqIEBwYXJhbSAge3N0cmluZ30gZnVuY3Rpb25fbmFtZVxuICogQHBhcmFtICB7YXJyYXl9IGZ1bmN0aW9uX3BhcmFtc1xuICovXG5DdXJzb3JzLnByb3RvdHlwZS5fY3Vyc29yX3Byb3h5ID0gZnVuY3Rpb24oY3Vyc29yX2luZGV4LCBmdW5jdGlvbl9uYW1lLCBmdW5jdGlvbl9wYXJhbXMpIHtcbiAgICBpZiAoY3Vyc29yX2luZGV4IDwgdGhpcy5jdXJzb3JzLmxlbmd0aCkge1xuICAgICAgICB2YXIgY3Vyc29yID0gdGhpcy5jdXJzb3JzW2N1cnNvcl9pbmRleF07XG4gICAgICAgIGN1cnNvcltmdW5jdGlvbl9uYW1lXS5hcHBseShjdXJzb3IsIGZ1bmN0aW9uX3BhcmFtcyk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgY3Vyc29yIGFuZCBtYW5hZ2VzIGl0LlxuICogQHBhcmFtIHtvYmplY3R9IFtzdGF0ZV0gc3RhdGUgdG8gYXBwbHkgdG8gdGhlIG5ldyBjdXJzb3IuXG4gKiBAcGFyYW0ge2Jvb2xlYW59IFtyZXZlcnNhYmxlXSAtIGRlZmF1bHRzIHRvIHRydWUsIGlzIGFjdGlvbiByZXZlcnNhYmxlLlxuICogQHJldHVybiB7Q3Vyc29yfSBjdXJzb3JcbiAqL1xuQ3Vyc29ycy5wcm90b3R5cGUuY3JlYXRlID0gZnVuY3Rpb24oc3RhdGUsIHJldmVyc2FibGUpIHtcbiAgICAvLyBSZWNvcmQgdGhpcyBhY3Rpb24gaW4gaGlzdG9yeS5cbiAgICBpZiAocmV2ZXJzYWJsZSA9PT0gdW5kZWZpbmVkIHx8IHJldmVyc2FibGUgPT09IHRydWUpIHtcbiAgICAgICAgdGhpcy5faGlzdG9yeS5wdXNoX2FjdGlvbignY3Vyc29ycy5jcmVhdGUnLCBhcmd1bWVudHMsICdjdXJzb3JzLnBvcCcsIFtdKTtcbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgYSBwcm94eWluZyBoaXN0b3J5IG1ldGhvZCBmb3IgdGhlIGN1cnNvciBpdHNlbGYuXG4gICAgdmFyIGluZGV4ID0gdGhpcy5jdXJzb3JzLmxlbmd0aDtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdmFyIGhpc3RvcnlfcHJveHkgPSBmdW5jdGlvbihmb3J3YXJkX25hbWUsIGZvcndhcmRfcGFyYW1zLCBiYWNrd2FyZF9uYW1lLCBiYWNrd2FyZF9wYXJhbXMsIGF1dG9ncm91cF9kZWxheSkge1xuICAgICAgICB0aGF0Ll9oaXN0b3J5LnB1c2hfYWN0aW9uKFxuICAgICAgICAgICAgJ2N1cnNvcnMuX2N1cnNvcl9wcm94eScsIFtpbmRleCwgZm9yd2FyZF9uYW1lLCBmb3J3YXJkX3BhcmFtc10sXG4gICAgICAgICAgICAnY3Vyc29ycy5fY3Vyc29yX3Byb3h5JywgW2luZGV4LCBiYWNrd2FyZF9uYW1lLCBiYWNrd2FyZF9wYXJhbXNdLFxuICAgICAgICAgICAgYXV0b2dyb3VwX2RlbGF5KTtcbiAgICB9O1xuXG4gICAgLy8gQ3JlYXRlIHRoZSBjdXJzb3IuXG4gICAgdmFyIG5ld19jdXJzb3IgPSBuZXcgY3Vyc29yLkN1cnNvcih0aGlzLl9tb2RlbCwgaGlzdG9yeV9wcm94eSk7XG4gICAgdGhpcy5jdXJzb3JzLnB1c2gobmV3X2N1cnNvcik7XG5cbiAgICAvLyBTZXQgdGhlIGluaXRpYWwgcHJvcGVydGllcyBvZiB0aGUgY3Vyc29yLlxuICAgIG5ld19jdXJzb3Iuc2V0X3N0YXRlKHN0YXRlLCBmYWxzZSk7XG5cbiAgICAvLyBMaXN0ZW4gZm9yIGN1cnNvciBjaGFuZ2UgZXZlbnRzLlxuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICBuZXdfY3Vyc29yLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhhdC50cmlnZ2VyKCdjaGFuZ2UnLCBuZXdfY3Vyc29yKTtcbiAgICAgICAgdGhhdC5fdXBkYXRlX3NlbGVjdGlvbigpO1xuICAgIH0pO1xuICAgIHRoYXQudHJpZ2dlcignY2hhbmdlJywgbmV3X2N1cnNvcik7XG5cbiAgICByZXR1cm4gbmV3X2N1cnNvcjtcbn07XG5cbi8qKlxuICogUmVtb3ZlIGV2ZXJ5IGN1cnNvciBleGNlcHQgZm9yIHRoZSBmaXJzdCBvbmUuXG4gKi9cbkN1cnNvcnMucHJvdG90eXBlLnNpbmdsZSA9IGZ1bmN0aW9uKCkge1xuICAgIHdoaWxlICh0aGlzLmN1cnNvcnMubGVuZ3RoID4gMSkge1xuICAgICAgICB0aGlzLnBvcCgpO1xuICAgIH1cbn07XG5cbi8qKlxuICogUmVtb3ZlIHRoZSBsYXN0IGN1cnNvci5cbiAqIEByZXR1cm5zIHtDdXJzb3J9IGxhc3QgY3Vyc29yIG9yIG51bGxcbiAqL1xuQ3Vyc29ycy5wcm90b3R5cGUucG9wID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuY3Vyc29ycy5sZW5ndGggPiAxKSB7XG5cbiAgICAgICAgLy8gUmVtb3ZlIHRoZSBsYXN0IGN1cnNvciBhbmQgdW5yZWdpc3RlciBpdC5cbiAgICAgICAgdmFyIGN1cnNvciA9IHRoaXMuY3Vyc29ycy5wb3AoKTtcbiAgICAgICAgY3Vyc29yLnVucmVnaXN0ZXIoKTtcbiAgICAgICAgY3Vyc29yLm9mZignY2hhbmdlJyk7XG5cbiAgICAgICAgLy8gUmVjb3JkIHRoaXMgYWN0aW9uIGluIGhpc3RvcnkuXG4gICAgICAgIHRoaXMuX2hpc3RvcnkucHVzaF9hY3Rpb24oJ2N1cnNvcnMucG9wJywgW10sICdjdXJzb3JzLmNyZWF0ZScsIFtjdXJzb3IuZ2V0X3N0YXRlKCldKTtcblxuICAgICAgICAvLyBBbGVydCBsaXN0ZW5lcnMgb2YgY2hhbmdlcy5cbiAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgcmV0dXJuIGN1cnNvcjtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgd2hlbiB0aGUgc2VsZWN0ZWQgdGV4dCBpcyBjb3BpZWQgdG8gdGhlIGNsaXBib2FyZC5cbiAqIEBwYXJhbSAge3N0cmluZ30gdGV4dCAtIGJ5IHZhbCB0ZXh0IHRoYXQgd2FzIGN1dFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29ycy5wcm90b3R5cGUuX2hhbmRsZV9jb3B5ID0gZnVuY3Rpb24odGV4dCkge1xuICAgIHRoaXMuY3Vyc29ycy5mb3JFYWNoKGZ1bmN0aW9uKGN1cnNvcikge1xuICAgICAgICBjdXJzb3IuY29weSgpO1xuICAgIH0pO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gdGhlIHNlbGVjdGVkIHRleHQgaXMgY3V0IHRvIHRoZSBjbGlwYm9hcmQuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IHRleHQgLSBieSB2YWwgdGV4dCB0aGF0IHdhcyBjdXRcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvcnMucHJvdG90eXBlLl9oYW5kbGVfY3V0ID0gZnVuY3Rpb24odGV4dCkge1xuICAgIHRoaXMuY3Vyc29ycy5mb3JFYWNoKGZ1bmN0aW9uKGN1cnNvcikge1xuICAgICAgICBjdXJzb3IuY3V0KCk7XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgd2hlbiB0ZXh0IGlzIHBhc3RlZCBpbnRvIHRoZSBkb2N1bWVudC5cbiAqIEBwYXJhbSAge3N0cmluZ30gdGV4dFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29ycy5wcm90b3R5cGUuX2hhbmRsZV9wYXN0ZSA9IGZ1bmN0aW9uKHRleHQpIHtcblxuICAgIC8vIElmIHRoZSBtb2R1bHVzIG9mIHRoZSBudW1iZXIgb2YgY3Vyc29ycyBhbmQgdGhlIG51bWJlciBvZiBwYXN0ZWQgbGluZXNcbiAgICAvLyBvZiB0ZXh0IGlzIHplcm8sIHNwbGl0IHRoZSBjdXQgbGluZXMgYW1vbmcgdGhlIGN1cnNvcnMuXG4gICAgdmFyIGxpbmVzID0gdGV4dC5zcGxpdCgnXFxuJyk7XG4gICAgaWYgKHRoaXMuY3Vyc29ycy5sZW5ndGggPiAxICYmIGxpbmVzLmxlbmd0aCA+IDEgJiYgbGluZXMubGVuZ3RoICUgdGhpcy5jdXJzb3JzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB2YXIgbGluZXNfcGVyX2N1cnNvciA9IGxpbmVzLmxlbmd0aCAvIHRoaXMuY3Vyc29ycy5sZW5ndGg7XG4gICAgICAgIHRoaXMuY3Vyc29ycy5mb3JFYWNoKGZ1bmN0aW9uKGN1cnNvciwgaW5kZXgpIHtcbiAgICAgICAgICAgIGN1cnNvci5pbnNlcnRfdGV4dChsaW5lcy5zbGljZShcbiAgICAgICAgICAgICAgICBpbmRleCAqIGxpbmVzX3Blcl9jdXJzb3IsIFxuICAgICAgICAgICAgICAgIGluZGV4ICogbGluZXNfcGVyX2N1cnNvciArIGxpbmVzX3Blcl9jdXJzb3IpLmpvaW4oJ1xcbicpKTtcbiAgICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5jdXJzb3JzLmZvckVhY2goZnVuY3Rpb24oY3Vyc29yKSB7XG4gICAgICAgICAgICBjdXJzb3IucGFzdGUodGV4dCk7XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG5cbi8qKlxuICogVXBkYXRlIHRoZSBjbGlwcGFibGUgdGV4dCBiYXNlZCBvbiBuZXcgc2VsZWN0aW9uLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29ycy5wcm90b3R5cGUuX3VwZGF0ZV9zZWxlY3Rpb24gPSBmdW5jdGlvbigpIHtcbiAgICBcbiAgICAvLyBDb3B5IGFsbCBvZiB0aGUgc2VsZWN0ZWQgdGV4dC5cbiAgICB2YXIgc2VsZWN0aW9ucyA9IFtdO1xuICAgIHRoaXMuY3Vyc29ycy5mb3JFYWNoKGZ1bmN0aW9uKGN1cnNvcikge1xuICAgICAgICBzZWxlY3Rpb25zLnB1c2goY3Vyc29yLmdldCgpKTtcbiAgICB9KTtcblxuICAgIC8vIE1ha2UgdGhlIGNvcGllZCB0ZXh0IGNsaXBwYWJsZS5cbiAgICB0aGlzLl9jbGlwYm9hcmQuc2V0X2NsaXBwYWJsZShzZWxlY3Rpb25zLmpvaW4oJ1xcbicpKTtcbn07XG5cbi8qKlxuICogU3RhcnRzIHNlbGVjdGluZyB0ZXh0IGZyb20gbW91c2UgY29vcmRpbmF0ZXMuXG4gKiBAcGFyYW0gIHtNb3VzZUV2ZW50fSBlIC0gbW91c2UgZXZlbnQgY29udGFpbmluZyB0aGUgY29vcmRpbmF0ZXMuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3JzLnByb3RvdHlwZS5zdGFydF9zZWxlY3Rpb24gPSBmdW5jdGlvbihlKSB7XG4gICAgdmFyIHggPSBlLm9mZnNldFg7XG4gICAgdmFyIHkgPSBlLm9mZnNldFk7XG5cbiAgICB0aGlzLl9zZWxlY3RpbmdfdGV4dCA9IHRydWU7XG4gICAgaWYgKHRoaXMuZ2V0X3Jvd19jaGFyKSB7XG4gICAgICAgIHZhciBsb2NhdGlvbiA9IHRoaXMuZ2V0X3Jvd19jaGFyKHgsIHkpO1xuICAgICAgICB0aGlzLmN1cnNvcnNbMF0uc2V0X2JvdGgobG9jYXRpb24ucm93X2luZGV4LCBsb2NhdGlvbi5jaGFyX2luZGV4KTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEZpbmFsaXplcyB0aGUgc2VsZWN0aW9uIG9mIHRleHQuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3JzLnByb3RvdHlwZS5lbmRfc2VsZWN0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fc2VsZWN0aW5nX3RleHQgPSBmYWxzZTtcbn07XG5cbi8qKlxuICogU2V0cyB0aGUgZW5kcG9pbnQgb2YgdGV4dCBzZWxlY3Rpb24gZnJvbSBtb3VzZSBjb29yZGluYXRlcy5cbiAqIEBwYXJhbSAge01vdXNlRXZlbnR9IGUgLSBtb3VzZSBldmVudCBjb250YWluaW5nIHRoZSBjb29yZGluYXRlcy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvcnMucHJvdG90eXBlLnNldF9zZWxlY3Rpb24gPSBmdW5jdGlvbihlKSB7XG4gICAgdmFyIHggPSBlLm9mZnNldFg7XG4gICAgdmFyIHkgPSBlLm9mZnNldFk7XG4gICAgaWYgKHRoaXMuX3NlbGVjdGluZ190ZXh0ICYmIHRoaXMuZ2V0X3Jvd19jaGFyKSB7XG4gICAgICAgIHZhciBsb2NhdGlvbiA9IHRoaXMuZ2V0X3Jvd19jaGFyKHgsIHkpO1xuICAgICAgICB0aGlzLmN1cnNvcnNbdGhpcy5jdXJzb3JzLmxlbmd0aC0xXS5zZXRfcHJpbWFyeShsb2NhdGlvbi5yb3dfaW5kZXgsIGxvY2F0aW9uLmNoYXJfaW5kZXgpO1xuICAgIH1cbn07XG5cbi8qKlxuICogU2V0cyB0aGUgZW5kcG9pbnQgb2YgdGV4dCBzZWxlY3Rpb24gZnJvbSBtb3VzZSBjb29yZGluYXRlcy5cbiAqIERpZmZlcmVudCB0aGFuIHNldF9zZWxlY3Rpb24gYmVjYXVzZSBpdCBkb2Vzbid0IG5lZWQgYSBjYWxsXG4gKiB0byBzdGFydF9zZWxlY3Rpb24gdG8gd29yay5cbiAqIEBwYXJhbSAge01vdXNlRXZlbnR9IGUgLSBtb3VzZSBldmVudCBjb250YWluaW5nIHRoZSBjb29yZGluYXRlcy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvcnMucHJvdG90eXBlLnN0YXJ0X3NldF9zZWxlY3Rpb24gPSBmdW5jdGlvbihlKSB7XG4gICAgdGhpcy5fc2VsZWN0aW5nX3RleHQgPSB0cnVlO1xuICAgIHRoaXMuc2V0X3NlbGVjdGlvbihlKTtcbn07XG5cbi8qKlxuICogU2VsZWN0cyBhIHdvcmQgYXQgdGhlIGdpdmVuIG1vdXNlIGNvb3JkaW5hdGVzLlxuICogQHBhcmFtICB7TW91c2VFdmVudH0gZSAtIG1vdXNlIGV2ZW50IGNvbnRhaW5pbmcgdGhlIGNvb3JkaW5hdGVzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29ycy5wcm90b3R5cGUuc2VsZWN0X3dvcmQgPSBmdW5jdGlvbihlKSB7XG4gICAgdmFyIHggPSBlLm9mZnNldFg7XG4gICAgdmFyIHkgPSBlLm9mZnNldFk7XG4gICAgaWYgKHRoaXMuZ2V0X3Jvd19jaGFyKSB7XG4gICAgICAgIHZhciBsb2NhdGlvbiA9IHRoaXMuZ2V0X3Jvd19jaGFyKHgsIHkpO1xuICAgICAgICB0aGlzLmN1cnNvcnNbdGhpcy5jdXJzb3JzLmxlbmd0aC0xXS5zZWxlY3Rfd29yZChsb2NhdGlvbi5yb3dfaW5kZXgsIGxvY2F0aW9uLmNoYXJfaW5kZXgpO1xuICAgIH1cbn07XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuQ3Vyc29ycyA9IEN1cnNvcnM7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG52YXIgbm9ybWFsaXplciA9IHJlcXVpcmUoJy4vZXZlbnRzL25vcm1hbGl6ZXIuanMnKTtcbnZhciBrZXltYXAgPSByZXF1aXJlKCcuL2V2ZW50cy9tYXAuanMnKTtcbnZhciBkZWZhdWx0X2tleW1hcCA9IHJlcXVpcmUoJy4vZXZlbnRzL2RlZmF1bHQuanMnKTtcbnZhciBjdXJzb3JzID0gcmVxdWlyZSgnLi9jdXJzb3JzLmpzJyk7XG52YXIgY2xpcGJvYXJkID0gcmVxdWlyZSgnLi9jbGlwYm9hcmQuanMnKTtcbnZhciBoaXN0b3J5ID0gcmVxdWlyZSgnLi9oaXN0b3J5LmpzJyk7XG5cbi8qKlxuICogQ29udHJvbGxlciBmb3IgYSBEb2N1bWVudE1vZGVsLlxuICovXG52YXIgRG9jdW1lbnRDb250cm9sbGVyID0gZnVuY3Rpb24oZWwsIG1vZGVsKSB7XG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzKTtcbiAgICB0aGlzLmNsaXBib2FyZCA9IG5ldyBjbGlwYm9hcmQuQ2xpcGJvYXJkKGVsKTtcbiAgICB0aGlzLm5vcm1hbGl6ZXIgPSBuZXcgbm9ybWFsaXplci5Ob3JtYWxpemVyKCk7XG4gICAgdGhpcy5ub3JtYWxpemVyLmxpc3Rlbl90byhlbCk7XG4gICAgdGhpcy5ub3JtYWxpemVyLmxpc3Rlbl90byh0aGlzLmNsaXBib2FyZC5oaWRkZW5faW5wdXQpO1xuICAgIHRoaXMubWFwID0gbmV3IGtleW1hcC5NYXAodGhpcy5ub3JtYWxpemVyKTtcbiAgICB0aGlzLm1hcC5tYXAoZGVmYXVsdF9rZXltYXAubWFwKTtcbiAgICB0aGlzLmhpc3RvcnkgPSBuZXcgaGlzdG9yeS5IaXN0b3J5KHRoaXMubWFwKVxuICAgIHRoaXMuY3Vyc29ycyA9IG5ldyBjdXJzb3JzLkN1cnNvcnMobW9kZWwsIHRoaXMuY2xpcGJvYXJkLCB0aGlzLmhpc3RvcnkpO1xufTtcbnV0aWxzLmluaGVyaXQoRG9jdW1lbnRDb250cm9sbGVyLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuRG9jdW1lbnRDb250cm9sbGVyID0gRG9jdW1lbnRDb250cm9sbGVyO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xudmFyIHN1cGVyc2V0ID0gcmVxdWlyZSgnLi9zdXBlcnNldC5qcycpO1xuXG4vKipcbiAqIE1vZGVsIGNvbnRhaW5pbmcgYWxsIG9mIHRoZSBkb2N1bWVudCdzIGRhdGEgKHRleHQpLlxuICovXG52YXIgRG9jdW1lbnRNb2RlbCA9IGZ1bmN0aW9uKCkge1xuICAgIHV0aWxzLlBvc3RlckNsYXNzLmNhbGwodGhpcyk7XG4gICAgdGhpcy5fcm93cyA9IFtdO1xuICAgIHRoaXMuX3Jvd190YWdzID0gW107XG4gICAgdGhpcy5fdGFnX2xvY2sgPSAwO1xuICAgIHRoaXMuX3BlbmRpbmdfdGFnX2V2ZW50cyA9IGZhbHNlO1xuICAgIHRoaXMuX2luaXRfcHJvcGVydGllcygpO1xufTtcbnV0aWxzLmluaGVyaXQoRG9jdW1lbnRNb2RlbCwgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vKipcbiAqIEFjcXVpcmUgYSBsb2NrIG9uIHRhZyBldmVudHNcbiAqXG4gKiBQcmV2ZW50cyB0YWcgZXZlbnRzIGZyb20gZmlyaW5nLlxuICogQHJldHVybiB7aW50ZWdlcn0gbG9jayBjb3VudFxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5hY3F1aXJlX3RhZ19ldmVudF9sb2NrID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3RhZ19sb2NrKys7XG59O1xuXG4vKipcbiAqIFJlbGVhc2UgYSBsb2NrIG9uIHRhZyBldmVudHNcbiAqIEByZXR1cm4ge2ludGVnZXJ9IGxvY2sgY291bnRcbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUucmVsZWFzZV90YWdfZXZlbnRfbG9jayA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3RhZ19sb2NrLS07XG4gICAgaWYgKHRoaXMuX3RhZ19sb2NrIDwgMCkge1xuICAgICAgICB0aGlzLl90YWdfbG9jayA9IDA7XG4gICAgfVxuICAgIGlmICh0aGlzLl90YWdfbG9jayA9PT0gMCAmJiB0aGlzLl9wZW5kaW5nX3RhZ19ldmVudHMpIHtcbiAgICAgICAgdGhpcy5fcGVuZGluZ190YWdfZXZlbnRzID0gZmFsc2U7XG4gICAgICAgIHRoaXMudHJpZ2dlcl90YWdfZXZlbnRzKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl90YWdfbG9jaztcbn07XG5cbi8qKlxuICogVHJpZ2dlcnMgdGhlIHRhZyBjaGFuZ2UgZXZlbnRzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUudHJpZ2dlcl90YWdfZXZlbnRzID0gZnVuY3Rpb24ocm93cykge1xuICAgIGlmICh0aGlzLl90YWdfbG9jayA9PT0gMCkge1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ3RhZ3NfY2hhbmdlZCcsIHRoaXMuX3BlbmRpbmdfdGFnX2V2ZW50c19yb3dzKTtcbiAgICAgICAgdGhpcy5fcGVuZGluZ190YWdfZXZlbnRzX3Jvd3MgPSB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fcGVuZGluZ190YWdfZXZlbnRzID0gdHJ1ZTtcbiAgICAgICAgaWYgKHRoaXMuX3BlbmRpbmdfdGFnX2V2ZW50c19yb3dzKSB7XG4gICAgICAgICAgICB0aGlzLl9wZW5kaW5nX3RhZ19ldmVudHNfcm93cyA9IHRoaXMuX3BlbmRpbmdfdGFnX2V2ZW50c19yb3dzLmNvbmNhdChyb3dzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3BlbmRpbmdfdGFnX2V2ZW50c19yb3dzID0gcm93cztcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbi8qKlxuICogU2V0cyBhICd0YWcnIG9uIHRoZSB0ZXh0IHNwZWNpZmllZC5cbiAqIEBwYXJhbSB7aW50ZWdlcn0gc3RhcnRfcm93IC0gcm93IHRoZSB0YWcgc3RhcnRzIG9uXG4gKiBAcGFyYW0ge2ludGVnZXJ9IHN0YXJ0X2NoYXIgLSBpbmRleCwgaW4gdGhlIHJvdywgb2YgdGhlIGZpcnN0IHRhZ2dlZCBjaGFyYWN0ZXJcbiAqIEBwYXJhbSB7aW50ZWdlcn0gZW5kX3JvdyAtIHJvdyB0aGUgdGFnIGVuZHMgb25cbiAqIEBwYXJhbSB7aW50ZWdlcn0gZW5kX2NoYXIgLSBpbmRleCwgaW4gdGhlIHJvdywgb2YgdGhlIGxhc3QgdGFnZ2VkIGNoYXJhY3RlclxuICogQHBhcmFtIHtzdHJpbmd9IHRhZ19uYW1lXG4gKiBAcGFyYW0ge2FueX0gdGFnX3ZhbHVlIC0gb3ZlcnJpZGVzIGFueSBwcmV2aW91cyB0YWdzXG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLnNldF90YWcgPSBmdW5jdGlvbihzdGFydF9yb3csIHN0YXJ0X2NoYXIsIGVuZF9yb3csIGVuZF9jaGFyLCB0YWdfbmFtZSwgdGFnX3ZhbHVlKSB7XG4gICAgdmFyIGNvb3JkcyA9IHRoaXMudmFsaWRhdGVfY29vcmRzLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgdmFyIHJvd3MgPSBbXTtcbiAgICBmb3IgKHZhciByb3cgPSBjb29yZHMuc3RhcnRfcm93OyByb3cgPD0gY29vcmRzLmVuZF9yb3c7IHJvdysrKSB7XG5cbiAgICAgICAgLy8gTWFrZSBzdXJlIHRoZSBzdXBlcnNldCBpcyBkZWZpbmVkIGZvciB0aGUgcm93L3RhZ19uYW1lIHBhaXIuXG4gICAgICAgIHZhciByb3dfdGFncyA9IHRoaXMuX3Jvd190YWdzW3Jvd107XG4gICAgICAgIGlmIChyb3dfdGFnc1t0YWdfbmFtZV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcm93X3RhZ3NbdGFnX25hbWVdID0gbmV3IHN1cGVyc2V0LlN1cGVyc2V0KCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBHZXQgdGhlIHN0YXJ0IGFuZCBlbmQgY2hhciBpbmRpY2llcy5cbiAgICAgICAgdmFyIHMgPSBjb29yZHMuc3RhcnRfY2hhcjtcbiAgICAgICAgdmFyIGUgPSBjb29yZHMuZW5kX2NoYXI7XG4gICAgICAgIGlmIChyb3cgPiBjb29yZHMuc3RhcnRfcm93KSBzID0gMDtcbiAgICAgICAgaWYgKHJvdyA8IGNvb3Jkcy5lbmRfcm93KSBlID0gdGhpcy5fcm93c1tyb3ddLmxlbmd0aCAtIDE7XG5cbiAgICAgICAgLy8gU2V0IHRoZSB2YWx1ZSBmb3IgdGhlIHJhbmdlLlxuICAgICAgICByb3dfdGFnc1t0YWdfbmFtZV0uc2V0KHMsIGUsIHRhZ192YWx1ZSk7XG4gICAgICAgIHJvd3MucHVzaChyb3cpO1xuICAgIH1cbiAgICB0aGlzLnRyaWdnZXJfdGFnX2V2ZW50cyhyb3dzKTtcbn07XG5cbi8qKlxuICogUmVtb3ZlZCBhbGwgb2YgdGhlIHRhZ3Mgb24gdGhlIGRvY3VtZW50LlxuICogQHBhcmFtICB7aW50ZWdlcn0gc3RhcnRfcm93XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBlbmRfcm93XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5jbGVhcl90YWdzID0gZnVuY3Rpb24oc3RhcnRfcm93LCBlbmRfcm93KSB7XG4gICAgc3RhcnRfcm93ID0gc3RhcnRfcm93ICE9PSB1bmRlZmluZWQgPyBzdGFydF9yb3cgOiAwO1xuICAgIGVuZF9yb3cgPSBlbmRfcm93ICE9PSB1bmRlZmluZWQgPyBlbmRfcm93IDogdGhpcy5fcm93X3RhZ3MubGVuZ3RoIC0gMTtcbiAgICB2YXIgcm93cyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSBzdGFydF9yb3c7IGkgPD0gZW5kX3JvdzsgaSsrKSB7XG4gICAgICAgIHRoaXMuX3Jvd190YWdzW2ldID0ge307XG4gICAgICAgIHJvd3MucHVzaChpKTtcbiAgICB9XG4gICAgdGhpcy50cmlnZ2VyX3RhZ19ldmVudHMocm93cyk7XG59O1xuXG4vKipcbiAqIEdldCB0aGUgdGFnIHZhbHVlIGFwcGxpZWQgdG8gdGhlIGNoYXJhY3Rlci5cbiAqIEBwYXJhbSAge3N0cmluZ30gdGFnX25hbWVcbiAqIEBwYXJhbSAge2ludGVnZXJ9IHJvd19pbmRleFxuICogQHBhcmFtICB7aW50ZWdlcn0gY2hhcl9pbmRleFxuICogQHJldHVybiB7b2JqZWN0fSB2YWx1ZSBvciB1bmRlZmluZWRcbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUuZ2V0X3RhZ192YWx1ZSA9IGZ1bmN0aW9uKHRhZ19uYW1lLCByb3dfaW5kZXgsIGNoYXJfaW5kZXgpIHtcblxuICAgIC8vIExvb3AgdGhyb3VnaCB0aGUgdGFncyBvbiB0aGlzIHJvdy5cbiAgICB2YXIgcm93X3RhZ3MgPSB0aGlzLl9yb3dfdGFnc1tyb3dfaW5kZXhdW3RhZ19uYW1lXTtcbiAgICBpZiAocm93X3RhZ3MgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB2YXIgdGFnX2FycmF5ID0gcm93X3RhZ3MuYXJyYXk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGFnX2FycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAvLyBDaGVjayBpZiB3aXRoaW4uXG4gICAgICAgICAgICBpZiAodGFnX2FycmF5W2ldWzBdIDw9IGNoYXJfaW5kZXggJiYgY2hhcl9pbmRleCA8PSB0YWdfYXJyYXlbaV1bMV0pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGFnX2FycmF5W2ldWzJdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG59O1xuXG4vKipcbiAqIEdldCB0aGUgdGFnIHZhbHVlcyBhcHBsaWVkIHRvIHRoZSBzcGVjaWZpYyByYW5nZS5cbiAqIEBwYXJhbSAge3N0cmluZ30gdGFnX25hbWVcbiAqIEBwYXJhbSAge2ludGVnZXJ9IHN0YXJ0X3Jvd1xuICogQHBhcmFtICB7aW50ZWdlcn0gc3RhcnRfY2hhclxuICogQHBhcmFtICB7aW50ZWdlcn0gZW5kX3Jvd1xuICogQHBhcmFtICB7aW50ZWdlcn0gZW5kX2NoYXJcbiAqIEByZXR1cm4ge2FycmF5fSBhcnJheSBvZiB2YWx1ZXNcbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUuZ2V0X3RhZ192YWx1ZXMgPSBmdW5jdGlvbih0YWdfbmFtZSwgc3RhcnRfcm93LCBzdGFydF9jaGFyLCBlbmRfcm93LCBlbmRfY2hhcikge1xuICAgIHZhciBjb29yZHMgPSB0aGlzLnZhbGlkYXRlX2Nvb3Jkcy5jYWxsKHRoaXMsIHN0YXJ0X3Jvdywgc3RhcnRfY2hhciwgZW5kX3JvdywgZW5kX2NoYXIpO1xuICAgIHZhciB2YWx1ZXMgPSBbXTtcbiAgICBmb3IgKHZhciByb3cgPSBjb29yZHMuc3RhcnRfcm93OyByb3cgPD0gY29vcmRzLmVuZF9yb3c7IHJvdysrKSB7XG5cbiAgICAgICAgLy8gR2V0IHRoZSBzdGFydCBhbmQgZW5kIGNoYXIgaW5kaWNpZXMuXG4gICAgICAgIHZhciBzID0gY29vcmRzLnN0YXJ0X2NoYXI7XG4gICAgICAgIHZhciBlID0gY29vcmRzLmVuZF9jaGFyO1xuICAgICAgICBpZiAocm93ID4gY29vcmRzLnN0YXJ0X3JvdykgcyA9IDA7XG4gICAgICAgIGlmIChyb3cgPCBjb29yZHMuZW5kX3JvdykgZSA9IHRoaXMuX3Jvd3Nbcm93XS5sZW5ndGggLSAxO1xuXG4gICAgICAgIC8vIExvb3AgdGhyb3VnaCB0aGUgdGFncyBvbiB0aGlzIHJvdy5cbiAgICAgICAgdmFyIHJvd190YWdzID0gdGhpcy5fcm93X3RhZ3Nbcm93XVt0YWdfbmFtZV07XG4gICAgICAgIGlmIChyb3dfdGFncyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB2YXIgdGFnX2FycmF5ID0gcm93X3RhZ3MuYXJyYXk7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRhZ19hcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBucyA9IHRhZ19hcnJheVtpXVswXTtcbiAgICAgICAgICAgICAgICB2YXIgbmUgPSB0YWdfYXJyYXlbaV1bMV07XG5cbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgYXJlYXMgaW5zZXJzZWN0LlxuICAgICAgICAgICAgICAgIGlmIChucyA8PSBlICYmIG5lID49IHMpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRhZyA9IHRhZ19hcnJheVtpXVsyXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlcy5pbmRleE9mKHRhZykgPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlcy5wdXNoKHRhZyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlcztcbn07XG5cbi8qKlxuICogQWRkcyB0ZXh0IGVmZmljaWVudGx5IHNvbWV3aGVyZSBpbiB0aGUgZG9jdW1lbnQuXG4gKiBAcGFyYW0ge2ludGVnZXJ9IHJvd19pbmRleCAgXG4gKiBAcGFyYW0ge2ludGVnZXJ9IGNoYXJfaW5kZXggXG4gKiBAcGFyYW0ge3N0cmluZ30gdGV4dFxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5hZGRfdGV4dCA9IGZ1bmN0aW9uKHJvd19pbmRleCwgY2hhcl9pbmRleCwgdGV4dCkge1xuICAgIHZhciBjb29yZHMgPSB0aGlzLnZhbGlkYXRlX2Nvb3Jkcy5hcHBseSh0aGlzLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDAsMikpO1xuICAgIHZhciBvbGRfdGV4dCA9IHRoaXMuX3Jvd3NbY29vcmRzLnN0YXJ0X3Jvd107XG4gICAgLy8gSWYgdGhlIHRleHQgaGFzIGEgbmV3IGxpbmUgaW4gaXQsIGp1c3QgcmUtc2V0XG4gICAgLy8gdGhlIHJvd3MgbGlzdC5cbiAgICBpZiAodGV4dC5pbmRleE9mKCdcXG4nKSAhPSAtMSkge1xuICAgICAgICB2YXIgbmV3X3Jvd3MgPSBbXTtcbiAgICAgICAgaWYgKGNvb3Jkcy5zdGFydF9yb3cgPiAwKSB7XG4gICAgICAgICAgICBuZXdfcm93cyA9IHRoaXMuX3Jvd3Muc2xpY2UoMCwgY29vcmRzLnN0YXJ0X3Jvdyk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgb2xkX3Jvd19zdGFydCA9IG9sZF90ZXh0LnN1YnN0cmluZygwLCBjb29yZHMuc3RhcnRfY2hhcik7XG4gICAgICAgIHZhciBvbGRfcm93X2VuZCA9IG9sZF90ZXh0LnN1YnN0cmluZyhjb29yZHMuc3RhcnRfY2hhcik7XG4gICAgICAgIHZhciBzcGxpdF90ZXh0ID0gdGV4dC5zcGxpdCgnXFxuJyk7XG4gICAgICAgIG5ld19yb3dzLnB1c2gob2xkX3Jvd19zdGFydCArIHNwbGl0X3RleHRbMF0pO1xuXG4gICAgICAgIGlmIChzcGxpdF90ZXh0Lmxlbmd0aCA+IDIpIHtcbiAgICAgICAgICAgIG5ld19yb3dzID0gbmV3X3Jvd3MuY29uY2F0KHNwbGl0X3RleHQuc2xpY2UoMSxzcGxpdF90ZXh0Lmxlbmd0aC0xKSk7XG4gICAgICAgIH1cblxuICAgICAgICBuZXdfcm93cy5wdXNoKHNwbGl0X3RleHRbc3BsaXRfdGV4dC5sZW5ndGgtMV0gKyBvbGRfcm93X2VuZCk7XG5cbiAgICAgICAgaWYgKGNvb3Jkcy5zdGFydF9yb3crMSA8IHRoaXMuX3Jvd3MubGVuZ3RoKSB7XG4gICAgICAgICAgICBuZXdfcm93cyA9IG5ld19yb3dzLmNvbmNhdCh0aGlzLl9yb3dzLnNsaWNlKGNvb3Jkcy5zdGFydF9yb3crMSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fcm93cyA9IG5ld19yb3dzO1xuICAgICAgICB0aGlzLl9yZXNpemVkX3Jvd3MoKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdyb3dfY2hhbmdlZCcsIG9sZF90ZXh0LCBjb29yZHMuc3RhcnRfcm93KTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdyb3dzX2FkZGVkJywgY29vcmRzLnN0YXJ0X3JvdyArIDEsIGNvb3Jkcy5zdGFydF9yb3cgKyBzcGxpdF90ZXh0Lmxlbmd0aCAtIDEpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZWQnKTtcblxuICAgIC8vIFRleHQgZG9lc24ndCBoYXZlIGFueSBuZXcgbGluZXMsIGp1c3QgbW9kaWZ5IHRoZVxuICAgIC8vIGxpbmUgYW5kIHRoZW4gdHJpZ2dlciB0aGUgcm93IGNoYW5nZWQgZXZlbnQuXG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fcm93c1tjb29yZHMuc3RhcnRfcm93XSA9IG9sZF90ZXh0LnN1YnN0cmluZygwLCBjb29yZHMuc3RhcnRfY2hhcikgKyB0ZXh0ICsgb2xkX3RleHQuc3Vic3RyaW5nKGNvb3Jkcy5zdGFydF9jaGFyKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdyb3dfY2hhbmdlZCcsIG9sZF90ZXh0LCBjb29yZHMuc3RhcnRfcm93KTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2VkJyk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBSZW1vdmVzIGEgYmxvY2sgb2YgdGV4dCBmcm9tIHRoZSBkb2N1bWVudFxuICogQHBhcmFtICB7aW50ZWdlcn0gc3RhcnRfcm93XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBzdGFydF9jaGFyXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBlbmRfcm93XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBlbmRfY2hhclxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUucmVtb3ZlX3RleHQgPSBmdW5jdGlvbihzdGFydF9yb3csIHN0YXJ0X2NoYXIsIGVuZF9yb3csIGVuZF9jaGFyKSB7XG4gICAgdmFyIGNvb3JkcyA9IHRoaXMudmFsaWRhdGVfY29vcmRzLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgdmFyIG9sZF90ZXh0ID0gdGhpcy5fcm93c1tjb29yZHMuc3RhcnRfcm93XTtcbiAgICBpZiAoY29vcmRzLnN0YXJ0X3JvdyA9PSBjb29yZHMuZW5kX3Jvdykge1xuICAgICAgICB0aGlzLl9yb3dzW2Nvb3Jkcy5zdGFydF9yb3ddID0gdGhpcy5fcm93c1tjb29yZHMuc3RhcnRfcm93XS5zdWJzdHJpbmcoMCwgY29vcmRzLnN0YXJ0X2NoYXIpICsgdGhpcy5fcm93c1tjb29yZHMuc3RhcnRfcm93XS5zdWJzdHJpbmcoY29vcmRzLmVuZF9jaGFyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9yb3dzW2Nvb3Jkcy5zdGFydF9yb3ddID0gdGhpcy5fcm93c1tjb29yZHMuc3RhcnRfcm93XS5zdWJzdHJpbmcoMCwgY29vcmRzLnN0YXJ0X2NoYXIpICsgdGhpcy5fcm93c1tjb29yZHMuZW5kX3Jvd10uc3Vic3RyaW5nKGNvb3Jkcy5lbmRfY2hhcik7XG4gICAgfVxuXG4gICAgaWYgKGNvb3Jkcy5lbmRfcm93IC0gY29vcmRzLnN0YXJ0X3JvdyA+IDApIHtcbiAgICAgICAgdmFyIHJvd3NfcmVtb3ZlZCA9IHRoaXMuX3Jvd3Muc3BsaWNlKGNvb3Jkcy5zdGFydF9yb3cgKyAxLCBjb29yZHMuZW5kX3JvdyAtIGNvb3Jkcy5zdGFydF9yb3cpO1xuICAgICAgICB0aGlzLl9yZXNpemVkX3Jvd3MoKTtcblxuICAgICAgICAvLyBJZiB0aGVyZSBhcmUgbW9yZSBkZWxldGVkIHJvd3MgdGhhbiByb3dzIHJlbWFpbmluZywgaXRcbiAgICAgICAgLy8gaXMgZmFzdGVyIHRvIHJ1biBhIGNhbGN1bGF0aW9uIG9uIHRoZSByZW1haW5pbmcgcm93cyB0aGFuXG4gICAgICAgIC8vIHRvIHJ1biBpdCBvbiB0aGUgcm93cyByZW1vdmVkLlxuICAgICAgICBpZiAocm93c19yZW1vdmVkLmxlbmd0aCA+IHRoaXMuX3Jvd3MubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLnRyaWdnZXIoJ3RleHRfY2hhbmdlZCcpO1xuICAgICAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2VkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnRyaWdnZXIoJ3Jvd19jaGFuZ2VkJywgb2xkX3RleHQsIGNvb3Jkcy5zdGFydF9yb3cpO1xuICAgICAgICAgICAgdGhpcy50cmlnZ2VyKCdyb3dzX3JlbW92ZWQnLCByb3dzX3JlbW92ZWQpO1xuICAgICAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2VkJyk7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGNvb3Jkcy5lbmRfcm93ID09IGNvb3Jkcy5zdGFydF9yb3cpIHtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdyb3dfY2hhbmdlZCcsIG9sZF90ZXh0LCBjb29yZHMuc3RhcnRfcm93KTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2VkJyk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBSZW1vdmUgYSByb3cgZnJvbSB0aGUgZG9jdW1lbnQuXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSByb3dfaW5kZXhcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLnJlbW92ZV9yb3cgPSBmdW5jdGlvbihyb3dfaW5kZXgpIHtcbiAgICBpZiAoMCA8IHJvd19pbmRleCAmJiByb3dfaW5kZXggPCB0aGlzLl9yb3dzLmxlbmd0aCkge1xuICAgICAgICB2YXIgcm93c19yZW1vdmVkID0gdGhpcy5fcm93cy5zcGxpY2Uocm93X2luZGV4LCAxKTtcbiAgICAgICAgdGhpcy5fcmVzaXplZF9yb3dzKCk7XG4gICAgICAgIHRoaXMudHJpZ2dlcigncm93c19yZW1vdmVkJywgcm93c19yZW1vdmVkKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2VkJyk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBHZXRzIGEgY2h1bmsgb2YgdGV4dC5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IHN0YXJ0X3Jvd1xuICogQHBhcmFtICB7aW50ZWdlcn0gc3RhcnRfY2hhclxuICogQHBhcmFtICB7aW50ZWdlcn0gZW5kX3Jvd1xuICogQHBhcmFtICB7aW50ZWdlcn0gZW5kX2NoYXJcbiAqIEByZXR1cm4ge3N0cmluZ31cbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUuZ2V0X3RleHQgPSBmdW5jdGlvbihzdGFydF9yb3csIHN0YXJ0X2NoYXIsIGVuZF9yb3csIGVuZF9jaGFyKSB7XG4gICAgdmFyIGNvb3JkcyA9IHRoaXMudmFsaWRhdGVfY29vcmRzLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgaWYgKGNvb3Jkcy5zdGFydF9yb3c9PWNvb3Jkcy5lbmRfcm93KSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9yb3dzW2Nvb3Jkcy5zdGFydF9yb3ddLnN1YnN0cmluZyhjb29yZHMuc3RhcnRfY2hhciwgY29vcmRzLmVuZF9jaGFyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgdGV4dCA9IFtdO1xuICAgICAgICB0ZXh0LnB1c2godGhpcy5fcm93c1tjb29yZHMuc3RhcnRfcm93XS5zdWJzdHJpbmcoY29vcmRzLnN0YXJ0X2NoYXIpKTtcbiAgICAgICAgaWYgKGNvb3Jkcy5lbmRfcm93IC0gY29vcmRzLnN0YXJ0X3JvdyA+IDEpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSBjb29yZHMuc3RhcnRfcm93ICsgMTsgaSA8IGNvb3Jkcy5lbmRfcm93OyBpKyspIHtcbiAgICAgICAgICAgICAgICB0ZXh0LnB1c2godGhpcy5fcm93c1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGV4dC5wdXNoKHRoaXMuX3Jvd3NbY29vcmRzLmVuZF9yb3ddLnN1YnN0cmluZygwLCBjb29yZHMuZW5kX2NoYXIpKTtcbiAgICAgICAgcmV0dXJuIHRleHQuam9pbignXFxuJyk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBBZGQgYSByb3cgdG8gdGhlIGRvY3VtZW50XG4gKiBAcGFyYW0ge2ludGVnZXJ9IHJvd19pbmRleFxuICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBuZXcgcm93J3MgdGV4dFxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5hZGRfcm93ID0gZnVuY3Rpb24ocm93X2luZGV4LCB0ZXh0KSB7XG4gICAgdmFyIG5ld19yb3dzID0gW107XG4gICAgaWYgKHJvd19pbmRleCA+IDApIHtcbiAgICAgICAgbmV3X3Jvd3MgPSB0aGlzLl9yb3dzLnNsaWNlKDAsIHJvd19pbmRleCk7XG4gICAgfVxuICAgIG5ld19yb3dzLnB1c2godGV4dCk7XG4gICAgaWYgKHJvd19pbmRleCA8IHRoaXMuX3Jvd3MubGVuZ3RoKSB7XG4gICAgICAgIG5ld19yb3dzID0gbmV3X3Jvd3MuY29uY2F0KHRoaXMuX3Jvd3Muc2xpY2Uocm93X2luZGV4KSk7XG4gICAgfVxuXG4gICAgdGhpcy5fcm93cyA9IG5ld19yb3dzO1xuICAgIHRoaXMuX3Jlc2l6ZWRfcm93cygpO1xuICAgIHRoaXMudHJpZ2dlcigncm93c19hZGRlZCcsIHJvd19pbmRleCwgcm93X2luZGV4KTtcbiAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZWQnKTtcbn07XG5cbi8qKlxuICogVmFsaWRhdGVzIHJvdywgY2hhcmFjdGVyIGNvb3JkaW5hdGVzIGluIHRoZSBkb2N1bWVudC5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IHN0YXJ0X3Jvd1xuICogQHBhcmFtICB7aW50ZWdlcn0gc3RhcnRfY2hhclxuICogQHBhcmFtICB7aW50ZWdlcn0gKG9wdGlvbmFsKSBlbmRfcm93XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSAob3B0aW9uYWwpIGVuZF9jaGFyXG4gKiBAcmV0dXJuIHtkaWN0aW9uYXJ5fSBkaWN0aW9uYXJ5IGNvbnRhaW5pbmcgdmFsaWRhdGVkIGNvb3JkaW5hdGVzIHtzdGFydF9yb3csIFxuICogICAgICAgICAgICAgICAgICAgICAgc3RhcnRfY2hhciwgZW5kX3JvdywgZW5kX2NoYXJ9XG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLnZhbGlkYXRlX2Nvb3JkcyA9IGZ1bmN0aW9uKHN0YXJ0X3Jvdywgc3RhcnRfY2hhciwgZW5kX3JvdywgZW5kX2NoYXIpIHtcblxuICAgIC8vIE1ha2Ugc3VyZSB0aGUgdmFsdWVzIGFyZW4ndCB1bmRlZmluZWQuXG4gICAgaWYgKHN0YXJ0X3JvdyA9PT0gdW5kZWZpbmVkKSBzdGFydF9yb3cgPSAwO1xuICAgIGlmIChzdGFydF9jaGFyID09PSB1bmRlZmluZWQpIHN0YXJ0X2NoYXIgPSAwO1xuICAgIGlmIChlbmRfcm93ID09PSB1bmRlZmluZWQpIGVuZF9yb3cgPSBzdGFydF9yb3c7XG4gICAgaWYgKGVuZF9jaGFyID09PSB1bmRlZmluZWQpIGVuZF9jaGFyID0gc3RhcnRfY2hhcjtcblxuICAgIC8vIE1ha2Ugc3VyZSB0aGUgdmFsdWVzIGFyZSB3aXRoaW4gdGhlIGJvdW5kcyBvZiB0aGUgY29udGVudHMuXG4gICAgaWYgKHRoaXMuX3Jvd3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHN0YXJ0X3JvdyA9IDA7XG4gICAgICAgIHN0YXJ0X2NoYXIgPSAwO1xuICAgICAgICBlbmRfcm93ID0gMDtcbiAgICAgICAgZW5kX2NoYXIgPSAwO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChzdGFydF9yb3cgPj0gdGhpcy5fcm93cy5sZW5ndGgpIHN0YXJ0X3JvdyA9IHRoaXMuX3Jvd3MubGVuZ3RoIC0gMTtcbiAgICAgICAgaWYgKHN0YXJ0X3JvdyA8IDApIHN0YXJ0X3JvdyA9IDA7XG4gICAgICAgIGlmIChlbmRfcm93ID49IHRoaXMuX3Jvd3MubGVuZ3RoKSBlbmRfcm93ID0gdGhpcy5fcm93cy5sZW5ndGggLSAxO1xuICAgICAgICBpZiAoZW5kX3JvdyA8IDApIGVuZF9yb3cgPSAwO1xuXG4gICAgICAgIGlmIChzdGFydF9jaGFyID4gdGhpcy5fcm93c1tzdGFydF9yb3ddLmxlbmd0aCkgc3RhcnRfY2hhciA9IHRoaXMuX3Jvd3Nbc3RhcnRfcm93XS5sZW5ndGg7XG4gICAgICAgIGlmIChzdGFydF9jaGFyIDwgMCkgc3RhcnRfY2hhciA9IDA7XG4gICAgICAgIGlmIChlbmRfY2hhciA+IHRoaXMuX3Jvd3NbZW5kX3Jvd10ubGVuZ3RoKSBlbmRfY2hhciA9IHRoaXMuX3Jvd3NbZW5kX3Jvd10ubGVuZ3RoO1xuICAgICAgICBpZiAoZW5kX2NoYXIgPCAwKSBlbmRfY2hhciA9IDA7XG4gICAgfVxuXG4gICAgLy8gTWFrZSBzdXJlIHRoZSBzdGFydCBpcyBiZWZvcmUgdGhlIGVuZC5cbiAgICBpZiAoc3RhcnRfcm93ID4gZW5kX3JvdyB8fCAoc3RhcnRfcm93ID09IGVuZF9yb3cgJiYgc3RhcnRfY2hhciA+IGVuZF9jaGFyKSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3RhcnRfcm93OiBlbmRfcm93LFxuICAgICAgICAgICAgc3RhcnRfY2hhcjogZW5kX2NoYXIsXG4gICAgICAgICAgICBlbmRfcm93OiBzdGFydF9yb3csXG4gICAgICAgICAgICBlbmRfY2hhcjogc3RhcnRfY2hhcixcbiAgICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3RhcnRfcm93OiBzdGFydF9yb3csXG4gICAgICAgICAgICBzdGFydF9jaGFyOiBzdGFydF9jaGFyLFxuICAgICAgICAgICAgZW5kX3JvdzogZW5kX3JvdyxcbiAgICAgICAgICAgIGVuZF9jaGFyOiBlbmRfY2hhcixcbiAgICAgICAgfTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEdldHMgdGhlIHRleHQgb2YgdGhlIGRvY3VtZW50LlxuICogQHJldHVybiB7c3RyaW5nfVxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5fZ2V0X3RleHQgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fcm93cy5qb2luKCdcXG4nKTtcbn07XG5cbi8qKlxuICogU2V0cyB0aGUgdGV4dCBvZiB0aGUgZG9jdW1lbnQuXG4gKiBDb21wbGV4aXR5IE8oTikgZm9yIE4gcm93c1xuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlXG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLl9zZXRfdGV4dCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgdGhpcy5fcm93cyA9IHZhbHVlLnNwbGl0KCdcXG4nKTtcbiAgICB0aGlzLl9yZXNpemVkX3Jvd3MoKTtcbiAgICB0aGlzLnRyaWdnZXIoJ3RleHRfY2hhbmdlZCcpO1xuICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xufTtcblxuLyoqXG4gKiBVcGRhdGVzIF9yb3cncyBwYXJ0bmVyIGFycmF5cy5cbiAqIEByZXR1cm4ge251bGx9IFxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5fcmVzaXplZF9yb3dzID0gZnVuY3Rpb24oKSB7XG5cbiAgICAvLyBNYWtlIHN1cmUgdGhlcmUgYXJlIGFzIG1hbnkgdGFnIHJvd3MgYXMgdGhlcmUgYXJlIHRleHQgcm93cy5cbiAgICB3aGlsZSAodGhpcy5fcm93X3RhZ3MubGVuZ3RoIDwgdGhpcy5fcm93cy5sZW5ndGgpIHtcbiAgICAgICAgdGhpcy5fcm93X3RhZ3MucHVzaCh7fSk7XG4gICAgfVxuICAgIGlmICh0aGlzLl9yb3dfdGFncy5sZW5ndGggPiB0aGlzLl9yb3dzLmxlbmd0aCkge1xuICAgICAgICB0aGlzLl9yb3dfdGFncy5zcGxpY2UodGhpcy5fcm93cy5sZW5ndGgsIHRoaXMuX3Jvd190YWdzLmxlbmd0aCAtIHRoaXMuX3Jvd3MubGVuZ3RoKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIENyZWF0ZSB0aGUgZG9jdW1lbnQncyBwcm9wZXJ0aWVzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUuX2luaXRfcHJvcGVydGllcyA9IGZ1bmN0aW9uKCkgeyAgICBcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhpcy5wcm9wZXJ0eSgncm93cycsIGZ1bmN0aW9uKCkgeyBcbiAgICAgICAgLy8gUmV0dXJuIGEgc2hhbGxvdyBjb3B5IG9mIHRoZSBhcnJheSBzbyBpdCBjYW5ub3QgYmUgbW9kaWZpZWQuXG4gICAgICAgIHJldHVybiBbXS5jb25jYXQodGhhdC5fcm93cyk7IFxuICAgIH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ3RleHQnLCBcbiAgICAgICAgdXRpbHMucHJveHkodGhpcy5fZ2V0X3RleHQsIHRoaXMpLCBcbiAgICAgICAgdXRpbHMucHJveHkodGhpcy5fc2V0X3RleHQsIHRoaXMpKTtcbn07XG5cbmV4cG9ydHMuRG9jdW1lbnRNb2RlbCA9IERvY3VtZW50TW9kZWw7IiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xuXG4vLyBSZW5kZXJlcnNcbnZhciBiYXRjaCA9IHJlcXVpcmUoJy4vcmVuZGVyZXJzL2JhdGNoLmpzJyk7XG52YXIgaGlnaGxpZ2h0ZWRfcm93ID0gcmVxdWlyZSgnLi9yZW5kZXJlcnMvaGlnaGxpZ2h0ZWRfcm93LmpzJyk7XG52YXIgY3Vyc29ycyA9IHJlcXVpcmUoJy4vcmVuZGVyZXJzL2N1cnNvcnMuanMnKTtcbnZhciBzZWxlY3Rpb25zID0gcmVxdWlyZSgnLi9yZW5kZXJlcnMvc2VsZWN0aW9ucy5qcycpO1xudmFyIGNvbG9yID0gcmVxdWlyZSgnLi9yZW5kZXJlcnMvY29sb3IuanMnKTtcbnZhciBoaWdobGlnaHRlciA9IHJlcXVpcmUoJy4vaGlnaGxpZ2h0ZXJzL3ByaXNtLmpzJyk7XG5cbi8qKlxuICogVmlzdWFsIHJlcHJlc2VudGF0aW9uIG9mIGEgRG9jdW1lbnRNb2RlbCBpbnN0YW5jZVxuICogQHBhcmFtIHtDYW52YXN9IGNhbnZhcyBpbnN0YW5jZVxuICogQHBhcmFtIHtEb2N1bWVudE1vZGVsfSBtb2RlbCBpbnN0YW5jZVxuICogQHBhcmFtIHtDdXJzb3JzfSBjdXJzb3JzX21vZGVsIGluc3RhbmNlXG4gKiBAcGFyYW0ge1N0eWxlfSBzdHlsZSAtIGRlc2NyaWJlcyByZW5kZXJpbmcgc3R5bGVcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGhhc19mb2N1cyAtIGZ1bmN0aW9uIHRoYXQgY2hlY2tzIGlmIHRoZSB0ZXh0IGFyZWEgaGFzIGZvY3VzXG4gKi9cbnZhciBEb2N1bWVudFZpZXcgPSBmdW5jdGlvbihjYW52YXMsIG1vZGVsLCBjdXJzb3JzX21vZGVsLCBzdHlsZSwgaGFzX2ZvY3VzKSB7XG4gICAgdGhpcy5fbW9kZWwgPSBtb2RlbDtcblxuICAgIC8vIENyZWF0ZSBjaGlsZCByZW5kZXJlcnMuXG4gICAgdmFyIHJvd19yZW5kZXJlciA9IG5ldyBoaWdobGlnaHRlZF9yb3cuSGlnaGxpZ2h0ZWRSb3dSZW5kZXJlcihtb2RlbCwgY2FudmFzLCBzdHlsZSk7XG4gICAgcm93X3JlbmRlcmVyLm1hcmdpbl9sZWZ0ID0gMjtcbiAgICByb3dfcmVuZGVyZXIubWFyZ2luX3RvcCA9IDI7XG4gICAgdGhpcy5yb3dfcmVuZGVyZXIgPSByb3dfcmVuZGVyZXI7XG4gICAgXG4gICAgLy8gTWFrZSBzdXJlIGNoYW5nZXMgbWFkZSB0byB0aGUgY3Vyc29yKHMpIGFyZSB3aXRoaW4gdGhlIHZpc2libGUgcmVnaW9uLlxuICAgIGN1cnNvcnNfbW9kZWwub24oJ2NoYW5nZScsIGZ1bmN0aW9uKGN1cnNvcikge1xuICAgICAgICB2YXIgcm93X2luZGV4ID0gY3Vyc29yLnByaW1hcnlfcm93O1xuICAgICAgICB2YXIgY2hhcl9pbmRleCA9IGN1cnNvci5wcmltYXJ5X2NoYXI7XG5cbiAgICAgICAgdmFyIHRvcCA9IHJvd19yZW5kZXJlci5nZXRfcm93X3RvcChyb3dfaW5kZXgpO1xuICAgICAgICB2YXIgaGVpZ2h0ID0gcm93X3JlbmRlcmVyLmdldF9yb3dfaGVpZ2h0KHJvd19pbmRleCk7XG4gICAgICAgIHZhciBsZWZ0ID0gcm93X3JlbmRlcmVyLm1lYXN1cmVfcGFydGlhbF9yb3dfd2lkdGgocm93X2luZGV4LCBjaGFyX2luZGV4KSArIHJvd19yZW5kZXJlci5tYXJnaW5fbGVmdDtcbiAgICAgICAgdmFyIGJvdHRvbSA9IHRvcCArIGhlaWdodDtcblxuICAgICAgICB2YXIgY2FudmFzX2hlaWdodCA9IGNhbnZhcy5oZWlnaHQgLSAyMDtcbiAgICAgICAgaWYgKGJvdHRvbSA+IGNhbnZhcy5zY3JvbGxfdG9wICsgY2FudmFzX2hlaWdodCkge1xuICAgICAgICAgICAgY2FudmFzLnNjcm9sbF90b3AgPSBib3R0b20gLSBjYW52YXNfaGVpZ2h0O1xuICAgICAgICB9IGVsc2UgaWYgKHRvcCA8IGNhbnZhcy5zY3JvbGxfdG9wKSB7XG4gICAgICAgICAgICBjYW52YXMuc2Nyb2xsX3RvcCA9IHRvcDtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjYW52YXNfd2lkdGggPSBjYW52YXMud2lkdGggLSAyMDtcbiAgICAgICAgaWYgKGxlZnQgPiBjYW52YXMuc2Nyb2xsX2xlZnQgKyBjYW52YXNfd2lkdGgpIHtcbiAgICAgICAgICAgIGNhbnZhcy5zY3JvbGxfbGVmdCA9IGxlZnQgLSBjYW52YXNfd2lkdGg7XG4gICAgICAgIH0gZWxzZSBpZiAobGVmdCA8IGNhbnZhcy5zY3JvbGxfbGVmdCkge1xuICAgICAgICAgICAgY2FudmFzLnNjcm9sbF9sZWZ0ID0gbGVmdDtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgdmFyIGN1cnNvcnNfcmVuZGVyZXIgPSBuZXcgY3Vyc29ycy5DdXJzb3JzUmVuZGVyZXIoXG4gICAgICAgIGN1cnNvcnNfbW9kZWwsIFxuICAgICAgICBzdHlsZSwgXG4gICAgICAgIHJvd19yZW5kZXJlcixcbiAgICAgICAgaGFzX2ZvY3VzKTtcbiAgICB2YXIgc2VsZWN0aW9uc19yZW5kZXJlciA9IG5ldyBzZWxlY3Rpb25zLlNlbGVjdGlvbnNSZW5kZXJlcihcbiAgICAgICAgY3Vyc29yc19tb2RlbCwgXG4gICAgICAgIHN0eWxlLCBcbiAgICAgICAgcm93X3JlbmRlcmVyLFxuICAgICAgICBoYXNfZm9jdXMsXG4gICAgICAgIGN1cnNvcnNfcmVuZGVyZXIpO1xuXG4gICAgLy8gQ3JlYXRlIHRoZSBiYWNrZ3JvdW5kIHJlbmRlcmVyXG4gICAgdmFyIGNvbG9yX3JlbmRlcmVyID0gbmV3IGNvbG9yLkNvbG9yUmVuZGVyZXIoKTtcbiAgICBjb2xvcl9yZW5kZXJlci5jb2xvciA9IHN0eWxlLmJhY2tncm91bmQgfHwgJ3doaXRlJztcbiAgICBzdHlsZS5vbignY2hhbmdlZDpzdHlsZScsIGZ1bmN0aW9uKCkgeyBjb2xvcl9yZW5kZXJlci5jb2xvciA9IHN0eWxlLmJhY2tncm91bmQ7IH0pO1xuXG4gICAgLy8gQ3JlYXRlIHRoZSBkb2N1bWVudCBoaWdobGlnaHRlciwgd2hpY2ggbmVlZHMgdG8ga25vdyBhYm91dCB0aGUgY3VycmVudGx5XG4gICAgLy8gcmVuZGVyZWQgcm93cyBpbiBvcmRlciB0byBrbm93IHdoZXJlIHRvIGhpZ2hsaWdodC5cbiAgICB0aGlzLmhpZ2hsaWdodGVyID0gbmV3IGhpZ2hsaWdodGVyLlByaXNtSGlnaGxpZ2h0ZXIobW9kZWwsIHJvd19yZW5kZXJlcik7XG5cbiAgICAvLyBQYXNzIGdldF9yb3dfY2hhciBpbnRvIGN1cnNvcnMuXG4gICAgY3Vyc29yc19tb2RlbC5nZXRfcm93X2NoYXIgPSB1dGlscy5wcm94eShyb3dfcmVuZGVyZXIuZ2V0X3Jvd19jaGFyLCByb3dfcmVuZGVyZXIpO1xuXG4gICAgLy8gQ2FsbCBiYXNlIGNvbnN0cnVjdG9yLlxuICAgIGJhdGNoLkJhdGNoUmVuZGVyZXIuY2FsbCh0aGlzLCBbXG4gICAgICAgIGNvbG9yX3JlbmRlcmVyLFxuICAgICAgICBzZWxlY3Rpb25zX3JlbmRlcmVyLFxuICAgICAgICByb3dfcmVuZGVyZXIsXG4gICAgICAgIGN1cnNvcnNfcmVuZGVyZXIsXG4gICAgXSwgY2FudmFzKTtcblxuICAgIC8vIEhvb2t1cCByZW5kZXIgZXZlbnRzLlxuICAgIHRoaXMuX2NhbnZhcy5vbigncmVkcmF3JywgdXRpbHMucHJveHkodGhpcy5yZW5kZXIsIHRoaXMpKTtcbiAgICB0aGlzLl9tb2RlbC5vbignY2hhbmdlZCcsIHV0aWxzLnByb3h5KGNhbnZhcy5yZWRyYXcsIGNhbnZhcykpO1xuXG4gICAgLy8gQ3JlYXRlIHByb3BlcnRpZXNcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhpcy5wcm9wZXJ0eSgnbGFuZ3VhZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQuX2xhbmd1YWdlO1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuaGlnaGxpZ2h0ZXIubG9hZCh2YWx1ZSk7XG4gICAgICAgIHRoYXQuX2xhbmd1YWdlID0gdmFsdWU7XG4gICAgfSk7XG59O1xudXRpbHMuaW5oZXJpdChEb2N1bWVudFZpZXcsIGJhdGNoLkJhdGNoUmVuZGVyZXIpO1xuXG5leHBvcnRzLkRvY3VtZW50VmlldyA9IERvY3VtZW50VmlldzsiLCIvLyBPU1ggYmluZGluZ3NcbmlmIChuYXZpZ2F0b3IuYXBwVmVyc2lvbi5pbmRleE9mKFwiTWFjXCIpICE9IC0xKSB7XG4gICAgZXhwb3J0cy5tYXAgPSB7XG4gICAgICAgICdhbHQtbGVmdGFycm93JyA6ICdjdXJzb3Iud29yZF9sZWZ0JyxcbiAgICAgICAgJ2FsdC1yaWdodGFycm93JyA6ICdjdXJzb3Iud29yZF9yaWdodCcsXG4gICAgICAgICdzaGlmdC1hbHQtbGVmdGFycm93JyA6ICdjdXJzb3Iuc2VsZWN0X3dvcmRfbGVmdCcsXG4gICAgICAgICdzaGlmdC1hbHQtcmlnaHRhcnJvdycgOiAnY3Vyc29yLnNlbGVjdF93b3JkX3JpZ2h0JyxcbiAgICAgICAgJ2FsdC1iYWNrc3BhY2UnIDogJ2N1cnNvci5kZWxldGVfd29yZF9sZWZ0JyxcbiAgICAgICAgJ2FsdC1kZWxldGUnIDogJ2N1cnNvci5kZWxldGVfd29yZF9yaWdodCcsXG4gICAgICAgICdtZXRhLWxlZnRhcnJvdycgOiAnY3Vyc29yLmxpbmVfc3RhcnQnLFxuICAgICAgICAnbWV0YS1yaWdodGFycm93JyA6ICdjdXJzb3IubGluZV9lbmQnLFxuICAgICAgICAnc2hpZnQtbWV0YS1sZWZ0YXJyb3cnIDogJ2N1cnNvci5zZWxlY3RfbGluZV9zdGFydCcsXG4gICAgICAgICdzaGlmdC1tZXRhLXJpZ2h0YXJyb3cnIDogJ2N1cnNvci5zZWxlY3RfbGluZV9lbmQnLFxuICAgICAgICAnbWV0YS1hJyA6ICdjdXJzb3Iuc2VsZWN0X2FsbCcsXG4gICAgICAgICdtZXRhLXonIDogJ2hpc3RvcnkudW5kbycsXG4gICAgICAgICdtZXRhLXknIDogJ2hpc3RvcnkucmVkbycsXG4gICAgfTtcblxuLy8gTm9uIE9TWCBiaW5kaW5nc1xufSBlbHNlIHtcbiAgICBleHBvcnRzLm1hcCA9IHtcbiAgICAgICAgJ2N0cmwtbGVmdGFycm93JyA6ICdjdXJzb3Iud29yZF9sZWZ0JyxcbiAgICAgICAgJ2N0cmwtcmlnaHRhcnJvdycgOiAnY3Vyc29yLndvcmRfcmlnaHQnLFxuICAgICAgICAnY3RybC1iYWNrc3BhY2UnIDogJ2N1cnNvci5kZWxldGVfd29yZF9sZWZ0JyxcbiAgICAgICAgJ2N0cmwtZGVsZXRlJyA6ICdjdXJzb3IuZGVsZXRlX3dvcmRfcmlnaHQnLFxuICAgICAgICAnc2hpZnQtY3RybC1sZWZ0YXJyb3cnIDogJ2N1cnNvci5zZWxlY3Rfd29yZF9sZWZ0JyxcbiAgICAgICAgJ3NoaWZ0LWN0cmwtcmlnaHRhcnJvdycgOiAnY3Vyc29yLnNlbGVjdF93b3JkX3JpZ2h0JyxcbiAgICAgICAgJ2hvbWUnIDogJ2N1cnNvci5saW5lX3N0YXJ0JyxcbiAgICAgICAgJ2VuZCcgOiAnY3Vyc29yLmxpbmVfZW5kJyxcbiAgICAgICAgJ3NoaWZ0LWhvbWUnIDogJ2N1cnNvci5zZWxlY3RfbGluZV9zdGFydCcsXG4gICAgICAgICdzaGlmdC1lbmQnIDogJ2N1cnNvci5zZWxlY3RfbGluZV9lbmQnLFxuICAgICAgICAnY3RybC1hJyA6ICdjdXJzb3Iuc2VsZWN0X2FsbCcsXG4gICAgICAgICdjdHJsLXonIDogJ2hpc3RvcnkudW5kbycsXG4gICAgICAgICdjdHJsLXknIDogJ2hpc3RvcnkucmVkbycsXG4gICAgfTtcblxufVxuXG4vLyBDb21tb24gYmluZGluZ3NcbmV4cG9ydHMubWFwWydrZXlwcmVzcyddID0gJ2N1cnNvci5rZXlwcmVzcyc7XG5leHBvcnRzLm1hcFsnZW50ZXInXSA9ICdjdXJzb3IubmV3bGluZSc7XG5leHBvcnRzLm1hcFsnZGVsZXRlJ10gPSAnY3Vyc29yLmRlbGV0ZV9mb3J3YXJkJztcbmV4cG9ydHMubWFwWydiYWNrc3BhY2UnXSA9ICdjdXJzb3IuZGVsZXRlX2JhY2t3YXJkJztcbmV4cG9ydHMubWFwWydsZWZ0YXJyb3cnXSA9ICdjdXJzb3IubGVmdCc7XG5leHBvcnRzLm1hcFsncmlnaHRhcnJvdyddID0gJ2N1cnNvci5yaWdodCc7XG5leHBvcnRzLm1hcFsndXBhcnJvdyddID0gJ2N1cnNvci51cCc7XG5leHBvcnRzLm1hcFsnZG93bmFycm93J10gPSAnY3Vyc29yLmRvd24nO1xuZXhwb3J0cy5tYXBbJ3NoaWZ0LWxlZnRhcnJvdyddID0gJ2N1cnNvci5zZWxlY3RfbGVmdCc7XG5leHBvcnRzLm1hcFsnc2hpZnQtcmlnaHRhcnJvdyddID0gJ2N1cnNvci5zZWxlY3RfcmlnaHQnO1xuZXhwb3J0cy5tYXBbJ3NoaWZ0LXVwYXJyb3cnXSA9ICdjdXJzb3Iuc2VsZWN0X3VwJztcbmV4cG9ydHMubWFwWydzaGlmdC1kb3duYXJyb3cnXSA9ICdjdXJzb3Iuc2VsZWN0X2Rvd24nO1xuZXhwb3J0cy5tYXBbJ21vdXNlMC1kYmxjbGljayddID0gJ2N1cnNvcnMuc2VsZWN0X3dvcmQnO1xuZXhwb3J0cy5tYXBbJ21vdXNlMC1kb3duJ10gPSAnY3Vyc29ycy5zdGFydF9zZWxlY3Rpb24nO1xuZXhwb3J0cy5tYXBbJ21vdXNlLW1vdmUnXSA9ICdjdXJzb3JzLnNldF9zZWxlY3Rpb24nO1xuZXhwb3J0cy5tYXBbJ21vdXNlMC11cCddID0gJ2N1cnNvcnMuZW5kX3NlbGVjdGlvbic7XG5leHBvcnRzLm1hcFsnc2hpZnQtbW91c2UwLXVwJ10gPSAnY3Vyc29ycy5lbmRfc2VsZWN0aW9uJztcbmV4cG9ydHMubWFwWydzaGlmdC1tb3VzZTAtZG93biddID0gJ2N1cnNvcnMuc3RhcnRfc2V0X3NlbGVjdGlvbic7XG5leHBvcnRzLm1hcFsnc2hpZnQtbW91c2UtbW92ZSddID0gJ2N1cnNvcnMuc2V0X3NlbGVjdGlvbic7XG5leHBvcnRzLm1hcFsndGFiJ10gPSAnY3Vyc29yLmluZGVudCc7XG5leHBvcnRzLm1hcFsnc2hpZnQtdGFiJ10gPSAnY3Vyc29yLnVuaW5kZW50JztcbmV4cG9ydHMubWFwWydlc2NhcGUnXSA9ICdjdXJzb3JzLnNpbmdsZSc7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMuanMnKTtcblxuLyoqXG4gKiBFdmVudCBub3JtYWxpemVyXG4gKlxuICogTGlzdGVucyB0byBET00gZXZlbnRzIGFuZCBlbWl0cyAnY2xlYW5lZCcgdmVyc2lvbnMgb2YgdGhvc2UgZXZlbnRzLlxuICovXG52YXIgTWFwID0gZnVuY3Rpb24obm9ybWFsaXplcikge1xuICAgIHV0aWxzLlBvc3RlckNsYXNzLmNhbGwodGhpcyk7XG4gICAgdGhpcy5fbWFwID0ge307XG5cbiAgICAvLyBDcmVhdGUgbm9ybWFsaXplciBwcm9wZXJ0eVxuICAgIHRoaXMuX25vcm1hbGl6ZXIgPSBudWxsO1xuICAgIHRoaXMuX3Byb3h5X2hhbmRsZV9ldmVudCA9IHV0aWxzLnByb3h5KHRoaXMuX2hhbmRsZV9ldmVudCwgdGhpcyk7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMucHJvcGVydHkoJ25vcm1hbGl6ZXInLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQuX25vcm1hbGl6ZXI7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgLy8gUmVtb3ZlIGV2ZW50IGhhbmRsZXIuXG4gICAgICAgIGlmICh0aGF0Ll9ub3JtYWxpemVyKSB0aGF0Ll9ub3JtYWxpemVyLm9mZl9hbGwodGhhdC5fcHJveHlfaGFuZGxlX2V2ZW50KTtcbiAgICAgICAgLy8gU2V0LCBhbmQgYWRkIGV2ZW50IGhhbmRsZXIuXG4gICAgICAgIHRoYXQuX25vcm1hbGl6ZXIgPSB2YWx1ZTtcbiAgICAgICAgaWYgKHZhbHVlKSB2YWx1ZS5vbl9hbGwodGhhdC5fcHJveHlfaGFuZGxlX2V2ZW50KTtcbiAgICB9KTtcblxuICAgIC8vIElmIGRlZmluZWQsIHNldCB0aGUgbm9ybWFsaXplci5cbiAgICBpZiAobm9ybWFsaXplcikgdGhpcy5ub3JtYWxpemVyID0gbm9ybWFsaXplcjtcbn07XG51dGlscy5pbmhlcml0KE1hcCwgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vKipcbiAqIE1hcCBvZiBBUEkgbWV0aG9kcyBieSBuYW1lLlxuICogQHR5cGUge2RpY3Rpb25hcnl9XG4gKi9cbk1hcC5yZWdpc3RyeSA9IHt9O1xuTWFwLl9yZWdpc3RyeV90YWdzID0ge307XG5cbi8qKlxuICogUmVnaXN0ZXJzIGFuIGFjdGlvbi5cbiAqIEBwYXJhbSAge3N0cmluZ30gbmFtZSAtIG5hbWUgb2YgdGhlIGFjdGlvblxuICogQHBhcmFtICB7ZnVuY3Rpb259IGZcbiAqIEBwYXJhbSAge09iamVjdH0gKG9wdGlvbmFsKSB0YWcgLSBhbGxvd3MgeW91IHRvIHNwZWNpZnkgYSB0YWdcbiAqICAgICAgICAgICAgICAgICAgd2hpY2ggY2FuIGJlIHVzZWQgd2l0aCB0aGUgYHVucmVnaXN0ZXJfYnlfdGFnYFxuICogICAgICAgICAgICAgICAgICBtZXRob2QgdG8gcXVpY2tseSB1bnJlZ2lzdGVyIGFjdGlvbnMgd2l0aFxuICogICAgICAgICAgICAgICAgICB0aGUgdGFnIHNwZWNpZmllZC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbk1hcC5yZWdpc3RlciA9IGZ1bmN0aW9uKG5hbWUsIGYsIHRhZykge1xuICAgIGlmICh1dGlscy5pc19hcnJheShNYXAucmVnaXN0cnlbbmFtZV0pKSB7XG4gICAgICAgIE1hcC5yZWdpc3RyeVtuYW1lXS5wdXNoKGYpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChNYXAucmVnaXN0cnlbbmFtZV09PT11bmRlZmluZWQpIHtcbiAgICAgICAgICAgIE1hcC5yZWdpc3RyeVtuYW1lXSA9IGY7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBNYXAucmVnaXN0cnlbbmFtZV0gPSBbTWFwLnJlZ2lzdHJ5W25hbWVdLCBmXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0YWcpIHtcbiAgICAgICAgaWYgKE1hcC5fcmVnaXN0cnlfdGFnc1t0YWddID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIE1hcC5fcmVnaXN0cnlfdGFnc1t0YWddID0gW107XG4gICAgICAgIH1cbiAgICAgICAgTWFwLl9yZWdpc3RyeV90YWdzW3RhZ10ucHVzaCh7bmFtZTogbmFtZSwgZjogZn0pO1xuICAgIH1cbn07XG5cbi8qKlxuICogVW5yZWdpc3RlciBhbiBhY3Rpb24uXG4gKiBAcGFyYW0gIHtzdHJpbmd9IG5hbWUgLSBuYW1lIG9mIHRoZSBhY3Rpb25cbiAqIEBwYXJhbSAge2Z1bmN0aW9ufSBmXG4gKiBAcmV0dXJuIHtib29sZWFufSB0cnVlIGlmIGFjdGlvbiB3YXMgZm91bmQgYW5kIHVucmVnaXN0ZXJlZFxuICovXG5NYXAudW5yZWdpc3RlciA9IGZ1bmN0aW9uKG5hbWUsIGYpIHtcbiAgICBpZiAodXRpbHMuaXNfYXJyYXkoTWFwLnJlZ2lzdHJ5W25hbWVdKSkge1xuICAgICAgICB2YXIgaW5kZXggPSBNYXAucmVnaXN0cnlbbmFtZV0uaW5kZXhPZihmKTtcbiAgICAgICAgaWYgKGluZGV4ICE9IC0xKSB7XG4gICAgICAgICAgICBNYXAucmVnaXN0cnlbbmFtZV0uc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChNYXAucmVnaXN0cnlbbmFtZV0gPT0gZikge1xuICAgICAgICBkZWxldGUgTWFwLnJlZ2lzdHJ5W25hbWVdO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBVbnJlZ2lzdGVycyBhbGwgb2YgdGhlIGFjdGlvbnMgcmVnaXN0ZXJlZCB3aXRoIGEgZ2l2ZW4gdGFnLlxuICogQHBhcmFtICB7T2JqZWN0fSB0YWcgLSBzcGVjaWZpZWQgaW4gTWFwLnJlZ2lzdGVyLlxuICogQHJldHVybiB7Ym9vbGVhbn0gdHJ1ZSBpZiB0aGUgdGFnIHdhcyBmb3VuZCBhbmQgZGVsZXRlZC5cbiAqL1xuTWFwLnVucmVnaXN0ZXJfYnlfdGFnID0gZnVuY3Rpb24odGFnKSB7XG4gICAgaWYgKE1hcC5fcmVnaXN0cnlfdGFnc1t0YWddKSB7XG4gICAgICAgIE1hcC5fcmVnaXN0cnlfdGFnc1t0YWddLmZvckVhY2goZnVuY3Rpb24ocmVnaXN0cmF0aW9uKSB7XG4gICAgICAgICAgICBNYXAudW5yZWdpc3RlcihyZWdpc3RyYXRpb24ubmFtZSwgcmVnaXN0cmF0aW9uLmYpO1xuICAgICAgICB9KTtcbiAgICAgICAgZGVsZXRlIE1hcC5fcmVnaXN0cnlfdGFnc1t0YWddO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEFwcGVuZCBldmVudCBhY3Rpb25zIHRvIHRoZSBtYXAuXG4gKlxuICogVGhpcyBtZXRob2QgaGFzIHR3byBzaWduYXR1cmVzLiAgSWYgYSBzaW5nbGUgYXJndW1lbnRcbiAqIGlzIHBhc3NlZCB0byBpdCwgdGhhdCBhcmd1bWVudCBpcyB0cmVhdGVkIGxpa2UgYVxuICogZGljdGlvbmFyeS4gIElmIG1vcmUgdGhhbiBvbmUgYXJndW1lbnQgaXMgcGFzc2VkIHRvIGl0LFxuICogZWFjaCBhcmd1bWVudCBpcyB0cmVhdGVkIGFzIGFsdGVybmF0aW5nIGtleSwgdmFsdWVcbiAqIHBhaXJzIG9mIGEgZGljdGlvbmFyeS5cbiAqXG4gKiBUaGUgbWFwIGFsbG93cyB5b3UgdG8gcmVnaXN0ZXIgYWN0aW9ucyBmb3Iga2V5cy5cbiAqIEV4YW1wbGU6XG4gKiAgICAgbWFwLmFwcGVuZF9tYXAoe1xuICogICAgICAgICAnY3RybC1hJzogJ2N1cnNvcnMuc2VsZWN0X2FsbCcsXG4gKiAgICAgfSlcbiAqXG4gKiBNdWx0aXBsZSBhY3Rpb25zIGNhbiBiZSByZWdpc3RlcmVkIGZvciBhIHNpbmdsZSBldmVudC5cbiAqIFRoZSBhY3Rpb25zIGFyZSBleGVjdXRlZCBzZXF1ZW50aWFsbHksIHVudGlsIG9uZSBhY3Rpb25cbiAqIHJldHVybnMgYHRydWVgIGluIHdoaWNoIGNhc2UgdGhlIGV4ZWN1dGlvbiBoYXVsdHMuICBUaGlzXG4gKiBhbGxvd3MgYWN0aW9ucyB0byBydW4gY29uZGl0aW9uYWxseS5cbiAqIEV4YW1wbGU6XG4gKiAgICAgLy8gSW1wbGVtZW50aW5nIGEgZHVhbCBtb2RlIGVkaXRvciwgeW91IG1heSBoYXZlIHR3b1xuICogICAgIC8vIGZ1bmN0aW9ucyB0byByZWdpc3RlciBmb3Igb25lIGtleS4gaS5lLjpcbiAqICAgICB2YXIgZG9fYSA9IGZ1bmN0aW9uKGUpIHtcbiAqICAgICAgICAgaWYgKG1vZGU9PSdlZGl0Jykge1xuICogICAgICAgICAgICAgY29uc29sZS5sb2coJ0EnKTtcbiAqICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICogICAgICAgICB9XG4gKiAgICAgfVxuICogICAgIHZhciBkb19iID0gZnVuY3Rpb24oZSkge1xuICogICAgICAgICBpZiAobW9kZT09J2NvbW1hbmQnKSB7XG4gKiAgICAgICAgICAgICBjb25zb2xlLmxvZygnQicpO1xuICogICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gKiAgICAgICAgIH1cbiAqICAgICB9XG4gKlxuICogICAgIC8vIFRvIHJlZ2lzdGVyIGJvdGggZm9yIG9uZSBrZXlcbiAqICAgICBNYXAucmVnaXN0ZXIoJ2FjdGlvbl9hJywgZG9fYSk7XG4gKiAgICAgTWFwLnJlZ2lzdGVyKCdhY3Rpb25fYicsIGRvX2IpO1xuICogICAgIG1hcC5hcHBlbmRfbWFwKHtcbiAqICAgICAgICAgJ2FsdC12JzogWydhY3Rpb25fYScsICdhY3Rpb25fYiddLFxuICogICAgIH0pO1xuICogXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5NYXAucHJvdG90eXBlLmFwcGVuZF9tYXAgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdmFyIHBhcnNlZCA9IHRoaXMuX3BhcnNlX21hcF9hcmd1bWVudHMoYXJndW1lbnRzKTtcbiAgICBPYmplY3Qua2V5cyhwYXJzZWQpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIGlmICh0aGF0Ll9tYXBba2V5XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGF0Ll9tYXBba2V5XSA9IHBhcnNlZFtrZXldO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhhdC5fbWFwW2tleV0gPSB0aGF0Ll9tYXBba2V5XS5jb25jYXQocGFyc2VkW2tleV0pO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIEFsaWFzIGZvciBgYXBwZW5kX21hcGAuXG4gKiBAdHlwZSB7ZnVuY3Rpb259XG4gKi9cbk1hcC5wcm90b3R5cGUubWFwID0gTWFwLnByb3RvdHlwZS5hcHBlbmRfbWFwO1xuXG4vKipcbiAqIFByZXBlbmQgZXZlbnQgYWN0aW9ucyB0byB0aGUgbWFwLlxuICpcbiAqIFNlZSB0aGUgZG9jIGZvciBgYXBwZW5kX21hcGAgZm9yIGEgZGV0YWlsZWQgZGVzY3JpcHRpb24gb2ZcbiAqIHBvc3NpYmxlIGlucHV0IHZhbHVlcy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbk1hcC5wcm90b3R5cGUucHJlcGVuZF9tYXAgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdmFyIHBhcnNlZCA9IHRoaXMuX3BhcnNlX21hcF9hcmd1bWVudHMoYXJndW1lbnRzKTtcbiAgICBPYmplY3Qua2V5cyhwYXJzZWQpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIGlmICh0aGF0Ll9tYXBba2V5XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGF0Ll9tYXBba2V5XSA9IHBhcnNlZFtrZXldO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhhdC5fbWFwW2tleV0gPSBwYXJzZWRba2V5XS5jb25jYXQodGhhdC5fbWFwW2tleV0pO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIFVubWFwIGV2ZW50IGFjdGlvbnMgaW4gdGhlIG1hcC5cbiAqXG4gKiBTZWUgdGhlIGRvYyBmb3IgYGFwcGVuZF9tYXBgIGZvciBhIGRldGFpbGVkIGRlc2NyaXB0aW9uIG9mXG4gKiBwb3NzaWJsZSBpbnB1dCB2YWx1ZXMuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5NYXAucHJvdG90eXBlLnVubWFwID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHZhciBwYXJzZWQgPSB0aGlzLl9wYXJzZV9tYXBfYXJndW1lbnRzKGFyZ3VtZW50cyk7XG4gICAgT2JqZWN0LmtleXMocGFyc2VkKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICBpZiAodGhhdC5fbWFwW2tleV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcGFyc2VkW2tleV0uZm9yRWFjaChmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHZhciBpbmRleCA9IHRoYXQuX21hcFtrZXldLmluZGV4T2YodmFsdWUpO1xuICAgICAgICAgICAgICAgIGlmIChpbmRleCAhPSAtMSkge1xuICAgICAgICAgICAgICAgICAgICB0aGF0Ll9tYXBba2V5XS5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIEdldCBhIG1vZGlmaWFibGUgYXJyYXkgb2YgdGhlIGFjdGlvbnMgZm9yIGEgcGFydGljdWxhciBldmVudC5cbiAqIEBwYXJhbSAge3N0cmluZ30gZXZlbnRcbiAqIEByZXR1cm4ge2FycmF5fSBieSByZWYgY29weSBvZiB0aGUgYWN0aW9ucyByZWdpc3RlcmVkIHRvIGFuIGV2ZW50LlxuICovXG5NYXAucHJvdG90eXBlLmdldF9tYXBwaW5nID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICByZXR1cm4gdGhpcy5fbWFwW3RoaXMuX25vcm1hbGl6ZV9ldmVudF9uYW1lKGV2ZW50KV07XG59O1xuXG4vKipcbiAqIEludm9rZXMgdGhlIGNhbGxiYWNrcyBvZiBhbiBhY3Rpb24gYnkgbmFtZS5cbiAqIEBwYXJhbSAge3N0cmluZ30gbmFtZVxuICogQHBhcmFtICB7YXJyYXl9IFthcmdzXSAtIGFyZ3VtZW50cyB0byBwYXNzIHRvIHRoZSBhY3Rpb24gY2FsbGJhY2tbc11cbiAqIEByZXR1cm4ge2Jvb2xlYW59IHRydWUgaWYgb25lIG9yIG1vcmUgb2YgdGhlIGFjdGlvbnMgcmV0dXJuZWQgdHJ1ZVxuICovXG5NYXAucHJvdG90eXBlLmludm9rZSA9IGZ1bmN0aW9uKG5hbWUsIGFyZ3MpIHtcbiAgICB2YXIgYWN0aW9uX2NhbGxiYWNrcyA9IE1hcC5yZWdpc3RyeVtuYW1lXTtcbiAgICBpZiAoYWN0aW9uX2NhbGxiYWNrcykge1xuICAgICAgICBpZiAodXRpbHMuaXNfYXJyYXkoYWN0aW9uX2NhbGxiYWNrcykpIHtcbiAgICAgICAgICAgIHZhciByZXR1cm5zID0gW107XG4gICAgICAgICAgICBhY3Rpb25fY2FsbGJhY2tzLmZvckVhY2goZnVuY3Rpb24oYWN0aW9uX2NhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJucy5hcHBlbmQoYWN0aW9uX2NhbGxiYWNrLmFwcGx5KHVuZGVmaW5lZCwgYXJncyk9PT10cnVlKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBJZiBvbmUgb2YgdGhlIGFjdGlvbiBjYWxsYmFja3MgcmV0dXJuZWQgdHJ1ZSwgY2FuY2VsIGJ1YmJsaW5nLlxuICAgICAgICAgICAgaWYgKHJldHVybnMuc29tZShmdW5jdGlvbih4KSB7cmV0dXJuIHg7fSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChhY3Rpb25fY2FsbGJhY2tzLmFwcGx5KHVuZGVmaW5lZCwgYXJncyk9PT10cnVlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIFBhcnNlIHRoZSBhcmd1bWVudHMgdG8gYSBtYXAgZnVuY3Rpb24uXG4gKiBAcGFyYW0gIHthcmd1bWVudHMgYXJyYXl9IGFyZ3NcbiAqIEByZXR1cm4ge2RpY3Rpb25hcnl9IHBhcnNlZCByZXN1bHRzXG4gKi9cbk1hcC5wcm90b3R5cGUuX3BhcnNlX21hcF9hcmd1bWVudHMgPSBmdW5jdGlvbihhcmdzKSB7XG4gICAgdmFyIHBhcnNlZCA9IHt9O1xuICAgIHZhciB0aGF0ID0gdGhpcztcblxuICAgIC8vIE9uZSBhcnVtZW50LCB0cmVhdCBpdCBhcyBhIGRpY3Rpb25hcnkgb2YgZXZlbnQgbmFtZXMgYW5kXG4gICAgLy8gYWN0aW9ucy5cbiAgICBpZiAoYXJncy5sZW5ndGggPT0gMSkge1xuICAgICAgICBPYmplY3Qua2V5cyhhcmdzWzBdKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gYXJnc1swXVtrZXldO1xuICAgICAgICAgICAgdmFyIG5vcm1hbGl6ZWRfa2V5ID0gdGhhdC5fbm9ybWFsaXplX2V2ZW50X25hbWUoa2V5KTtcblxuICAgICAgICAgICAgLy8gSWYgdGhlIHZhbHVlIGlzIG5vdCBhbiBhcnJheSwgd3JhcCBpdCBpbiBvbmUuXG4gICAgICAgICAgICBpZiAoIXV0aWxzLmlzX2FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gW3ZhbHVlXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gSWYgdGhlIGtleSBpcyBhbHJlYWR5IGRlZmluZWQsIGNvbmNhdCB0aGUgdmFsdWVzIHRvXG4gICAgICAgICAgICAvLyBpdC4gIE90aGVyd2lzZSwgc2V0IGl0LlxuICAgICAgICAgICAgaWYgKHBhcnNlZFtub3JtYWxpemVkX2tleV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHBhcnNlZFtub3JtYWxpemVkX2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcGFyc2VkW25vcm1hbGl6ZWRfa2V5XSA9IHBhcnNlZFtub3JtYWxpemVkX2tleV0uY29uY2F0KHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAvLyBNb3JlIHRoYW4gb25lIGFyZ3VtZW50LiAgVHJlYXQgYXMgdGhlIGZvcm1hdDpcbiAgICAvLyBldmVudF9uYW1lMSwgYWN0aW9uMSwgZXZlbnRfbmFtZTIsIGFjdGlvbjIsIC4uLiwgZXZlbnRfbmFtZU4sIGFjdGlvbk5cbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKHZhciBpPTA7IGk8TWF0aC5mbG9vcihhcmdzLmxlbmd0aC8yKTsgaSsrKSB7XG4gICAgICAgICAgICB2YXIga2V5ID0gdGhhdC5fbm9ybWFsaXplX2V2ZW50X25hbWUoYXJnc1syKmldKTtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IGFyZ3NbMippICsgMV07XG4gICAgICAgICAgICBpZiAocGFyc2VkW2tleV09PT11bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBwYXJzZWRba2V5XSA9IFt2YWx1ZV07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHBhcnNlZFtrZXldLnB1c2godmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwYXJzZWQ7XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgYSBub3JtYWxpemVkIGV2ZW50LlxuICogQHBhcmFtICB7c3RyaW5nfSBuYW1lIC0gbmFtZSBvZiB0aGUgZXZlbnRcbiAqIEBwYXJhbSAge0V2ZW50fSBlIC0gYnJvd3NlciBFdmVudCBvYmplY3RcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbk1hcC5wcm90b3R5cGUuX2hhbmRsZV9ldmVudCA9IGZ1bmN0aW9uKG5hbWUsIGUpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdmFyIG5vcm1hbGl6ZWRfZXZlbnQgPSB0aGlzLl9ub3JtYWxpemVfZXZlbnRfbmFtZShuYW1lKTtcbiAgICB2YXIgYWN0aW9ucyA9IHRoaXMuX21hcFtub3JtYWxpemVkX2V2ZW50XTtcbiAgICBpZiAoYWN0aW9ucykge1xuICAgICAgICBhY3Rpb25zLmZvckVhY2goZnVuY3Rpb24oYWN0aW9uKSB7XG4gICAgICAgICAgICBpZiAodGhhdC5pbnZva2UoYWN0aW9uLCBbZV0pKSB7XG4gICAgICAgICAgICAgICAgdXRpbHMuY2FuY2VsX2J1YmJsZShlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn07XG5cbi8qKlxuICogQWxwaGFiZXRpY2FsbHkgc29ydHMga2V5cyBpbiBldmVudCBuYW1lLCBzb1xuICogQHBhcmFtICB7c3RyaW5nfSBuYW1lIC0gZXZlbnQgbmFtZVxuICogQHJldHVybiB7c3RyaW5nfSBub3JtYWxpemVkIGV2ZW50IG5hbWVcbiAqL1xuTWFwLnByb3RvdHlwZS5fbm9ybWFsaXplX2V2ZW50X25hbWUgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIG5hbWUudG9Mb3dlckNhc2UoKS50cmltKCkuc3BsaXQoJy0nKS5zb3J0KCkuam9pbignLScpO1xufTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5NYXAgPSBNYXA7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMuanMnKTtcblxuLyoqXG4gKiBFdmVudCBub3JtYWxpemVyXG4gKlxuICogTGlzdGVucyB0byBET00gZXZlbnRzIGFuZCBlbWl0cyAnY2xlYW5lZCcgdmVyc2lvbnMgb2YgdGhvc2UgZXZlbnRzLlxuICovXG52YXIgTm9ybWFsaXplciA9IGZ1bmN0aW9uKCkge1xuICAgIHV0aWxzLlBvc3RlckNsYXNzLmNhbGwodGhpcyk7XG4gICAgdGhpcy5fZWxfaG9va3MgPSB7fTtcbn07XG51dGlscy5pbmhlcml0KE5vcm1hbGl6ZXIsIHV0aWxzLlBvc3RlckNsYXNzKTtcblxuLyoqXG4gKiBMaXN0ZW4gdG8gdGhlIGV2ZW50cyBvZiBhbiBlbGVtZW50LlxuICogQHBhcmFtICB7SFRNTEVsZW1lbnR9IGVsXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Ob3JtYWxpemVyLnByb3RvdHlwZS5saXN0ZW5fdG8gPSBmdW5jdGlvbihlbCkge1xuICAgIHZhciBob29rcyA9IFtdO1xuICAgIGhvb2tzLnB1c2godXRpbHMuaG9vayhlbCwgJ29ua2V5cHJlc3MnLCB0aGlzLl9wcm94eSgncHJlc3MnLCB0aGlzLl9oYW5kbGVfa2V5cHJlc3NfZXZlbnQsIGVsKSkpO1xuICAgIGhvb2tzLnB1c2godXRpbHMuaG9vayhlbCwgJ29ua2V5ZG93bicsICB0aGlzLl9wcm94eSgnZG93bicsIHRoaXMuX2hhbmRsZV9rZXlib2FyZF9ldmVudCwgZWwpKSk7XG4gICAgaG9va3MucHVzaCh1dGlscy5ob29rKGVsLCAnb25rZXl1cCcsICB0aGlzLl9wcm94eSgndXAnLCB0aGlzLl9oYW5kbGVfa2V5Ym9hcmRfZXZlbnQsIGVsKSkpO1xuICAgIGhvb2tzLnB1c2godXRpbHMuaG9vayhlbCwgJ29uZGJsY2xpY2snLCAgdGhpcy5fcHJveHkoJ2RibGNsaWNrJywgdGhpcy5faGFuZGxlX21vdXNlX2V2ZW50LCBlbCkpKTtcbiAgICBob29rcy5wdXNoKHV0aWxzLmhvb2soZWwsICdvbmNsaWNrJywgIHRoaXMuX3Byb3h5KCdjbGljaycsIHRoaXMuX2hhbmRsZV9tb3VzZV9ldmVudCwgZWwpKSk7XG4gICAgaG9va3MucHVzaCh1dGlscy5ob29rKGVsLCAnb25tb3VzZWRvd24nLCAgdGhpcy5fcHJveHkoJ2Rvd24nLCB0aGlzLl9oYW5kbGVfbW91c2VfZXZlbnQsIGVsKSkpO1xuICAgIGhvb2tzLnB1c2godXRpbHMuaG9vayhlbCwgJ29ubW91c2V1cCcsICB0aGlzLl9wcm94eSgndXAnLCB0aGlzLl9oYW5kbGVfbW91c2VfZXZlbnQsIGVsKSkpO1xuICAgIGhvb2tzLnB1c2godXRpbHMuaG9vayhlbCwgJ29ubW91c2Vtb3ZlJywgIHRoaXMuX3Byb3h5KCdtb3ZlJywgdGhpcy5faGFuZGxlX21vdXNlbW92ZV9ldmVudCwgZWwpKSk7XG4gICAgdGhpcy5fZWxfaG9va3NbZWxdID0gaG9va3M7XG59O1xuXG4vKipcbiAqIFN0b3BzIGxpc3RlbmluZyB0byBhbiBlbGVtZW50LlxuICogQHBhcmFtICB7SFRNTEVsZW1lbnR9IGVsXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Ob3JtYWxpemVyLnByb3RvdHlwZS5zdG9wX2xpc3RlbmluZ190byA9IGZ1bmN0aW9uKGVsKSB7XG4gICAgaWYgKHRoaXMuX2VsX2hvb2tzW2VsXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuX2VsX2hvb2tzW2VsXS5mb3JFYWNoKGZ1bmN0aW9uKGhvb2spIHtcbiAgICAgICAgICAgIGhvb2sudW5ob29rKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBkZWxldGUgdGhpcy5fZWxfaG9va3NbZWxdO1xuICAgIH1cbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIGEgbW91c2UgZXZlbnQgb2NjdXJzXG4gKiBAcGFyYW0gIHtIVE1MRWxlbWVudH0gZWxcbiAqIEBwYXJhbSAge0V2ZW50fSBlXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Ob3JtYWxpemVyLnByb3RvdHlwZS5faGFuZGxlX21vdXNlX2V2ZW50ID0gZnVuY3Rpb24oZWwsIGV2ZW50X25hbWUsIGUpIHtcbiAgICBlID0gZSB8fCB3aW5kb3cuZXZlbnQ7XG4gICAgdGhpcy50cmlnZ2VyKHRoaXMuX21vZGlmaWVyX3N0cmluZyhlKSArICdtb3VzZScgKyBlLmJ1dHRvbiArICctJyArIGV2ZW50X25hbWUsIGUpO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gYSBtb3VzZSBldmVudCBvY2N1cnNcbiAqIEBwYXJhbSAge0hUTUxFbGVtZW50fSBlbFxuICogQHBhcmFtICB7RXZlbnR9IGVcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbk5vcm1hbGl6ZXIucHJvdG90eXBlLl9oYW5kbGVfbW91c2Vtb3ZlX2V2ZW50ID0gZnVuY3Rpb24oZWwsIGV2ZW50X25hbWUsIGUpIHtcbiAgICBlID0gZSB8fCB3aW5kb3cuZXZlbnQ7XG4gICAgdGhpcy50cmlnZ2VyKHRoaXMuX21vZGlmaWVyX3N0cmluZyhlKSArICdtb3VzZScgKyAnLScgKyBldmVudF9uYW1lLCBlKTtcbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIGEga2V5Ym9hcmQgZXZlbnQgb2NjdXJzXG4gKiBAcGFyYW0gIHtIVE1MRWxlbWVudH0gZWxcbiAqIEBwYXJhbSAge0V2ZW50fSBlXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Ob3JtYWxpemVyLnByb3RvdHlwZS5faGFuZGxlX2tleWJvYXJkX2V2ZW50ID0gZnVuY3Rpb24oZWwsIGV2ZW50X25hbWUsIGUpIHtcbiAgICBlID0gZSB8fCB3aW5kb3cuZXZlbnQ7XG4gICAgdmFyIGtleW5hbWUgPSB0aGlzLl9sb29rdXBfa2V5Y29kZShlLmtleUNvZGUpO1xuICAgIGlmIChrZXluYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy50cmlnZ2VyKHRoaXMuX21vZGlmaWVyX3N0cmluZyhlKSArIGtleW5hbWUgKyAnLScgKyBldmVudF9uYW1lLCBlKTtcblxuICAgICAgICBpZiAoZXZlbnRfbmFtZT09J2Rvd24nKSB7ICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLnRyaWdnZXIodGhpcy5fbW9kaWZpZXJfc3RyaW5nKGUpICsga2V5bmFtZSwgZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdGhpcy50cmlnZ2VyKHRoaXMuX21vZGlmaWVyX3N0cmluZyhlKSArIFN0cmluZyhlLmtleUNvZGUpICsgJy0nICsgZXZlbnRfbmFtZSwgZSk7XG4gICAgdGhpcy50cmlnZ2VyKCdrZXknICsgZXZlbnRfbmFtZSwgZSk7XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgd2hlbiBhIGtleXByZXNzIGV2ZW50IG9jY3Vyc1xuICogQHBhcmFtICB7SFRNTEVsZW1lbnR9IGVsXG4gKiBAcGFyYW0gIHtFdmVudH0gZVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTm9ybWFsaXplci5wcm90b3R5cGUuX2hhbmRsZV9rZXlwcmVzc19ldmVudCA9IGZ1bmN0aW9uKGVsLCBldmVudF9uYW1lLCBlKSB7XG4gICAgdGhpcy50cmlnZ2VyKCdrZXlwcmVzcycsIGUpO1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIGFuIGVsZW1lbnQgZXZlbnQgcHJveHkuXG4gKiBAcGFyYW0gIHtmdW5jdGlvbn0gZlxuICogQHBhcmFtICB7c3RyaW5nfSBldmVudF9uYW1lXG4gKiBAcGFyYW0gIHtIVE1MRWxlbWVudH0gZWxcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbk5vcm1hbGl6ZXIucHJvdG90eXBlLl9wcm94eSA9IGZ1bmN0aW9uKGV2ZW50X25hbWUsIGYsIGVsKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBbZWwsIGV2ZW50X25hbWVdLmNvbmNhdChBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApKTtcbiAgICAgICAgcmV0dXJuIGYuYXBwbHkodGhhdCwgYXJncyk7XG4gICAgfTtcbn07XG5cbi8qKlxuICogQ3JlYXRlIGEgbW9kaWZpZXJzIHN0cmluZyBmcm9tIGFuIGV2ZW50LlxuICogQHBhcmFtICB7RXZlbnR9IGVcbiAqIEByZXR1cm4ge3N0cmluZ30gZGFzaCBzZXBhcmF0ZWQgbW9kaWZpZXIgc3RyaW5nXG4gKi9cbk5vcm1hbGl6ZXIucHJvdG90eXBlLl9tb2RpZmllcl9zdHJpbmcgPSBmdW5jdGlvbihlKSB7XG4gICAgdmFyIG1vZGlmaWVycyA9IFtdO1xuICAgIGlmIChlLmN0cmxLZXkpIG1vZGlmaWVycy5wdXNoKCdjdHJsJyk7XG4gICAgaWYgKGUuYWx0S2V5KSBtb2RpZmllcnMucHVzaCgnYWx0Jyk7XG4gICAgaWYgKGUubWV0YUtleSkgbW9kaWZpZXJzLnB1c2goJ21ldGEnKTtcbiAgICBpZiAoZS5zaGlmdEtleSkgbW9kaWZpZXJzLnB1c2goJ3NoaWZ0Jyk7XG4gICAgdmFyIHN0cmluZyA9IG1vZGlmaWVycy5zb3J0KCkuam9pbignLScpO1xuICAgIGlmIChzdHJpbmcubGVuZ3RoID4gMCkgc3RyaW5nID0gc3RyaW5nICsgJy0nO1xuICAgIHJldHVybiBzdHJpbmc7XG59O1xuXG4vKipcbiAqIExvb2t1cCB0aGUgaHVtYW4gZnJpZW5kbHkgbmFtZSBmb3IgYSBrZXljb2RlLlxuICogQHBhcmFtICB7aW50ZWdlcn0ga2V5Y29kZVxuICogQHJldHVybiB7c3RyaW5nfSBrZXkgbmFtZVxuICovXG5Ob3JtYWxpemVyLnByb3RvdHlwZS5fbG9va3VwX2tleWNvZGUgPSBmdW5jdGlvbihrZXljb2RlKSB7XG4gICAgaWYgKDExMiA8PSBrZXljb2RlICYmIGtleWNvZGUgPD0gMTIzKSB7IC8vIEYxLUYxMlxuICAgICAgICByZXR1cm4gJ2YnICsgKGtleWNvZGUtMTExKTtcbiAgICB9IGVsc2UgaWYgKDQ4IDw9IGtleWNvZGUgJiYga2V5Y29kZSA8PSA1NykgeyAvLyAwLTlcbiAgICAgICAgcmV0dXJuIFN0cmluZyhrZXljb2RlLTQ4KTtcbiAgICB9IGVsc2UgaWYgKDY1IDw9IGtleWNvZGUgJiYga2V5Y29kZSA8PSA5MCkgeyAvLyBBLVpcbiAgICAgICAgcmV0dXJuICdhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5eicuc3Vic3RyaW5nKFN0cmluZyhrZXljb2RlLTY1KSwgU3RyaW5nKGtleWNvZGUtNjQpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgY29kZXMgPSB7XG4gICAgICAgICAgICA4OiAnYmFja3NwYWNlJyxcbiAgICAgICAgICAgIDk6ICd0YWInLFxuICAgICAgICAgICAgMTM6ICdlbnRlcicsXG4gICAgICAgICAgICAxNjogJ3NoaWZ0JyxcbiAgICAgICAgICAgIDE3OiAnY3RybCcsXG4gICAgICAgICAgICAxODogJ2FsdCcsXG4gICAgICAgICAgICAxOTogJ3BhdXNlJyxcbiAgICAgICAgICAgIDIwOiAnY2Fwc2xvY2snLFxuICAgICAgICAgICAgMjc6ICdlc2MnLFxuICAgICAgICAgICAgMzI6ICdzcGFjZScsXG4gICAgICAgICAgICAzMzogJ3BhZ2V1cCcsXG4gICAgICAgICAgICAzNDogJ3BhZ2Vkb3duJyxcbiAgICAgICAgICAgIDM1OiAnZW5kJyxcbiAgICAgICAgICAgIDM2OiAnaG9tZScsXG4gICAgICAgICAgICAzNzogJ2xlZnRhcnJvdycsXG4gICAgICAgICAgICAzODogJ3VwYXJyb3cnLFxuICAgICAgICAgICAgMzk6ICdyaWdodGFycm93JyxcbiAgICAgICAgICAgIDQwOiAnZG93bmFycm93JyxcbiAgICAgICAgICAgIDQ0OiAncHJpbnRzY3JlZW4nLFxuICAgICAgICAgICAgNDU6ICdpbnNlcnQnLFxuICAgICAgICAgICAgNDY6ICdkZWxldGUnLFxuICAgICAgICAgICAgOTE6ICd3aW5kb3dzJyxcbiAgICAgICAgICAgIDkzOiAnbWVudScsXG4gICAgICAgICAgICAxNDQ6ICdudW1sb2NrJyxcbiAgICAgICAgICAgIDE0NTogJ3Njcm9sbGxvY2snLFxuICAgICAgICAgICAgMTg4OiAnY29tbWEnLFxuICAgICAgICAgICAgMTkwOiAncGVyaW9kJyxcbiAgICAgICAgICAgIDE5MTogJ2Zvd2FyZHNsYXNoJyxcbiAgICAgICAgICAgIDE5MjogJ3RpbGRlJyxcbiAgICAgICAgICAgIDIxOTogJ2xlZnRicmFja2V0JyxcbiAgICAgICAgICAgIDIyMDogJ2JhY2tzbGFzaCcsXG4gICAgICAgICAgICAyMjE6ICdyaWdodGJyYWNrZXQnLFxuICAgICAgICAgICAgMjIyOiAncXVvdGUnLFxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gY29kZXNba2V5Y29kZV07XG4gICAgfSBcbiAgICAvLyBUT0RPOiB0aGlzIGZ1bmN0aW9uIGlzIG1pc3Npbmcgc29tZSBicm93c2VyIHNwZWNpZmljXG4gICAgLy8ga2V5Y29kZSBtYXBwaW5ncy5cbn07XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuTm9ybWFsaXplciA9IE5vcm1hbGl6ZXI7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpO1xuXG4vKipcbiAqIExpc3RlbnMgdG8gYSBtb2RlbCBhbmQgaGlnbGlnaHRzIHRoZSB0ZXh0IGFjY29yZGluZ2x5LlxuICogQHBhcmFtIHtEb2N1bWVudE1vZGVsfSBtb2RlbFxuICovXG52YXIgSGlnaGxpZ2h0ZXJCYXNlID0gZnVuY3Rpb24obW9kZWwsIHJvd19yZW5kZXJlcikge1xuICAgIHV0aWxzLlBvc3RlckNsYXNzLmNhbGwodGhpcyk7XG4gICAgdGhpcy5fbW9kZWwgPSBtb2RlbDtcbiAgICB0aGlzLl9yb3dfcmVuZGVyZXIgPSByb3dfcmVuZGVyZXI7XG4gICAgdGhpcy5fcXVldWVkID0gbnVsbDtcbiAgICB0aGlzLmRlbGF5ID0gMTU7IC8vbXNcblxuICAgIC8vIEJpbmQgZXZlbnRzLlxuICAgIHRoaXMuX3Jvd19yZW5kZXJlci5vbigncm93c19jaGFuZ2VkJywgdXRpbHMucHJveHkodGhpcy5faGFuZGxlX3Njcm9sbCwgdGhpcykpO1xuICAgIHRoaXMuX21vZGVsLm9uKCd0ZXh0X2NoYW5nZWQnLCB1dGlscy5wcm94eSh0aGlzLl9oYW5kbGVfdGV4dF9jaGFuZ2UsIHRoaXMpKTtcbiAgICB0aGlzLl9tb2RlbC5vbigncm93X2NoYW5nZWQnLCB1dGlscy5wcm94eSh0aGlzLl9oYW5kbGVfdGV4dF9jaGFuZ2UsIHRoaXMpKTtcbn07XG51dGlscy5pbmhlcml0KEhpZ2hsaWdodGVyQmFzZSwgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vKipcbiAqIEhpZ2hsaWdodCB0aGUgZG9jdW1lbnRcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkhpZ2hsaWdodGVyQmFzZS5wcm90b3R5cGUuaGlnaGxpZ2h0ID0gZnVuY3Rpb24oc3RhcnRfcm93LCBlbmRfcm93KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdOb3QgaW1wbGVtZW50ZWQnKTtcbn07XG5cbi8qKlxuICogUXVldWVzIGEgaGlnaGxpZ2h0IG9wZXJhdGlvbi5cbiAqXG4gKiBJZiBhIGhpZ2hsaWdodCBvcGVyYXRpb24gaXMgYWxyZWFkeSBxdWV1ZWQsIGRvbid0IHF1ZXVlXG4gKiBhbm90aGVyIG9uZS4gIFRoaXMgZW5zdXJlcyB0aGF0IHRoZSBoaWdobGlnaHRpbmcgaXNcbiAqIGZyYW1lIHJhdGUgbG9ja2VkLiAgSGlnaGxpZ2h0aW5nIGlzIGFuIGV4cGVuc2l2ZSBvcGVyYXRpb24uXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5IaWdobGlnaHRlckJhc2UucHJvdG90eXBlLl9xdWV1ZV9oaWdobGlnaHRlciA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLl9xdWV1ZWQgPT09IG51bGwpIHtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB0aGlzLl9xdWV1ZWQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhhdC5fbW9kZWwuYWNxdWlyZV90YWdfZXZlbnRfbG9jaygpO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB2YXIgdmlzaWJsZV9yb3dzID0gdGhhdC5fcm93X3JlbmRlcmVyLmdldF92aXNpYmxlX3Jvd3MoKTtcbiAgICAgICAgICAgICAgICB2YXIgdG9wX3JvdyA9IHZpc2libGVfcm93cy50b3Bfcm93O1xuICAgICAgICAgICAgICAgIHZhciBib3R0b21fcm93ID0gdmlzaWJsZV9yb3dzLmJvdHRvbV9yb3c7XG4gICAgICAgICAgICAgICAgdGhhdC5oaWdobGlnaHQodG9wX3JvdywgYm90dG9tX3Jvdyk7XG4gICAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgICAgIHRoYXQuX21vZGVsLnJlbGVhc2VfdGFnX2V2ZW50X2xvY2soKTtcbiAgICAgICAgICAgICAgICB0aGF0Ll9xdWV1ZWQgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0aGlzLmRlbGF5KTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgd2hlbiB0aGUgdmlzaWJsZSByb3cgaW5kaWNpZXMgYXJlIGNoYW5nZWQuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5IaWdobGlnaHRlckJhc2UucHJvdG90eXBlLl9oYW5kbGVfc2Nyb2xsID0gZnVuY3Rpb24oc3RhcnRfcm93LCBlbmRfcm93KSB7XG4gICAgdGhpcy5fcXVldWVfaGlnaGxpZ2h0ZXIoKTtcbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIHRoZSB0ZXh0IGNoYW5nZXMuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5IaWdobGlnaHRlckJhc2UucHJvdG90eXBlLl9oYW5kbGVfdGV4dF9jaGFuZ2UgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9xdWV1ZV9oaWdobGlnaHRlcigpO1xufTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5IaWdobGlnaHRlckJhc2UgPSBIaWdobGlnaHRlckJhc2U7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMuanMnKTtcbnZhciBzdXBlcnNldCA9IHJlcXVpcmUoJy4uL3N1cGVyc2V0LmpzJyk7XG52YXIgaGlnaGxpZ2h0ZXIgPSByZXF1aXJlKCcuL2hpZ2hsaWdodGVyLmpzJyk7XG52YXIgcHJpc20gPSByZXF1aXJlKCcuLi8uLi9jb21wb25lbnRzL3ByaXNtLmpzJyk7XG5cbi8qKlxuICogTGlzdGVucyB0byBhIG1vZGVsIGFuZCBoaWdobGlnaHRzIHRoZSB0ZXh0IGFjY29yZGluZ2x5LlxuICogQHBhcmFtIHtEb2N1bWVudE1vZGVsfSBtb2RlbFxuICovXG52YXIgUHJpc21IaWdobGlnaHRlciA9IGZ1bmN0aW9uKG1vZGVsLCByb3dfcmVuZGVyZXIpIHtcbiAgICBoaWdobGlnaHRlci5IaWdobGlnaHRlckJhc2UuY2FsbCh0aGlzLCBtb2RlbCwgcm93X3JlbmRlcmVyKTtcblxuICAgIC8vIExvb2sgYmFjayBhbmQgZm9yd2FyZCB0aGlzIG1hbnkgcm93cyBmb3IgY29udGV4dHVhbGx5IFxuICAgIC8vIHNlbnNpdGl2ZSBoaWdobGlnaHRpbmcuXG4gICAgdGhpcy5fcm93X3BhZGRpbmcgPSAzMDtcbiAgICB0aGlzLl9sYW5ndWFnZSA9IG51bGw7XG5cbiAgICAvLyBQcm9wZXJ0aWVzXG4gICAgdGhpcy5wcm9wZXJ0eSgnbGFuZ3VhZ2VzJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBsYW5ndWFnZXMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgbCBpbiBwcmlzbS5sYW5ndWFnZXMpIHtcbiAgICAgICAgICAgIGlmIChwcmlzbS5sYW5ndWFnZXMuaGFzT3duUHJvcGVydHkobCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoW1wiZXh0ZW5kXCIsIFwiaW5zZXJ0QmVmb3JlXCIsIFwiREZTXCJdLmluZGV4T2YobCkgPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgbGFuZ3VhZ2VzLnB1c2gobCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBsYW5ndWFnZXM7XG4gICAgfSk7XG59O1xudXRpbHMuaW5oZXJpdChQcmlzbUhpZ2hsaWdodGVyLCBoaWdobGlnaHRlci5IaWdobGlnaHRlckJhc2UpO1xuXG4vKipcbiAqIEhpZ2hsaWdodCB0aGUgZG9jdW1lbnRcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblByaXNtSGlnaGxpZ2h0ZXIucHJvdG90eXBlLmhpZ2hsaWdodCA9IGZ1bmN0aW9uKHN0YXJ0X3JvdywgZW5kX3Jvdykge1xuICAgIC8vIEdldCB0aGUgZmlyc3QgYW5kIGxhc3Qgcm93cyB0aGF0IHNob3VsZCBiZSBoaWdobGlnaHRlZC5cbiAgICBzdGFydF9yb3cgPSBNYXRoLm1heCgwLCBzdGFydF9yb3cgLSB0aGlzLl9yb3dfcGFkZGluZyk7XG4gICAgZW5kX3JvdyA9IE1hdGgubWluKHRoaXMuX21vZGVsLl9yb3dzLmxlbmd0aCAtIDEsIGVuZF9yb3cgKyB0aGlzLl9yb3dfcGFkZGluZyk7XG5cbiAgICAvLyBBYm9ydCBpZiBsYW5ndWFnZSBpc24ndCBzcGVjaWZpZWQuXG4gICAgaWYgKCF0aGlzLl9sYW5ndWFnZSkgcmV0dXJuO1xuICAgIFxuICAgIC8vIEdldCB0aGUgdGV4dCBvZiB0aGUgcm93cy5cbiAgICB2YXIgdGV4dCA9IHRoaXMuX21vZGVsLmdldF90ZXh0KHN0YXJ0X3JvdywgMCwgZW5kX3JvdywgdGhpcy5fbW9kZWwuX3Jvd3NbZW5kX3Jvd10ubGVuZ3RoKTtcblxuICAgIC8vIEZpZ3VyZSBvdXQgd2hlcmUgZWFjaCB0YWcgYmVsb25ncy5cbiAgICB2YXIgaGlnaGxpZ2h0cyA9IHRoaXMuX2hpZ2hsaWdodCh0ZXh0KTsgLy8gW3N0YXJ0X2luZGV4LCBlbmRfaW5kZXgsIHRhZ11cbiAgICBcbiAgICAvLyBDYWxjdWxhdGUgUG9zdGVyIHRhZ3NcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgaGlnaGxpZ2h0cy5mb3JFYWNoKGZ1bmN0aW9uKGhpZ2hsaWdodCkge1xuXG4gICAgICAgIC8vIFRyYW5zbGF0ZSB0YWcgY2hhcmFjdGVyIGluZGljaWVzIHRvIHJvdywgY2hhciBjb29yZGluYXRlcy5cbiAgICAgICAgdmFyIGJlZm9yZV9yb3dzID0gdGV4dC5zdWJzdHJpbmcoMCwgaGlnaGxpZ2h0WzBdKS5zcGxpdCgnXFxuJyk7XG4gICAgICAgIHZhciBncm91cF9zdGFydF9yb3cgPSBzdGFydF9yb3cgKyBiZWZvcmVfcm93cy5sZW5ndGggLSAxO1xuICAgICAgICB2YXIgZ3JvdXBfc3RhcnRfY2hhciA9IGJlZm9yZV9yb3dzW2JlZm9yZV9yb3dzLmxlbmd0aCAtIDFdLmxlbmd0aDtcbiAgICAgICAgdmFyIGFmdGVyX3Jvd3MgPSB0ZXh0LnN1YnN0cmluZygwLCBoaWdobGlnaHRbMV0pLnNwbGl0KCdcXG4nKTtcbiAgICAgICAgdmFyIGdyb3VwX2VuZF9yb3cgPSBzdGFydF9yb3cgKyBhZnRlcl9yb3dzLmxlbmd0aCAtIDE7XG4gICAgICAgIHZhciBncm91cF9lbmRfY2hhciA9IGFmdGVyX3Jvd3NbYWZ0ZXJfcm93cy5sZW5ndGggLSAxXS5sZW5ndGg7XG5cbiAgICAgICAgLy8gQXBwbHkgdGFnIGlmIGl0J3Mgbm90IGFscmVhZHkgYXBwbGllZC5cbiAgICAgICAgdmFyIHRhZyA9IGhpZ2hsaWdodFsyXS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICB2YXIgZXhpc3RpbmdfdGFncyA9IHRoYXQuX21vZGVsLmdldF90YWdfdmFsdWVzKCdzeW50YXgnLCBncm91cF9zdGFydF9yb3csIGdyb3VwX3N0YXJ0X2NoYXIsIGdyb3VwX2VuZF9yb3csIGdyb3VwX2VuZF9jaGFyKTtcbiAgICAgICAgaWYgKGV4aXN0aW5nX3RhZ3MubGVuZ3RoICE9PSAxIHx8IGV4aXN0aW5nX3RhZ3NbMF0gIT09IHRhZykge1xuICAgICAgICAgICAgdGhhdC5fbW9kZWwuc2V0X3RhZyhncm91cF9zdGFydF9yb3csIGdyb3VwX3N0YXJ0X2NoYXIsIGdyb3VwX2VuZF9yb3csIGdyb3VwX2VuZF9jaGFyLCAnc3ludGF4JywgdGFnKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuLyoqXG4gKiBGaW5kIGVhY2ggcGFydCBvZiB0ZXh0IHRoYXQgbmVlZHMgdG8gYmUgaGlnaGxpZ2h0ZWQuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IHRleHRcbiAqIEByZXR1cm4ge2FycmF5fSBsaXN0IGNvbnRhaW5pbmcgaXRlbXMgb2YgdGhlIGZvcm0gW3N0YXJ0X2luZGV4LCBlbmRfaW5kZXgsIHRhZ11cbiAqL1xuUHJpc21IaWdobGlnaHRlci5wcm90b3R5cGUuX2hpZ2hsaWdodCA9IGZ1bmN0aW9uKHRleHQpIHtcblxuICAgIC8vIFRva2VuaXplIHVzaW5nIHByaXNtLmpzXG4gICAgdmFyIHRva2VucyA9IHByaXNtLnRva2VuaXplKHRleHQsIHRoaXMuX2xhbmd1YWdlKTtcblxuICAgIC8vIENvbnZlcnQgdGhlIHRva2VucyBpbnRvIFtzdGFydF9pbmRleCwgZW5kX2luZGV4LCB0YWddXG4gICAgdmFyIGxlZnQgPSAwO1xuICAgIHZhciBmbGF0dGVuID0gZnVuY3Rpb24odG9rZW5zLCBwcmVmaXgpIHtcbiAgICAgICAgaWYgKCFwcmVmaXgpIHsgcHJlZml4ID0gW107IH1cbiAgICAgICAgdmFyIGZsYXQgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0b2tlbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciB0b2tlbiA9IHRva2Vuc1tpXTtcbiAgICAgICAgICAgIGlmICh0b2tlbi5jb250ZW50KSB7XG4gICAgICAgICAgICAgICAgZmxhdCA9IGZsYXQuY29uY2F0KGZsYXR0ZW4oW10uY29uY2F0KHRva2VuLmNvbnRlbnQpLCBwcmVmaXguY29uY2F0KHRva2VuLnR5cGUpKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChwcmVmaXgubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBmbGF0LnB1c2goW2xlZnQsIGxlZnQgKyB0b2tlbi5sZW5ndGgsIHByZWZpeC5qb2luKCcgJyldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbGVmdCArPSB0b2tlbi5sZW5ndGg7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZsYXQ7XG4gICAgfTtcbiAgICB2YXIgdGFncyA9IGZsYXR0ZW4odG9rZW5zKTtcblxuICAgIC8vIFVzZSBhIHN1cGVyc2V0IHRvIHJlZHVjZSBvdmVybGFwcGluZyB0YWdzLlxuICAgIHZhciBzZXQgPSBuZXcgc3VwZXJzZXQuU3VwZXJzZXQoKTtcbiAgICBzZXQuc2V0KDAsIHRleHQubGVuZ3RoLTEsICcnKTtcbiAgICB0YWdzLmZvckVhY2goZnVuY3Rpb24odGFnKSB7XG4gICAgICAgIHNldC5zZXQodGFnWzBdLCB0YWdbMV0tMSwgdGFnWzJdKTtcbiAgICB9KTtcbiAgICByZXR1cm4gc2V0LmFycmF5O1xufTtcblxuLyoqXG4gKiBMb2FkcyBhIHN5bnRheCBieSBsYW5ndWFnZSBuYW1lLlxuICogQHBhcmFtICB7c3RyaW5nIG9yIGRpY3Rpb25hcnl9IGxhbmd1YWdlXG4gKiBAcmV0dXJuIHtib29sZWFufSBzdWNjZXNzXG4gKi9cblByaXNtSGlnaGxpZ2h0ZXIucHJvdG90eXBlLmxvYWQgPSBmdW5jdGlvbihsYW5ndWFnZSkge1xuICAgIHRyeSB7XG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSBsYW5ndWFnZSBleGlzdHMuXG4gICAgICAgIGlmIChwcmlzbS5sYW5ndWFnZXNbbGFuZ3VhZ2VdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTGFuZ3VhZ2UgZG9lcyBub3QgZXhpc3QhJyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fbGFuZ3VhZ2UgPSBwcmlzbS5sYW5ndWFnZXNbbGFuZ3VhZ2VdO1xuICAgICAgICB0aGlzLl9xdWV1ZV9oaWdobGlnaHRlcigpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGxvYWRpbmcgbGFuZ3VhZ2UnLCBlKTtcbiAgICAgICAgdGhpcy5fbGFuZ3VhZ2UgPSBudWxsO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5QcmlzbUhpZ2hsaWdodGVyID0gUHJpc21IaWdobGlnaHRlcjtcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcbnZhciBrZXltYXAgPSByZXF1aXJlKCcuL2V2ZW50cy9tYXAuanMnKTtcblxuLyoqXG4gKiBSZXZlcnNpYmxlIGFjdGlvbiBoaXN0b3J5LlxuICovXG52YXIgSGlzdG9yeSA9IGZ1bmN0aW9uKG1hcCkge1xuICAgIHV0aWxzLlBvc3RlckNsYXNzLmNhbGwodGhpcyk7XG4gICAgdGhpcy5fbWFwID0gbWFwO1xuICAgIHRoaXMuX2FjdGlvbnMgPSBbXTtcbiAgICB0aGlzLl9hY3Rpb25fZ3JvdXBzID0gW107XG4gICAgdGhpcy5fdW5kb25lID0gW107XG4gICAgdGhpcy5fYXV0b2dyb3VwID0gbnVsbDtcbiAgICB0aGlzLl9hY3Rpb25fbG9jayA9IGZhbHNlO1xuXG4gICAga2V5bWFwLk1hcC5yZWdpc3RlcignaGlzdG9yeS51bmRvJywgdXRpbHMucHJveHkodGhpcy51bmRvLCB0aGlzKSk7XG4gICAga2V5bWFwLk1hcC5yZWdpc3RlcignaGlzdG9yeS5yZWRvJywgdXRpbHMucHJveHkodGhpcy5yZWRvLCB0aGlzKSk7XG59O1xudXRpbHMuaW5oZXJpdChIaXN0b3J5LCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8qKlxuICogUHVzaCBhIHJldmVyc2libGUgYWN0aW9uIHRvIHRoZSBoaXN0b3J5LlxuICogQHBhcmFtICB7c3RyaW5nfSBmb3J3YXJkX25hbWUgLSBuYW1lIG9mIHRoZSBmb3J3YXJkIGFjdGlvblxuICogQHBhcmFtICB7YXJyYXl9IGZvcndhcmRfcGFyYW1zIC0gcGFyYW1ldGVycyB0byB1c2Ugd2hlbiBpbnZva2luZyB0aGUgZm9yd2FyZCBhY3Rpb25cbiAqIEBwYXJhbSAge3N0cmluZ30gYmFja3dhcmRfbmFtZSAtIG5hbWUgb2YgdGhlIGJhY2t3YXJkIGFjdGlvblxuICogQHBhcmFtICB7YXJyYXl9IGJhY2t3YXJkX3BhcmFtcyAtIHBhcmFtZXRlcnMgdG8gdXNlIHdoZW4gaW52b2tpbmcgdGhlIGJhY2t3YXJkIGFjdGlvblxuICogQHBhcmFtICB7ZmxvYXR9IFthdXRvZ3JvdXBfZGVsYXldIC0gdGltZSB0byB3YWl0IHRvIGF1dG9tYXRpY2FsbHkgZ3JvdXAgdGhlIGFjdGlvbnMuXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJZiB0aGlzIGlzIHVuZGVmaW5lZCwgYXV0b2dyb3VwaW5nIHdpbGwgbm90IG9jY3VyLlxuICovXG5IaXN0b3J5LnByb3RvdHlwZS5wdXNoX2FjdGlvbiA9IGZ1bmN0aW9uKGZvcndhcmRfbmFtZSwgZm9yd2FyZF9wYXJhbXMsIGJhY2t3YXJkX25hbWUsIGJhY2t3YXJkX3BhcmFtcywgYXV0b2dyb3VwX2RlbGF5KSB7XG4gICAgaWYgKHRoaXMuX2FjdGlvbl9sb2NrKSByZXR1cm47XG5cbiAgICB0aGlzLl9hY3Rpb25zLnB1c2goe1xuICAgICAgICBmb3J3YXJkOiB7XG4gICAgICAgICAgICBuYW1lOiBmb3J3YXJkX25hbWUsXG4gICAgICAgICAgICBwYXJhbWV0ZXJzOiBmb3J3YXJkX3BhcmFtcyxcbiAgICAgICAgfSxcbiAgICAgICAgYmFja3dhcmQ6IHtcbiAgICAgICAgICAgIG5hbWU6IGJhY2t3YXJkX25hbWUsXG4gICAgICAgICAgICBwYXJhbWV0ZXJzOiBiYWNrd2FyZF9wYXJhbXMsXG4gICAgICAgIH1cbiAgICB9KTtcbiAgICB0aGlzLl91bmRvbmUgPSBbXTtcblxuICAgIC8vIElmIGEgZGVsYXkgaXMgZGVmaW5lZCwgcHJlcGFyZSBhIHRpbWVvdXQgdG8gYXV0b2dyb3VwLlxuICAgIGlmIChhdXRvZ3JvdXBfZGVsYXkgIT09IHVuZGVmaW5lZCkge1xuXG4gICAgICAgIC8vIElmIGFub3RoZXIgdGltZW91dCB3YXMgYWxyZWFkeSBzZXQsIGNhbmNlbCBpdC5cbiAgICAgICAgaWYgKHRoaXMuX2F1dG9ncm91cCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuX2F1dG9ncm91cCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgYSBuZXcgdGltZW91dC5cbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB0aGlzLl9hdXRvZ3JvdXAgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhhdC5ncm91cF9hY3Rpb25zKCk7XG4gICAgICAgIH0sIGF1dG9ncm91cF9kZWxheSk7XG4gICAgfTtcbn07XG5cbi8qKlxuICogQ29tbWl0IHRoZSBwdXNoZWQgYWN0aW9ucyB0byBvbmUgZ3JvdXAuXG4gKi9cbkhpc3RvcnkucHJvdG90eXBlLmdyb3VwX2FjdGlvbnMgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9hdXRvZ3JvdXAgPSBudWxsO1xuICAgIGlmICh0aGlzLl9hY3Rpb25fbG9jaykgcmV0dXJuO1xuICAgIFxuICAgIHRoaXMuX2FjdGlvbl9ncm91cHMucHVzaCh0aGlzLl9hY3Rpb25zKTtcbiAgICB0aGlzLl9hY3Rpb25zID0gW107XG4gICAgdGhpcy5fdW5kb25lID0gW107XG59O1xuXG4vKipcbiAqIFVuZG8gb25lIHNldCBvZiBhY3Rpb25zLlxuICovXG5IaXN0b3J5LnByb3RvdHlwZS51bmRvID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gSWYgYSB0aW1lb3V0IGlzIHNldCwgZ3JvdXAgbm93LlxuICAgIGlmICh0aGlzLl9hdXRvZ3JvdXAgIT09IG51bGwpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuX2F1dG9ncm91cCk7XG4gICAgICAgIHRoaXMuZ3JvdXBfYWN0aW9ucygpO1xuICAgIH1cblxuICAgIHZhciB1bmRvO1xuICAgIGlmICh0aGlzLl9hY3Rpb25zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdW5kbyA9IHRoaXMuX2FjdGlvbnM7XG4gICAgfSBlbHNlIGlmICh0aGlzLl9hY3Rpb25fZ3JvdXBzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdW5kbyA9IHRoaXMuX2FjdGlvbl9ncm91cHMucG9wKCk7XG4gICAgICAgIHVuZG8ucmV2ZXJzZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8vIFVuZG8gdGhlIGFjdGlvbnMuXG4gICAgaWYgKCF0aGlzLl9hY3Rpb25fbG9jaykge1xuICAgICAgICB0aGlzLl9hY3Rpb25fbG9jayA9IHRydWU7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgICAgICB1bmRvLmZvckVhY2goZnVuY3Rpb24oYWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgdGhhdC5fbWFwLmludm9rZShhY3Rpb24uYmFja3dhcmQubmFtZSwgYWN0aW9uLmJhY2t3YXJkLnBhcmFtZXRlcnMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICB0aGlzLl9hY3Rpb25fbG9jayA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gQWxsb3cgdGhlIGFjdGlvbiB0byBiZSByZWRvbmUuXG4gICAgdGhpcy5fdW5kb25lLnB1c2godW5kbyk7XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIFJlZG8gb25lIHNldCBvZiBhY3Rpb25zLlxuICovXG5IaXN0b3J5LnByb3RvdHlwZS5yZWRvID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX3VuZG9uZS5sZW5ndGggPiAwKSB7XG4gICAgICAgIHZhciByZWRvID0gdGhpcy5fdW5kb25lLnBvcCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVkbyB0aGUgYWN0aW9ucy5cbiAgICAgICAgaWYgKCF0aGlzLl9hY3Rpb25fbG9jaykge1xuICAgICAgICAgICAgdGhpcy5fYWN0aW9uX2xvY2sgPSB0cnVlO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgICAgICAgICAgcmVkby5mb3JFYWNoKGZ1bmN0aW9uKGFjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICB0aGF0Ll9tYXAuaW52b2tlKGFjdGlvbi5mb3J3YXJkLm5hbWUsIGFjdGlvbi5mb3J3YXJkLnBhcmFtZXRlcnMpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9hY3Rpb25fbG9jayA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWxsb3cgdGhlIGFjdGlvbiB0byBiZSB1bmRvbmUuXG4gICAgICAgIHRoaXMuX2FjdGlvbl9ncm91cHMucHVzaChyZWRvKTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG5leHBvcnRzLkhpc3RvcnkgPSBIaXN0b3J5O1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cbnZhciBwbHVnaW4gPSByZXF1aXJlKCcuLi9wbHVnaW4uanMnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uLy4uL3V0aWxzLmpzJyk7XG52YXIgcmVuZGVyZXIgPSByZXF1aXJlKCcuL3JlbmRlcmVyLmpzJyk7XG5cbi8qKlxuICogR3V0dGVyIHBsdWdpbi5cbiAqL1xudmFyIEd1dHRlciA9IGZ1bmN0aW9uKCkge1xuICAgIHBsdWdpbi5QbHVnaW5CYXNlLmNhbGwodGhpcyk7XG4gICAgdGhpcy5vbignbG9hZCcsIHRoaXMuX2hhbmRsZV9sb2FkLCB0aGlzKTtcbiAgICB0aGlzLm9uKCd1bmxvYWQnLCB0aGlzLl9oYW5kbGVfdW5sb2FkLCB0aGlzKTtcblxuICAgIC8vIENyZWF0ZSBhIGd1dHRlcl93aWR0aCBwcm9wZXJ0eSB0aGF0IGlzIGFkanVzdGFibGUuXG4gICAgdGhpcy5fZ3V0dGVyX3dpZHRoID0gNTA7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMucHJvcGVydHkoJ2d1dHRlcl93aWR0aCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fZ3V0dGVyX3dpZHRoO1xuICAgIH0sIHV0aWxzLnByb3h5KHRoaXMuX3NldF93aWR0aCwgdGhpcykpO1xuICAgIHRoaXMucHJvcGVydHkoJ3JlbmRlcmVyJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9yZW5kZXJlcjtcbiAgICB9KTtcbn07XG51dGlscy5pbmhlcml0KEd1dHRlciwgcGx1Z2luLlBsdWdpbkJhc2UpO1xuXG4vKipcbiAqIFNldHMgdGhlIGd1dHRlcidzIHdpZHRoLlxuICogQHBhcmFtIHtpbnRlZ2VyfSB2YWx1ZSAtIHdpZHRoIGluIHBpeGVsc1xuICovXG5HdXR0ZXIucHJvdG90eXBlLl9zZXRfd2lkdGggPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGlmICh0aGlzLl9ndXR0ZXJfd2lkdGggIT09IHZhbHVlKSB7XG4gICAgICAgIGlmICh0aGlzLmxvYWRlZCkge1xuICAgICAgICAgICAgdGhpcy5wb3N0ZXIudmlldy5yb3dfcmVuZGVyZXIubWFyZ2luX2xlZnQgKz0gdmFsdWUgLSB0aGlzLl9ndXR0ZXJfd2lkdGg7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fZ3V0dGVyX3dpZHRoID0gdmFsdWU7XG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgIH1cbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIHRoZSBwbHVnaW4gaXMgbG9hZGVkLlxuICovXG5HdXR0ZXIucHJvdG90eXBlLl9oYW5kbGVfbG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucG9zdGVyLnZpZXcucm93X3JlbmRlcmVyLm1hcmdpbl9sZWZ0ICs9IHRoaXMuX2d1dHRlcl93aWR0aDtcbiAgICB0aGlzLl9yZW5kZXJlciA9IG5ldyByZW5kZXJlci5HdXR0ZXJSZW5kZXJlcih0aGlzKTtcbiAgICB0aGlzLnJlZ2lzdGVyX3JlbmRlcmVyKHRoaXMuX3JlbmRlcmVyKTtcbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIHRoZSBwbHVnaW4gaXMgdW5sb2FkZWQuXG4gKi9cbkd1dHRlci5wcm90b3R5cGUuX2hhbmRsZV91bmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBSZW1vdmUgYWxsIGxpc3RlbmVycyB0byB0aGlzIHBsdWdpbidzIGNoYW5nZWQgZXZlbnQuXG4gICAgdGhpcy5fcmVuZGVyZXIudW5yZWdpc3RlcigpO1xuICAgIHRoaXMucG9zdGVyLnZpZXcucm93X3JlbmRlcmVyLm1hcmdpbl9sZWZ0IC09IHRoaXMuX2d1dHRlcl93aWR0aDtcbn07XG5cbmV4cG9ydHMuR3V0dGVyID0gR3V0dGVyO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cbnZhciByZW5kZXJlciA9IHJlcXVpcmUoJy4uLy4uL3JlbmRlcmVycy9yZW5kZXJlci5qcycpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vLi4vdXRpbHMuanMnKTtcblxuLyoqXG4gKiBSZW5kZXJlcnMgdGhlIGd1dHRlci5cbiAqL1xudmFyIEd1dHRlclJlbmRlcmVyID0gZnVuY3Rpb24oZ3V0dGVyKSB7XG4gICAgcmVuZGVyZXIuUmVuZGVyZXJCYXNlLmNhbGwodGhpcywgdW5kZWZpbmVkLCB7cGFyZW50X2luZGVwZW5kZW50OiB0cnVlfSk7XG4gICAgdGhpcy5fZ3V0dGVyICA9IGd1dHRlcjtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhpcy5fZ3V0dGVyLm9uKCdjaGFuZ2VkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoYXQuX3JlbmRlcigpO1xuICAgICAgICB0aGF0LnRyaWdnZXIoJ2NoYW5nZWQnKTtcbiAgICB9KTtcbiAgICB0aGlzLl9ob3ZlcmluZyA9IGZhbHNlO1xufTtcbnV0aWxzLmluaGVyaXQoR3V0dGVyUmVuZGVyZXIsIHJlbmRlcmVyLlJlbmRlcmVyQmFzZSk7XG5cbi8qKlxuICogSGFuZGxlcyByZW5kZXJpbmdcbiAqIE9ubHkgcmUtcmVuZGVyIHdoZW4gc2Nyb2xsZWQgaG9yaXpvbnRhbGx5LlxuICovXG5HdXR0ZXJSZW5kZXJlci5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oc2Nyb2xsKSB7XG4gICAgLy8gU2Nyb2xsZWQgcmlnaHQgeG9yIGhvdmVyaW5nXG4gICAgdmFyIGxlZnQgPSB0aGlzLl9ndXR0ZXIucG9zdGVyLmNhbnZhcy5zY3JvbGxfbGVmdDtcbiAgICBpZiAoKGxlZnQgPiAwKSBeIHRoaXMuX2hvdmVyaW5nKSB7XG4gICAgICAgIHRoaXMuX2hvdmVyaW5nID0gbGVmdCA+IDA7XG4gICAgICAgIHRoaXMuX3JlbmRlcigpO1xuICAgIH1cbn07XG5cbi8qKlxuICogUmVuZGVycyB0aGUgZ3V0dGVyXG4gKi9cbkd1dHRlclJlbmRlcmVyLnByb3RvdHlwZS5fcmVuZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fY2FudmFzLmNsZWFyKCk7XG4gICAgdmFyIHdpZHRoID0gdGhpcy5fZ3V0dGVyLmd1dHRlcl93aWR0aDtcbiAgICB0aGlzLl9jYW52YXMuZHJhd19yZWN0YW5nbGUoXG4gICAgICAgIDAsIDAsIHdpZHRoLCB0aGlzLmhlaWdodCwgXG4gICAgICAgIHtcbiAgICAgICAgICAgIGZpbGxfY29sb3I6IHRoaXMuX2d1dHRlci5wb3N0ZXIuc3R5bGUuZ3V0dGVyLFxuICAgICAgICB9XG4gICAgKTtcblxuICAgIC8vIElmIHRoZSBndXR0ZXIgaXMgaG92ZXJpbmcgb3ZlciBjb250ZW50LCBkcmF3IGEgZHJvcCBzaGFkb3cuXG4gICAgaWYgKHRoaXMuX2hvdmVyaW5nKSB7XG4gICAgICAgIHZhciBzaGFkb3dfd2lkdGggPSAxNTtcbiAgICAgICAgdmFyIGdyYWRpZW50ID0gdGhpcy5fY2FudmFzLmdyYWRpZW50KFxuICAgICAgICAgICAgd2lkdGgsIDAsIHdpZHRoK3NoYWRvd193aWR0aCwgMCwgdGhpcy5fZ3V0dGVyLnBvc3Rlci5zdHlsZS5ndXR0ZXJfc2hhZG93IHx8XG4gICAgICAgICAgICBbXG4gICAgICAgICAgICAgICAgWzAsICdibGFjayddLCBcbiAgICAgICAgICAgICAgICBbMSwgJ3RyYW5zcGFyZW50J11cbiAgICAgICAgICAgIF0pO1xuICAgICAgICB0aGlzLl9jYW52YXMuZHJhd19yZWN0YW5nbGUoXG4gICAgICAgICAgICB3aWR0aCwgMCwgc2hhZG93X3dpZHRoLCB0aGlzLmhlaWdodCwgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgZmlsbF9jb2xvcjogZ3JhZGllbnQsXG4gICAgICAgICAgICAgICAgYWxwaGE6IDAuMzUsXG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG5cbiAgICB9XG59O1xuXG4vKipcbiAqIFVucmVnaXN0ZXIgdGhlIGV2ZW50IGxpc3RlbmVyc1xuICogQHBhcmFtICB7UG9zdGVyfSBwb3N0ZXJcbiAqIEBwYXJhbSAge0d1dHRlcn0gZ3V0dGVyXG4gKi9cbkd1dHRlclJlbmRlcmVyLnByb3RvdHlwZS51bnJlZ2lzdGVyID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fZ3V0dGVyLm9mZignY2hhbmdlZCcsIHRoaXMuX3JlbmRlcik7XG59O1xuXG5leHBvcnRzLkd1dHRlclJlbmRlcmVyID0gR3V0dGVyUmVuZGVyZXI7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxudmFyIHBsdWdpbiA9IHJlcXVpcmUoJy4uL3BsdWdpbi5qcycpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vLi4vdXRpbHMuanMnKTtcbnZhciByZW5kZXJlciA9IHJlcXVpcmUoJy4vcmVuZGVyZXIuanMnKTtcblxuLyoqXG4gKiBMaW5lIG51bWJlcnMgcGx1Z2luLlxuICovXG52YXIgTGluZU51bWJlcnMgPSBmdW5jdGlvbigpIHtcbiAgICBwbHVnaW4uUGx1Z2luQmFzZS5jYWxsKHRoaXMpO1xuICAgIHRoaXMub24oJ2xvYWQnLCB0aGlzLl9oYW5kbGVfbG9hZCwgdGhpcyk7XG4gICAgdGhpcy5vbigndW5sb2FkJywgdGhpcy5faGFuZGxlX3VubG9hZCwgdGhpcyk7XG59O1xudXRpbHMuaW5oZXJpdChMaW5lTnVtYmVycywgcGx1Z2luLlBsdWdpbkJhc2UpO1xuXG4vKipcbiAqIEhhbmRsZXMgd2hlbiB0aGUgcGx1Z2luIGlzIGxvYWRlZC5cbiAqL1xuTGluZU51bWJlcnMucHJvdG90eXBlLl9oYW5kbGVfbG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3JlbmRlcmVyID0gbmV3IHJlbmRlcmVyLkxpbmVOdW1iZXJzUmVuZGVyZXIodGhpcyk7XG4gICAgdGhpcy5yZWdpc3Rlcl9yZW5kZXJlcih0aGlzLl9yZW5kZXJlcik7XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgd2hlbiB0aGUgcGx1Z2luIGlzIHVubG9hZGVkLlxuICovXG5MaW5lTnVtYmVycy5wcm90b3R5cGUuX2hhbmRsZV91bmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBSZW1vdmUgYWxsIGxpc3RlbmVycyB0byB0aGlzIHBsdWdpbidzIGNoYW5nZWQgZXZlbnQuXG4gICAgdGhpcy5fcmVuZGVyZXIudW5yZWdpc3RlcigpO1xufTtcblxuZXhwb3J0cy5MaW5lTnVtYmVycyA9IExpbmVOdW1iZXJzO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cbnZhciByZW5kZXJlciA9IHJlcXVpcmUoJy4uLy4uL3JlbmRlcmVycy9yZW5kZXJlci5qcycpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vLi4vdXRpbHMuanMnKTtcbnZhciBjYW52YXMgPSByZXF1aXJlKCcuLi8uLi9jYW52YXMuanMnKTtcblxuLyoqXG4gKiBSZW5kZXJlcnMgdGhlIGxpbmUgbnVtYmVycy5cbiAqL1xudmFyIExpbmVOdW1iZXJzUmVuZGVyZXIgPSBmdW5jdGlvbihwbHVnaW4pIHtcbiAgICByZW5kZXJlci5SZW5kZXJlckJhc2UuY2FsbCh0aGlzLCB1bmRlZmluZWQsIHtwYXJlbnRfaW5kZXBlbmRlbnQ6IHRydWV9KTtcbiAgICB0aGlzLl9wbHVnaW4gID0gcGx1Z2luO1xuICAgIHRoaXMuX3RvcCA9IG51bGw7XG4gICAgdGhpcy5fdG9wX3JvdyA9IG51bGw7XG4gICAgdGhpcy5fY2hhcmFjdGVyX3dpZHRoID0gbnVsbDtcbiAgICB0aGlzLl9sYXN0X3Jvd19jb3VudCA9IG51bGw7XG5cbiAgICAvLyBGaW5kIGd1dHRlciBwbHVnaW4sIGxpc3RlbiB0byBpdHMgY2hhbmdlIGV2ZW50LlxuICAgIHZhciBtYW5hZ2VyID0gdGhpcy5fcGx1Z2luLnBvc3Rlci5wbHVnaW5zO1xuICAgIHRoaXMuX2d1dHRlciA9IG1hbmFnZXIuZmluZCgnZ3V0dGVyJylbMF07XG4gICAgdGhpcy5fZ3V0dGVyLnJlbmRlcmVyLm9uKCdjaGFuZ2VkJywgdGhpcy5fZ3V0dGVyX3Jlc2l6ZSwgdGhpcyk7XG5cbiAgICAvLyBHZXQgcm93IHJlbmRlcmVyLlxuICAgIHRoaXMuX3Jvd19yZW5kZXJlciA9IHRoaXMuX3BsdWdpbi5wb3N0ZXIudmlldy5yb3dfcmVuZGVyZXI7XG5cbiAgICAvLyBEb3VibGUgYnVmZmVyLlxuICAgIHRoaXMuX3RleHRfY2FudmFzID0gbmV3IGNhbnZhcy5DYW52YXMoKTtcbiAgICB0aGlzLl90bXBfY2FudmFzID0gbmV3IGNhbnZhcy5DYW52YXMoKTtcbiAgICB0aGlzLl90ZXh0X2NhbnZhcy53aWR0aCA9IHRoaXMuX2d1dHRlci5ndXR0ZXJfd2lkdGg7XG4gICAgdGhpcy5fdG1wX2NhbnZhcy53aWR0aCA9IHRoaXMuX2d1dHRlci5ndXR0ZXJfd2lkdGg7XG5cbiAgICAvLyBBZGp1c3QgZXZlcnkgYnVmZmVyJ3Mgc2l6ZSB3aGVuIHRoZSBoZWlnaHQgY2hhbmdlcy5cbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhpcy5wcm9wZXJ0eSgnaGVpZ2h0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMuaGVpZ2h0O1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy5oZWlnaHQgPSB2YWx1ZTtcblxuICAgICAgICAvLyBUaGUgdGV4dCBjYW52YXMgc2hvdWxkIGJlIHRoZSByaWdodCBoZWlnaHQgdG8gZml0IGFsbCBvZiB0aGUgbGluZXNcbiAgICAgICAgLy8gdGhhdCB3aWxsIGJlIHJlbmRlcmVkIGluIHRoZSBiYXNlIGNhbnZhcy4gIFRoaXMgaW5jbHVkZXMgdGhlIGxpbmVzXG4gICAgICAgIC8vIHRoYXQgYXJlIHBhcnRpYWxseSByZW5kZXJlZCBhdCB0aGUgdG9wIGFuZCBib3R0b20gb2YgdGhlIGJhc2UgY2FudmFzLlxuICAgICAgICB2YXIgcm93X2hlaWdodCA9IHRoYXQuX3Jvd19yZW5kZXJlci5nZXRfcm93X2hlaWdodCgpO1xuICAgICAgICB0aGF0Ll9yb3dfaGVpZ2h0ID0gcm93X2hlaWdodDtcbiAgICAgICAgdGhhdC5fdmlzaWJsZV9yb3dfY291bnQgPSBNYXRoLmNlaWwodmFsdWUvcm93X2hlaWdodCkgKyAxO1xuICAgICAgICB0aGF0Ll90ZXh0X2NhbnZhcy5oZWlnaHQgPSB0aGF0Ll92aXNpYmxlX3Jvd19jb3VudCAqIHJvd19oZWlnaHQ7XG4gICAgICAgIHRoYXQuX3RtcF9jYW52YXMuaGVpZ2h0ID0gdGhhdC5fdGV4dF9jYW52YXMuaGVpZ2h0O1xuICAgICAgICB0aGF0LnJlcmVuZGVyKCk7XG4gICAgICAgIHRoYXQudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgIH0pO1xuICAgIHRoaXMuaGVpZ2h0ID0gdGhpcy5oZWlnaHQ7XG5cbiAgICAvLyBBZGp1c3QgdGhlIGd1dHRlciBzaXplIHdoZW4gdGhlIG51bWJlciBvZiBsaW5lcyBpbiB0aGUgZG9jdW1lbnQgY2hhbmdlcy5cbiAgICB0aGlzLl9wbHVnaW4ucG9zdGVyLm1vZGVsLm9uKCd0ZXh0X2NoYW5nZWQnLCB1dGlscy5wcm94eSh0aGlzLl9oYW5kbGVfdGV4dF9jaGFuZ2UsIHRoaXMpKTtcbiAgICB0aGlzLl9wbHVnaW4ucG9zdGVyLm1vZGVsLm9uKCdyb3dzX2FkZGVkJywgdXRpbHMucHJveHkodGhpcy5faGFuZGxlX3RleHRfY2hhbmdlLCB0aGlzKSk7XG4gICAgdGhpcy5fcGx1Z2luLnBvc3Rlci5tb2RlbC5vbigncm93c19yZW1vdmVkJywgdXRpbHMucHJveHkodGhpcy5faGFuZGxlX3RleHRfY2hhbmdlLCB0aGlzKSk7XG4gICAgdGhpcy5faGFuZGxlX3RleHRfY2hhbmdlKCk7XG59O1xudXRpbHMuaW5oZXJpdChMaW5lTnVtYmVyc1JlbmRlcmVyLCByZW5kZXJlci5SZW5kZXJlckJhc2UpO1xuXG4vKipcbiAqIEhhbmRsZXMgcmVuZGVyaW5nXG4gKiBPbmx5IHJlLXJlbmRlciB3aGVuIHNjcm9sbGVkIHZlcnRpY2FsbHkuXG4gKi9cbkxpbmVOdW1iZXJzUmVuZGVyZXIucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKHNjcm9sbCkge1xuICAgIHZhciB0b3AgPSB0aGlzLl9ndXR0ZXIucG9zdGVyLmNhbnZhcy5zY3JvbGxfdG9wO1xuICAgIGlmICh0aGlzLl90b3AgPT09IG51bGwgfHwgdGhpcy5fdG9wICE9PSB0b3ApIHtcbiAgICAgICAgdGhpcy5fdG9wID0gdG9wO1xuICAgICAgICB0aGlzLl9yZW5kZXIoKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFJlbmRlcnMgdGhlIGxpbmUgbnVtYmVyc1xuICovXG5MaW5lTnVtYmVyc1JlbmRlcmVyLnByb3RvdHlwZS5fcmVuZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gTWVhc3VyZSB0aGUgd2lkdGggb2YgbnVtZXJpY2FsIGNoYXJhY3RlcnMgaWYgbm90IGRvbmUgeWV0LlxuICAgIGlmICh0aGlzLl9jaGFyYWN0ZXJfd2lkdGg9PT1udWxsKSB7XG4gICAgICAgIHRoaXMuX2NoYXJhY3Rlcl93aWR0aCA9IHRoaXMuX3RleHRfY2FudmFzLm1lYXN1cmVfdGV4dCgnMDEyMzQ1Njc4OScsIHtcbiAgICAgICAgICAgIGZvbnRfZmFtaWx5OiAnbW9ub3NwYWNlJyxcbiAgICAgICAgICAgIGZvbnRfc2l6ZTogMTQsXG4gICAgICAgIH0pIC8gMTAuMDtcbiAgICAgICAgdGhpcy5faGFuZGxlX3RleHRfY2hhbmdlKCk7XG4gICAgfVxuXG4gICAgLy8gVXBkYXRlIHRoZSB0ZXh0IGJ1ZmZlciBpZiBuZWVkZWQuXG4gICAgdmFyIHRvcF9yb3cgPSB0aGlzLl9yb3dfcmVuZGVyZXIuZ2V0X3Jvd19jaGFyKDAsIHRoaXMuX3RvcCkucm93X2luZGV4O1xuICAgIHZhciBsaW5lcyA9IHRoaXMuX3BsdWdpbi5wb3N0ZXIubW9kZWwuX3Jvd3MubGVuZ3RoO1xuICAgIGlmICh0aGlzLl90b3Bfcm93ICE9PSB0b3Bfcm93KSB7XG4gICAgICAgIHRoaXMuX2xhc3Rfcm93X2NvdW50ID0gbGluZXM7XG4gICAgICAgIHZhciBsYXN0X3RvcF9yb3cgPSB0aGlzLl90b3Bfcm93O1xuICAgICAgICB0aGlzLl90b3Bfcm93ID0gdG9wX3JvdztcbiAgICAgICAgXG4gICAgICAgIC8vIFJlY3ljbGUgcm93cyBpZiBwb3NzaWJsZS5cbiAgICAgICAgdmFyIHJvd19zY3JvbGwgPSB0aGlzLl90b3Bfcm93IC0gbGFzdF90b3Bfcm93O1xuICAgICAgICB2YXIgcm93X2RlbHRhID0gTWF0aC5hYnMocm93X3Njcm9sbCk7XG4gICAgICAgIGlmICh0aGlzLl90b3Bfcm93ICE9PSBudWxsICYmIHJvd19kZWx0YSA8IHRoaXMuX3Zpc2libGVfcm93X2NvdW50KSB7XG5cbiAgICAgICAgICAgIC8vIEdldCBhIHNuYXBzaG90IG9mIHRoZSB0ZXh0IGJlZm9yZSB0aGUgc2Nyb2xsLlxuICAgICAgICAgICAgdGhpcy5fdG1wX2NhbnZhcy5jbGVhcigpO1xuICAgICAgICAgICAgdGhpcy5fdG1wX2NhbnZhcy5kcmF3X2ltYWdlKHRoaXMuX3RleHRfY2FudmFzLCAwLCAwKTtcblxuICAgICAgICAgICAgLy8gUmVuZGVyIHRoZSBuZXcgcm93cy5cbiAgICAgICAgICAgIHRoaXMuX3RleHRfY2FudmFzLmNsZWFyKCk7XG4gICAgICAgICAgICBpZiAodGhpcy5fdG9wX3JvdyA8IGxhc3RfdG9wX3Jvdykge1xuICAgICAgICAgICAgICAgIC8vIFNjcm9sbGVkIHVwIHRoZSBkb2N1bWVudCAodGhlIHNjcm9sbGJhciBtb3ZlZCB1cCwgcGFnZSBkb3duKVxuICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlcl9yb3dzKHRoaXMuX3RvcF9yb3csIHJvd19kZWx0YSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFNjcm9sbGVkIGRvd24gdGhlIGRvY3VtZW50ICh0aGUgc2Nyb2xsYmFyIG1vdmVkIGRvd24sIHBhZ2UgdXApXG4gICAgICAgICAgICAgICAgdGhpcy5fcmVuZGVyX3Jvd3ModGhpcy5fdG9wX3JvdyArIHRoaXMuX3Zpc2libGVfcm93X2NvdW50IC0gcm93X2RlbHRhLCByb3dfZGVsdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVc2UgdGhlIG9sZCBjb250ZW50IHRvIGZpbGwgaW4gdGhlIHJlc3QuXG4gICAgICAgICAgICB0aGlzLl90ZXh0X2NhbnZhcy5kcmF3X2ltYWdlKHRoaXMuX3RtcF9jYW52YXMsIDAsIC1yb3dfc2Nyb2xsICogdGhpcy5fcm93X2hlaWdodCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBEcmF3IGV2ZXJ5dGhpbmcuXG4gICAgICAgICAgICB0aGlzLl90ZXh0X2NhbnZhcy5jbGVhcigpO1xuICAgICAgICAgICAgdGhpcy5fcmVuZGVyX3Jvd3ModGhpcy5fdG9wX3JvdywgdGhpcy5fdmlzaWJsZV9yb3dfY291bnQpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8vIFJlbmRlciB0aGUgYnVmZmVyIGF0IHRoZSBjb3JyZWN0IG9mZnNldC5cbiAgICB0aGlzLl9jYW52YXMuY2xlYXIoKTtcbiAgICB0aGlzLl9jYW52YXMuZHJhd19pbWFnZShcbiAgICAgICAgdGhpcy5fdGV4dF9jYW52YXMsXG4gICAgICAgIDAsIFxuICAgICAgICB0aGlzLl9yb3dfcmVuZGVyZXIuZ2V0X3Jvd190b3AodGhpcy5fdG9wX3JvdykgLSB0aGlzLl9yb3dfcmVuZGVyZXIudG9wKTtcbn07XG5cbkxpbmVOdW1iZXJzUmVuZGVyZXIucHJvdG90eXBlLnJlcmVuZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gRHJhdyBldmVyeXRoaW5nLlxuICAgIHRoaXMuX2NoYXJhY3Rlcl93aWR0aCA9IG51bGw7XG4gICAgdGhpcy5fdGV4dF9jYW52YXMuZXJhc2Vfb3B0aW9uc19jYWNoZSgpO1xuICAgIHRoaXMuX3RleHRfY2FudmFzLmNsZWFyKCk7XG4gICAgdGhpcy5fcmVuZGVyX3Jvd3ModGhpcy5fdG9wX3JvdywgdGhpcy5fdmlzaWJsZV9yb3dfY291bnQpO1xuXG4gICAgLy8gUmVuZGVyIHRoZSBidWZmZXIgYXQgdGhlIGNvcnJlY3Qgb2Zmc2V0LlxuICAgIHRoaXMuX2NhbnZhcy5jbGVhcigpO1xuICAgIHRoaXMuX2NhbnZhcy5kcmF3X2ltYWdlKFxuICAgICAgICB0aGlzLl90ZXh0X2NhbnZhcyxcbiAgICAgICAgMCwgXG4gICAgICAgIHRoaXMuX3Jvd19yZW5kZXJlci5nZXRfcm93X3RvcCh0aGlzLl90b3Bfcm93KSAtIHRoaXMuX3Jvd19yZW5kZXJlci50b3ApO1xufTtcblxuLyoqXG4gKiBSZW5kZXJzIGEgc2V0IG9mIGxpbmUgbnVtYmVycy5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IHN0YXJ0X3Jvd1xuICogQHBhcmFtICB7aW50ZWdlcn0gbnVtX3Jvd3NcbiAqL1xuTGluZU51bWJlcnNSZW5kZXJlci5wcm90b3R5cGUuX3JlbmRlcl9yb3dzID0gZnVuY3Rpb24oc3RhcnRfcm93LCBudW1fcm93cykge1xuICAgIHZhciBsaW5lcyA9IHRoaXMuX3BsdWdpbi5wb3N0ZXIubW9kZWwuX3Jvd3MubGVuZ3RoO1xuICAgIGZvciAodmFyIGkgPSBzdGFydF9yb3c7IGkgPCBzdGFydF9yb3cgKyBudW1fcm93czsgaSsrKSB7XG4gICAgICAgIGlmIChpIDwgbGluZXMpIHtcbiAgICAgICAgICAgIHZhciB5ID0gKGkgLSB0aGlzLl90b3Bfcm93KSAqIHRoaXMuX3Jvd19oZWlnaHQ7XG4gICAgICAgICAgICBpZiAodGhpcy5fcGx1Z2luLnBvc3Rlci5jb25maWcuaGlnaGxpZ2h0X2RyYXcpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl90ZXh0X2NhbnZhcy5kcmF3X3JlY3RhbmdsZSgwLCB5LCB0aGlzLl90ZXh0X2NhbnZhcy53aWR0aCwgdGhpcy5fcm93X2hlaWdodCwge1xuICAgICAgICAgICAgICAgICAgICBmaWxsX2NvbG9yOiB1dGlscy5yYW5kb21fY29sb3IoKSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5fdGV4dF9jYW52YXMuZHJhd190ZXh0KDEwLCB5LCBTdHJpbmcoaSsxKSwge1xuICAgICAgICAgICAgICAgIGZvbnRfZmFtaWx5OiAnbW9ub3NwYWNlJyxcbiAgICAgICAgICAgICAgICBmb250X3NpemU6IDE0LFxuICAgICAgICAgICAgICAgIGNvbG9yOiB0aGlzLl9wbHVnaW4ucG9zdGVyLnN0eWxlLmd1dHRlcl90ZXh0IHx8ICdibGFjaycsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxufTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gdGhlIG51bWJlciBvZiBsaW5lcyBpbiB0aGUgZWRpdG9yIGNoYW5nZXMuXG4gKi9cbkxpbmVOdW1iZXJzUmVuZGVyZXIucHJvdG90eXBlLl9oYW5kbGVfdGV4dF9jaGFuZ2UgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgbGluZXMgPSB0aGlzLl9wbHVnaW4ucG9zdGVyLm1vZGVsLl9yb3dzLmxlbmd0aDtcbiAgICB2YXIgZGlnaXRfd2lkdGggPSBNYXRoLm1heCgyLCBNYXRoLmNlaWwoTWF0aC5sb2cxMChsaW5lcysxKSkgKyAxKTtcbiAgICB2YXIgY2hhcl93aWR0aCA9IHRoaXMuX2NoYXJhY3Rlcl93aWR0aCB8fCAxMC4wO1xuICAgIHRoaXMuX2d1dHRlci5ndXR0ZXJfd2lkdGggPSBkaWdpdF93aWR0aCAqIGNoYXJfd2lkdGggKyA4LjA7XG5cbiAgICBpZiAobGluZXMgIT09IHRoaXMuX2xhc3Rfcm93X2NvdW50KSB7XG4gICAgICAgIHRoaXMucmVyZW5kZXIoKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2VkJyk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gdGhlIGd1dHRlciBpcyByZXNpemVkXG4gKi9cbkxpbmVOdW1iZXJzUmVuZGVyZXIucHJvdG90eXBlLl9ndXR0ZXJfcmVzaXplID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fdGV4dF9jYW52YXMud2lkdGggPSB0aGlzLl9ndXR0ZXIuZ3V0dGVyX3dpZHRoO1xuICAgIHRoaXMuX3RtcF9jYW52YXMud2lkdGggPSB0aGlzLl9ndXR0ZXIuZ3V0dGVyX3dpZHRoOyBcbiAgICB0aGlzLnJlcmVuZGVyKCk7XG4gICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2VkJyk7XG59O1xuXG4vKipcbiAqIFVucmVnaXN0ZXIgdGhlIGV2ZW50IGxpc3RlbmVyc1xuICogQHBhcmFtICB7UG9zdGVyfSBwb3N0ZXJcbiAqIEBwYXJhbSAge0d1dHRlcn0gZ3V0dGVyXG4gKi9cbkxpbmVOdW1iZXJzUmVuZGVyZXIucHJvdG90eXBlLnVucmVnaXN0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9ndXR0ZXIub2ZmKCdjaGFuZ2VkJywgdGhpcy5fcmVuZGVyKTtcbn07XG5cbmV4cG9ydHMuTGluZU51bWJlcnNSZW5kZXJlciA9IExpbmVOdW1iZXJzUmVuZGVyZXI7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpO1xudmFyIHBsdWdpbmJhc2UgPSByZXF1aXJlKCcuL3BsdWdpbi5qcycpO1xudmFyIGd1dHRlciA9IHJlcXVpcmUoJy4vZ3V0dGVyL2d1dHRlci5qcycpO1xudmFyIGxpbmVudW1iZXJzID0gcmVxdWlyZSgnLi9saW5lbnVtYmVycy9saW5lbnVtYmVycy5qcycpO1xuXG4vKipcbiAqIFBsdWdpbiBtYW5hZ2VyIGNsYXNzXG4gKi9cbnZhciBQbHVnaW5NYW5hZ2VyID0gZnVuY3Rpb24ocG9zdGVyKSB7XG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzKTtcbiAgICB0aGlzLl9wb3N0ZXIgPSBwb3N0ZXI7XG5cbiAgICAvLyBQb3B1bGF0ZSBidWlsdC1pbiBwbHVnaW4gbGlzdC5cbiAgICB0aGlzLl9pbnRlcm5hbF9wbHVnaW5zID0ge307XG4gICAgdGhpcy5faW50ZXJuYWxfcGx1Z2lucy5ndXR0ZXIgPSBndXR0ZXIuR3V0dGVyO1xuICAgIHRoaXMuX2ludGVybmFsX3BsdWdpbnMubGluZW51bWJlcnMgPSBsaW5lbnVtYmVycy5MaW5lTnVtYmVycztcblxuICAgIC8vIFByb3BlcnRpZXNcbiAgICB0aGlzLl9wbHVnaW5zID0gW107XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMucHJvcGVydHkoJ3BsdWdpbnMnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIFtdLmNvbmNhdCh0aGF0Ll9wbHVnaW5zKTtcbiAgICB9KTtcbn07XG51dGlscy5pbmhlcml0KFBsdWdpbk1hbmFnZXIsIHV0aWxzLlBvc3RlckNsYXNzKTtcblxuLyoqXG4gKiBMb2FkcyBhIHBsdWdpblxuICogQHBhcmFtICB7c3RyaW5nIG9yIFBsdWdpbkJhc2V9IHBsdWdpblxuICogQHJldHVybnMge2Jvb2xlYW59IHN1Y2Nlc3NcbiAqL1xuUGx1Z2luTWFuYWdlci5wcm90b3R5cGUubG9hZCA9IGZ1bmN0aW9uKHBsdWdpbikge1xuICAgIGlmICghKHBsdWdpbiBpbnN0YW5jZW9mIHBsdWdpbmJhc2UuUGx1Z2luQmFzZSkpIHtcbiAgICAgICAgdmFyIHBsdWdpbl9jbGFzcyA9IHRoaXMuX2ludGVybmFsX3BsdWdpbnNbcGx1Z2luXTtcbiAgICAgICAgaWYgKHBsdWdpbl9jbGFzcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBwbHVnaW4gPSBuZXcgcGx1Z2luX2NsYXNzKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocGx1Z2luIGluc3RhbmNlb2YgcGx1Z2luYmFzZS5QbHVnaW5CYXNlKSB7XG4gICAgICAgIHRoaXMuX3BsdWdpbnMucHVzaChwbHVnaW4pO1xuICAgICAgICBwbHVnaW4uX2xvYWQodGhpcywgdGhpcy5fcG9zdGVyKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn07XG5cbi8qKlxuICogVW5sb2FkcyBhIHBsdWdpblxuICogQHBhcmFtICB7UGx1Z2luQmFzZX0gcGx1Z2luXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gc3VjY2Vzc1xuICovXG5QbHVnaW5NYW5hZ2VyLnByb3RvdHlwZS51bmxvYWQgPSBmdW5jdGlvbihwbHVnaW4pIHtcbiAgICB2YXIgaW5kZXggPSB0aGlzLl9wbHVnaW5zLmluZGV4T2YocGx1Z2luKTtcbiAgICBpZiAoaW5kZXggIT0gLTEpIHtcbiAgICAgICAgdGhpcy5fcGx1Z2lucy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICBwbHVnaW4uX3VubG9hZCgpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBGaW5kcyB0aGUgaW5zdGFuY2Ugb2YgYSBwbHVnaW4uXG4gKiBAcGFyYW0gIHtzdHJpbmcgb3IgdHlwZX0gcGx1Z2luX2NsYXNzIC0gbmFtZSBvZiBpbnRlcm5hbCBwbHVnaW4gb3IgcGx1Z2luIGNsYXNzXG4gKiBAcmV0dXJuIHthcnJheX0gb2YgcGx1Z2luIGluc3RhbmNlc1xuICovXG5QbHVnaW5NYW5hZ2VyLnByb3RvdHlwZS5maW5kID0gZnVuY3Rpb24ocGx1Z2luX2NsYXNzKSB7XG4gICAgaWYgKHRoaXMuX2ludGVybmFsX3BsdWdpbnNbcGx1Z2luX2NsYXNzXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHBsdWdpbl9jbGFzcyA9IHRoaXMuX2ludGVybmFsX3BsdWdpbnNbcGx1Z2luX2NsYXNzXTtcbiAgICB9XG5cbiAgICB2YXIgZm91bmQgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX3BsdWdpbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKHRoaXMuX3BsdWdpbnNbaV0gaW5zdGFuY2VvZiBwbHVnaW5fY2xhc3MpIHtcbiAgICAgICAgICAgIGZvdW5kLnB1c2godGhpcy5fcGx1Z2luc1tpXSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZvdW5kO1xufTtcblxuZXhwb3J0cy5QbHVnaW5NYW5hZ2VyID0gUGx1Z2luTWFuYWdlcjtcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJyk7XG5cbi8qKlxuICogUGx1Z2luIGJhc2UgY2xhc3NcbiAqL1xudmFyIFBsdWdpbkJhc2UgPSBmdW5jdGlvbigpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX3JlbmRlcmVycyA9IFtdO1xuICAgIHRoaXMubG9hZGVkID0gZmFsc2U7XG5cbiAgICAvLyBQcm9wZXJ0aWVzXG4gICAgdGhpcy5fcG9zdGVyID0gbnVsbDtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhpcy5wcm9wZXJ0eSgncG9zdGVyJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9wb3N0ZXI7XG4gICAgfSk7XG59O1xudXRpbHMuaW5oZXJpdChQbHVnaW5CYXNlLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8qKlxuICogTG9hZHMgdGhlIHBsdWdpblxuICovXG5QbHVnaW5CYXNlLnByb3RvdHlwZS5fbG9hZCA9IGZ1bmN0aW9uKG1hbmFnZXIsIHBvc3Rlcikge1xuICAgIHRoaXMuX3Bvc3RlciA9IHBvc3RlcjtcbiAgICB0aGlzLl9tYW5hZ2VyID0gbWFuYWdlcjtcbiAgICB0aGlzLmxvYWRlZCA9IHRydWU7XG5cbiAgICB0aGlzLnRyaWdnZXIoJ2xvYWQnKTtcbn07XG5cbi8qKlxuICogVW5sb2FkcyB0aGlzIHBsdWdpblxuICovXG5QbHVnaW5CYXNlLnByb3RvdHlwZS51bmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9tYW5hZ2VyLnVubG9hZCh0aGlzKTtcbn07XG5cbi8qKlxuICogVHJpZ2dlciB1bmxvYWQgZXZlbnRcbiAqL1xuUGx1Z2luQmFzZS5wcm90b3R5cGUuX3VubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIFVucmVnaXN0ZXIgYWxsIHJlbmRlcmVycy5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX3JlbmRlcmVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICB0aGlzLl91bnJlZ2lzdGVyX3JlbmRlcmVyKHRoaXMuX3JlbmRlcmVyc1tpXSk7XG4gICAgfVxuICAgIHRoaXMubG9hZGVkID0gZmFsc2U7XG4gICAgdGhpcy50cmlnZ2VyKCd1bmxvYWQnKTtcbn07XG5cbi8qKlxuICogUmVnaXN0ZXJzIGEgcmVuZGVyZXJcbiAqIEBwYXJhbSAge1JlbmRlcmVyQmFzZX0gcmVuZGVyZXJcbiAqL1xuUGx1Z2luQmFzZS5wcm90b3R5cGUucmVnaXN0ZXJfcmVuZGVyZXIgPSBmdW5jdGlvbihyZW5kZXJlcikge1xuICAgIHRoaXMuX3JlbmRlcmVycy5wdXNoKHJlbmRlcmVyKTtcbiAgICB0aGlzLnBvc3Rlci52aWV3LmFkZF9yZW5kZXJlcihyZW5kZXJlcik7XG59O1xuXG4vKipcbiAqIFVucmVnaXN0ZXJzIGEgcmVuZGVyZXIgYW5kIHJlbW92ZXMgaXQgZnJvbSB0aGUgaW50ZXJuYWwgbGlzdC5cbiAqIEBwYXJhbSAge1JlbmRlcmVyQmFzZX0gcmVuZGVyZXJcbiAqL1xuUGx1Z2luQmFzZS5wcm90b3R5cGUudW5yZWdpc3Rlcl9yZW5kZXJlciA9IGZ1bmN0aW9uKHJlbmRlcmVyKSB7XG4gICAgdmFyIGluZGV4ID0gdGhpcy5fcmVuZGVyZXJzLmluZGV4T2YocmVuZGVyZXIpO1xuICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgICAgdGhpcy5fcmVuZGVyZXJzLnNwbGljZShpbmRleCwgMSk7XG4gICAgfVxuXG4gICAgdGhpcy5fdW5yZWdpc3Rlcl9yZW5kZXJlcihyZW5kZXJlcik7XG59O1xuXG4vKipcbiAqIFVucmVnaXN0ZXJzIGEgcmVuZGVyZXJcbiAqIEBwYXJhbSAge1JlbmRlcmVyQmFzZX0gcmVuZGVyZXJcbiAqL1xuUGx1Z2luQmFzZS5wcm90b3R5cGUuX3VucmVnaXN0ZXJfcmVuZGVyZXIgPSBmdW5jdGlvbihyZW5kZXJlcikge1xuICAgIHRoaXMucG9zdGVyLnZpZXcucmVtb3ZlX3JlbmRlcmVyKHJlbmRlcmVyKTtcbn07XG5cbmV4cG9ydHMuUGx1Z2luQmFzZSA9IFBsdWdpbkJhc2U7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpO1xudmFyIHJlbmRlcmVyID0gcmVxdWlyZSgnLi9yZW5kZXJlci5qcycpO1xudmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4uL2NvbmZpZy5qcycpO1xuY29uZmlnID0gY29uZmlnLmNvbmZpZztcblxuLyoqXG4gKiBHcm91cHMgbXVsdGlwbGUgcmVuZGVyZXJzXG4gKiBAcGFyYW0ge2FycmF5fSByZW5kZXJlcnMgLSBhcnJheSBvZiByZW5kZXJlcnNcbiAqIEBwYXJhbSB7Q2FudmFzfSBjYW52YXNcbiAqL1xudmFyIEJhdGNoUmVuZGVyZXIgPSBmdW5jdGlvbihyZW5kZXJlcnMsIGNhbnZhcykge1xuICAgIHJlbmRlcmVyLlJlbmRlcmVyQmFzZS5jYWxsKHRoaXMsIGNhbnZhcyk7XG4gICAgdGhpcy5fcmVuZGVyX2xvY2sgPSBmYWxzZTtcbiAgICB0aGlzLl9yZW5kZXJlcnMgPSByZW5kZXJlcnM7XG5cbiAgICAvLyBMaXN0ZW4gdG8gdGhlIGxheWVycywgaWYgb25lIGxheWVyIGNoYW5nZXMsIHJlY29tcG9zZVxuICAgIC8vIHRoZSBmdWxsIGltYWdlIGJ5IGNvcHlpbmcgdGhlbSBhbGwgYWdhaW4uXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMuX3JlbmRlcmVycy5mb3JFYWNoKGZ1bmN0aW9uKHJlbmRlcmVyKSB7XG4gICAgICAgIHJlbmRlcmVyLm9uKCdjaGFuZ2VkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgcmVuZGVyZWRfcmVnaW9uID0gcmVuZGVyZXIuX2NhbnZhcy5yZW5kZXJlZF9yZWdpb247XG4gICAgICAgICAgICB0aGF0Ll9jb3B5X3JlbmRlcmVycyhyZW5kZXJlZF9yZWdpb24pO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICBcbiAgICAvLyBDcmVhdGUgcHJvcGVydGllcy5cbiAgICB0aGlzLnByb3BlcnR5KCd3aWR0aCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fY2FudmFzLndpZHRoO1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy53aWR0aCA9IHZhbHVlO1xuICAgICAgICB0aGF0Ll9yZW5kZXJlcnMuZm9yRWFjaChmdW5jdGlvbihyZW5kZXJlcikge1xuICAgICAgICAgICAgcmVuZGVyZXIud2lkdGggPSB2YWx1ZTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgnaGVpZ2h0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMuaGVpZ2h0O1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy5oZWlnaHQgPSB2YWx1ZTtcbiAgICAgICAgdGhhdC5fcmVuZGVyZXJzLmZvckVhY2goZnVuY3Rpb24ocmVuZGVyZXIpIHtcbiAgICAgICAgICAgIHJlbmRlcmVyLmhlaWdodCA9IHZhbHVlO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn07XG51dGlscy5pbmhlcml0KEJhdGNoUmVuZGVyZXIsIHJlbmRlcmVyLlJlbmRlcmVyQmFzZSk7XG5cbi8qKlxuICogQWRkcyBhIHJlbmRlcmVyXG4gKi9cbkJhdGNoUmVuZGVyZXIucHJvdG90eXBlLmFkZF9yZW5kZXJlciA9IGZ1bmN0aW9uKHJlbmRlcmVyKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMuX3JlbmRlcmVycy5wdXNoKHJlbmRlcmVyKTtcbiAgICByZW5kZXJlci5vbignY2hhbmdlZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmVuZGVyZWRfcmVnaW9uID0gcmVuZGVyZXIuX2NhbnZhcy5yZW5kZXJlZF9yZWdpb247XG4gICAgICAgIHRoYXQuX2NvcHlfcmVuZGVyZXJzKHJlbmRlcmVkX3JlZ2lvbik7XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgYSByZW5kZXJlclxuICovXG5CYXRjaFJlbmRlcmVyLnByb3RvdHlwZS5yZW1vdmVfcmVuZGVyZXIgPSBmdW5jdGlvbihyZW5kZXJlcikge1xuICAgIHZhciBpbmRleCA9IHRoaXMuX3JlbmRlcmVycy5pbmRleE9mKHJlbmRlcmVyKTtcbiAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICAgIHRoaXMuX3JlbmRlcmVycy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICByZW5kZXJlci5vZmYoJ2NoYW5nZWQnKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFJlbmRlciB0byB0aGUgY2FudmFzXG4gKiBAcGFyYW0ge2RpY3Rpb25hcnl9IChvcHRpb25hbCkgc2Nyb2xsIC0gSG93IG11Y2ggdGhlIGNhbnZhcyB3YXMgc2Nyb2xsZWQuICBUaGlzXG4gKiAgICAgICAgICAgICAgICAgICAgIGlzIGEgZGljdGlvbmFyeSBvZiB0aGUgZm9ybSB7eDogZmxvYXQsIHk6IGZsb2F0fVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQmF0Y2hSZW5kZXJlci5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oc2Nyb2xsKSB7XG4gICAgaWYgKCF0aGlzLl9yZW5kZXJfbG9jaykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5fcmVuZGVyX2xvY2sgPSB0cnVlO1xuXG4gICAgICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgICAgICB0aGlzLl9yZW5kZXJlcnMuZm9yRWFjaChmdW5jdGlvbihyZW5kZXJlcikge1xuXG4gICAgICAgICAgICAgICAgLy8gQXBwbHkgdGhlIHJlbmRlcmluZyBjb29yZGluYXRlIHRyYW5zZm9ybXMgb2YgdGhlIHBhcmVudC5cbiAgICAgICAgICAgICAgICBpZiAoIXJlbmRlcmVyLm9wdGlvbnMucGFyZW50X2luZGVwZW5kZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHJlbmRlcmVyLl9jYW52YXMuX3R4ID0gdXRpbHMucHJveHkodGhhdC5fY2FudmFzLl90eCwgdGhhdC5fY2FudmFzKTtcbiAgICAgICAgICAgICAgICAgICAgcmVuZGVyZXIuX2NhbnZhcy5fdHkgPSB1dGlscy5wcm94eSh0aGF0Ll9jYW52YXMuX3R5LCB0aGF0Ll9jYW52YXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBUZWxsIGVhY2ggcmVuZGVyZXIgdG8gcmVuZGVyIGFuZCBrZWVwIHRyYWNrIG9mIHRoZSByZWdpb25cbiAgICAgICAgICAgIC8vIHRoYXQgaGFzIGZyZXNobHkgcmVuZGVyZWQgY29udGVudHMuXG4gICAgICAgICAgICB2YXIgcmVuZGVyZWRfcmVnaW9uID0gbnVsbDtcbiAgICAgICAgICAgIHRoaXMuX3JlbmRlcmVycy5mb3JFYWNoKGZ1bmN0aW9uKHJlbmRlcmVyKSB7XG4gICAgICAgICAgICAgICAgIC8vIFRlbGwgdGhlIHJlbmRlcmVyIHRvIHJlbmRlciBpdHNlbGYuXG4gICAgICAgICAgICAgICAgcmVuZGVyZXIucmVuZGVyKHNjcm9sbCk7XG5cbiAgICAgICAgICAgICAgICB2YXIgbmV3X3JlZ2lvbiA9IHJlbmRlcmVyLl9jYW52YXMucmVuZGVyZWRfcmVnaW9uO1xuICAgICAgICAgICAgICAgIGlmIChyZW5kZXJlZF9yZWdpb249PT1udWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlbmRlcmVkX3JlZ2lvbiA9IG5ld19yZWdpb247XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChuZXdfcmVnaW9uICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBDYWxjdWxhdGUgdGhlIHN1bSBvZiB0aGUgdHdvIGRpcnR5IHJlZ2lvbnMuXG4gICAgICAgICAgICAgICAgICAgIHZhciB4MSA9IHJlbmRlcmVkX3JlZ2lvbi54O1xuICAgICAgICAgICAgICAgICAgICB2YXIgeDIgPSByZW5kZXJlZF9yZWdpb24ueCArIHJlbmRlcmVkX3JlZ2lvbi53aWR0aDtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHkxID0gcmVuZGVyZWRfcmVnaW9uLnk7XG4gICAgICAgICAgICAgICAgICAgIHZhciB5MiA9IHJlbmRlcmVkX3JlZ2lvbi55ICsgcmVuZGVyZWRfcmVnaW9uLmhlaWdodDtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHgxID0gTWF0aC5taW4oeDEsIG5ld19yZWdpb24ueCk7XG4gICAgICAgICAgICAgICAgICAgIHgyID0gTWF0aC5tYXgoeDIsIG5ld19yZWdpb24ueCArIG5ld19yZWdpb24ud2lkdGgpO1xuICAgICAgICAgICAgICAgICAgICB5MSA9IE1hdGgubWluKHkxLCBuZXdfcmVnaW9uLnkpO1xuICAgICAgICAgICAgICAgICAgICB5MiA9IE1hdGgubWF4KHkyLCBuZXdfcmVnaW9uLnkgKyBuZXdfcmVnaW9uLmhlaWdodCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICByZW5kZXJlZF9yZWdpb24ueCA9IHgxO1xuICAgICAgICAgICAgICAgICAgICByZW5kZXJlZF9yZWdpb24ueSA9IHkxO1xuICAgICAgICAgICAgICAgICAgICByZW5kZXJlZF9yZWdpb24ud2lkdGggPSB4MiAtIHgxO1xuICAgICAgICAgICAgICAgICAgICByZW5kZXJlZF9yZWdpb24uaGVpZ2h0ID0geTIgLSB5MTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gQ29weSB0aGUgcmVzdWx0cyB0byBzZWxmLlxuICAgICAgICAgICAgdGhpcy5fY29weV9yZW5kZXJlcnMocmVuZGVyZWRfcmVnaW9uKTtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIHRoaXMuX3JlbmRlcl9sb2NrID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vKipcbiAqIENvcGllcyBhbGwgdGhlIHJlbmRlcmVyIGxheWVycyB0byB0aGUgY2FudmFzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQmF0Y2hSZW5kZXJlci5wcm90b3R5cGUuX2NvcHlfcmVuZGVyZXJzID0gZnVuY3Rpb24ocmVnaW9uKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMuX2NhbnZhcy5jbGVhcihyZWdpb24pO1xuICAgIHRoaXMuX3JlbmRlcmVycy5mb3JFYWNoKGZ1bmN0aW9uKHJlbmRlcmVyKSB7XG4gICAgICAgIHRoYXQuX2NvcHlfcmVuZGVyZXIocmVuZGVyZXIsIHJlZ2lvbik7XG4gICAgfSk7XG5cbiAgICAvLyBEZWJ1ZywgaGlnbGlnaHQgYmxpdCByZWdpb24uXG4gICAgaWYgKHJlZ2lvbiAmJiBjb25maWcuaGlnaGxpZ2h0X2JsaXQpIHtcbiAgICAgICAgdGhpcy5fY2FudmFzLmRyYXdfcmVjdGFuZ2xlKHJlZ2lvbi54LCByZWdpb24ueSwgcmVnaW9uLndpZHRoLCByZWdpb24uaGVpZ2h0LCB7Y29sb3I6IHV0aWxzLnJhbmRvbV9jb2xvcigpfSk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBDb3B5IGEgcmVuZGVyZXIgdG8gdGhlIGNhbnZhcy5cbiAqIEBwYXJhbSAge1JlbmRlcmVyQmFzZX0gcmVuZGVyZXJcbiAqIEBwYXJhbSAge29iamVjdH0gKG9wdGlvbmFsKSByZWdpb24gXG4gKi9cbkJhdGNoUmVuZGVyZXIucHJvdG90eXBlLl9jb3B5X3JlbmRlcmVyID0gZnVuY3Rpb24ocmVuZGVyZXIsIHJlZ2lvbikge1xuICAgIGlmIChyZWdpb24pIHtcblxuICAgICAgICAvLyBDb3B5IGEgcmVnaW9uLlxuICAgICAgICB0aGlzLl9jYW52YXMuZHJhd19pbWFnZShcbiAgICAgICAgICAgIHJlbmRlcmVyLl9jYW52YXMsIFxuICAgICAgICAgICAgcmVnaW9uLngsIHJlZ2lvbi55LCByZWdpb24ud2lkdGgsIHJlZ2lvbi5oZWlnaHQsXG4gICAgICAgICAgICByZWdpb24pO1xuXG4gICAgfSBlbHNlIHtcblxuICAgICAgICAvLyBDb3B5IHRoZSBlbnRpcmUgaW1hZ2UuXG4gICAgICAgIHRoaXMuX2NhbnZhcy5kcmF3X2ltYWdlKFxuICAgICAgICAgICAgcmVuZGVyZXIuX2NhbnZhcywgXG4gICAgICAgICAgICB0aGlzLmxlZnQsIFxuICAgICAgICAgICAgdGhpcy50b3AsIFxuICAgICAgICAgICAgdGhpcy5fY2FudmFzLndpZHRoLCBcbiAgICAgICAgICAgIHRoaXMuX2NhbnZhcy5oZWlnaHQpOyAgIFxuICAgIH1cbn07XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuQmF0Y2hSZW5kZXJlciA9IEJhdGNoUmVuZGVyZXI7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpO1xudmFyIHJlbmRlcmVyID0gcmVxdWlyZSgnLi9yZW5kZXJlci5qcycpO1xuXG4vKipcbiAqIFJlbmRlcnMgdG8gYSBjYW52YXNcbiAqIEBwYXJhbSB7Q2FudmFzfSBkZWZhdWx0X2NhbnZhc1xuICovXG52YXIgQ29sb3JSZW5kZXJlciA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIENyZWF0ZSB3aXRoIHRoZSBvcHRpb24gJ3BhcmVudF9pbmRlcGVuZGVudCcgdG8gZGlzYWJsZVxuICAgIC8vIHBhcmVudCBjb29yZGluYXRlIHRyYW5zbGF0aW9ucyBmcm9tIGJlaW5nIGFwcGxpZWQgYnkgXG4gICAgLy8gYSBiYXRjaCByZW5kZXJlci5cbiAgICByZW5kZXJlci5SZW5kZXJlckJhc2UuY2FsbCh0aGlzLCB1bmRlZmluZWQsIHtwYXJlbnRfaW5kZXBlbmRlbnQ6IHRydWV9KTtcbiAgICB0aGlzLl9yZW5kZXJlZCA9IGZhbHNlO1xuICAgIFxuICAgIC8vIENyZWF0ZSBwcm9wZXJ0aWVzLlxuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLnByb3BlcnR5KCd3aWR0aCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fY2FudmFzLndpZHRoO1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy53aWR0aCA9IHZhbHVlO1xuICAgICAgICB0aGF0Ll9yZW5kZXIoKTtcblxuICAgICAgICAvLyBUZWxsIHBhcmVudCBsYXllciB0aGlzIG9uZSBoYXMgY2hhbmdlZC5cbiAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2VkJyk7XG4gICAgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgnaGVpZ2h0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMuaGVpZ2h0O1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy5oZWlnaHQgPSB2YWx1ZTtcbiAgICAgICAgdGhhdC5fcmVuZGVyKCk7XG5cbiAgICAgICAgLy8gVGVsbCBwYXJlbnQgbGF5ZXIgdGhpcyBvbmUgaGFzIGNoYW5nZWQuXG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgIH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ2NvbG9yJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9jb2xvcjtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Ll9jb2xvciA9IHZhbHVlO1xuICAgICAgICB0aGF0Ll9yZW5kZXIoKTtcblxuICAgICAgICAvLyBUZWxsIHBhcmVudCBsYXllciB0aGlzIG9uZSBoYXMgY2hhbmdlZC5cbiAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2VkJyk7XG4gICAgfSk7XG59O1xudXRpbHMuaW5oZXJpdChDb2xvclJlbmRlcmVyLCByZW5kZXJlci5SZW5kZXJlckJhc2UpO1xuXG4vKipcbiAqIFJlbmRlciB0byB0aGUgY2FudmFzXG4gKiBAcGFyYW0ge2RpY3Rpb25hcnl9IChvcHRpb25hbCkgc2Nyb2xsIC0gSG93IG11Y2ggdGhlIGNhbnZhcyB3YXMgc2Nyb2xsZWQuICBUaGlzXG4gKiAgICAgICAgICAgICAgICAgICAgIGlzIGEgZGljdGlvbmFyeSBvZiB0aGUgZm9ybSB7eDogZmxvYXQsIHk6IGZsb2F0fVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ29sb3JSZW5kZXJlci5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oc2Nyb2xsKSB7XG4gICAgaWYgKCF0aGlzLl9yZW5kZXJlZCkge1xuICAgICAgICB0aGlzLl9yZW5kZXIoKTtcbiAgICAgICAgdGhpcy5fcmVuZGVyZWQgPSB0cnVlO1xuICAgIH1cbn07XG5cbi8qKlxuICogUmVuZGVyIGEgZnJhbWUuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Db2xvclJlbmRlcmVyLnByb3RvdHlwZS5fcmVuZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fY2FudmFzLmNsZWFyKCk7XG4gICAgdGhpcy5fY2FudmFzLmRyYXdfcmVjdGFuZ2xlKDAsIDAsIHRoaXMuX2NhbnZhcy53aWR0aCwgdGhpcy5fY2FudmFzLmhlaWdodCwge2ZpbGxfY29sb3I6IHRoaXMuX2NvbG9yfSk7XG59O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLkNvbG9yUmVuZGVyZXIgPSBDb2xvclJlbmRlcmVyO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIGFuaW1hdG9yID0gcmVxdWlyZSgnLi4vYW5pbWF0b3IuanMnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJyk7XG52YXIgcmVuZGVyZXIgPSByZXF1aXJlKCcuL3JlbmRlcmVyLmpzJyk7XG5cbi8qKlxuICogUmVuZGVyIGRvY3VtZW50IGN1cnNvcnNcbiAqXG4gKiBUT0RPOiBPbmx5IHJlbmRlciB2aXNpYmxlLlxuICovXG52YXIgQ3Vyc29yc1JlbmRlcmVyID0gZnVuY3Rpb24oY3Vyc29ycywgc3R5bGUsIHJvd19yZW5kZXJlciwgaGFzX2ZvY3VzKSB7XG4gICAgcmVuZGVyZXIuUmVuZGVyZXJCYXNlLmNhbGwodGhpcyk7XG4gICAgdGhpcy5zdHlsZSA9IHN0eWxlO1xuICAgIHRoaXMuX2hhc19mb2N1cyA9IGhhc19mb2N1cztcbiAgICB0aGlzLl9jdXJzb3JzID0gY3Vyc29ycztcbiAgICB0aGlzLl9sYXN0X2RyYXduX2N1cnNvcnMgPSBbXTtcblxuICAgIHRoaXMuX3Jvd19yZW5kZXJlciA9IHJvd19yZW5kZXJlcjtcbiAgICAvLyBUT0RPOiBSZW1vdmUgdGhlIGZvbGxvd2luZyBibG9jay5cbiAgICB0aGlzLl9nZXRfdmlzaWJsZV9yb3dzID0gdXRpbHMucHJveHkocm93X3JlbmRlcmVyLmdldF92aXNpYmxlX3Jvd3MsIHJvd19yZW5kZXJlcik7XG4gICAgdGhpcy5fZ2V0X3Jvd19oZWlnaHQgPSB1dGlscy5wcm94eShyb3dfcmVuZGVyZXIuZ2V0X3Jvd19oZWlnaHQsIHJvd19yZW5kZXJlcik7XG4gICAgdGhpcy5fZ2V0X3Jvd190b3AgPSB1dGlscy5wcm94eShyb3dfcmVuZGVyZXIuZ2V0X3Jvd190b3AsIHJvd19yZW5kZXJlcik7XG4gICAgdGhpcy5fbWVhc3VyZV9wYXJ0aWFsX3JvdyA9IHV0aWxzLnByb3h5KHJvd19yZW5kZXJlci5tZWFzdXJlX3BhcnRpYWxfcm93X3dpZHRoLCByb3dfcmVuZGVyZXIpO1xuICAgIFxuICAgIHRoaXMuX2JsaW5rX2FuaW1hdG9yID0gbmV3IGFuaW1hdG9yLkFuaW1hdG9yKDEwMDApO1xuICAgIHRoaXMuX2ZwcyA9IDI7XG5cbiAgICAvLyBTdGFydCB0aGUgY3Vyc29yIHJlbmRlcmluZyBjbG9jay5cbiAgICB0aGlzLl9yZW5kZXJfY2xvY2soKTtcbiAgICB0aGlzLl9sYXN0X3JlbmRlcmVkID0gbnVsbDtcblxuICAgIC8vIFdhdGNoIGZvciBjdXJzb3IgY2hhbmdlIGV2ZW50cy5cbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdmFyIHJlcmVuZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoYXQuX2JsaW5rX2FuaW1hdG9yLnJlc2V0KCk7XG4gICAgICAgIHRoYXQucmVuZGVyKCk7XG4gICAgICAgIC8vIFRlbGwgcGFyZW50IGxheWVyIHRoaXMgb25lIGhhcyBjaGFuZ2VkLlxuICAgICAgICB0aGF0LnRyaWdnZXIoJ2NoYW5nZWQnKTtcbiAgICB9O1xuICAgIHRoaXMuX2N1cnNvcnMub24oJ2NoYW5nZScsIHJlcmVuZGVyKTtcbn07XG51dGlscy5pbmhlcml0KEN1cnNvcnNSZW5kZXJlciwgcmVuZGVyZXIuUmVuZGVyZXJCYXNlKTtcblxuLyoqXG4gKiBSZW5kZXIgdG8gdGhlIGNhbnZhc1xuICogTm90ZTogVGhpcyBtZXRob2QgaXMgY2FsbGVkIG9mdGVuLCBzbyBpdCdzIGltcG9ydGFudCB0aGF0IGl0J3NcbiAqIG9wdGltaXplZCBmb3Igc3BlZWQuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3JzUmVuZGVyZXIucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKHNjcm9sbCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcblxuICAgIC8vIFJlbW92ZSB0aGUgcHJldmlvdXNseSBkcmF3biBjdXJzb3JzLCBpZiBhbnkuXG4gICAgaWYgKHNjcm9sbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuX2NhbnZhcy5jbGVhcigpO1xuICAgICAgICB1dGlscy5jbGVhcl9hcnJheSh0aGlzLl9sYXN0X2RyYXduX2N1cnNvcnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICh0aGlzLl9sYXN0X2RyYXduX2N1cnNvcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdGhpcy5fbGFzdF9kcmF3bl9jdXJzb3JzLmZvckVhY2goZnVuY3Rpb24oY3Vyc29yX2JveCkge1xuXG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIDFweCBzcGFjZSBhcm91bmQgdGhlIGN1cnNvciBib3ggdG9vIGZvciBhbnRpLWFsaWFzaW5nLlxuICAgICAgICAgICAgICAgIHRoYXQuX2NhbnZhcy5jbGVhcih7XG4gICAgICAgICAgICAgICAgICAgIHg6IGN1cnNvcl9ib3gueCAtIDEsXG4gICAgICAgICAgICAgICAgICAgIHk6IGN1cnNvcl9ib3gueSAtIDEsXG4gICAgICAgICAgICAgICAgICAgIHdpZHRoOiBjdXJzb3JfYm94LndpZHRoICsgMixcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiBjdXJzb3JfYm94LmhlaWdodCArIDIsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHV0aWxzLmNsZWFyX2FycmF5KHRoaXMuX2xhc3RfZHJhd25fY3Vyc29ycyk7XG4gICAgICAgIH0gICAgXG4gICAgfVxuICAgIFxuXG4gICAgLy8gT25seSByZW5kZXIgaWYgdGhlIGNhbnZhcyBoYXMgZm9jdXMuXG4gICAgaWYgKHRoaXMuX2hhc19mb2N1cygpICYmIHRoaXMuX2JsaW5rX2FuaW1hdG9yLnRpbWUoKSA8IDAuNSkge1xuICAgICAgICB0aGlzLl9jdXJzb3JzLmN1cnNvcnMuZm9yRWFjaChmdW5jdGlvbihjdXJzb3IpIHtcbiAgICAgICAgICAgIC8vIEdldCB0aGUgdmlzaWJsZSByb3dzLlxuICAgICAgICAgICAgdmFyIHZpc2libGVfcm93cyA9IHRoYXQuX2dldF92aXNpYmxlX3Jvd3MoKTtcblxuICAgICAgICAgICAgLy8gSWYgYSBjdXJzb3IgZG9lc24ndCBoYXZlIGEgcG9zaXRpb24sIHJlbmRlciBpdCBhdCB0aGVcbiAgICAgICAgICAgIC8vIGJlZ2lubmluZyBvZiB0aGUgZG9jdW1lbnQuXG4gICAgICAgICAgICB2YXIgcm93X2luZGV4ID0gY3Vyc29yLnByaW1hcnlfcm93IHx8IDA7XG4gICAgICAgICAgICB2YXIgY2hhcl9pbmRleCA9IGN1cnNvci5wcmltYXJ5X2NoYXIgfHwgMDtcblxuICAgICAgICAgICAgLy8gRHJhdyB0aGUgY3Vyc29yLlxuICAgICAgICAgICAgdmFyIGhlaWdodCA9IHRoYXQuX2dldF9yb3dfaGVpZ2h0KHJvd19pbmRleCk7XG4gICAgICAgICAgICB2YXIgbXVsdGlwbGllciA9IHRoYXQuc3R5bGUuY3Vyc29yX2hlaWdodCB8fCAxLjA7XG4gICAgICAgICAgICB2YXIgb2Zmc2V0ID0gKGhlaWdodCAtIChtdWx0aXBsaWVyKmhlaWdodCkpIC8gMjtcbiAgICAgICAgICAgIGhlaWdodCAqPSBtdWx0aXBsaWVyO1xuICAgICAgICAgICAgaWYgKHZpc2libGVfcm93cy50b3Bfcm93IDw9IHJvd19pbmRleCAmJiByb3dfaW5kZXggPD0gdmlzaWJsZV9yb3dzLmJvdHRvbV9yb3cpIHtcbiAgICAgICAgICAgICAgICB2YXIgY3Vyc29yX2JveCA9IHtcbiAgICAgICAgICAgICAgICAgICAgeDogY2hhcl9pbmRleCA9PT0gMCA/IHRoYXQuX3Jvd19yZW5kZXJlci5tYXJnaW5fbGVmdCA6IHRoYXQuX21lYXN1cmVfcGFydGlhbF9yb3cocm93X2luZGV4LCBjaGFyX2luZGV4KSArIHRoYXQuX3Jvd19yZW5kZXJlci5tYXJnaW5fbGVmdCxcbiAgICAgICAgICAgICAgICAgICAgeTogdGhhdC5fZ2V0X3Jvd190b3Aocm93X2luZGV4KSArIG9mZnNldCxcbiAgICAgICAgICAgICAgICAgICAgd2lkdGg6IHRoYXQuc3R5bGUuY3Vyc29yX3dpZHRoPT09dW5kZWZpbmVkID8gMS4wIDogdGhhdC5zdHlsZS5jdXJzb3Jfd2lkdGgsXG4gICAgICAgICAgICAgICAgICAgIGhlaWdodDogaGVpZ2h0LFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgdGhhdC5fbGFzdF9kcmF3bl9jdXJzb3JzLnB1c2goY3Vyc29yX2JveCk7XG5cbiAgICAgICAgICAgICAgICB0aGF0Ll9jYW52YXMuZHJhd19yZWN0YW5nbGUoXG4gICAgICAgICAgICAgICAgICAgIGN1cnNvcl9ib3gueCwgXG4gICAgICAgICAgICAgICAgICAgIGN1cnNvcl9ib3gueSwgXG4gICAgICAgICAgICAgICAgICAgIGN1cnNvcl9ib3gud2lkdGgsIFxuICAgICAgICAgICAgICAgICAgICBjdXJzb3JfYm94LmhlaWdodCwgXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbGxfY29sb3I6IHRoYXQuc3R5bGUuY3Vyc29yIHx8ICdiYWNrJyxcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9ICAgXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICB0aGlzLl9sYXN0X3JlbmRlcmVkID0gRGF0ZS5ub3coKTtcbn07XG5cbi8qKlxuICogQ2xvY2sgZm9yIHJlbmRlcmluZyB0aGUgY3Vyc29yLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yc1JlbmRlcmVyLnByb3RvdHlwZS5fcmVuZGVyX2Nsb2NrID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gSWYgdGhlIGNhbnZhcyBpcyBmb2N1c2VkLCByZWRyYXcuXG4gICAgaWYgKHRoaXMuX2hhc19mb2N1cygpKSB7XG4gICAgICAgIHZhciBmaXJzdF9yZW5kZXIgPSAhdGhpcy5fd2FzX2ZvY3VzZWQ7XG4gICAgICAgIHRoaXMuX3dhc19mb2N1c2VkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgLy8gVGVsbCBwYXJlbnQgbGF5ZXIgdGhpcyBvbmUgaGFzIGNoYW5nZWQuXG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgICAgICBpZiAoZmlyc3RfcmVuZGVyKSB0aGlzLnRyaWdnZXIoJ3RvZ2dsZScpO1xuXG4gICAgLy8gVGhlIGNhbnZhcyBpc24ndCBmb2N1c2VkLiAgSWYgdGhpcyBpcyB0aGUgZmlyc3QgdGltZVxuICAgIC8vIGl0IGhhc24ndCBiZWVuIGZvY3VzZWQsIHJlbmRlciBhZ2FpbiB3aXRob3V0IHRoZSBcbiAgICAvLyBjdXJzb3JzLlxuICAgIH0gZWxzZSBpZiAodGhpcy5fd2FzX2ZvY3VzZWQpIHtcbiAgICAgICAgdGhpcy5fd2FzX2ZvY3VzZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgLy8gVGVsbCBwYXJlbnQgbGF5ZXIgdGhpcyBvbmUgaGFzIGNoYW5nZWQuXG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ3RvZ2dsZScpO1xuICAgIH1cblxuICAgIC8vIFRpbWVyLlxuICAgIHNldFRpbWVvdXQodXRpbHMucHJveHkodGhpcy5fcmVuZGVyX2Nsb2NrLCB0aGlzKSwgMTAwMCAvIHRoaXMuX2Zwcyk7XG59O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLkN1cnNvcnNSZW5kZXJlciA9IEN1cnNvcnNSZW5kZXJlcjtcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJyk7XG52YXIgcm93ID0gcmVxdWlyZSgnLi9yb3cuanMnKTtcbnZhciBjb25maWcgPSByZXF1aXJlKCcuLi9jb25maWcuanMnKTtcbmNvbmZpZyA9IGNvbmZpZy5jb25maWc7XG5cbi8qKlxuICogUmVuZGVyIHRoZSB0ZXh0IHJvd3Mgb2YgYSBEb2N1bWVudE1vZGVsLlxuICogQHBhcmFtIHtEb2N1bWVudE1vZGVsfSBtb2RlbCBpbnN0YW5jZVxuICovXG52YXIgSGlnaGxpZ2h0ZWRSb3dSZW5kZXJlciA9IGZ1bmN0aW9uKG1vZGVsLCBzY3JvbGxpbmdfY2FudmFzLCBzdHlsZSkge1xuICAgIHJvdy5Sb3dSZW5kZXJlci5jYWxsKHRoaXMsIG1vZGVsLCBzY3JvbGxpbmdfY2FudmFzKTtcbiAgICB0aGlzLnN0eWxlID0gc3R5bGU7XG5cbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgbW9kZWwub24oJ3RhZ3NfY2hhbmdlZCcsIGZ1bmN0aW9uKHJvd3MpIHtcbiAgICAgICAgdmFyIHZpc2libGVfcm93cyA9IHRoYXQuZ2V0X3Zpc2libGVfcm93cygpO1xuICAgICAgICB2YXIgcm93X3Zpc2libGUgPSBmYWxzZTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCByb3dzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodmlzaWJsZV9yb3dzLnRvcF9yb3cgPD0gcm93c1tpXSAmJiByb3dzW2ldIDw9IHZpc2libGVfcm93cy5ib3R0b21fcm93KSB7XG4gICAgICAgICAgICAgICAgcm93X3Zpc2libGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gSWYgYXQgbGVhc3Qgb25lIG9mIHRoZSByb3dzIHdob3MgdGFncyBjaGFuZ2VkIGlzIHZpc2libGUsXG4gICAgICAgIC8vIHJlLXJlbmRlci5cbiAgICAgICAgaWYgKHJvd192aXNpYmxlKSB7XG4gICAgICAgICAgICB0aGF0LnJlbmRlcigpO1xuICAgICAgICAgICAgdGhhdC50cmlnZ2VyKCdjaGFuZ2VkJyk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG51dGlscy5pbmhlcml0KEhpZ2hsaWdodGVkUm93UmVuZGVyZXIsIHJvdy5Sb3dSZW5kZXJlcik7XG5cbi8qKlxuICogUmVuZGVyIGEgc2luZ2xlIHJvd1xuICogQHBhcmFtICB7aW50ZWdlcn0gaW5kZXhcbiAqIEBwYXJhbSAge2Zsb2F0fSB4XG4gKiBAcGFyYW0gIHtmbG9hdH0geVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuSGlnaGxpZ2h0ZWRSb3dSZW5kZXJlci5wcm90b3R5cGUuX3JlbmRlcl9yb3cgPSBmdW5jdGlvbihpbmRleCwgeCAseSkge1xuICAgIGlmIChpbmRleCA8IDAgfHwgdGhpcy5fbW9kZWwuX3Jvd3MubGVuZ3RoIDw9IGluZGV4KSByZXR1cm47XG4gICAgXG4gICAgdmFyIGdyb3VwcyA9IHRoaXMuX2dldF9ncm91cHMoaW5kZXgpO1xuICAgIHZhciBsZWZ0ID0geDtcbiAgICBmb3IgKHZhciBpPTA7IGk8Z3JvdXBzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciB3aWR0aCA9IHRoaXMuX3RleHRfY2FudmFzLm1lYXN1cmVfdGV4dChncm91cHNbaV0udGV4dCwgZ3JvdXBzW2ldLm9wdGlvbnMpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGNvbmZpZy5oaWdobGlnaHRfZHJhdykge1xuICAgICAgICAgICAgdGhpcy5fdGV4dF9jYW52YXMuZHJhd19yZWN0YW5nbGUobGVmdCwgeSwgd2lkdGgsIHRoaXMuZ2V0X3Jvd19oZWlnaHQoaSksIHtcbiAgICAgICAgICAgICAgICBmaWxsX2NvbG9yOiB1dGlscy5yYW5kb21fY29sb3IoKSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fdGV4dF9jYW52YXMuZHJhd190ZXh0KGxlZnQsIHksIGdyb3Vwc1tpXS50ZXh0LCBncm91cHNbaV0ub3B0aW9ucyk7XG4gICAgICAgIGxlZnQgKz0gd2lkdGg7XG4gICAgfVxufTtcblxuLyoqXG4gKiBHZXQgcmVuZGVyIGdyb3VwcyBmb3IgYSByb3cuXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBpbmRleCBvZiB0aGUgcm93XG4gKiBAcmV0dXJuIHthcnJheX0gYXJyYXkgb2YgcmVuZGVyaW5ncywgZWFjaCByZW5kZXJpbmcgaXMgYW4gYXJyYXkgb2ZcbiAqICAgICAgICAgICAgICAgICB0aGUgZm9ybSB7b3B0aW9ucywgdGV4dH0uXG4gKi9cbkhpZ2hsaWdodGVkUm93UmVuZGVyZXIucHJvdG90eXBlLl9nZXRfZ3JvdXBzID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICBpZiAoaW5kZXggPCAwIHx8IHRoaXMuX21vZGVsLl9yb3dzLmxlbmd0aCA8PSBpbmRleCkgcmV0dXJuO1xuXG4gICAgdmFyIHJvd190ZXh0ID0gdGhpcy5fbW9kZWwuX3Jvd3NbaW5kZXhdO1xuICAgIHZhciBncm91cHMgPSBbXTtcbiAgICB2YXIgbGFzdF9zeW50YXggPSBudWxsO1xuICAgIHZhciBjaGFyX2luZGV4ID0gMDtcbiAgICB2YXIgc3RhcnQgPSAwO1xuICAgIGZvciAoY2hhcl9pbmRleDsgY2hhcl9pbmRleDxyb3dfdGV4dC5sZW5ndGg7IGNoYXJfaW5kZXgrKykge1xuICAgICAgICB2YXIgc3ludGF4ID0gdGhpcy5fbW9kZWwuZ2V0X3RhZ192YWx1ZSgnc3ludGF4JywgaW5kZXgsIGNoYXJfaW5kZXgpO1xuICAgICAgICBpZiAoIXRoaXMuX2NvbXBhcmVfc3ludGF4KGxhc3Rfc3ludGF4LHN5bnRheCkpIHtcbiAgICAgICAgICAgIGlmIChjaGFyX2luZGV4ICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgZ3JvdXBzLnB1c2goe29wdGlvbnM6IHRoaXMuX2dldF9vcHRpb25zKGxhc3Rfc3ludGF4KSwgdGV4dDogcm93X3RleHQuc3Vic3RyaW5nKHN0YXJ0LCBjaGFyX2luZGV4KX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGFzdF9zeW50YXggPSBzeW50YXg7XG4gICAgICAgICAgICBzdGFydCA9IGNoYXJfaW5kZXg7XG4gICAgICAgIH0gICBcbiAgICB9XG4gICAgZ3JvdXBzLnB1c2goe29wdGlvbnM6IHRoaXMuX2dldF9vcHRpb25zKGxhc3Rfc3ludGF4KSwgdGV4dDogcm93X3RleHQuc3Vic3RyaW5nKHN0YXJ0KX0pO1xuXG4gICAgcmV0dXJuIGdyb3Vwcztcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhIHN0eWxlIG9wdGlvbnMgZGljdGlvbmFyeSBmcm9tIGEgc3ludGF4IHRhZy5cbiAqIEBwYXJhbSAge3N0cmluZ30gc3ludGF4XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5IaWdobGlnaHRlZFJvd1JlbmRlcmVyLnByb3RvdHlwZS5fZ2V0X29wdGlvbnMgPSBmdW5jdGlvbihzeW50YXgpIHtcbiAgICB2YXIgcmVuZGVyX29wdGlvbnMgPSB1dGlscy5zaGFsbG93X2NvcHkodGhpcy5fYmFzZV9vcHRpb25zKTtcbiAgICBcbiAgICAvLyBIaWdobGlnaHQgaWYgYSBzeXRheCBpdGVtIGFuZCBzdHlsZSBhcmUgcHJvdmlkZWQuXG4gICAgaWYgKHRoaXMuc3R5bGUpIHtcblxuICAgICAgICAvLyBJZiB0aGlzIGlzIGEgbmVzdGVkIHN5bnRheCBpdGVtLCB1c2UgdGhlIG1vc3Qgc3BlY2lmaWMgcGFydFxuICAgICAgICAvLyB3aGljaCBpcyBkZWZpbmVkIGluIHRoZSBhY3RpdmUgc3R5bGUuXG4gICAgICAgIGlmIChzeW50YXggJiYgc3ludGF4LmluZGV4T2YoJyAnKSAhPSAtMSkge1xuICAgICAgICAgICAgdmFyIHBhcnRzID0gc3ludGF4LnNwbGl0KCcgJyk7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gcGFydHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5zdHlsZVtwYXJ0c1tpXV0pIHtcbiAgICAgICAgICAgICAgICAgICAgc3ludGF4ID0gcGFydHNbaV07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFN0eWxlIGlmIHRoZSBzeW50YXggaXRlbSBpcyBkZWZpbmVkIGluIHRoZSBzdHlsZS5cbiAgICAgICAgaWYgKHN5bnRheCAmJiB0aGlzLnN0eWxlW3N5bnRheF0pIHtcbiAgICAgICAgICAgIHJlbmRlcl9vcHRpb25zLmNvbG9yID0gdGhpcy5zdHlsZVtzeW50YXhdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVuZGVyX29wdGlvbnMuY29sb3IgPSB0aGlzLnN0eWxlLnRleHQgfHwgJ2JsYWNrJztcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICByZXR1cm4gcmVuZGVyX29wdGlvbnM7XG59O1xuXG4vKipcbiAqIENvbXBhcmUgdHdvIHN5bnRheHMuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGEgLSBzeW50YXhcbiAqIEBwYXJhbSAge3N0cmluZ30gYiAtIHN5bnRheFxuICogQHJldHVybiB7Ym9vbH0gdHJ1ZSBpZiBhIGFuZCBiIGFyZSBlcXVhbFxuICovXG5IaWdobGlnaHRlZFJvd1JlbmRlcmVyLnByb3RvdHlwZS5fY29tcGFyZV9zeW50YXggPSBmdW5jdGlvbihhLCBiKSB7XG4gICAgcmV0dXJuIGEgPT09IGI7XG59O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLkhpZ2hsaWdodGVkUm93UmVuZGVyZXIgPSBIaWdobGlnaHRlZFJvd1JlbmRlcmVyO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIGNhbnZhcyA9IHJlcXVpcmUoJy4uL2NhbnZhcy5qcycpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMuanMnKTtcblxuLyoqXG4gKiBSZW5kZXJzIHRvIGEgY2FudmFzXG4gKiBAcGFyYW0ge0NhbnZhc30gZGVmYXVsdF9jYW52YXNcbiAqL1xudmFyIFJlbmRlcmVyQmFzZSA9IGZ1bmN0aW9uKGRlZmF1bHRfY2FudmFzLCBvcHRpb25zKSB7XG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzKTtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHRoaXMuX2NhbnZhcyA9IGRlZmF1bHRfY2FudmFzID8gZGVmYXVsdF9jYW52YXMgOiBuZXcgY2FudmFzLkNhbnZhcygpO1xuICAgIFxuICAgIC8vIENyZWF0ZSBwcm9wZXJ0aWVzLlxuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLnByb3BlcnR5KCd3aWR0aCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fY2FudmFzLndpZHRoO1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy53aWR0aCA9IHZhbHVlO1xuICAgIH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ2hlaWdodCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fY2FudmFzLmhlaWdodDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Ll9jYW52YXMuaGVpZ2h0ID0gdmFsdWU7XG4gICAgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgndG9wJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiAtdGhhdC5fY2FudmFzLl90eSgwKTtcbiAgICB9KTtcbiAgICB0aGlzLnByb3BlcnR5KCdsZWZ0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiAtdGhhdC5fY2FudmFzLl90eCgwKTtcbiAgICB9KTtcbn07XG51dGlscy5pbmhlcml0KFJlbmRlcmVyQmFzZSwgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vKipcbiAqIFJlbmRlciB0byB0aGUgY2FudmFzXG4gKiBAcGFyYW0ge2RpY3Rpb25hcnl9IChvcHRpb25hbCkgc2Nyb2xsIC0gSG93IG11Y2ggdGhlIGNhbnZhcyB3YXMgc2Nyb2xsZWQuICBUaGlzXG4gKiAgICAgICAgICAgICAgICAgICAgIGlzIGEgZGljdGlvbmFyeSBvZiB0aGUgZm9ybSB7eDogZmxvYXQsIHk6IGZsb2F0fVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuUmVuZGVyZXJCYXNlLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbihzY3JvbGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05vdCBpbXBsZW1lbnRlZCcpO1xufTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5SZW5kZXJlckJhc2UgPSBSZW5kZXJlckJhc2U7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgY2FudmFzID0gcmVxdWlyZSgnLi4vY2FudmFzLmpzJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpO1xudmFyIHJlbmRlcmVyID0gcmVxdWlyZSgnLi9yZW5kZXJlci5qcycpO1xuXG4vKipcbiAqIFJlbmRlciB0aGUgdGV4dCByb3dzIG9mIGEgRG9jdW1lbnRNb2RlbC5cbiAqIEBwYXJhbSB7RG9jdW1lbnRNb2RlbH0gbW9kZWwgaW5zdGFuY2VcbiAqL1xudmFyIFJvd1JlbmRlcmVyID0gZnVuY3Rpb24obW9kZWwsIHNjcm9sbGluZ19jYW52YXMpIHtcbiAgICB0aGlzLl9tb2RlbCA9IG1vZGVsO1xuICAgIHRoaXMuX3Zpc2libGVfcm93X2NvdW50ID0gMDtcblxuICAgIC8vIFNldHVwIGNhbnZhc2VzXG4gICAgdGhpcy5fdGV4dF9jYW52YXMgPSBuZXcgY2FudmFzLkNhbnZhcygpO1xuICAgIHRoaXMuX3RtcF9jYW52YXMgPSBuZXcgY2FudmFzLkNhbnZhcygpO1xuICAgIHRoaXMuX3Njcm9sbGluZ19jYW52YXMgPSBzY3JvbGxpbmdfY2FudmFzO1xuICAgIHRoaXMuX3Jvd193aWR0aF9jb3VudHMgPSB7fTsgLy8gRGljdGlvbmFyeSBvZiB3aWR0aHMgLT4gcm93IGNvdW50IFxuXG4gICAgLy8gQmFzZVxuICAgIHJlbmRlcmVyLlJlbmRlcmVyQmFzZS5jYWxsKHRoaXMpO1xuXG4gICAgLy8gU2V0IHNvbWUgYmFzaWMgcmVuZGVyaW5nIHByb3BlcnRpZXMuXG4gICAgdGhpcy5fYmFzZV9vcHRpb25zID0ge1xuICAgICAgICBmb250X2ZhbWlseTogJ21vbm9zcGFjZScsXG4gICAgICAgIGZvbnRfc2l6ZTogMTQsXG4gICAgfTtcbiAgICB0aGlzLl9saW5lX3NwYWNpbmcgPSAyO1xuXG4gICAgLy8gQ3JlYXRlIHByb3BlcnRpZXMuXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMucHJvcGVydHkoJ3dpZHRoJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMud2lkdGg7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC5fY2FudmFzLndpZHRoID0gdmFsdWU7XG4gICAgICAgIHRoYXQuX3RleHRfY2FudmFzLndpZHRoID0gdmFsdWU7XG4gICAgICAgIHRoYXQuX3RtcF9jYW52YXMud2lkdGggPSB2YWx1ZTtcbiAgICB9KTtcbiAgICB0aGlzLnByb3BlcnR5KCdoZWlnaHQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQuX2NhbnZhcy5oZWlnaHQ7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC5fY2FudmFzLmhlaWdodCA9IHZhbHVlO1xuXG4gICAgICAgIC8vIFRoZSB0ZXh0IGNhbnZhcyBzaG91bGQgYmUgdGhlIHJpZ2h0IGhlaWdodCB0byBmaXQgYWxsIG9mIHRoZSBsaW5lc1xuICAgICAgICAvLyB0aGF0IHdpbGwgYmUgcmVuZGVyZWQgaW4gdGhlIGJhc2UgY2FudmFzLiAgVGhpcyBpbmNsdWRlcyB0aGUgbGluZXNcbiAgICAgICAgLy8gdGhhdCBhcmUgcGFydGlhbGx5IHJlbmRlcmVkIGF0IHRoZSB0b3AgYW5kIGJvdHRvbSBvZiB0aGUgYmFzZSBjYW52YXMuXG4gICAgICAgIHZhciByb3dfaGVpZ2h0ID0gdGhhdC5nZXRfcm93X2hlaWdodCgpO1xuICAgICAgICB0aGF0Ll92aXNpYmxlX3Jvd19jb3VudCA9IE1hdGguY2VpbCh2YWx1ZS9yb3dfaGVpZ2h0KSArIDE7XG4gICAgICAgIHRoYXQuX3RleHRfY2FudmFzLmhlaWdodCA9IHRoYXQuX3Zpc2libGVfcm93X2NvdW50ICogcm93X2hlaWdodDtcbiAgICAgICAgdGhhdC5fdG1wX2NhbnZhcy5oZWlnaHQgPSB0aGF0Ll90ZXh0X2NhbnZhcy5oZWlnaHQ7XG4gICAgfSk7XG4gICAgdGhpcy5fbWFyZ2luX2xlZnQgPSAwO1xuICAgIHRoaXMucHJvcGVydHkoJ21hcmdpbl9sZWZ0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9tYXJnaW5fbGVmdDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGludGVybmFsIHZhbHVlLlxuICAgICAgICB2YXIgZGVsdGEgPSB2YWx1ZSAtIHRoYXQuX21hcmdpbl9sZWZ0O1xuICAgICAgICB0aGF0Ll9tYXJnaW5fbGVmdCA9IHZhbHVlO1xuXG4gICAgICAgIC8vIEludGVsbGlnZW50bHkgY2hhbmdlIHRoZSBkb2N1bWVudCdzIHdpZHRoLCB3aXRob3V0IGNhdXNpbmdcbiAgICAgICAgLy8gYSBjb21wbGV0ZSBPKE4pIHdpZHRoIHJlY2FsY3VsYXRpb24uXG4gICAgICAgIHZhciBuZXdfY291bnRzID0ge307XG4gICAgICAgIGZvciAodmFyIHdpZHRoIGluIHRoaXMuX3Jvd193aWR0aF9jb3VudHMpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9yb3dfd2lkdGhfY291bnRzLmhhc093blByb3BlcnR5KHdpZHRoKSkge1xuICAgICAgICAgICAgICAgIG5ld19jb3VudHNbd2lkdGgrZGVsdGFdID0gdGhpcy5fcm93X3dpZHRoX2NvdW50c1t3aWR0aF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fcm93X3dpZHRoX2NvdW50cyA9IG5ld19jb3VudHNcbiAgICAgICAgdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfd2lkdGggKz0gZGVsdGE7XG5cbiAgICAgICAgLy8gUmUtcmVuZGVyIHdpdGggbmV3IG1hcmdpbi5cbiAgICAgICAgdGhhdC5yZW5kZXIoKTtcbiAgICAgICAgLy8gVGVsbCBwYXJlbnQgbGF5ZXIgdGhpcyBvbmUgaGFzIGNoYW5nZWQuXG4gICAgICAgIHRoYXQudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgIH0pO1xuICAgIHRoaXMuX21hcmdpbl90b3AgPSAwO1xuICAgIHRoaXMucHJvcGVydHkoJ21hcmdpbl90b3AnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQuX21hcmdpbl90b3A7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgLy8gVXBkYXRlIHRoZSBzY3JvbGxiYXJzLlxuICAgICAgICB0aGF0Ll9zY3JvbGxpbmdfY2FudmFzLnNjcm9sbF9oZWlnaHQgKz0gdmFsdWUgLSB0aGF0Ll9tYXJnaW5fdG9wO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBpbnRlcm5hbCB2YWx1ZS5cbiAgICAgICAgdGhhdC5fbWFyZ2luX3RvcCA9IHZhbHVlO1xuXG4gICAgICAgIC8vIFJlLXJlbmRlciB3aXRoIG5ldyBtYXJnaW4uXG4gICAgICAgIHRoYXQucmVuZGVyKCk7XG4gICAgICAgIC8vIFRlbGwgcGFyZW50IGxheWVyIHRoaXMgb25lIGhhcyBjaGFuZ2VkLlxuICAgICAgICB0aGF0LnRyaWdnZXIoJ2NoYW5nZWQnKTtcbiAgICB9KTtcblxuICAgIC8vIFNldCBpbml0aWFsIGNhbnZhcyBzaXplcy4gIFRoZXNlIGxpbmVzIG1heSBsb29rIHJlZHVuZGFudCwgYnV0IGJld2FyZVxuICAgIC8vIGJlY2F1c2UgdGhleSBhY3R1YWxseSBjYXVzZSBhbiBhcHByb3ByaWF0ZSB3aWR0aCBhbmQgaGVpZ2h0IHRvIGJlIHNldCBmb3JcbiAgICAvLyB0aGUgdGV4dCBjYW52YXMgYmVjYXVzZSBvZiB0aGUgcHJvcGVydGllcyBkZWNsYXJlZCBhYm92ZS5cbiAgICB0aGlzLndpZHRoID0gdGhpcy5fY2FudmFzLndpZHRoO1xuICAgIHRoaXMuaGVpZ2h0ID0gdGhpcy5fY2FudmFzLmhlaWdodDtcblxuICAgIHRoaXMuX21vZGVsLm9uKCd0ZXh0X2NoYW5nZWQnLCB1dGlscy5wcm94eSh0aGlzLl9oYW5kbGVfdmFsdWVfY2hhbmdlZCwgdGhpcykpO1xuICAgIHRoaXMuX21vZGVsLm9uKCdyb3dzX2FkZGVkJywgdXRpbHMucHJveHkodGhpcy5faGFuZGxlX3Jvd3NfYWRkZWQsIHRoaXMpKTtcbiAgICB0aGlzLl9tb2RlbC5vbigncm93c19yZW1vdmVkJywgdXRpbHMucHJveHkodGhpcy5faGFuZGxlX3Jvd3NfcmVtb3ZlZCwgdGhpcykpO1xuICAgIHRoaXMuX21vZGVsLm9uKCdyb3dfY2hhbmdlZCcsIHV0aWxzLnByb3h5KHRoaXMuX2hhbmRsZV9yb3dfY2hhbmdlZCwgdGhpcykpOyAvLyBUT0RPOiBJbXBsZW1lbnQgbXkgZXZlbnQuXG59O1xudXRpbHMuaW5oZXJpdChSb3dSZW5kZXJlciwgcmVuZGVyZXIuUmVuZGVyZXJCYXNlKTtcblxuLyoqXG4gKiBSZW5kZXIgdG8gdGhlIGNhbnZhc1xuICogTm90ZTogVGhpcyBtZXRob2QgaXMgY2FsbGVkIG9mdGVuLCBzbyBpdCdzIGltcG9ydGFudCB0aGF0IGl0J3NcbiAqIG9wdGltaXplZCBmb3Igc3BlZWQuXG4gKiBAcGFyYW0ge2RpY3Rpb25hcnl9IChvcHRpb25hbCkgc2Nyb2xsIC0gSG93IG11Y2ggdGhlIGNhbnZhcyB3YXMgc2Nyb2xsZWQuICBUaGlzXG4gKiAgICAgICAgICAgICAgICAgICAgIGlzIGEgZGljdGlvbmFyeSBvZiB0aGUgZm9ybSB7eDogZmxvYXQsIHk6IGZsb2F0fVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuUm93UmVuZGVyZXIucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKHNjcm9sbCkge1xuXG4gICAgLy8gSWYgb25seSB0aGUgeSBheGlzIHdhcyBzY3JvbGxlZCwgYmxpdCB0aGUgZ29vZCBjb250ZW50cyBhbmQganVzdCByZW5kZXJcbiAgICAvLyB3aGF0J3MgbWlzc2luZy5cbiAgICB2YXIgcGFydGlhbF9yZWRyYXcgPSAoc2Nyb2xsICYmIHNjcm9sbC54ID09PSAwICYmIE1hdGguYWJzKHNjcm9sbC55KSA8IHRoaXMuX2NhbnZhcy5oZWlnaHQpO1xuXG4gICAgLy8gVXBkYXRlIHRoZSB0ZXh0IHJlbmRlcmluZ1xuICAgIHZhciB2aXNpYmxlX3Jvd3MgPSB0aGlzLmdldF92aXNpYmxlX3Jvd3MoKTtcbiAgICB0aGlzLl9yZW5kZXJfdGV4dF9jYW52YXMoLXRoaXMuX3Njcm9sbGluZ19jYW52YXMuc2Nyb2xsX2xlZnQrdGhpcy5fbWFyZ2luX2xlZnQsIHZpc2libGVfcm93cy50b3Bfcm93LCAhcGFydGlhbF9yZWRyYXcpO1xuXG4gICAgLy8gQ29weSB0aGUgdGV4dCBpbWFnZSB0byB0aGlzIGNhbnZhc1xuICAgIHRoaXMuX2NhbnZhcy5jbGVhcigpO1xuICAgIHRoaXMuX2NhbnZhcy5kcmF3X2ltYWdlKFxuICAgICAgICB0aGlzLl90ZXh0X2NhbnZhcywgXG4gICAgICAgIHRoaXMuX3Njcm9sbGluZ19jYW52YXMuc2Nyb2xsX2xlZnQsIFxuICAgICAgICB0aGlzLmdldF9yb3dfdG9wKHZpc2libGVfcm93cy50b3Bfcm93KSk7XG59O1xuXG4vKipcbiAqIFJlbmRlciB0ZXh0IHRvIHRoZSB0ZXh0IGNhbnZhcy5cbiAqXG4gKiBMYXRlciwgdGhlIG1haW4gcmVuZGVyaW5nIGZ1bmN0aW9uIGNhbiB1c2UgdGhpcyByZW5kZXJlZCB0ZXh0IHRvIGRyYXcgdGhlXG4gKiBiYXNlIGNhbnZhcy5cbiAqIEBwYXJhbSAge2Zsb2F0fSB4X29mZnNldCAtIGhvcml6b250YWwgb2Zmc2V0IG9mIHRoZSB0ZXh0XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSB0b3Bfcm93XG4gKiBAcGFyYW0gIHtib29sZWFufSBmb3JjZV9yZWRyYXcgLSByZWRyYXcgdGhlIGNvbnRlbnRzIGV2ZW4gaWYgdGhleSBhcmVcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGUgc2FtZSBhcyB0aGUgY2FjaGVkIGNvbnRlbnRzLlxuICogQHJldHVybiB7bnVsbH0gICAgICAgICAgXG4gKi9cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5fcmVuZGVyX3RleHRfY2FudmFzID0gZnVuY3Rpb24oeF9vZmZzZXQsIHRvcF9yb3csIGZvcmNlX3JlZHJhdykge1xuXG4gICAgLy8gVHJ5IHRvIHJldXNlIHNvbWUgb2YgdGhlIGFscmVhZHkgcmVuZGVyZWQgdGV4dCBpZiBwb3NzaWJsZS5cbiAgICB2YXIgcmVuZGVyZWQgPSBmYWxzZTtcbiAgICB2YXIgcm93X2hlaWdodCA9IHRoaXMuZ2V0X3Jvd19oZWlnaHQoKTtcbiAgICBpZiAoIWZvcmNlX3JlZHJhdyAmJiB0aGlzLl9sYXN0X3JlbmRlcmVkX29mZnNldCA9PT0geF9vZmZzZXQpIHtcbiAgICAgICAgdmFyIGxhc3RfdG9wID0gdGhpcy5fbGFzdF9yZW5kZXJlZF9yb3c7XG4gICAgICAgIHZhciBzY3JvbGwgPSB0b3Bfcm93IC0gbGFzdF90b3A7IC8vIFBvc2l0aXZlID0gdXNlciBzY3JvbGxpbmcgZG93bndhcmQuXG4gICAgICAgIGlmIChzY3JvbGwgPCB0aGlzLl9sYXN0X3JlbmRlcmVkX3Jvd19jb3VudCkge1xuXG4gICAgICAgICAgICAvLyBHZXQgYSBzbmFwc2hvdCBvZiB0aGUgdGV4dCBiZWZvcmUgdGhlIHNjcm9sbC5cbiAgICAgICAgICAgIHRoaXMuX3RtcF9jYW52YXMuY2xlYXIoKTtcbiAgICAgICAgICAgIHRoaXMuX3RtcF9jYW52YXMuZHJhd19pbWFnZSh0aGlzLl90ZXh0X2NhbnZhcywgMCwgMCk7XG5cbiAgICAgICAgICAgIC8vIFJlbmRlciB0aGUgbmV3IHRleHQuXG4gICAgICAgICAgICB2YXIgc2F2ZWRfcm93cyA9IHRoaXMuX2xhc3RfcmVuZGVyZWRfcm93X2NvdW50IC0gTWF0aC5hYnMoc2Nyb2xsKTtcbiAgICAgICAgICAgIHZhciBuZXdfcm93cyA9IHRoaXMuX3Zpc2libGVfcm93X2NvdW50IC0gc2F2ZWRfcm93cztcbiAgICAgICAgICAgIGlmIChzY3JvbGwgPiAwKSB7XG4gICAgICAgICAgICAgICAgLy8gUmVuZGVyIHRoZSBib3R0b20uXG4gICAgICAgICAgICAgICAgdGhpcy5fdGV4dF9jYW52YXMuY2xlYXIoKTtcbiAgICAgICAgICAgICAgICBmb3IgKGkgPSB0b3Bfcm93K3NhdmVkX3Jvd3M7IGkgPCB0b3Bfcm93K3RoaXMuX3Zpc2libGVfcm93X2NvdW50OyBpKyspIHsgICAgIFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9yZW5kZXJfcm93KGksIHhfb2Zmc2V0LCAoaSAtIHRvcF9yb3cpICogcm93X2hlaWdodCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChzY3JvbGwgPCAwKSB7XG4gICAgICAgICAgICAgICAgLy8gUmVuZGVyIHRoZSB0b3AuXG4gICAgICAgICAgICAgICAgdGhpcy5fdGV4dF9jYW52YXMuY2xlYXIoKTtcbiAgICAgICAgICAgICAgICBmb3IgKGkgPSB0b3Bfcm93OyBpIDwgdG9wX3JvdytuZXdfcm93czsgaSsrKSB7ICAgXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlcl9yb3coaSwgeF9vZmZzZXQsIChpIC0gdG9wX3JvdykgKiByb3dfaGVpZ2h0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIE5vdGhpbmcgaGFzIGNoYW5nZWQuXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVc2UgdGhlIG9sZCBjb250ZW50IHRvIGZpbGwgaW4gdGhlIHJlc3QuXG4gICAgICAgICAgICB0aGlzLl90ZXh0X2NhbnZhcy5kcmF3X2ltYWdlKHRoaXMuX3RtcF9jYW52YXMsIDAsIC1zY3JvbGwgKiB0aGlzLmdldF9yb3dfaGVpZ2h0KCkpO1xuICAgICAgICAgICAgdGhpcy50cmlnZ2VyKCdyb3dzX2NoYW5nZWQnLCB0b3Bfcm93LCB0b3Bfcm93ICsgdGhpcy5fdmlzaWJsZV9yb3dfY291bnQgLSAxKTtcbiAgICAgICAgICAgIHJlbmRlcmVkID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIEZ1bGwgcmVuZGVyaW5nLlxuICAgIGlmICghcmVuZGVyZWQpIHtcbiAgICAgICAgdGhpcy5fdGV4dF9jYW52YXMuY2xlYXIoKTtcblxuICAgICAgICAvLyBSZW5kZXIgdGlsbCB0aGVyZSBhcmUgbm8gcm93cyBsZWZ0LCBvciB0aGUgdG9wIG9mIHRoZSByb3cgaXNcbiAgICAgICAgLy8gYmVsb3cgdGhlIGJvdHRvbSBvZiB0aGUgdmlzaWJsZSBhcmVhLlxuICAgICAgICBmb3IgKGkgPSB0b3Bfcm93OyBpIDwgdG9wX3JvdyArIHRoaXMuX3Zpc2libGVfcm93X2NvdW50OyBpKyspIHsgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5fcmVuZGVyX3JvdyhpLCB4X29mZnNldCwgKGkgLSB0b3Bfcm93KSAqIHJvd19oZWlnaHQpO1xuICAgICAgICB9ICAgXG4gICAgICAgIHRoaXMudHJpZ2dlcigncm93c19jaGFuZ2VkJywgdG9wX3JvdywgdG9wX3JvdyArIHRoaXMuX3Zpc2libGVfcm93X2NvdW50IC0gMSk7XG4gICAgfVxuXG4gICAgLy8gUmVtZW1iZXIgZm9yIGRlbHRhIHJlbmRlcmluZy5cbiAgICB0aGlzLl9sYXN0X3JlbmRlcmVkX3JvdyA9IHRvcF9yb3c7XG4gICAgdGhpcy5fbGFzdF9yZW5kZXJlZF9yb3dfY291bnQgPSB0aGlzLl92aXNpYmxlX3Jvd19jb3VudDtcbiAgICB0aGlzLl9sYXN0X3JlbmRlcmVkX29mZnNldCA9IHhfb2Zmc2V0O1xufTtcblxuLyoqXG4gKiBHZXRzIHRoZSByb3cgYW5kIGNoYXJhY3RlciBpbmRpY2llcyBjbG9zZXN0IHRvIGdpdmVuIGNvbnRyb2wgc3BhY2UgY29vcmRpbmF0ZXMuXG4gKiBAcGFyYW0gIHtmbG9hdH0gY3Vyc29yX3ggLSB4IHZhbHVlLCAwIGlzIHRoZSBsZWZ0IG9mIHRoZSBjYW52YXMuXG4gKiBAcGFyYW0gIHtmbG9hdH0gY3Vyc29yX3kgLSB5IHZhbHVlLCAwIGlzIHRoZSB0b3Agb2YgdGhlIGNhbnZhcy5cbiAqIEByZXR1cm4ge2RpY3Rpb25hcnl9IGRpY3Rpb25hcnkgb2YgdGhlIGZvcm0ge3Jvd19pbmRleCwgY2hhcl9pbmRleH1cbiAqL1xuUm93UmVuZGVyZXIucHJvdG90eXBlLmdldF9yb3dfY2hhciA9IGZ1bmN0aW9uKGN1cnNvcl94LCBjdXJzb3JfeSkge1xuICAgIHZhciByb3dfaW5kZXggPSBNYXRoLmZsb29yKChjdXJzb3JfeSAtIHRoaXMuX21hcmdpbl90b3ApIC8gdGhpcy5nZXRfcm93X2hlaWdodCgpKTtcblxuICAgIC8vIEZpbmQgdGhlIGNoYXJhY3RlciBpbmRleC5cbiAgICB2YXIgd2lkdGhzID0gWzBdO1xuICAgIHRyeSB7XG4gICAgICAgIGZvciAodmFyIGxlbmd0aD0xOyBsZW5ndGg8PXRoaXMuX21vZGVsLl9yb3dzW3Jvd19pbmRleF0ubGVuZ3RoOyBsZW5ndGgrKykge1xuICAgICAgICAgICAgd2lkdGhzLnB1c2godGhpcy5tZWFzdXJlX3BhcnRpYWxfcm93X3dpZHRoKHJvd19pbmRleCwgbGVuZ3RoKSk7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vIE5vbSBub20gbm9tLi4uXG4gICAgfVxuICAgIHZhciBjb29yZHMgPSB0aGlzLl9tb2RlbC52YWxpZGF0ZV9jb29yZHMocm93X2luZGV4LCB1dGlscy5maW5kX2Nsb3Nlc3Qod2lkdGhzLCBjdXJzb3JfeCAtIHRoaXMuX21hcmdpbl9sZWZ0KSk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcm93X2luZGV4OiBjb29yZHMuc3RhcnRfcm93LFxuICAgICAgICBjaGFyX2luZGV4OiBjb29yZHMuc3RhcnRfY2hhcixcbiAgICB9O1xufTtcblxuLyoqXG4gKiBNZWFzdXJlcyB0aGUgcGFydGlhbCB3aWR0aCBvZiBhIHRleHQgcm93LlxuICogQHBhcmFtICB7aW50ZWdlcn0gaW5kZXhcbiAqIEBwYXJhbSAge2ludGVnZXJ9IChvcHRpb25hbCkgbGVuZ3RoIC0gbnVtYmVyIG9mIGNoYXJhY3RlcnNcbiAqIEByZXR1cm4ge2Zsb2F0fSB3aWR0aFxuICovXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUubWVhc3VyZV9wYXJ0aWFsX3Jvd193aWR0aCA9IGZ1bmN0aW9uKGluZGV4LCBsZW5ndGgpIHtcbiAgICBpZiAoMCA+IGluZGV4IHx8IGluZGV4ID49IHRoaXMuX21vZGVsLl9yb3dzLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gMDsgXG4gICAgfVxuXG4gICAgdmFyIHRleHQgPSB0aGlzLl9tb2RlbC5fcm93c1tpbmRleF07XG4gICAgdGV4dCA9IChsZW5ndGggPT09IHVuZGVmaW5lZCkgPyB0ZXh0IDogdGV4dC5zdWJzdHJpbmcoMCwgbGVuZ3RoKTtcblxuICAgIHJldHVybiB0aGlzLl9jYW52YXMubWVhc3VyZV90ZXh0KHRleHQsIHRoaXMuX2Jhc2Vfb3B0aW9ucyk7XG59O1xuXG4vKipcbiAqIE1lYXN1cmVzIGEgc3RyaW5ncyB3aWR0aC5cbiAqIEBwYXJhbSAge3N0cmluZ30gdGV4dCAtIHRleHQgdG8gbWVhc3VyZSB0aGUgd2lkdGggb2ZcbiAqIEBwYXJhbSAge2ludGVnZXJ9IFtpbmRleF0gLSByb3cgaW5kZXgsIGNhbiBiZSB1c2VkIHRvIGFwcGx5IHNpemUgc2Vuc2l0aXZlIFxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdHRpbmcgdG8gdGhlIHRleHQuXG4gKiBAcmV0dXJuIHtmbG9hdH0gd2lkdGhcbiAqL1xuUm93UmVuZGVyZXIucHJvdG90eXBlLl9tZWFzdXJlX3RleHRfd2lkdGggPSBmdW5jdGlvbih0ZXh0KSB7XG4gICAgcmV0dXJuIHRoaXMuX2NhbnZhcy5tZWFzdXJlX3RleHQodGV4dCwgdGhpcy5fYmFzZV9vcHRpb25zKTtcbn07XG5cbi8qKlxuICogTWVhc3VyZXMgdGhlIGhlaWdodCBvZiBhIHRleHQgcm93IGFzIGlmIGl0IHdlcmUgcmVuZGVyZWQuXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSAob3B0aW9uYWwpIGluZGV4XG4gKiBAcmV0dXJuIHtmbG9hdH0gaGVpZ2h0XG4gKi9cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5nZXRfcm93X2hlaWdodCA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgcmV0dXJuIHRoaXMuX2Jhc2Vfb3B0aW9ucy5mb250X3NpemUgKyB0aGlzLl9saW5lX3NwYWNpbmc7XG59O1xuXG4vKipcbiAqIEdldHMgdGhlIHRvcCBvZiB0aGUgcm93IHdoZW4gcmVuZGVyZWRcbiAqIEBwYXJhbSAge2ludGVnZXJ9IGluZGV4XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuZ2V0X3Jvd190b3AgPSBmdW5jdGlvbihpbmRleCkge1xuICAgIHJldHVybiBpbmRleCAqIHRoaXMuZ2V0X3Jvd19oZWlnaHQoKSArIHRoaXMuX21hcmdpbl90b3A7XG59O1xuXG4vKipcbiAqIEdldHMgdGhlIHZpc2libGUgcm93cy5cbiAqIEByZXR1cm4ge2RpY3Rpb25hcnl9IGRpY3Rpb25hcnkgY29udGFpbmluZyBpbmZvcm1hdGlvbiBhYm91dCBcbiAqICAgICAgICAgICAgICAgICAgICAgIHRoZSB2aXNpYmxlIHJvd3MuICBGb3JtYXQge3RvcF9yb3csIFxuICogICAgICAgICAgICAgICAgICAgICAgYm90dG9tX3Jvdywgcm93X2NvdW50fS5cbiAqL1xuUm93UmVuZGVyZXIucHJvdG90eXBlLmdldF92aXNpYmxlX3Jvd3MgPSBmdW5jdGlvbigpIHtcblxuICAgIC8vIEZpbmQgdGhlIHJvdyBjbG9zZXN0IHRvIHRoZSBzY3JvbGwgdG9wLiAgSWYgdGhhdCByb3cgaXMgYmVsb3dcbiAgICAvLyB0aGUgc2Nyb2xsIHRvcCwgdXNlIHRoZSBwYXJ0aWFsbHkgZGlzcGxheWVkIHJvdyBhYm92ZSBpdC5cbiAgICB2YXIgdG9wX3JvdyA9IE1hdGgubWF4KDAsIE1hdGguZmxvb3IoKHRoaXMuX3Njcm9sbGluZ19jYW52YXMuc2Nyb2xsX3RvcCAtIHRoaXMuX21hcmdpbl90b3ApICAvIHRoaXMuZ2V0X3Jvd19oZWlnaHQoKSkpO1xuXG4gICAgLy8gRmluZCB0aGUgcm93IGNsb3Nlc3QgdG8gdGhlIHNjcm9sbCBib3R0b20uICBJZiB0aGF0IHJvdyBpcyBhYm92ZVxuICAgIC8vIHRoZSBzY3JvbGwgYm90dG9tLCB1c2UgdGhlIHBhcnRpYWxseSBkaXNwbGF5ZWQgcm93IGJlbG93IGl0LlxuICAgIHZhciByb3dfY291bnQgPSBNYXRoLmNlaWwodGhpcy5fY2FudmFzLmhlaWdodCAvIHRoaXMuZ2V0X3Jvd19oZWlnaHQoKSk7XG4gICAgdmFyIGJvdHRvbV9yb3cgPSB0b3Bfcm93ICsgcm93X2NvdW50O1xuXG4gICAgLy8gUm93IGNvdW50ICsgMSB0byBpbmNsdWRlIGZpcnN0IHJvdy5cbiAgICByZXR1cm4ge3RvcF9yb3c6IHRvcF9yb3csIGJvdHRvbV9yb3c6IGJvdHRvbV9yb3csIHJvd19jb3VudDogcm93X2NvdW50KzF9O1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gdGhlIG1vZGVsJ3MgdmFsdWUgY2hhbmdlc1xuICogQ29tcGxleGl0eTogTyhOKSBmb3IgTiByb3dzIG9mIHRleHQuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuX2hhbmRsZV92YWx1ZV9jaGFuZ2VkID0gZnVuY3Rpb24oKSB7XG5cbiAgICAvLyBDYWxjdWxhdGUgdGhlIGRvY3VtZW50IHdpZHRoLlxuICAgIHRoaXMuX3Jvd193aWR0aF9jb3VudHMgPSB7fTtcbiAgICB2YXIgZG9jdW1lbnRfd2lkdGggPSAwO1xuICAgIGZvciAodmFyIGk9MDsgaTx0aGlzLl9tb2RlbC5fcm93cy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgd2lkdGggPSB0aGlzLl9tZWFzdXJlX3Jvd193aWR0aChpKSArIHRoaXMuX21hcmdpbl9sZWZ0O1xuICAgICAgICBkb2N1bWVudF93aWR0aCA9IE1hdGgubWF4KHdpZHRoLCBkb2N1bWVudF93aWR0aCk7XG4gICAgICAgIGlmICh0aGlzLl9yb3dfd2lkdGhfY291bnRzW3dpZHRoXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGlzLl9yb3dfd2lkdGhfY291bnRzW3dpZHRoXSA9IDE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9yb3dfd2lkdGhfY291bnRzW3dpZHRoXSsrO1xuICAgICAgICB9XG4gICAgfVxuICAgIHRoaXMuX3Njcm9sbGluZ19jYW52YXMuc2Nyb2xsX3dpZHRoID0gZG9jdW1lbnRfd2lkdGg7XG4gICAgdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfaGVpZ2h0ID0gdGhpcy5fbW9kZWwuX3Jvd3MubGVuZ3RoICogdGhpcy5nZXRfcm93X2hlaWdodCgpICsgdGhpcy5fbWFyZ2luX3RvcDtcbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIG9uZSBvZiB0aGUgbW9kZWwncyByb3dzIGNoYW5nZVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuUm93UmVuZGVyZXIucHJvdG90eXBlLl9oYW5kbGVfcm93X2NoYW5nZWQgPSBmdW5jdGlvbih0ZXh0LCBpbmRleCkge1xuICAgIHZhciBuZXdfd2lkdGggPSB0aGlzLl9tZWFzdXJlX3Jvd193aWR0aChpbmRleCkgKyB0aGlzLl9tYXJnaW5fbGVmdDtcbiAgICB2YXIgb2xkX3dpZHRoID0gdGhpcy5fbWVhc3VyZV90ZXh0X3dpZHRoKHRleHQsIGluZGV4KSArIHRoaXMuX21hcmdpbl9sZWZ0O1xuICAgIGlmICh0aGlzLl9yb3dfd2lkdGhfY291bnRzW29sZF93aWR0aF0gPT0gMSkge1xuICAgICAgICBkZWxldGUgdGhpcy5fcm93X3dpZHRoX2NvdW50c1tvbGRfd2lkdGhdO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3Jvd193aWR0aF9jb3VudHNbb2xkX3dpZHRoXS0tOyAgICAgICAgXG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3Jvd193aWR0aF9jb3VudHNbbmV3X3dpZHRoXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuX3Jvd193aWR0aF9jb3VudHNbbmV3X3dpZHRoXSsrO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3Jvd193aWR0aF9jb3VudHNbbmV3X3dpZHRoXSA9IDE7XG4gICAgfVxuXG4gICAgdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfd2lkdGggPSB0aGlzLl9maW5kX2xhcmdlc3Rfd2lkdGgoKTtcbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIG9uZSBvciBtb3JlIHJvd3MgYXJlIGFkZGVkIHRvIHRoZSBtb2RlbFxuICpcbiAqIEFzc3VtZXMgY29uc3RhbnQgcm93IGhlaWdodC5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IHN0YXJ0XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBlbmRcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5faGFuZGxlX3Jvd3NfYWRkZWQgPSBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gICAgdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfaGVpZ2h0ICs9IChlbmQgLSBzdGFydCArIDEpICogdGhpcy5nZXRfcm93X2hlaWdodCgpO1xuICAgIFxuICAgIGZvciAodmFyIGkgPSBzdGFydDsgaSA8PSBlbmQ7IGkrKykgeyBcbiAgICAgICAgdmFyIG5ld193aWR0aCA9IHRoaXMuX21lYXN1cmVfcm93X3dpZHRoKGkpICsgdGhpcy5fbWFyZ2luX2xlZnQ7XG4gICAgICAgIGlmICh0aGlzLl9yb3dfd2lkdGhfY291bnRzW25ld193aWR0aF0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhpcy5fcm93X3dpZHRoX2NvdW50c1tuZXdfd2lkdGhdKys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9yb3dfd2lkdGhfY291bnRzW25ld193aWR0aF0gPSAxO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfd2lkdGggPSB0aGlzLl9maW5kX2xhcmdlc3Rfd2lkdGgoKTtcbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIG9uZSBvciBtb3JlIHJvd3MgYXJlIHJlbW92ZWQgZnJvbSB0aGUgbW9kZWxcbiAqXG4gKiBBc3N1bWVzIGNvbnN0YW50IHJvdyBoZWlnaHQuXG4gKiBAcGFyYW0gIHthcnJheX0gcm93c1xuICogQHBhcmFtICB7aW50ZWdlcn0gW2luZGV4XVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuUm93UmVuZGVyZXIucHJvdG90eXBlLl9oYW5kbGVfcm93c19yZW1vdmVkID0gZnVuY3Rpb24ocm93cywgaW5kZXgpIHtcbiAgICAvLyBEZWNyZWFzZSB0aGUgc2Nyb2xsaW5nIGhlaWdodCBiYXNlZCBvbiB0aGUgbnVtYmVyIG9mIHJvd3MgcmVtb3ZlZC5cbiAgICB0aGlzLl9zY3JvbGxpbmdfY2FudmFzLnNjcm9sbF9oZWlnaHQgLT0gcm93cy5sZW5ndGggKiB0aGlzLmdldF9yb3dfaGVpZ2h0KCk7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJvd3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIG9sZF93aWR0aCA9IHRoaXMuX21lYXN1cmVfdGV4dF93aWR0aChyb3dzW2ldLCBpICsgaW5kZXgpICsgdGhpcy5fbWFyZ2luX2xlZnQ7XG4gICAgICAgIGlmICh0aGlzLl9yb3dfd2lkdGhfY291bnRzW29sZF93aWR0aF0gPT0gMSkge1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuX3Jvd193aWR0aF9jb3VudHNbb2xkX3dpZHRoXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3Jvd193aWR0aF9jb3VudHNbb2xkX3dpZHRoXS0tOyAgICAgICAgXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLl9zY3JvbGxpbmdfY2FudmFzLnNjcm9sbF93aWR0aCA9IHRoaXMuX2ZpbmRfbGFyZ2VzdF93aWR0aCgpO1xufTtcblxuLyoqXG4gKiBSZW5kZXIgYSBzaW5nbGUgcm93XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBpbmRleFxuICogQHBhcmFtICB7ZmxvYXR9IHhcbiAqIEBwYXJhbSAge2Zsb2F0fSB5XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuX3JlbmRlcl9yb3cgPSBmdW5jdGlvbihpbmRleCwgeCAseSkge1xuICAgIHRoaXMuX3RleHRfY2FudmFzLmRyYXdfdGV4dCh4LCB5LCB0aGlzLl9tb2RlbC5fcm93c1tpbmRleF0sIHRoaXMuX2Jhc2Vfb3B0aW9ucyk7XG59O1xuXG4vKipcbiAqIE1lYXN1cmVzIHRoZSB3aWR0aCBvZiBhIHRleHQgcm93IGFzIGlmIGl0IHdlcmUgcmVuZGVyZWQuXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBpbmRleFxuICogQHJldHVybiB7ZmxvYXR9IHdpZHRoXG4gKi9cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5fbWVhc3VyZV9yb3dfd2lkdGggPSBmdW5jdGlvbihpbmRleCkge1xuICAgIHJldHVybiB0aGlzLm1lYXN1cmVfcGFydGlhbF9yb3dfd2lkdGgoaW5kZXgsIHRoaXMuX21vZGVsLl9yb3dzW2luZGV4XS5sZW5ndGgpO1xufTtcblxuLyoqXG4gKiBGaW5kIHRoZSBsYXJnZXN0IHdpZHRoIGluIHRoZSB3aWR0aCByb3cgY291bnQgZGljdGlvbmFyeS5cbiAqIEByZXR1cm4ge2Zsb2F0fSB3aWR0aFxuICovXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuX2ZpbmRfbGFyZ2VzdF93aWR0aCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB2YWx1ZXMgPSBPYmplY3Qua2V5cyh0aGlzLl9yb3dfd2lkdGhfY291bnRzKTtcbiAgICB2YWx1ZXMuc29ydChmdW5jdGlvbihhLCBiKXsgXG4gICAgICAgIHJldHVybiBwYXJzZUZsb2F0KGIpIC0gcGFyc2VGbG9hdChhKTsgXG4gICAgfSk7XG4gICAgcmV0dXJuIHBhcnNlRmxvYXQodmFsdWVzWzBdKTtcbn07XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuUm93UmVuZGVyZXIgPSBSb3dSZW5kZXJlcjtcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciBhbmltYXRvciA9IHJlcXVpcmUoJy4uL2FuaW1hdG9yLmpzJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpO1xudmFyIHJlbmRlcmVyID0gcmVxdWlyZSgnLi9yZW5kZXJlci5qcycpO1xudmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4uL2NvbmZpZy5qcycpO1xuY29uZmlnID0gY29uZmlnLmNvbmZpZztcblxuLyoqXG4gKiBSZW5kZXIgZG9jdW1lbnQgc2VsZWN0aW9uIGJveGVzXG4gKlxuICogVE9ETzogT25seSByZW5kZXIgdmlzaWJsZS5cbiAqL1xudmFyIFNlbGVjdGlvbnNSZW5kZXJlciA9IGZ1bmN0aW9uKGN1cnNvcnMsIHN0eWxlLCByb3dfcmVuZGVyZXIsIGhhc19mb2N1cywgY3Vyc29yc19yZW5kZXJlcikge1xuICAgIHJlbmRlcmVyLlJlbmRlcmVyQmFzZS5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX2RpcnR5ID0gbnVsbDtcbiAgICB0aGlzLnN0eWxlID0gc3R5bGU7XG4gICAgdGhpcy5faGFzX2ZvY3VzID0gaGFzX2ZvY3VzO1xuXG4gICAgLy8gV2hlbiB0aGUgY3Vyc29ycyBjaGFuZ2UsIHJlZHJhdyB0aGUgc2VsZWN0aW9uIGJveChlcykuXG4gICAgdGhpcy5fY3Vyc29ycyA9IGN1cnNvcnM7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHZhciByZXJlbmRlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGF0LnJlbmRlcigpO1xuICAgICAgICAvLyBUZWxsIHBhcmVudCBsYXllciB0aGlzIG9uZSBoYXMgY2hhbmdlZC5cbiAgICAgICAgdGhhdC50cmlnZ2VyKCdjaGFuZ2VkJyk7XG4gICAgfTtcbiAgICB0aGlzLl9jdXJzb3JzLm9uKCdjaGFuZ2UnLCByZXJlbmRlcik7XG5cbiAgICAvLyBXaGVuIHRoZSBzdHlsZSBpcyBjaGFuZ2VkLCByZWRyYXcgdGhlIHNlbGVjdGlvbiBib3goZXMpLlxuICAgIHRoaXMuc3R5bGUub24oJ2NoYW5nZScsIHJlcmVuZGVyKTtcbiAgICBjb25maWcub24oJ2NoYW5nZScsIHJlcmVuZGVyKTtcblxuICAgIHRoaXMuX3Jvd19yZW5kZXJlciA9IHJvd19yZW5kZXJlcjtcbiAgICAvLyBUT0RPOiBSZW1vdmUgdGhlIGZvbGxvd2luZyBibG9jay5cbiAgICB0aGlzLl9nZXRfdmlzaWJsZV9yb3dzID0gdXRpbHMucHJveHkocm93X3JlbmRlcmVyLmdldF92aXNpYmxlX3Jvd3MsIHJvd19yZW5kZXJlcik7XG4gICAgdGhpcy5fZ2V0X3Jvd19oZWlnaHQgPSB1dGlscy5wcm94eShyb3dfcmVuZGVyZXIuZ2V0X3Jvd19oZWlnaHQsIHJvd19yZW5kZXJlcik7XG4gICAgdGhpcy5fZ2V0X3Jvd190b3AgPSB1dGlscy5wcm94eShyb3dfcmVuZGVyZXIuZ2V0X3Jvd190b3AsIHJvd19yZW5kZXJlcik7XG4gICAgdGhpcy5fbWVhc3VyZV9wYXJ0aWFsX3JvdyA9IHV0aWxzLnByb3h5KHJvd19yZW5kZXJlci5tZWFzdXJlX3BhcnRpYWxfcm93X3dpZHRoLCByb3dfcmVuZGVyZXIpO1xuXG4gICAgLy8gV2hlbiB0aGUgY3Vyc29yIGlzIGhpZGRlbi9zaG93biwgcmVkcmF3IHRoZSBzZWxlY3Rpb24uXG4gICAgY3Vyc29yc19yZW5kZXJlci5vbigndG9nZ2xlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoYXQucmVuZGVyKCk7XG4gICAgICAgIC8vIFRlbGwgcGFyZW50IGxheWVyIHRoaXMgb25lIGhhcyBjaGFuZ2VkLlxuICAgICAgICB0aGF0LnRyaWdnZXIoJ2NoYW5nZWQnKTtcbiAgICB9KTtcbn07XG51dGlscy5pbmhlcml0KFNlbGVjdGlvbnNSZW5kZXJlciwgcmVuZGVyZXIuUmVuZGVyZXJCYXNlKTtcblxuLyoqXG4gKiBSZW5kZXIgdG8gdGhlIGNhbnZhc1xuICogTm90ZTogVGhpcyBtZXRob2QgaXMgY2FsbGVkIG9mdGVuLCBzbyBpdCdzIGltcG9ydGFudCB0aGF0IGl0J3NcbiAqIG9wdGltaXplZCBmb3Igc3BlZWQuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5TZWxlY3Rpb25zUmVuZGVyZXIucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKHNjcm9sbCkge1xuICAgIC8vIElmIG9sZCBjb250ZW50cyBleGlzdCwgcmVtb3ZlIHRoZW0uXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIGlmICh0aGlzLl9kaXJ0eSA9PT0gbnVsbCB8fCBzY3JvbGwgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGF0Ll9jYW52YXMuY2xlYXIoKTtcbiAgICAgICAgdGhpcy5fZGlydHkgPSBudWxsO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy5jbGVhcih7XG4gICAgICAgICAgICB4OiB0aGlzLl9kaXJ0eS54MS0xLFxuICAgICAgICAgICAgeTogdGhpcy5fZGlydHkueTEtMSxcbiAgICAgICAgICAgIHdpZHRoOiB0aGlzLl9kaXJ0eS54MiAtIHRoaXMuX2RpcnR5LngxKzIsXG4gICAgICAgICAgICBoZWlnaHQ6IHRoaXMuX2RpcnR5LnkyIC0gdGhpcy5fZGlydHkueTErMixcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuX2RpcnR5ID0gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBHZXQgbmV3bGluZSB3aWR0aC5cbiAgICB2YXIgbmV3bGluZV93aWR0aCA9IGNvbmZpZy5uZXdsaW5lX3dpZHRoO1xuICAgIGlmIChuZXdsaW5lX3dpZHRoID09PSB1bmRlZmluZWQgfHwgbmV3bGluZV93aWR0aCA9PT0gbnVsbCkge1xuICAgICAgICBuZXdsaW5lX3dpZHRoID0gMjtcbiAgICB9XG5cbiAgICAvLyBPbmx5IHJlbmRlciBpZiB0aGUgY2FudmFzIGhhcyBmb2N1cy5cbiAgICB0aGlzLl9jdXJzb3JzLmN1cnNvcnMuZm9yRWFjaChmdW5jdGlvbihjdXJzb3IpIHtcbiAgICAgICAgLy8gR2V0IHRoZSB2aXNpYmxlIHJvd3MuXG4gICAgICAgIHZhciB2aXNpYmxlX3Jvd3MgPSB0aGF0Ll9nZXRfdmlzaWJsZV9yb3dzKCk7XG5cbiAgICAgICAgLy8gRHJhdyB0aGUgc2VsZWN0aW9uIGJveC5cbiAgICAgICAgaWYgKGN1cnNvci5zdGFydF9yb3cgIT09IG51bGwgJiYgY3Vyc29yLnN0YXJ0X2NoYXIgIT09IG51bGwgJiZcbiAgICAgICAgICAgIGN1cnNvci5lbmRfcm93ICE9PSBudWxsICYmIGN1cnNvci5lbmRfY2hhciAhPT0gbnVsbCkge1xuICAgICAgICAgICAgXG5cbiAgICAgICAgICAgIGZvciAodmFyIGkgPSBNYXRoLm1heChjdXJzb3Iuc3RhcnRfcm93LCB2aXNpYmxlX3Jvd3MudG9wX3Jvdyk7IFxuICAgICAgICAgICAgICAgIGkgPD0gTWF0aC5taW4oY3Vyc29yLmVuZF9yb3csIHZpc2libGVfcm93cy5ib3R0b21fcm93KTsgXG4gICAgICAgICAgICAgICAgaSsrKSB7XG5cbiAgICAgICAgICAgICAgICB2YXIgbGVmdCA9IHRoYXQuX3Jvd19yZW5kZXJlci5tYXJnaW5fbGVmdDtcbiAgICAgICAgICAgICAgICBpZiAoaSA9PSBjdXJzb3Iuc3RhcnRfcm93ICYmIGN1cnNvci5zdGFydF9jaGFyID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBsZWZ0ICs9IHRoYXQuX21lYXN1cmVfcGFydGlhbF9yb3coaSwgY3Vyc29yLnN0YXJ0X2NoYXIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciBzZWxlY3Rpb25fY29sb3I7XG4gICAgICAgICAgICAgICAgaWYgKHRoYXQuX2hhc19mb2N1cygpKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGlvbl9jb2xvciA9IHRoYXQuc3R5bGUuc2VsZWN0aW9uIHx8ICdza3libHVlJztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzZWxlY3Rpb25fY29sb3IgPSB0aGF0LnN0eWxlLnNlbGVjdGlvbl91bmZvY3VzZWQgfHwgJ2dyYXknO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciB3aWR0aDtcbiAgICAgICAgICAgICAgICBpZiAoaSAhPT0gY3Vyc29yLmVuZF9yb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgd2lkdGggPSB0aGF0Ll9tZWFzdXJlX3BhcnRpYWxfcm93KGkpIC0gbGVmdCArIHRoYXQuX3Jvd19yZW5kZXJlci5tYXJnaW5fbGVmdCArIG5ld2xpbmVfd2lkdGg7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgd2lkdGggPSB0aGF0Ll9tZWFzdXJlX3BhcnRpYWxfcm93KGksIGN1cnNvci5lbmRfY2hhcik7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgdGhpcyBpc24ndCB0aGUgZmlyc3Qgc2VsZWN0ZWQgcm93LCBtYWtlIHN1cmUgYXRsZWFzdCB0aGUgbmV3bGluZVxuICAgICAgICAgICAgICAgICAgICAvLyBpcyB2aXNpYmlseSBzZWxlY3RlZCBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSByb3cgYnkgbWFraW5nIHN1cmUgdGhhdFxuICAgICAgICAgICAgICAgICAgICAvLyB0aGUgc2VsZWN0aW9uIGJveCBpcyBhdGxlYXN0IHRoZSBzaXplIG9mIGEgbmV3bGluZSBjaGFyYWN0ZXIgKGFzXG4gICAgICAgICAgICAgICAgICAgIC8vIGRlZmluZWQgYnkgdGhlIHVzZXIgY29uZmlnKS5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGkgIT09IGN1cnNvci5zdGFydF9yb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoID0gTWF0aC5tYXgobmV3bGluZV93aWR0aCwgd2lkdGgpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgd2lkdGggPSB3aWR0aCAtIGxlZnQgKyB0aGF0Ll9yb3dfcmVuZGVyZXIubWFyZ2luX2xlZnQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHZhciBibG9jayA9IHtcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogbGVmdCwgXG4gICAgICAgICAgICAgICAgICAgIHRvcDogdGhhdC5fZ2V0X3Jvd190b3AoaSksIFxuICAgICAgICAgICAgICAgICAgICB3aWR0aDogd2lkdGgsIFxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IHRoYXQuX2dldF9yb3dfaGVpZ2h0KGkpXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIHRoYXQuX2NhbnZhcy5kcmF3X3JlY3RhbmdsZShcbiAgICAgICAgICAgICAgICAgICAgYmxvY2subGVmdCwgYmxvY2sudG9wLCBibG9jay53aWR0aCwgYmxvY2suaGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxsX2NvbG9yOiBzZWxlY3Rpb25fY29sb3IsXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgaWYgKHRoYXQuX2RpcnR5PT09bnVsbCkge1xuICAgICAgICAgICAgICAgICAgICB0aGF0Ll9kaXJ0eSA9IHt9O1xuICAgICAgICAgICAgICAgICAgICB0aGF0Ll9kaXJ0eS54MSA9IGJsb2NrLmxlZnQ7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQuX2RpcnR5LnkxID0gYmxvY2sudG9wO1xuICAgICAgICAgICAgICAgICAgICB0aGF0Ll9kaXJ0eS54MiA9IGJsb2NrLmxlZnQgKyBibG9jay53aWR0aDtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5fZGlydHkueTIgPSBibG9jay50b3AgKyBibG9jay5oZWlnaHQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5fZGlydHkueDEgPSBNYXRoLm1pbihibG9jay5sZWZ0LCB0aGF0Ll9kaXJ0eS54MSk7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQuX2RpcnR5LnkxID0gTWF0aC5taW4oYmxvY2sudG9wLCB0aGF0Ll9kaXJ0eS55MSk7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQuX2RpcnR5LngyID0gTWF0aC5tYXgoYmxvY2subGVmdCArIGJsb2NrLndpZHRoLCB0aGF0Ll9kaXJ0eS54Mik7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQuX2RpcnR5LnkyID0gTWF0aC5tYXgoYmxvY2sudG9wICsgYmxvY2suaGVpZ2h0LCB0aGF0Ll9kaXJ0eS55Mik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLlNlbGVjdGlvbnNSZW5kZXJlciA9IFNlbGVjdGlvbnNSZW5kZXJlcjtcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG52YXIgY2FudmFzID0gcmVxdWlyZSgnLi9jYW52YXMuanMnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcblxuLyoqXG4gKiBIVE1MIGNhbnZhcyB3aXRoIGRyYXdpbmcgY29udmluaWVuY2UgZnVuY3Rpb25zLlxuICovXG52YXIgU2Nyb2xsaW5nQ2FudmFzID0gZnVuY3Rpb24oKSB7XG4gICAgY2FudmFzLkNhbnZhcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX2JpbmRfZXZlbnRzKCk7XG4gICAgdGhpcy5fb2xkX3Njcm9sbF9sZWZ0ID0gMDtcbiAgICB0aGlzLl9vbGRfc2Nyb2xsX3RvcCA9IDA7XG5cbiAgICAvLyBTZXQgZGVmYXVsdCBzaXplLlxuICAgIHRoaXMud2lkdGggPSA0MDA7XG4gICAgdGhpcy5oZWlnaHQgPSAzMDA7XG59O1xudXRpbHMuaW5oZXJpdChTY3JvbGxpbmdDYW52YXMsIGNhbnZhcy5DYW52YXMpO1xuXG4vKipcbiAqIENhdXNlcyB0aGUgY2FudmFzIGNvbnRlbnRzIHRvIGJlIHJlZHJhd24uXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5TY3JvbGxpbmdDYW52YXMucHJvdG90eXBlLnJlZHJhdyA9IGZ1bmN0aW9uKHNjcm9sbCkge1xuICAgIHRoaXMuY2xlYXIoKTtcbiAgICB0aGlzLnRyaWdnZXIoJ3JlZHJhdycsIHNjcm9sbCk7XG59O1xuXG4vKipcbiAqIExheW91dCB0aGUgZWxlbWVudHMgZm9yIHRoZSBjYW52YXMuXG4gKiBDcmVhdGVzIGB0aGlzLmVsYFxuICogXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5TY3JvbGxpbmdDYW52YXMucHJvdG90eXBlLl9sYXlvdXQgPSBmdW5jdGlvbigpIHtcbiAgICBjYW52YXMuQ2FudmFzLnByb3RvdHlwZS5fbGF5b3V0LmNhbGwodGhpcyk7XG4gICAgLy8gQ2hhbmdlIHRoZSBjYW52YXMgY2xhc3Mgc28gaXQncyBub3QgaGlkZGVuLlxuICAgIHRoaXMuX2NhbnZhcy5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ2NhbnZhcycpO1xuXG4gICAgdGhpcy5lbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIHRoaXMuZWwuc2V0QXR0cmlidXRlKCdjbGFzcycsICdwb3N0ZXIgc2Nyb2xsLXdpbmRvdycpO1xuICAgIHRoaXMuZWwuc2V0QXR0cmlidXRlKCd0YWJpbmRleCcsIDApO1xuICAgIHRoaXMuX3Njcm9sbF9iYXJzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgdGhpcy5fc2Nyb2xsX2JhcnMuc2V0QXR0cmlidXRlKCdjbGFzcycsICdzY3JvbGwtYmFycycpO1xuICAgIHRoaXMuX3RvdWNoX3BhbmUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB0aGlzLl90b3VjaF9wYW5lLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAndG91Y2gtcGFuZScpO1xuICAgIHRoaXMuX2R1bW15ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgdGhpcy5fZHVtbXkuc2V0QXR0cmlidXRlKCdjbGFzcycsICdzY3JvbGwtZHVtbXknKTtcblxuICAgIHRoaXMuZWwuYXBwZW5kQ2hpbGQodGhpcy5fY2FudmFzKTtcbiAgICB0aGlzLmVsLmFwcGVuZENoaWxkKHRoaXMuX3Njcm9sbF9iYXJzKTtcbiAgICB0aGlzLl9zY3JvbGxfYmFycy5hcHBlbmRDaGlsZCh0aGlzLl9kdW1teSk7XG4gICAgdGhpcy5fc2Nyb2xsX2JhcnMuYXBwZW5kQ2hpbGQodGhpcy5fdG91Y2hfcGFuZSk7XG59O1xuXG4vKipcbiAqIE1ha2UgdGhlIHByb3BlcnRpZXMgb2YgdGhlIGNsYXNzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuU2Nyb2xsaW5nQ2FudmFzLnByb3RvdHlwZS5faW5pdF9wcm9wZXJ0aWVzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogV2lkdGggb2YgdGhlIHNjcm9sbGFibGUgY2FudmFzIGFyZWFcbiAgICAgKi9cbiAgICB0aGlzLnByb3BlcnR5KCdzY3JvbGxfd2lkdGgnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gR2V0XG4gICAgICAgIHJldHVybiB0aGF0Ll9zY3JvbGxfd2lkdGggfHwgMDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAvLyBTZXRcbiAgICAgICAgdGhhdC5fc2Nyb2xsX3dpZHRoID0gdmFsdWU7XG4gICAgICAgIHRoYXQuX21vdmVfZHVtbXkodGhhdC5fc2Nyb2xsX3dpZHRoLCB0aGF0Ll9zY3JvbGxfaGVpZ2h0IHx8IDApO1xuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogSGVpZ2h0IG9mIHRoZSBzY3JvbGxhYmxlIGNhbnZhcyBhcmVhLlxuICAgICAqL1xuICAgIHRoaXMucHJvcGVydHkoJ3Njcm9sbF9oZWlnaHQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gR2V0XG4gICAgICAgIHJldHVybiB0aGF0Ll9zY3JvbGxfaGVpZ2h0IHx8IDA7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgLy8gU2V0XG4gICAgICAgIHRoYXQuX3Njcm9sbF9oZWlnaHQgPSB2YWx1ZTtcbiAgICAgICAgdGhhdC5fbW92ZV9kdW1teSh0aGF0Ll9zY3JvbGxfd2lkdGggfHwgMCwgdGhhdC5fc2Nyb2xsX2hlaWdodCk7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBUb3AgbW9zdCBwaXhlbCBpbiB0aGUgc2Nyb2xsZWQgd2luZG93LlxuICAgICAqL1xuICAgIHRoaXMucHJvcGVydHkoJ3Njcm9sbF90b3AnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gR2V0XG4gICAgICAgIHJldHVybiB0aGF0Ll9zY3JvbGxfYmFycy5zY3JvbGxUb3A7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgLy8gU2V0XG4gICAgICAgIHRoYXQuX3Njcm9sbF9iYXJzLnNjcm9sbFRvcCA9IHZhbHVlO1xuICAgICAgICB0aGF0Ll9oYW5kbGVfc2Nyb2xsKCk7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBMZWZ0IG1vc3QgcGl4ZWwgaW4gdGhlIHNjcm9sbGVkIHdpbmRvdy5cbiAgICAgKi9cbiAgICB0aGlzLnByb3BlcnR5KCdzY3JvbGxfbGVmdCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBHZXRcbiAgICAgICAgcmV0dXJuIHRoYXQuX3Njcm9sbF9iYXJzLnNjcm9sbExlZnQ7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgLy8gU2V0XG4gICAgICAgIHRoYXQuX3Njcm9sbF9iYXJzLnNjcm9sbExlZnQgPSB2YWx1ZTtcbiAgICAgICAgdGhhdC5faGFuZGxlX3Njcm9sbCgpO1xuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogSGVpZ2h0IG9mIHRoZSBjYW52YXNcbiAgICAgKiBAcmV0dXJuIHtmbG9hdH1cbiAgICAgKi9cbiAgICB0aGlzLnByb3BlcnR5KCdoZWlnaHQnLCBmdW5jdGlvbigpIHsgXG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMuaGVpZ2h0IC8gMjsgXG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC5fY2FudmFzLnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgdmFsdWUgKiAyKTtcbiAgICAgICAgdGhhdC5lbC5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgJ3dpZHRoOiAnICsgdGhhdC53aWR0aCArICdweDsgaGVpZ2h0OiAnICsgdmFsdWUgKyAncHg7Jyk7XG5cbiAgICAgICAgdGhhdC50cmlnZ2VyKCdyZXNpemUnLCB7aGVpZ2h0OiB2YWx1ZX0pO1xuICAgICAgICB0aGF0Ll90cnlfcmVkcmF3KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTdHJldGNoIHRoZSBpbWFnZSBmb3IgcmV0aW5hIHN1cHBvcnQuXG4gICAgICAgIHRoaXMuc2NhbGUoMiwyKTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIFdpZHRoIG9mIHRoZSBjYW52YXNcbiAgICAgKiBAcmV0dXJuIHtmbG9hdH1cbiAgICAgKi9cbiAgICB0aGlzLnByb3BlcnR5KCd3aWR0aCcsIGZ1bmN0aW9uKCkgeyBcbiAgICAgICAgcmV0dXJuIHRoYXQuX2NhbnZhcy53aWR0aCAvIDI7IFxuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgdmFsdWUgKiAyKTtcbiAgICAgICAgdGhhdC5lbC5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgJ3dpZHRoOiAnICsgdmFsdWUgKyAncHg7IGhlaWdodDogJyArIHRoYXQuaGVpZ2h0ICsgJ3B4OycpO1xuXG4gICAgICAgIHRoYXQudHJpZ2dlcigncmVzaXplJywge3dpZHRoOiB2YWx1ZX0pO1xuICAgICAgICB0aGF0Ll90cnlfcmVkcmF3KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTdHJldGNoIHRoZSBpbWFnZSBmb3IgcmV0aW5hIHN1cHBvcnQuXG4gICAgICAgIHRoaXMuc2NhbGUoMiwyKTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIElzIHRoZSBjYW52YXMgb3IgcmVsYXRlZCBlbGVtZW50cyBmb2N1c2VkP1xuICAgICAqIEByZXR1cm4ge2Jvb2xlYW59XG4gICAgICovXG4gICAgdGhpcy5wcm9wZXJ0eSgnZm9jdXNlZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gZG9jdW1lbnQuYWN0aXZlRWxlbWVudCA9PT0gdGhhdC5lbCB8fFxuICAgICAgICAgICAgZG9jdW1lbnQuYWN0aXZlRWxlbWVudCA9PT0gdGhhdC5fc2Nyb2xsX2JhcnMgfHxcbiAgICAgICAgICAgIGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQgPT09IHRoYXQuX2R1bW15IHx8XG4gICAgICAgICAgICBkb2N1bWVudC5hY3RpdmVFbGVtZW50ID09PSB0aGF0Ll9jYW52YXM7XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIEJpbmQgdG8gdGhlIGV2ZW50cyBvZiB0aGUgY2FudmFzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuU2Nyb2xsaW5nQ2FudmFzLnByb3RvdHlwZS5fYmluZF9ldmVudHMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG5cbiAgICAvLyBUcmlnZ2VyIHNjcm9sbCBhbmQgcmVkcmF3IGV2ZW50cyBvbiBzY3JvbGwuXG4gICAgdGhpcy5fc2Nyb2xsX2JhcnMub25zY3JvbGwgPSBmdW5jdGlvbihlKSB7XG4gICAgICAgIHRoYXQudHJpZ2dlcignc2Nyb2xsJywgZSk7XG4gICAgICAgIHRoYXQuX2hhbmRsZV9zY3JvbGwoKTtcbiAgICB9O1xuXG4gICAgLy8gUHJldmVudCBzY3JvbGwgYmFyIGhhbmRsZWQgbW91c2UgZXZlbnRzIGZyb20gYnViYmxpbmcuXG4gICAgdmFyIHNjcm9sbGJhcl9ldmVudCA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgaWYgKGUudGFyZ2V0ICE9PSB0aGF0Ll90b3VjaF9wYW5lKSB7XG4gICAgICAgICAgICB1dGlscy5jYW5jZWxfYnViYmxlKGUpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB0aGlzLl9zY3JvbGxfYmFycy5vbm1vdXNlZG93biA9IHNjcm9sbGJhcl9ldmVudDtcbiAgICB0aGlzLl9zY3JvbGxfYmFycy5vbm1vdXNldXAgPSBzY3JvbGxiYXJfZXZlbnQ7XG4gICAgdGhpcy5fc2Nyb2xsX2JhcnMub25jbGljayA9IHNjcm9sbGJhcl9ldmVudDtcbiAgICB0aGlzLl9zY3JvbGxfYmFycy5vbmRibGNsaWNrID0gc2Nyb2xsYmFyX2V2ZW50O1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gdGhlIGNhbnZhcyBpcyBzY3JvbGxlZC5cbiAqL1xuU2Nyb2xsaW5nQ2FudmFzLnByb3RvdHlwZS5faGFuZGxlX3Njcm9sbCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLl9vbGRfc2Nyb2xsX3RvcCAhPT0gdW5kZWZpbmVkICYmIHRoaXMuX29sZF9zY3JvbGxfbGVmdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHZhciBzY3JvbGwgPSB7XG4gICAgICAgICAgICB4OiB0aGlzLnNjcm9sbF9sZWZ0IC0gdGhpcy5fb2xkX3Njcm9sbF9sZWZ0LFxuICAgICAgICAgICAgeTogdGhpcy5zY3JvbGxfdG9wIC0gdGhpcy5fb2xkX3Njcm9sbF90b3AsXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuX3RyeV9yZWRyYXcoc2Nyb2xsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl90cnlfcmVkcmF3KCk7XG4gICAgfVxuICAgIHRoaXMuX29sZF9zY3JvbGxfbGVmdCA9IHRoaXMuc2Nyb2xsX2xlZnQ7XG4gICAgdGhpcy5fb2xkX3Njcm9sbF90b3AgPSB0aGlzLnNjcm9sbF90b3A7XG59O1xuXG4vKipcbiAqIFF1ZXJpZXMgdG8gc2VlIGlmIHJlZHJhdyBpcyBva2F5LCBhbmQgdGhlbiByZWRyYXdzIGlmIGl0IGlzLlxuICogQHJldHVybiB7Ym9vbGVhbn0gdHJ1ZSBpZiByZWRyYXcgaGFwcGVuZWQuXG4gKi9cblNjcm9sbGluZ0NhbnZhcy5wcm90b3R5cGUuX3RyeV9yZWRyYXcgPSBmdW5jdGlvbihzY3JvbGwpIHtcbiAgICBpZiAodGhpcy5fcXVlcnlfcmVkcmF3KCkpIHtcbiAgICAgICAgdGhpcy5yZWRyYXcoc2Nyb2xsKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn07XG5cbi8qKlxuICogVHJpZ2dlciB0aGUgJ3F1ZXJ5X3JlZHJhdycgZXZlbnQuXG4gKiBAcmV0dXJuIHtib29sZWFufSB0cnVlIGlmIGNvbnRyb2wgc2hvdWxkIHJlZHJhdyBpdHNlbGYuXG4gKi9cblNjcm9sbGluZ0NhbnZhcy5wcm90b3R5cGUuX3F1ZXJ5X3JlZHJhdyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnRyaWdnZXIoJ3F1ZXJ5X3JlZHJhdycpLmV2ZXJ5KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHg7IH0pOyBcbn07XG5cbi8qKlxuICogTW92ZXMgdGhlIGR1bW15IGVsZW1lbnQgdGhhdCBjYXVzZXMgdGhlIHNjcm9sbGJhciB0byBhcHBlYXIuXG4gKiBAcGFyYW0gIHtmbG9hdH0geFxuICogQHBhcmFtICB7ZmxvYXR9IHlcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblNjcm9sbGluZ0NhbnZhcy5wcm90b3R5cGUuX21vdmVfZHVtbXkgPSBmdW5jdGlvbih4LCB5KSB7XG4gICAgdGhpcy5fZHVtbXkuc2V0QXR0cmlidXRlKCdzdHlsZScsICdsZWZ0OiAnICsgU3RyaW5nKHgpICsgJ3B4OyB0b3A6ICcgKyBTdHJpbmcoeSkgKyAncHg7Jyk7XG4gICAgdGhpcy5fdG91Y2hfcGFuZS5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgXG4gICAgICAgICd3aWR0aDogJyArIFN0cmluZyhNYXRoLm1heCh4LCB0aGlzLl9zY3JvbGxfYmFycy5jbGllbnRXaWR0aCkpICsgJ3B4OyAnICtcbiAgICAgICAgJ2hlaWdodDogJyArIFN0cmluZyhNYXRoLm1heCh5LCB0aGlzLl9zY3JvbGxfYmFycy5jbGllbnRIZWlnaHQpKSArICdweDsnKTtcbn07XG5cbi8qKlxuICogVHJhbnNmb3JtIGFuIHggdmFsdWUgYmFzZWQgb24gc2Nyb2xsIHBvc2l0aW9uLlxuICogQHBhcmFtICB7ZmxvYXR9IHhcbiAqIEBwYXJhbSAge2Jvb2xlYW59IGludmVyc2UgLSBwZXJmb3JtIGludmVyc2UgdHJhbnNmb3JtYXRpb25cbiAqIEByZXR1cm4ge2Zsb2F0fVxuICovXG5TY3JvbGxpbmdDYW52YXMucHJvdG90eXBlLl90eCA9IGZ1bmN0aW9uKHgsIGludmVyc2UpIHsgcmV0dXJuIHggLSAoaW52ZXJzZT8tMToxKSAqIHRoaXMuc2Nyb2xsX2xlZnQ7IH07XG5cbi8qKlxuICogVHJhbnNmb3JtIGEgeSB2YWx1ZSBiYXNlZCBvbiBzY3JvbGwgcG9zaXRpb24uXG4gKiBAcGFyYW0gIHtmbG9hdH0geVxuICogQHBhcmFtICB7Ym9vbGVhbn0gaW52ZXJzZSAtIHBlcmZvcm0gaW52ZXJzZSB0cmFuc2Zvcm1hdGlvblxuICogQHJldHVybiB7ZmxvYXR9XG4gKi9cblNjcm9sbGluZ0NhbnZhcy5wcm90b3R5cGUuX3R5ID0gZnVuY3Rpb24oeSwgaW52ZXJzZSkgeyByZXR1cm4geSAtIChpbnZlcnNlPy0xOjEpICogdGhpcy5zY3JvbGxfdG9wOyB9O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLlNjcm9sbGluZ0NhbnZhcyA9IFNjcm9sbGluZ0NhbnZhcztcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcbnZhciBzdHlsZXMgPSByZXF1aXJlKCcuL3N0eWxlcy9pbml0LmpzJyk7XG5cbi8qKlxuICogU3R5bGVcbiAqL1xudmFyIFN0eWxlID0gZnVuY3Rpb24oKSB7XG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzLCBbXG4gICAgICAgICdjb21tZW50JyxcbiAgICAgICAgJ3N0cmluZycsXG4gICAgICAgICdjbGFzcy1uYW1lJyxcbiAgICAgICAgJ2tleXdvcmQnLFxuICAgICAgICAnYm9vbGVhbicsXG4gICAgICAgICdmdW5jdGlvbicsXG4gICAgICAgICdvcGVyYXRvcicsXG4gICAgICAgICdudW1iZXInLFxuICAgICAgICAnaWdub3JlJyxcbiAgICAgICAgJ3B1bmN0dWF0aW9uJyxcblxuICAgICAgICAnY3Vyc29yJyxcbiAgICAgICAgJ2N1cnNvcl93aWR0aCcsXG4gICAgICAgICdjdXJzb3JfaGVpZ2h0JyxcbiAgICAgICAgJ3NlbGVjdGlvbicsXG4gICAgICAgICdzZWxlY3Rpb25fdW5mb2N1c2VkJyxcblxuICAgICAgICAndGV4dCcsXG4gICAgICAgICdiYWNrZ3JvdW5kJyxcbiAgICAgICAgJ2d1dHRlcicsXG4gICAgICAgICdndXR0ZXJfdGV4dCcsXG4gICAgICAgICdndXR0ZXJfc2hhZG93J1xuICAgIF0pO1xuXG4gICAgLy8gTG9hZCB0aGUgZGVmYXVsdCBzdHlsZS5cbiAgICB0aGlzLmxvYWQoJ3BlYWNvY2snKTtcbn07XG51dGlscy5pbmhlcml0KFN0eWxlLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8qKlxuICogTG9hZCBhIHJlbmRlcmluZyBzdHlsZVxuICogQHBhcmFtICB7c3RyaW5nIG9yIGRpY3Rpb25hcnl9IHN0eWxlIC0gbmFtZSBvZiB0aGUgYnVpbHQtaW4gc3R5bGUgXG4gKiAgICAgICAgIG9yIHN0eWxlIGRpY3Rpb25hcnkgaXRzZWxmLlxuICogQHJldHVybiB7Ym9vbGVhbn0gc3VjY2Vzc1xuICovXG5TdHlsZS5wcm90b3R5cGUubG9hZCA9IGZ1bmN0aW9uKHN0eWxlKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gTG9hZCB0aGUgc3R5bGUgaWYgaXQncyBidWlsdC1pbi5cbiAgICAgICAgaWYgKHN0eWxlcy5zdHlsZXNbc3R5bGVdKSB7XG4gICAgICAgICAgICBzdHlsZSA9IHN0eWxlcy5zdHlsZXNbc3R5bGVdLnN0eWxlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVhZCBlYWNoIGF0dHJpYnV0ZSBvZiB0aGUgc3R5bGUuXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBzdHlsZSkge1xuICAgICAgICAgICAgaWYgKHN0eWxlLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICB0aGlzW2tleV0gPSBzdHlsZVtrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGxvYWRpbmcgc3R5bGUnLCBlKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn07XG5cbmV4cG9ydHMuU3R5bGUgPSBTdHlsZTsiLCJleHBvcnRzLnN0eWxlcyA9IHtcbiAgICBcInBlYWNvY2tcIjogcmVxdWlyZShcIi4vcGVhY29jay5qc1wiKSxcbn07XG4iLCJleHBvcnRzLnN0eWxlID0ge1xuICAgIGNvbW1lbnQ6ICcjN2E3MjY3JyxcbiAgICBzdHJpbmc6ICcjYmNkNDJhJyxcbiAgICAnY2xhc3MtbmFtZSc6ICcjZWRlMGNlJyxcbiAgICBrZXl3b3JkOiAnIzI2QTZBNicsXG4gICAgYm9vbGVhbjogJyNiY2Q0MmEnLFxuICAgIGZ1bmN0aW9uOiAnI2ZmNWQzOCcsXG4gICAgb3BlcmF0b3I6ICcjMjZBNkE2JyxcbiAgICBudW1iZXI6ICcjYmNkNDJhJyxcbiAgICBpZ25vcmU6ICcjY2NjY2NjJyxcbiAgICBwdW5jdHVhdGlvbjogJyNlZGUwY2UnLFxuXG4gICAgY3Vyc29yOiAnI2Y4ZjhmMCcsXG4gICAgY3Vyc29yX3dpZHRoOiAxLjAsXG4gICAgY3Vyc29yX2hlaWdodDogMS4xLFxuICAgIHNlbGVjdGlvbjogJyNkZjNkMTgnLFxuICAgIHNlbGVjdGlvbl91bmZvY3VzZWQ6ICcjNGYxZDA4JyxcblxuICAgIHRleHQ6ICcjZWRlMGNlJyxcbiAgICBiYWNrZ3JvdW5kOiAnIzJiMmEyNycsXG4gICAgZ3V0dGVyOiAnIzJiMmEyNycsXG4gICAgZ3V0dGVyX3RleHQ6ICcjN2E3MjY3JyxcbiAgICBndXR0ZXJfc2hhZG93OiBbXG4gICAgICAgIFswLCAnYmxhY2snXSwgXG4gICAgICAgIFsxLCAndHJhbnNwYXJlbnQnXVxuICAgIF0sXG59O1xuXG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG5cbi8qKlxuICogU3VwZXJzZXRcbiAqL1xudmFyIFN1cGVyc2V0ID0gZnVuY3Rpb24oKSB7XG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzKTtcbiAgICB0aGlzLl9hcnJheSA9IFtdO1xuICAgIFxuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLnByb3BlcnR5KCdhcnJheScsIGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGF0Ll9jbGVhbigpO1xuICAgICAgICByZXR1cm4gdGhhdC5fYXJyYXk7XG4gICAgfSk7XG59O1xudXRpbHMuaW5oZXJpdChTdXBlcnNldCwgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vKipcbiAqIENsZWFycyB0aGUgc2V0XG4gKi9cblN1cGVyc2V0LnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uKCkge1xuICAgIHV0aWxzLmNsZWFyX2FycmF5KHRoaXMuX2FycmF5KTtcbn07XG5cbi8qKlxuICogU2V0IHRoZSBzdGF0ZSBvZiBhIHJlZ2lvbi5cbiAqIEBwYXJhbSB7aW50ZWdlcn0gc3RhcnQgLSBpbmRleCwgaW5jbHVzaXZlXG4gKiBAcGFyYW0ge2ludGVnZXJ9IHN0b3AgLSBpbmRleCwgaW5jbHVzaXZlXG4gKiBAcGFyYW0ge29iamVjdH0gc3RhdGVcbiAqL1xuU3VwZXJzZXQucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uKHN0YXJ0LCBzdG9wLCBzdGF0ZSkge1xuICAgIHRoaXMuX3NldChzdGFydCwgc3RvcCwgc3RhdGUsIDApO1xufTtcblxuLyoqXG4gKiBTZXQgdGhlIHN0YXRlIG9mIGEgcmVnaW9uLlxuICogQHBhcmFtIHtpbnRlZ2VyfSBzdGFydCAtIGluZGV4LCBpbmNsdXNpdmVcbiAqIEBwYXJhbSB7aW50ZWdlcn0gc3RvcCAtIGluZGV4LCBpbmNsdXNpdmVcbiAqIEBwYXJhbSB7b2JqZWN0fSBzdGF0ZVxuICogQHBhcmFtIHtpbnRlZ2VyfSBpbnRlZ2VyIC0gY3VycmVudCByZWN1cnNpb24gaW5kZXhcbiAqL1xuU3VwZXJzZXQucHJvdG90eXBlLl9zZXQgPSBmdW5jdGlvbihzdGFydCwgc3RvcCwgc3RhdGUsIGluZGV4KSB7XG4gICAgLy8gTWFrZSBzdXJlIHN0YXJ0IGFuZCBzdG9wIGFyZSBpbiBjb3JyZWN0IG9yZGVyLlxuICAgIGlmIChzdGFydCA+IHN0b3ApIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgbnMgPSBzdGFydDtcbiAgICB2YXIgbmUgPSBzdG9wO1xuXG4gICAgLy8gSGFuZGxlIGludGVyc2VjdGlvbnMuXG4gICAgZm9yICg7IGluZGV4IDwgdGhpcy5fYXJyYXkubGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICAgIHZhciBzID0gdGhpcy5fYXJyYXlbaW5kZXhdWzBdO1xuICAgICAgICB2YXIgZSA9IHRoaXMuX2FycmF5W2luZGV4XVsxXTtcbiAgICAgICAgdmFyIG9sZF9zdGF0ZSA9IHRoaXMuX2FycmF5W2luZGV4XVsyXTtcbiAgICAgICAgaWYgKG5zIDw9IGUgJiYgbmUgPj0gcykge1xuICAgICAgICAgICAgdGhpcy5fYXJyYXkuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgIC8vIGtlZXBcbiAgICAgICAgICAgIHRoaXMuX2luc2VydChpbmRleCwgcywgbnMgLSAxLCBvbGRfc3RhdGUpO1xuICAgICAgICAgICAgLy8gcmVwbGFjZVxuICAgICAgICAgICAgdGhpcy5faW5zZXJ0KGluZGV4LCBNYXRoLm1heChzLCBucyksIE1hdGgubWluKGUsIG5lKSwgc3RhdGUpO1xuICAgICAgICAgICAgLy8ga2VlcFxuICAgICAgICAgICAgdGhpcy5faW5zZXJ0KGluZGV4LCBuZSArIDEsIGUsIG9sZF9zdGF0ZSk7XG4gICAgICAgICAgICAvLyBuZXdcbiAgICAgICAgICAgIHRoaXMuX3NldChucywgcyAtIDEsIHN0YXRlLCBpbmRleCk7XG4gICAgICAgICAgICB0aGlzLl9zZXQoZSArIDEsIG5lLCBzdGF0ZSwgaW5kZXgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gRG9lc24ndCBpbnRlcnNlY3Qgd2l0aCBhbnl0aGluZy5cbiAgICB0aGlzLl9hcnJheS5wdXNoKFtucywgbmUsIHN0YXRlXSk7XG59O1xuXG4vKipcbiAqIEluc2VydHMgYW4gZW50cnkuXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBpbmRleFxuICogQHBhcmFtICB7aW50ZWdlcn0gc3RhcnRcbiAqIEBwYXJhbSAge2ludGVnZXJ9IGVuZCAgXG4gKiBAcGFyYW0gIHtvYmplY3R9IHN0YXRlXG4gKi9cblN1cGVyc2V0LnByb3RvdHlwZS5faW5zZXJ0ID0gZnVuY3Rpb24oaW5kZXgsIHN0YXJ0LCBlbmQsIHN0YXRlKSB7XG4gICAgaWYgKHN0YXJ0ID4gZW5kKSByZXR1cm47XG4gICAgdGhpcy5fYXJyYXkuc3BsaWNlKGluZGV4LCAwLCBbc3RhcnQsIGVuZCwgc3RhdGVdKTtcbn07XG5cbi8qKlxuICogSm9pbnMgY29uc2VxdXRpdmUgc3RhdGVzLlxuICovXG5TdXBlcnNldC5wcm90b3R5cGUuX2NsZWFuID0gZnVuY3Rpb24oKSB7XG5cbiAgICAvLyBTb3J0LlxuICAgIHRoaXMuX2FycmF5LnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcmV0dXJuIGFbMF0gLSBiWzBdO1xuICAgIH0pO1xuXG4gICAgLy8gSm9pbiBjb25zZXF1dGl2ZS5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX2FycmF5Lmxlbmd0aCAtIDE7IGkrKykge1xuICAgICAgICBpZiAodGhpcy5fYXJyYXlbaV1bMV0gPT09IHRoaXMuX2FycmF5W2krMV1bMF0tMSAmJiB0aGlzLl9hcnJheVtpXVsyXSA9PT0gdGhpcy5fYXJyYXlbaSsxXVsyXSkge1xuICAgICAgICAgICAgdGhpcy5fYXJyYXlbaV1bMV0gPSB0aGlzLl9hcnJheVtpKzFdWzFdO1xuICAgICAgICAgICAgdGhpcy5fYXJyYXkuc3BsaWNlKGkrMSwgMSk7XG4gICAgICAgICAgICBpLS07XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5leHBvcnRzLlN1cGVyc2V0ID0gU3VwZXJzZXQ7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG4vKipcbiAqIEJhc2UgY2xhc3Mgd2l0aCBoZWxwZnVsIHV0aWxpdGllc1xuICogQHBhcmFtIHthcnJheX0gW2V2ZW50ZnVsX3Byb3BlcnRpZXNdIGxpc3Qgb2YgcHJvcGVydHkgbmFtZXMgKHN0cmluZ3MpXG4gKiAgICAgICAgICAgICAgICB0byBjcmVhdGUgYW5kIHdpcmUgY2hhbmdlIGV2ZW50cyB0by5cbiAqL1xudmFyIFBvc3RlckNsYXNzID0gZnVuY3Rpb24oZXZlbnRmdWxfcHJvcGVydGllcykge1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHRoaXMuX29uX2FsbCA9IFtdO1xuXG4gICAgLy8gQ29uc3RydWN0IGV2ZW50ZnVsIHByb3BlcnRpZXMuXG4gICAgaWYgKGV2ZW50ZnVsX3Byb3BlcnRpZXMgJiYgZXZlbnRmdWxfcHJvcGVydGllcy5sZW5ndGg+MCkge1xuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIGZvciAodmFyIGk9MDsgaTxldmVudGZ1bF9wcm9wZXJ0aWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAoZnVuY3Rpb24obmFtZSkge1xuICAgICAgICAgICAgICAgIHRoYXQucHJvcGVydHkobmFtZSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGF0WydfJyArIG5hbWVdO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQudHJpZ2dlcignY2hhbmdlOicgKyBuYW1lLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQudHJpZ2dlcignY2hhbmdlJywgbmFtZSwgdmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB0aGF0WydfJyArIG5hbWVdID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQudHJpZ2dlcignY2hhbmdlZDonICsgbmFtZSk7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQudHJpZ2dlcignY2hhbmdlZCcsIG5hbWUpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkoZXZlbnRmdWxfcHJvcGVydGllc1tpXSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vKipcbiAqIERlZmluZSBhIHByb3BlcnR5IGZvciB0aGUgY2xhc3NcbiAqIEBwYXJhbSAge3N0cmluZ30gbmFtZVxuICogQHBhcmFtICB7ZnVuY3Rpb259IGdldHRlclxuICogQHBhcmFtICB7ZnVuY3Rpb259IHNldHRlclxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuUG9zdGVyQ2xhc3MucHJvdG90eXBlLnByb3BlcnR5ID0gZnVuY3Rpb24obmFtZSwgZ2V0dGVyLCBzZXR0ZXIpIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgbmFtZSwge1xuICAgICAgICBnZXQ6IGdldHRlcixcbiAgICAgICAgc2V0OiBzZXR0ZXIsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH0pO1xufTtcblxuLyoqXG4gKiBSZWdpc3RlciBhbiBldmVudCBsaXN0ZW5lclxuICogQHBhcmFtICB7c3RyaW5nfSBldmVudFxuICogQHBhcmFtICB7ZnVuY3Rpb259IGhhbmRsZXJcbiAqIEBwYXJhbSAge29iamVjdH0gY29udGV4dFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuUG9zdGVyQ2xhc3MucHJvdG90eXBlLm9uID0gZnVuY3Rpb24oZXZlbnQsIGhhbmRsZXIsIGNvbnRleHQpIHtcbiAgICBldmVudCA9IGV2ZW50LnRyaW0oKS50b0xvd2VyQ2FzZSgpO1xuXG4gICAgLy8gTWFrZSBzdXJlIGEgbGlzdCBmb3IgdGhlIGV2ZW50IGV4aXN0cy5cbiAgICBpZiAoIXRoaXMuX2V2ZW50c1tldmVudF0pIHsgdGhpcy5fZXZlbnRzW2V2ZW50XSA9IFtdOyB9XG5cbiAgICAvLyBQdXNoIHRoZSBoYW5kbGVyIGFuZCB0aGUgY29udGV4dCB0byB0aGUgZXZlbnQncyBjYWxsYmFjayBsaXN0LlxuICAgIHRoaXMuX2V2ZW50c1tldmVudF0ucHVzaChbaGFuZGxlciwgY29udGV4dF0pO1xufTtcblxuLyoqXG4gKiBVbnJlZ2lzdGVyIG9uZSBvciBhbGwgZXZlbnQgbGlzdGVuZXJzIGZvciBhIHNwZWNpZmljIGV2ZW50XG4gKiBAcGFyYW0gIHtzdHJpbmd9IGV2ZW50XG4gKiBAcGFyYW0gIHtjYWxsYmFja30gKG9wdGlvbmFsKSBoYW5kbGVyXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Qb3N0ZXJDbGFzcy5wcm90b3R5cGUub2ZmID0gZnVuY3Rpb24oZXZlbnQsIGhhbmRsZXIpIHtcbiAgICBldmVudCA9IGV2ZW50LnRyaW0oKS50b0xvd2VyQ2FzZSgpO1xuICAgIFxuICAgIC8vIElmIGEgaGFuZGxlciBpcyBzcGVjaWZpZWQsIHJlbW92ZSBhbGwgdGhlIGNhbGxiYWNrc1xuICAgIC8vIHdpdGggdGhhdCBoYW5kbGVyLiAgT3RoZXJ3aXNlLCBqdXN0IHJlbW92ZSBhbGwgb2ZcbiAgICAvLyB0aGUgcmVnaXN0ZXJlZCBjYWxsYmFja3MuXG4gICAgaWYgKGhhbmRsZXIpIHtcbiAgICAgICAgdGhpcy5fZXZlbnRzW2V2ZW50XSA9IHRoaXMuX2V2ZW50c1tldmVudF0uZmlsdGVyKGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2tbMF0gIT09IGhhbmRsZXI7XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2V2ZW50c1tldmVudF0gPSBbXTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFJlZ2lzdGVyIGEgZ2xvYmFsIGV2ZW50IGhhbmRsZXIuIFxuICogXG4gKiBBIGdsb2JhbCBldmVudCBoYW5kbGVyIGZpcmVzIGZvciBhbnkgZXZlbnQgdGhhdCdzXG4gKiB0cmlnZ2VyZWQuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGhhbmRsZXIgLSBmdW5jdGlvbiB0aGF0IGFjY2VwdHMgb25lXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcmd1bWVudCwgdGhlIG5hbWUgb2YgdGhlXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudCxcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblBvc3RlckNsYXNzLnByb3RvdHlwZS5vbl9hbGwgPSBmdW5jdGlvbihoYW5kbGVyKSB7XG4gICAgdmFyIGluZGV4ID0gdGhpcy5fb25fYWxsLmluZGV4T2YoaGFuZGxlcik7XG4gICAgaWYgKGluZGV4ID09PSAtMSkge1xuICAgICAgICB0aGlzLl9vbl9hbGwucHVzaChoYW5kbGVyKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFVucmVnaXN0ZXIgYSBnbG9iYWwgZXZlbnQgaGFuZGxlci5cbiAqIEBwYXJhbSAge1t0eXBlXX0gaGFuZGxlclxuICogQHJldHVybiB7Ym9vbGVhbn0gdHJ1ZSBpZiBhIGhhbmRsZXIgd2FzIHJlbW92ZWRcbiAqL1xuUG9zdGVyQ2xhc3MucHJvdG90eXBlLm9mZl9hbGwgPSBmdW5jdGlvbihoYW5kbGVyKSB7XG4gICAgdmFyIGluZGV4ID0gdGhpcy5fb25fYWxsLmluZGV4T2YoaGFuZGxlcik7XG4gICAgaWYgKGluZGV4ICE9IC0xKSB7XG4gICAgICAgIHRoaXMuX29uX2FsbC5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBUcmlnZ2VycyB0aGUgY2FsbGJhY2tzIG9mIGFuIGV2ZW50IHRvIGZpcmUuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGV2ZW50XG4gKiBAcmV0dXJuIHthcnJheX0gYXJyYXkgb2YgcmV0dXJuIHZhbHVlc1xuICovXG5Qb3N0ZXJDbGFzcy5wcm90b3R5cGUudHJpZ2dlciA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgZXZlbnQgPSBldmVudC50cmltKCkudG9Mb3dlckNhc2UoKTtcblxuICAgIC8vIENvbnZlcnQgYXJndW1lbnRzIHRvIGFuIGFycmF5IGFuZCBjYWxsIGNhbGxiYWNrcy5cbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgYXJncy5zcGxpY2UoMCwxKTtcblxuICAgIC8vIFRyaWdnZXIgZ2xvYmFsIGhhbmRsZXJzIGZpcnN0LlxuICAgIHRoaXMuX29uX2FsbC5mb3JFYWNoKGZ1bmN0aW9uKGhhbmRsZXIpIHtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBbZXZlbnRdLmNvbmNhdChhcmdzKSk7XG4gICAgfSk7XG5cbiAgICAvLyBUcmlnZ2VyIGluZGl2aWR1YWwgaGFuZGxlcnMgc2Vjb25kLlxuICAgIHZhciBldmVudHMgPSB0aGlzLl9ldmVudHNbZXZlbnRdO1xuICAgIGlmIChldmVudHMpIHtcbiAgICAgICAgdmFyIHJldHVybnMgPSBbXTtcbiAgICAgICAgZXZlbnRzLmZvckVhY2goZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHJldHVybnMucHVzaChjYWxsYmFja1swXS5hcHBseShjYWxsYmFja1sxXSwgYXJncykpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHJldHVybnM7XG4gICAgfVxuICAgIHJldHVybiBbXTtcbn07XG5cbi8qKlxuICogQ2F1c2Ugb25lIGNsYXNzIHRvIGluaGVyaXQgZnJvbSBhbm90aGVyXG4gKiBAcGFyYW0gIHt0eXBlfSBjaGlsZFxuICogQHBhcmFtICB7dHlwZX0gcGFyZW50XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG52YXIgaW5oZXJpdCA9IGZ1bmN0aW9uKGNoaWxkLCBwYXJlbnQpIHtcbiAgICBjaGlsZC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHBhcmVudC5wcm90b3R5cGUsIHt9KTtcbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIGEgdmFsdWUgaXMgY2FsbGFibGVcbiAqIEBwYXJhbSAge2FueX0gdmFsdWVcbiAqIEByZXR1cm4ge2Jvb2xlYW59XG4gKi9cbnZhciBjYWxsYWJsZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PSAnZnVuY3Rpb24nO1xufTtcblxuLyoqXG4gKiBDYWxscyB0aGUgdmFsdWUgaWYgaXQncyBjYWxsYWJsZSBhbmQgcmV0dXJucyBpdCdzIHJldHVybi5cbiAqIE90aGVyd2lzZSByZXR1cm5zIHRoZSB2YWx1ZSBhcy1pcy5cbiAqIEBwYXJhbSAge2FueX0gdmFsdWVcbiAqIEByZXR1cm4ge2FueX1cbiAqL1xudmFyIHJlc29sdmVfY2FsbGFibGUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGlmIChjYWxsYWJsZSh2YWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlLmNhbGwodGhpcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhIHByb3h5IHRvIGEgZnVuY3Rpb24gc28gaXQgaXMgY2FsbGVkIGluIHRoZSBjb3JyZWN0IGNvbnRleHQuXG4gKiBAcmV0dXJuIHtmdW5jdGlvbn0gcHJveGllZCBmdW5jdGlvbi5cbiAqL1xudmFyIHByb3h5ID0gZnVuY3Rpb24oZiwgY29udGV4dCkge1xuICAgIGlmIChmPT09dW5kZWZpbmVkKSB7IHRocm93IG5ldyBFcnJvcignZiBjYW5ub3QgYmUgdW5kZWZpbmVkJyk7IH1cbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7IHJldHVybiBmLmFwcGx5KGNvbnRleHQsIGFyZ3VtZW50cyk7IH07XG59O1xuXG4vKipcbiAqIENsZWFycyBhbiBhcnJheSBpbiBwbGFjZS5cbiAqXG4gKiBEZXNwaXRlIGFuIE8oTikgY29tcGxleGl0eSwgdGhpcyBzZWVtcyB0byBiZSB0aGUgZmFzdGVzdCB3YXkgdG8gY2xlYXJcbiAqIGEgbGlzdCBpbiBwbGFjZSBpbiBKYXZhc2NyaXB0LiBcbiAqIEJlbmNobWFyazogaHR0cDovL2pzcGVyZi5jb20vZW1wdHktamF2YXNjcmlwdC1hcnJheVxuICogQ29tcGxleGl0eTogTyhOKVxuICogQHBhcmFtICB7YXJyYXl9IGFycmF5XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG52YXIgY2xlYXJfYXJyYXkgPSBmdW5jdGlvbihhcnJheSkge1xuICAgIHdoaWxlIChhcnJheS5sZW5ndGggPiAwKSB7XG4gICAgICAgIGFycmF5LnBvcCgpO1xuICAgIH1cbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIGEgdmFsdWUgaXMgYW4gYXJyYXlcbiAqIEBwYXJhbSAge2FueX0geFxuICogQHJldHVybiB7Ym9vbGVhbn0gdHJ1ZSBpZiB2YWx1ZSBpcyBhbiBhcnJheVxuICovXG52YXIgaXNfYXJyYXkgPSBmdW5jdGlvbih4KSB7XG4gICAgcmV0dXJuIHggaW5zdGFuY2VvZiBBcnJheTtcbn07XG5cbi8qKlxuICogRmluZCB0aGUgY2xvc2VzdCB2YWx1ZSBpbiBhIGxpc3RcbiAqIFxuICogSW50ZXJwb2xhdGlvbiBzZWFyY2ggYWxnb3JpdGhtLiAgXG4gKiBDb21wbGV4aXR5OiBPKGxnKGxnKE4pKSlcbiAqIEBwYXJhbSAge2FycmF5fSBzb3J0ZWQgLSBzb3J0ZWQgYXJyYXkgb2YgbnVtYmVyc1xuICogQHBhcmFtICB7ZmxvYXR9IHggLSBudW1iZXIgdG8gdHJ5IHRvIGZpbmRcbiAqIEByZXR1cm4ge2ludGVnZXJ9IGluZGV4IG9mIHRoZSB2YWx1ZSB0aGF0J3MgY2xvc2VzdCB0byB4XG4gKi9cbnZhciBmaW5kX2Nsb3Nlc3QgPSBmdW5jdGlvbihzb3J0ZWQsIHgpIHtcbiAgICB2YXIgbWluID0gc29ydGVkWzBdO1xuICAgIHZhciBtYXggPSBzb3J0ZWRbc29ydGVkLmxlbmd0aC0xXTtcbiAgICBpZiAoeCA8IG1pbikgcmV0dXJuIDA7XG4gICAgaWYgKHggPiBtYXgpIHJldHVybiBzb3J0ZWQubGVuZ3RoLTE7XG4gICAgaWYgKHNvcnRlZC5sZW5ndGggPT0gMikge1xuICAgICAgICBpZiAobWF4IC0geCA+IHggLSBtaW4pIHtcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdmFyIHJhdGUgPSAobWF4IC0gbWluKSAvIHNvcnRlZC5sZW5ndGg7XG4gICAgaWYgKHJhdGUgPT09IDApIHJldHVybiAwO1xuICAgIHZhciBndWVzcyA9IE1hdGguZmxvb3IoeCAvIHJhdGUpO1xuICAgIGlmIChzb3J0ZWRbZ3Vlc3NdID09IHgpIHtcbiAgICAgICAgcmV0dXJuIGd1ZXNzO1xuICAgIH0gZWxzZSBpZiAoZ3Vlc3MgPiAwICYmIHNvcnRlZFtndWVzcy0xXSA8IHggJiYgeCA8IHNvcnRlZFtndWVzc10pIHtcbiAgICAgICAgcmV0dXJuIGZpbmRfY2xvc2VzdChzb3J0ZWQuc2xpY2UoZ3Vlc3MtMSwgZ3Vlc3MrMSksIHgpICsgZ3Vlc3MtMTtcbiAgICB9IGVsc2UgaWYgKGd1ZXNzIDwgc29ydGVkLmxlbmd0aC0xICYmIHNvcnRlZFtndWVzc10gPCB4ICYmIHggPCBzb3J0ZWRbZ3Vlc3MrMV0pIHtcbiAgICAgICAgcmV0dXJuIGZpbmRfY2xvc2VzdChzb3J0ZWQuc2xpY2UoZ3Vlc3MsIGd1ZXNzKzIpLCB4KSArIGd1ZXNzO1xuICAgIH0gZWxzZSBpZiAoc29ydGVkW2d1ZXNzXSA+IHgpIHtcbiAgICAgICAgcmV0dXJuIGZpbmRfY2xvc2VzdChzb3J0ZWQuc2xpY2UoMCwgZ3Vlc3MpLCB4KTtcbiAgICB9IGVsc2UgaWYgKHNvcnRlZFtndWVzc10gPCB4KSB7XG4gICAgICAgIHJldHVybiBmaW5kX2Nsb3Nlc3Qoc29ydGVkLnNsaWNlKGd1ZXNzKzEpLCB4KSArIGd1ZXNzKzE7XG4gICAgfVxufTtcblxuLyoqXG4gKiBNYWtlIGEgc2hhbGxvdyBjb3B5IG9mIGEgZGljdGlvbmFyeS5cbiAqIEBwYXJhbSAge2RpY3Rpb25hcnl9IHhcbiAqIEByZXR1cm4ge2RpY3Rpb25hcnl9XG4gKi9cbnZhciBzaGFsbG93X2NvcHkgPSBmdW5jdGlvbih4KSB7XG4gICAgdmFyIHkgPSB7fTtcbiAgICBmb3IgKHZhciBrZXkgaW4geCkge1xuICAgICAgICBpZiAoeC5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICB5W2tleV0gPSB4W2tleV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHk7XG59O1xuXG4vKipcbiAqIEhvb2tzIGEgZnVuY3Rpb24uXG4gKiBAcGFyYW0gIHtvYmplY3R9IG9iaiAtIG9iamVjdCB0byBob29rXG4gKiBAcGFyYW0gIHtzdHJpbmd9IG1ldGhvZCAtIG5hbWUgb2YgdGhlIGZ1bmN0aW9uIHRvIGhvb2tcbiAqIEBwYXJhbSAge2Z1bmN0aW9ufSBob29rIC0gZnVuY3Rpb24gdG8gY2FsbCBiZWZvcmUgdGhlIG9yaWdpbmFsXG4gKiBAcmV0dXJuIHtvYmplY3R9IGhvb2sgcmVmZXJlbmNlLCBvYmplY3Qgd2l0aCBhbiBgdW5ob29rYCBtZXRob2RcbiAqL1xudmFyIGhvb2sgPSBmdW5jdGlvbihvYmosIG1ldGhvZCwgaG9vaykge1xuXG4gICAgLy8gSWYgdGhlIG9yaWdpbmFsIGhhcyBhbHJlYWR5IGJlZW4gaG9va2VkLCBhZGQgdGhpcyBob29rIHRvIHRoZSBsaXN0IFxuICAgIC8vIG9mIGhvb2tzLlxuICAgIGlmIChvYmpbbWV0aG9kXSAmJiBvYmpbbWV0aG9kXS5vcmlnaW5hbCAmJiBvYmpbbWV0aG9kXS5ob29rcykge1xuICAgICAgICBvYmpbbWV0aG9kXS5ob29rcy5wdXNoKGhvb2spO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIENyZWF0ZSB0aGUgaG9va2VkIGZ1bmN0aW9uXG4gICAgICAgIHZhciBob29rcyA9IFtob29rXTtcbiAgICAgICAgdmFyIG9yaWdpbmFsID0gb2JqW21ldGhvZF07XG4gICAgICAgIHZhciBob29rZWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgICAgICAgdmFyIHJldDtcbiAgICAgICAgICAgIHZhciByZXN1bHRzO1xuICAgICAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICAgICAgaG9va3MuZm9yRWFjaChmdW5jdGlvbihob29rKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0cyA9IGhvb2suYXBwbHkodGhhdCwgYXJncyk7XG4gICAgICAgICAgICAgICAgcmV0ID0gcmV0ICE9PSB1bmRlZmluZWQgPyByZXQgOiByZXN1bHRzO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAob3JpZ2luYWwpIHtcbiAgICAgICAgICAgICAgICByZXN1bHRzID0gb3JpZ2luYWwuYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmV0ICE9PSB1bmRlZmluZWQgPyByZXQgOiByZXN1bHRzO1xuICAgICAgICB9O1xuICAgICAgICBob29rZWQub3JpZ2luYWwgPSBvcmlnaW5hbDtcbiAgICAgICAgaG9va2VkLmhvb2tzID0gaG9va3M7XG4gICAgICAgIG9ialttZXRob2RdID0gaG9va2VkO1xuICAgIH1cblxuICAgIC8vIFJldHVybiB1bmhvb2sgbWV0aG9kLlxuICAgIHJldHVybiB7XG4gICAgICAgIHVuaG9vazogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgaW5kZXggPSBvYmpbbWV0aG9kXS5ob29rcy5pbmRleE9mKGhvb2spO1xuICAgICAgICAgICAgaWYgKGluZGV4ICE9IC0xKSB7XG4gICAgICAgICAgICAgICAgb2JqW21ldGhvZF0uaG9va3Muc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKG9ialttZXRob2RdLmhvb2tzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIG9ialttZXRob2RdID0gb2JqW21ldGhvZF0ub3JpZ2luYWw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgfTtcbiAgICBcbn07XG5cbi8qKlxuICogQ2FuY2VscyBldmVudCBidWJibGluZy5cbiAqIEBwYXJhbSAge2V2ZW50fSBlXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG52YXIgY2FuY2VsX2J1YmJsZSA9IGZ1bmN0aW9uKGUpIHtcbiAgICBpZiAoZS5zdG9wUHJvcGFnYXRpb24pIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgaWYgKGUuY2FuY2VsQnViYmxlICE9PSBudWxsKSBlLmNhbmNlbEJ1YmJsZSA9IHRydWU7XG4gICAgaWYgKGUucHJldmVudERlZmF1bHQpIGUucHJldmVudERlZmF1bHQoKTtcbn07XG5cbi8qKlxuICogR2VuZXJhdGVzIGEgcmFuZG9tIGNvbG9yIHN0cmluZ1xuICogQHJldHVybiB7c3RyaW5nfSBoZXhhZGVjaW1hbCBjb2xvciBzdHJpbmdcbiAqL1xudmFyIHJhbmRvbV9jb2xvciA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciByYW5kb21fYnl0ZSA9IGZ1bmN0aW9uKCkgeyBcbiAgICAgICAgdmFyIGIgPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAyNTUpLnRvU3RyaW5nKDE2KTtcbiAgICAgICAgcmV0dXJuIGIubGVuZ3RoID09IDEgPyAnMCcgKyBiIDogYjtcbiAgICB9O1xuICAgIHJldHVybiAnIycgKyByYW5kb21fYnl0ZSgpICsgcmFuZG9tX2J5dGUoKSArIHJhbmRvbV9ieXRlKCk7XG59O1xuXG4vKipcbiAqIENvbXBhcmUgdHdvIGFycmF5cyBieSBjb250ZW50cyBmb3IgZXF1YWxpdHkuXG4gKiBAcGFyYW0gIHthcnJheX0geFxuICogQHBhcmFtICB7YXJyYXl9IHlcbiAqIEByZXR1cm4ge2Jvb2xlYW59XG4gKi9cbnZhciBjb21wYXJlX2FycmF5cyA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICBpZiAoeC5sZW5ndGggIT0geS5sZW5ndGgpIHJldHVybiBmYWxzZTtcbiAgICBmb3IgKGk9MDsgaTx4Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmICh4W2ldIT09eVtpXSkgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogRmluZCBhbGwgdGhlIG9jY3VyYW5jZXMgb2YgYSByZWd1bGFyIGV4cHJlc3Npb24gaW5zaWRlIGEgc3RyaW5nLlxuICogQHBhcmFtICB7c3RyaW5nfSB0ZXh0IC0gc3RyaW5nIHRvIGxvb2sgaW5cbiAqIEBwYXJhbSAge3N0cmluZ30gcmUgLSByZWd1bGFyIGV4cHJlc3Npb24gdG8gZmluZFxuICogQHJldHVybiB7YXJyYXl9IGFycmF5IG9mIFtzdGFydF9pbmRleCwgZW5kX2luZGV4XSBwYWlyc1xuICovXG52YXIgZmluZGFsbCA9IGZ1bmN0aW9uKHRleHQsIHJlLCBmbGFncykge1xuICAgIHJlID0gbmV3IFJlZ0V4cChyZSwgZmxhZ3MgfHwgJ2dtJyk7XG4gICAgdmFyIHJlc3VsdHM7XG4gICAgdmFyIGZvdW5kID0gW107XG4gICAgd2hpbGUgKChyZXN1bHRzID0gcmUuZXhlYyh0ZXh0KSkgIT09IG51bGwpIHtcbiAgICAgICAgdmFyIGVuZF9pbmRleCA9IHJlc3VsdHMuaW5kZXggKyAocmVzdWx0c1swXS5sZW5ndGggfHwgMSk7XG4gICAgICAgIGZvdW5kLnB1c2goW3Jlc3VsdHMuaW5kZXgsIGVuZF9pbmRleF0pO1xuICAgICAgICByZS5sYXN0SW5kZXggPSBNYXRoLm1heChlbmRfaW5kZXgsIHJlLmxhc3RJbmRleCk7XG4gICAgfVxuICAgIHJldHVybiBmb3VuZDtcbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIHRoZSBjaGFyYWN0ZXIgaXNuJ3QgdGV4dC5cbiAqIEBwYXJhbSAge2NoYXJ9IGMgLSBjaGFyYWN0ZXJcbiAqIEByZXR1cm4ge2Jvb2xlYW59IHRydWUgaWYgdGhlIGNoYXJhY3RlciBpcyBub3QgdGV4dC5cbiAqL1xudmFyIG5vdF90ZXh0ID0gZnVuY3Rpb24oYykge1xuICAgIHJldHVybiAnYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY3ODkwXycuaW5kZXhPZihjLnRvTG93ZXJDYXNlKCkpID09IC0xO1xufTtcblxuLyoqXG4gKiBNZXJnZXMgb2JqZWN0c1xuICogQHBhcmFtICB7YXJyYXl9IG9iamVjdHNcbiAqIEByZXR1cm4ge29iamVjdH0gbmV3IG9iamVjdCwgcmVzdWx0IG9mIG1lcmdlZCBvYmplY3RzXG4gKi9cbnZhciBtZXJnZSA9IGZ1bmN0aW9uKG9iamVjdHMpIHtcbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvYmplY3RzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBvYmplY3RzW2ldKSB7XG4gICAgICAgICAgICBpZiAob2JqZWN0c1tpXS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0W2tleV0gPSBvYmplY3RzW2ldW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbi8vIEV4cG9ydCBuYW1lcy5cbmV4cG9ydHMuUG9zdGVyQ2xhc3MgPSBQb3N0ZXJDbGFzcztcbmV4cG9ydHMuaW5oZXJpdCA9IGluaGVyaXQ7XG5leHBvcnRzLmNhbGxhYmxlID0gY2FsbGFibGU7XG5leHBvcnRzLnJlc29sdmVfY2FsbGFibGUgPSByZXNvbHZlX2NhbGxhYmxlO1xuZXhwb3J0cy5wcm94eSA9IHByb3h5O1xuZXhwb3J0cy5jbGVhcl9hcnJheSA9IGNsZWFyX2FycmF5O1xuZXhwb3J0cy5pc19hcnJheSA9IGlzX2FycmF5O1xuZXhwb3J0cy5maW5kX2Nsb3Nlc3QgPSBmaW5kX2Nsb3Nlc3Q7XG5leHBvcnRzLnNoYWxsb3dfY29weSA9IHNoYWxsb3dfY29weTtcbmV4cG9ydHMuaG9vayA9IGhvb2s7XG5leHBvcnRzLmNhbmNlbF9idWJibGUgPSBjYW5jZWxfYnViYmxlO1xuZXhwb3J0cy5yYW5kb21fY29sb3IgPSByYW5kb21fY29sb3I7XG5leHBvcnRzLmNvbXBhcmVfYXJyYXlzID0gY29tcGFyZV9hcnJheXM7XG5leHBvcnRzLmZpbmRhbGwgPSBmaW5kYWxsO1xuZXhwb3J0cy5ub3RfdGV4dCA9IG5vdF90ZXh0O1xuZXhwb3J0cy5tZXJnZSA9IG1lcmdlO1xuIl19
