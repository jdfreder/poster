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

},{"./canvas.js":4,"./config.js":6,"./document_controller.js":9,"./document_model.js":10,"./document_view.js":11,"./plugins/manager.js":22,"./plugins/plugin.js":23,"./renderers/renderer.js":28,"./scrolling_canvas.js":31,"./style.js":32,"./utils.js":35}],2:[function(require,module,exports){
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
},{"./utils.js":35}],4:[function(require,module,exports){
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
 * 
 * @return {null}
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
 * @return {null}
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
     */
    this.property('rendered_region', function() {
        return {
            x: this._tx(this._rendered_region[0], true),
            y: this._ty(this._rendered_region[1], true),
            width: this._rendered_region[2] - this._rendered_region[0],
            height: this._rendered_region[3] - this._rendered_region[1],
        };
    });
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
 * @return {null}
 */
Canvas.prototype.draw_rectangle = function(x, y, width, height, options) {
    x = this._tx(x);
    y = this._ty(y);
    this.context.beginPath();
    this.context.rect(x, y, width, height);
    this._do_draw(options);
    this._touch(x, y, x+width, y+height);
};

/**
 * Draws a circle
 * @param  {float} x
 * @param  {float} y
 * @param  {float} r
 * @param  {dictionary} options, see _apply_options() for details
 * @return {null}
 */
Canvas.prototype.draw_circle = function(x, y, r, options) {
    x = this._tx(x);
    y = this._ty(y);
    this.context.beginPath();
    this.context.arc(x, y, r, 0, 2 * Math.PI);
    this._do_draw(options);
    this._touch(x-r, y-r, x+r, y+r);
};

/**
 * Draws an image
 * @param  {img element} img
 * @param  {float} x
 * @param  {float} y
 * @param  {float} (optional) width
 * @param  {float} (optional) height
 * @return {null}
 */
Canvas.prototype.draw_image = function(img, x, y, width, height) {
    x = this._tx(x);
    y = this._ty(y);
    width = width || img.width;
    height = height || img.height;
    img = img._canvas ? img._canvas : img;
    this.context.drawImage(img, x, y, width, height);
    this._touch(x, y, this.width, this.height);
};

/**
 * Draws a line
 * @param  {float} x1
 * @param  {float} y1
 * @param  {float} x2
 * @param  {float} y2
 * @param  {dictionary} options, see _apply_options() for details
 * @return {null}
 */
Canvas.prototype.draw_line = function(x1, y1, x2, y2, options) {
    x1 = this._tx(x1);
    y1 = this._ty(y1);
    x2 = this._tx(x2);
    y2 = this._ty(y2);
    this.context.beginPath();
    this.context.moveTo(x1, y1);
    this.context.lineTo(x2, y2);
    this._do_draw(options);
    this._touch(x1, y1, x2, y2);
};

/**
 * Draws a poly line
 * @param  {array} points - array of points.  Each point is
 *                          an array itself, of the form [x, y] 
 *                          where x and y are floating point
 *                          values.
 * @param  {dictionary} options, see _apply_options() for details
 * @return {null}
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
            this.context.lineTo(this._tx(point[0]), this._ty(point[1]));

            minx = Math.min(this._tx(point[0]), minx);
            miny = Math.min(this._ty(point[1]), miny);
            maxx = Math.max(this._tx(point[0]), maxx);
            maxy = Math.max(this._ty(point[1]), maxy);
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
 * @return {null}
 */
Canvas.prototype.draw_text = function(x, y, text, options) {
    x = this._tx(x);
    y = this._ty(y);
    text = this._process_tabs(text);
    options = this._apply_options(options);
    // 'fill' the text by default when neither a stroke or fill 
    // is defined.  Otherwise only fill if a fill is defined.
    if (options.fill || !options.stroke) {
        this.context.fillText(text, x, y);
    }
    // Only stroke if a stroke is defined.
    if (options.stroke) {
        this.context.strokeText(text, x, y);       
    }
    this._touch(x, y, this.width, this.height);
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
    x = this._tx(x);
    y = this._ty(y);
    // Multiply by two for pixel doubling.
    ret = this.context.putImageData(img, x*2, y*2);
    this._touch(x, y, this.width, this.height);
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
 * @return {null}
 */
Canvas.prototype.clear = function() {
    this.context.clearRect(0, 0, this.width, this.height);
    this._touch();
};

/**
 * Scale the current drawing.
 * @param  {float} x
 * @param  {float} y
 * @return {null}  
 */
Canvas.prototype.scale = function(x, y) {
    this.context.scale(x, y);
    this._touch();
};

/**
 * Finishes the drawing operation using the set of provided options.
 * @param  {dictionary} (optional) dictionary that 
 *  resolves to a dictionary.
 * @return {null}
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
 *      font {string} Overriddes all other font properties.
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
    set_options.globalAlpha = options.alpha===undefined ? 1.0 : options.alpha;
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
    var font_size = pixels(options.font_size) || '12px';
    var font_family = options.font_family || 'Arial';
    var font = font_style + ' ' + font_variant + ' ' + font_weight + ' ' + font_size + ' ' + font_family;
    set_options.font = options.font || font;

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
 * @return {null}
 */
Canvas.prototype._touch = function(x1, y1, x2, y2) {
    this._modified = Date.now();

    // Set the render region.
    var comparitor = function(old_value, new_value, comparison) {
        if (old_value === null || old_value === undefined || new_value === null || new_value === undefined) {
            return new_value;
        } else {
            return comparison.call(undefined, old_value, new_value);
        }
    };
    this._rendered_region[0] = comparitor(this._rendered_region[0], x1, Math.min);
    this._rendered_region[1] = comparitor(this._rendered_region[1], y1, Math.min);
    this._rendered_region[2] = comparitor(this._rendered_region[2], x2, Math.max);
    this._rendered_region[3] = comparitor(this._rendered_region[3], y2, Math.max);
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

},{"./config.js":6,"./utils.js":35}],5:[function(require,module,exports){
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

},{"./utils.js":35}],6:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('./utils.js');
var config = new utils.PosterClass([
    'highlight_draw', // boolean - Whether or not to highlight re-renders
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

},{"./utils.js":35}],7:[function(require,module,exports){
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
},{"./config.js":6,"./events/map.js":13,"./utils.js":35}],8:[function(require,module,exports){
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

},{"./cursor.js":7,"./events/map.js":13,"./utils.js":35}],9:[function(require,module,exports){
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

},{"./clipboard.js":5,"./cursors.js":8,"./events/default.js":12,"./events/map.js":13,"./events/normalizer.js":14,"./history.js":17,"./utils.js":35}],10:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('./utils.js');

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
DocumentModel.prototype.trigger_tag_events = function() {
    if (this._tag_lock === 0) {
        this.trigger('tags_changed');
        this.trigger('changed');    
    } else {
        this._pending_tag_events = true;
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
    for (var row = coords.start_row; row <= coords.end_row; row++) {
        var start = coords.start_char;
        var end = coords.end_char;
        if (row > coords.start_row) { start = -1; }
        if (row < coords.end_row) { end = -1; }

        // Remove or modify conflicting tags.
        var add_tags = [];
        this._row_tags[row].filter(function(tag) {
            if (tag.name == tag_name) {
                // Check if tag is within
                if (start == -1 && end == -1) {
                    return false;
                }
                if (tag.start >= start && (tag.end < end || end == -1)) {
                    return false;
                }
                
                // Check if tag is outside
                // To the right?
                if (tag.start > end && end != -1) {
                    return true;
                }
                // To the left?
                if (tag.end < start && tag.end != -1) {
                    return true;
                }

                // Check if tag encapsulates
                var left_intersecting = tag.start < start;
                var right_intersecting = end != -1 && (tag.end == -1 || tag.end > end);

                // Check if tag is left intersecting
                if (left_intersecting) {
                    add_tags.push({name: tag_name, value: tag.value, start: tag.start, end: start-1});
                }

                // Check if tag is right intersecting
                if (right_intersecting) {
                    add_tags.push({name: tag_name, value: tag.value, start: end+1, end: tag.end});
                }
                return false;
            }
        });
        
        // Add tags and corrected tags.
        this._row_tags[row] = this._row_tags[row].concat(add_tags);
        this._row_tags[row].push({name: tag_name, value: tag_value, start: start, end: end});
    }
    this.trigger_tag_events();
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
    for (var i = start_row; i <= end_row; i++) {
        this._row_tags[i] = [];
    }
    this.trigger_tag_events();
};

/**
 * Get the tags applied to a character.
 * @param  {integer} row_index
 * @param  {integer} char_index
 * @return {dictionary}
 */
DocumentModel.prototype.get_tags = function(row_index, char_index) {
    var coords = this.validate_coords.apply(this, arguments);
    var tags = {};
    this._row_tags[coords.start_row].forEach(function(tag) {
        // Tag start of -1 means the tag continues to the previous line.
        var after_start = (coords.start_char >= tag.start || tag.start == -1);
        // Tag end of -1 means the tag continues to the next line.
        var before_end = (coords.start_char <= tag.end || tag.end == -1);
        if (after_start && before_end) {
            tags[tag.name] = tag.value;
        }
    });
    return tags;
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
        this._row_tags.push([]);
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
},{"./utils.js":35}],11:[function(require,module,exports){
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
},{"./highlighters/prism.js":16,"./renderers/batch.js":24,"./renderers/color.js":25,"./renderers/cursors.js":26,"./renderers/highlighted_row.js":27,"./renderers/selections.js":30,"./utils.js":35}],12:[function(require,module,exports){
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

},{"../utils.js":35}],14:[function(require,module,exports){
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

},{"../utils.js":35}],15:[function(require,module,exports){
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

},{"../utils.js":35}],16:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var utils = require('../utils.js');
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
    this._row_padding = 15;
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

    // Clear the old highlighting.
    this._model.clear_tags(start_row, end_row);

    // Abort if language isn't specified.
    if (!this._language) return;
    
    // Get the text of the rows.
    var text = this._model.get_text(start_row, 0, end_row, this._model._rows[end_row].length);

    // Figure out where each tag belongs.
    var highlights = this._highlight(text); // [start_index, end_index, tag]
    
    // Apply tags
    var that = this;
    highlights.forEach(function(highlight) {

        // Translate tag character indicies to row, char coordinates.
        var before_rows = text.substring(0, highlight[0]).split('\n');
        var group_start_row = start_row + before_rows.length - 1;
        var group_start_char = before_rows[before_rows.length - 1].length;
        var after_rows = text.substring(0, highlight[1] - 1).split('\n');
        var group_end_row = start_row + after_rows.length - 1;
        var group_end_char = after_rows[after_rows.length - 1].length;

        // Apply tag.
        var tag = highlight[2].toLowerCase();
        that._model.set_tag(group_start_row, group_start_char, group_end_row, group_end_char, 'syntax', tag);
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
    return tags;
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

},{"../../components/prism.js":2,"../utils.js":35,"./highlighter.js":15}],17:[function(require,module,exports){
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
    console.log('undoing something', undo);

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

},{"./events/map.js":13,"./utils.js":35}],18:[function(require,module,exports){
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
    }, function(value) {
        if (that.loaded) {
            this.poster.view.row_renderer.margin_left += value - this._gutter_width;
        }
        that._gutter_width = value;
        that.trigger('changed');
    });
};
utils.inherit(Gutter, plugin.PluginBase);

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

},{"../../utils.js":35,"../plugin.js":23,"./renderer.js":19}],19:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var renderer = require('../../renderers/renderer.js');
var utils = require('../../utils.js');

/**
 * Renderers the gutter.
 */
var GutterRenderer = function(gutter) {
    renderer.RendererBase.call(this, undefined, {parent_independent: true});
    this._gutter  = gutter;
    this._gutter.on('changed', this._render, this);
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

},{"../../renderers/renderer.js":28,"../../utils.js":35}],20:[function(require,module,exports){
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

},{"../../utils.js":35,"../plugin.js":23,"./renderer.js":21}],21:[function(require,module,exports){
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

    // Find gutter plugin, listen to its change event.
    var manager = this._plugin.poster.plugins;
    this._gutter = manager.find('gutter')[0];
    this._gutter.on('changed', this._gutter_resize, this);

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
    });
    this.height = this.height;
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
    // Update the text buffer if needed.
    var top_row = this._row_renderer.get_row_char(0, this._top).row_index;
    if (this._top_row !== top_row) {
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
    for (var i = start_row; i < start_row + num_rows; i++) {
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

};

/**
 * Handles when the gutter is resized
 */
LineNumbersRenderer.prototype._gutter_resize = function() {
    this._text_canvas.width = this._gutter.gutter_width;
    this._tmp_canvas.width = this._gutter.gutter_width; 
    this._top_row = null;
    this.rerender();
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

},{"../../canvas.js":4,"../../renderers/renderer.js":28,"../../utils.js":35}],22:[function(require,module,exports){
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

},{"../utils.js":35,"./gutter/gutter.js":18,"./linenumbers/linenumbers.js":20,"./plugin.js":23}],23:[function(require,module,exports){
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

},{"../utils.js":35}],24:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('../utils.js');
var renderer = require('./renderer.js');

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
            that._copy_renderers();
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
        that._copy_renderers();
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

            this._renderers.forEach(function(renderer) {
                 // Tell the renderer to render itself.
                renderer.render(scroll);
            });

            // Copy the results to self.
            this._copy_renderers();
        } finally {
            this._render_lock = false;
        }
    }
};

/**
 * Copies all the renderer layers to the canvas.
 * @return {null}
 */
BatchRenderer.prototype._copy_renderers = function() {
    var that = this;
    this._canvas.clear();
    this._renderers.forEach(function(renderer) {
        that._copy_renderer(renderer);
    });
};

/**
 * Copy a renderer to the canvas.
 * @param  {RendererBase} renderer
 * @return {null}
 */
BatchRenderer.prototype._copy_renderer = function(renderer) {
    this._canvas.draw_image(
        renderer._canvas, 
        this.left, 
        this.top, 
        this._canvas.width, 
        this._canvas.height);
};

// Exports
exports.BatchRenderer = BatchRenderer;

},{"../utils.js":35,"./renderer.js":28}],25:[function(require,module,exports){
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

},{"../utils.js":35,"./renderer.js":28}],26:[function(require,module,exports){
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
CursorsRenderer.prototype.render = function() {
    this._canvas.clear();

    // Only render if the canvas has focus.
    if (this._has_focus() && this._blink_animator.time() < 0.5) {
        var that = this;
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
                that._canvas.draw_rectangle(
                    char_index === 0 ? that._row_renderer.margin_left : that._measure_partial_row(row_index, char_index) + that._row_renderer.margin_left, 
                    that._get_row_top(row_index) + offset, 
                    that.style.cursor_width===undefined ? 1.0 : that.style.cursor_width, 
                    height, 
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

},{"../animator.js":3,"../utils.js":35,"./renderer.js":28}],27:[function(require,module,exports){
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
        var syntax = this._model.get_tags(index, char_index).syntax;
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

},{"../config.js":6,"../utils.js":35,"./row.js":29}],28:[function(require,module,exports){
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

},{"../canvas.js":4,"../utils.js":35}],29:[function(require,module,exports){
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
        that._margin_left = value;

        // Force the document to recalculate its size.
        that._handle_value_changed();

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

},{"../canvas.js":4,"../utils.js":35,"./renderer.js":28}],30:[function(require,module,exports){
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
SelectionsRenderer.prototype.render = function() {
    this._canvas.clear();

    // Get newline width.
    var newline_width = config.newline_width;
    if (newline_width === undefined || newline_width === null) {
        newline_width = 2;
    }

    // Only render if the canvas has focus.
    var that = this;
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

                var right;
                if (i !== cursor.end_row) {
                    right = that._measure_partial_row(i) - left + that._row_renderer.margin_left + newline_width;
                } else {
                    right = that._measure_partial_row(i, cursor.end_char);

                    // If this isn't the first selected row, make sure atleast the newline
                    // is visibily selected at the beginning of the row by making sure that
                    // the selection box is atleast the size of a newline character (as
                    // defined by the user config).
                    if (i !== cursor.start_row) {
                        right = Math.max(newline_width, right);
                    }

                    right = right - left + that._row_renderer.margin_left;
                }
                
                that._canvas.draw_rectangle(
                    left, 
                    that._get_row_top(i), 
                    right, 
                    that._get_row_height(i), 
                    {
                        fill_color: selection_color,
                    }
                );
            }
        }
    });
};

// Exports
exports.SelectionsRenderer = SelectionsRenderer;

},{"../animator.js":3,"../config.js":6,"../utils.js":35,"./renderer.js":28}],31:[function(require,module,exports){
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

},{"./canvas.js":4,"./utils.js":35}],32:[function(require,module,exports){
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
},{"./styles/init.js":33,"./utils.js":35}],33:[function(require,module,exports){
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
    selection: '#ff5d38',
    selection_unfocused: '#ef4d28',

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

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzb3VyY2UvanMvcG9zdGVyLmpzIiwic291cmNlL2NvbXBvbmVudHMvcHJpc20uanMiLCJzb3VyY2UvanMvYW5pbWF0b3IuanMiLCJzb3VyY2UvanMvY2FudmFzLmpzIiwic291cmNlL2pzL2NsaXBib2FyZC5qcyIsInNvdXJjZS9qcy9jb25maWcuanMiLCJzb3VyY2UvanMvY3Vyc29yLmpzIiwic291cmNlL2pzL2N1cnNvcnMuanMiLCJzb3VyY2UvanMvZG9jdW1lbnRfY29udHJvbGxlci5qcyIsInNvdXJjZS9qcy9kb2N1bWVudF9tb2RlbC5qcyIsInNvdXJjZS9qcy9kb2N1bWVudF92aWV3LmpzIiwic291cmNlL2pzL2V2ZW50cy9kZWZhdWx0LmpzIiwic291cmNlL2pzL2V2ZW50cy9tYXAuanMiLCJzb3VyY2UvanMvZXZlbnRzL25vcm1hbGl6ZXIuanMiLCJzb3VyY2UvanMvaGlnaGxpZ2h0ZXJzL2hpZ2hsaWdodGVyLmpzIiwic291cmNlL2pzL2hpZ2hsaWdodGVycy9wcmlzbS5qcyIsInNvdXJjZS9qcy9oaXN0b3J5LmpzIiwic291cmNlL2pzL3BsdWdpbnMvZ3V0dGVyL2d1dHRlci5qcyIsInNvdXJjZS9qcy9wbHVnaW5zL2d1dHRlci9yZW5kZXJlci5qcyIsInNvdXJjZS9qcy9wbHVnaW5zL2xpbmVudW1iZXJzL2xpbmVudW1iZXJzLmpzIiwic291cmNlL2pzL3BsdWdpbnMvbGluZW51bWJlcnMvcmVuZGVyZXIuanMiLCJzb3VyY2UvanMvcGx1Z2lucy9tYW5hZ2VyLmpzIiwic291cmNlL2pzL3BsdWdpbnMvcGx1Z2luLmpzIiwic291cmNlL2pzL3JlbmRlcmVycy9iYXRjaC5qcyIsInNvdXJjZS9qcy9yZW5kZXJlcnMvY29sb3IuanMiLCJzb3VyY2UvanMvcmVuZGVyZXJzL2N1cnNvcnMuanMiLCJzb3VyY2UvanMvcmVuZGVyZXJzL2hpZ2hsaWdodGVkX3Jvdy5qcyIsInNvdXJjZS9qcy9yZW5kZXJlcnMvcmVuZGVyZXIuanMiLCJzb3VyY2UvanMvcmVuZGVyZXJzL3Jvdy5qcyIsInNvdXJjZS9qcy9yZW5kZXJlcnMvc2VsZWN0aW9ucy5qcyIsInNvdXJjZS9qcy9zY3JvbGxpbmdfY2FudmFzLmpzIiwic291cmNlL2pzL3N0eWxlLmpzIiwic291cmNlL2pzL3N0eWxlcy9pbml0LmpzIiwic291cmNlL2pzL3N0eWxlcy9wZWFjb2NrLmpzIiwic291cmNlL2pzL3V0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwa0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6aEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1UEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9UQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDelBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xFQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciBzY3JvbGxpbmdfY2FudmFzID0gcmVxdWlyZSgnLi9zY3JvbGxpbmdfY2FudmFzLmpzJyk7XG52YXIgY2FudmFzID0gcmVxdWlyZSgnLi9jYW52YXMuanMnKTtcbnZhciBkb2N1bWVudF9jb250cm9sbGVyID0gcmVxdWlyZSgnLi9kb2N1bWVudF9jb250cm9sbGVyLmpzJyk7XG52YXIgZG9jdW1lbnRfbW9kZWwgPSByZXF1aXJlKCcuL2RvY3VtZW50X21vZGVsLmpzJyk7XG52YXIgZG9jdW1lbnRfdmlldyA9IHJlcXVpcmUoJy4vZG9jdW1lbnRfdmlldy5qcycpO1xudmFyIHBsdWdpbm1hbmFnZXIgPSByZXF1aXJlKCcuL3BsdWdpbnMvbWFuYWdlci5qcycpO1xudmFyIHBsdWdpbiA9IHJlcXVpcmUoJy4vcGx1Z2lucy9wbHVnaW4uanMnKTtcbnZhciByZW5kZXJlciA9IHJlcXVpcmUoJy4vcmVuZGVyZXJzL3JlbmRlcmVyLmpzJyk7XG52YXIgc3R5bGUgPSByZXF1aXJlKCcuL3N0eWxlLmpzJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG52YXIgY29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcuanMnKTtcbmNvbmZpZyA9IGNvbmZpZy5jb25maWc7XG5cbi8qKlxuICogQ2FudmFzIGJhc2VkIHRleHQgZWRpdG9yXG4gKi9cbnZhciBQb3N0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuXG4gICAgLy8gQ3JlYXRlIGNhbnZhc1xuICAgIHRoaXMuY2FudmFzID0gbmV3IHNjcm9sbGluZ19jYW52YXMuU2Nyb2xsaW5nQ2FudmFzKCk7XG4gICAgdGhpcy5lbCA9IHRoaXMuY2FudmFzLmVsOyAvLyBDb252ZW5pZW5jZVxuICAgIHRoaXMuX3N0eWxlID0gbmV3IHN0eWxlLlN0eWxlKCk7XG5cbiAgICAvLyBDcmVhdGUgbW9kZWwsIGNvbnRyb2xsZXIsIGFuZCB2aWV3LlxuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLm1vZGVsID0gbmV3IGRvY3VtZW50X21vZGVsLkRvY3VtZW50TW9kZWwoKTtcbiAgICB0aGlzLmNvbnRyb2xsZXIgPSBuZXcgZG9jdW1lbnRfY29udHJvbGxlci5Eb2N1bWVudENvbnRyb2xsZXIodGhpcy5jYW52YXMuZWwsIHRoaXMubW9kZWwpO1xuICAgIHRoaXMudmlldyA9IG5ldyBkb2N1bWVudF92aWV3LkRvY3VtZW50VmlldyhcbiAgICAgICAgdGhpcy5jYW52YXMsIFxuICAgICAgICB0aGlzLm1vZGVsLCBcbiAgICAgICAgdGhpcy5jb250cm9sbGVyLmN1cnNvcnMsIFxuICAgICAgICB0aGlzLl9zdHlsZSxcbiAgICAgICAgZnVuY3Rpb24oKSB7IHJldHVybiB0aGF0LmNvbnRyb2xsZXIuY2xpcGJvYXJkLmhpZGRlbl9pbnB1dCA9PT0gZG9jdW1lbnQuYWN0aXZlRWxlbWVudCB8fCB0aGF0LmNhbnZhcy5mb2N1c2VkOyB9XG4gICAgKTtcblxuICAgIC8vIENyZWF0ZSBwcm9wZXJ0aWVzXG4gICAgdGhpcy5wcm9wZXJ0eSgnc3R5bGUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQuX3N0eWxlO1xuICAgIH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ2NvbmZpZycsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gY29uZmlnO1xuICAgIH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ3ZhbHVlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Lm1vZGVsLnRleHQ7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC5tb2RlbC50ZXh0ID0gdmFsdWU7XG4gICAgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgnd2lkdGgnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQudmlldy53aWR0aDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0LnZpZXcud2lkdGggPSB2YWx1ZTtcbiAgICAgICAgdGhhdC50cmlnZ2VyKCdyZXNpemVkJyk7XG4gICAgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgnaGVpZ2h0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0LnZpZXcuaGVpZ2h0O1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQudmlldy5oZWlnaHQgPSB2YWx1ZTtcbiAgICAgICAgdGhhdC50cmlnZ2VyKCdyZXNpemVkJyk7XG4gICAgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgnbGFuZ3VhZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQudmlldy5sYW5ndWFnZTtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0LnZpZXcubGFuZ3VhZ2UgPSB2YWx1ZTtcbiAgICB9KTtcblxuICAgIC8vIExvYWQgcGx1Z2lucy5cbiAgICB0aGlzLnBsdWdpbnMgPSBuZXcgcGx1Z2lubWFuYWdlci5QbHVnaW5NYW5hZ2VyKHRoaXMpO1xuICAgIHRoaXMucGx1Z2lucy5sb2FkKCdndXR0ZXInKTtcbiAgICB0aGlzLnBsdWdpbnMubG9hZCgnbGluZW51bWJlcnMnKTtcbn07XG51dGlscy5pbmhlcml0KFBvc3RlciwgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLlBvc3RlciA9IFBvc3RlcjtcbmV4cG9ydHMuQ2FudmFzID0gcGx1Z2luLlBsdWdpbkJhc2U7XG5leHBvcnRzLlBsdWdpbkJhc2UgPSBwbHVnaW4uUGx1Z2luQmFzZTtcbmV4cG9ydHMuUmVuZGVyZXJCYXNlID0gcmVuZGVyZXIuUmVuZGVyZXJCYXNlO1xuZXhwb3J0cy51dGlscyA9IHV0aWxzO1xuIiwic2VsZiA9ICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJylcblx0PyB3aW5kb3cgICAvLyBpZiBpbiBicm93c2VyXG5cdDogKFxuXHRcdCh0eXBlb2YgV29ya2VyR2xvYmFsU2NvcGUgIT09ICd1bmRlZmluZWQnICYmIHNlbGYgaW5zdGFuY2VvZiBXb3JrZXJHbG9iYWxTY29wZSlcblx0XHQ/IHNlbGYgLy8gaWYgaW4gd29ya2VyXG5cdFx0OiB7fSAgIC8vIGlmIGluIG5vZGUganNcblx0KTtcblxuLyoqXG4gKiBQcmlzbTogTGlnaHR3ZWlnaHQsIHJvYnVzdCwgZWxlZ2FudCBzeW50YXggaGlnaGxpZ2h0aW5nXG4gKiBNSVQgbGljZW5zZSBodHRwOi8vd3d3Lm9wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL21pdC1saWNlbnNlLnBocC9cbiAqIEBhdXRob3IgTGVhIFZlcm91IGh0dHA6Ly9sZWEudmVyb3UubWVcbiAqL1xuXG52YXIgUHJpc20gPSAoZnVuY3Rpb24oKXtcblxuLy8gUHJpdmF0ZSBoZWxwZXIgdmFyc1xudmFyIGxhbmcgPSAvXFxibGFuZyg/OnVhZ2UpPy0oPyFcXCopKFxcdyspXFxiL2k7XG5cbnZhciBfID0gc2VsZi5QcmlzbSA9IHtcblx0dXRpbDoge1xuXHRcdGVuY29kZTogZnVuY3Rpb24gKHRva2Vucykge1xuXHRcdFx0aWYgKHRva2VucyBpbnN0YW5jZW9mIFRva2VuKSB7XG5cdFx0XHRcdHJldHVybiBuZXcgVG9rZW4odG9rZW5zLnR5cGUsIF8udXRpbC5lbmNvZGUodG9rZW5zLmNvbnRlbnQpLCB0b2tlbnMuYWxpYXMpO1xuXHRcdFx0fSBlbHNlIGlmIChfLnV0aWwudHlwZSh0b2tlbnMpID09PSAnQXJyYXknKSB7XG5cdFx0XHRcdHJldHVybiB0b2tlbnMubWFwKF8udXRpbC5lbmNvZGUpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmV0dXJuIHRva2Vucy5yZXBsYWNlKC8mL2csICcmYW1wOycpLnJlcGxhY2UoLzwvZywgJyZsdDsnKS5yZXBsYWNlKC9cXHUwMGEwL2csICcgJyk7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdHR5cGU6IGZ1bmN0aW9uIChvKSB7XG5cdFx0XHRyZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pLm1hdGNoKC9cXFtvYmplY3QgKFxcdyspXFxdLylbMV07XG5cdFx0fSxcblxuXHRcdC8vIERlZXAgY2xvbmUgYSBsYW5ndWFnZSBkZWZpbml0aW9uIChlLmcuIHRvIGV4dGVuZCBpdClcblx0XHRjbG9uZTogZnVuY3Rpb24gKG8pIHtcblx0XHRcdHZhciB0eXBlID0gXy51dGlsLnR5cGUobyk7XG5cblx0XHRcdHN3aXRjaCAodHlwZSkge1xuXHRcdFx0XHRjYXNlICdPYmplY3QnOlxuXHRcdFx0XHRcdHZhciBjbG9uZSA9IHt9O1xuXG5cdFx0XHRcdFx0Zm9yICh2YXIga2V5IGluIG8pIHtcblx0XHRcdFx0XHRcdGlmIChvLmhhc093blByb3BlcnR5KGtleSkpIHtcblx0XHRcdFx0XHRcdFx0Y2xvbmVba2V5XSA9IF8udXRpbC5jbG9uZShvW2tleV0pO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHJldHVybiBjbG9uZTtcblxuXHRcdFx0XHRjYXNlICdBcnJheSc6XG5cdFx0XHRcdFx0cmV0dXJuIG8uc2xpY2UoKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIG87XG5cdFx0fVxuXHR9LFxuXG5cdGxhbmd1YWdlczoge1xuXHRcdGV4dGVuZDogZnVuY3Rpb24gKGlkLCByZWRlZikge1xuXHRcdFx0dmFyIGxhbmcgPSBfLnV0aWwuY2xvbmUoXy5sYW5ndWFnZXNbaWRdKTtcblxuXHRcdFx0Zm9yICh2YXIga2V5IGluIHJlZGVmKSB7XG5cdFx0XHRcdGxhbmdba2V5XSA9IHJlZGVmW2tleV07XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBsYW5nO1xuXHRcdH0sXG5cblx0XHQvKipcblx0XHQgKiBJbnNlcnQgYSB0b2tlbiBiZWZvcmUgYW5vdGhlciB0b2tlbiBpbiBhIGxhbmd1YWdlIGxpdGVyYWxcblx0XHQgKiBBcyB0aGlzIG5lZWRzIHRvIHJlY3JlYXRlIHRoZSBvYmplY3QgKHdlIGNhbm5vdCBhY3R1YWxseSBpbnNlcnQgYmVmb3JlIGtleXMgaW4gb2JqZWN0IGxpdGVyYWxzKSxcblx0XHQgKiB3ZSBjYW5ub3QganVzdCBwcm92aWRlIGFuIG9iamVjdCwgd2UgbmVlZCBhbm9iamVjdCBhbmQgYSBrZXkuXG5cdFx0ICogQHBhcmFtIGluc2lkZSBUaGUga2V5IChvciBsYW5ndWFnZSBpZCkgb2YgdGhlIHBhcmVudFxuXHRcdCAqIEBwYXJhbSBiZWZvcmUgVGhlIGtleSB0byBpbnNlcnQgYmVmb3JlLiBJZiBub3QgcHJvdmlkZWQsIHRoZSBmdW5jdGlvbiBhcHBlbmRzIGluc3RlYWQuXG5cdFx0ICogQHBhcmFtIGluc2VydCBPYmplY3Qgd2l0aCB0aGUga2V5L3ZhbHVlIHBhaXJzIHRvIGluc2VydFxuXHRcdCAqIEBwYXJhbSByb290IFRoZSBvYmplY3QgdGhhdCBjb250YWlucyBgaW5zaWRlYC4gSWYgZXF1YWwgdG8gUHJpc20ubGFuZ3VhZ2VzLCBpdCBjYW4gYmUgb21pdHRlZC5cblx0XHQgKi9cblx0XHRpbnNlcnRCZWZvcmU6IGZ1bmN0aW9uIChpbnNpZGUsIGJlZm9yZSwgaW5zZXJ0LCByb290KSB7XG5cdFx0XHRyb290ID0gcm9vdCB8fCBfLmxhbmd1YWdlcztcblx0XHRcdHZhciBncmFtbWFyID0gcm9vdFtpbnNpZGVdO1xuXHRcdFx0XG5cdFx0XHRpZiAoYXJndW1lbnRzLmxlbmd0aCA9PSAyKSB7XG5cdFx0XHRcdGluc2VydCA9IGFyZ3VtZW50c1sxXTtcblx0XHRcdFx0XG5cdFx0XHRcdGZvciAodmFyIG5ld1Rva2VuIGluIGluc2VydCkge1xuXHRcdFx0XHRcdGlmIChpbnNlcnQuaGFzT3duUHJvcGVydHkobmV3VG9rZW4pKSB7XG5cdFx0XHRcdFx0XHRncmFtbWFyW25ld1Rva2VuXSA9IGluc2VydFtuZXdUb2tlbl07XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0XHRyZXR1cm4gZ3JhbW1hcjtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0dmFyIHJldCA9IHt9O1xuXG5cdFx0XHRmb3IgKHZhciB0b2tlbiBpbiBncmFtbWFyKSB7XG5cblx0XHRcdFx0aWYgKGdyYW1tYXIuaGFzT3duUHJvcGVydHkodG9rZW4pKSB7XG5cblx0XHRcdFx0XHRpZiAodG9rZW4gPT0gYmVmb3JlKSB7XG5cblx0XHRcdFx0XHRcdGZvciAodmFyIG5ld1Rva2VuIGluIGluc2VydCkge1xuXG5cdFx0XHRcdFx0XHRcdGlmIChpbnNlcnQuaGFzT3duUHJvcGVydHkobmV3VG9rZW4pKSB7XG5cdFx0XHRcdFx0XHRcdFx0cmV0W25ld1Rva2VuXSA9IGluc2VydFtuZXdUb2tlbl07XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRyZXRbdG9rZW5dID0gZ3JhbW1hclt0b2tlbl07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0Ly8gVXBkYXRlIHJlZmVyZW5jZXMgaW4gb3RoZXIgbGFuZ3VhZ2UgZGVmaW5pdGlvbnNcblx0XHRcdF8ubGFuZ3VhZ2VzLkRGUyhfLmxhbmd1YWdlcywgZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuXHRcdFx0XHRpZiAodmFsdWUgPT09IHJvb3RbaW5zaWRlXSAmJiBrZXkgIT0gaW5zaWRlKSB7XG5cdFx0XHRcdFx0dGhpc1trZXldID0gcmV0O1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdFx0cmV0dXJuIHJvb3RbaW5zaWRlXSA9IHJldDtcblx0XHR9LFxuXG5cdFx0Ly8gVHJhdmVyc2UgYSBsYW5ndWFnZSBkZWZpbml0aW9uIHdpdGggRGVwdGggRmlyc3QgU2VhcmNoXG5cdFx0REZTOiBmdW5jdGlvbihvLCBjYWxsYmFjaywgdHlwZSkge1xuXHRcdFx0Zm9yICh2YXIgaSBpbiBvKSB7XG5cdFx0XHRcdGlmIChvLmhhc093blByb3BlcnR5KGkpKSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2suY2FsbChvLCBpLCBvW2ldLCB0eXBlIHx8IGkpO1xuXG5cdFx0XHRcdFx0aWYgKF8udXRpbC50eXBlKG9baV0pID09PSAnT2JqZWN0Jykge1xuXHRcdFx0XHRcdFx0Xy5sYW5ndWFnZXMuREZTKG9baV0sIGNhbGxiYWNrKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSBpZiAoXy51dGlsLnR5cGUob1tpXSkgPT09ICdBcnJheScpIHtcblx0XHRcdFx0XHRcdF8ubGFuZ3VhZ2VzLkRGUyhvW2ldLCBjYWxsYmFjaywgaSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9LFxuXG5cdGhpZ2hsaWdodEFsbDogZnVuY3Rpb24oYXN5bmMsIGNhbGxiYWNrKSB7XG5cdFx0dmFyIGVsZW1lbnRzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnY29kZVtjbGFzcyo9XCJsYW5ndWFnZS1cIl0sIFtjbGFzcyo9XCJsYW5ndWFnZS1cIl0gY29kZSwgY29kZVtjbGFzcyo9XCJsYW5nLVwiXSwgW2NsYXNzKj1cImxhbmctXCJdIGNvZGUnKTtcblxuXHRcdGZvciAodmFyIGk9MCwgZWxlbWVudDsgZWxlbWVudCA9IGVsZW1lbnRzW2krK107KSB7XG5cdFx0XHRfLmhpZ2hsaWdodEVsZW1lbnQoZWxlbWVudCwgYXN5bmMgPT09IHRydWUsIGNhbGxiYWNrKTtcblx0XHR9XG5cdH0sXG5cblx0aGlnaGxpZ2h0RWxlbWVudDogZnVuY3Rpb24oZWxlbWVudCwgYXN5bmMsIGNhbGxiYWNrKSB7XG5cdFx0Ly8gRmluZCBsYW5ndWFnZVxuXHRcdHZhciBsYW5ndWFnZSwgZ3JhbW1hciwgcGFyZW50ID0gZWxlbWVudDtcblxuXHRcdHdoaWxlIChwYXJlbnQgJiYgIWxhbmcudGVzdChwYXJlbnQuY2xhc3NOYW1lKSkge1xuXHRcdFx0cGFyZW50ID0gcGFyZW50LnBhcmVudE5vZGU7XG5cdFx0fVxuXG5cdFx0aWYgKHBhcmVudCkge1xuXHRcdFx0bGFuZ3VhZ2UgPSAocGFyZW50LmNsYXNzTmFtZS5tYXRjaChsYW5nKSB8fCBbLCcnXSlbMV07XG5cdFx0XHRncmFtbWFyID0gXy5sYW5ndWFnZXNbbGFuZ3VhZ2VdO1xuXHRcdH1cblxuXHRcdGlmICghZ3JhbW1hcikge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdC8vIFNldCBsYW5ndWFnZSBvbiB0aGUgZWxlbWVudCwgaWYgbm90IHByZXNlbnRcblx0XHRlbGVtZW50LmNsYXNzTmFtZSA9IGVsZW1lbnQuY2xhc3NOYW1lLnJlcGxhY2UobGFuZywgJycpLnJlcGxhY2UoL1xccysvZywgJyAnKSArICcgbGFuZ3VhZ2UtJyArIGxhbmd1YWdlO1xuXG5cdFx0Ly8gU2V0IGxhbmd1YWdlIG9uIHRoZSBwYXJlbnQsIGZvciBzdHlsaW5nXG5cdFx0cGFyZW50ID0gZWxlbWVudC5wYXJlbnROb2RlO1xuXG5cdFx0aWYgKC9wcmUvaS50ZXN0KHBhcmVudC5ub2RlTmFtZSkpIHtcblx0XHRcdHBhcmVudC5jbGFzc05hbWUgPSBwYXJlbnQuY2xhc3NOYW1lLnJlcGxhY2UobGFuZywgJycpLnJlcGxhY2UoL1xccysvZywgJyAnKSArICcgbGFuZ3VhZ2UtJyArIGxhbmd1YWdlO1xuXHRcdH1cblxuXHRcdHZhciBjb2RlID0gZWxlbWVudC50ZXh0Q29udGVudDtcblxuXHRcdGlmKCFjb2RlKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0dmFyIGVudiA9IHtcblx0XHRcdGVsZW1lbnQ6IGVsZW1lbnQsXG5cdFx0XHRsYW5ndWFnZTogbGFuZ3VhZ2UsXG5cdFx0XHRncmFtbWFyOiBncmFtbWFyLFxuXHRcdFx0Y29kZTogY29kZVxuXHRcdH07XG5cblx0XHRfLmhvb2tzLnJ1bignYmVmb3JlLWhpZ2hsaWdodCcsIGVudik7XG5cblx0XHRpZiAoYXN5bmMgJiYgc2VsZi5Xb3JrZXIpIHtcblx0XHRcdHZhciB3b3JrZXIgPSBuZXcgV29ya2VyKF8uZmlsZW5hbWUpO1xuXG5cdFx0XHR3b3JrZXIub25tZXNzYWdlID0gZnVuY3Rpb24oZXZ0KSB7XG5cdFx0XHRcdGVudi5oaWdobGlnaHRlZENvZGUgPSBUb2tlbi5zdHJpbmdpZnkoSlNPTi5wYXJzZShldnQuZGF0YSksIGxhbmd1YWdlKTtcblxuXHRcdFx0XHRfLmhvb2tzLnJ1bignYmVmb3JlLWluc2VydCcsIGVudik7XG5cblx0XHRcdFx0ZW52LmVsZW1lbnQuaW5uZXJIVE1MID0gZW52LmhpZ2hsaWdodGVkQ29kZTtcblxuXHRcdFx0XHRjYWxsYmFjayAmJiBjYWxsYmFjay5jYWxsKGVudi5lbGVtZW50KTtcblx0XHRcdFx0Xy5ob29rcy5ydW4oJ2FmdGVyLWhpZ2hsaWdodCcsIGVudik7XG5cdFx0XHR9O1xuXG5cdFx0XHR3b3JrZXIucG9zdE1lc3NhZ2UoSlNPTi5zdHJpbmdpZnkoe1xuXHRcdFx0XHRsYW5ndWFnZTogZW52Lmxhbmd1YWdlLFxuXHRcdFx0XHRjb2RlOiBlbnYuY29kZVxuXHRcdFx0fSkpO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdGVudi5oaWdobGlnaHRlZENvZGUgPSBfLmhpZ2hsaWdodChlbnYuY29kZSwgZW52LmdyYW1tYXIsIGVudi5sYW5ndWFnZSlcblxuXHRcdFx0Xy5ob29rcy5ydW4oJ2JlZm9yZS1pbnNlcnQnLCBlbnYpO1xuXG5cdFx0XHRlbnYuZWxlbWVudC5pbm5lckhUTUwgPSBlbnYuaGlnaGxpZ2h0ZWRDb2RlO1xuXG5cdFx0XHRjYWxsYmFjayAmJiBjYWxsYmFjay5jYWxsKGVsZW1lbnQpO1xuXG5cdFx0XHRfLmhvb2tzLnJ1bignYWZ0ZXItaGlnaGxpZ2h0JywgZW52KTtcblx0XHR9XG5cdH0sXG5cblx0aGlnaGxpZ2h0OiBmdW5jdGlvbiAodGV4dCwgZ3JhbW1hciwgbGFuZ3VhZ2UpIHtcblx0XHR2YXIgdG9rZW5zID0gXy50b2tlbml6ZSh0ZXh0LCBncmFtbWFyKTtcblx0XHRyZXR1cm4gVG9rZW4uc3RyaW5naWZ5KF8udXRpbC5lbmNvZGUodG9rZW5zKSwgbGFuZ3VhZ2UpO1xuXHR9LFxuXG5cdHRva2VuaXplOiBmdW5jdGlvbih0ZXh0LCBncmFtbWFyLCBsYW5ndWFnZSkge1xuXHRcdHZhciBUb2tlbiA9IF8uVG9rZW47XG5cblx0XHR2YXIgc3RyYXJyID0gW3RleHRdO1xuXG5cdFx0dmFyIHJlc3QgPSBncmFtbWFyLnJlc3Q7XG5cblx0XHRpZiAocmVzdCkge1xuXHRcdFx0Zm9yICh2YXIgdG9rZW4gaW4gcmVzdCkge1xuXHRcdFx0XHRncmFtbWFyW3Rva2VuXSA9IHJlc3RbdG9rZW5dO1xuXHRcdFx0fVxuXG5cdFx0XHRkZWxldGUgZ3JhbW1hci5yZXN0O1xuXHRcdH1cblxuXHRcdHRva2VubG9vcDogZm9yICh2YXIgdG9rZW4gaW4gZ3JhbW1hcikge1xuXHRcdFx0aWYoIWdyYW1tYXIuaGFzT3duUHJvcGVydHkodG9rZW4pIHx8ICFncmFtbWFyW3Rva2VuXSkge1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblxuXHRcdFx0dmFyIHBhdHRlcm5zID0gZ3JhbW1hclt0b2tlbl07XG5cdFx0XHRwYXR0ZXJucyA9IChfLnV0aWwudHlwZShwYXR0ZXJucykgPT09IFwiQXJyYXlcIikgPyBwYXR0ZXJucyA6IFtwYXR0ZXJuc107XG5cblx0XHRcdGZvciAodmFyIGogPSAwOyBqIDwgcGF0dGVybnMubGVuZ3RoOyArK2opIHtcblx0XHRcdFx0dmFyIHBhdHRlcm4gPSBwYXR0ZXJuc1tqXSxcblx0XHRcdFx0XHRpbnNpZGUgPSBwYXR0ZXJuLmluc2lkZSxcblx0XHRcdFx0XHRsb29rYmVoaW5kID0gISFwYXR0ZXJuLmxvb2tiZWhpbmQsXG5cdFx0XHRcdFx0bG9va2JlaGluZExlbmd0aCA9IDAsXG5cdFx0XHRcdFx0YWxpYXMgPSBwYXR0ZXJuLmFsaWFzO1xuXG5cdFx0XHRcdHBhdHRlcm4gPSBwYXR0ZXJuLnBhdHRlcm4gfHwgcGF0dGVybjtcblxuXHRcdFx0XHRmb3IgKHZhciBpPTA7IGk8c3RyYXJyLmxlbmd0aDsgaSsrKSB7IC8vIERvbuKAmXQgY2FjaGUgbGVuZ3RoIGFzIGl0IGNoYW5nZXMgZHVyaW5nIHRoZSBsb29wXG5cblx0XHRcdFx0XHR2YXIgc3RyID0gc3RyYXJyW2ldO1xuXG5cdFx0XHRcdFx0aWYgKHN0cmFyci5sZW5ndGggPiB0ZXh0Lmxlbmd0aCkge1xuXHRcdFx0XHRcdFx0Ly8gU29tZXRoaW5nIHdlbnQgdGVycmlibHkgd3JvbmcsIEFCT1JULCBBQk9SVCFcblx0XHRcdFx0XHRcdGJyZWFrIHRva2VubG9vcDtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoc3RyIGluc3RhbmNlb2YgVG9rZW4pIHtcblx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHBhdHRlcm4ubGFzdEluZGV4ID0gMDtcblxuXHRcdFx0XHRcdHZhciBtYXRjaCA9IHBhdHRlcm4uZXhlYyhzdHIpO1xuXG5cdFx0XHRcdFx0aWYgKG1hdGNoKSB7XG5cdFx0XHRcdFx0XHRpZihsb29rYmVoaW5kKSB7XG5cdFx0XHRcdFx0XHRcdGxvb2tiZWhpbmRMZW5ndGggPSBtYXRjaFsxXS5sZW5ndGg7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdHZhciBmcm9tID0gbWF0Y2guaW5kZXggLSAxICsgbG9va2JlaGluZExlbmd0aCxcblx0XHRcdFx0XHRcdFx0bWF0Y2ggPSBtYXRjaFswXS5zbGljZShsb29rYmVoaW5kTGVuZ3RoKSxcblx0XHRcdFx0XHRcdFx0bGVuID0gbWF0Y2gubGVuZ3RoLFxuXHRcdFx0XHRcdFx0XHR0byA9IGZyb20gKyBsZW4sXG5cdFx0XHRcdFx0XHRcdGJlZm9yZSA9IHN0ci5zbGljZSgwLCBmcm9tICsgMSksXG5cdFx0XHRcdFx0XHRcdGFmdGVyID0gc3RyLnNsaWNlKHRvICsgMSk7XG5cblx0XHRcdFx0XHRcdHZhciBhcmdzID0gW2ksIDFdO1xuXG5cdFx0XHRcdFx0XHRpZiAoYmVmb3JlKSB7XG5cdFx0XHRcdFx0XHRcdGFyZ3MucHVzaChiZWZvcmUpO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHR2YXIgd3JhcHBlZCA9IG5ldyBUb2tlbih0b2tlbiwgaW5zaWRlPyBfLnRva2VuaXplKG1hdGNoLCBpbnNpZGUpIDogbWF0Y2gsIGFsaWFzKTtcblxuXHRcdFx0XHRcdFx0YXJncy5wdXNoKHdyYXBwZWQpO1xuXG5cdFx0XHRcdFx0XHRpZiAoYWZ0ZXIpIHtcblx0XHRcdFx0XHRcdFx0YXJncy5wdXNoKGFmdGVyKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0QXJyYXkucHJvdG90eXBlLnNwbGljZS5hcHBseShzdHJhcnIsIGFyZ3MpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiBzdHJhcnI7XG5cdH0sXG5cblx0aG9va3M6IHtcblx0XHRhbGw6IHt9LFxuXG5cdFx0YWRkOiBmdW5jdGlvbiAobmFtZSwgY2FsbGJhY2spIHtcblx0XHRcdHZhciBob29rcyA9IF8uaG9va3MuYWxsO1xuXG5cdFx0XHRob29rc1tuYW1lXSA9IGhvb2tzW25hbWVdIHx8IFtdO1xuXG5cdFx0XHRob29rc1tuYW1lXS5wdXNoKGNhbGxiYWNrKTtcblx0XHR9LFxuXG5cdFx0cnVuOiBmdW5jdGlvbiAobmFtZSwgZW52KSB7XG5cdFx0XHR2YXIgY2FsbGJhY2tzID0gXy5ob29rcy5hbGxbbmFtZV07XG5cblx0XHRcdGlmICghY2FsbGJhY2tzIHx8ICFjYWxsYmFja3MubGVuZ3RoKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Zm9yICh2YXIgaT0wLCBjYWxsYmFjazsgY2FsbGJhY2sgPSBjYWxsYmFja3NbaSsrXTspIHtcblx0XHRcdFx0Y2FsbGJhY2soZW52KTtcblx0XHRcdH1cblx0XHR9XG5cdH1cbn07XG5cbnZhciBUb2tlbiA9IF8uVG9rZW4gPSBmdW5jdGlvbih0eXBlLCBjb250ZW50LCBhbGlhcykge1xuXHR0aGlzLnR5cGUgPSB0eXBlO1xuXHR0aGlzLmNvbnRlbnQgPSBjb250ZW50O1xuXHR0aGlzLmFsaWFzID0gYWxpYXM7XG59O1xuXG5Ub2tlbi5zdHJpbmdpZnkgPSBmdW5jdGlvbihvLCBsYW5ndWFnZSwgcGFyZW50KSB7XG5cdGlmICh0eXBlb2YgbyA9PSAnc3RyaW5nJykge1xuXHRcdHJldHVybiBvO1xuXHR9XG5cblx0aWYgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKSA9PSAnW29iamVjdCBBcnJheV0nKSB7XG5cdFx0cmV0dXJuIG8ubWFwKGZ1bmN0aW9uKGVsZW1lbnQpIHtcblx0XHRcdHJldHVybiBUb2tlbi5zdHJpbmdpZnkoZWxlbWVudCwgbGFuZ3VhZ2UsIG8pO1xuXHRcdH0pLmpvaW4oJycpO1xuXHR9XG5cblx0dmFyIGVudiA9IHtcblx0XHR0eXBlOiBvLnR5cGUsXG5cdFx0Y29udGVudDogVG9rZW4uc3RyaW5naWZ5KG8uY29udGVudCwgbGFuZ3VhZ2UsIHBhcmVudCksXG5cdFx0dGFnOiAnc3BhbicsXG5cdFx0Y2xhc3NlczogWyd0b2tlbicsIG8udHlwZV0sXG5cdFx0YXR0cmlidXRlczoge30sXG5cdFx0bGFuZ3VhZ2U6IGxhbmd1YWdlLFxuXHRcdHBhcmVudDogcGFyZW50XG5cdH07XG5cblx0aWYgKGVudi50eXBlID09ICdjb21tZW50Jykge1xuXHRcdGVudi5hdHRyaWJ1dGVzWydzcGVsbGNoZWNrJ10gPSAndHJ1ZSc7XG5cdH1cblxuXHRpZiAoby5hbGlhcykge1xuXHRcdHZhciBhbGlhc2VzID0gXy51dGlsLnR5cGUoby5hbGlhcykgPT09ICdBcnJheScgPyBvLmFsaWFzIDogW28uYWxpYXNdO1xuXHRcdEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KGVudi5jbGFzc2VzLCBhbGlhc2VzKTtcblx0fVxuXG5cdF8uaG9va3MucnVuKCd3cmFwJywgZW52KTtcblxuXHR2YXIgYXR0cmlidXRlcyA9ICcnO1xuXG5cdGZvciAodmFyIG5hbWUgaW4gZW52LmF0dHJpYnV0ZXMpIHtcblx0XHRhdHRyaWJ1dGVzICs9IG5hbWUgKyAnPVwiJyArIChlbnYuYXR0cmlidXRlc1tuYW1lXSB8fCAnJykgKyAnXCInO1xuXHR9XG5cblx0cmV0dXJuICc8JyArIGVudi50YWcgKyAnIGNsYXNzPVwiJyArIGVudi5jbGFzc2VzLmpvaW4oJyAnKSArICdcIiAnICsgYXR0cmlidXRlcyArICc+JyArIGVudi5jb250ZW50ICsgJzwvJyArIGVudi50YWcgKyAnPic7XG5cbn07XG5cbmlmICghc2VsZi5kb2N1bWVudCkge1xuXHRpZiAoIXNlbGYuYWRkRXZlbnRMaXN0ZW5lcikge1xuXHRcdC8vIGluIE5vZGUuanNcblx0XHRyZXR1cm4gc2VsZi5QcmlzbTtcblx0fVxuIFx0Ly8gSW4gd29ya2VyXG5cdHNlbGYuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uKGV2dCkge1xuXHRcdHZhciBtZXNzYWdlID0gSlNPTi5wYXJzZShldnQuZGF0YSksXG5cdFx0ICAgIGxhbmcgPSBtZXNzYWdlLmxhbmd1YWdlLFxuXHRcdCAgICBjb2RlID0gbWVzc2FnZS5jb2RlO1xuXG5cdFx0c2VsZi5wb3N0TWVzc2FnZShKU09OLnN0cmluZ2lmeShfLnV0aWwuZW5jb2RlKF8udG9rZW5pemUoY29kZSwgXy5sYW5ndWFnZXNbbGFuZ10pKSkpO1xuXHRcdHNlbGYuY2xvc2UoKTtcblx0fSwgZmFsc2UpO1xuXG5cdHJldHVybiBzZWxmLlByaXNtO1xufVxuXG4vLyBHZXQgY3VycmVudCBzY3JpcHQgYW5kIGhpZ2hsaWdodFxudmFyIHNjcmlwdCA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzY3JpcHQnKTtcblxuc2NyaXB0ID0gc2NyaXB0W3NjcmlwdC5sZW5ndGggLSAxXTtcblxuaWYgKHNjcmlwdCkge1xuXHRfLmZpbGVuYW1lID0gc2NyaXB0LnNyYztcblxuXHRpZiAoZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lciAmJiAhc2NyaXB0Lmhhc0F0dHJpYnV0ZSgnZGF0YS1tYW51YWwnKSkge1xuXHRcdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCBfLmhpZ2hsaWdodEFsbCk7XG5cdH1cbn1cblxucmV0dXJuIHNlbGYuUHJpc207XG5cbn0pKCk7XG5cbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuXHRtb2R1bGUuZXhwb3J0cyA9IFByaXNtO1xufVxuXG5QcmlzbS5sYW5ndWFnZXMubWFya3VwID0ge1xuXHQnY29tbWVudCc6IC88IS0tW1xcd1xcV10qPy0tPi9nLFxuXHQncHJvbG9nJzogLzxcXD8uKz9cXD8+Lyxcblx0J2RvY3R5cGUnOiAvPCFET0NUWVBFLis/Pi8sXG5cdCdjZGF0YSc6IC88IVxcW0NEQVRBXFxbW1xcd1xcV10qP11dPi9pLFxuXHQndGFnJzoge1xuXHRcdHBhdHRlcm46IC88XFwvP1tcXHc6LV0rXFxzKig/OlxccytbXFx3Oi1dKyg/Oj0oPzooXCJ8JykoXFxcXD9bXFx3XFxXXSkqP1xcMXxbXlxccydcIj49XSspKT9cXHMqKSpcXC8/Pi9naSxcblx0XHRpbnNpZGU6IHtcblx0XHRcdCd0YWcnOiB7XG5cdFx0XHRcdHBhdHRlcm46IC9ePFxcLz9bXFx3Oi1dKy9pLFxuXHRcdFx0XHRpbnNpZGU6IHtcblx0XHRcdFx0XHQncHVuY3R1YXRpb24nOiAvXjxcXC8/Lyxcblx0XHRcdFx0XHQnbmFtZXNwYWNlJzogL15bXFx3LV0rPzovXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHQnYXR0ci12YWx1ZSc6IHtcblx0XHRcdFx0cGF0dGVybjogLz0oPzooJ3xcIilbXFx3XFxXXSo/KFxcMSl8W15cXHM+XSspL2dpLFxuXHRcdFx0XHRpbnNpZGU6IHtcblx0XHRcdFx0XHQncHVuY3R1YXRpb24nOiAvPXw+fFwiL2dcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdCdwdW5jdHVhdGlvbic6IC9cXC8/Pi9nLFxuXHRcdFx0J2F0dHItbmFtZSc6IHtcblx0XHRcdFx0cGF0dGVybjogL1tcXHc6LV0rL2csXG5cdFx0XHRcdGluc2lkZToge1xuXHRcdFx0XHRcdCduYW1lc3BhY2UnOiAvXltcXHctXSs/Oi9cblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0fVxuXHR9LFxuXHQnZW50aXR5JzogL1xcJiM/W1xcZGEtel17MSw4fTsvZ2lcbn07XG5cbi8vIFBsdWdpbiB0byBtYWtlIGVudGl0eSB0aXRsZSBzaG93IHRoZSByZWFsIGVudGl0eSwgaWRlYSBieSBSb21hbiBLb21hcm92XG5QcmlzbS5ob29rcy5hZGQoJ3dyYXAnLCBmdW5jdGlvbihlbnYpIHtcblxuXHRpZiAoZW52LnR5cGUgPT09ICdlbnRpdHknKSB7XG5cdFx0ZW52LmF0dHJpYnV0ZXNbJ3RpdGxlJ10gPSBlbnYuY29udGVudC5yZXBsYWNlKC8mYW1wOy8sICcmJyk7XG5cdH1cbn0pO1xuXG5QcmlzbS5sYW5ndWFnZXMuY2xpa2UgPSB7XG5cdCdjb21tZW50JzogW1xuXHRcdHtcblx0XHRcdHBhdHRlcm46IC8oXnxbXlxcXFxdKVxcL1xcKltcXHdcXFddKj9cXCpcXC8vZyxcblx0XHRcdGxvb2tiZWhpbmQ6IHRydWVcblx0XHR9LFxuXHRcdHtcblx0XHRcdHBhdHRlcm46IC8oXnxbXlxcXFw6XSlcXC9cXC8uKj8oXFxyP1xcbnwkKS9nLFxuXHRcdFx0bG9va2JlaGluZDogdHJ1ZVxuXHRcdH1cblx0XSxcblx0J3N0cmluZyc6IC8oXCJ8JykoXFxcXD8uKSo/XFwxL2csXG5cdCdjbGFzcy1uYW1lJzoge1xuXHRcdHBhdHRlcm46IC8oKD86KD86Y2xhc3N8aW50ZXJmYWNlfGV4dGVuZHN8aW1wbGVtZW50c3x0cmFpdHxpbnN0YW5jZW9mfG5ldylcXHMrKXwoPzpjYXRjaFxccytcXCgpKVthLXowLTlfXFwuXFxcXF0rL2lnLFxuXHRcdGxvb2tiZWhpbmQ6IHRydWUsXG5cdFx0aW5zaWRlOiB7XG5cdFx0XHRwdW5jdHVhdGlvbjogLyhcXC58XFxcXCkvXG5cdFx0fVxuXHR9LFxuXHQna2V5d29yZCc6IC9cXGIoaWZ8ZWxzZXx3aGlsZXxkb3xmb3J8cmV0dXJufGlufGluc3RhbmNlb2Z8ZnVuY3Rpb258bmV3fHRyeXx0aHJvd3xjYXRjaHxmaW5hbGx5fG51bGx8YnJlYWt8Y29udGludWUpXFxiL2csXG5cdCdib29sZWFuJzogL1xcYih0cnVlfGZhbHNlKVxcYi9nLFxuXHQnZnVuY3Rpb24nOiB7XG5cdFx0cGF0dGVybjogL1thLXowLTlfXStcXCgvaWcsXG5cdFx0aW5zaWRlOiB7XG5cdFx0XHRwdW5jdHVhdGlvbjogL1xcKC9cblx0XHR9XG5cdH0sXG5cdCdudW1iZXInOiAvXFxiLT8oMHhbXFxkQS1GYS1mXSt8XFxkKlxcLj9cXGQrKFtFZV0tP1xcZCspPylcXGIvZyxcblx0J29wZXJhdG9yJzogL1stK117MSwyfXwhfDw9P3w+PT98PXsxLDN9fCZ7MSwyfXxcXHw/XFx8fFxcP3xcXCp8XFwvfFxcfnxcXF58XFwlL2csXG5cdCdpZ25vcmUnOiAvJihsdHxndHxhbXApOy9naSxcblx0J3B1bmN0dWF0aW9uJzogL1t7fVtcXF07KCksLjpdL2dcbn07XG5cblByaXNtLmxhbmd1YWdlcy5hcGFjaGVjb25mID0ge1xuXHQnY29tbWVudCc6IC9cXCMuKi9nLFxuXHQnZGlyZWN0aXZlLWlubGluZSc6IHtcblx0XHRwYXR0ZXJuOiAvXlxccypcXGIoQWNjZXB0RmlsdGVyfEFjY2VwdFBhdGhJbmZvfEFjY2Vzc0ZpbGVOYW1lfEFjdGlvbnxBZGRBbHR8QWRkQWx0QnlFbmNvZGluZ3xBZGRBbHRCeVR5cGV8QWRkQ2hhcnNldHxBZGREZWZhdWx0Q2hhcnNldHxBZGREZXNjcmlwdGlvbnxBZGRFbmNvZGluZ3xBZGRIYW5kbGVyfEFkZEljb258QWRkSWNvbkJ5RW5jb2Rpbmd8QWRkSWNvbkJ5VHlwZXxBZGRJbnB1dEZpbHRlcnxBZGRMYW5ndWFnZXxBZGRNb2R1bGVJbmZvfEFkZE91dHB1dEZpbHRlcnxBZGRPdXRwdXRGaWx0ZXJCeVR5cGV8QWRkVHlwZXxBbGlhc3xBbGlhc01hdGNofEFsbG93fEFsbG93Q09OTkVDVHxBbGxvd0VuY29kZWRTbGFzaGVzfEFsbG93TWV0aG9kc3xBbGxvd092ZXJyaWRlfEFsbG93T3ZlcnJpZGVMaXN0fEFub255bW91c3xBbm9ueW1vdXNfTG9nRW1haWx8QW5vbnltb3VzX011c3RHaXZlRW1haWx8QW5vbnltb3VzX05vVXNlcklEfEFub255bW91c19WZXJpZnlFbWFpbHxBc3luY1JlcXVlc3RXb3JrZXJGYWN0b3J8QXV0aEJhc2ljQXV0aG9yaXRhdGl2ZXxBdXRoQmFzaWNGYWtlfEF1dGhCYXNpY1Byb3ZpZGVyfEF1dGhCYXNpY1VzZURpZ2VzdEFsZ29yaXRobXxBdXRoREJEVXNlclBXUXVlcnl8QXV0aERCRFVzZXJSZWFsbVF1ZXJ5fEF1dGhEQk1Hcm91cEZpbGV8QXV0aERCTVR5cGV8QXV0aERCTVVzZXJGaWxlfEF1dGhEaWdlc3RBbGdvcml0aG18QXV0aERpZ2VzdERvbWFpbnxBdXRoRGlnZXN0Tm9uY2VMaWZldGltZXxBdXRoRGlnZXN0UHJvdmlkZXJ8QXV0aERpZ2VzdFFvcHxBdXRoRGlnZXN0U2htZW1TaXplfEF1dGhGb3JtQXV0aG9yaXRhdGl2ZXxBdXRoRm9ybUJvZHl8QXV0aEZvcm1EaXNhYmxlTm9TdG9yZXxBdXRoRm9ybUZha2VCYXNpY0F1dGh8QXV0aEZvcm1Mb2NhdGlvbnxBdXRoRm9ybUxvZ2luUmVxdWlyZWRMb2NhdGlvbnxBdXRoRm9ybUxvZ2luU3VjY2Vzc0xvY2F0aW9ufEF1dGhGb3JtTG9nb3V0TG9jYXRpb258QXV0aEZvcm1NZXRob2R8QXV0aEZvcm1NaW1ldHlwZXxBdXRoRm9ybVBhc3N3b3JkfEF1dGhGb3JtUHJvdmlkZXJ8QXV0aEZvcm1TaXRlUGFzc3BocmFzZXxBdXRoRm9ybVNpemV8QXV0aEZvcm1Vc2VybmFtZXxBdXRoR3JvdXBGaWxlfEF1dGhMREFQQXV0aG9yaXplUHJlZml4fEF1dGhMREFQQmluZEF1dGhvcml0YXRpdmV8QXV0aExEQVBCaW5kRE58QXV0aExEQVBCaW5kUGFzc3dvcmR8QXV0aExEQVBDaGFyc2V0Q29uZmlnfEF1dGhMREFQQ29tcGFyZUFzVXNlcnxBdXRoTERBUENvbXBhcmVETk9uU2VydmVyfEF1dGhMREFQRGVyZWZlcmVuY2VBbGlhc2VzfEF1dGhMREFQR3JvdXBBdHRyaWJ1dGV8QXV0aExEQVBHcm91cEF0dHJpYnV0ZUlzRE58QXV0aExEQVBJbml0aWFsQmluZEFzVXNlcnxBdXRoTERBUEluaXRpYWxCaW5kUGF0dGVybnxBdXRoTERBUE1heFN1Ykdyb3VwRGVwdGh8QXV0aExEQVBSZW1vdGVVc2VyQXR0cmlidXRlfEF1dGhMREFQUmVtb3RlVXNlcklzRE58QXV0aExEQVBTZWFyY2hBc1VzZXJ8QXV0aExEQVBTdWJHcm91cEF0dHJpYnV0ZXxBdXRoTERBUFN1Ykdyb3VwQ2xhc3N8QXV0aExEQVBVcmx8QXV0aE1lcmdpbmd8QXV0aE5hbWV8QXV0aG5DYWNoZUNvbnRleHR8QXV0aG5DYWNoZUVuYWJsZXxBdXRobkNhY2hlUHJvdmlkZUZvcnxBdXRobkNhY2hlU09DYWNoZXxBdXRobkNhY2hlVGltZW91dHxBdXRobnpGY2dpQ2hlY2tBdXRoblByb3ZpZGVyfEF1dGhuekZjZ2lEZWZpbmVQcm92aWRlcnxBdXRoVHlwZXxBdXRoVXNlckZpbGV8QXV0aHpEQkRMb2dpblRvUmVmZXJlcnxBdXRoekRCRFF1ZXJ5fEF1dGh6REJEUmVkaXJlY3RRdWVyeXxBdXRoekRCTVR5cGV8QXV0aHpTZW5kRm9yYmlkZGVuT25GYWlsdXJlfEJhbGFuY2VyR3Jvd3RofEJhbGFuY2VySW5oZXJpdHxCYWxhbmNlck1lbWJlcnxCYWxhbmNlclBlcnNpc3R8QnJvd3Nlck1hdGNofEJyb3dzZXJNYXRjaE5vQ2FzZXxCdWZmZXJlZExvZ3N8QnVmZmVyU2l6ZXxDYWNoZURlZmF1bHRFeHBpcmV8Q2FjaGVEZXRhaWxIZWFkZXJ8Q2FjaGVEaXJMZW5ndGh8Q2FjaGVEaXJMZXZlbHN8Q2FjaGVEaXNhYmxlfENhY2hlRW5hYmxlfENhY2hlRmlsZXxDYWNoZUhlYWRlcnxDYWNoZUlnbm9yZUNhY2hlQ29udHJvbHxDYWNoZUlnbm9yZUhlYWRlcnN8Q2FjaGVJZ25vcmVOb0xhc3RNb2R8Q2FjaGVJZ25vcmVRdWVyeVN0cmluZ3xDYWNoZUlnbm9yZVVSTFNlc3Npb25JZGVudGlmaWVyc3xDYWNoZUtleUJhc2VVUkx8Q2FjaGVMYXN0TW9kaWZpZWRGYWN0b3J8Q2FjaGVMb2NrfENhY2hlTG9ja01heEFnZXxDYWNoZUxvY2tQYXRofENhY2hlTWF4RXhwaXJlfENhY2hlTWF4RmlsZVNpemV8Q2FjaGVNaW5FeHBpcmV8Q2FjaGVNaW5GaWxlU2l6ZXxDYWNoZU5lZ290aWF0ZWREb2NzfENhY2hlUXVpY2tIYW5kbGVyfENhY2hlUmVhZFNpemV8Q2FjaGVSZWFkVGltZXxDYWNoZVJvb3R8Q2FjaGVTb2NhY2hlfENhY2hlU29jYWNoZU1heFNpemV8Q2FjaGVTb2NhY2hlTWF4VGltZXxDYWNoZVNvY2FjaGVNaW5UaW1lfENhY2hlU29jYWNoZVJlYWRTaXplfENhY2hlU29jYWNoZVJlYWRUaW1lfENhY2hlU3RhbGVPbkVycm9yfENhY2hlU3RvcmVFeHBpcmVkfENhY2hlU3RvcmVOb1N0b3JlfENhY2hlU3RvcmVQcml2YXRlfENHSURTY3JpcHRUaW1lb3V0fENHSU1hcEV4dGVuc2lvbnxDaGFyc2V0RGVmYXVsdHxDaGFyc2V0T3B0aW9uc3xDaGFyc2V0U291cmNlRW5jfENoZWNrQ2FzZU9ubHl8Q2hlY2tTcGVsbGluZ3xDaHJvb3REaXJ8Q29udGVudERpZ2VzdHxDb29raWVEb21haW58Q29va2llRXhwaXJlc3xDb29raWVOYW1lfENvb2tpZVN0eWxlfENvb2tpZVRyYWNraW5nfENvcmVEdW1wRGlyZWN0b3J5fEN1c3RvbUxvZ3xEYXZ8RGF2RGVwdGhJbmZpbml0eXxEYXZHZW5lcmljTG9ja0RCfERhdkxvY2tEQnxEYXZNaW5UaW1lb3V0fERCREV4cHRpbWV8REJESW5pdFNRTHxEQkRLZWVwfERCRE1heHxEQkRNaW58REJEUGFyYW1zfERCRFBlcnNpc3R8REJEUHJlcGFyZVNRTHxEQkRyaXZlcnxEZWZhdWx0SWNvbnxEZWZhdWx0TGFuZ3VhZ2V8RGVmYXVsdFJ1bnRpbWVEaXJ8RGVmYXVsdFR5cGV8RGVmaW5lfERlZmxhdGVCdWZmZXJTaXplfERlZmxhdGVDb21wcmVzc2lvbkxldmVsfERlZmxhdGVGaWx0ZXJOb3RlfERlZmxhdGVJbmZsYXRlTGltaXRSZXF1ZXN0Qm9keXxEZWZsYXRlSW5mbGF0ZVJhdGlvQnVyc3R8RGVmbGF0ZUluZmxhdGVSYXRpb0xpbWl0fERlZmxhdGVNZW1MZXZlbHxEZWZsYXRlV2luZG93U2l6ZXxEZW55fERpcmVjdG9yeUNoZWNrSGFuZGxlcnxEaXJlY3RvcnlJbmRleHxEaXJlY3RvcnlJbmRleFJlZGlyZWN0fERpcmVjdG9yeVNsYXNofERvY3VtZW50Um9vdHxEVHJhY2VQcml2aWxlZ2VzfER1bXBJT0lucHV0fER1bXBJT091dHB1dHxFbmFibGVFeGNlcHRpb25Ib29rfEVuYWJsZU1NQVB8RW5hYmxlU2VuZGZpbGV8RXJyb3J8RXJyb3JEb2N1bWVudHxFcnJvckxvZ3xFcnJvckxvZ0Zvcm1hdHxFeGFtcGxlfEV4cGlyZXNBY3RpdmV8RXhwaXJlc0J5VHlwZXxFeHBpcmVzRGVmYXVsdHxFeHRlbmRlZFN0YXR1c3xFeHRGaWx0ZXJEZWZpbmV8RXh0RmlsdGVyT3B0aW9uc3xGYWxsYmFja1Jlc291cmNlfEZpbGVFVGFnfEZpbHRlckNoYWlufEZpbHRlckRlY2xhcmV8RmlsdGVyUHJvdG9jb2x8RmlsdGVyUHJvdmlkZXJ8RmlsdGVyVHJhY2V8Rm9yY2VMYW5ndWFnZVByaW9yaXR5fEZvcmNlVHlwZXxGb3JlbnNpY0xvZ3xHcHJvZkRpcnxHcmFjZWZ1bFNodXRkb3duVGltZW91dHxHcm91cHxIZWFkZXJ8SGVhZGVyTmFtZXxIZWFydGJlYXRBZGRyZXNzfEhlYXJ0YmVhdExpc3RlbnxIZWFydGJlYXRNYXhTZXJ2ZXJzfEhlYXJ0YmVhdFN0b3JhZ2V8SGVhcnRiZWF0U3RvcmFnZXxIb3N0bmFtZUxvb2t1cHN8SWRlbnRpdHlDaGVja3xJZGVudGl0eUNoZWNrVGltZW91dHxJbWFwQmFzZXxJbWFwRGVmYXVsdHxJbWFwTWVudXxJbmNsdWRlfEluY2x1ZGVPcHRpb25hbHxJbmRleEhlYWRJbnNlcnR8SW5kZXhJZ25vcmV8SW5kZXhJZ25vcmVSZXNldHxJbmRleE9wdGlvbnN8SW5kZXhPcmRlckRlZmF1bHR8SW5kZXhTdHlsZVNoZWV0fElucHV0U2VkfElTQVBJQXBwZW5kTG9nVG9FcnJvcnN8SVNBUElBcHBlbmRMb2dUb1F1ZXJ5fElTQVBJQ2FjaGVGaWxlfElTQVBJRmFrZUFzeW5jfElTQVBJTG9nTm90U3VwcG9ydGVkfElTQVBJUmVhZEFoZWFkQnVmZmVyfEtlZXBBbGl2ZXxLZWVwQWxpdmVUaW1lb3V0fEtlcHRCb2R5U2l6ZXxMYW5ndWFnZVByaW9yaXR5fExEQVBDYWNoZUVudHJpZXN8TERBUENhY2hlVFRMfExEQVBDb25uZWN0aW9uUG9vbFRUTHxMREFQQ29ubmVjdGlvblRpbWVvdXR8TERBUExpYnJhcnlEZWJ1Z3xMREFQT3BDYWNoZUVudHJpZXN8TERBUE9wQ2FjaGVUVEx8TERBUFJlZmVycmFsSG9wTGltaXR8TERBUFJlZmVycmFsc3xMREFQUmV0cmllc3xMREFQUmV0cnlEZWxheXxMREFQU2hhcmVkQ2FjaGVGaWxlfExEQVBTaGFyZWRDYWNoZVNpemV8TERBUFRpbWVvdXR8TERBUFRydXN0ZWRDbGllbnRDZXJ0fExEQVBUcnVzdGVkR2xvYmFsQ2VydHxMREFQVHJ1c3RlZE1vZGV8TERBUFZlcmlmeVNlcnZlckNlcnR8TGltaXRJbnRlcm5hbFJlY3Vyc2lvbnxMaW1pdFJlcXVlc3RCb2R5fExpbWl0UmVxdWVzdEZpZWxkc3xMaW1pdFJlcXVlc3RGaWVsZFNpemV8TGltaXRSZXF1ZXN0TGluZXxMaW1pdFhNTFJlcXVlc3RCb2R5fExpc3RlbnxMaXN0ZW5CYWNrTG9nfExvYWRGaWxlfExvYWRNb2R1bGV8TG9nRm9ybWF0fExvZ0xldmVsfExvZ01lc3NhZ2V8THVhQXV0aHpQcm92aWRlcnxMdWFDb2RlQ2FjaGV8THVhSG9va0FjY2Vzc0NoZWNrZXJ8THVhSG9va0F1dGhDaGVja2VyfEx1YUhvb2tDaGVja1VzZXJJRHxMdWFIb29rRml4dXBzfEx1YUhvb2tJbnNlcnRGaWx0ZXJ8THVhSG9va0xvZ3xMdWFIb29rTWFwVG9TdG9yYWdlfEx1YUhvb2tUcmFuc2xhdGVOYW1lfEx1YUhvb2tUeXBlQ2hlY2tlcnxMdWFJbmhlcml0fEx1YUlucHV0RmlsdGVyfEx1YU1hcEhhbmRsZXJ8THVhT3V0cHV0RmlsdGVyfEx1YVBhY2thZ2VDUGF0aHxMdWFQYWNrYWdlUGF0aHxMdWFRdWlja0hhbmRsZXJ8THVhUm9vdHxMdWFTY29wZXxNYXhDb25uZWN0aW9uc1BlckNoaWxkfE1heEtlZXBBbGl2ZVJlcXVlc3RzfE1heE1lbUZyZWV8TWF4UmFuZ2VPdmVybGFwc3xNYXhSYW5nZVJldmVyc2Fsc3xNYXhSYW5nZXN8TWF4UmVxdWVzdFdvcmtlcnN8TWF4U3BhcmVTZXJ2ZXJzfE1heFNwYXJlVGhyZWFkc3xNYXhUaHJlYWRzfE1lcmdlVHJhaWxlcnN8TWV0YURpcnxNZXRhRmlsZXN8TWV0YVN1ZmZpeHxNaW1lTWFnaWNGaWxlfE1pblNwYXJlU2VydmVyc3xNaW5TcGFyZVRocmVhZHN8TU1hcEZpbGV8TW9kZW1TdGFuZGFyZHxNb2RNaW1lVXNlUGF0aEluZm98TXVsdGl2aWV3c01hdGNofE11dGV4fE5hbWVWaXJ0dWFsSG9zdHxOb1Byb3h5fE5XU1NMVHJ1c3RlZENlcnRzfE5XU1NMVXBncmFkZWFibGV8T3B0aW9uc3xPcmRlcnxPdXRwdXRTZWR8UGFzc0VudnxQaWRGaWxlfFByaXZpbGVnZXNNb2RlfFByb3RvY29sfFByb3RvY29sRWNob3xQcm94eUFkZEhlYWRlcnN8UHJveHlCYWRIZWFkZXJ8UHJveHlCbG9ja3xQcm94eURvbWFpbnxQcm94eUVycm9yT3ZlcnJpZGV8UHJveHlFeHByZXNzREJNRmlsZXxQcm94eUV4cHJlc3NEQk1UeXBlfFByb3h5RXhwcmVzc0VuYWJsZXxQcm94eUZ0cERpckNoYXJzZXR8UHJveHlGdHBFc2NhcGVXaWxkY2FyZHN8UHJveHlGdHBMaXN0T25XaWxkY2FyZHxQcm94eUhUTUxCdWZTaXplfFByb3h5SFRNTENoYXJzZXRPdXR8UHJveHlIVE1MRG9jVHlwZXxQcm94eUhUTUxFbmFibGV8UHJveHlIVE1MRXZlbnRzfFByb3h5SFRNTEV4dGVuZGVkfFByb3h5SFRNTEZpeHVwc3xQcm94eUhUTUxJbnRlcnB8UHJveHlIVE1MTGlua3N8UHJveHlIVE1MTWV0YXxQcm94eUhUTUxTdHJpcENvbW1lbnRzfFByb3h5SFRNTFVSTE1hcHxQcm94eUlPQnVmZmVyU2l6ZXxQcm94eU1heEZvcndhcmRzfFByb3h5UGFzc3xQcm94eVBhc3NJbmhlcml0fFByb3h5UGFzc0ludGVycG9sYXRlRW52fFByb3h5UGFzc01hdGNofFByb3h5UGFzc1JldmVyc2V8UHJveHlQYXNzUmV2ZXJzZUNvb2tpZURvbWFpbnxQcm94eVBhc3NSZXZlcnNlQ29va2llUGF0aHxQcm94eVByZXNlcnZlSG9zdHxQcm94eVJlY2VpdmVCdWZmZXJTaXplfFByb3h5UmVtb3RlfFByb3h5UmVtb3RlTWF0Y2h8UHJveHlSZXF1ZXN0c3xQcm94eVNDR0lJbnRlcm5hbFJlZGlyZWN0fFByb3h5U0NHSVNlbmRmaWxlfFByb3h5U2V0fFByb3h5U291cmNlQWRkcmVzc3xQcm94eVN0YXR1c3xQcm94eVRpbWVvdXR8UHJveHlWaWF8UmVhZG1lTmFtZXxSZWNlaXZlQnVmZmVyU2l6ZXxSZWRpcmVjdHxSZWRpcmVjdE1hdGNofFJlZGlyZWN0UGVybWFuZW50fFJlZGlyZWN0VGVtcHxSZWZsZWN0b3JIZWFkZXJ8UmVtb3RlSVBIZWFkZXJ8UmVtb3RlSVBJbnRlcm5hbFByb3h5fFJlbW90ZUlQSW50ZXJuYWxQcm94eUxpc3R8UmVtb3RlSVBQcm94aWVzSGVhZGVyfFJlbW90ZUlQVHJ1c3RlZFByb3h5fFJlbW90ZUlQVHJ1c3RlZFByb3h5TGlzdHxSZW1vdmVDaGFyc2V0fFJlbW92ZUVuY29kaW5nfFJlbW92ZUhhbmRsZXJ8UmVtb3ZlSW5wdXRGaWx0ZXJ8UmVtb3ZlTGFuZ3VhZ2V8UmVtb3ZlT3V0cHV0RmlsdGVyfFJlbW92ZVR5cGV8UmVxdWVzdEhlYWRlcnxSZXF1ZXN0UmVhZFRpbWVvdXR8UmVxdWlyZXxSZXdyaXRlQmFzZXxSZXdyaXRlQ29uZHxSZXdyaXRlRW5naW5lfFJld3JpdGVNYXB8UmV3cml0ZU9wdGlvbnN8UmV3cml0ZVJ1bGV8UkxpbWl0Q1BVfFJMaW1pdE1FTXxSTGltaXROUFJPQ3xTYXRpc2Z5fFNjb3JlQm9hcmRGaWxlfFNjcmlwdHxTY3JpcHRBbGlhc3xTY3JpcHRBbGlhc01hdGNofFNjcmlwdEludGVycHJldGVyU291cmNlfFNjcmlwdExvZ3xTY3JpcHRMb2dCdWZmZXJ8U2NyaXB0TG9nTGVuZ3RofFNjcmlwdFNvY2t8U2VjdXJlTGlzdGVufFNlZVJlcXVlc3RUYWlsfFNlbmRCdWZmZXJTaXplfFNlcnZlckFkbWlufFNlcnZlckFsaWFzfFNlcnZlckxpbWl0fFNlcnZlck5hbWV8U2VydmVyUGF0aHxTZXJ2ZXJSb290fFNlcnZlclNpZ25hdHVyZXxTZXJ2ZXJUb2tlbnN8U2Vzc2lvbnxTZXNzaW9uQ29va2llTmFtZXxTZXNzaW9uQ29va2llTmFtZTJ8U2Vzc2lvbkNvb2tpZVJlbW92ZXxTZXNzaW9uQ3J5cHRvQ2lwaGVyfFNlc3Npb25DcnlwdG9Ecml2ZXJ8U2Vzc2lvbkNyeXB0b1Bhc3NwaHJhc2V8U2Vzc2lvbkNyeXB0b1Bhc3NwaHJhc2VGaWxlfFNlc3Npb25EQkRDb29raWVOYW1lfFNlc3Npb25EQkRDb29raWVOYW1lMnxTZXNzaW9uREJEQ29va2llUmVtb3ZlfFNlc3Npb25EQkREZWxldGVMYWJlbHxTZXNzaW9uREJESW5zZXJ0TGFiZWx8U2Vzc2lvbkRCRFBlclVzZXJ8U2Vzc2lvbkRCRFNlbGVjdExhYmVsfFNlc3Npb25EQkRVcGRhdGVMYWJlbHxTZXNzaW9uRW52fFNlc3Npb25FeGNsdWRlfFNlc3Npb25IZWFkZXJ8U2Vzc2lvbkluY2x1ZGV8U2Vzc2lvbk1heEFnZXxTZXRFbnZ8U2V0RW52SWZ8U2V0RW52SWZFeHByfFNldEVudklmTm9DYXNlfFNldEhhbmRsZXJ8U2V0SW5wdXRGaWx0ZXJ8U2V0T3V0cHV0RmlsdGVyfFNTSUVuZFRhZ3xTU0lFcnJvck1zZ3xTU0lFVGFnfFNTSUxhc3RNb2RpZmllZHxTU0lMZWdhY3lFeHByUGFyc2VyfFNTSVN0YXJ0VGFnfFNTSVRpbWVGb3JtYXR8U1NJVW5kZWZpbmVkRWNob3xTU0xDQUNlcnRpZmljYXRlRmlsZXxTU0xDQUNlcnRpZmljYXRlUGF0aHxTU0xDQUROUmVxdWVzdEZpbGV8U1NMQ0FETlJlcXVlc3RQYXRofFNTTENBUmV2b2NhdGlvbkNoZWNrfFNTTENBUmV2b2NhdGlvbkZpbGV8U1NMQ0FSZXZvY2F0aW9uUGF0aHxTU0xDZXJ0aWZpY2F0ZUNoYWluRmlsZXxTU0xDZXJ0aWZpY2F0ZUZpbGV8U1NMQ2VydGlmaWNhdGVLZXlGaWxlfFNTTENpcGhlclN1aXRlfFNTTENvbXByZXNzaW9ufFNTTENyeXB0b0RldmljZXxTU0xFbmdpbmV8U1NMRklQU3xTU0xIb25vckNpcGhlck9yZGVyfFNTTEluc2VjdXJlUmVuZWdvdGlhdGlvbnxTU0xPQ1NQRGVmYXVsdFJlc3BvbmRlcnxTU0xPQ1NQRW5hYmxlfFNTTE9DU1BPdmVycmlkZVJlc3BvbmRlcnxTU0xPQ1NQUmVzcG9uZGVyVGltZW91dHxTU0xPQ1NQUmVzcG9uc2VNYXhBZ2V8U1NMT0NTUFJlc3BvbnNlVGltZVNrZXd8U1NMT0NTUFVzZVJlcXVlc3ROb25jZXxTU0xPcGVuU1NMQ29uZkNtZHxTU0xPcHRpb25zfFNTTFBhc3NQaHJhc2VEaWFsb2d8U1NMUHJvdG9jb2x8U1NMUHJveHlDQUNlcnRpZmljYXRlRmlsZXxTU0xQcm94eUNBQ2VydGlmaWNhdGVQYXRofFNTTFByb3h5Q0FSZXZvY2F0aW9uQ2hlY2t8U1NMUHJveHlDQVJldm9jYXRpb25GaWxlfFNTTFByb3h5Q0FSZXZvY2F0aW9uUGF0aHxTU0xQcm94eUNoZWNrUGVlckNOfFNTTFByb3h5Q2hlY2tQZWVyRXhwaXJlfFNTTFByb3h5Q2hlY2tQZWVyTmFtZXxTU0xQcm94eUNpcGhlclN1aXRlfFNTTFByb3h5RW5naW5lfFNTTFByb3h5TWFjaGluZUNlcnRpZmljYXRlQ2hhaW5GaWxlfFNTTFByb3h5TWFjaGluZUNlcnRpZmljYXRlRmlsZXxTU0xQcm94eU1hY2hpbmVDZXJ0aWZpY2F0ZVBhdGh8U1NMUHJveHlQcm90b2NvbHxTU0xQcm94eVZlcmlmeXxTU0xQcm94eVZlcmlmeURlcHRofFNTTFJhbmRvbVNlZWR8U1NMUmVuZWdCdWZmZXJTaXplfFNTTFJlcXVpcmV8U1NMUmVxdWlyZVNTTHxTU0xTZXNzaW9uQ2FjaGV8U1NMU2Vzc2lvbkNhY2hlVGltZW91dHxTU0xTZXNzaW9uVGlja2V0S2V5RmlsZXxTU0xTUlBVbmtub3duVXNlclNlZWR8U1NMU1JQVmVyaWZpZXJGaWxlfFNTTFN0YXBsaW5nQ2FjaGV8U1NMU3RhcGxpbmdFcnJvckNhY2hlVGltZW91dHxTU0xTdGFwbGluZ0Zha2VUcnlMYXRlcnxTU0xTdGFwbGluZ0ZvcmNlVVJMfFNTTFN0YXBsaW5nUmVzcG9uZGVyVGltZW91dHxTU0xTdGFwbGluZ1Jlc3BvbnNlTWF4QWdlfFNTTFN0YXBsaW5nUmVzcG9uc2VUaW1lU2tld3xTU0xTdGFwbGluZ1JldHVyblJlc3BvbmRlckVycm9yc3xTU0xTdGFwbGluZ1N0YW5kYXJkQ2FjaGVUaW1lb3V0fFNTTFN0cmljdFNOSVZIb3N0Q2hlY2t8U1NMVXNlck5hbWV8U1NMVXNlU3RhcGxpbmd8U1NMVmVyaWZ5Q2xpZW50fFNTTFZlcmlmeURlcHRofFN0YXJ0U2VydmVyc3xTdGFydFRocmVhZHN8U3Vic3RpdHV0ZXxTdWV4ZWN8U3VleGVjVXNlckdyb3VwfFRocmVhZExpbWl0fFRocmVhZHNQZXJDaGlsZHxUaHJlYWRTdGFja1NpemV8VGltZU91dHxUcmFjZUVuYWJsZXxUcmFuc2ZlckxvZ3xUeXBlc0NvbmZpZ3xVbkRlZmluZXxVbmRlZk1hY3JvfFVuc2V0RW52fFVzZXxVc2VDYW5vbmljYWxOYW1lfFVzZUNhbm9uaWNhbFBoeXNpY2FsUG9ydHxVc2VyfFVzZXJEaXJ8Vkhvc3RDR0lNb2RlfFZIb3N0Q0dJUHJpdnN8Vkhvc3RHcm91cHxWSG9zdFByaXZzfFZIb3N0U2VjdXJlfFZIb3N0VXNlcnxWaXJ0dWFsRG9jdW1lbnRSb290fFZpcnR1YWxEb2N1bWVudFJvb3RJUHxWaXJ0dWFsU2NyaXB0QWxpYXN8VmlydHVhbFNjcmlwdEFsaWFzSVB8V2F0Y2hkb2dJbnRlcnZhbHxYQml0SGFja3x4bWwyRW5jQWxpYXN8eG1sMkVuY0RlZmF1bHR8eG1sMlN0YXJ0UGFyc2UpXFxiL2dtaSxcblx0XHRhbGlhczogJ3Byb3BlcnR5J1xuXHR9LFxuXHQnZGlyZWN0aXZlLWJsb2NrJzoge1xuXHRcdHBhdHRlcm46IC88XFwvP1xcYihBdXRoblByb3ZpZGVyQWxpYXN8QXV0aHpQcm92aWRlckFsaWFzfERpcmVjdG9yeXxEaXJlY3RvcnlNYXRjaHxFbHNlfEVsc2VJZnxGaWxlc3xGaWxlc01hdGNofElmfElmRGVmaW5lfElmTW9kdWxlfElmVmVyc2lvbnxMaW1pdHxMaW1pdEV4Y2VwdHxMb2NhdGlvbnxMb2NhdGlvbk1hdGNofE1hY3JvfFByb3h5fFJlcXVpcmVBbGx8UmVxdWlyZUFueXxSZXF1aXJlTm9uZXxWaXJ0dWFsSG9zdClcXGIgKi4qPi9naSxcblx0XHRpbnNpZGU6IHtcblx0XHRcdCdkaXJlY3RpdmUtYmxvY2snOiB7XG5cdFx0XHRcdHBhdHRlcm46IC9ePFxcLz9cXHcrLyxcblx0XHRcdFx0aW5zaWRlOiB7XG5cdFx0XHRcdFx0J3B1bmN0dWF0aW9uJzogL148XFwvPy9cblx0XHRcdFx0fSxcblx0XHRcdFx0YWxpYXM6ICd0YWcnXG5cdFx0XHR9LFxuXHRcdFx0J2RpcmVjdGl2ZS1ibG9jay1wYXJhbWV0ZXInOiB7XG5cdFx0XHRcdHBhdHRlcm46IC8uKltePl0vLFxuXHRcdFx0XHRpbnNpZGU6IHtcblx0XHRcdFx0XHQncHVuY3R1YXRpb24nOiAvOi8sXG5cdFx0XHRcdFx0J3N0cmluZyc6IHtcblx0XHRcdFx0XHRcdHBhdHRlcm46IC8oXCJ8JykuKlxcMS9nLFxuXHRcdFx0XHRcdFx0aW5zaWRlOiB7XG5cdFx0XHRcdFx0XHRcdCd2YXJpYWJsZSc6IC8oXFwkfCUpXFx7PyhcXHdcXC4/KFxcK3xcXC18Oik/KStcXH0/L2dcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGFsaWFzOiAnYXR0ci12YWx1ZSdcblx0XHRcdH0sXG5cdFx0XHQncHVuY3R1YXRpb24nOiAvPi9cblx0XHR9LFxuXHRcdGFsaWFzOiAndGFnJ1xuXHR9LFxuXHQnZGlyZWN0aXZlLWZsYWdzJzoge1xuXHRcdHBhdHRlcm46IC9cXFsoXFx3LD8pK1xcXS9nLFxuXHRcdGFsaWFzOiAna2V5d29yZCdcblx0fSxcblx0J3N0cmluZyc6IHtcblx0XHRwYXR0ZXJuOiAvKFwifCcpLipcXDEvZyxcblx0XHRpbnNpZGU6IHtcblx0XHRcdCd2YXJpYWJsZSc6IC8oXFwkfCUpXFx7PyhcXHdcXC4/KFxcK3xcXC18Oik/KStcXH0/L2dcblx0XHR9XG5cdH0sXG5cdCd2YXJpYWJsZSc6IC8oXFwkfCUpXFx7PyhcXHdcXC4/KFxcK3xcXC18Oik/KStcXH0/L2csXG5cdCdyZWdleCc6IC9cXF4/LipcXCR8XFxeLipcXCQ/L2dcbn07XG5cblByaXNtLmxhbmd1YWdlcy5qYXZhID0gUHJpc20ubGFuZ3VhZ2VzLmV4dGVuZCgnY2xpa2UnLCB7XG5cdCdrZXl3b3JkJzogL1xcYihhYnN0cmFjdHxjb250aW51ZXxmb3J8bmV3fHN3aXRjaHxhc3NlcnR8ZGVmYXVsdHxnb3RvfHBhY2thZ2V8c3luY2hyb25pemVkfGJvb2xlYW58ZG98aWZ8cHJpdmF0ZXx0aGlzfGJyZWFrfGRvdWJsZXxpbXBsZW1lbnRzfHByb3RlY3RlZHx0aHJvd3xieXRlfGVsc2V8aW1wb3J0fHB1YmxpY3x0aHJvd3N8Y2FzZXxlbnVtfGluc3RhbmNlb2Z8cmV0dXJufHRyYW5zaWVudHxjYXRjaHxleHRlbmRzfGludHxzaG9ydHx0cnl8Y2hhcnxmaW5hbHxpbnRlcmZhY2V8c3RhdGljfHZvaWR8Y2xhc3N8ZmluYWxseXxsb25nfHN0cmljdGZwfHZvbGF0aWxlfGNvbnN0fGZsb2F0fG5hdGl2ZXxzdXBlcnx3aGlsZSlcXGIvZyxcblx0J251bWJlcic6IC9cXGIwYlswMV0rXFxifFxcYjB4W1xcZGEtZl0qXFwuP1tcXGRhLWZwXFwtXStcXGJ8XFxiXFxkKlxcLj9cXGQrW2VdP1tcXGRdKltkZl1cXGJ8XFxXXFxkKlxcLj9cXGQrXFxiL2dpLFxuXHQnb3BlcmF0b3InOiB7XG5cdFx0cGF0dGVybjogLyhefFteXFwuXSkoPzpcXCs9fFxcK1xcKz98LT18LS0/fCE9P3w8ezEsMn09P3w+ezEsM309P3w9PT98Jj18JiY/fFxcfD18XFx8XFx8P3xcXD98XFwqPT98XFwvPT98JT0/fFxcXj0/fDp8fikvZ20sXG5cdFx0bG9va2JlaGluZDogdHJ1ZVxuXHR9XG59KTtcblByaXNtLmxhbmd1YWdlcy5weXRob249IHsgXG5cdCdjb21tZW50Jzoge1xuXHRcdHBhdHRlcm46IC8oXnxbXlxcXFxdKSMuKj8oXFxyP1xcbnwkKS9nLFxuXHRcdGxvb2tiZWhpbmQ6IHRydWVcblx0fSxcblx0J3N0cmluZyc6IC9cIlwiXCJbXFxzXFxTXSs/XCJcIlwifChcInwnKShcXFxcPy4pKj9cXDEvZyxcblx0J2tleXdvcmQnIDogL1xcYihhc3xhc3NlcnR8YnJlYWt8Y2xhc3N8Y29udGludWV8ZGVmfGRlbHxlbGlmfGVsc2V8ZXhjZXB0fGV4ZWN8ZmluYWxseXxmb3J8ZnJvbXxnbG9iYWx8aWZ8aW1wb3J0fGlufGlzfGxhbWJkYXxwYXNzfHByaW50fHJhaXNlfHJldHVybnx0cnl8d2hpbGV8d2l0aHx5aWVsZClcXGIvZyxcblx0J2Jvb2xlYW4nIDogL1xcYihUcnVlfEZhbHNlKVxcYi9nLFxuXHQnbnVtYmVyJyA6IC9cXGItPygweCk/XFxkKlxcLj9bXFxkYS1mXStcXGIvZyxcblx0J29wZXJhdG9yJyA6IC9bLStdezEsMn18PT8mbHQ7fD0/Jmd0O3whfD17MSwyfXwoJil7MSwyfXwoJmFtcDspezEsMn18XFx8P1xcfHxcXD98XFwqfFxcL3x+fFxcXnwlfFxcYihvcnxhbmR8bm90KVxcYi9nLFxuXHQnaWdub3JlJyA6IC8mKGx0fGd0fGFtcCk7L2dpLFxuXHQncHVuY3R1YXRpb24nIDogL1t7fVtcXF07KCksLjpdL2dcbn07XG5cblxuUHJpc20ubGFuZ3VhZ2VzLmFzcG5ldCA9IFByaXNtLmxhbmd1YWdlcy5leHRlbmQoJ21hcmt1cCcsIHtcblx0J3BhZ2UtZGlyZWN0aXZlIHRhZyc6IHtcblx0XHRwYXR0ZXJuOiAvPCVcXHMqQC4qJT4vZ2ksXG5cdFx0aW5zaWRlOiB7XG5cdFx0XHQncGFnZS1kaXJlY3RpdmUgdGFnJzogLzwlXFxzKkBcXHMqKD86QXNzZW1ibHl8Q29udHJvbHxJbXBsZW1lbnRzfEltcG9ydHxNYXN0ZXJ8TWFzdGVyVHlwZXxPdXRwdXRDYWNoZXxQYWdlfFByZXZpb3VzUGFnZVR5cGV8UmVmZXJlbmNlfFJlZ2lzdGVyKT98JT4vaWcsXG5cdFx0XHRyZXN0OiBQcmlzbS5sYW5ndWFnZXMubWFya3VwLnRhZy5pbnNpZGVcblx0XHR9XG5cdH0sXG5cdCdkaXJlY3RpdmUgdGFnJzoge1xuXHRcdHBhdHRlcm46IC88JS4qJT4vZ2ksXG5cdFx0aW5zaWRlOiB7XG5cdFx0XHQnZGlyZWN0aXZlIHRhZyc6IC88JVxccyo/WyQ9JSM6XXswLDJ9fCU+L2dpLFxuXHRcdFx0cmVzdDogUHJpc20ubGFuZ3VhZ2VzLmNzaGFycFxuXHRcdH1cblx0fVxufSk7XG5cbi8vIG1hdGNoIGRpcmVjdGl2ZXMgb2YgYXR0cmlidXRlIHZhbHVlIGZvbz1cIjwlIEJhciAlPlwiXG5QcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKCdpbnNpZGUnLCAncHVuY3R1YXRpb24nLCB7XG5cdCdkaXJlY3RpdmUgdGFnJzogUHJpc20ubGFuZ3VhZ2VzLmFzcG5ldFsnZGlyZWN0aXZlIHRhZyddXG59LCBQcmlzbS5sYW5ndWFnZXMuYXNwbmV0LnRhZy5pbnNpZGVbXCJhdHRyLXZhbHVlXCJdKTtcblxuUHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZSgnYXNwbmV0JywgJ2NvbW1lbnQnLCB7XG5cdCdhc3AgY29tbWVudCc6IC88JS0tW1xcd1xcV10qPy0tJT4vZ1xufSk7XG5cbi8vIHNjcmlwdCBydW5hdD1cInNlcnZlclwiIGNvbnRhaW5zIGNzaGFycCwgbm90IGphdmFzY3JpcHRcblByaXNtLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoJ2FzcG5ldCcsIFByaXNtLmxhbmd1YWdlcy5qYXZhc2NyaXB0ID8gJ3NjcmlwdCcgOiAndGFnJywge1xuXHQnYXNwIHNjcmlwdCc6IHtcblx0XHRwYXR0ZXJuOiAvPHNjcmlwdCg/PS4qcnVuYXQ9WydcIl0/c2VydmVyWydcIl0/KVtcXHdcXFddKj8+W1xcd1xcV10qPzxcXC9zY3JpcHQ+L2lnLFxuXHRcdGluc2lkZToge1xuXHRcdFx0dGFnOiB7XG5cdFx0XHRcdHBhdHRlcm46IC88XFwvP3NjcmlwdFxccyooPzpcXHMrW1xcdzotXSsoPzo9KD86KFwifCcpKFxcXFw/W1xcd1xcV10pKj9cXDF8XFx3KykpP1xccyopKlxcLz8+L2dpLFxuXHRcdFx0XHRpbnNpZGU6IFByaXNtLmxhbmd1YWdlcy5hc3BuZXQudGFnLmluc2lkZVxuXHRcdFx0fSxcblx0XHRcdHJlc3Q6IFByaXNtLmxhbmd1YWdlcy5jc2hhcnAgfHwge31cblx0XHR9XG5cdH1cbn0pO1xuXG4vLyBIYWNrcyB0byBmaXggZWFnZXIgdGFnIG1hdGNoaW5nIGZpbmlzaGluZyB0b28gZWFybHk6IDxzY3JpcHQgc3JjPVwiPCUgRm9vLkJhciAlPlwiPiA9PiA8c2NyaXB0IHNyYz1cIjwlIEZvby5CYXIgJT5cbmlmICggUHJpc20ubGFuZ3VhZ2VzLmFzcG5ldC5zdHlsZSApIHtcblx0UHJpc20ubGFuZ3VhZ2VzLmFzcG5ldC5zdHlsZS5pbnNpZGUudGFnLnBhdHRlcm4gPSAvPFxcLz9zdHlsZVxccyooPzpcXHMrW1xcdzotXSsoPzo9KD86KFwifCcpKFxcXFw/W1xcd1xcV10pKj9cXDF8XFx3KykpP1xccyopKlxcLz8+L2dpO1xuXHRQcmlzbS5sYW5ndWFnZXMuYXNwbmV0LnN0eWxlLmluc2lkZS50YWcuaW5zaWRlID0gUHJpc20ubGFuZ3VhZ2VzLmFzcG5ldC50YWcuaW5zaWRlO1xufVxuaWYgKCBQcmlzbS5sYW5ndWFnZXMuYXNwbmV0LnNjcmlwdCApIHtcblx0UHJpc20ubGFuZ3VhZ2VzLmFzcG5ldC5zY3JpcHQuaW5zaWRlLnRhZy5wYXR0ZXJuID0gUHJpc20ubGFuZ3VhZ2VzLmFzcG5ldFsnYXNwIHNjcmlwdCddLmluc2lkZS50YWcucGF0dGVyblxuXHRQcmlzbS5sYW5ndWFnZXMuYXNwbmV0LnNjcmlwdC5pbnNpZGUudGFnLmluc2lkZSA9IFByaXNtLmxhbmd1YWdlcy5hc3BuZXQudGFnLmluc2lkZTtcbn1cblByaXNtLmxhbmd1YWdlcy5jc3MgPSB7XG5cdCdjb21tZW50JzogL1xcL1xcKltcXHdcXFddKj9cXCpcXC8vZyxcblx0J2F0cnVsZSc6IHtcblx0XHRwYXR0ZXJuOiAvQFtcXHctXSs/Lio/KDt8KD89XFxzKnspKS9naSxcblx0XHRpbnNpZGU6IHtcblx0XHRcdCdwdW5jdHVhdGlvbic6IC9bOzpdL2dcblx0XHR9XG5cdH0sXG5cdCd1cmwnOiAvdXJsXFwoKFtcIiddPykuKj9cXDFcXCkvZ2ksXG5cdCdzZWxlY3Rvcic6IC9bXlxce1xcfVxcc11bXlxce1xcfTtdKig/PVxccypcXHspL2csXG5cdCdwcm9wZXJ0eSc6IC8oXFxifFxcQilbXFx3LV0rKD89XFxzKjopL2lnLFxuXHQnc3RyaW5nJzogLyhcInwnKShcXFxcPy4pKj9cXDEvZyxcblx0J2ltcG9ydGFudCc6IC9cXEIhaW1wb3J0YW50XFxiL2dpLFxuXHQncHVuY3R1YXRpb24nOiAvW1xce1xcfTs6XS9nLFxuXHQnZnVuY3Rpb24nOiAvWy1hLXowLTldKyg/PVxcKCkvaWdcbn07XG5cbmlmIChQcmlzbS5sYW5ndWFnZXMubWFya3VwKSB7XG5cdFByaXNtLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoJ21hcmt1cCcsICd0YWcnLCB7XG5cdFx0J3N0eWxlJzoge1xuXHRcdFx0cGF0dGVybjogLzxzdHlsZVtcXHdcXFddKj8+W1xcd1xcV10qPzxcXC9zdHlsZT4vaWcsXG5cdFx0XHRpbnNpZGU6IHtcblx0XHRcdFx0J3RhZyc6IHtcblx0XHRcdFx0XHRwYXR0ZXJuOiAvPHN0eWxlW1xcd1xcV10qPz58PFxcL3N0eWxlPi9pZyxcblx0XHRcdFx0XHRpbnNpZGU6IFByaXNtLmxhbmd1YWdlcy5tYXJrdXAudGFnLmluc2lkZVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRyZXN0OiBQcmlzbS5sYW5ndWFnZXMuY3NzXG5cdFx0XHR9LFxuXHRcdFx0YWxpYXM6ICdsYW5ndWFnZS1jc3MnXG5cdFx0fVxuXHR9KTtcblx0XG5cdFByaXNtLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoJ2luc2lkZScsICdhdHRyLXZhbHVlJywge1xuXHRcdCdzdHlsZS1hdHRyJzoge1xuXHRcdFx0cGF0dGVybjogL1xccypzdHlsZT0oXCJ8JykuKz9cXDEvaWcsXG5cdFx0XHRpbnNpZGU6IHtcblx0XHRcdFx0J2F0dHItbmFtZSc6IHtcblx0XHRcdFx0XHRwYXR0ZXJuOiAvXlxccypzdHlsZS9pZyxcblx0XHRcdFx0XHRpbnNpZGU6IFByaXNtLmxhbmd1YWdlcy5tYXJrdXAudGFnLmluc2lkZVxuXHRcdFx0XHR9LFxuXHRcdFx0XHQncHVuY3R1YXRpb24nOiAvXlxccyo9XFxzKlsnXCJdfFsnXCJdXFxzKiQvLFxuXHRcdFx0XHQnYXR0ci12YWx1ZSc6IHtcblx0XHRcdFx0XHRwYXR0ZXJuOiAvLisvZ2ksXG5cdFx0XHRcdFx0aW5zaWRlOiBQcmlzbS5sYW5ndWFnZXMuY3NzXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRhbGlhczogJ2xhbmd1YWdlLWNzcydcblx0XHR9XG5cdH0sIFByaXNtLmxhbmd1YWdlcy5tYXJrdXAudGFnKTtcbn1cblByaXNtLmxhbmd1YWdlcy5qYXZhc2NyaXB0ID0gUHJpc20ubGFuZ3VhZ2VzLmV4dGVuZCgnY2xpa2UnLCB7XG5cdCdrZXl3b3JkJzogL1xcYihicmVha3xjYXNlfGNhdGNofGNsYXNzfGNvbnN0fGNvbnRpbnVlfGRlYnVnZ2VyfGRlZmF1bHR8ZGVsZXRlfGRvfGVsc2V8ZW51bXxleHBvcnR8ZXh0ZW5kc3xmYWxzZXxmaW5hbGx5fGZvcnxmdW5jdGlvbnxnZXR8aWZ8aW1wbGVtZW50c3xpbXBvcnR8aW58aW5zdGFuY2VvZnxpbnRlcmZhY2V8bGV0fG5ld3xudWxsfHBhY2thZ2V8cHJpdmF0ZXxwcm90ZWN0ZWR8cHVibGljfHJldHVybnxzZXR8c3RhdGljfHN1cGVyfHN3aXRjaHx0aGlzfHRocm93fHRydWV8dHJ5fHR5cGVvZnx2YXJ8dm9pZHx3aGlsZXx3aXRofHlpZWxkKVxcYi9nLFxuXHQnbnVtYmVyJzogL1xcYi0/KDB4W1xcZEEtRmEtZl0rfFxcZCpcXC4/XFxkKyhbRWVdLT9cXGQrKT98TmFOfC0/SW5maW5pdHkpXFxiL2dcbn0pO1xuXG5QcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKCdqYXZhc2NyaXB0JywgJ2tleXdvcmQnLCB7XG5cdCdyZWdleCc6IHtcblx0XHRwYXR0ZXJuOiAvKF58W14vXSlcXC8oPyFcXC8pKFxcWy4rP118XFxcXC58W14vXFxyXFxuXSkrXFwvW2dpbV17MCwzfSg/PVxccyooJHxbXFxyXFxuLC47fSldKSkvZyxcblx0XHRsb29rYmVoaW5kOiB0cnVlXG5cdH1cbn0pO1xuXG5pZiAoUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cCkge1xuXHRQcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKCdtYXJrdXAnLCAndGFnJywge1xuXHRcdCdzY3JpcHQnOiB7XG5cdFx0XHRwYXR0ZXJuOiAvPHNjcmlwdFtcXHdcXFddKj8+W1xcd1xcV10qPzxcXC9zY3JpcHQ+L2lnLFxuXHRcdFx0aW5zaWRlOiB7XG5cdFx0XHRcdCd0YWcnOiB7XG5cdFx0XHRcdFx0cGF0dGVybjogLzxzY3JpcHRbXFx3XFxXXSo/Pnw8XFwvc2NyaXB0Pi9pZyxcblx0XHRcdFx0XHRpbnNpZGU6IFByaXNtLmxhbmd1YWdlcy5tYXJrdXAudGFnLmluc2lkZVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRyZXN0OiBQcmlzbS5sYW5ndWFnZXMuamF2YXNjcmlwdFxuXHRcdFx0fSxcblx0XHRcdGFsaWFzOiAnbGFuZ3VhZ2UtamF2YXNjcmlwdCdcblx0XHR9XG5cdH0pO1xufVxuXG5QcmlzbS5sYW5ndWFnZXMucmlwID0ge1xuXHQnY29tbWVudCc6IC8jW15cXHJcXG5dKihcXHI/XFxufCQpL2csXG5cblx0J2tleXdvcmQnOiAvKD86PT58LT4pfFxcYig/OmNsYXNzfGlmfGVsc2V8c3dpdGNofGNhc2V8cmV0dXJufGV4aXR8dHJ5fGNhdGNofGZpbmFsbHl8cmFpc2UpXFxiL2csXG5cblx0J2J1aWx0aW4nOiAvXFxiKEB8U3lzdGVtKVxcYi9nLFxuXG5cdCdib29sZWFuJzogL1xcYih0cnVlfGZhbHNlKVxcYi9nLFxuXG5cdCdkYXRlJzogL1xcYlxcZHs0fS1cXGR7Mn0tXFxkezJ9XFxiL2csXG5cdCd0aW1lJzogL1xcYlxcZHsyfTpcXGR7Mn06XFxkezJ9XFxiL2csXG5cdCdkYXRldGltZSc6IC9cXGJcXGR7NH0tXFxkezJ9LVxcZHsyfVRcXGR7Mn06XFxkezJ9OlxcZHsyfVxcYi9nLFxuXG5cdCdudW1iZXInOiAvWystXT8oPzooPzpcXGQrXFwuXFxkKyl8KD86XFxkKykpL2csXG5cblx0J2NoYXJhY3Rlcic6IC9cXEJgW15cXHNcXGBcXCdcIiwuOjsjXFwvXFxcXCgpPD5cXFtcXF17fV1cXGIvZyxcblxuXHQncmVnZXgnOiB7XG5cdFx0cGF0dGVybjogLyhefFteL10pXFwvKD8hXFwvKShcXFsuKz9dfFxcXFwufFteL1xcclxcbl0pK1xcLyg/PVxccyooJHxbXFxyXFxuLC47fSldKSkvZyxcblx0XHRsb29rYmVoaW5kOiB0cnVlXG5cdH0sXG5cblx0J3N5bWJvbCc6IC86W15cXGRcXHNcXGBcXCdcIiwuOjsjXFwvXFxcXCgpPD5cXFtcXF17fV1bXlxcc1xcYFxcJ1wiLC46OyNcXC9cXFxcKCk8PlxcW1xcXXt9XSovZyxcblx0J3N0cmluZyc6IC8oXCJ8JykoXFxcXD8uKSo/XFwxL2csXG5cblx0J3B1bmN0dWF0aW9uJzogLyg/OlxcLnsyLDN9KXxbXFxgLC46Oz1cXC9cXFxcKCk8PlxcW1xcXXt9XS8sXG5cblx0J3JlZmVyZW5jZSc6IC9bXlxcZFxcc1xcYFxcJ1wiLC46OyNcXC9cXFxcKCk8PlxcW1xcXXt9XVteXFxzXFxgXFwnXCIsLjo7I1xcL1xcXFwoKTw+XFxbXFxde31dKi9nXG59O1xuXG4vLyBOT1RFUyAtIGZvbGxvd3MgZmlyc3QtZmlyc3QgaGlnaGxpZ2h0IG1ldGhvZCwgYmxvY2sgaXMgbG9ja2VkIGFmdGVyIGhpZ2hsaWdodCwgZGlmZmVyZW50IGZyb20gU3ludGF4SGxcclxuUHJpc20ubGFuZ3VhZ2VzLmF1dG9ob3RrZXk9IHtcclxuXHQnY29tbWVudCc6IHtcclxuXHRcdHBhdHRlcm46IC8oXlteXCI7XFxuXSooXCJbXlwiXFxuXSo/XCJbXlwiXFxuXSo/KSopKDsuKiR8XlxccypcXC9cXCpbXFxzXFxTXSpcXG5cXCpcXC8pL2dtLFxyXG5cdFx0bG9va2JlaGluZDogdHJ1ZVxyXG5cdH0sXHJcblx0J3N0cmluZyc6IC9cIigoW15cIlxcblxccl18XCJcIikqKVwiL2dtLFxyXG5cdCdmdW5jdGlvbic6IC9bXlxcKFxcKTsgXFx0XFwsXFxuXFwrXFwqXFwtXFw9XFw/PjpcXFxcXFwvPFxcJiVcXFtcXF1dKz8oPz1cXCgpL2dtLCAgLy9mdW5jdGlvbiAtIGRvbid0IHVzZSAuKlxcKSBpbiB0aGUgZW5kIGJjb3ogc3RyaW5nIGxvY2tzIGl0XHJcblx0J3RhZyc6IC9eWyBcXHRdKlteXFxzOl0rPyg/PTpbXjpdKS9nbSwgIC8vbGFiZWxzXHJcblx0J3ZhcmlhYmxlJzogL1xcJVxcdytcXCUvZyxcclxuXHQnbnVtYmVyJzogL1xcYi0/KDB4W1xcZEEtRmEtZl0rfFxcZCpcXC4/XFxkKyhbRWVdLT9cXGQrKT8pXFxiL2csXHJcblx0J29wZXJhdG9yJzogL1tcXCtcXC1cXCpcXFxcXFwvOj1cXD9cXCZcXHw8Pl0vZyxcclxuXHQncHVuY3R1YXRpb24nOiAvW1xce31bXFxdXFwoXFwpOl0vZyxcclxuXHQnYm9vbGVhbic6IC9cXGIodHJ1ZXxmYWxzZSlcXGIvZyxcclxuXHJcblx0J3NlbGVjdG9yJzogL1xcYihBdXRvVHJpbXxCbG9ja0lucHV0fEJyZWFrfENsaWNrfENsaXBXYWl0fENvbnRpbnVlfENvbnRyb2x8Q29udHJvbENsaWNrfENvbnRyb2xGb2N1c3xDb250cm9sR2V0fENvbnRyb2xHZXRGb2N1c3xDb250cm9sR2V0UG9zfENvbnRyb2xHZXRUZXh0fENvbnRyb2xNb3ZlfENvbnRyb2xTZW5kfENvbnRyb2xTZW5kUmF3fENvbnRyb2xTZXRUZXh0fENvb3JkTW9kZXxDcml0aWNhbHxEZXRlY3RIaWRkZW5UZXh0fERldGVjdEhpZGRlbldpbmRvd3N8RHJpdmV8RHJpdmVHZXR8RHJpdmVTcGFjZUZyZWV8RW52QWRkfEVudkRpdnxFbnZHZXR8RW52TXVsdHxFbnZTZXR8RW52U3VifEVudlVwZGF0ZXxFeGl0fEV4aXRBcHB8RmlsZUFwcGVuZHxGaWxlQ29weXxGaWxlQ29weURpcnxGaWxlQ3JlYXRlRGlyfEZpbGVDcmVhdGVTaG9ydGN1dHxGaWxlRGVsZXRlfEZpbGVFbmNvZGluZ3xGaWxlR2V0QXR0cmlifEZpbGVHZXRTaG9ydGN1dHxGaWxlR2V0U2l6ZXxGaWxlR2V0VGltZXxGaWxlR2V0VmVyc2lvbnxGaWxlSW5zdGFsbHxGaWxlTW92ZXxGaWxlTW92ZURpcnxGaWxlUmVhZHxGaWxlUmVhZExpbmV8RmlsZVJlY3ljbGV8RmlsZVJlY3ljbGVFbXB0eXxGaWxlUmVtb3ZlRGlyfEZpbGVTZWxlY3RGaWxlfEZpbGVTZWxlY3RGb2xkZXJ8RmlsZVNldEF0dHJpYnxGaWxlU2V0VGltZXxGb3JtYXRUaW1lfEdldEtleVN0YXRlfEdvc3VifEdvdG98R3JvdXBBY3RpdmF0ZXxHcm91cEFkZHxHcm91cENsb3NlfEdyb3VwRGVhY3RpdmF0ZXxHdWl8R3VpQ29udHJvbHxHdWlDb250cm9sR2V0fEhvdGtleXxJbWFnZVNlYXJjaHxJbmlEZWxldGV8SW5pUmVhZHxJbmlXcml0ZXxJbnB1dHxJbnB1dEJveHxLZXlXYWl0fExpc3RIb3RrZXlzfExpc3RMaW5lc3xMaXN0VmFyc3xMb29wfE1lbnV8TW91c2VDbGlja3xNb3VzZUNsaWNrRHJhZ3xNb3VzZUdldFBvc3xNb3VzZU1vdmV8TXNnQm94fE9uRXhpdHxPdXRwdXREZWJ1Z3xQYXVzZXxQaXhlbEdldENvbG9yfFBpeGVsU2VhcmNofFBvc3RNZXNzYWdlfFByb2Nlc3N8UHJvZ3Jlc3N8UmFuZG9tfFJlZ0RlbGV0ZXxSZWdSZWFkfFJlZ1dyaXRlfFJlbG9hZHxSZXBlYXR8UmV0dXJufFJ1bnxSdW5Bc3xSdW5XYWl0fFNlbmR8U2VuZEV2ZW50fFNlbmRJbnB1dHxTZW5kTWVzc2FnZXxTZW5kTW9kZXxTZW5kUGxheXxTZW5kUmF3fFNldEJhdGNoTGluZXN8U2V0Q2Fwc2xvY2tTdGF0ZXxTZXRDb250cm9sRGVsYXl8U2V0RGVmYXVsdE1vdXNlU3BlZWR8U2V0RW52fFNldEZvcm1hdHxTZXRLZXlEZWxheXxTZXRNb3VzZURlbGF5fFNldE51bWxvY2tTdGF0ZXxTZXRTY3JvbGxMb2NrU3RhdGV8U2V0U3RvcmVDYXBzbG9ja01vZGV8U2V0VGltZXJ8U2V0VGl0bGVNYXRjaE1vZGV8U2V0V2luRGVsYXl8U2V0V29ya2luZ0RpcnxTaHV0ZG93bnxTbGVlcHxTb3J0fFNvdW5kQmVlcHxTb3VuZEdldHxTb3VuZEdldFdhdmVWb2x1bWV8U291bmRQbGF5fFNvdW5kU2V0fFNvdW5kU2V0V2F2ZVZvbHVtZXxTcGxhc2hJbWFnZXxTcGxhc2hUZXh0T2ZmfFNwbGFzaFRleHRPbnxTcGxpdFBhdGh8U3RhdHVzQmFyR2V0VGV4dHxTdGF0dXNCYXJXYWl0fFN0cmluZ0Nhc2VTZW5zZXxTdHJpbmdHZXRQb3N8U3RyaW5nTGVmdHxTdHJpbmdMZW58U3RyaW5nTG93ZXJ8U3RyaW5nTWlkfFN0cmluZ1JlcGxhY2V8U3RyaW5nUmlnaHR8U3RyaW5nU3BsaXR8U3RyaW5nVHJpbUxlZnR8U3RyaW5nVHJpbVJpZ2h0fFN0cmluZ1VwcGVyfFN1c3BlbmR8U3lzR2V0fFRocmVhZHxUb29sVGlwfFRyYW5zZm9ybXxUcmF5VGlwfFVSTERvd25sb2FkVG9GaWxlfFdpbkFjdGl2YXRlfFdpbkFjdGl2YXRlQm90dG9tfFdpbkNsb3NlfFdpbkdldHxXaW5HZXRBY3RpdmVTdGF0c3xXaW5HZXRBY3RpdmVUaXRsZXxXaW5HZXRDbGFzc3xXaW5HZXRQb3N8V2luR2V0VGV4dHxXaW5HZXRUaXRsZXxXaW5IaWRlfFdpbktpbGx8V2luTWF4aW1pemV8V2luTWVudVNlbGVjdEl0ZW18V2luTWluaW1pemV8V2luTWluaW1pemVBbGx8V2luTWluaW1pemVBbGxVbmRvfFdpbk1vdmV8V2luUmVzdG9yZXxXaW5TZXR8V2luU2V0VGl0bGV8V2luU2hvd3xXaW5XYWl0fFdpbldhaXRBY3RpdmV8V2luV2FpdENsb3NlfFdpbldhaXROb3RBY3RpdmUpXFxiL2ksXHJcblxyXG5cdCdjb25zdGFudCc6IC9cXGIoYV9haGtwYXRofGFfYWhrdmVyc2lvbnxhX2FwcGRhdGF8YV9hcHBkYXRhY29tbW9ufGFfYXV0b3RyaW18YV9iYXRjaGxpbmVzfGFfY2FyZXR4fGFfY2FyZXR5fGFfY29tcHV0ZXJuYW1lfGFfY29udHJvbGRlbGF5fGFfY3Vyc29yfGFfZGR8YV9kZGR8YV9kZGRkfGFfZGVmYXVsdG1vdXNlc3BlZWR8YV9kZXNrdG9wfGFfZGVza3RvcGNvbW1vbnxhX2RldGVjdGhpZGRlbnRleHR8YV9kZXRlY3RoaWRkZW53aW5kb3dzfGFfZW5kY2hhcnxhX2V2ZW50aW5mb3xhX2V4aXRyZWFzb258YV9mb3JtYXRmbG9hdHxhX2Zvcm1hdGludGVnZXJ8YV9ndWl8YV9ndWlldmVudHxhX2d1aWNvbnRyb2x8YV9ndWljb250cm9sZXZlbnR8YV9ndWloZWlnaHR8YV9ndWl3aWR0aHxhX2d1aXh8YV9ndWl5fGFfaG91cnxhX2ljb25maWxlfGFfaWNvbmhpZGRlbnxhX2ljb25udW1iZXJ8YV9pY29udGlwfGFfaW5kZXh8YV9pcGFkZHJlc3MxfGFfaXBhZGRyZXNzMnxhX2lwYWRkcmVzczN8YV9pcGFkZHJlc3M0fGFfaXNhZG1pbnxhX2lzY29tcGlsZWR8YV9pc2NyaXRpY2FsfGFfaXNwYXVzZWR8YV9pc3N1c3BlbmRlZHxhX2lzdW5pY29kZXxhX2tleWRlbGF5fGFfbGFuZ3VhZ2V8YV9sYXN0ZXJyb3J8YV9saW5lZmlsZXxhX2xpbmVudW1iZXJ8YV9sb29wZmllbGR8YV9sb29wZmlsZWF0dHJpYnxhX2xvb3BmaWxlZGlyfGFfbG9vcGZpbGVleHR8YV9sb29wZmlsZWZ1bGxwYXRofGFfbG9vcGZpbGVsb25ncGF0aHxhX2xvb3BmaWxlbmFtZXxhX2xvb3BmaWxlc2hvcnRuYW1lfGFfbG9vcGZpbGVzaG9ydHBhdGh8YV9sb29wZmlsZXNpemV8YV9sb29wZmlsZXNpemVrYnxhX2xvb3BmaWxlc2l6ZW1ifGFfbG9vcGZpbGV0aW1lYWNjZXNzZWR8YV9sb29wZmlsZXRpbWVjcmVhdGVkfGFfbG9vcGZpbGV0aW1lbW9kaWZpZWR8YV9sb29wcmVhZGxpbmV8YV9sb29wcmVna2V5fGFfbG9vcHJlZ25hbWV8YV9sb29wcmVnc3Via2V5fGFfbG9vcHJlZ3RpbWVtb2RpZmllZHxhX2xvb3ByZWd0eXBlfGFfbWRheXxhX21pbnxhX21tfGFfbW1tfGFfbW1tbXxhX21vbnxhX21vdXNlZGVsYXl8YV9tc2VjfGFfbXlkb2N1bWVudHN8YV9ub3d8YV9ub3d1dGN8YV9udW1iYXRjaGxpbmVzfGFfb3N0eXBlfGFfb3N2ZXJzaW9ufGFfcHJpb3Job3RrZXl8cHJvZ3JhbWZpbGVzfGFfcHJvZ3JhbWZpbGVzfGFfcHJvZ3JhbXN8YV9wcm9ncmFtc2NvbW1vbnxhX3NjcmVlbmhlaWdodHxhX3NjcmVlbndpZHRofGFfc2NyaXB0ZGlyfGFfc2NyaXB0ZnVsbHBhdGh8YV9zY3JpcHRuYW1lfGFfc2VjfGFfc3BhY2V8YV9zdGFydG1lbnV8YV9zdGFydG1lbnVjb21tb258YV9zdGFydHVwfGFfc3RhcnR1cGNvbW1vbnxhX3N0cmluZ2Nhc2VzZW5zZXxhX3RhYnxhX3RlbXB8YV90aGlzZnVuY3xhX3RoaXNob3RrZXl8YV90aGlzbGFiZWx8YV90aGlzbWVudXxhX3RoaXNtZW51aXRlbXxhX3RoaXNtZW51aXRlbXBvc3xhX3RpY2tjb3VudHxhX3RpbWVpZGxlfGFfdGltZWlkbGVwaHlzaWNhbHxhX3RpbWVzaW5jZXByaW9yaG90a2V5fGFfdGltZXNpbmNldGhpc2hvdGtleXxhX3RpdGxlbWF0Y2htb2RlfGFfdGl0bGVtYXRjaG1vZGVzcGVlZHxhX3VzZXJuYW1lfGFfd2RheXxhX3dpbmRlbGF5fGFfd2luZGlyfGFfd29ya2luZ2RpcnxhX3lkYXl8YV95ZWFyfGFfeXdlZWt8YV95eXl5fGNsaXBib2FyZHxjbGlwYm9hcmRhbGx8Y29tc3BlY3xlcnJvcmxldmVsKVxcYi9pLFxyXG5cclxuXHQnYnVpbHRpbic6IC9cXGIoYWJzfGFjb3N8YXNjfGFzaW58YXRhbnxjZWlsfGNocnxjbGFzc3xjb3N8ZGxsY2FsbHxleHB8ZmlsZWV4aXN0fEZpbGVvcGVufGZsb29yfGdldGtleXN0YXRlfGlsX2FkZHxpbF9jcmVhdGV8aWxfZGVzdHJveXxpbnN0cnxzdWJzdHJ8aXNmdW5jfGlzbGFiZWx8SXNPYmplY3R8bG58bG9nfGx2X2FkZHxsdl9kZWxldGV8bHZfZGVsZXRlY29sfGx2X2dldGNvdW50fGx2X2dldG5leHR8bHZfZ2V0dGV4dHxsdl9pbnNlcnR8bHZfaW5zZXJ0Y29sfGx2X21vZGlmeXxsdl9tb2RpZnljb2x8bHZfc2V0aW1hZ2VsaXN0fG1vZHxvbm1lc3NhZ2V8bnVtZ2V0fG51bXB1dHxyZWdpc3RlcmNhbGxiYWNrfHJlZ2V4bWF0Y2h8cmVnZXhyZXBsYWNlfHJvdW5kfHNpbnx0YW58c3FydHxzdHJsZW58c2Jfc2V0aWNvbnxzYl9zZXRwYXJ0c3xzYl9zZXR0ZXh0fHN0cnNwbGl0fHR2X2FkZHx0dl9kZWxldGV8dHZfZ2V0Y2hpbGR8dHZfZ2V0Y291bnR8dHZfZ2V0bmV4dHx0dl9nZXR8dHZfZ2V0cGFyZW50fHR2X2dldHByZXZ8dHZfZ2V0c2VsZWN0aW9ufHR2X2dldHRleHR8dHZfbW9kaWZ5fHZhcnNldGNhcGFjaXR5fHdpbmFjdGl2ZXx3aW5leGlzdHxfX05ld3xfX0NhbGx8X19HZXR8X19TZXQpXFxiL2ksXHJcblxyXG5cdCdzeW1ib2wnOiAvXFxiKGFsdHxhbHRkb3dufGFsdHVwfGFwcHNrZXl8YmFja3NwYWNlfGJyb3dzZXJfYmFja3xicm93c2VyX2Zhdm9yaXRlc3xicm93c2VyX2ZvcndhcmR8YnJvd3Nlcl9ob21lfGJyb3dzZXJfcmVmcmVzaHxicm93c2VyX3NlYXJjaHxicm93c2VyX3N0b3B8YnN8Y2Fwc2xvY2t8Y29udHJvbHxjdHJsfGN0cmxicmVha3xjdHJsZG93bnxjdHJsdXB8ZGVsfGRlbGV0ZXxkb3dufGVuZHxlbnRlcnxlc2N8ZXNjYXBlfGYxfGYxMHxmMTF8ZjEyfGYxM3xmMTR8ZjE1fGYxNnxmMTd8ZjE4fGYxOXxmMnxmMjB8ZjIxfGYyMnxmMjN8ZjI0fGYzfGY0fGY1fGY2fGY3fGY4fGY5fGhvbWV8aW5zfGluc2VydHxqb3kxfGpveTEwfGpveTExfGpveTEyfGpveTEzfGpveTE0fGpveTE1fGpveTE2fGpveTE3fGpveTE4fGpveTE5fGpveTJ8am95MjB8am95MjF8am95MjJ8am95MjN8am95MjR8am95MjV8am95MjZ8am95Mjd8am95Mjh8am95Mjl8am95M3xqb3kzMHxqb3kzMXxqb3kzMnxqb3k0fGpveTV8am95Nnxqb3k3fGpveTh8am95OXxqb3lheGVzfGpveWJ1dHRvbnN8am95aW5mb3xqb3luYW1lfGpveXBvdnxqb3lyfGpveXV8am95dnxqb3l4fGpveXl8am95enxsYWx0fGxhdW5jaF9hcHAxfGxhdW5jaF9hcHAyfGxhdW5jaF9tYWlsfGxhdW5jaF9tZWRpYXxsYnV0dG9ufGxjb250cm9sfGxjdHJsfGxlZnR8bHNoaWZ0fGx3aW58bHdpbmRvd258bHdpbnVwfG1idXR0b258bWVkaWFfbmV4dHxtZWRpYV9wbGF5X3BhdXNlfG1lZGlhX3ByZXZ8bWVkaWFfc3RvcHxudW1sb2NrfG51bXBhZDB8bnVtcGFkMXxudW1wYWQyfG51bXBhZDN8bnVtcGFkNHxudW1wYWQ1fG51bXBhZDZ8bnVtcGFkN3xudW1wYWQ4fG51bXBhZDl8bnVtcGFkYWRkfG51bXBhZGNsZWFyfG51bXBhZGRlbHxudW1wYWRkaXZ8bnVtcGFkZG90fG51bXBhZGRvd258bnVtcGFkZW5kfG51bXBhZGVudGVyfG51bXBhZGhvbWV8bnVtcGFkaW5zfG51bXBhZGxlZnR8bnVtcGFkbXVsdHxudW1wYWRwZ2RufG51bXBhZHBndXB8bnVtcGFkcmlnaHR8bnVtcGFkc3VifG51bXBhZHVwfHBhdXNlfHBnZG58cGd1cHxwcmludHNjcmVlbnxyYWx0fHJidXR0b258cmNvbnRyb2x8cmN0cmx8cmlnaHR8cnNoaWZ0fHJ3aW58cndpbmRvd258cndpbnVwfHNjcm9sbGxvY2t8c2hpZnR8c2hpZnRkb3dufHNoaWZ0dXB8c3BhY2V8dGFifHVwfHZvbHVtZV9kb3dufHZvbHVtZV9tdXRlfHZvbHVtZV91cHx3aGVlbGRvd258d2hlZWxsZWZ0fHdoZWVscmlnaHR8d2hlZWx1cHx4YnV0dG9uMXx4YnV0dG9uMilcXGIvaSxcclxuXHJcblx0J2ltcG9ydGFudCc6IC8jXFxiKEFsbG93U2FtZUxpbmVDb21tZW50c3xDbGlwYm9hcmRUaW1lb3V0fENvbW1lbnRGbGFnfEVycm9yU3RkT3V0fEVzY2FwZUNoYXJ8SG90a2V5SW50ZXJ2YWx8SG90a2V5TW9kaWZpZXJUaW1lb3V0fEhvdHN0cmluZ3xJZldpbkFjdGl2ZXxJZldpbkV4aXN0fElmV2luTm90QWN0aXZlfElmV2luTm90RXhpc3R8SW5jbHVkZXxJbmNsdWRlQWdhaW58SW5zdGFsbEtleWJkSG9va3xJbnN0YWxsTW91c2VIb29rfEtleUhpc3Rvcnl8TFRyaW18TWF4SG90a2V5c1BlckludGVydmFsfE1heE1lbXxNYXhUaHJlYWRzfE1heFRocmVhZHNCdWZmZXJ8TWF4VGhyZWFkc1BlckhvdGtleXxOb0VudnxOb1RyYXlJY29ufFBlcnNpc3RlbnR8U2luZ2xlSW5zdGFuY2V8VXNlSG9va3xXaW5BY3RpdmF0ZUZvcmNlKVxcYi9pLFxyXG5cclxuXHQna2V5d29yZCc6IC9cXGIoQWJvcnR8QWJvdmVOb3JtYWx8QWRkfGFoa19jbGFzc3xhaGtfZ3JvdXB8YWhrX2lkfGFoa19waWR8QWxsfEFsbnVtfEFscGhhfEFsdFN1Ym1pdHxBbHRUYWJ8QWx0VGFiQW5kTWVudXxBbHRUYWJNZW51fEFsdFRhYk1lbnVEaXNtaXNzfEFsd2F5c09uVG9wfEF1dG9TaXplfEJhY2tncm91bmR8QmFja2dyb3VuZFRyYW5zfEJlbG93Tm9ybWFsfGJldHdlZW58Qml0QW5kfEJpdE5vdHxCaXRPcnxCaXRTaGlmdExlZnR8Qml0U2hpZnRSaWdodHxCaXRYT3J8Qm9sZHxCb3JkZXJ8QnV0dG9ufEJ5UmVmfENoZWNrYm94fENoZWNrZWR8Q2hlY2tlZEdyYXl8Q2hvb3NlfENob29zZVN0cmluZ3xDbGlja3xDbG9zZXxDb2xvcnxDb21ib0JveHxDb250YWluc3xDb250cm9sTGlzdHxDb3VudHxEYXRlfERhdGVUaW1lfERheXN8RERMfERlZmF1bHR8RGVsZXRlfERlbGV0ZUFsbHxEZWxpbWl0ZXJ8RGVyZWZ8RGVzdHJveXxEaWdpdHxEaXNhYmxlfERpc2FibGVkfERyb3BEb3duTGlzdHxFZGl0fEVqZWN0fEVsc2V8RW5hYmxlfEVuYWJsZWR8RXJyb3J8RXhpc3R8RXhwfEV4cGFuZHxFeFN0eWxlfEZpbGVTeXN0ZW18Rmlyc3R8Rmxhc2h8RmxvYXR8RmxvYXRGYXN0fEZvY3VzfEZvbnR8Zm9yfGdsb2JhbHxHcmlkfEdyb3VwfEdyb3VwQm94fEd1aUNsb3NlfEd1aUNvbnRleHRNZW51fEd1aURyb3BGaWxlc3xHdWlFc2NhcGV8R3VpU2l6ZXxIZHJ8SGlkZGVufEhpZGV8SGlnaHxIS0NDfEhLQ1J8SEtDVXxIS0VZX0NMQVNTRVNfUk9PVHxIS0VZX0NVUlJFTlRfQ09ORklHfEhLRVlfQ1VSUkVOVF9VU0VSfEhLRVlfTE9DQUxfTUFDSElORXxIS0VZX1VTRVJTfEhLTE18SEtVfEhvdXJzfEhTY3JvbGx8SWNvbnxJY29uU21hbGx8SUR8SURMYXN0fElmfElmRXF1YWx8SWZFeGlzdHxJZkdyZWF0ZXJ8SWZHcmVhdGVyT3JFcXVhbHxJZkluU3RyaW5nfElmTGVzc3xJZkxlc3NPckVxdWFsfElmTXNnQm94fElmTm90RXF1YWx8SWZOb3RFeGlzdHxJZk5vdEluU3RyaW5nfElmV2luQWN0aXZlfElmV2luRXhpc3R8SWZXaW5Ob3RBY3RpdmV8SWZXaW5Ob3RFeGlzdHxJZ25vcmV8SW1hZ2VMaXN0fGlufEludGVnZXJ8SW50ZWdlckZhc3R8SW50ZXJydXB0fGlzfGl0YWxpY3xKb2lufExhYmVsfExhc3RGb3VuZHxMYXN0Rm91bmRFeGlzdHxMaW1pdHxMaW5lc3xMaXN0fExpc3RCb3h8TGlzdFZpZXd8TG58bG9jYWx8TG9ja3xMb2dvZmZ8TG93fExvd2VyfExvd2VyY2FzZXxNYWluV2luZG93fE1hcmdpbnxNYXhpbWl6ZXxNYXhpbWl6ZUJveHxNYXhTaXplfE1pbmltaXplfE1pbmltaXplQm94fE1pbk1heHxNaW5TaXplfE1pbnV0ZXN8TW9udGhDYWx8TW91c2V8TW92ZXxNdWx0aXxOQXxOb3xOb0FjdGl2YXRlfE5vRGVmYXVsdHxOb0hpZGV8Tm9JY29ufE5vTWFpbldpbmRvd3xub3JtfE5vcm1hbHxOb1NvcnR8Tm9Tb3J0SGRyfE5vU3RhbmRhcmR8Tm90fE5vVGFifE5vVGltZXJzfE51bWJlcnxPZmZ8T2t8T258T3duRGlhbG9nc3xPd25lcnxQYXJzZXxQYXNzd29yZHxQaWN0dXJlfFBpeGVsfFBvc3xQb3d8UHJpb3JpdHl8UHJvY2Vzc05hbWV8UmFkaW98UmFuZ2V8UmVhZHxSZWFkT25seXxSZWFsdGltZXxSZWRyYXd8UkVHX0JJTkFSWXxSRUdfRFdPUkR8UkVHX0VYUEFORF9TWnxSRUdfTVVMVElfU1p8UkVHX1NafFJlZ2lvbnxSZWxhdGl2ZXxSZW5hbWV8UmVwb3J0fFJlc2l6ZXxSZXN0b3JlfFJldHJ5fFJHQnxSaWdodHxTY3JlZW58U2Vjb25kc3xTZWN0aW9ufFNlcmlhbHxTZXRMYWJlbHxTaGlmdEFsdFRhYnxTaG93fFNpbmdsZXxTbGlkZXJ8U29ydERlc2N8U3RhbmRhcmR8c3RhdGljfFN0YXR1c3xTdGF0dXNCYXJ8U3RhdHVzQ0R8c3RyaWtlfFN0eWxlfFN1Ym1pdHxTeXNNZW51fFRhYnxUYWIyfFRhYlN0b3B8VGV4dHxUaGVtZXxUaWxlfFRvZ2dsZUNoZWNrfFRvZ2dsZUVuYWJsZXxUb29sV2luZG93fFRvcHxUb3Btb3N0fFRyYW5zQ29sb3J8VHJhbnNwYXJlbnR8VHJheXxUcmVlVmlld3xUcnlBZ2FpbnxUeXBlfFVuQ2hlY2t8dW5kZXJsaW5lfFVuaWNvZGV8VW5sb2NrfFVwRG93bnxVcHBlcnxVcHBlcmNhc2V8VXNlRXJyb3JMZXZlbHxWaXN8VmlzRmlyc3R8VmlzaWJsZXxWU2Nyb2xsfFdhaXR8V2FpdENsb3NlfFdhbnRDdHJsQXxXYW50RjJ8V2FudFJldHVybnxXaGlsZXxXcmFwfFhkaWdpdHx4bXx4cHx4c3xZZXN8eW18eXB8eXMpXFxiL2lcclxufTtcbi8vIFRPRE86XG4vLyBcdFx0LSBTdXBwb3J0IGZvciBvdXRsaW5lIHBhcmFtZXRlcnNcbi8vIFx0XHQtIFN1cHBvcnQgZm9yIHRhYmxlc1xuXG5QcmlzbS5sYW5ndWFnZXMuZ2hlcmtpbiA9IHtcblx0J2NvbW1lbnQnOiB7XG5cdFx0cGF0dGVybjogLyhefFteXFxcXF0pKFxcL1xcKltcXHdcXFddKj9cXCpcXC98KCgjKXwoXFwvXFwvKSkuKj8oXFxyP1xcbnwkKSkvZyxcblx0XHRsb29rYmVoaW5kOiB0cnVlXG5cdH0sXG5cdCdzdHJpbmcnOiAvKFwifCcpKFxcXFw/LikqP1xcMS9nLFxuXHQnYXRydWxlJzogL1xcYihBbmR8R2l2ZW58V2hlbnxUaGVufEluIG9yZGVyIHRvfEFzIGFufEkgd2FudCB0b3xBcyBhKVxcYi9nLFxuXHQna2V5d29yZCc6IC9cXGIoU2NlbmFyaW8gT3V0bGluZXxTY2VuYXJpb3xGZWF0dXJlfEJhY2tncm91bmR8U3RvcnkpXFxiL2csXG59O1xuXG5QcmlzbS5sYW5ndWFnZXMubGF0ZXggPSB7XG5cdCdjb21tZW50JzogLyUuKj8oXFxyP1xcbnwkKSQvbSxcblx0J3N0cmluZyc6IC8oXFwkKShcXFxcPy4pKj9cXDEvZyxcblx0J3B1bmN0dWF0aW9uJzogL1t7fV0vZyxcblx0J3NlbGVjdG9yJzogL1xcXFxbYS16Oyw6XFwuXSovaVxufVxuLyoqXG4gKiBPcmlnaW5hbCBieSBTYW11ZWwgRmxvcmVzXG4gKlxuICogQWRkcyB0aGUgZm9sbG93aW5nIG5ldyB0b2tlbiBjbGFzc2VzOlxuICogXHRcdGNvbnN0YW50LCBidWlsdGluLCB2YXJpYWJsZSwgc3ltYm9sLCByZWdleFxuICovXG5QcmlzbS5sYW5ndWFnZXMucnVieSA9IFByaXNtLmxhbmd1YWdlcy5leHRlbmQoJ2NsaWtlJywge1xuXHQnY29tbWVudCc6IC8jW15cXHJcXG5dKihcXHI/XFxufCQpL2csXG5cdCdrZXl3b3JkJzogL1xcYihhbGlhc3xhbmR8QkVHSU58YmVnaW58YnJlYWt8Y2FzZXxjbGFzc3xkZWZ8ZGVmaW5lX21ldGhvZHxkZWZpbmVkfGRvfGVhY2h8ZWxzZXxlbHNpZnxFTkR8ZW5kfGVuc3VyZXxmYWxzZXxmb3J8aWZ8aW58bW9kdWxlfG5ld3xuZXh0fG5pbHxub3R8b3J8cmFpc2V8cmVkb3xyZXF1aXJlfHJlc2N1ZXxyZXRyeXxyZXR1cm58c2VsZnxzdXBlcnx0aGVufHRocm93fHRydWV8dW5kZWZ8dW5sZXNzfHVudGlsfHdoZW58d2hpbGV8eWllbGQpXFxiL2csXG5cdCdidWlsdGluJzogL1xcYihBcnJheXxCaWdudW18QmluZGluZ3xDbGFzc3xDb250aW51YXRpb258RGlyfEV4Y2VwdGlvbnxGYWxzZUNsYXNzfEZpbGV8U3RhdHxGaWxlfEZpeG51bXxGbG9hZHxIYXNofEludGVnZXJ8SU98TWF0Y2hEYXRhfE1ldGhvZHxNb2R1bGV8TmlsQ2xhc3N8TnVtZXJpY3xPYmplY3R8UHJvY3xSYW5nZXxSZWdleHB8U3RyaW5nfFN0cnVjdHxUTVN8U3ltYm9sfFRocmVhZEdyb3VwfFRocmVhZHxUaW1lfFRydWVDbGFzcylcXGIvLFxuXHQnY29uc3RhbnQnOiAvXFxiW0EtWl1bYS16QS1aXzAtOV0qWz8hXT9cXGIvZ1xufSk7XG5cblByaXNtLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoJ3J1YnknLCAna2V5d29yZCcsIHtcblx0J3JlZ2V4Jzoge1xuXHRcdHBhdHRlcm46IC8oXnxbXi9dKVxcLyg/IVxcLykoXFxbLis/XXxcXFxcLnxbXi9cXHJcXG5dKStcXC9bZ2ltXXswLDN9KD89XFxzKigkfFtcXHJcXG4sLjt9KV0pKS9nLFxuXHRcdGxvb2tiZWhpbmQ6IHRydWVcblx0fSxcblx0J3ZhcmlhYmxlJzogL1tAJF0rXFxiW2EtekEtWl9dW2EtekEtWl8wLTldKls/IV0/XFxiL2csXG5cdCdzeW1ib2wnOiAvOlxcYlthLXpBLVpfXVthLXpBLVpfMC05XSpbPyFdP1xcYi9nXG59KTtcblxuUHJpc20ubGFuZ3VhZ2VzLmJhc2ggPSBQcmlzbS5sYW5ndWFnZXMuZXh0ZW5kKCdjbGlrZScsIHtcblx0J2NvbW1lbnQnOiB7XG5cdFx0cGF0dGVybjogLyhefFteXCJ7XFxcXF0pKCMuKj8oXFxyP1xcbnwkKSkvZyxcblx0XHRsb29rYmVoaW5kOiB0cnVlXG5cdH0sXG5cdCdzdHJpbmcnOiB7XG5cdFx0Ly9hbGxvdyBtdWx0aWxpbmUgc3RyaW5nXG5cdFx0cGF0dGVybjogLyhcInwnKShcXFxcP1tcXHNcXFNdKSo/XFwxL2csXG5cdFx0aW5zaWRlOiB7XG5cdFx0XHQvLydwcm9wZXJ0eScgY2xhc3MgcmV1c2VkIGZvciBiYXNoIHZhcmlhYmxlc1xuXHRcdFx0J3Byb3BlcnR5JzogL1xcJChbYS16QS1aMC05XyNcXD9cXC1cXCohQF0rfFxce1teXFx9XStcXH0pL2dcblx0XHR9XG5cdH0sXG5cdCdrZXl3b3JkJzogL1xcYihpZnx0aGVufGVsc2V8ZWxpZnxmaXxmb3J8YnJlYWt8Y29udGludWV8d2hpbGV8aW58Y2FzZXxmdW5jdGlvbnxzZWxlY3R8ZG98ZG9uZXx1bnRpbHxlY2hvfGV4aXR8cmV0dXJufHNldHxkZWNsYXJlKVxcYi9nXG59KTtcblxuUHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZSgnYmFzaCcsICdrZXl3b3JkJywge1xuXHQvLydwcm9wZXJ0eScgY2xhc3MgcmV1c2VkIGZvciBiYXNoIHZhcmlhYmxlc1xuXHQncHJvcGVydHknOiAvXFwkKFthLXpBLVowLTlfI1xcP1xcLVxcKiFAXSt8XFx7W159XStcXH0pL2dcbn0pO1xuUHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZSgnYmFzaCcsICdjb21tZW50Jywge1xuXHQvL3NoZWJhbmcgbXVzdCBiZSBiZWZvcmUgY29tbWVudCwgJ2ltcG9ydGFudCcgY2xhc3MgZnJvbSBjc3MgcmV1c2VkXG5cdCdpbXBvcnRhbnQnOiAvKF4jIVxccypcXC9iaW5cXC9iYXNoKXwoXiMhXFxzKlxcL2JpblxcL3NoKS9nXG59KTtcblxuUHJpc20ubGFuZ3VhZ2VzLmdpdCA9IHtcblx0Lypcblx0ICogQSBzaW1wbGUgb25lIGxpbmUgY29tbWVudCBsaWtlIGluIGEgZ2l0IHN0YXR1cyBjb21tYW5kXG5cdCAqIEZvciBpbnN0YW5jZTpcblx0ICogJCBnaXQgc3RhdHVzXG5cdCAqICMgT24gYnJhbmNoIGluZmluaXRlLXNjcm9sbFxuXHQgKiAjIFlvdXIgYnJhbmNoIGFuZCAnb3JpZ2luL3NoYXJlZEJyYW5jaGVzL2Zyb250ZW5kVGVhbS9pbmZpbml0ZS1zY3JvbGwnIGhhdmUgZGl2ZXJnZWQsXG5cdCAqICMgYW5kIGhhdmUgMSBhbmQgMiBkaWZmZXJlbnQgY29tbWl0cyBlYWNoLCByZXNwZWN0aXZlbHkuXG5cdCAqIG5vdGhpbmcgdG8gY29tbWl0ICh3b3JraW5nIGRpcmVjdG9yeSBjbGVhbilcblx0ICovXG5cdCdjb21tZW50JzogL14jLiokL20sXG5cblx0Lypcblx0ICogYSBzdHJpbmcgKGRvdWJsZSBhbmQgc2ltcGxlIHF1b3RlKVxuXHQgKi9cblx0J3N0cmluZyc6IC8oXCJ8JykoXFxcXD8uKSo/XFwxL2dtLFxuXG5cdC8qXG5cdCAqIGEgZ2l0IGNvbW1hbmQuIEl0IHN0YXJ0cyB3aXRoIGEgcmFuZG9tIHByb21wdCBmaW5pc2hpbmcgYnkgYSAkLCB0aGVuIFwiZ2l0XCIgdGhlbiBzb21lIG90aGVyIHBhcmFtZXRlcnNcblx0ICogRm9yIGluc3RhbmNlOlxuXHQgKiAkIGdpdCBhZGQgZmlsZS50eHRcblx0ICovXG5cdCdjb21tYW5kJzoge1xuXHRcdHBhdHRlcm46IC9eLipcXCQgZ2l0IC4qJC9tLFxuXHRcdGluc2lkZToge1xuXHRcdFx0Lypcblx0XHRcdCAqIEEgZ2l0IGNvbW1hbmQgY2FuIGNvbnRhaW4gYSBwYXJhbWV0ZXIgc3RhcnRpbmcgYnkgYSBzaW5nbGUgb3IgYSBkb3VibGUgZGFzaCBmb2xsb3dlZCBieSBhIHN0cmluZ1xuXHRcdFx0ICogRm9yIGluc3RhbmNlOlxuXHRcdFx0ICogJCBnaXQgZGlmZiAtLWNhY2hlZFxuXHRcdFx0ICogJCBnaXQgbG9nIC1wXG5cdFx0XHQgKi9cblx0XHRcdCdwYXJhbWV0ZXInOiAvXFxzKC0tfC0pXFx3Ky9tXG5cdFx0fVxuXHR9LFxuXG5cdC8qXG5cdCAqIENvb3JkaW5hdGVzIGRpc3BsYXllZCBpbiBhIGdpdCBkaWZmIGNvbW1hbmRcblx0ICogRm9yIGluc3RhbmNlOlxuXHQgKiAkIGdpdCBkaWZmXG5cdCAqIGRpZmYgLS1naXQgZmlsZS50eHQgZmlsZS50eHRcblx0ICogaW5kZXggNjIxNDk1My4uMWQ1NGE1MiAxMDA2NDRcblx0ICogLS0tIGZpbGUudHh0XG5cdCAqICsrKyBmaWxlLnR4dFxuXHQgKiBAQCAtMSArMSwyIEBAXG5cdCAqIC1IZXJlJ3MgbXkgdGV0eCBmaWxlXG5cdCAqICtIZXJlJ3MgbXkgdGV4dCBmaWxlXG5cdCAqICtBbmQgdGhpcyBpcyB0aGUgc2Vjb25kIGxpbmVcblx0ICovXG5cdCdjb29yZCc6IC9eQEAuKkBAJC9tLFxuXG5cdC8qXG5cdCAqIFJlZ2V4cCB0byBtYXRjaCB0aGUgY2hhbmdlZCBsaW5lcyBpbiBhIGdpdCBkaWZmIG91dHB1dC4gQ2hlY2sgdGhlIGV4YW1wbGUgYWJvdmUuXG5cdCAqL1xuXHQnZGVsZXRlZCc6IC9eLSg/IS0pLiskL20sXG5cdCdpbnNlcnRlZCc6IC9eXFwrKD8hXFwrKS4rJC9tLFxuXG5cdC8qXG5cdCAqIE1hdGNoIGEgXCJjb21taXQgW1NIQTFdXCIgbGluZSBpbiBhIGdpdCBsb2cgb3V0cHV0LlxuXHQgKiBGb3IgaW5zdGFuY2U6XG5cdCAqICQgZ2l0IGxvZ1xuXHQgKiBjb21taXQgYTExYTE0ZWY3ZTI2ZjJjYTYyZDRiMzVlYWM0NTVjZTYzNmQwZGMwOVxuXHQgKiBBdXRob3I6IGxnaXJhdWRlbFxuXHQgKiBEYXRlOiAgIE1vbiBGZWIgMTcgMTE6MTg6MzQgMjAxNCArMDEwMFxuXHQgKlxuXHQgKiAgICAgQWRkIG9mIGEgbmV3IGxpbmVcblx0ICovXG5cdCdjb21taXRfc2hhMSc6IC9eY29tbWl0IFxcd3s0MH0kL21cbn07XG5cblByaXNtLmxhbmd1YWdlcy5zY2FsYSA9IFByaXNtLmxhbmd1YWdlcy5leHRlbmQoJ2phdmEnLCB7XG5cdCdrZXl3b3JkJzogLyg8LXw9Pil8XFxiKGFic3RyYWN0fGNhc2V8Y2F0Y2h8Y2xhc3N8ZGVmfGRvfGVsc2V8ZXh0ZW5kc3xmaW5hbHxmaW5hbGx5fGZvcnxmb3JTb21lfGlmfGltcGxpY2l0fGltcG9ydHxsYXp5fG1hdGNofG5ld3xudWxsfG9iamVjdHxvdmVycmlkZXxwYWNrYWdlfHByaXZhdGV8cHJvdGVjdGVkfHJldHVybnxzZWFsZWR8c2VsZnxzdXBlcnx0aGlzfHRocm93fHRyYWl0fHRyeXx0eXBlfHZhbHx2YXJ8d2hpbGV8d2l0aHx5aWVsZClcXGIvZyxcblx0J2J1aWx0aW4nOiAvXFxiKFN0cmluZ3xJbnR8TG9uZ3xTaG9ydHxCeXRlfEJvb2xlYW58RG91YmxlfEZsb2F0fENoYXJ8QW55fEFueVJlZnxBbnlWYWx8VW5pdHxOb3RoaW5nKVxcYi9nLFxuXHQnbnVtYmVyJzogL1xcYjB4W1xcZGEtZl0qXFwuP1tcXGRhLWZcXC1dK1xcYnxcXGJcXGQqXFwuP1xcZCtbZV0/W1xcZF0qW2RmbF0/XFxiL2dpLFxuXHQnc3ltYm9sJzogLycoW15cXGRcXHNdXFx3KikvZyxcblx0J3N0cmluZyc6IC8oXCJcIlwiKVtcXFdcXHddKj9cXDF8KFwifFxcLylbXFxXXFx3XSo/XFwyfCgnLicpL2dcbn0pO1xuZGVsZXRlIFByaXNtLmxhbmd1YWdlcy5zY2FsYVsnY2xhc3MtbmFtZScsJ2Z1bmN0aW9uJ107XG5cblByaXNtLmxhbmd1YWdlcy5jID0gUHJpc20ubGFuZ3VhZ2VzLmV4dGVuZCgnY2xpa2UnLCB7XG5cdC8vIGFsbG93IGZvciBjIG11bHRpbGluZSBzdHJpbmdzXG5cdCdzdHJpbmcnOiAvKFwifCcpKFteXFxuXFxcXFxcMV18XFxcXC58XFxcXFxccipcXG4pKj9cXDEvZyxcblx0J2tleXdvcmQnOiAvXFxiKGFzbXx0eXBlb2Z8aW5saW5lfGF1dG98YnJlYWt8Y2FzZXxjaGFyfGNvbnN0fGNvbnRpbnVlfGRlZmF1bHR8ZG98ZG91YmxlfGVsc2V8ZW51bXxleHRlcm58ZmxvYXR8Zm9yfGdvdG98aWZ8aW50fGxvbmd8cmVnaXN0ZXJ8cmV0dXJufHNob3J0fHNpZ25lZHxzaXplb2Z8c3RhdGljfHN0cnVjdHxzd2l0Y2h8dHlwZWRlZnx1bmlvbnx1bnNpZ25lZHx2b2lkfHZvbGF0aWxlfHdoaWxlKVxcYi9nLFxuXHQnb3BlcmF0b3InOiAvWy0rXXsxLDJ9fCE9P3w8ezEsMn09P3w+ezEsMn09P3xcXC0+fD17MSwyfXxcXF58fnwlfCZ7MSwyfXxcXHw/XFx8fFxcP3xcXCp8XFwvL2dcbn0pO1xuXG5QcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKCdjJywgJ3N0cmluZycsIHtcblx0Ly8gcHJvcGVydHkgY2xhc3MgcmV1c2VkIGZvciBtYWNybyBzdGF0ZW1lbnRzXG5cdCdwcm9wZXJ0eSc6IHtcblx0XHQvLyBhbGxvdyBmb3IgbXVsdGlsaW5lIG1hY3JvIGRlZmluaXRpb25zXG5cdFx0Ly8gc3BhY2VzIGFmdGVyIHRoZSAjIGNoYXJhY3RlciBjb21waWxlIGZpbmUgd2l0aCBnY2Ncblx0XHRwYXR0ZXJuOiAvKChefFxcbilcXHMqKSNcXHMqW2Etel0rKFteXFxuXFxcXF18XFxcXC58XFxcXFxccipcXG4pKi9naSxcblx0XHRsb29rYmVoaW5kOiB0cnVlLFxuXHRcdGluc2lkZToge1xuXHRcdFx0Ly8gaGlnaGxpZ2h0IHRoZSBwYXRoIG9mIHRoZSBpbmNsdWRlIHN0YXRlbWVudCBhcyBhIHN0cmluZ1xuXHRcdFx0J3N0cmluZyc6IHtcblx0XHRcdFx0cGF0dGVybjogLygjXFxzKmluY2x1ZGVcXHMqKSg8Lis/PnwoXCJ8JykoXFxcXD8uKSs/XFwzKS9nLFxuXHRcdFx0XHRsb29rYmVoaW5kOiB0cnVlLFxuXHRcdFx0fVxuXHRcdH1cblx0fVxufSk7XG5cbmRlbGV0ZSBQcmlzbS5sYW5ndWFnZXMuY1snY2xhc3MtbmFtZSddO1xuZGVsZXRlIFByaXNtLmxhbmd1YWdlcy5jWydib29sZWFuJ107XG5QcmlzbS5sYW5ndWFnZXMuZ28gPSBQcmlzbS5sYW5ndWFnZXMuZXh0ZW5kKCdjbGlrZScsIHtcblx0J2tleXdvcmQnOiAvXFxiKGJyZWFrfGNhc2V8Y2hhbnxjb25zdHxjb250aW51ZXxkZWZhdWx0fGRlZmVyfGVsc2V8ZmFsbHRocm91Z2h8Zm9yfGZ1bmN8Z28odG8pP3xpZnxpbXBvcnR8aW50ZXJmYWNlfG1hcHxwYWNrYWdlfHJhbmdlfHJldHVybnxzZWxlY3R8c3RydWN0fHN3aXRjaHx0eXBlfHZhcilcXGIvZyxcblx0J2J1aWx0aW4nOiAvXFxiKGJvb2x8Ynl0ZXxjb21wbGV4KDY0fDEyOCl8ZXJyb3J8ZmxvYXQoMzJ8NjQpfHJ1bmV8c3RyaW5nfHU/aW50KDh8MTZ8MzJ8NjR8KXx1aW50cHRyfGFwcGVuZHxjYXB8Y2xvc2V8Y29tcGxleHxjb3B5fGRlbGV0ZXxpbWFnfGxlbnxtYWtlfG5ld3xwYW5pY3xwcmludChsbik/fHJlYWx8cmVjb3ZlcilcXGIvZyxcblx0J2Jvb2xlYW4nOiAvXFxiKF98aW90YXxuaWx8dHJ1ZXxmYWxzZSlcXGIvZyxcblx0J29wZXJhdG9yJzogLyhbKCl7fVxcW1xcXV18WypcXC8lXiFdPT98XFwrWz0rXT98LVs+PS1dP3xcXHxbPXxdP3w+Wz0+XT98PCg8fFs9LV0pP3w9PT98JigmfD18Xj0/KT98XFwuKFxcLlxcLik/fFssO118Oj0/KS9nLFxuXHQnbnVtYmVyJzogL1xcYigtPygweFthLWZcXGRdK3woXFxkK1xcLj9cXGQqfFxcLlxcZCspKGVbLStdP1xcZCspPylpPylcXGIvaWcsXG5cdCdzdHJpbmcnOiAvKFwifCd8YCkoXFxcXD8ufFxccnxcXG4pKj9cXDEvZ1xufSk7XG5kZWxldGUgUHJpc20ubGFuZ3VhZ2VzLmdvWydjbGFzcy1uYW1lJ107XG5cblByaXNtLmxhbmd1YWdlcy5uYXNtID0ge1xuICAgICdjb21tZW50JzogLzsuKiQvbSxcbiAgICAnc3RyaW5nJzogLyhcInwnfGApKFxcXFw/LikqP1xcMS9nbSxcbiAgICAnbGFiZWwnOiB7XG4gICAgICAgIHBhdHRlcm46IC9eXFxzKltBLVphLXpcXC5fXFw/XFwkXVtcXHdcXC5cXD9cXCRAfiNdKjovbSxcbiAgICAgICAgYWxpYXM6ICdmdW5jdGlvbidcbiAgICB9LFxuICAgICdrZXl3b3JkJzogW1xuICAgICAgICAvXFxbP0JJVFMgKDE2fDMyfDY0KVxcXT8vbSxcbiAgICAgICAgL15cXHMqc2VjdGlvblxccypbYS16QS1aXFwuXSs6Py9pbSxcbiAgICAgICAgLyg/OmV4dGVybnxnbG9iYWwpW147XSovaW0sXG4gICAgICAgIC8oPzpDUFV8RkxPQVR8REVGQVVMVCkuKiQvbSxcbiAgICBdLFxuICAgICdyZWdpc3Rlcic6IHtcbiAgICAgICAgcGF0dGVybjogL1xcYig/OnN0XFxkfFt4eXpdbW1cXGRcXGQ/fFtjZHRdclxcZHxyXFxkXFxkP1tid2RdP3xbZXJdP1thYmNkXXh8W2FiY2RdW2hsXXxbZXJdPyhicHxzcHxzaXxkaSl8W2NkZWZnc11zKVxcYi9naSwgXG4gICAgICAgIGFsaWFzOiAndmFyaWFibGUnXG4gICAgfSxcbiAgICAnbnVtYmVyJzogLyhcXGJ8LXwoPz1cXCQpKSgwW2hIeFhdW1xcZEEtRmEtZl0qXFwuP1tcXGRBLUZhLWZdKyhbcFBdWystXT9cXGQrKT98XFxkW1xcZEEtRmEtZl0rW2hIeFhdfFxcJFxcZFtcXGRBLUZhLWZdKnwwW29PcVFdWzAtN10rfFswLTddK1tvT3FRXXwwW2JCeVldWzAxXSt8WzAxXStbYkJ5WV18MFtkRHRUXVxcZCt8XFxkK1tkRHRUXT98XFxkKlxcLj9cXGQrKFtFZV1bKy1dP1xcZCspPylcXGIvZyxcbiAgICAnb3BlcmF0b3InOiAvW1xcW1xcXVxcKitcXC1cXC8lPD49JnxcXCQhXS9nbVxufTtcblxuUHJpc20ubGFuZ3VhZ2VzLnNjaGVtZSA9IHtcbiAgICAnYm9vbGVhbicgOiAvIyh0fGYpezF9LyxcbiAgICAnY29tbWVudCcgOiAvOy4qLyxcbiAgICAna2V5d29yZCcgOiB7XG5cdHBhdHRlcm4gOiAvKFsoXSkoZGVmaW5lKC1zeW50YXh8LWxpYnJhcnl8LXZhbHVlcyk/fChjYXNlLSk/bGFtYmRhfGxldCgtdmFsdWVzfChyZWMpPyhcXCopPyk/fGVsc2V8aWZ8Y29uZHxiZWdpbnxkZWxheXxkZWxheS1mb3JjZXxwYXJhbWV0ZXJpemV8Z3VhcmR8c2V0IXwocXVhc2ktKT9xdW90ZXxzeW50YXgtcnVsZXMpLyxcblx0bG9va2JlaGluZCA6IHRydWVcbiAgICB9LFxuICAgICdidWlsdGluJyA6IHtcblx0cGF0dGVybiA6ICAvKFsoXSkoY29uc3xjYXJ8Y2RyfG51bGxcXD98cGFpclxcP3xib29sZWFuXFw/fGVvZi1vYmplY3RcXD98Y2hhclxcP3xwcm9jZWR1cmVcXD98bnVtYmVyXFw/fHBvcnRcXD98c3RyaW5nXFw/fHZlY3RvclxcP3xzeW1ib2xcXD98Ynl0ZXZlY3RvclxcP3xsaXN0fGNhbGwtd2l0aC1jdXJyZW50LWNvbnRpbnVhdGlvbnxjYWxsXFwvY2N8YXBwZW5kfGFic3xhcHBseXxldmFsKVxcYi8sXG5cdGxvb2tiZWhpbmQgOiB0cnVlXG4gICAgfSxcbiAgICAnc3RyaW5nJyA6ICAvKFtcIl0pKD86KD89KFxcXFw/KSlcXDIuKSo/XFwxfCdbXignfFxccyldKy8sIC8vdGhhbmtzIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTcxNDgwL3JlZ2V4LWdyYWJiaW5nLXZhbHVlcy1iZXR3ZWVuLXF1b3RhdGlvbi1tYXJrc1xuICAgICdudW1iZXInIDogLyhcXHN8XFwpKVstK10/WzAtOV0qXFwuP1swLTldKygoXFxzKilbLStdezF9KFxccyopWzAtOV0qXFwuP1swLTldK2kpPy8sXG4gICAgJ29wZXJhdG9yJzogLyhcXCp8XFwrfFxcLXxcXCV8XFwvfDw9fD0+fD49fDx8PXw+KS8sXG4gICAgJ2Z1bmN0aW9uJyA6IHtcblx0cGF0dGVybiA6IC8oWyhdKVteKFxcc3xcXCkpXSpcXHMvLFxuXHRsb29rYmVoaW5kIDogdHJ1ZVxuICAgIH0sXG4gICAgJ3B1bmN0dWF0aW9uJyA6IC9bKCldL1xufTtcblxuICAgIFxuXG4gICAgXG5cblByaXNtLmxhbmd1YWdlcy5ncm9vdnkgPSBQcmlzbS5sYW5ndWFnZXMuZXh0ZW5kKCdjbGlrZScsIHtcblx0J2tleXdvcmQnOiAvXFxiKGFzfGRlZnxpbnxhYnN0cmFjdHxhc3NlcnR8Ym9vbGVhbnxicmVha3xieXRlfGNhc2V8Y2F0Y2h8Y2hhcnxjbGFzc3xjb25zdHxjb250aW51ZXxkZWZhdWx0fGRvfGRvdWJsZXxlbHNlfGVudW18ZXh0ZW5kc3xmaW5hbHxmaW5hbGx5fGZsb2F0fGZvcnxnb3RvfGlmfGltcGxlbWVudHN8aW1wb3J0fGluc3RhbmNlb2Z8aW50fGludGVyZmFjZXxsb25nfG5hdGl2ZXxuZXd8cGFja2FnZXxwcml2YXRlfHByb3RlY3RlZHxwdWJsaWN8cmV0dXJufHNob3J0fHN0YXRpY3xzdHJpY3RmcHxzdXBlcnxzd2l0Y2h8c3luY2hyb25pemVkfHRoaXN8dGhyb3d8dGhyb3dzfHRyYWl0fHRyYW5zaWVudHx0cnl8dm9pZHx2b2xhdGlsZXx3aGlsZSlcXGIvZyxcblx0J3N0cmluZyc6IC8oXCJcIlwifCcnJylbXFxXXFx3XSo/XFwxfChcInwnfFxcLylbXFxXXFx3XSo/XFwyfChcXCRcXC8pKFxcJFxcL1xcJHxbXFxXXFx3XSkqP1xcL1xcJC9nLFxuXHQnbnVtYmVyJzogL1xcYjBiWzAxX10rXFxifFxcYjB4W1xcZGEtZl9dKyhcXC5bXFxkYS1mX3BcXC1dKyk/XFxifFxcYltcXGRfXSsoXFwuW1xcZF9dK1tlXT9bXFxkXSopP1tnbGlkZl1cXGJ8W1xcZF9dKyhcXC5bXFxkX10rKT9cXGIvZ2ksXG5cdCdvcGVyYXRvcic6IHtcblx0XHRwYXR0ZXJuOiAvKF58W14uXSkoPXswLDJ9fnxcXD9cXC58XFwqP1xcLkB8XFwuJnxcXC57MSwyfSg/IVxcLil8XFwuezJ9PD8oPz1cXHcpfC0+fFxcPzp8Wy0rXXsxLDJ9fCF8PD0+fD57MSwzfXw8ezEsMn18PXsxLDJ9fCZ7MSwyfXxcXHx7MSwyfXxcXD98XFwqezEsMn18XFwvfFxcXnwlKS9nLFxuXHRcdGxvb2tiZWhpbmQ6IHRydWVcblx0fSxcblx0J3B1bmN0dWF0aW9uJzogL1xcLit8W3t9W1xcXTsoKSw6JF0vZ1xufSk7XG5cblByaXNtLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoJ2dyb292eScsICdwdW5jdHVhdGlvbicsIHtcblx0J3Nwb2NrLWJsb2NrJzogL1xcYihzZXR1cHxnaXZlbnx3aGVufHRoZW58YW5kfGNsZWFudXB8ZXhwZWN0fHdoZXJlKTovZ1xufSk7XG5cblByaXNtLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoJ2dyb292eScsICdmdW5jdGlvbicsIHtcblx0J2Fubm90YXRpb24nOiB7XG5cdFx0cGF0dGVybjogLyhefFteLl0pQFxcdysvLFxuXHRcdGxvb2tiZWhpbmQ6IHRydWVcblx0fVxufSk7XG5cblByaXNtLmhvb2tzLmFkZCgnd3JhcCcsIGZ1bmN0aW9uKGVudikge1xuXHRpZiAoZW52Lmxhbmd1YWdlID09PSAnZ3Jvb3Z5JyAmJiBlbnYudHlwZSA9PT0gJ3N0cmluZycpIHtcblx0XHR2YXIgZGVsaW1pdGVyID0gZW52LmNvbnRlbnRbMF07XG5cblx0XHRpZiAoZGVsaW1pdGVyICE9IFwiJ1wiKSB7XG5cdFx0XHR2YXIgcGF0dGVybiA9IC8oW15cXFxcXSkoXFwkKFxcey4qP1xcfXxbXFx3XFwuXSspKS87XG5cdFx0XHRpZiAoZGVsaW1pdGVyID09PSAnJCcpIHtcblx0XHRcdFx0cGF0dGVybiA9IC8oW15cXCRdKShcXCQoXFx7Lio/XFx9fFtcXHdcXC5dKykpLztcblx0XHRcdH1cblx0XHRcdGVudi5jb250ZW50ID0gUHJpc20uaGlnaGxpZ2h0KGVudi5jb250ZW50LCB7XG5cdFx0XHRcdCdleHByZXNzaW9uJzoge1xuXHRcdFx0XHRcdHBhdHRlcm46IHBhdHRlcm4sXG5cdFx0XHRcdFx0bG9va2JlaGluZDogdHJ1ZSxcblx0XHRcdFx0XHRpbnNpZGU6IFByaXNtLmxhbmd1YWdlcy5ncm9vdnlcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHRcdGVudi5jbGFzc2VzLnB1c2goZGVsaW1pdGVyID09PSAnLycgPyAncmVnZXgnIDogJ2dzdHJpbmcnKTtcblx0XHR9XG5cdH1cbn0pO1xuXG4vKipcbiAqIE9yaWdpbmFsIGJ5IEphbiBULiBTb3R0IChodHRwOi8vZ2l0aHViLmNvbS9pZGxlYmVyZylcbiAqXG4gKiBJbmNsdWRlcyBhbGwgY29tbWFuZHMgYW5kIHBsdWctaW5zIHNoaXBwZWQgd2l0aCBOU0lTIDMuMGEyXG4gKi9cbiBQcmlzbS5sYW5ndWFnZXMubnNpcyA9IHtcblx0J2NvbW1lbnQnOiB7XG5cdFx0cGF0dGVybjogLyhefFteXFxcXF0pKFxcL1xcKltcXHdcXFddKj9cXCpcXC98KF58W146XSkoI3w7KS4qPyhcXHI/XFxufCQpKS9nLFxuXHRcdGxvb2tiZWhpbmQ6IHRydWVcblx0fSxcblx0J3N0cmluZyc6IC8oXCJ8JykoXFxcXD8uKSo/XFwxL2csXG5cdCdrZXl3b3JkJzogL1xcYihBYm9ydHxBZGQoQnJhbmRpbmdJbWFnZXxTaXplKXxBZHZTcGxhc2h8QWxsb3coUm9vdERpckluc3RhbGx8U2tpcEZpbGVzKXxBdXRvQ2xvc2VXaW5kb3d8QmFubmVyfEJHKEZvbnR8R3JhZGllbnR8SW1hZ2UpfEJyYW5kaW5nVGV4dHxCcmluZ1RvRnJvbnR8Q2FsbChcXGJ8SW5zdERMTCl8Q2FwdGlvbnxDaGFuZ2VVSXxDaGVja0JpdG1hcHxDbGVhckVycm9yc3xDb21wbGV0ZWRUZXh0fENvbXBvbmVudFRleHR8Q29weUZpbGVzfENSQ0NoZWNrfENyZWF0ZShEaXJlY3Rvcnl8Rm9udHxTaG9ydEN1dCl8RGVsZXRlKFxcYnxJTklTZWN8SU5JU3RyfFJlZ0tleXxSZWdWYWx1ZSl8RGV0YWlsKFByaW50fHNCdXR0b25UZXh0KXxEaWFsZXJ8RGlyKFRleHR8VmFyfFZlcmlmeSl8RW5hYmxlV2luZG93fEVudW0oUmVnS2V5fFJlZ1ZhbHVlKXxFeGNofEV4ZWMoXFxifFNoZWxsfFdhaXQpfEV4cGFuZEVudlN0cmluZ3N8RmlsZShcXGJ8QnVmU2l6ZXxDbG9zZXxFcnJvclRleHR8T3BlbnxSZWFkfFJlYWRCeXRlfFJlYWRVVEYxNkxFfFJlYWRXb3JkfFdyaXRlVVRGMTZMRXxTZWVrfFdyaXRlfFdyaXRlQnl0ZXxXcml0ZVdvcmQpfEZpbmQoQ2xvc2V8Rmlyc3R8TmV4dHxXaW5kb3cpfEZsdXNoSU5JfEdldChDdXJJbnN0VHlwZXxDdXJyZW50QWRkcmVzc3xEbGdJdGVtfERMTFZlcnNpb258RExMVmVyc2lvbkxvY2FsfEVycm9yTGV2ZWx8RmlsZVRpbWV8RmlsZVRpbWVMb2NhbHxGdWxsUGF0aE5hbWV8RnVuY3Rpb24oXFxifEFkZHJlc3N8RW5kKXxJbnN0RGlyRXJyb3J8TGFiZWxBZGRyZXNzfFRlbXBGaWxlTmFtZSl8R290b3xIaWRlV2luZG93fEljb258SWYoQWJvcnR8RXJyb3JzfEZpbGVFeGlzdHN8UmVib290RmxhZ3xTaWxlbnQpfEluaXRQbHVnaW5zRGlyfEluc3RhbGwoQnV0dG9uVGV4dHxDb2xvcnN8RGlyfERpclJlZ0tleSl8SW5zdFByb2dyZXNzRmxhZ3N8SW5zdChUeXBlfFR5cGVHZXRUZXh0fFR5cGVTZXRUZXh0KXxJbnQoQ21wfENtcFV8Rm10fE9wKXxJc1dpbmRvd3xMYW5nKERMTHxTdHJpbmcpfExpY2Vuc2UoQmtDb2xvcnxEYXRhfEZvcmNlU2VsZWN0aW9ufExhbmdTdHJpbmd8VGV4dCl8TG9hZExhbmd1YWdlRmlsZXxMb2NrV2luZG93fExvZyhTZXR8VGV4dCl8TWFuaWZlc3QoRFBJQXdhcmV8U3VwcG9ydGVkT1MpfE1hdGh8TWVzc2FnZUJveHxNaXNjQnV0dG9uVGV4dHxOYW1lfE5vcHxucyhEaWFsb2dzfEV4ZWMpfE5TSVNkbHxPdXRGaWxlfFBhZ2UoXFxifENhbGxiYWNrcyl8UG9wfFB1c2h8UXVpdHxSZWFkKEVudlN0cnxJTklTdHJ8UmVnRFdPUkR8UmVnU3RyKXxSZWJvb3R8UmVnRExMfFJlbmFtZXxSZXF1ZXN0RXhlY3V0aW9uTGV2ZWx8UmVzZXJ2ZUZpbGV8UmV0dXJufFJNRGlyfFNlYXJjaFBhdGh8U2VjdGlvbihcXGJ8RW5kfEdldEZsYWdzfEdldEluc3RUeXBlc3xHZXRTaXplfEdldFRleHR8R3JvdXB8SW58U2V0RmxhZ3N8U2V0SW5zdFR5cGVzfFNldFNpemV8U2V0VGV4dCl8U2VuZE1lc3NhZ2V8U2V0KEF1dG9DbG9zZXxCcmFuZGluZ0ltYWdlfENvbXByZXNzfENvbXByZXNzb3J8Q29tcHJlc3NvckRpY3RTaXplfEN0bENvbG9yc3xDdXJJbnN0VHlwZXxEYXRhYmxvY2tPcHRpbWl6ZXxEYXRlU2F2ZXxEZXRhaWxzUHJpbnR8RGV0YWlsc1ZpZXd8RXJyb3JMZXZlbHxFcnJvcnN8RmlsZUF0dHJpYnV0ZXN8Rm9udHxPdXRQYXRofE92ZXJ3cml0ZXxQbHVnaW5VbmxvYWR8UmVib290RmxhZ3xSZWdWaWV3fFNoZWxsVmFyQ29udGV4dHxTaWxlbnQpfFNob3coSW5zdERldGFpbHN8VW5pbnN0RGV0YWlsc3xXaW5kb3cpfFNpbGVudChJbnN0YWxsfFVuSW5zdGFsbCl8U2xlZXB8U3BhY2VUZXh0c3xTcGxhc2h8U3RhcnRNZW51fFN0cihDbXB8Q21wU3xDcHl8TGVuKXxTdWJDYXB0aW9ufFN5c3RlbXxVbmljb2RlfFVuaW5zdGFsbChCdXR0b25UZXh0fENhcHRpb258SWNvbnxTdWJDYXB0aW9ufFRleHQpfFVuaW5zdFBhZ2V8VW5SZWdETEx8VXNlckluZm98VmFyfFZJKEFkZFZlcnNpb25LZXl8RmlsZVZlcnNpb258UHJvZHVjdFZlcnNpb24pfFZQYXRjaHxXaW5kb3dJY29ufFdyaXRlSU5JU3RyfFdyaXRlUmVnQmlufFdyaXRlUmVnRFdPUkR8V3JpdGVSZWdFeHBhbmRTdHJ8V3JpdGUoUmVnU3RyfFVuaW5zdGFsbGVyKXxYUFN0eWxlKVxcYi9nLFxuXHQncHJvcGVydHknOiAvXFxiKGFkbWlufGFsbHxhdXRvfGJvdGh8Y29sb3JlZHxmYWxzZXxmb3JjZXxoaWRlfGhpZ2hlc3R8bGFzdHVzZWR8bGVhdmV8bGlzdG9ubHl8bm9uZXxub3JtYWx8bm90c2V0fG9mZnxvbnxvcGVufHByaW50fHNob3d8c2lsZW50fHNpbGVudGxvZ3xzbW9vdGh8dGV4dG9ubHl8dHJ1ZXx1c2VyfEFSQ0hJVkV8RklMRV8oQVRUUklCVVRFX0FSQ0hJVkV8QVRUUklCVVRFX05PUk1BTHxBVFRSSUJVVEVfT0ZGTElORXxBVFRSSUJVVEVfUkVBRE9OTFl8QVRUUklCVVRFX1NZU1RFTXxBVFRSSUJVVEVfVEVNUE9SQVJZKXxISyhDUnxDVXxERHxMTXxQRHxVKXxIS0VZXyhDTEFTU0VTX1JPT1R8Q1VSUkVOVF9DT05GSUd8Q1VSUkVOVF9VU0VSfERZTl9EQVRBfExPQ0FMX01BQ0hJTkV8UEVSRk9STUFOQ0VfREFUQXxVU0VSUyl8SUQoQUJPUlR8Q0FOQ0VMfElHTk9SRXxOT3xPS3xSRVRSWXxZRVMpfE1CXyhBQk9SVFJFVFJZSUdOT1JFfERFRkJVVFRPTjF8REVGQlVUVE9OMnxERUZCVVRUT04zfERFRkJVVFRPTjR8SUNPTkVYQ0xBTUFUSU9OfElDT05JTkZPUk1BVElPTnxJQ09OUVVFU1RJT058SUNPTlNUT1B8T0t8T0tDQU5DRUx8UkVUUllDQU5DRUx8UklHSFR8UlRMUkVBRElOR3xTRVRGT1JFR1JPVU5EfFRPUE1PU1R8VVNFUklDT058WUVTTk8pfE5PUk1BTHxPRkZMSU5FfFJFQURPTkxZfFNIQ1RYfFNIRUxMX0NPTlRFWFR8U1lTVEVNfFRFTVBPUkFSWSlcXGIvZyxcblx0J3ZhcmlhYmxlJzogLyhcXCQoXFwofFxceyk/Wy1fXFx3XSspKFxcKXxcXH0pPy9pLFxuXHQnbnVtYmVyJzogL1xcYi0/KDB4W1xcZEEtRmEtZl0rfFxcZCpcXC4/XFxkKyhbRWVdLT9cXGQrKT8pXFxiL2csXG5cdCdvcGVyYXRvcic6IC9bLStdezEsMn18Jmx0Oz0/fD49P3w9ezEsM318KCZhbXA7KXsxLDJ9fFxcfD9cXHx8XFw/fFxcKnxcXC98XFx+fFxcXnxcXCUvZyxcblx0J3B1bmN0dWF0aW9uJzogL1t7fVtcXF07KCksLjpdL2csXG5cdCdpbXBvcnRhbnQnOiAvXFwhKGFkZGluY2x1ZGVkaXJ8YWRkcGx1Z2luZGlyfGFwcGVuZGZpbGV8Y2R8ZGVmaW5lfGRlbGZpbGV8ZWNob3xlbHNlfGVuZGlmfGVycm9yfGV4ZWN1dGV8ZmluYWxpemV8Z2V0ZGxsdmVyc2lvbnN5c3RlbXxpZmRlZnxpZm1hY3JvZGVmfGlmbWFjcm9uZGVmfGlmbmRlZnxpZnxpbmNsdWRlfGluc2VydG1hY3JvfG1hY3JvZW5kfG1hY3JvfG1ha2Vuc2lzfHBhY2toZHJ8c2VhcmNocGFyc2V8c2VhcmNocmVwbGFjZXx0ZW1wZmlsZXx1bmRlZnx2ZXJib3NlfHdhcm5pbmcpXFxiL2dpLFxufTtcblxuUHJpc20ubGFuZ3VhZ2VzLnNjc3MgPSBQcmlzbS5sYW5ndWFnZXMuZXh0ZW5kKCdjc3MnLCB7XG5cdCdjb21tZW50Jzoge1xuXHRcdHBhdHRlcm46IC8oXnxbXlxcXFxdKShcXC9cXCpbXFx3XFxXXSo/XFwqXFwvfFxcL1xcLy4qPyhcXHI/XFxufCQpKS9nLFxuXHRcdGxvb2tiZWhpbmQ6IHRydWVcblx0fSxcblx0Ly8gYXR1cmxlIGlzIGp1c3QgdGhlIEAqKiosIG5vdCB0aGUgZW50aXJlIHJ1bGUgKHRvIGhpZ2hsaWdodCB2YXIgJiBzdHVmZnMpXG5cdC8vICsgYWRkIGFiaWxpdHkgdG8gaGlnaGxpZ2h0IG51bWJlciAmIHVuaXQgZm9yIG1lZGlhIHF1ZXJpZXNcblx0J2F0cnVsZSc6IC9AW1xcdy1dKyg/PVxccysoXFwofFxce3w7KSkvZ2ksXG5cdC8vIHVybCwgY29tcGFzc2lmaWVkXG5cdCd1cmwnOiAvKFstYS16XSstKSp1cmwoPz1cXCgpL2dpLFxuXHQvLyBDU1Mgc2VsZWN0b3IgcmVnZXggaXMgbm90IGFwcHJvcHJpYXRlIGZvciBTYXNzXG5cdC8vIHNpbmNlIHRoZXJlIGNhbiBiZSBsb3QgbW9yZSB0aGluZ3MgKHZhciwgQCBkaXJlY3RpdmUsIG5lc3RpbmcuLilcblx0Ly8gYSBzZWxlY3RvciBtdXN0IHN0YXJ0IGF0IHRoZSBlbmQgb2YgYSBwcm9wZXJ0eSBvciBhZnRlciBhIGJyYWNlIChlbmQgb2Ygb3RoZXIgcnVsZXMgb3IgbmVzdGluZylcblx0Ly8gaXQgY2FuIGNvbnRhaW4gc29tZSBjYXJhY3RlcnMgdGhhdCBhcmVuJ3QgdXNlZCBmb3IgZGVmaW5pbmcgcnVsZXMgb3IgZW5kIG9mIHNlbGVjdG9yLCAmIChwYXJlbnQgc2VsZWN0b3IpLCBvciBpbnRlcnBvbGF0ZWQgdmFyaWFibGVcblx0Ly8gdGhlIGVuZCBvZiBhIHNlbGVjdG9yIGlzIGZvdW5kIHdoZW4gdGhlcmUgaXMgbm8gcnVsZXMgaW4gaXQgKCB7fSBvciB7XFxzfSkgb3IgaWYgdGhlcmUgaXMgYSBwcm9wZXJ0eSAoYmVjYXVzZSBhbiBpbnRlcnBvbGF0ZWQgdmFyXG5cdC8vIGNhbiBcInBhc3NcIiBhcyBhIHNlbGVjdG9yLSBlLmc6IHByb3BlciN7JGVydHl9KVxuXHQvLyB0aGlzIG9uZSB3YXMgYXJkIHRvIGRvLCBzbyBwbGVhc2UgYmUgY2FyZWZ1bCBpZiB5b3UgZWRpdCB0aGlzIG9uZSA6KVxuXHQnc2VsZWN0b3InOiAvKFteQDtcXHtcXH1cXChcXCldPyhbXkA7XFx7XFx9XFwoXFwpXXwmfFxcI1xce1xcJFstX1xcd10rXFx9KSspKD89XFxzKlxceyhcXH18XFxzfFteXFx9XSsoOnxcXHspW15cXH1dKykpL2dtXG59KTtcblxuUHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZSgnc2NzcycsICdhdHJ1bGUnLCB7XG5cdCdrZXl3b3JkJzogL0AoaWZ8ZWxzZSBpZnxlbHNlfGZvcnxlYWNofHdoaWxlfGltcG9ydHxleHRlbmR8ZGVidWd8d2FybnxtaXhpbnxpbmNsdWRlfGZ1bmN0aW9ufHJldHVybnxjb250ZW50KXwoPz1AZm9yXFxzK1xcJFstX1xcd10rXFxzKStmcm9tL2lcbn0pO1xuXG5QcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKCdzY3NzJywgJ3Byb3BlcnR5Jywge1xuXHQvLyB2YXIgYW5kIGludGVycG9sYXRlZCB2YXJzXG5cdCd2YXJpYWJsZSc6IC8oKFxcJFstX1xcd10rKXwoI1xce1xcJFstX1xcd10rXFx9KSkvaVxufSk7XG5cblByaXNtLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoJ3Njc3MnLCAnaWdub3JlJywge1xuXHQncGxhY2Vob2xkZXInOiAvJVstX1xcd10rL2ksXG5cdCdzdGF0ZW1lbnQnOiAvXFxCIShkZWZhdWx0fG9wdGlvbmFsKVxcYi9naSxcblx0J2Jvb2xlYW4nOiAvXFxiKHRydWV8ZmFsc2UpXFxiL2csXG5cdCdudWxsJzogL1xcYihudWxsKVxcYi9nLFxuXHQnb3BlcmF0b3InOiAvXFxzKyhbLStdezEsMn18PXsxLDJ9fCE9fFxcfD9cXHx8XFw/fFxcKnxcXC98XFwlKVxccysvZ1xufSk7XG5cblByaXNtLmxhbmd1YWdlcy5jb2ZmZWVzY3JpcHQgPSBQcmlzbS5sYW5ndWFnZXMuZXh0ZW5kKCdqYXZhc2NyaXB0Jywge1xuXHQnY29tbWVudCc6IFtcblx0XHQvKFsjXXszfVxccypcXHI/XFxuKC4qXFxzKlxccipcXG4qKVxccyo/XFxyP1xcblsjXXszfSkvZyxcblx0XHQvKFxcc3xeKShbI117MX1bXiNeXFxyXlxcbl17Mix9PyhcXHI/XFxufCQpKS9nXG5cdF0sXG5cdCdrZXl3b3JkJzogL1xcYih0aGlzfHdpbmRvd3xkZWxldGV8Y2xhc3N8ZXh0ZW5kc3xuYW1lc3BhY2V8ZXh0ZW5kfGFyfGxldHxpZnxlbHNlfHdoaWxlfGRvfGZvcnxlYWNofG9mfHJldHVybnxpbnxpbnN0YW5jZW9mfG5ld3x3aXRofHR5cGVvZnx0cnl8Y2F0Y2h8ZmluYWxseXxudWxsfHVuZGVmaW5lZHxicmVha3xjb250aW51ZSlcXGIvZ1xufSk7XG5cblByaXNtLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoJ2NvZmZlZXNjcmlwdCcsICdrZXl3b3JkJywge1xuXHQnZnVuY3Rpb24nOiB7XG5cdFx0cGF0dGVybjogL1thLXp8QS16XStcXHMqWzp8PV1cXHMqKFxcKFsufGEtelxcc3wsfDp8e3x9fFxcXCJ8XFwnfD1dKlxcKSk/XFxzKi0mZ3Q7L2dpLFxuXHRcdGluc2lkZToge1xuXHRcdFx0J2Z1bmN0aW9uLW5hbWUnOiAvW18/YS16LXxBLVotXSsoXFxzKls6fD1dKXwgQFtfPyQ/YS16LXxBLVotXSsoXFxzKil8IC9nLFxuXHRcdFx0J29wZXJhdG9yJzogL1stK117MSwyfXwhfD0/Jmx0O3w9PyZndDt8PXsxLDJ9fCgmYW1wOyl7MSwyfXxcXHw/XFx8fFxcP3xcXCp8XFwvL2dcblx0XHR9XG5cdH0sXG5cdCdhdHRyLW5hbWUnOiAvW18/YS16LXxBLVotXSsoXFxzKjopfCBAW18/JD9hLXotfEEtWi1dKyhcXHMqKXwgL2dcbn0pO1xuXG5QcmlzbS5sYW5ndWFnZXMuaGFuZGxlYmFycyA9IHtcblx0J2V4cHJlc3Npb24nOiB7XG5cdFx0cGF0dGVybjogL1xce1xce1xce1tcXHdcXFddKz9cXH1cXH1cXH18XFx7XFx7W1xcd1xcV10rP1xcfVxcfS9nLFxuXHRcdGluc2lkZToge1xuXHRcdFx0J2NvbW1lbnQnOiB7XG5cdFx0XHRcdHBhdHRlcm46IC8oXFx7XFx7KSFbXFx3XFxXXSooPz1cXH1cXH0pL2csXG5cdFx0XHRcdGxvb2tiZWhpbmQ6IHRydWVcblx0XHRcdH0sXG5cdFx0XHQnZGVsaW1pdGVyJzoge1xuXHRcdFx0XHRwYXR0ZXJuOiAvXlxce1xce1xcez98XFx9XFx9XFx9PyQvaWcsXG5cdFx0XHRcdGFsaWFzOiAncHVuY3R1YXRpb24nXG5cdFx0XHR9LFxuXHRcdFx0J3N0cmluZyc6IC8oW1wiJ10pKFxcXFw/LikrP1xcMS9nLFxuXHRcdFx0J251bWJlcic6IC9cXGItPygweFtcXGRBLUZhLWZdK3xcXGQqXFwuP1xcZCsoW0VlXS0/XFxkKyk/KVxcYi9nLFxuXHRcdFx0J2Jvb2xlYW4nOiAvXFxiKHRydWV8ZmFsc2UpXFxiL2csXG5cdFx0XHQnYmxvY2snOiB7XG5cdFx0XHRcdHBhdHRlcm46IC9eKFxccyp+P1xccyopWyNcXC9dXFx3Ky9pZyxcblx0XHRcdFx0bG9va2JlaGluZDogdHJ1ZSxcblx0XHRcdFx0YWxpYXM6ICdrZXl3b3JkJ1xuXHRcdFx0fSxcblx0XHRcdCdicmFja2V0cyc6IHtcblx0XHRcdFx0cGF0dGVybjogL1xcW1teXFxdXStcXF0vLFxuXHRcdFx0XHRpbnNpZGU6IHtcblx0XHRcdFx0XHRwdW5jdHVhdGlvbjogL1xcW3xcXF0vZyxcblx0XHRcdFx0XHR2YXJpYWJsZTogL1tcXHdcXFddKy9nXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHQncHVuY3R1YXRpb24nOiAvWyFcIiMlJicoKSorLC5cXC87PD0+QFxcW1xcXFxcXF1eYHt8fX5dL2csXG5cdFx0XHQndmFyaWFibGUnOiAvW14hXCIjJSYnKCkqKywuXFwvOzw9PkBcXFtcXFxcXFxdXmB7fH1+XSsvZ1xuXHRcdH1cblx0fVxufTtcblxuaWYgKFByaXNtLmxhbmd1YWdlcy5tYXJrdXApIHtcblxuXHQvLyBUb2tlbml6ZSBhbGwgaW5saW5lIEhhbmRsZWJhcnMgZXhwcmVzc2lvbnMgdGhhdCBhcmUgd3JhcHBlZCBpbiB7eyB9fSBvciB7e3sgfX19XG5cdC8vIFRoaXMgYWxsb3dzIGZvciBlYXN5IEhhbmRsZWJhcnMgKyBtYXJrdXAgaGlnaGxpZ2h0aW5nXG5cdFByaXNtLmhvb2tzLmFkZCgnYmVmb3JlLWhpZ2hsaWdodCcsIGZ1bmN0aW9uKGVudikge1xuXHRcdGNvbnNvbGUubG9nKGVudi5sYW5ndWFnZSk7XG5cdFx0aWYgKGVudi5sYW5ndWFnZSAhPT0gJ2hhbmRsZWJhcnMnKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0ZW52LnRva2VuU3RhY2sgPSBbXTtcblxuXHRcdGVudi5iYWNrdXBDb2RlID0gZW52LmNvZGU7XG5cdFx0ZW52LmNvZGUgPSBlbnYuY29kZS5yZXBsYWNlKC9cXHtcXHtcXHtbXFx3XFxXXSs/XFx9XFx9XFx9fFxce1xce1tcXHdcXFddKz9cXH1cXH0vaWcsIGZ1bmN0aW9uKG1hdGNoKSB7XG5cdFx0XHRjb25zb2xlLmxvZyhtYXRjaCk7XG5cdFx0XHRlbnYudG9rZW5TdGFjay5wdXNoKG1hdGNoKTtcblxuXHRcdFx0cmV0dXJuICdfX19IQU5ETEVCQVJTJyArIGVudi50b2tlblN0YWNrLmxlbmd0aCArICdfX18nO1xuXHRcdH0pO1xuXHR9KTtcblxuXHQvLyBSZXN0b3JlIGVudi5jb2RlIGZvciBvdGhlciBwbHVnaW5zIChlLmcuIGxpbmUtbnVtYmVycylcblx0UHJpc20uaG9va3MuYWRkKCdiZWZvcmUtaW5zZXJ0JywgZnVuY3Rpb24oZW52KSB7XG5cdFx0aWYgKGVudi5sYW5ndWFnZSA9PT0gJ2hhbmRsZWJhcnMnKSB7XG5cdFx0XHRlbnYuY29kZSA9IGVudi5iYWNrdXBDb2RlO1xuXHRcdFx0ZGVsZXRlIGVudi5iYWNrdXBDb2RlO1xuXHRcdH1cblx0fSk7XG5cblx0Ly8gUmUtaW5zZXJ0IHRoZSB0b2tlbnMgYWZ0ZXIgaGlnaGxpZ2h0aW5nXG5cdFByaXNtLmhvb2tzLmFkZCgnYWZ0ZXItaGlnaGxpZ2h0JywgZnVuY3Rpb24oZW52KSB7XG5cdFx0aWYgKGVudi5sYW5ndWFnZSAhPT0gJ2hhbmRsZWJhcnMnKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Zm9yICh2YXIgaSA9IDAsIHQ7IHQgPSBlbnYudG9rZW5TdGFja1tpXTsgaSsrKSB7XG5cdFx0XHRlbnYuaGlnaGxpZ2h0ZWRDb2RlID0gZW52LmhpZ2hsaWdodGVkQ29kZS5yZXBsYWNlKCdfX19IQU5ETEVCQVJTJyArIChpICsgMSkgKyAnX19fJywgUHJpc20uaGlnaGxpZ2h0KHQsIGVudi5ncmFtbWFyLCAnaGFuZGxlYmFycycpKTtcblx0XHR9XG5cblx0XHRlbnYuZWxlbWVudC5pbm5lckhUTUwgPSBlbnYuaGlnaGxpZ2h0ZWRDb2RlO1xuXHR9KTtcblxuXHQvLyBXcmFwIHRva2VucyBpbiBjbGFzc2VzIHRoYXQgYXJlIG1pc3NpbmcgdGhlbVxuXHRQcmlzbS5ob29rcy5hZGQoJ3dyYXAnLCBmdW5jdGlvbihlbnYpIHtcblx0XHRpZiAoZW52Lmxhbmd1YWdlID09PSAnaGFuZGxlYmFycycgJiYgZW52LnR5cGUgPT09ICdtYXJrdXAnKSB7XG5cdFx0XHRlbnYuY29udGVudCA9IGVudi5jb250ZW50LnJlcGxhY2UoLyhfX19IQU5ETEVCQVJTWzAtOV0rX19fKS9nLCBcIjxzcGFuIGNsYXNzPVxcXCJ0b2tlbiBoYW5kbGViYXJzXFxcIj4kMTwvc3Bhbj5cIik7XG5cdFx0fVxuXHR9KTtcblxuXHQvLyBBZGQgdGhlIHJ1bGVzIGJlZm9yZSBhbGwgb3RoZXJzXG5cdFByaXNtLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoJ2hhbmRsZWJhcnMnLCAnZXhwcmVzc2lvbicsIHtcblx0XHQnbWFya3VwJzoge1xuXHRcdFx0cGF0dGVybjogLzxbXj9dXFwvPyguKj8pPi9nLFxuXHRcdFx0aW5zaWRlOiBQcmlzbS5sYW5ndWFnZXMubWFya3VwXG5cdFx0fSxcblx0XHQnaGFuZGxlYmFycyc6IC9fX19IQU5ETEVCQVJTWzAtOV0rX19fL2dcblx0fSk7XG59XG5cblxuUHJpc20ubGFuZ3VhZ2VzLm9iamVjdGl2ZWMgPSBQcmlzbS5sYW5ndWFnZXMuZXh0ZW5kKCdjJywge1xuXHQna2V5d29yZCc6IC8oXFxiKGFzbXx0eXBlb2Z8aW5saW5lfGF1dG98YnJlYWt8Y2FzZXxjaGFyfGNvbnN0fGNvbnRpbnVlfGRlZmF1bHR8ZG98ZG91YmxlfGVsc2V8ZW51bXxleHRlcm58ZmxvYXR8Zm9yfGdvdG98aWZ8aW50fGxvbmd8cmVnaXN0ZXJ8cmV0dXJufHNob3J0fHNpZ25lZHxzaXplb2Z8c3RhdGljfHN0cnVjdHxzd2l0Y2h8dHlwZWRlZnx1bmlvbnx1bnNpZ25lZHx2b2lkfHZvbGF0aWxlfHdoaWxlfGlufHNlbGZ8c3VwZXIpXFxiKXwoKD89W1xcd3xAXSkoQGludGVyZmFjZXxAZW5kfEBpbXBsZW1lbnRhdGlvbnxAcHJvdG9jb2x8QGNsYXNzfEBwdWJsaWN8QHByb3RlY3RlZHxAcHJpdmF0ZXxAcHJvcGVydHl8QHRyeXxAY2F0Y2h8QGZpbmFsbHl8QHRocm93fEBzeW50aGVzaXplfEBkeW5hbWljfEBzZWxlY3RvcilcXGIpL2csXG5cdCdzdHJpbmcnOiAvKD86KFwifCcpKFteXFxuXFxcXFxcMV18XFxcXC58XFxcXFxccipcXG4pKj9cXDEpfChAXCIoW15cXG5cXFxcXCJdfFxcXFwufFxcXFxcXHIqXFxuKSo/XCIpL2csXG5cdCdvcGVyYXRvcic6IC9bLStdezEsMn18IT0/fDx7MSwyfT0/fD57MSwyfT0/fFxcLT58PXsxLDJ9fFxcXnx+fCV8JnsxLDJ9fFxcfD9cXHx8XFw/fFxcKnxcXC98QC9nXG59KTtcblxuUHJpc20ubGFuZ3VhZ2VzLnNxbD0geyBcblx0J2NvbW1lbnQnOiB7XG5cdFx0cGF0dGVybjogLyhefFteXFxcXF0pKFxcL1xcKltcXHdcXFddKj9cXCpcXC98KCgtLSl8KFxcL1xcLyl8IykuKj8oXFxyP1xcbnwkKSkvZyxcblx0XHRsb29rYmVoaW5kOiB0cnVlXG5cdH0sXG5cdCdzdHJpbmcnIDoge1xuXHRcdHBhdHRlcm46IC8oXnxbXkBdKShcInwnKShcXFxcP1tcXHNcXFNdKSo/XFwyL2csXG5cdFx0bG9va2JlaGluZDogdHJ1ZVxuXHR9LFxuXHQndmFyaWFibGUnOiAvQFtcXHcuJF0rfEAoXCJ8J3xgKShcXFxcP1tcXHNcXFNdKSs/XFwxL2csXG5cdCdmdW5jdGlvbic6IC9cXGIoPzpDT1VOVHxTVU18QVZHfE1JTnxNQVh8RklSU1R8TEFTVHxVQ0FTRXxMQ0FTRXxNSUR8TEVOfFJPVU5EfE5PV3xGT1JNQVQpKD89XFxzKlxcKCkvaWcsIC8vIFNob3VsZCB3ZSBoaWdobGlnaHQgdXNlciBkZWZpbmVkIGZ1bmN0aW9ucyB0b28/XG5cdCdrZXl3b3JkJzogL1xcYig/OkFDVElPTnxBRER8QUZURVJ8QUxHT1JJVEhNfEFMVEVSfEFOQUxZWkV8QVBQTFl8QVN8QVNDfEFVVEhPUklaQVRJT058QkFDS1VQfEJEQnxCRUdJTnxCRVJLRUxFWURCfEJJR0lOVHxCSU5BUll8QklUfEJMT0J8Qk9PTHxCT09MRUFOfEJSRUFLfEJST1dTRXxCVFJFRXxCVUxLfEJZfENBTEx8Q0FTQ0FERXxDQVNDQURFRHxDQVNFfENIQUlOfENIQVIgVkFSWUlOR3xDSEFSQUNURVIgVkFSWUlOR3xDSEVDS3xDSEVDS1BPSU5UfENMT1NFfENMVVNURVJFRHxDT0FMRVNDRXxDT0xVTU58Q09MVU1OU3xDT01NRU5UfENPTU1JVHxDT01NSVRURUR8Q09NUFVURXxDT05ORUNUfENPTlNJU1RFTlR8Q09OU1RSQUlOVHxDT05UQUlOU3xDT05UQUlOU1RBQkxFfENPTlRJTlVFfENPTlZFUlR8Q1JFQVRFfENST1NTfENVUlJFTlR8Q1VSUkVOVF9EQVRFfENVUlJFTlRfVElNRXxDVVJSRU5UX1RJTUVTVEFNUHxDVVJSRU5UX1VTRVJ8Q1VSU09SfERBVEF8REFUQUJBU0V8REFUQUJBU0VTfERBVEVUSU1FfERCQ0N8REVBTExPQ0FURXxERUN8REVDSU1BTHxERUNMQVJFfERFRkFVTFR8REVGSU5FUnxERUxBWUVEfERFTEVURXxERU5ZfERFU0N8REVTQ1JJQkV8REVURVJNSU5JU1RJQ3xESVNBQkxFfERJU0NBUkR8RElTS3xESVNUSU5DVHxESVNUSU5DVFJPV3xESVNUUklCVVRFRHxET3xET1VCTEV8RE9VQkxFIFBSRUNJU0lPTnxEUk9QfERVTU1ZfERVTVB8RFVNUEZJTEV8RFVQTElDQVRFIEtFWXxFTFNFfEVOQUJMRXxFTkNMT1NFRCBCWXxFTkR8RU5HSU5FfEVOVU18RVJSTFZMfEVSUk9SU3xFU0NBUEV8RVNDQVBFRCBCWXxFWENFUFR8RVhFQ3xFWEVDVVRFfEVYSVR8RVhQTEFJTnxFWFRFTkRFRHxGRVRDSHxGSUVMRFN8RklMRXxGSUxMRkFDVE9SfEZJUlNUfEZJWEVEfEZMT0FUfEZPTExPV0lOR3xGT1J8Rk9SIEVBQ0ggUk9XfEZPUkNFfEZPUkVJR058RlJFRVRFWFR8RlJFRVRFWFRUQUJMRXxGUk9NfEZVTEx8RlVOQ1RJT058R0VPTUVUUll8R0VPTUVUUllDT0xMRUNUSU9OfEdMT0JBTHxHT1RPfEdSQU5UfEdST1VQfEhBTkRMRVJ8SEFTSHxIQVZJTkd8SE9MRExPQ0t8SURFTlRJVFl8SURFTlRJVFlfSU5TRVJUfElERU5USVRZQ09MfElGfElHTk9SRXxJTVBPUlR8SU5ERVh8SU5GSUxFfElOTkVSfElOTk9EQnxJTk9VVHxJTlNFUlR8SU5UfElOVEVHRVJ8SU5URVJTRUNUfElOVE98SU5WT0tFUnxJU09MQVRJT04gTEVWRUx8Sk9JTnxLRVl8S0VZU3xLSUxMfExBTkdVQUdFIFNRTHxMQVNUfExFRlR8TElNSVR8TElORU5PfExJTkVTfExJTkVTVFJJTkd8TE9BRHxMT0NBTHxMT0NLfExPTkdCTE9CfExPTkdURVhUfE1BVENIfE1BVENIRUR8TUVESVVNQkxPQnxNRURJVU1JTlR8TUVESVVNVEVYVHxNRVJHRXxNSURETEVJTlR8TU9ESUZJRVMgU1FMIERBVEF8TU9ESUZZfE1VTFRJTElORVNUUklOR3xNVUxUSVBPSU5UfE1VTFRJUE9MWUdPTnxOQVRJT05BTHxOQVRJT05BTCBDSEFSIFZBUllJTkd8TkFUSU9OQUwgQ0hBUkFDVEVSfE5BVElPTkFMIENIQVJBQ1RFUiBWQVJZSU5HfE5BVElPTkFMIFZBUkNIQVJ8TkFUVVJBTHxOQ0hBUnxOQ0hBUiBWQVJDSEFSfE5FWFR8Tk98Tk8gU1FMfE5PQ0hFQ0t8Tk9DWUNMRXxOT05DTFVTVEVSRUR8TlVMTElGfE5VTUVSSUN8T0Z8T0ZGfE9GRlNFVFN8T058T1BFTnxPUEVOREFUQVNPVVJDRXxPUEVOUVVFUll8T1BFTlJPV1NFVHxPUFRJTUlaRXxPUFRJT058T1BUSU9OQUxMWXxPUkRFUnxPVVR8T1VURVJ8T1VURklMRXxPVkVSfFBBUlRJQUx8UEFSVElUSU9OfFBFUkNFTlR8UElWT1R8UExBTnxQT0lOVHxQT0xZR09OfFBSRUNFRElOR3xQUkVDSVNJT058UFJFVnxQUklNQVJZfFBSSU5UfFBSSVZJTEVHRVN8UFJPQ3xQUk9DRURVUkV8UFVCTElDfFBVUkdFfFFVSUNLfFJBSVNFUlJPUnxSRUFEfFJFQURTIFNRTCBEQVRBfFJFQURURVhUfFJFQUx8UkVDT05GSUdVUkV8UkVGRVJFTkNFU3xSRUxFQVNFfFJFTkFNRXxSRVBFQVRBQkxFfFJFUExJQ0FUSU9OfFJFUVVJUkV8UkVTVE9SRXxSRVNUUklDVHxSRVRVUk58UkVUVVJOU3xSRVZPS0V8UklHSFR8Uk9MTEJBQ0t8Uk9VVElORXxST1dDT1VOVHxST1dHVUlEQ09MfFJPV1M/fFJUUkVFfFJVTEV8U0FWRXxTQVZFUE9JTlR8U0NIRU1BfFNFTEVDVHxTRVJJQUx8U0VSSUFMSVpBQkxFfFNFU1NJT058U0VTU0lPTl9VU0VSfFNFVHxTRVRVU0VSfFNIQVJFIE1PREV8U0hPV3xTSFVURE9XTnxTSU1QTEV8U01BTExJTlR8U05BUFNIT1R8U09NRXxTT05BTUV8U1RBUlR8U1RBUlRJTkcgQll8U1RBVElTVElDU3xTVEFUVVN8U1RSSVBFRHxTWVNURU1fVVNFUnxUQUJMRXxUQUJMRVN8VEFCTEVTUEFDRXxURU1QKD86T1JBUlkpP3xURU1QVEFCTEV8VEVSTUlOQVRFRCBCWXxURVhUfFRFWFRTSVpFfFRIRU58VElNRVNUQU1QfFRJTllCTE9CfFRJTllJTlR8VElOWVRFWFR8VE98VE9QfFRSQU58VFJBTlNBQ1RJT058VFJBTlNBQ1RJT05TfFRSSUdHRVJ8VFJVTkNBVEV8VFNFUVVBTHxUWVBFfFRZUEVTfFVOQk9VTkRFRHxVTkNPTU1JVFRFRHxVTkRFRklORUR8VU5JT058VU5QSVZPVHxVUERBVEV8VVBEQVRFVEVYVHxVU0FHRXxVU0V8VVNFUnxVU0lOR3xWQUxVRXxWQUxVRVN8VkFSQklOQVJZfFZBUkNIQVJ8VkFSQ0hBUkFDVEVSfFZBUllJTkd8VklFV3xXQUlURk9SfFdBUk5JTkdTfFdIRU58V0hFUkV8V0hJTEV8V0lUSHxXSVRIIFJPTExVUHxXSVRISU58V09SS3xXUklURXxXUklURVRFWFQpXFxiL2dpLFxuXHQnYm9vbGVhbic6IC9cXGIoPzpUUlVFfEZBTFNFfE5VTEwpXFxiL2dpLFxuXHQnbnVtYmVyJzogL1xcYi0/KDB4KT9cXGQqXFwuP1tcXGRhLWZdK1xcYi9nLFxuXHQnb3BlcmF0b3InOiAvXFxiKD86QUxMfEFORHxBTll8QkVUV0VFTnxFWElTVFN8SU58TElLRXxOT1R8T1J8SVN8VU5JUVVFfENIQVJBQ1RFUiBTRVR8Q09MTEFURXxESVZ8T0ZGU0VUfFJFR0VYUHxSTElLRXxTT1VORFMgTElLRXxYT1IpXFxifFstK117MX18IXxbPTw+XXsxLDJ9fCgmKXsxLDJ9fFxcfD9cXHx8XFw/fFxcKnxcXC8vZ2ksXG5cdCdwdW5jdHVhdGlvbic6IC9bO1tcXF0oKWAsLl0vZ1xufTtcblByaXNtLmxhbmd1YWdlcy5oYXNrZWxsPSB7XG5cdCdjb21tZW50Jzoge1xuXHRcdHBhdHRlcm46IC8oXnxbXi0hIyQlKis9XFw/JkB8fi46PD5eXFxcXF0pKC0tW14tISMkJSorPVxcPyZAfH4uOjw+XlxcXFxdLiooXFxyP1xcbnwkKXx7LVtcXHdcXFddKj8tfSkvZ20sXG5cdFx0bG9va2JlaGluZDogdHJ1ZVxuXHR9LFxuXHQnY2hhcic6IC8nKFteXFxcXFwiXXxcXFxcKFthYmZucnR2XFxcXFwiJyZdfFxcXltBLVpAW1xcXVxcXl9dfE5VTHxTT0h8U1RYfEVUWHxFT1R8RU5RfEFDS3xCRUx8QlN8SFR8TEZ8VlR8RkZ8Q1J8U098U0l8RExFfERDMXxEQzJ8REMzfERDNHxOQUt8U1lOfEVUQnxDQU58RU18U1VCfEVTQ3xGU3xHU3xSU3xVU3xTUHxERUx8XFxkK3xvWzAtN10rfHhbMC05YS1mQS1GXSspKScvZyxcblx0J3N0cmluZyc6IC9cIihbXlxcXFxcIl18XFxcXChbYWJmbnJ0dlxcXFxcIicmXXxcXF5bQS1aQFtcXF1cXF5fXXxOVUx8U09IfFNUWHxFVFh8RU9UfEVOUXxBQ0t8QkVMfEJTfEhUfExGfFZUfEZGfENSfFNPfFNJfERMRXxEQzF8REMyfERDM3xEQzR8TkFLfFNZTnxFVEJ8Q0FOfEVNfFNVQnxFU0N8RlN8R1N8UlN8VVN8U1B8REVMfFxcZCt8b1swLTddK3x4WzAtOWEtZkEtRl0rKXxcXFxcXFxzK1xcXFwpKlwiL2csXG5cdCdrZXl3b3JkJyA6IC9cXGIoY2FzZXxjbGFzc3xkYXRhfGRlcml2aW5nfGRvfGVsc2V8aWZ8aW58aW5maXhsfGluZml4cnxpbnN0YW5jZXxsZXR8bW9kdWxlfG5ld3R5cGV8b2Z8cHJpbWl0aXZlfHRoZW58dHlwZXx3aGVyZSlcXGIvZyxcblx0J2ltcG9ydF9zdGF0ZW1lbnQnIDoge1xuXHRcdC8vIFRoZSBpbXBvcnRlZCBvciBoaWRkZW4gbmFtZXMgYXJlIG5vdCBpbmNsdWRlZCBpbiB0aGlzIGltcG9ydFxuXHRcdC8vIHN0YXRlbWVudC4gVGhpcyBpcyBiZWNhdXNlIHdlIHdhbnQgdG8gaGlnaGxpZ2h0IHRob3NlIGV4YWN0bHkgbGlrZVxuXHRcdC8vIHdlIGRvIGZvciB0aGUgbmFtZXMgaW4gdGhlIHByb2dyYW0uXG5cdFx0cGF0dGVybjogLyhcXG58XilcXHMqKGltcG9ydClcXHMrKHF1YWxpZmllZFxccyspPygoW0EtWl1bX2EtekEtWjAtOSddKikoXFwuW0EtWl1bX2EtekEtWjAtOSddKikqKShcXHMrKGFzKVxccysoKFtBLVpdW19hLXpBLVowLTknXSopKFxcLltBLVpdW19hLXpBLVowLTknXSopKikpPyhcXHMraGlkaW5nXFxiKT8vZ20sXG5cdFx0aW5zaWRlOiB7XG5cdFx0XHQna2V5d29yZCc6IC9cXGIoaW1wb3J0fHF1YWxpZmllZHxhc3xoaWRpbmcpXFxiL2dcblx0XHR9XG5cdH0sXG5cdC8vIFRoZXNlIGFyZSBidWlsdGluIHZhcmlhYmxlcyBvbmx5LiBDb25zdHJ1Y3RvcnMgYXJlIGhpZ2hsaWdodGVkIGxhdGVyIGFzIGEgY29uc3RhbnQuXG5cdCdidWlsdGluJzogL1xcYihhYnN8YWNvc3xhY29zaHxhbGx8YW5kfGFueXxhcHBlbmRGaWxlfGFwcHJveFJhdGlvbmFsfGFzVHlwZU9mfGFzaW58YXNpbmh8YXRhbnxhdGFuMnxhdGFuaHxiYXNpY0lPUnVufGJyZWFrfGNhdGNofGNlaWxpbmd8Y2hyfGNvbXBhcmV8Y29uY2F0fGNvbmNhdE1hcHxjb25zdHxjb3N8Y29zaHxjdXJyeXxjeWNsZXxkZWNvZGVGbG9hdHxkZW5vbWluYXRvcnxkaWdpdFRvSW50fGRpdnxkaXZNb2R8ZHJvcHxkcm9wV2hpbGV8ZWl0aGVyfGVsZW18ZW5jb2RlRmxvYXR8ZW51bUZyb218ZW51bUZyb21UaGVufGVudW1Gcm9tVGhlblRvfGVudW1Gcm9tVG98ZXJyb3J8ZXZlbnxleHB8ZXhwb25lbnR8ZmFpbHxmaWx0ZXJ8ZmxpcHxmbG9hdERpZ2l0c3xmbG9hdFJhZGl4fGZsb2F0UmFuZ2V8Zmxvb3J8Zm1hcHxmb2xkbHxmb2xkbDF8Zm9sZHJ8Zm9sZHIxfGZyb21Eb3VibGV8ZnJvbUVudW18ZnJvbUludHxmcm9tSW50ZWdlcnxmcm9tSW50ZWdyYWx8ZnJvbVJhdGlvbmFsfGZzdHxnY2R8Z2V0Q2hhcnxnZXRDb250ZW50c3xnZXRMaW5lfGdyb3VwfGhlYWR8aWR8aW5SYW5nZXxpbmRleHxpbml0fGludFRvRGlnaXR8aW50ZXJhY3R8aW9FcnJvcnxpc0FscGhhfGlzQWxwaGFOdW18aXNBc2NpaXxpc0NvbnRyb2x8aXNEZW5vcm1hbGl6ZWR8aXNEaWdpdHxpc0hleERpZ2l0fGlzSUVFRXxpc0luZmluaXRlfGlzTG93ZXJ8aXNOYU58aXNOZWdhdGl2ZVplcm98aXNPY3REaWdpdHxpc1ByaW50fGlzU3BhY2V8aXNVcHBlcnxpdGVyYXRlfGxhc3R8bGNtfGxlbmd0aHxsZXh8bGV4RGlnaXRzfGxleExpdENoYXJ8bGluZXN8bG9nfGxvZ0Jhc2V8bG9va3VwfG1hcHxtYXBNfG1hcE1ffG1heHxtYXhCb3VuZHxtYXhpbXVtfG1heWJlfG1pbnxtaW5Cb3VuZHxtaW5pbXVtfG1vZHxuZWdhdGV8bm90fG5vdEVsZW18bnVsbHxudW1lcmF0b3J8b2RkfG9yfG9yZHxvdGhlcndpc2V8cGFja3xwaXxwcmVkfHByaW1FeGl0V2l0aHxwcmludHxwcm9kdWN0fHByb3BlckZyYWN0aW9ufHB1dENoYXJ8cHV0U3RyfHB1dFN0ckxufHF1b3R8cXVvdFJlbXxyYW5nZXxyYW5nZVNpemV8cmVhZHxyZWFkRGVjfHJlYWRGaWxlfHJlYWRGbG9hdHxyZWFkSGV4fHJlYWRJT3xyZWFkSW50fHJlYWRMaXN0fHJlYWRMaXRDaGFyfHJlYWRMbnxyZWFkT2N0fHJlYWRQYXJlbnxyZWFkU2lnbmVkfHJlYWRzfHJlYWRzUHJlY3xyZWFsVG9GcmFjfHJlY2lwfHJlbXxyZXBlYXR8cmVwbGljYXRlfHJldHVybnxyZXZlcnNlfHJvdW5kfHNjYWxlRmxvYXR8c2Nhbmx8c2NhbmwxfHNjYW5yfHNjYW5yMXxzZXF8c2VxdWVuY2V8c2VxdWVuY2VffHNob3d8c2hvd0NoYXJ8c2hvd0ludHxzaG93TGlzdHxzaG93TGl0Q2hhcnxzaG93UGFyZW58c2hvd1NpZ25lZHxzaG93U3RyaW5nfHNob3dzfHNob3dzUHJlY3xzaWduaWZpY2FuZHxzaWdudW18c2lufHNpbmh8c25kfHNvcnR8c3BhbnxzcGxpdEF0fHNxcnR8c3VidHJhY3R8c3VjY3xzdW18dGFpbHx0YWtlfHRha2VXaGlsZXx0YW58dGFuaHx0aHJlYWRUb0lPUmVzdWx0fHRvRW51bXx0b0ludHx0b0ludGVnZXJ8dG9Mb3dlcnx0b1JhdGlvbmFsfHRvVXBwZXJ8dHJ1bmNhdGV8dW5jdXJyeXx1bmRlZmluZWR8dW5saW5lc3x1bnRpbHx1bndvcmRzfHVuemlwfHVuemlwM3x1c2VyRXJyb3J8d29yZHN8d3JpdGVGaWxlfHppcHx6aXAzfHppcFdpdGh8emlwV2l0aDMpXFxiL2csXG5cdC8vIGRlY2ltYWwgaW50ZWdlcnMgYW5kIGZsb2F0aW5nIHBvaW50IG51bWJlcnMgfCBvY3RhbCBpbnRlZ2VycyB8IGhleGFkZWNpbWFsIGludGVnZXJzXG5cdCdudW1iZXInIDogL1xcYihcXGQrKFxcLlxcZCspPyhbZUVdWystXT9cXGQrKT98MFtPb11bMC03XSt8MFtYeF1bMC05YS1mQS1GXSspXFxiL2csXG5cdC8vIE1vc3Qgb2YgdGhpcyBpcyBuZWVkZWQgYmVjYXVzZSBvZiB0aGUgbWVhbmluZyBvZiBhIHNpbmdsZSAnLicuXG5cdC8vIElmIGl0IHN0YW5kcyBhbG9uZSBmcmVlbHksIGl0IGlzIHRoZSBmdW5jdGlvbiBjb21wb3NpdGlvbi5cblx0Ly8gSXQgbWF5IGFsc28gYmUgYSBzZXBhcmF0b3IgYmV0d2VlbiBhIG1vZHVsZSBuYW1lIGFuZCBhbiBpZGVudGlmaWVyID0+IG5vXG5cdC8vIG9wZXJhdG9yLiBJZiBpdCBjb21lcyB0b2dldGhlciB3aXRoIG90aGVyIHNwZWNpYWwgY2hhcmFjdGVycyBpdCBpcyBhblxuXHQvLyBvcGVyYXRvciB0b28uXG5cdCdvcGVyYXRvcicgOiAvXFxzXFwuXFxzfChbLSEjJCUqKz1cXD8mQHx+Ojw+XlxcXFxdKlxcLlstISMkJSorPVxcPyZAfH46PD5eXFxcXF0rKXwoWy0hIyQlKis9XFw/JkB8fjo8Pl5cXFxcXStcXC5bLSEjJCUqKz1cXD8mQHx+Ojw+XlxcXFxdKil8Wy0hIyQlKis9XFw/JkB8fjo8Pl5cXFxcXSt8KGAoW0EtWl1bX2EtekEtWjAtOSddKlxcLikqW19hLXpdW19hLXpBLVowLTknXSpgKS9nLFxuXHQvLyBJbiBIYXNrZWxsLCBuZWFybHkgZXZlcnl0aGluZyBpcyBhIHZhcmlhYmxlLCBkbyBub3QgaGlnaGxpZ2h0IHRoZXNlLlxuXHQnaHZhcmlhYmxlJzogL1xcYihbQS1aXVtfYS16QS1aMC05J10qXFwuKSpbX2Etel1bX2EtekEtWjAtOSddKlxcYi9nLFxuXHQnY29uc3RhbnQnOiAvXFxiKFtBLVpdW19hLXpBLVowLTknXSpcXC4pKltBLVpdW19hLXpBLVowLTknXSpcXGIvZyxcblx0J3B1bmN0dWF0aW9uJyA6IC9be31bXFxdOygpLC46XS9nXG59O1xuXG5QcmlzbS5sYW5ndWFnZXMucGVybCA9IHtcblx0J2NvbW1lbnQnOiBbXG5cdFx0e1xuXHRcdFx0Ly8gUE9EXG5cdFx0XHRwYXR0ZXJuOiAvKCg/Ol58XFxuKVxccyopPVxcdytbXFxzXFxTXSo/PWN1dC4rL2csXG5cdFx0XHRsb29rYmVoaW5kOiB0cnVlXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRwYXR0ZXJuOiAvKF58W15cXFxcJF0pIy4qPyhcXHI/XFxufCQpL2csXG5cdFx0XHRsb29rYmVoaW5kOiB0cnVlXG5cdFx0fVxuXHRdLFxuXHQvLyBUT0RPIENvdWxkIGJlIG5pY2UgdG8gaGFuZGxlIEhlcmVkb2MgdG9vLlxuXHQnc3RyaW5nJzogW1xuXHRcdC8vIHEvLi4uL1xuXHRcdC9cXGIoPzpxfHFxfHF4fHF3KVxccyooW15hLXpBLVowLTlcXHNcXHtcXChcXFs8XSkoXFxcXD8uKSo/XFxzKlxcMS9nLFxuXHRcblx0XHQvLyBxIGEuLi5hXG5cdFx0L1xcYig/OnF8cXF8cXh8cXcpXFxzKyhbYS16QS1aMC05XSkoXFxcXD8uKSo/XFxzKlxcMS9nLFxuXHRcblx0XHQvLyBxKC4uLilcblx0XHQvXFxiKD86cXxxcXxxeHxxdylcXHMqXFwoKFteKCldfFxcXFwuKSpcXHMqXFwpL2csXG5cdFxuXHRcdC8vIHF7Li4ufVxuXHRcdC9cXGIoPzpxfHFxfHF4fHF3KVxccypcXHsoW157fV18XFxcXC4pKlxccypcXH0vZyxcblx0XG5cdFx0Ly8gcVsuLi5dXG5cdFx0L1xcYig/OnF8cXF8cXh8cXcpXFxzKlxcWyhbXltcXF1dfFxcXFwuKSpcXHMqXFxdL2csXG5cdFxuXHRcdC8vIHE8Li4uPlxuXHRcdC9cXGIoPzpxfHFxfHF4fHF3KVxccyo8KFtePD5dfFxcXFwuKSpcXHMqPi9nLFxuXG5cdFx0Ly8gXCIuLi5cIiwgJy4uLicsIGAuLi5gXG5cdFx0LyhcInwnfGApKFxcXFw/LikqP1xcMS9nXG5cdF0sXG5cdCdyZWdleCc6IFtcblx0XHQvLyBtLy4uLi9cblx0XHQvXFxiKD86bXxxcilcXHMqKFteYS16QS1aMC05XFxzXFx7XFwoXFxbPF0pKFxcXFw/LikqP1xccypcXDFbbXNpeHBvZHVhbGdjXSovZyxcblx0XG5cdFx0Ly8gbSBhLi4uYVxuXHRcdC9cXGIoPzptfHFyKVxccysoW2EtekEtWjAtOV0pKFxcXFw/LikqP1xccypcXDFbbXNpeHBvZHVhbGdjXSovZyxcblx0XG5cdFx0Ly8gbSguLi4pXG5cdFx0L1xcYig/Om18cXIpXFxzKlxcKChbXigpXXxcXFxcLikqXFxzKlxcKVttc2l4cG9kdWFsZ2NdKi9nLFxuXHRcblx0XHQvLyBtey4uLn1cblx0XHQvXFxiKD86bXxxcilcXHMqXFx7KFtee31dfFxcXFwuKSpcXHMqXFx9W21zaXhwb2R1YWxnY10qL2csXG5cdFxuXHRcdC8vIG1bLi4uXVxuXHRcdC9cXGIoPzptfHFyKVxccypcXFsoW15bXFxdXXxcXFxcLikqXFxzKlxcXVttc2l4cG9kdWFsZ2NdKi9nLFxuXHRcblx0XHQvLyBtPC4uLj5cblx0XHQvXFxiKD86bXxxcilcXHMqPChbXjw+XXxcXFxcLikqXFxzKj5bbXNpeHBvZHVhbGdjXSovZyxcblx0XG5cdFx0Ly8gcy8uLi4vLi4uL1xuXHRcdC9cXGIoPzpzfHRyfHkpXFxzKihbXmEtekEtWjAtOVxcc1xce1xcKFxcWzxdKShcXFxcPy4pKj9cXHMqXFwxXFxzKigoPyFcXDEpLnxcXFxcLikqXFxzKlxcMVttc2l4cG9kdWFsZ2Nlcl0qL2csXG5cdFxuXHRcdC8vIHMgYS4uLmEuLi5hXG5cdFx0L1xcYig/OnN8dHJ8eSlcXHMrKFthLXpBLVowLTldKShcXFxcPy4pKj9cXHMqXFwxXFxzKigoPyFcXDEpLnxcXFxcLikqXFxzKlxcMVttc2l4cG9kdWFsZ2Nlcl0qL2csXG5cdFxuXHRcdC8vIHMoLi4uKSguLi4pXG5cdFx0L1xcYig/OnN8dHJ8eSlcXHMqXFwoKFteKCldfFxcXFwuKSpcXHMqXFwpXFxzKlxcKFxccyooW14oKV18XFxcXC4pKlxccypcXClbbXNpeHBvZHVhbGdjZXJdKi9nLFxuXHRcblx0XHQvLyBzey4uLn17Li4ufVxuXHRcdC9cXGIoPzpzfHRyfHkpXFxzKlxceyhbXnt9XXxcXFxcLikqXFxzKlxcfVxccypcXHtcXHMqKFtee31dfFxcXFwuKSpcXHMqXFx9W21zaXhwb2R1YWxnY2VyXSovZyxcblx0XG5cdFx0Ly8gc1suLi5dWy4uLl1cblx0XHQvXFxiKD86c3x0cnx5KVxccypcXFsoW15bXFxdXXxcXFxcLikqXFxzKlxcXVxccypcXFtcXHMqKFteW1xcXV18XFxcXC4pKlxccypcXF1bbXNpeHBvZHVhbGdjZXJdKi9nLFxuXHRcblx0XHQvLyBzPC4uLj48Li4uPlxuXHRcdC9cXGIoPzpzfHRyfHkpXFxzKjwoW148Pl18XFxcXC4pKlxccyo+XFxzKjxcXHMqKFtePD5dfFxcXFwuKSpcXHMqPlttc2l4cG9kdWFsZ2Nlcl0qL2csXG5cdFxuXHRcdC8vIC8uLi4vXG5cdFx0L1xcLyhcXFsuKz9dfFxcXFwufFteXFwvXFxyXFxuXSkqXFwvW21zaXhwb2R1YWxnY10qKD89XFxzKigkfFtcXHJcXG4sLjt9KSZ8XFwtKyo9fjw+IT9eXXwobHR8Z3R8bGV8Z2V8ZXF8bmV8Y21wfG5vdHxhbmR8b3J8eG9yfHgpXFxiKSkvZ1xuXHRdLFxuXG5cdC8vIEZJWE1FIE5vdCBzdXJlIGFib3V0IHRoZSBoYW5kbGluZyBvZiA6OiwgJywgYW5kICNcblx0J3ZhcmlhYmxlJzogW1xuXHRcdC8vICR7XlBPU1RNQVRDSH1cblx0XHQvWyYqXFwkQCVdXFx7XFxeW0EtWl0rXFx9L2csXG5cdFx0Ly8gJF5WXG5cdFx0L1smKlxcJEAlXVxcXltBLVpfXS9nLFxuXHRcdC8vICR7Li4ufVxuXHRcdC9bJipcXCRAJV0jPyg/PVxceykvLFxuXHRcdC8vICRmb29cblx0XHQvWyYqXFwkQCVdIz8oKDo6KSonPyg/IVxcZClbXFx3JF0rKSsoOjopKi9pZyxcblx0XHQvLyAkMVxuXHRcdC9bJipcXCRAJV1cXGQrL2csXG5cdFx0Ly8gJF8sIEBfLCAlIVxuXHRcdC9bXFwkQCVdWyFcIiNcXCQlJicoKSorLFxcLS5cXC86Ozw9Pj9AW1xcXFxcXF1eX2B7fH1+XS9nXG5cdF0sXG5cdCdmaWxlaGFuZGxlJzoge1xuXHRcdC8vIDw+LCA8Rk9PPiwgX1xuXHRcdHBhdHRlcm46IC88KD8hPSkuKj58XFxiX1xcYi9nLFxuXHRcdGFsaWFzOiAnc3ltYm9sJ1xuXHR9LFxuXHQndnN0cmluZyc6IHtcblx0XHQvLyB2MS4yLCAxLjIuM1xuXHRcdHBhdHRlcm46IC92XFxkKyhcXC5cXGQrKSp8XFxkKyhcXC5cXGQrKXsyLH0vZyxcblx0XHRhbGlhczogJ3N0cmluZydcblx0fSxcblx0J2Z1bmN0aW9uJzoge1xuXHRcdHBhdHRlcm46IC9zdWIgW2EtejAtOV9dKy9pZyxcblx0XHRpbnNpZGU6IHtcblx0XHRcdGtleXdvcmQ6IC9zdWIvXG5cdFx0fVxuXHR9LFxuXHQna2V5d29yZCc6IC9cXGIoYW55fGJyZWFrfGNvbnRpbnVlfGRlZmF1bHR8ZGVsZXRlfGRpZXxkb3xlbHNlfGVsc2lmfGV2YWx8Zm9yfGZvcmVhY2h8Z2l2ZW58Z290b3xpZnxsYXN0fGxvY2FsfG15fG5leHR8b3VyfHBhY2thZ2V8cHJpbnR8cmVkb3xyZXF1aXJlfHNheXxzdGF0ZXxzdWJ8c3dpdGNofHVuZGVmfHVubGVzc3x1bnRpbHx1c2V8d2hlbnx3aGlsZSlcXGIvZyxcblx0J251bWJlcic6IC8oXFxufFxcYiktPygweFtcXGRBLUZhLWZdKF8/W1xcZEEtRmEtZl0pKnwwYlswMV0oXz9bMDFdKSp8KFxcZChfP1xcZCkqKT9cXC4/XFxkKF8/XFxkKSooW0VlXS0/XFxkKyk/KVxcYi9nLFxuXHQnb3BlcmF0b3InOiAvLVtyd3hvUldYT2V6c2ZkbHBTYmN0dWdrVEJNQUNdXFxifFstKyo9flxcL3wmXXsxLDJ9fDw9P3w+PT98XFwuezEsM318WyE/XFxcXF5dfFxcYihsdHxndHxsZXxnZXxlcXxuZXxjbXB8bm90fGFuZHxvcnx4b3J8eClcXGIvZyxcblx0J3B1bmN0dWF0aW9uJzogL1t7fVtcXF07KCksOl0vZ1xufTtcblxuLy8gaXNzdWVzOiBuZXN0ZWQgbXVsdGlsaW5lIGNvbW1lbnRzLCBoaWdobGlnaHRpbmcgaW5zaWRlIHN0cmluZyBpbnRlcnBvbGF0aW9uc1xuUHJpc20ubGFuZ3VhZ2VzLnN3aWZ0ID0gUHJpc20ubGFuZ3VhZ2VzLmV4dGVuZCgnY2xpa2UnLCB7XG5cdCdrZXl3b3JkJzogL1xcYihhc3xhc3NvY2lhdGl2aXR5fGJyZWFrfGNhc2V8Y2xhc3N8Y29udGludWV8Y29udmVuaWVuY2V8ZGVmYXVsdHxkZWluaXR8ZGlkU2V0fGRvfGR5bmFtaWNUeXBlfGVsc2V8ZW51bXxleHRlbnNpb258ZmFsbHRocm91Z2h8ZmluYWx8Zm9yfGZ1bmN8Z2V0fGlmfGltcG9ydHxpbnxpbmZpeHxpbml0fGlub3V0fGludGVybmFsfGlzfGxhenl8bGVmdHxsZXR8bXV0YXRpbmd8bmV3fG5vbmV8bm9ubXV0YXRpbmd8b3BlcmF0b3J8b3B0aW9uYWx8b3ZlcnJpZGV8cG9zdGZpeHxwcmVjZWRlbmNlfHByZWZpeHxwcml2YXRlfHByb3RvY29sfHB1YmxpY3xyZXF1aXJlZHxyZXR1cm58cmlnaHR8c2FmZXxzZWxmfFNlbGZ8c2V0fHN0YXRpY3xzdHJ1Y3R8c3Vic2NyaXB0fHN1cGVyfHN3aXRjaHxUeXBlfHR5cGVhbGlhc3x1bm93bmVkfHVub3duZWR8dW5zYWZlfHZhcnx3ZWFrfHdoZXJlfHdoaWxlfHdpbGxTZXR8X19DT0xVTU5fX3xfX0ZJTEVfX3xfX0ZVTkNUSU9OX198X19MSU5FX18pXFxiL2csXG5cdCdudW1iZXInOiAvXFxiKFtcXGRfXSsoXFwuW1xcZGVfXSspP3wweFthLWYwLTlfXSsoXFwuW2EtZjAtOXBfXSspP3wwYlswMV9dK3wwb1swLTdfXSspXFxiL2dpLFxuXHQnY29uc3RhbnQnOiAvXFxiKG5pbHxbQS1aX117Mix9fGtbQS1aXVtBLVphLXpfXSspXFxiL2csXG5cdCdhdHJ1bGUnOiAvXFxAXFxiKElCT3V0bGV0fElCRGVzaWduYWJsZXxJQkFjdGlvbnxJQkluc3BlY3RhYmxlfGNsYXNzX3Byb3RvY29sfGV4cG9ydGVkfG5vcmV0dXJufE5TQ29weWluZ3xOU01hbmFnZWR8b2JqY3xVSUFwcGxpY2F0aW9uTWFpbnxhdXRvX2Nsb3N1cmUpXFxiL2csXG5cdCdidWlsdGluJzogL1xcYihbQS1aXVxcUyt8YWJzfGFkdmFuY2V8YWxpZ25vZnxhbGlnbm9mVmFsdWV8YXNzZXJ0fGNvbnRhaW5zfGNvdW50fGNvdW50RWxlbWVudHN8ZGVidWdQcmludHxkZWJ1Z1ByaW50bG58ZGlzdGFuY2V8ZHJvcEZpcnN0fGRyb3BMYXN0fGR1bXB8ZW51bWVyYXRlfGVxdWFsfGZpbHRlcnxmaW5kfGZpcnN0fGdldFZhTGlzdHxpbmRpY2VzfGlzRW1wdHl8am9pbnxsYXN0fGxhenl8bGV4aWNvZ3JhcGhpY2FsQ29tcGFyZXxtYXB8bWF4fG1heEVsZW1lbnR8bWlufG1pbkVsZW1lbnR8bnVtZXJpY0Nhc3R8b3ZlcmxhcHN8cGFydGl0aW9ufHByZWZpeHxwcmludHxwcmludGxufHJlZHVjZXxyZWZsZWN0fHJldmVyc2V8c2l6ZW9mfHNpemVvZlZhbHVlfHNvcnR8c29ydGVkfHNwbGl0fHN0YXJ0c1dpdGh8c3RyaWRlfHN0cmlkZW9mfHN0cmlkZW9mVmFsdWV8c3VmZml4fHN3YXB8dG9EZWJ1Z1N0cmluZ3x0b1N0cmluZ3x0cmFuc2NvZGV8dW5kZXJlc3RpbWF0ZUNvdW50fHVuc2FmZUJpdENhc3R8d2l0aEV4dGVuZGVkTGlmZXRpbWV8d2l0aFVuc2FmZU11dGFibGVQb2ludGVyfHdpdGhVbnNhZmVNdXRhYmxlUG9pbnRlcnN8d2l0aFVuc2FmZVBvaW50ZXJ8d2l0aFVuc2FmZVBvaW50ZXJzfHdpdGhWYUxpc3QpXFxiL2dcbn0pO1xuXG5QcmlzbS5sYW5ndWFnZXMuY3BwID0gUHJpc20ubGFuZ3VhZ2VzLmV4dGVuZCgnYycsIHtcblx0J2tleXdvcmQnOiAvXFxiKGFsaWduYXN8YWxpZ25vZnxhc218YXV0b3xib29sfGJyZWFrfGNhc2V8Y2F0Y2h8Y2hhcnxjaGFyMTZfdHxjaGFyMzJfdHxjbGFzc3xjb21wbHxjb25zdHxjb25zdGV4cHJ8Y29uc3RfY2FzdHxjb250aW51ZXxkZWNsdHlwZXxkZWZhdWx0fGRlbGV0ZXxkZWxldGVcXFtcXF18ZG98ZG91YmxlfGR5bmFtaWNfY2FzdHxlbHNlfGVudW18ZXhwbGljaXR8ZXhwb3J0fGV4dGVybnxmbG9hdHxmb3J8ZnJpZW5kfGdvdG98aWZ8aW5saW5lfGludHxsb25nfG11dGFibGV8bmFtZXNwYWNlfG5ld3xuZXdcXFtcXF18bm9leGNlcHR8bnVsbHB0cnxvcGVyYXRvcnxwcml2YXRlfHByb3RlY3RlZHxwdWJsaWN8cmVnaXN0ZXJ8cmVpbnRlcnByZXRfY2FzdHxyZXR1cm58c2hvcnR8c2lnbmVkfHNpemVvZnxzdGF0aWN8c3RhdGljX2Fzc2VydHxzdGF0aWNfY2FzdHxzdHJ1Y3R8c3dpdGNofHRlbXBsYXRlfHRoaXN8dGhyZWFkX2xvY2FsfHRocm93fHRyeXx0eXBlZGVmfHR5cGVpZHx0eXBlbmFtZXx1bmlvbnx1bnNpZ25lZHx1c2luZ3x2aXJ0dWFsfHZvaWR8dm9sYXRpbGV8d2NoYXJfdHx3aGlsZSlcXGIvZyxcblx0J2Jvb2xlYW4nOiAvXFxiKHRydWV8ZmFsc2UpXFxiL2csXG5cdCdvcGVyYXRvcic6IC9bLStdezEsMn18IT0/fDx7MSwyfT0/fD57MSwyfT0/fFxcLT58OnsxLDJ9fD17MSwyfXxcXF58fnwlfCZ7MSwyfXxcXHw/XFx8fFxcP3xcXCp8XFwvfFxcYihhbmR8YW5kX2VxfGJpdGFuZHxiaXRvcnxub3R8bm90X2VxfG9yfG9yX2VxfHhvcnx4b3JfZXEpXFxiL2dcbn0pO1xuXG5QcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKCdjcHAnLCAna2V5d29yZCcsIHtcblx0J2NsYXNzLW5hbWUnOiB7XG5cdFx0cGF0dGVybjogLyhjbGFzc1xccyspW2EtejAtOV9dKy9pZyxcblx0XHRsb29rYmVoaW5kOiB0cnVlLFxuXHR9LFxufSk7XG5QcmlzbS5sYW5ndWFnZXMuaHR0cCA9IHtcbiAgICAncmVxdWVzdC1saW5lJzoge1xuICAgICAgICBwYXR0ZXJuOiAvXihQT1NUfEdFVHxQVVR8REVMRVRFfE9QVElPTlN8UEFUQ0h8VFJBQ0V8Q09OTkVDVClcXGJcXHNodHRwcz86XFwvXFwvXFxTK1xcc0hUVFBcXC9bMC05Ll0rL2csXG4gICAgICAgIGluc2lkZToge1xuICAgICAgICAgICAgLy8gSFRUUCBWZXJiXG4gICAgICAgICAgICBwcm9wZXJ0eTogL15cXGIoUE9TVHxHRVR8UFVUfERFTEVURXxPUFRJT05TfFBBVENIfFRSQUNFfENPTk5FQ1QpXFxiL2csXG4gICAgICAgICAgICAvLyBQYXRoIG9yIHF1ZXJ5IGFyZ3VtZW50XG4gICAgICAgICAgICAnYXR0ci1uYW1lJzogLzpcXHcrL2dcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ3Jlc3BvbnNlLXN0YXR1cyc6IHtcbiAgICAgICAgcGF0dGVybjogL15IVFRQXFwvMS5bMDFdIFswLTldKy4qL2csXG4gICAgICAgIGluc2lkZToge1xuICAgICAgICAgICAgLy8gU3RhdHVzLCBlLmcuIDIwMCBPS1xuICAgICAgICAgICAgcHJvcGVydHk6IC9bMC05XStbQS1aXFxzLV0rJC9pZ1xuICAgICAgICB9XG4gICAgfSxcbiAgICAvLyBIVFRQIGhlYWRlciBuYW1lXG4gICAga2V5d29yZDogL15bXFx3LV0rOig/PS4rKS9nbVxufTtcblxuLy8gQ3JlYXRlIGEgbWFwcGluZyBvZiBDb250ZW50LVR5cGUgaGVhZGVycyB0byBsYW5ndWFnZSBkZWZpbml0aW9uc1xudmFyIGh0dHBMYW5ndWFnZXMgPSB7XG4gICAgJ2FwcGxpY2F0aW9uL2pzb24nOiBQcmlzbS5sYW5ndWFnZXMuamF2YXNjcmlwdCxcbiAgICAnYXBwbGljYXRpb24veG1sJzogUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cCxcbiAgICAndGV4dC94bWwnOiBQcmlzbS5sYW5ndWFnZXMubWFya3VwLFxuICAgICd0ZXh0L2h0bWwnOiBQcmlzbS5sYW5ndWFnZXMubWFya3VwXG59O1xuXG4vLyBJbnNlcnQgZWFjaCBjb250ZW50IHR5cGUgcGFyc2VyIHRoYXQgaGFzIGl0cyBhc3NvY2lhdGVkIGxhbmd1YWdlXG4vLyBjdXJyZW50bHkgbG9hZGVkLlxuZm9yICh2YXIgY29udGVudFR5cGUgaW4gaHR0cExhbmd1YWdlcykge1xuICAgIGlmIChodHRwTGFuZ3VhZ2VzW2NvbnRlbnRUeXBlXSkge1xuICAgICAgICB2YXIgb3B0aW9ucyA9IHt9O1xuICAgICAgICBvcHRpb25zW2NvbnRlbnRUeXBlXSA9IHtcbiAgICAgICAgICAgIHBhdHRlcm46IG5ldyBSZWdFeHAoJyhjb250ZW50LXR5cGU6XFxcXHMqJyArIGNvbnRlbnRUeXBlICsgJ1tcXFxcd1xcXFxXXSo/KVxcXFxuXFxcXG5bXFxcXHdcXFxcV10qJywgJ2dpJyksXG4gICAgICAgICAgICBsb29rYmVoaW5kOiB0cnVlLFxuICAgICAgICAgICAgaW5zaWRlOiB7XG4gICAgICAgICAgICAgICAgcmVzdDogaHR0cExhbmd1YWdlc1tjb250ZW50VHlwZV1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgUHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZSgnaHR0cCcsICdrZXl3b3JkJywgb3B0aW9ucyk7XG4gICAgfVxufVxuXG5QcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKCdwaHAnLCAndmFyaWFibGUnLCB7XG5cdCd0aGlzJzogL1xcJHRoaXMvZyxcblx0J2dsb2JhbCc6IC9cXCRfPyhHTE9CQUxTfFNFUlZFUnxHRVR8UE9TVHxGSUxFU3xSRVFVRVNUfFNFU1NJT058RU5WfENPT0tJRXxIVFRQX1JBV19QT1NUX0RBVEF8YXJnY3xhcmd2fHBocF9lcnJvcm1zZ3xodHRwX3Jlc3BvbnNlX2hlYWRlcikvZyxcblx0J3Njb3BlJzoge1xuXHRcdHBhdHRlcm46IC9cXGJbXFx3XFxcXF0rOjovZyxcblx0XHRpbnNpZGU6IHtcblx0XHRcdGtleXdvcmQ6IC8oc3RhdGljfHNlbGZ8cGFyZW50KS8sXG5cdFx0XHRwdW5jdHVhdGlvbjogLyg6OnxcXFxcKS9cblx0XHR9XG5cdH1cbn0pO1xuUHJpc20ubGFuZ3VhZ2VzLnR3aWcgPSB7XG5cdCdjb21tZW50JzogL1xce1xcI1tcXHNcXFNdKj9cXCNcXH0vZyxcblx0J3RhZyc6IHtcblx0XHRwYXR0ZXJuOiAvKFxce1xce1tcXHNcXFNdKj9cXH1cXH18XFx7XFwlW1xcc1xcU10qP1xcJVxcfSkvZyxcblx0XHRpbnNpZGU6IHtcblx0XHRcdCdsZCc6IHtcblx0XHRcdFx0cGF0dGVybjogL14oXFx7XFx7XFwtP3xcXHtcXCVcXC0/XFxzKlxcdyspLyxcblx0XHRcdFx0aW5zaWRlOiB7XG5cdFx0XHRcdFx0J3B1bmN0dWF0aW9uJzogL14oXFx7XFx7fFxce1xcJSlcXC0/Lyxcblx0XHRcdFx0XHQna2V5d29yZCc6IC9cXHcrL1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0J3JkJzoge1xuXHRcdFx0XHRwYXR0ZXJuOiAvXFwtPyhcXCVcXH18XFx9XFx9KSQvLFxuXHRcdFx0XHRpbnNpZGU6IHtcblx0XHRcdFx0XHQncHVuY3R1YXRpb24nOiAvLiovXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHQnc3RyaW5nJzoge1xuXHRcdFx0XHRwYXR0ZXJuOiAvKFwifCcpKFxcXFw/LikqP1xcMS9nLFxuXHRcdFx0XHRpbnNpZGU6IHtcblx0XHRcdFx0XHQncHVuY3R1YXRpb24nOiAvXignfFwiKXwoJ3xcIikkL2dcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdCdrZXl3b3JkJzogL1xcYihpZilcXGIvZyxcblx0XHRcdCdib29sZWFuJzogL1xcYih0cnVlfGZhbHNlfG51bGwpXFxiL2csXG5cdFx0XHQnbnVtYmVyJzogL1xcYi0/KDB4W1xcZEEtRmEtZl0rfFxcZCpcXC4/XFxkKyhbRWVdLT9cXGQrKT8pXFxiL2csXG5cdFx0XHQnb3BlcmF0b3InOiAvPT18PXxcXCE9fDx8Pnw+PXw8PXxcXCt8XFwtfH58XFwqfFxcL3xcXC9cXC98JXxcXCpcXCp8XFx8L2csXG5cdFx0XHQnc3BhY2Utb3BlcmF0b3InOiB7XG5cdFx0XHRcdHBhdHRlcm46IC8oXFxzKShcXGIobm90fGJcXC1hbmR8YlxcLXhvcnxiXFwtb3J8YW5kfG9yfGlufG1hdGNoZXN8c3RhcnRzIHdpdGh8ZW5kcyB3aXRofGlzKVxcYnxcXD98OnxcXD9cXDopKD89XFxzKS9nLFxuXHRcdFx0XHRsb29rYmVoaW5kOiB0cnVlLFxuXHRcdFx0XHRpbnNpZGU6IHtcblx0XHRcdFx0XHQnb3BlcmF0b3InOiAvLiovXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHQncHJvcGVydHknOiAvXFxiW2EtekEtWl9dW2EtekEtWjAtOV9dKlxcYi9nLFxuXHRcdFx0J3B1bmN0dWF0aW9uJzogL1xcKHxcXCl8XFxbXFxdfFxcW3xcXF18XFx7fFxcfXxcXDp8XFwufCwvZ1xuXHRcdH1cblx0fSxcblxuXHQvLyBUaGUgcmVzdCBjYW4gYmUgcGFyc2VkIGFzIEhUTUxcblx0J290aGVyJzoge1xuXHRcdHBhdHRlcm46IC9bXFxzXFxTXSovLFxuXHRcdGluc2lkZTogUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cFxuXHR9XG59O1xuXG5QcmlzbS5sYW5ndWFnZXMuY3NoYXJwID0gUHJpc20ubGFuZ3VhZ2VzLmV4dGVuZCgnY2xpa2UnLCB7XG5cdCdrZXl3b3JkJzogL1xcYihhYnN0cmFjdHxhc3xiYXNlfGJvb2x8YnJlYWt8Ynl0ZXxjYXNlfGNhdGNofGNoYXJ8Y2hlY2tlZHxjbGFzc3xjb25zdHxjb250aW51ZXxkZWNpbWFsfGRlZmF1bHR8ZGVsZWdhdGV8ZG98ZG91YmxlfGVsc2V8ZW51bXxldmVudHxleHBsaWNpdHxleHRlcm58ZmFsc2V8ZmluYWxseXxmaXhlZHxmbG9hdHxmb3J8Zm9yZWFjaHxnb3RvfGlmfGltcGxpY2l0fGlufGludHxpbnRlcmZhY2V8aW50ZXJuYWx8aXN8bG9ja3xsb25nfG5hbWVzcGFjZXxuZXd8bnVsbHxvYmplY3R8b3BlcmF0b3J8b3V0fG92ZXJyaWRlfHBhcmFtc3xwcml2YXRlfHByb3RlY3RlZHxwdWJsaWN8cmVhZG9ubHl8cmVmfHJldHVybnxzYnl0ZXxzZWFsZWR8c2hvcnR8c2l6ZW9mfHN0YWNrYWxsb2N8c3RhdGljfHN0cmluZ3xzdHJ1Y3R8c3dpdGNofHRoaXN8dGhyb3d8dHJ1ZXx0cnl8dHlwZW9mfHVpbnR8dWxvbmd8dW5jaGVja2VkfHVuc2FmZXx1c2hvcnR8dXNpbmd8dmlydHVhbHx2b2lkfHZvbGF0aWxlfHdoaWxlfGFkZHxhbGlhc3xhc2NlbmRpbmd8YXN5bmN8YXdhaXR8ZGVzY2VuZGluZ3xkeW5hbWljfGZyb218Z2V0fGdsb2JhbHxncm91cHxpbnRvfGpvaW58bGV0fG9yZGVyYnl8cGFydGlhbHxyZW1vdmV8c2VsZWN0fHNldHx2YWx1ZXx2YXJ8d2hlcmV8eWllbGQpXFxiL2csXG5cdCdzdHJpbmcnOiAvQD8oXCJ8JykoXFxcXD8uKSo/XFwxL2csXG5cdCdwcmVwcm9jZXNzb3InOiAvXlxccyojLiovZ20sXG5cdCdudW1iZXInOiAvXFxiLT8oMHgpP1xcZCpcXC4/XFxkK1xcYi9nXG59KTtcblxuUHJpc20ubGFuZ3VhZ2VzLmluaT0ge1xyXG5cdCdjb21tZW50JzogL15cXHMqOy4qJC9nbSxcclxuXHQnaW1wb3J0YW50JzogL1xcWy4qP1xcXS9nbSxcclxuXHQnY29uc3RhbnQnOiAvXlxccypbXlxcc1xcPV0rPyg/PVsgXFx0XSpcXD0pL2dtLFxyXG5cdCdhdHRyLXZhbHVlJzoge1xyXG5cdFx0cGF0dGVybjogL1xcPS4qL2dtLCBcclxuXHRcdGluc2lkZToge1xyXG5cdFx0XHQncHVuY3R1YXRpb24nOiAvXltcXD1dL2dcclxuXHRcdH1cclxuXHR9XHJcbn07XG4vKipcbiAqIE9yaWdpbmFsIGJ5IEFhcm9uIEhhcnVuOiBodHRwOi8vYWFoYWNyZWF0aXZlLmNvbS8yMDEyLzA3LzMxL3BocC1zeW50YXgtaGlnaGxpZ2h0aW5nLXByaXNtL1xuICogTW9kaWZpZWQgYnkgTWlsZXMgSm9obnNvbjogaHR0cDovL21pbGVzai5tZVxuICpcbiAqIFN1cHBvcnRzIHRoZSBmb2xsb3dpbmc6XG4gKiBcdFx0LSBFeHRlbmRzIGNsaWtlIHN5bnRheFxuICogXHRcdC0gU3VwcG9ydCBmb3IgUEhQIDUuMysgKG5hbWVzcGFjZXMsIHRyYWl0cywgZ2VuZXJhdG9ycywgZXRjKVxuICogXHRcdC0gU21hcnRlciBjb25zdGFudCBhbmQgZnVuY3Rpb24gbWF0Y2hpbmdcbiAqXG4gKiBBZGRzIHRoZSBmb2xsb3dpbmcgbmV3IHRva2VuIGNsYXNzZXM6XG4gKiBcdFx0Y29uc3RhbnQsIGRlbGltaXRlciwgdmFyaWFibGUsIGZ1bmN0aW9uLCBwYWNrYWdlXG4gKi9cblxuUHJpc20ubGFuZ3VhZ2VzLnBocCA9IFByaXNtLmxhbmd1YWdlcy5leHRlbmQoJ2NsaWtlJywge1xuXHQna2V5d29yZCc6IC9cXGIoYW5kfG9yfHhvcnxhcnJheXxhc3xicmVha3xjYXNlfGNmdW5jdGlvbnxjbGFzc3xjb25zdHxjb250aW51ZXxkZWNsYXJlfGRlZmF1bHR8ZGllfGRvfGVsc2V8ZWxzZWlmfGVuZGRlY2xhcmV8ZW5kZm9yfGVuZGZvcmVhY2h8ZW5kaWZ8ZW5kc3dpdGNofGVuZHdoaWxlfGV4dGVuZHN8Zm9yfGZvcmVhY2h8ZnVuY3Rpb258aW5jbHVkZXxpbmNsdWRlX29uY2V8Z2xvYmFsfGlmfG5ld3xyZXR1cm58c3RhdGljfHN3aXRjaHx1c2V8cmVxdWlyZXxyZXF1aXJlX29uY2V8dmFyfHdoaWxlfGFic3RyYWN0fGludGVyZmFjZXxwdWJsaWN8aW1wbGVtZW50c3xwcml2YXRlfHByb3RlY3RlZHxwYXJlbnR8dGhyb3d8bnVsbHxlY2hvfHByaW50fHRyYWl0fG5hbWVzcGFjZXxmaW5hbHx5aWVsZHxnb3RvfGluc3RhbmNlb2Z8ZmluYWxseXx0cnl8Y2F0Y2gpXFxiL2lnLFxuXHQnY29uc3RhbnQnOiAvXFxiW0EtWjAtOV9dezIsfVxcYi9nLFxuXHQnY29tbWVudCc6IHtcblx0XHRwYXR0ZXJuOiAvKF58W15cXFxcXSkoXFwvXFwqW1xcd1xcV10qP1xcKlxcL3woXnxbXjpdKShcXC9cXC98IykuKj8oXFxyP1xcbnwkKSkvZyxcblx0XHRsb29rYmVoaW5kOiB0cnVlXG5cdH1cbn0pO1xuXG5QcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKCdwaHAnLCAna2V5d29yZCcsIHtcblx0J2RlbGltaXRlcic6IC8oXFw/Pnw8XFw/cGhwfDxcXD8pL2lnLFxuXHQndmFyaWFibGUnOiAvKFxcJFxcdyspXFxiL2lnLFxuXHQncGFja2FnZSc6IHtcblx0XHRwYXR0ZXJuOiAvKFxcXFx8bmFtZXNwYWNlXFxzK3x1c2VcXHMrKVtcXHdcXFxcXSsvZyxcblx0XHRsb29rYmVoaW5kOiB0cnVlLFxuXHRcdGluc2lkZToge1xuXHRcdFx0cHVuY3R1YXRpb246IC9cXFxcL1xuXHRcdH1cblx0fVxufSk7XG5cbi8vIE11c3QgYmUgZGVmaW5lZCBhZnRlciB0aGUgZnVuY3Rpb24gcGF0dGVyblxuUHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZSgncGhwJywgJ29wZXJhdG9yJywge1xuXHQncHJvcGVydHknOiB7XG5cdFx0cGF0dGVybjogLygtPilbXFx3XSsvZyxcblx0XHRsb29rYmVoaW5kOiB0cnVlXG5cdH1cbn0pO1xuXG4vLyBBZGQgSFRNTCBzdXBwb3J0IG9mIHRoZSBtYXJrdXAgbGFuZ3VhZ2UgZXhpc3RzXG5pZiAoUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cCkge1xuXG5cdC8vIFRva2VuaXplIGFsbCBpbmxpbmUgUEhQIGJsb2NrcyB0aGF0IGFyZSB3cmFwcGVkIGluIDw/cGhwID8+XG5cdC8vIFRoaXMgYWxsb3dzIGZvciBlYXN5IFBIUCArIG1hcmt1cCBoaWdobGlnaHRpbmdcblx0UHJpc20uaG9va3MuYWRkKCdiZWZvcmUtaGlnaGxpZ2h0JywgZnVuY3Rpb24oZW52KSB7XG5cdFx0aWYgKGVudi5sYW5ndWFnZSAhPT0gJ3BocCcpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRlbnYudG9rZW5TdGFjayA9IFtdO1xuXG5cdFx0ZW52LmJhY2t1cENvZGUgPSBlbnYuY29kZTtcblx0XHRlbnYuY29kZSA9IGVudi5jb2RlLnJlcGxhY2UoLyg/OjxcXD9waHB8PFxcPylbXFx3XFxXXSo/KD86XFw/PikvaWcsIGZ1bmN0aW9uKG1hdGNoKSB7XG5cdFx0XHRlbnYudG9rZW5TdGFjay5wdXNoKG1hdGNoKTtcblxuXHRcdFx0cmV0dXJuICd7e3tQSFAnICsgZW52LnRva2VuU3RhY2subGVuZ3RoICsgJ319fSc7XG5cdFx0fSk7XG5cdH0pO1xuXG5cdC8vIFJlc3RvcmUgZW52LmNvZGUgZm9yIG90aGVyIHBsdWdpbnMgKGUuZy4gbGluZS1udW1iZXJzKVxuXHRQcmlzbS5ob29rcy5hZGQoJ2JlZm9yZS1pbnNlcnQnLCBmdW5jdGlvbihlbnYpIHtcblx0XHRpZiAoZW52Lmxhbmd1YWdlID09PSAncGhwJykge1xuXHRcdFx0ZW52LmNvZGUgPSBlbnYuYmFja3VwQ29kZTtcblx0XHRcdGRlbGV0ZSBlbnYuYmFja3VwQ29kZTtcblx0XHR9XG5cdH0pO1xuXG5cdC8vIFJlLWluc2VydCB0aGUgdG9rZW5zIGFmdGVyIGhpZ2hsaWdodGluZ1xuXHRQcmlzbS5ob29rcy5hZGQoJ2FmdGVyLWhpZ2hsaWdodCcsIGZ1bmN0aW9uKGVudikge1xuXHRcdGlmIChlbnYubGFuZ3VhZ2UgIT09ICdwaHAnKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Zm9yICh2YXIgaSA9IDAsIHQ7IHQgPSBlbnYudG9rZW5TdGFja1tpXTsgaSsrKSB7XG5cdFx0XHRlbnYuaGlnaGxpZ2h0ZWRDb2RlID0gZW52LmhpZ2hsaWdodGVkQ29kZS5yZXBsYWNlKCd7e3tQSFAnICsgKGkgKyAxKSArICd9fX0nLCBQcmlzbS5oaWdobGlnaHQodCwgZW52LmdyYW1tYXIsICdwaHAnKSk7XG5cdFx0fVxuXG5cdFx0ZW52LmVsZW1lbnQuaW5uZXJIVE1MID0gZW52LmhpZ2hsaWdodGVkQ29kZTtcblx0fSk7XG5cblx0Ly8gV3JhcCB0b2tlbnMgaW4gY2xhc3NlcyB0aGF0IGFyZSBtaXNzaW5nIHRoZW1cblx0UHJpc20uaG9va3MuYWRkKCd3cmFwJywgZnVuY3Rpb24oZW52KSB7XG5cdFx0aWYgKGVudi5sYW5ndWFnZSA9PT0gJ3BocCcgJiYgZW52LnR5cGUgPT09ICdtYXJrdXAnKSB7XG5cdFx0XHRlbnYuY29udGVudCA9IGVudi5jb250ZW50LnJlcGxhY2UoLyhcXHtcXHtcXHtQSFBbMC05XStcXH1cXH1cXH0pL2csIFwiPHNwYW4gY2xhc3M9XFxcInRva2VuIHBocFxcXCI+JDE8L3NwYW4+XCIpO1xuXHRcdH1cblx0fSk7XG5cblx0Ly8gQWRkIHRoZSBydWxlcyBiZWZvcmUgYWxsIG90aGVyc1xuXHRQcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKCdwaHAnLCAnY29tbWVudCcsIHtcblx0XHQnbWFya3VwJzoge1xuXHRcdFx0cGF0dGVybjogLzxbXj9dXFwvPyguKj8pPi9nLFxuXHRcdFx0aW5zaWRlOiBQcmlzbS5sYW5ndWFnZXMubWFya3VwXG5cdFx0fSxcblx0XHQncGhwJzogL1xce1xce1xce1BIUFswLTldK1xcfVxcfVxcfS9nXG5cdH0pO1xufVxuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xuXG4vKipcbiAqIEFuaW1hdGlvbiBoZWxwZXIuXG4gKi9cbnZhciBBbmltYXRvciA9IGZ1bmN0aW9uKGR1cmF0aW9uKSB7XG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzKTtcbiAgICB0aGlzLmR1cmF0aW9uID0gZHVyYXRpb247XG4gICAgdGhpcy5fc3RhcnQgPSBEYXRlLm5vdygpO1xufTtcbnV0aWxzLmluaGVyaXQoQW5pbWF0b3IsIHV0aWxzLlBvc3RlckNsYXNzKTtcblxuLyoqXG4gKiBHZXQgdGhlIHRpbWUgaW4gdGhlIGFuaW1hdGlvblxuICogQHJldHVybiB7ZmxvYXR9IGJldHdlZW4gMCBhbmQgMVxuICovXG5BbmltYXRvci5wcm90b3R5cGUudGltZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBlbGFwc2VkID0gRGF0ZS5ub3coKSAtIHRoaXMuX3N0YXJ0O1xuICAgIHJldHVybiAoZWxhcHNlZCAlIHRoaXMuZHVyYXRpb24pIC8gdGhpcy5kdXJhdGlvbjtcbn07XG5cbi8qKlxuICogUmVzZXQgdGhlIGFuaW1hdGlvbiBwcm9ncmVzcyB0byAwLlxuICovXG5BbmltYXRvci5wcm90b3R5cGUucmVzZXQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9zdGFydCA9IERhdGUubm93KCk7XG59O1xuXG5leHBvcnRzLkFuaW1hdG9yID0gQW5pbWF0b3I7IiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcbnZhciBjb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZy5qcycpO1xuY29uZmlnID0gY29uZmlnLmNvbmZpZztcblxuLyoqXG4gKiBIVE1MIGNhbnZhcyB3aXRoIGRyYXdpbmcgY29udmluaWVuY2UgZnVuY3Rpb25zLlxuICovXG52YXIgQ2FudmFzID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fcmVuZGVyZWRfcmVnaW9uID0gW251bGwsIG51bGwsIG51bGwsIG51bGxdOyAvLyB4MSx5MSx4Mix5MlxuXG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzKTtcbiAgICB0aGlzLl9sYXlvdXQoKTtcbiAgICB0aGlzLl9pbml0X3Byb3BlcnRpZXMoKTtcbiAgICB0aGlzLl9sYXN0X3NldF9vcHRpb25zID0ge307XG5cbiAgICB0aGlzLl90ZXh0X3NpemVfY2FjaGUgPSB7fTtcbiAgICB0aGlzLl90ZXh0X3NpemVfYXJyYXkgPSBbXTtcbiAgICB0aGlzLl90ZXh0X3NpemVfY2FjaGVfc2l6ZSA9IDEwMDA7XG5cbiAgICAvLyBTZXQgZGVmYXVsdCBzaXplLlxuICAgIHRoaXMud2lkdGggPSA0MDA7XG4gICAgdGhpcy5oZWlnaHQgPSAzMDA7XG59O1xudXRpbHMuaW5oZXJpdChDYW52YXMsIHV0aWxzLlBvc3RlckNsYXNzKTtcblxuLyoqXG4gKiBMYXlvdXQgdGhlIGVsZW1lbnRzIGZvciB0aGUgY2FudmFzLlxuICogQ3JlYXRlcyBgdGhpcy5lbGBcbiAqIFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5fbGF5b3V0ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgdGhpcy5fY2FudmFzLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAncG9zdGVyIGhpZGRlbi1jYW52YXMnKTtcbiAgICB0aGlzLmNvbnRleHQgPSB0aGlzLl9jYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICAgICAgXG4gICAgLy8gU3RyZXRjaCB0aGUgaW1hZ2UgZm9yIHJldGluYSBzdXBwb3J0LlxuICAgIHRoaXMuc2NhbGUoMiwyKTtcbn07XG5cbi8qKlxuICogTWFrZSB0aGUgcHJvcGVydGllcyBvZiB0aGUgY2xhc3MuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DYW52YXMucHJvdG90eXBlLl9pbml0X3Byb3BlcnRpZXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBIZWlnaHQgb2YgdGhlIGNhbnZhc1xuICAgICAqIEByZXR1cm4ge2Zsb2F0fVxuICAgICAqL1xuICAgIHRoaXMucHJvcGVydHkoJ2hlaWdodCcsIGZ1bmN0aW9uKCkgeyBcbiAgICAgICAgcmV0dXJuIHRoYXQuX2NhbnZhcy5oZWlnaHQgLyAyOyBcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Ll9jYW52YXMuc2V0QXR0cmlidXRlKCdoZWlnaHQnLCB2YWx1ZSAqIDIpO1xuICAgICAgICBcbiAgICAgICAgLy8gU3RyZXRjaCB0aGUgaW1hZ2UgZm9yIHJldGluYSBzdXBwb3J0LlxuICAgICAgICB0aGlzLnNjYWxlKDIsMik7XG4gICAgICAgIHRoaXMuX3RvdWNoKCk7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBXaWR0aCBvZiB0aGUgY2FudmFzXG4gICAgICogQHJldHVybiB7ZmxvYXR9XG4gICAgICovXG4gICAgdGhpcy5wcm9wZXJ0eSgnd2lkdGgnLCBmdW5jdGlvbigpIHsgXG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMud2lkdGggLyAyOyBcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Ll9jYW52YXMuc2V0QXR0cmlidXRlKCd3aWR0aCcsIHZhbHVlICogMik7XG4gICAgICAgIFxuICAgICAgICAvLyBTdHJldGNoIHRoZSBpbWFnZSBmb3IgcmV0aW5hIHN1cHBvcnQuXG4gICAgICAgIHRoaXMuc2NhbGUoMiwyKTtcbiAgICAgICAgdGhpcy5fdG91Y2goKTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIFJlZ2lvbiBvZiB0aGUgY2FudmFzIHRoYXQgaGFzIGJlZW4gcmVuZGVyZWQgdG9cbiAgICAgKiBAcmV0dXJuIHtkaWN0aW9uYXJ5fSBkaWN0aW9uYXJ5IGRlc2NyaWJpbmcgYSByZWN0YW5nbGUge3gseSx3aWR0aCxoZWlnaHR9XG4gICAgICovXG4gICAgdGhpcy5wcm9wZXJ0eSgncmVuZGVyZWRfcmVnaW9uJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB4OiB0aGlzLl90eCh0aGlzLl9yZW5kZXJlZF9yZWdpb25bMF0sIHRydWUpLFxuICAgICAgICAgICAgeTogdGhpcy5fdHkodGhpcy5fcmVuZGVyZWRfcmVnaW9uWzFdLCB0cnVlKSxcbiAgICAgICAgICAgIHdpZHRoOiB0aGlzLl9yZW5kZXJlZF9yZWdpb25bMl0gLSB0aGlzLl9yZW5kZXJlZF9yZWdpb25bMF0sXG4gICAgICAgICAgICBoZWlnaHQ6IHRoaXMuX3JlbmRlcmVkX3JlZ2lvblszXSAtIHRoaXMuX3JlbmRlcmVkX3JlZ2lvblsxXSxcbiAgICAgICAgfTtcbiAgICB9KTtcbn07XG5cbi8qKlxuICogRXJhc2VzIHRoZSBjYWNoZWQgcmVuZGVyaW5nIG9wdGlvbnMuXG4gKiBcbiAqIFRoaXMgc2hvdWxkIGJlIGNhbGxlZCBpZiBhIGZvbnQgaXMgbm90IHJlbmRlcmluZyBwcm9wZXJseS4gIEEgZm9udCBtYXkgbm90XG4gKiByZW5kZXIgcHJvcGVybHkgaWYgaXQgd2FzIHdhcyB1c2VkIHdpdGhpbiBQb3N0ZXIgYmVmb3JlIGl0IHdhcyBsb2FkZWQgYnkgdGhlXG4gKiBicm93c2VyLiBpLmUuIElmIGZvbnQgJ0ZvbnRBJyBpcyB1c2VkIHdpdGhpbiBQb3N0ZXIsIGJ1dCBoYXNuJ3QgYmVlbiBsb2FkZWRcbiAqIHlldCBieSB0aGUgYnJvd3NlciwgUG9zdGVyIHdpbGwgdXNlIGEgdGVtcG9yYXJ5IGZvbnQgaW5zdGVhZCBvZiAnRm9udEEnLlxuICogQmVjYXVzZSBQb3N0ZXIgaXMgdW5hd2FyZSBvZiB3aGVuIGZvbnRzIGFyZSBsb2FkZWQgKFRPRE8gYXR0ZW1wdCB0byBmaXggdGhpcylcbiAqIGJ5IHRoZSBicm93c2VyLCBvbmNlICdGb250QScgaXMgYWN0dWFsbHkgbG9hZGVkLCB0aGUgdGVtcG9yYXJ5IGZvbnQgd2lsbFxuICogY29udGludWUgdG8gYmUgdXNlZC4gIENsZWFyaW5nIHRoZSBjYWNoZSBtYWtlcyBQb3N0ZXIgYXR0ZW1wdCB0byByZWxvYWQgdGhhdFxuICogZm9udC5cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5lcmFzZV9vcHRpb25zX2NhY2hlID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fbGFzdF9zZXRfb3B0aW9ucyA9IHt9O1xufTtcblxuLyoqXG4gKiBEcmF3cyBhIHJlY3RhbmdsZVxuICogQHBhcmFtICB7ZmxvYXR9IHhcbiAqIEBwYXJhbSAge2Zsb2F0fSB5XG4gKiBAcGFyYW0gIHtmbG9hdH0gd2lkdGhcbiAqIEBwYXJhbSAge2Zsb2F0fSBoZWlnaHRcbiAqIEBwYXJhbSAge2RpY3Rpb25hcnl9IG9wdGlvbnMsIHNlZSBfYXBwbHlfb3B0aW9ucygpIGZvciBkZXRhaWxzXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DYW52YXMucHJvdG90eXBlLmRyYXdfcmVjdGFuZ2xlID0gZnVuY3Rpb24oeCwgeSwgd2lkdGgsIGhlaWdodCwgb3B0aW9ucykge1xuICAgIHggPSB0aGlzLl90eCh4KTtcbiAgICB5ID0gdGhpcy5fdHkoeSk7XG4gICAgdGhpcy5jb250ZXh0LmJlZ2luUGF0aCgpO1xuICAgIHRoaXMuY29udGV4dC5yZWN0KHgsIHksIHdpZHRoLCBoZWlnaHQpO1xuICAgIHRoaXMuX2RvX2RyYXcob3B0aW9ucyk7XG4gICAgdGhpcy5fdG91Y2goeCwgeSwgeCt3aWR0aCwgeStoZWlnaHQpO1xufTtcblxuLyoqXG4gKiBEcmF3cyBhIGNpcmNsZVxuICogQHBhcmFtICB7ZmxvYXR9IHhcbiAqIEBwYXJhbSAge2Zsb2F0fSB5XG4gKiBAcGFyYW0gIHtmbG9hdH0gclxuICogQHBhcmFtICB7ZGljdGlvbmFyeX0gb3B0aW9ucywgc2VlIF9hcHBseV9vcHRpb25zKCkgZm9yIGRldGFpbHNcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuZHJhd19jaXJjbGUgPSBmdW5jdGlvbih4LCB5LCByLCBvcHRpb25zKSB7XG4gICAgeCA9IHRoaXMuX3R4KHgpO1xuICAgIHkgPSB0aGlzLl90eSh5KTtcbiAgICB0aGlzLmNvbnRleHQuYmVnaW5QYXRoKCk7XG4gICAgdGhpcy5jb250ZXh0LmFyYyh4LCB5LCByLCAwLCAyICogTWF0aC5QSSk7XG4gICAgdGhpcy5fZG9fZHJhdyhvcHRpb25zKTtcbiAgICB0aGlzLl90b3VjaCh4LXIsIHktciwgeCtyLCB5K3IpO1xufTtcblxuLyoqXG4gKiBEcmF3cyBhbiBpbWFnZVxuICogQHBhcmFtICB7aW1nIGVsZW1lbnR9IGltZ1xuICogQHBhcmFtICB7ZmxvYXR9IHhcbiAqIEBwYXJhbSAge2Zsb2F0fSB5XG4gKiBAcGFyYW0gIHtmbG9hdH0gKG9wdGlvbmFsKSB3aWR0aFxuICogQHBhcmFtICB7ZmxvYXR9IChvcHRpb25hbCkgaGVpZ2h0XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DYW52YXMucHJvdG90eXBlLmRyYXdfaW1hZ2UgPSBmdW5jdGlvbihpbWcsIHgsIHksIHdpZHRoLCBoZWlnaHQpIHtcbiAgICB4ID0gdGhpcy5fdHgoeCk7XG4gICAgeSA9IHRoaXMuX3R5KHkpO1xuICAgIHdpZHRoID0gd2lkdGggfHwgaW1nLndpZHRoO1xuICAgIGhlaWdodCA9IGhlaWdodCB8fCBpbWcuaGVpZ2h0O1xuICAgIGltZyA9IGltZy5fY2FudmFzID8gaW1nLl9jYW52YXMgOiBpbWc7XG4gICAgdGhpcy5jb250ZXh0LmRyYXdJbWFnZShpbWcsIHgsIHksIHdpZHRoLCBoZWlnaHQpO1xuICAgIHRoaXMuX3RvdWNoKHgsIHksIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KTtcbn07XG5cbi8qKlxuICogRHJhd3MgYSBsaW5lXG4gKiBAcGFyYW0gIHtmbG9hdH0geDFcbiAqIEBwYXJhbSAge2Zsb2F0fSB5MVxuICogQHBhcmFtICB7ZmxvYXR9IHgyXG4gKiBAcGFyYW0gIHtmbG9hdH0geTJcbiAqIEBwYXJhbSAge2RpY3Rpb25hcnl9IG9wdGlvbnMsIHNlZSBfYXBwbHlfb3B0aW9ucygpIGZvciBkZXRhaWxzXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DYW52YXMucHJvdG90eXBlLmRyYXdfbGluZSA9IGZ1bmN0aW9uKHgxLCB5MSwgeDIsIHkyLCBvcHRpb25zKSB7XG4gICAgeDEgPSB0aGlzLl90eCh4MSk7XG4gICAgeTEgPSB0aGlzLl90eSh5MSk7XG4gICAgeDIgPSB0aGlzLl90eCh4Mik7XG4gICAgeTIgPSB0aGlzLl90eSh5Mik7XG4gICAgdGhpcy5jb250ZXh0LmJlZ2luUGF0aCgpO1xuICAgIHRoaXMuY29udGV4dC5tb3ZlVG8oeDEsIHkxKTtcbiAgICB0aGlzLmNvbnRleHQubGluZVRvKHgyLCB5Mik7XG4gICAgdGhpcy5fZG9fZHJhdyhvcHRpb25zKTtcbiAgICB0aGlzLl90b3VjaCh4MSwgeTEsIHgyLCB5Mik7XG59O1xuXG4vKipcbiAqIERyYXdzIGEgcG9seSBsaW5lXG4gKiBAcGFyYW0gIHthcnJheX0gcG9pbnRzIC0gYXJyYXkgb2YgcG9pbnRzLiAgRWFjaCBwb2ludCBpc1xuICogICAgICAgICAgICAgICAgICAgICAgICAgIGFuIGFycmF5IGl0c2VsZiwgb2YgdGhlIGZvcm0gW3gsIHldIFxuICogICAgICAgICAgICAgICAgICAgICAgICAgIHdoZXJlIHggYW5kIHkgYXJlIGZsb2F0aW5nIHBvaW50XG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWVzLlxuICogQHBhcmFtICB7ZGljdGlvbmFyeX0gb3B0aW9ucywgc2VlIF9hcHBseV9vcHRpb25zKCkgZm9yIGRldGFpbHNcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuZHJhd19wb2x5bGluZSA9IGZ1bmN0aW9uKHBvaW50cywgb3B0aW9ucykge1xuICAgIGlmIChwb2ludHMubGVuZ3RoIDwgMikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1BvbHkgbGluZSBtdXN0IGhhdmUgYXRsZWFzdCB0d28gcG9pbnRzLicpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuY29udGV4dC5iZWdpblBhdGgoKTtcbiAgICAgICAgdmFyIHBvaW50ID0gcG9pbnRzWzBdO1xuICAgICAgICB0aGlzLmNvbnRleHQubW92ZVRvKHRoaXMuX3R4KHBvaW50WzBdKSwgdGhpcy5fdHkocG9pbnRbMV0pKTtcblxuICAgICAgICB2YXIgbWlueCA9IHRoaXMud2lkdGg7XG4gICAgICAgIHZhciBtaW55ID0gdGhpcy5oZWlnaHQ7XG4gICAgICAgIHZhciBtYXh4ID0gMDtcbiAgICAgICAgdmFyIG1heHkgPSAwO1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IHBvaW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgcG9pbnQgPSBwb2ludHNbaV07XG4gICAgICAgICAgICB0aGlzLmNvbnRleHQubGluZVRvKHRoaXMuX3R4KHBvaW50WzBdKSwgdGhpcy5fdHkocG9pbnRbMV0pKTtcblxuICAgICAgICAgICAgbWlueCA9IE1hdGgubWluKHRoaXMuX3R4KHBvaW50WzBdKSwgbWlueCk7XG4gICAgICAgICAgICBtaW55ID0gTWF0aC5taW4odGhpcy5fdHkocG9pbnRbMV0pLCBtaW55KTtcbiAgICAgICAgICAgIG1heHggPSBNYXRoLm1heCh0aGlzLl90eChwb2ludFswXSksIG1heHgpO1xuICAgICAgICAgICAgbWF4eSA9IE1hdGgubWF4KHRoaXMuX3R5KHBvaW50WzFdKSwgbWF4eSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fZG9fZHJhdyhvcHRpb25zKTsgXG4gICAgICAgIHRoaXMuX3RvdWNoKG1pbngsIG1pbnksIG1heHgsIG1heHkpOyAgIFxuICAgIH1cbn07XG5cbi8qKlxuICogRHJhd3MgYSB0ZXh0IHN0cmluZ1xuICogQHBhcmFtICB7ZmxvYXR9IHhcbiAqIEBwYXJhbSAge2Zsb2F0fSB5XG4gKiBAcGFyYW0gIHtzdHJpbmd9IHRleHQgc3RyaW5nIG9yIGNhbGxiYWNrIHRoYXQgcmVzb2x2ZXMgdG8gYSBzdHJpbmcuXG4gKiBAcGFyYW0gIHtkaWN0aW9uYXJ5fSBvcHRpb25zLCBzZWUgX2FwcGx5X29wdGlvbnMoKSBmb3IgZGV0YWlsc1xuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5kcmF3X3RleHQgPSBmdW5jdGlvbih4LCB5LCB0ZXh0LCBvcHRpb25zKSB7XG4gICAgeCA9IHRoaXMuX3R4KHgpO1xuICAgIHkgPSB0aGlzLl90eSh5KTtcbiAgICB0ZXh0ID0gdGhpcy5fcHJvY2Vzc190YWJzKHRleHQpO1xuICAgIG9wdGlvbnMgPSB0aGlzLl9hcHBseV9vcHRpb25zKG9wdGlvbnMpO1xuICAgIC8vICdmaWxsJyB0aGUgdGV4dCBieSBkZWZhdWx0IHdoZW4gbmVpdGhlciBhIHN0cm9rZSBvciBmaWxsIFxuICAgIC8vIGlzIGRlZmluZWQuICBPdGhlcndpc2Ugb25seSBmaWxsIGlmIGEgZmlsbCBpcyBkZWZpbmVkLlxuICAgIGlmIChvcHRpb25zLmZpbGwgfHwgIW9wdGlvbnMuc3Ryb2tlKSB7XG4gICAgICAgIHRoaXMuY29udGV4dC5maWxsVGV4dCh0ZXh0LCB4LCB5KTtcbiAgICB9XG4gICAgLy8gT25seSBzdHJva2UgaWYgYSBzdHJva2UgaXMgZGVmaW5lZC5cbiAgICBpZiAob3B0aW9ucy5zdHJva2UpIHtcbiAgICAgICAgdGhpcy5jb250ZXh0LnN0cm9rZVRleHQodGV4dCwgeCwgeSk7ICAgICAgIFxuICAgIH1cbiAgICB0aGlzLl90b3VjaCh4LCB5LCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCk7XG59O1xuXG4vKipcbiAqIEdldCdzIGEgY2h1bmsgb2YgdGhlIGNhbnZhcyBhcyBhIHJhdyBpbWFnZS5cbiAqIEBwYXJhbSAge2Zsb2F0fSAob3B0aW9uYWwpIHhcbiAqIEBwYXJhbSAge2Zsb2F0fSAob3B0aW9uYWwpIHlcbiAqIEBwYXJhbSAge2Zsb2F0fSAob3B0aW9uYWwpIHdpZHRoXG4gKiBAcGFyYW0gIHtmbG9hdH0gKG9wdGlvbmFsKSBoZWlnaHRcbiAqIEByZXR1cm4ge2ltYWdlfSBjYW52YXMgaW1hZ2UgZGF0YVxuICovXG5DYW52YXMucHJvdG90eXBlLmdldF9yYXdfaW1hZ2UgPSBmdW5jdGlvbih4LCB5LCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgY29uc29sZS53YXJuKCdnZXRfcmF3X2ltYWdlIGltYWdlIGlzIHNsb3csIHVzZSBjYW52YXMgcmVmZXJlbmNlcyBpbnN0ZWFkIHdpdGggZHJhd19pbWFnZScpO1xuICAgIGlmICh4PT09dW5kZWZpbmVkKSB7XG4gICAgICAgIHggPSAwO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHggPSB0aGlzLl90eCh4KTtcbiAgICB9XG4gICAgaWYgKHk9PT11bmRlZmluZWQpIHtcbiAgICAgICAgeSA9IDA7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgeSA9IHRoaXMuX3R5KHkpO1xuICAgIH1cbiAgICBpZiAod2lkdGggPT09IHVuZGVmaW5lZCkgd2lkdGggPSB0aGlzLndpZHRoO1xuICAgIGlmIChoZWlnaHQgPT09IHVuZGVmaW5lZCkgaGVpZ2h0ID0gdGhpcy5oZWlnaHQ7XG5cbiAgICAvLyBNdWx0aXBseSBieSB0d28gZm9yIHBpeGVsIGRvdWJsaW5nLlxuICAgIHggPSAyICogeDtcbiAgICB5ID0gMiAqIHk7XG4gICAgd2lkdGggPSAyICogd2lkdGg7XG4gICAgaGVpZ2h0ID0gMiAqIGhlaWdodDtcbiAgICBcbiAgICAvLyBVcGRhdGUgdGhlIGNhY2hlZCBpbWFnZSBpZiBpdCdzIG5vdCB0aGUgcmVxdWVzdGVkIG9uZS5cbiAgICB2YXIgcmVnaW9uID0gW3gsIHksIHdpZHRoLCBoZWlnaHRdO1xuICAgIGlmICghKHRoaXMuX2NhY2hlZF90aW1lc3RhbXAgPT09IHRoaXMuX21vZGlmaWVkICYmIHV0aWxzLmNvbXBhcmVfYXJyYXlzKHJlZ2lvbiwgdGhpcy5fY2FjaGVkX3JlZ2lvbikpKSB7XG4gICAgICAgIHRoaXMuX2NhY2hlZF9pbWFnZSA9IHRoaXMuY29udGV4dC5nZXRJbWFnZURhdGEoeCwgeSwgd2lkdGgsIGhlaWdodCk7XG4gICAgICAgIHRoaXMuX2NhY2hlZF90aW1lc3RhbXAgPSB0aGlzLl9tb2RpZmllZDtcbiAgICAgICAgdGhpcy5fY2FjaGVkX3JlZ2lvbiA9IHJlZ2lvbjtcbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gdGhlIGNhY2hlZCBpbWFnZS5cbiAgICByZXR1cm4gdGhpcy5fY2FjaGVkX2ltYWdlO1xufTtcblxuLyoqXG4gKiBQdXQncyBhIHJhdyBpbWFnZSBvbiB0aGUgY2FudmFzIHNvbWV3aGVyZS5cbiAqIEBwYXJhbSAge2Zsb2F0fSB4XG4gKiBAcGFyYW0gIHtmbG9hdH0geVxuICogQHJldHVybiB7aW1hZ2V9IGNhbnZhcyBpbWFnZSBkYXRhXG4gKi9cbkNhbnZhcy5wcm90b3R5cGUucHV0X3Jhd19pbWFnZSA9IGZ1bmN0aW9uKGltZywgeCwgeSkge1xuICAgIGNvbnNvbGUud2FybigncHV0X3Jhd19pbWFnZSBpbWFnZSBpcyBzbG93LCB1c2UgZHJhd19pbWFnZSBpbnN0ZWFkJyk7XG4gICAgeCA9IHRoaXMuX3R4KHgpO1xuICAgIHkgPSB0aGlzLl90eSh5KTtcbiAgICAvLyBNdWx0aXBseSBieSB0d28gZm9yIHBpeGVsIGRvdWJsaW5nLlxuICAgIHJldCA9IHRoaXMuY29udGV4dC5wdXRJbWFnZURhdGEoaW1nLCB4KjIsIHkqMik7XG4gICAgdGhpcy5fdG91Y2goeCwgeSwgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQpO1xuICAgIHJldHVybiByZXQ7XG59O1xuXG4vKipcbiAqIE1lYXN1cmVzIHRoZSB3aWR0aCBvZiBhIHRleHQgc3RyaW5nLlxuICogQHBhcmFtICB7c3RyaW5nfSB0ZXh0XG4gKiBAcGFyYW0gIHtkaWN0aW9uYXJ5fSBvcHRpb25zLCBzZWUgX2FwcGx5X29wdGlvbnMoKSBmb3IgZGV0YWlsc1xuICogQHJldHVybiB7ZmxvYXR9IHdpZHRoXG4gKi9cbkNhbnZhcy5wcm90b3R5cGUubWVhc3VyZV90ZXh0ID0gZnVuY3Rpb24odGV4dCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSB0aGlzLl9hcHBseV9vcHRpb25zKG9wdGlvbnMpO1xuICAgIHRleHQgPSB0aGlzLl9wcm9jZXNzX3RhYnModGV4dCk7XG5cbiAgICAvLyBDYWNoZSB0aGUgc2l6ZSBpZiBpdCdzIG5vdCBhbHJlYWR5IGNhY2hlZC5cbiAgICBpZiAodGhpcy5fdGV4dF9zaXplX2NhY2hlW3RleHRdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5fdGV4dF9zaXplX2NhY2hlW3RleHRdID0gdGhpcy5jb250ZXh0Lm1lYXN1cmVUZXh0KHRleHQpLndpZHRoO1xuICAgICAgICB0aGlzLl90ZXh0X3NpemVfYXJyYXkucHVzaCh0ZXh0KTtcblxuICAgICAgICAvLyBSZW1vdmUgdGhlIG9sZGVzdCBpdGVtIGluIHRoZSBhcnJheSBpZiB0aGUgY2FjaGUgaXMgdG9vIGxhcmdlLlxuICAgICAgICB3aGlsZSAodGhpcy5fdGV4dF9zaXplX2FycmF5Lmxlbmd0aCA+IHRoaXMuX3RleHRfc2l6ZV9jYWNoZV9zaXplKSB7XG4gICAgICAgICAgICB2YXIgb2xkZXN0ID0gdGhpcy5fdGV4dF9zaXplX2FycmF5LnNoaWZ0KCk7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fdGV4dF9zaXplX2NhY2hlW29sZGVzdF07XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLy8gVXNlIHRoZSBjYWNoZWQgc2l6ZS5cbiAgICByZXR1cm4gdGhpcy5fdGV4dF9zaXplX2NhY2hlW3RleHRdO1xufTtcblxuLyoqXG4gKiBDcmVhdGUgYSBsaW5lYXIgZ3JhZGllbnRcbiAqIEBwYXJhbSAge2Zsb2F0fSB4MVxuICogQHBhcmFtICB7ZmxvYXR9IHkxXG4gKiBAcGFyYW0gIHtmbG9hdH0geDJcbiAqIEBwYXJhbSAge2Zsb2F0fSB5MlxuICogQHBhcmFtICB7YXJyYXl9IGNvbG9yX3N0b3BzIC0gYXJyYXkgb2YgW2Zsb2F0LCBjb2xvcl0gcGFpcnNcbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5ncmFkaWVudCA9IGZ1bmN0aW9uKHgxLCB5MSwgeDIsIHkyLCBjb2xvcl9zdG9wcykge1xuICAgIHZhciBncmFkaWVudCA9IHRoaXMuY29udGV4dC5jcmVhdGVMaW5lYXJHcmFkaWVudCh4MSwgeTEsIHgyLCB5Mik7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb2xvcl9zdG9wcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBncmFkaWVudC5hZGRDb2xvclN0b3AoY29sb3Jfc3RvcHNbaV1bMF0sIGNvbG9yX3N0b3BzW2ldWzFdKTtcbiAgICB9XG4gICAgcmV0dXJuIGdyYWRpZW50O1xufTtcblxuLyoqXG4gKiBDbGVhcidzIHRoZSBjYW52YXMuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DYW52YXMucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5jb250ZXh0LmNsZWFyUmVjdCgwLCAwLCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCk7XG4gICAgdGhpcy5fdG91Y2goKTtcbn07XG5cbi8qKlxuICogU2NhbGUgdGhlIGN1cnJlbnQgZHJhd2luZy5cbiAqIEBwYXJhbSAge2Zsb2F0fSB4XG4gKiBAcGFyYW0gIHtmbG9hdH0geVxuICogQHJldHVybiB7bnVsbH0gIFxuICovXG5DYW52YXMucHJvdG90eXBlLnNjYWxlID0gZnVuY3Rpb24oeCwgeSkge1xuICAgIHRoaXMuY29udGV4dC5zY2FsZSh4LCB5KTtcbiAgICB0aGlzLl90b3VjaCgpO1xufTtcblxuLyoqXG4gKiBGaW5pc2hlcyB0aGUgZHJhd2luZyBvcGVyYXRpb24gdXNpbmcgdGhlIHNldCBvZiBwcm92aWRlZCBvcHRpb25zLlxuICogQHBhcmFtICB7ZGljdGlvbmFyeX0gKG9wdGlvbmFsKSBkaWN0aW9uYXJ5IHRoYXQgXG4gKiAgcmVzb2x2ZXMgdG8gYSBkaWN0aW9uYXJ5LlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5fZG9fZHJhdyA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gdGhpcy5fYXBwbHlfb3B0aW9ucyhvcHRpb25zKTtcblxuICAgIC8vIE9ubHkgZmlsbCBpZiBhIGZpbGwgaXMgZGVmaW5lZC5cbiAgICBpZiAob3B0aW9ucy5maWxsKSB7XG4gICAgICAgIHRoaXMuY29udGV4dC5maWxsKCk7XG4gICAgfVxuICAgIC8vIFN0cm9rZSBieSBkZWZhdWx0LCBpZiBubyBzdHJva2Ugb3IgZmlsbCBpcyBkZWZpbmVkLiAgT3RoZXJ3aXNlXG4gICAgLy8gb25seSBzdHJva2UgaWYgYSBzdHJva2UgaXMgZGVmaW5lZC5cbiAgICBpZiAob3B0aW9ucy5zdHJva2UgfHwgIW9wdGlvbnMuZmlsbCkge1xuICAgICAgICB0aGlzLmNvbnRleHQuc3Ryb2tlKCk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBBcHBsaWVzIGEgZGljdGlvbmFyeSBvZiBkcmF3aW5nIG9wdGlvbnMgdG8gdGhlIHBlbi5cbiAqIEBwYXJhbSAge2RpY3Rpb25hcnl9IG9wdGlvbnNcbiAqICAgICAgYWxwaGEge2Zsb2F0fSBPcGFjaXR5ICgwLTEpXG4gKiAgICAgIGNvbXBvc2l0ZV9vcGVyYXRpb24ge3N0cmluZ30gSG93IG5ldyBpbWFnZXMgYXJlIFxuICogICAgICAgICAgZHJhd24gb250byBhbiBleGlzdGluZyBpbWFnZS4gIFBvc3NpYmxlIHZhbHVlc1xuICogICAgICAgICAgYXJlIGBzb3VyY2Utb3ZlcmAsIGBzb3VyY2UtYXRvcGAsIGBzb3VyY2UtaW5gLCBcbiAqICAgICAgICAgIGBzb3VyY2Utb3V0YCwgYGRlc3RpbmF0aW9uLW92ZXJgLCBcbiAqICAgICAgICAgIGBkZXN0aW5hdGlvbi1hdG9wYCwgYGRlc3RpbmF0aW9uLWluYCwgXG4gKiAgICAgICAgICBgZGVzdGluYXRpb24tb3V0YCwgYGxpZ2h0ZXJgLCBgY29weWAsIG9yIGB4b3JgLlxuICogICAgICBsaW5lX2NhcCB7c3RyaW5nfSBFbmQgY2FwIHN0eWxlIGZvciBsaW5lcy5cbiAqICAgICAgICAgIFBvc3NpYmxlIHZhbHVlcyBhcmUgJ2J1dHQnLCAncm91bmQnLCBvciAnc3F1YXJlJy5cbiAqICAgICAgbGluZV9qb2luIHtzdHJpbmd9IEhvdyB0byByZW5kZXIgd2hlcmUgdHdvIGxpbmVzXG4gKiAgICAgICAgICBtZWV0LiAgUG9zc2libGUgdmFsdWVzIGFyZSAnYmV2ZWwnLCAncm91bmQnLCBvclxuICogICAgICAgICAgJ21pdGVyJy5cbiAqICAgICAgbGluZV93aWR0aCB7ZmxvYXR9IEhvdyB0aGljayBsaW5lcyBhcmUuXG4gKiAgICAgIGxpbmVfbWl0ZXJfbGltaXQge2Zsb2F0fSBNYXggbGVuZ3RoIG9mIG1pdGVycy5cbiAqICAgICAgbGluZV9jb2xvciB7c3RyaW5nfSBDb2xvciBvZiB0aGUgbGluZS5cbiAqICAgICAgZmlsbF9jb2xvciB7c3RyaW5nfSBDb2xvciB0byBmaWxsIHRoZSBzaGFwZS5cbiAqICAgICAgY29sb3Ige3N0cmluZ30gQ29sb3IgdG8gc3Ryb2tlIGFuZCBmaWxsIHRoZSBzaGFwZS5cbiAqICAgICAgICAgIExvd2VyIHByaW9yaXR5IHRvIGxpbmVfY29sb3IgYW5kIGZpbGxfY29sb3IuXG4gKiAgICAgIGZvbnRfc3R5bGUge3N0cmluZ31cbiAqICAgICAgZm9udF92YXJpYW50IHtzdHJpbmd9XG4gKiAgICAgIGZvbnRfd2VpZ2h0IHtzdHJpbmd9XG4gKiAgICAgIGZvbnRfc2l6ZSB7c3RyaW5nfVxuICogICAgICBmb250X2ZhbWlseSB7c3RyaW5nfVxuICogICAgICBmb250IHtzdHJpbmd9IE92ZXJyaWRkZXMgYWxsIG90aGVyIGZvbnQgcHJvcGVydGllcy5cbiAqICAgICAgdGV4dF9hbGlnbiB7c3RyaW5nfSBIb3Jpem9udGFsIGFsaWdubWVudCBvZiB0ZXh0LiAgXG4gKiAgICAgICAgICBQb3NzaWJsZSB2YWx1ZXMgYXJlIGBzdGFydGAsIGBlbmRgLCBgY2VudGVyYCxcbiAqICAgICAgICAgIGBsZWZ0YCwgb3IgYHJpZ2h0YC5cbiAqICAgICAgdGV4dF9iYXNlbGluZSB7c3RyaW5nfSBWZXJ0aWNhbCBhbGlnbm1lbnQgb2YgdGV4dC5cbiAqICAgICAgICAgIFBvc3NpYmxlIHZhbHVlcyBhcmUgYGFscGhhYmV0aWNgLCBgdG9wYCwgXG4gKiAgICAgICAgICBgaGFuZ2luZ2AsIGBtaWRkbGVgLCBgaWRlb2dyYXBoaWNgLCBvciBcbiAqICAgICAgICAgIGBib3R0b21gLlxuICogQHJldHVybiB7ZGljdGlvbmFyeX0gb3B0aW9ucywgcmVzb2x2ZWQuXG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuX2FwcGx5X29wdGlvbnMgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgb3B0aW9ucyA9IHV0aWxzLnJlc29sdmVfY2FsbGFibGUob3B0aW9ucyk7XG5cbiAgICAvLyBTcGVjaWFsIG9wdGlvbnMuXG4gICAgdmFyIHNldF9vcHRpb25zID0ge307XG4gICAgc2V0X29wdGlvbnMuZ2xvYmFsQWxwaGEgPSBvcHRpb25zLmFscGhhPT09dW5kZWZpbmVkID8gMS4wIDogb3B0aW9ucy5hbHBoYTtcbiAgICBzZXRfb3B0aW9ucy5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb24gPSBvcHRpb25zLmNvbXBvc2l0ZV9vcGVyYXRpb24gfHwgJ3NvdXJjZS1vdmVyJztcbiAgICBcbiAgICAvLyBMaW5lIHN0eWxlLlxuICAgIHNldF9vcHRpb25zLmxpbmVDYXAgPSBvcHRpb25zLmxpbmVfY2FwIHx8ICdidXR0JztcbiAgICBzZXRfb3B0aW9ucy5saW5lSm9pbiA9IG9wdGlvbnMubGluZV9qb2luIHx8ICdiZXZlbCc7XG4gICAgc2V0X29wdGlvbnMubGluZVdpZHRoID0gb3B0aW9ucy5saW5lX3dpZHRoPT09dW5kZWZpbmVkID8gMS4wIDogb3B0aW9ucy5saW5lX3dpZHRoO1xuICAgIHNldF9vcHRpb25zLm1pdGVyTGltaXQgPSBvcHRpb25zLmxpbmVfbWl0ZXJfbGltaXQ9PT11bmRlZmluZWQgPyAxMCA6IG9wdGlvbnMubGluZV9taXRlcl9saW1pdDtcbiAgICB0aGlzLmNvbnRleHQuc3Ryb2tlU3R5bGUgPSBvcHRpb25zLmxpbmVfY29sb3IgfHwgb3B0aW9ucy5jb2xvciB8fCAnYmxhY2snOyAvLyBUT0RPOiBTdXBwb3J0IGdyYWRpZW50XG4gICAgb3B0aW9ucy5zdHJva2UgPSAob3B0aW9ucy5saW5lX2NvbG9yICE9PSB1bmRlZmluZWQgfHwgb3B0aW9ucy5saW5lX3dpZHRoICE9PSB1bmRlZmluZWQpO1xuXG4gICAgLy8gRmlsbCBzdHlsZS5cbiAgICB0aGlzLmNvbnRleHQuZmlsbFN0eWxlID0gb3B0aW9ucy5maWxsX2NvbG9yIHx8IG9wdGlvbnMuY29sb3IgfHwgJ3JlZCc7IC8vIFRPRE86IFN1cHBvcnQgZ3JhZGllbnRcbiAgICBvcHRpb25zLmZpbGwgPSBvcHRpb25zLmZpbGxfY29sb3IgIT09IHVuZGVmaW5lZDtcblxuICAgIC8vIEZvbnQgc3R5bGUuXG4gICAgdmFyIHBpeGVscyA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgaWYgKHggIT09IHVuZGVmaW5lZCAmJiB4ICE9PSBudWxsKSB7XG4gICAgICAgICAgICBpZiAoTnVtYmVyLmlzRmluaXRlKHgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFN0cmluZyh4KSArICdweCc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB4O1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHZhciBmb250X3N0eWxlID0gb3B0aW9ucy5mb250X3N0eWxlIHx8ICcnO1xuICAgIHZhciBmb250X3ZhcmlhbnQgPSBvcHRpb25zLmZvbnRfdmFyaWFudCB8fCAnJztcbiAgICB2YXIgZm9udF93ZWlnaHQgPSBvcHRpb25zLmZvbnRfd2VpZ2h0IHx8ICcnO1xuICAgIHZhciBmb250X3NpemUgPSBwaXhlbHMob3B0aW9ucy5mb250X3NpemUpIHx8ICcxMnB4JztcbiAgICB2YXIgZm9udF9mYW1pbHkgPSBvcHRpb25zLmZvbnRfZmFtaWx5IHx8ICdBcmlhbCc7XG4gICAgdmFyIGZvbnQgPSBmb250X3N0eWxlICsgJyAnICsgZm9udF92YXJpYW50ICsgJyAnICsgZm9udF93ZWlnaHQgKyAnICcgKyBmb250X3NpemUgKyAnICcgKyBmb250X2ZhbWlseTtcbiAgICBzZXRfb3B0aW9ucy5mb250ID0gb3B0aW9ucy5mb250IHx8IGZvbnQ7XG5cbiAgICAvLyBUZXh0IHN0eWxlLlxuICAgIHNldF9vcHRpb25zLnRleHRBbGlnbiA9IG9wdGlvbnMudGV4dF9hbGlnbiB8fCAnbGVmdCc7XG4gICAgc2V0X29wdGlvbnMudGV4dEJhc2VsaW5lID0gb3B0aW9ucy50ZXh0X2Jhc2VsaW5lIHx8ICd0b3AnO1xuXG4gICAgLy8gVE9ETzogU3VwcG9ydCBzaGFkb3dzLlxuICAgIFxuICAgIC8vIEVtcHR5IHRoZSBtZWFzdXJlIHRleHQgY2FjaGUgaWYgdGhlIGZvbnQgaXMgY2hhbmdlZC5cbiAgICBpZiAoc2V0X29wdGlvbnMuZm9udCAhPT0gdGhpcy5fbGFzdF9zZXRfb3B0aW9ucy5mb250KSB7XG4gICAgICAgIHRoaXMuX3RleHRfc2l6ZV9jYWNoZSA9IHt9O1xuICAgICAgICB0aGlzLl90ZXh0X3NpemVfYXJyYXkgPSBbXTtcbiAgICB9XG4gICAgXG4gICAgLy8gU2V0IHRoZSBvcHRpb25zIG9uIHRoZSBjb250ZXh0IG9iamVjdC4gIE9ubHkgc2V0IG9wdGlvbnMgdGhhdFxuICAgIC8vIGhhdmUgY2hhbmdlZCBzaW5jZSB0aGUgbGFzdCBjYWxsLlxuICAgIGZvciAodmFyIGtleSBpbiBzZXRfb3B0aW9ucykge1xuICAgICAgICBpZiAoc2V0X29wdGlvbnMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuX2xhc3Rfc2V0X29wdGlvbnNba2V5XSAhPT0gc2V0X29wdGlvbnNba2V5XSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2xhc3Rfc2V0X29wdGlvbnNba2V5XSA9IHNldF9vcHRpb25zW2tleV07XG4gICAgICAgICAgICAgICAgdGhpcy5jb250ZXh0W2tleV0gPSBzZXRfb3B0aW9uc1trZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG9wdGlvbnM7XG59O1xuXG4vKipcbiAqIFVwZGF0ZSB0aGUgdGltZXN0YW1wIHRoYXQgdGhlIGNhbnZhcyB3YXMgbW9kaWZpZWQgYW5kXG4gKiB0aGUgcmVnaW9uIHRoYXQgaGFzIGNvbnRlbnRzIHJlbmRlcmVkIHRvIGl0LlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5fdG91Y2ggPSBmdW5jdGlvbih4MSwgeTEsIHgyLCB5Mikge1xuICAgIHRoaXMuX21vZGlmaWVkID0gRGF0ZS5ub3coKTtcblxuICAgIC8vIFNldCB0aGUgcmVuZGVyIHJlZ2lvbi5cbiAgICB2YXIgY29tcGFyaXRvciA9IGZ1bmN0aW9uKG9sZF92YWx1ZSwgbmV3X3ZhbHVlLCBjb21wYXJpc29uKSB7XG4gICAgICAgIGlmIChvbGRfdmFsdWUgPT09IG51bGwgfHwgb2xkX3ZhbHVlID09PSB1bmRlZmluZWQgfHwgbmV3X3ZhbHVlID09PSBudWxsIHx8IG5ld192YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3X3ZhbHVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGNvbXBhcmlzb24uY2FsbCh1bmRlZmluZWQsIG9sZF92YWx1ZSwgbmV3X3ZhbHVlKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdGhpcy5fcmVuZGVyZWRfcmVnaW9uWzBdID0gY29tcGFyaXRvcih0aGlzLl9yZW5kZXJlZF9yZWdpb25bMF0sIHgxLCBNYXRoLm1pbik7XG4gICAgdGhpcy5fcmVuZGVyZWRfcmVnaW9uWzFdID0gY29tcGFyaXRvcih0aGlzLl9yZW5kZXJlZF9yZWdpb25bMV0sIHkxLCBNYXRoLm1pbik7XG4gICAgdGhpcy5fcmVuZGVyZWRfcmVnaW9uWzJdID0gY29tcGFyaXRvcih0aGlzLl9yZW5kZXJlZF9yZWdpb25bMl0sIHgyLCBNYXRoLm1heCk7XG4gICAgdGhpcy5fcmVuZGVyZWRfcmVnaW9uWzNdID0gY29tcGFyaXRvcih0aGlzLl9yZW5kZXJlZF9yZWdpb25bM10sIHkyLCBNYXRoLm1heCk7XG59O1xuXG4vKipcbiAqIFRyYW5zZm9ybSBhbiB4IHZhbHVlIGJlZm9yZSByZW5kZXJpbmcuXG4gKiBAcGFyYW0gIHtmbG9hdH0geFxuICogQHBhcmFtICB7Ym9vbGVhbn0gaW52ZXJzZSAtIHBlcmZvcm0gaW52ZXJzZSB0cmFuc2Zvcm1hdGlvblxuICogQHJldHVybiB7ZmxvYXR9XG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuX3R4ID0gZnVuY3Rpb24oeCwgaW52ZXJzZSkgeyByZXR1cm4geDsgfTtcblxuLyoqXG4gKiBUcmFuc2Zvcm0gYSB5IHZhbHVlIGJlZm9yZSByZW5kZXJpbmcuXG4gKiBAcGFyYW0gIHtmbG9hdH0geVxuICogQHBhcmFtICB7Ym9vbGVhbn0gaW52ZXJzZSAtIHBlcmZvcm0gaW52ZXJzZSB0cmFuc2Zvcm1hdGlvblxuICogQHJldHVybiB7ZmxvYXR9XG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuX3R5ID0gZnVuY3Rpb24oeSwgaW52ZXJzZSkgeyByZXR1cm4geTsgfTtcblxuLyoqXG4gKiBDb252ZXJ0IHRhYiBjaGFyYWN0ZXJzIHRvIHRoZSBjb25maWcgZGVmaW5lZCBudW1iZXIgb2Ygc3BhY2UgXG4gKiBjaGFyYWN0ZXJzIGZvciByZW5kZXJpbmcuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IHMgLSBpbnB1dCBzdHJpbmdcbiAqIEByZXR1cm4ge3N0cmluZ30gb3V0cHV0IHN0cmluZ1xuICovXG5DYW52YXMucHJvdG90eXBlLl9wcm9jZXNzX3RhYnMgPSBmdW5jdGlvbihzKSB7XG4gICAgdmFyIHNwYWNlX3RhYiA9ICcnO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgKGNvbmZpZy50YWJfd2lkdGggfHwgMSk7IGkrKykge1xuICAgICAgICBzcGFjZV90YWIgKz0gJyAnO1xuICAgIH1cbiAgICByZXR1cm4gcy5yZXBsYWNlKC9cXHQvZywgc3BhY2VfdGFiKTtcbn07XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuQ2FudmFzID0gQ2FudmFzO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xuXG4vKipcbiAqIEV2ZW50ZnVsIGNsaXBib2FyZCBzdXBwb3J0XG4gKlxuICogV0FSTklORzogIFRoaXMgY2xhc3MgaXMgYSBodWRnZSBrbHVkZ2UgdGhhdCB3b3JrcyBhcm91bmQgdGhlIHByZWhpc3RvcmljXG4gKiBjbGlwYm9hcmQgc3VwcG9ydCAobGFjayB0aGVyZW9mKSBpbiBtb2Rlcm4gd2Vicm93c2Vycy4gIEl0IGNyZWF0ZXMgYSBoaWRkZW5cbiAqIHRleHRib3ggd2hpY2ggaXMgZm9jdXNlZC4gIFRoZSBwcm9ncmFtbWVyIG11c3QgY2FsbCBgc2V0X2NsaXBwYWJsZWAgdG8gY2hhbmdlXG4gKiB3aGF0IHdpbGwgYmUgY29waWVkIHdoZW4gdGhlIHVzZXIgaGl0cyBrZXlzIGNvcnJlc3BvbmRpbmcgdG8gYSBjb3B5IFxuICogb3BlcmF0aW9uLiAgRXZlbnRzIGBjb3B5YCwgYGN1dGAsIGFuZCBgcGFzdGVgIGFyZSByYWlzZWQgYnkgdGhpcyBjbGFzcy5cbiAqL1xudmFyIENsaXBib2FyZCA9IGZ1bmN0aW9uKGVsKSB7XG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzKTtcbiAgICB0aGlzLl9lbCA9IGVsO1xuXG4gICAgLy8gQ3JlYXRlIGEgdGV4dGJveCB0aGF0J3MgaGlkZGVuLlxuICAgIHRoaXMuaGlkZGVuX2lucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGV4dGFyZWEnKTtcbiAgICB0aGlzLmhpZGRlbl9pbnB1dC5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ3Bvc3RlciBoaWRkZW4tY2xpcGJvYXJkJyk7XG4gICAgZWwuYXBwZW5kQ2hpbGQodGhpcy5oaWRkZW5faW5wdXQpO1xuXG4gICAgdGhpcy5fYmluZF9ldmVudHMoKTtcbn07XG51dGlscy5pbmhlcml0KENsaXBib2FyZCwgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vKipcbiAqIFNldCB3aGF0IHdpbGwgYmUgY29waWVkIHdoZW4gdGhlIHVzZXIgY29waWVzLlxuICogQHBhcmFtIHtzdHJpbmd9IHRleHRcbiAqL1xuQ2xpcGJvYXJkLnByb3RvdHlwZS5zZXRfY2xpcHBhYmxlID0gZnVuY3Rpb24odGV4dCkge1xuICAgIHRoaXMuX2NsaXBwYWJsZSA9IHRleHQ7XG4gICAgdGhpcy5oaWRkZW5faW5wdXQudmFsdWUgPSB0aGlzLl9jbGlwcGFibGU7XG4gICAgdGhpcy5fZm9jdXMoKTtcbn07IFxuXG4vKipcbiAqIEZvY3VzIHRoZSBoaWRkZW4gdGV4dCBhcmVhLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2xpcGJvYXJkLnByb3RvdHlwZS5fZm9jdXMgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmhpZGRlbl9pbnB1dC5mb2N1cygpO1xuICAgIHRoaXMuaGlkZGVuX2lucHV0LnNlbGVjdCgpO1xufTtcblxuLyoqXG4gKiBIYW5kbGUgd2hlbiB0aGUgdXNlciBwYXN0ZXMgaW50byB0aGUgdGV4dGJveC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkNsaXBib2FyZC5wcm90b3R5cGUuX2hhbmRsZV9wYXN0ZSA9IGZ1bmN0aW9uKGUpIHtcbiAgICB2YXIgcGFzdGVkID0gZS5jbGlwYm9hcmREYXRhLmdldERhdGEoZS5jbGlwYm9hcmREYXRhLnR5cGVzWzBdKTtcbiAgICB1dGlscy5jYW5jZWxfYnViYmxlKGUpO1xuICAgIHRoaXMudHJpZ2dlcigncGFzdGUnLCBwYXN0ZWQpO1xufTtcblxuLyoqXG4gKiBCaW5kIGV2ZW50cyBvZiB0aGUgaGlkZGVuIHRleHRib3guXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DbGlwYm9hcmQucHJvdG90eXBlLl9iaW5kX2V2ZW50cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcblxuICAgIC8vIExpc3RlbiB0byBlbCdzIGZvY3VzIGV2ZW50LiAgSWYgZWwgaXMgZm9jdXNlZCwgZm9jdXMgdGhlIGhpZGRlbiBpbnB1dFxuICAgIC8vIGluc3RlYWQuXG4gICAgdXRpbHMuaG9vayh0aGlzLl9lbCwgJ29uZm9jdXMnLCB1dGlscy5wcm94eSh0aGlzLl9mb2N1cywgdGhpcykpO1xuXG4gICAgdXRpbHMuaG9vayh0aGlzLmhpZGRlbl9pbnB1dCwgJ29ucGFzdGUnLCB1dGlscy5wcm94eSh0aGlzLl9oYW5kbGVfcGFzdGUsIHRoaXMpKTtcbiAgICB1dGlscy5ob29rKHRoaXMuaGlkZGVuX2lucHV0LCAnb25jdXQnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIC8vIFRyaWdnZXIgdGhlIGV2ZW50IGluIGEgdGltZW91dCBzbyBpdCBmaXJlcyBhZnRlciB0aGUgc3lzdGVtIGV2ZW50LlxuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB0aGF0LnRyaWdnZXIoJ2N1dCcsIHRoYXQuX2NsaXBwYWJsZSk7XG4gICAgICAgIH0sIDApO1xuICAgIH0pO1xuICAgIHV0aWxzLmhvb2sodGhpcy5oaWRkZW5faW5wdXQsICdvbmNvcHknLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIHRoYXQudHJpZ2dlcignY29weScsIHRoYXQuX2NsaXBwYWJsZSk7XG4gICAgfSk7XG4gICAgdXRpbHMuaG9vayh0aGlzLmhpZGRlbl9pbnB1dCwgJ29ua2V5cHJlc3MnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHRoYXQuaGlkZGVuX2lucHV0LnZhbHVlID0gdGhhdC5fY2xpcHBhYmxlO1xuICAgICAgICAgICAgdGhhdC5fZm9jdXMoKTtcbiAgICAgICAgfSwgMCk7XG4gICAgfSk7XG4gICAgdXRpbHMuaG9vayh0aGlzLmhpZGRlbl9pbnB1dCwgJ29ua2V5dXAnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHRoYXQuaGlkZGVuX2lucHV0LnZhbHVlID0gdGhhdC5fY2xpcHBhYmxlO1xuICAgICAgICAgICAgdGhhdC5fZm9jdXMoKTtcbiAgICAgICAgfSwgMCk7XG4gICAgfSk7XG59O1xuXG5leHBvcnRzLkNsaXBib2FyZCA9IENsaXBib2FyZDtcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcbnZhciBjb25maWcgPSBuZXcgdXRpbHMuUG9zdGVyQ2xhc3MoW1xuICAgICdoaWdobGlnaHRfZHJhdycsIC8vIGJvb2xlYW4gLSBXaGV0aGVyIG9yIG5vdCB0byBoaWdobGlnaHQgcmUtcmVuZGVyc1xuICAgICduZXdsaW5lX3dpZHRoJywgLy8gaW50ZWdlciAtIFdpZHRoIG9mIG5ld2xpbmUgY2hhcmFjdGVyc1xuICAgICd0YWJfd2lkdGgnLCAvLyBpbnRlZ2VyIC0gVGFiIGNoYXJhY3RlciB3aWR0aCBtZWFzdXJlZCBpbiBzcGFjZSBjaGFyYWN0ZXJzXG4gICAgJ3VzZV9zcGFjZXMnLCAvLyBib29sZWFuIC0gVXNlIHNwYWNlcyBmb3IgaW5kZW50cyBpbnN0ZWFkIG9mIHRhYnNcbiAgICAnaGlzdG9yeV9ncm91cF9kZWxheScsIC8vIGludGVnZXIgLSBUaW1lIChtcykgdG8gd2FpdCBmb3IgYW5vdGhlciBoaXN0b3JpY2FsIGV2ZW50XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBiZWZvcmUgYXV0b21hdGljYWxseSBncm91cGluZyB0aGVtIChyZWxhdGVkIHRvIHVuZG8gYW5kIHJlZG8gXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBhY3Rpb25zKVxuXSk7XG5cbi8vIFNldCBkZWZhdWx0c1xuY29uZmlnLnRhYl93aWR0aCA9IDQ7XG5jb25maWcudXNlX3NwYWNlcyA9IHRydWU7XG5jb25maWcuaGlzdG9yeV9ncm91cF9kZWxheSA9IDEwMDtcblxuZXhwb3J0cy5jb25maWcgPSBjb25maWc7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxudmFyIGtleW1hcCA9IHJlcXVpcmUoJy4vZXZlbnRzL21hcC5qcycpO1xudmFyIHJlZ2lzdGVyID0ga2V5bWFwLk1hcC5yZWdpc3RlcjtcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xudmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnLmpzJyk7XG5jb25maWcgPSBjb25maWcuY29uZmlnO1xuXG4vKipcbiAqIElucHV0IGN1cnNvci5cbiAqL1xudmFyIEN1cnNvciA9IGZ1bmN0aW9uKG1vZGVsLCBwdXNoX2hpc3RvcnkpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX21vZGVsID0gbW9kZWw7XG4gICAgdGhpcy5fcHVzaF9oaXN0b3J5ID0gcHVzaF9oaXN0b3J5O1xuXG4gICAgdGhpcy5wcmltYXJ5X3JvdyA9IDA7XG4gICAgdGhpcy5wcmltYXJ5X2NoYXIgPSAwO1xuICAgIHRoaXMuc2Vjb25kYXJ5X3JvdyA9IDA7XG4gICAgdGhpcy5zZWNvbmRhcnlfY2hhciA9IDA7XG5cbiAgICB0aGlzLl9pbml0X3Byb3BlcnRpZXMoKTtcbiAgICB0aGlzLl9yZWdpc3Rlcl9hcGkoKTtcbn07XG51dGlscy5pbmhlcml0KEN1cnNvciwgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vKipcbiAqIFVucmVnaXN0ZXIgdGhlIGFjdGlvbnMgYW5kIGV2ZW50IGxpc3RlbmVycyBvZiB0aGlzIGN1cnNvci5cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS51bnJlZ2lzdGVyID0gZnVuY3Rpb24oKSB7XG4gICAga2V5bWFwLnVucmVnaXN0ZXJfYnlfdGFnKHRoaXMpO1xufTtcblxuLyoqXG4gKiBHZXRzIHRoZSBzdGF0ZSBvZiB0aGUgY3Vyc29yLlxuICogQHJldHVybiB7b2JqZWN0fSBzdGF0ZVxuICovXG5DdXJzb3IucHJvdG90eXBlLmdldF9zdGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHByaW1hcnlfcm93OiB0aGlzLnByaW1hcnlfcm93LFxuICAgICAgICBwcmltYXJ5X2NoYXI6IHRoaXMucHJpbWFyeV9jaGFyLFxuICAgICAgICBzZWNvbmRhcnlfcm93OiB0aGlzLnNlY29uZGFyeV9yb3csXG4gICAgICAgIHNlY29uZGFyeV9jaGFyOiB0aGlzLnNlY29uZGFyeV9jaGFyLFxuICAgICAgICBfbWVtb3J5X2NoYXI6IHRoaXMuX21lbW9yeV9jaGFyXG4gICAgfTtcbn07XG5cbi8qKlxuICogU2V0cyB0aGUgc3RhdGUgb2YgdGhlIGN1cnNvci5cbiAqIEBwYXJhbSB7b2JqZWN0fSBzdGF0ZVxuICogQHBhcmFtIHtib29sZWFufSBbaGlzdG9yaWNhbF0gLSBEZWZhdWx0cyB0byB0cnVlLiAgV2hldGhlciB0aGlzIHNob3VsZCBiZSByZWNvcmRlZCBpbiBoaXN0b3J5LlxuICovXG5DdXJzb3IucHJvdG90eXBlLnNldF9zdGF0ZSA9IGZ1bmN0aW9uKHN0YXRlLCBoaXN0b3JpY2FsKSB7XG4gICAgaWYgKHN0YXRlKSB7XG4gICAgICAgIHZhciBvbGRfc3RhdGUgPSB7fTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHN0YXRlKSB7XG4gICAgICAgICAgICBpZiAoc3RhdGUuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgIG9sZF9zdGF0ZVtrZXldID0gdGhpc1trZXldO1xuICAgICAgICAgICAgICAgIHRoaXNba2V5XSA9IHN0YXRlW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaGlzdG9yaWNhbCA9PT0gdW5kZWZpbmVkIHx8IGhpc3RvcmljYWwgPT09IHRydWUpIHtcbiAgICAgICAgICAgIHRoaXMuX3B1c2hfaGlzdG9yeSgnc2V0X3N0YXRlJywgW3N0YXRlXSwgJ3NldF9zdGF0ZScsIFtvbGRfc3RhdGVdKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgIH1cbn07XG5cbi8qKlxuICogTW92ZXMgdGhlIHByaW1hcnkgY3Vyc29yIGEgZ2l2ZW4gb2Zmc2V0LlxuICogQHBhcmFtICB7aW50ZWdlcn0geFxuICogQHBhcmFtICB7aW50ZWdlcn0geVxuICogQHBhcmFtICB7Ym9vbGVhbn0gKG9wdGlvbmFsKSBob3A9ZmFsc2UgLSBob3AgdG8gdGhlIG90aGVyIHNpZGUgb2YgdGhlXG4gKiAgICAgICAgICAgICAgICAgICBzZWxlY3RlZCByZWdpb24gaWYgdGhlIHByaW1hcnkgaXMgb24gdGhlIG9wcG9zaXRlIG9mIHRoZVxuICogICAgICAgICAgICAgICAgICAgZGlyZWN0aW9uIG9mIG1vdGlvbi5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUubW92ZV9wcmltYXJ5ID0gZnVuY3Rpb24oeCwgeSwgaG9wKSB7XG4gICAgaWYgKGhvcCkge1xuICAgICAgICBpZiAodGhpcy5wcmltYXJ5X3JvdyAhPSB0aGlzLnNlY29uZGFyeV9yb3cgfHwgdGhpcy5wcmltYXJ5X2NoYXIgIT0gdGhpcy5zZWNvbmRhcnlfY2hhcikge1xuICAgICAgICAgICAgdmFyIHN0YXJ0X3JvdyA9IHRoaXMuc3RhcnRfcm93O1xuICAgICAgICAgICAgdmFyIHN0YXJ0X2NoYXIgPSB0aGlzLnN0YXJ0X2NoYXI7XG4gICAgICAgICAgICB2YXIgZW5kX3JvdyA9IHRoaXMuZW5kX3JvdztcbiAgICAgICAgICAgIHZhciBlbmRfY2hhciA9IHRoaXMuZW5kX2NoYXI7XG4gICAgICAgICAgICBpZiAoeDwwIHx8IHk8MCkge1xuICAgICAgICAgICAgICAgIHRoaXMucHJpbWFyeV9yb3cgPSBzdGFydF9yb3c7XG4gICAgICAgICAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgPSBzdGFydF9jaGFyO1xuICAgICAgICAgICAgICAgIHRoaXMuc2Vjb25kYXJ5X3JvdyA9IGVuZF9yb3c7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWNvbmRhcnlfY2hhciA9IGVuZF9jaGFyO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnByaW1hcnlfcm93ID0gZW5kX3JvdztcbiAgICAgICAgICAgICAgICB0aGlzLnByaW1hcnlfY2hhciA9IGVuZF9jaGFyO1xuICAgICAgICAgICAgICAgIHRoaXMuc2Vjb25kYXJ5X3JvdyA9IHN0YXJ0X3JvdztcbiAgICAgICAgICAgICAgICB0aGlzLnNlY29uZGFyeV9jaGFyID0gc3RhcnRfY2hhcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmICh4IDwgMCkge1xuICAgICAgICBpZiAodGhpcy5wcmltYXJ5X2NoYXIgKyB4IDwgMCkge1xuICAgICAgICAgICAgaWYgKHRoaXMucHJpbWFyeV9yb3cgPT09IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLnByaW1hcnlfY2hhciA9IDA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMucHJpbWFyeV9yb3cgLT0gMTtcbiAgICAgICAgICAgICAgICB0aGlzLnByaW1hcnlfY2hhciA9IHRoaXMuX21vZGVsLl9yb3dzW3RoaXMucHJpbWFyeV9yb3ddLmxlbmd0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMucHJpbWFyeV9jaGFyICs9IHg7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHggPiAwKSB7XG4gICAgICAgIGlmICh0aGlzLnByaW1hcnlfY2hhciArIHggPiB0aGlzLl9tb2RlbC5fcm93c1t0aGlzLnByaW1hcnlfcm93XS5sZW5ndGgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnByaW1hcnlfcm93ID09PSB0aGlzLl9tb2RlbC5fcm93cy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgPSB0aGlzLl9tb2RlbC5fcm93c1t0aGlzLnByaW1hcnlfcm93XS5sZW5ndGg7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMucHJpbWFyeV9yb3cgKz0gMTtcbiAgICAgICAgICAgICAgICB0aGlzLnByaW1hcnlfY2hhciA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnByaW1hcnlfY2hhciArPSB4O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gUmVtZW1iZXIgdGhlIGNoYXJhY3RlciBwb3NpdGlvbiwgdmVydGljYWwgbmF2aWdhdGlvbiBhY3Jvc3MgZW1wdHkgbGluZXNcbiAgICAvLyBzaG91bGRuJ3QgY2F1c2UgdGhlIGhvcml6b250YWwgcG9zaXRpb24gdG8gYmUgbG9zdC5cbiAgICBpZiAoeCAhPT0gMCkge1xuICAgICAgICB0aGlzLl9tZW1vcnlfY2hhciA9IHRoaXMucHJpbWFyeV9jaGFyO1xuICAgIH1cblxuICAgIGlmICh5ICE9PSAwKSB7XG4gICAgICAgIHRoaXMucHJpbWFyeV9yb3cgKz0geTtcbiAgICAgICAgdGhpcy5wcmltYXJ5X3JvdyA9IE1hdGgubWluKE1hdGgubWF4KHRoaXMucHJpbWFyeV9yb3csIDApLCB0aGlzLl9tb2RlbC5fcm93cy5sZW5ndGgtMSk7XG4gICAgICAgIGlmICh0aGlzLl9tZW1vcnlfY2hhciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGlzLnByaW1hcnlfY2hhciA9IHRoaXMuX21lbW9yeV9jaGFyO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLnByaW1hcnlfY2hhciA+IHRoaXMuX21vZGVsLl9yb3dzW3RoaXMucHJpbWFyeV9yb3ddLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgPSB0aGlzLl9tb2RlbC5fcm93c1t0aGlzLnByaW1hcnlfcm93XS5sZW5ndGg7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZScpOyBcbn07XG5cbi8qKlxuICogV2FsayB0aGUgcHJpbWFyeSBjdXJzb3IgaW4gYSBkaXJlY3Rpb24gdW50aWwgYSBub3QtdGV4dCBjaGFyYWN0ZXIgaXMgZm91bmQuXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBkaXJlY3Rpb25cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUud29yZF9wcmltYXJ5ID0gZnVuY3Rpb24oZGlyZWN0aW9uKSB7XG4gICAgLy8gTWFrZSBzdXJlIGRpcmVjdGlvbiBpcyAxIG9yIC0xLlxuICAgIGRpcmVjdGlvbiA9IGRpcmVjdGlvbiA8IDAgPyAtMSA6IDE7XG5cbiAgICAvLyBJZiBtb3ZpbmcgbGVmdCBhbmQgYXQgZW5kIG9mIHJvdywgbW92ZSB1cCBhIHJvdyBpZiBwb3NzaWJsZS5cbiAgICBpZiAodGhpcy5wcmltYXJ5X2NoYXIgPT09IDAgJiYgZGlyZWN0aW9uID09IC0xKSB7XG4gICAgICAgIGlmICh0aGlzLnByaW1hcnlfcm93ICE9PSAwKSB7XG4gICAgICAgICAgICB0aGlzLnByaW1hcnlfcm93LS07XG4gICAgICAgICAgICB0aGlzLnByaW1hcnlfY2hhciA9IHRoaXMuX21vZGVsLl9yb3dzW3RoaXMucHJpbWFyeV9yb3ddLmxlbmd0aDtcbiAgICAgICAgICAgIHRoaXMuX21lbW9yeV9jaGFyID0gdGhpcy5wcmltYXJ5X2NoYXI7XG4gICAgICAgICAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZScpOyBcbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gSWYgbW92aW5nIHJpZ2h0IGFuZCBhdCBlbmQgb2Ygcm93LCBtb3ZlIGRvd24gYSByb3cgaWYgcG9zc2libGUuXG4gICAgaWYgKHRoaXMucHJpbWFyeV9jaGFyID49IHRoaXMuX21vZGVsLl9yb3dzW3RoaXMucHJpbWFyeV9yb3ddLmxlbmd0aCAmJiBkaXJlY3Rpb24gPT0gMSkge1xuICAgICAgICBpZiAodGhpcy5wcmltYXJ5X3JvdyA8IHRoaXMuX21vZGVsLl9yb3dzLmxlbmd0aC0xKSB7XG4gICAgICAgICAgICB0aGlzLnByaW1hcnlfcm93Kys7XG4gICAgICAgICAgICB0aGlzLnByaW1hcnlfY2hhciA9IDA7XG4gICAgICAgICAgICB0aGlzLl9tZW1vcnlfY2hhciA9IHRoaXMucHJpbWFyeV9jaGFyO1xuICAgICAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnKTsgXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBpID0gdGhpcy5wcmltYXJ5X2NoYXI7XG4gICAgdmFyIGhpdF90ZXh0ID0gZmFsc2U7XG4gICAgdmFyIHJvd190ZXh0ID0gdGhpcy5fbW9kZWwuX3Jvd3NbdGhpcy5wcmltYXJ5X3Jvd107XG4gICAgaWYgKGRpcmVjdGlvbiA9PSAtMSkge1xuICAgICAgICB3aGlsZSAoMCA8IGkgJiYgIShoaXRfdGV4dCAmJiB1dGlscy5ub3RfdGV4dChyb3dfdGV4dFtpLTFdKSkpIHtcbiAgICAgICAgICAgIGhpdF90ZXh0ID0gaGl0X3RleHQgfHwgIXV0aWxzLm5vdF90ZXh0KHJvd190ZXh0W2ktMV0pO1xuICAgICAgICAgICAgaSArPSBkaXJlY3Rpb247XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICB3aGlsZSAoaSA8IHJvd190ZXh0Lmxlbmd0aCAmJiAhKGhpdF90ZXh0ICYmIHV0aWxzLm5vdF90ZXh0KHJvd190ZXh0W2ldKSkpIHtcbiAgICAgICAgICAgIGhpdF90ZXh0ID0gaGl0X3RleHQgfHwgIXV0aWxzLm5vdF90ZXh0KHJvd190ZXh0W2ldKTtcbiAgICAgICAgICAgIGkgKz0gZGlyZWN0aW9uO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5wcmltYXJ5X2NoYXIgPSBpO1xuICAgIHRoaXMuX21lbW9yeV9jaGFyID0gdGhpcy5wcmltYXJ5X2NoYXI7XG4gICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnKTsgXG59O1xuXG4vKipcbiAqIFNlbGVjdCBhbGwgb2YgdGhlIHRleHQuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3IucHJvdG90eXBlLnNlbGVjdF9hbGwgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnByaW1hcnlfcm93ID0gdGhpcy5fbW9kZWwuX3Jvd3MubGVuZ3RoLTE7XG4gICAgdGhpcy5wcmltYXJ5X2NoYXIgPSB0aGlzLl9tb2RlbC5fcm93c1t0aGlzLnByaW1hcnlfcm93XS5sZW5ndGg7XG4gICAgdGhpcy5zZWNvbmRhcnlfcm93ID0gMDtcbiAgICB0aGlzLnNlY29uZGFyeV9jaGFyID0gMDtcbiAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZScpOyBcbn07XG5cbi8qKlxuICogTW92ZSB0aGUgcHJpbWFyeSBjdXJzb3IgdG8gdGhlIGxpbmUgZW5kLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5wcmltYXJ5X2dvdG9fZW5kID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gR2V0IHRoZSBzdGFydCBvZiB0aGUgYWN0dWFsIGNvbnRlbnQsIHNraXBwaW5nIHRoZSB3aGl0ZXNwYWNlLlxuICAgIHZhciByb3dfdGV4dCA9IHRoaXMuX21vZGVsLl9yb3dzW3RoaXMucHJpbWFyeV9yb3ddO1xuICAgIHZhciB0cmltbWVkID0gcm93X3RleHQudHJpbSgpO1xuICAgIHZhciBzdGFydCA9IHJvd190ZXh0LmluZGV4T2YodHJpbW1lZCk7XG4gICAgdmFyIHRhcmdldCA9IHJvd190ZXh0Lmxlbmd0aDtcbiAgICBpZiAoMCA8IHN0YXJ0ICYmIHN0YXJ0IDwgcm93X3RleHQubGVuZ3RoICYmIHRoaXMucHJpbWFyeV9jaGFyICE9PSBzdGFydCArIHRyaW1tZWQubGVuZ3RoKSB7XG4gICAgICAgIHRhcmdldCA9IHN0YXJ0ICsgdHJpbW1lZC5sZW5ndGg7XG4gICAgfVxuXG4gICAgLy8gTW92ZSB0aGUgY3Vyc29yLlxuICAgIHRoaXMucHJpbWFyeV9jaGFyID0gdGFyZ2V0O1xuICAgIHRoaXMuX21lbW9yeV9jaGFyID0gdGhpcy5wcmltYXJ5X2NoYXI7XG4gICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnKTsgXG59O1xuXG4vKipcbiAqIE1vdmUgdGhlIHByaW1hcnkgY3Vyc29yIHRvIHRoZSBsaW5lIHN0YXJ0LlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5wcmltYXJ5X2dvdG9fc3RhcnQgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBHZXQgdGhlIHN0YXJ0IG9mIHRoZSBhY3R1YWwgY29udGVudCwgc2tpcHBpbmcgdGhlIHdoaXRlc3BhY2UuXG4gICAgdmFyIHJvd190ZXh0ID0gdGhpcy5fbW9kZWwuX3Jvd3NbdGhpcy5wcmltYXJ5X3Jvd107XG4gICAgdmFyIHN0YXJ0ID0gcm93X3RleHQuaW5kZXhPZihyb3dfdGV4dC50cmltKCkpO1xuICAgIHZhciB0YXJnZXQgPSAwO1xuICAgIGlmICgwIDwgc3RhcnQgJiYgc3RhcnQgPCByb3dfdGV4dC5sZW5ndGggJiYgdGhpcy5wcmltYXJ5X2NoYXIgIT09IHN0YXJ0KSB7XG4gICAgICAgIHRhcmdldCA9IHN0YXJ0O1xuICAgIH1cblxuICAgIC8vIE1vdmUgdGhlIGN1cnNvci5cbiAgICB0aGlzLnByaW1hcnlfY2hhciA9IHRhcmdldDtcbiAgICB0aGlzLl9tZW1vcnlfY2hhciA9IHRoaXMucHJpbWFyeV9jaGFyO1xuICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxufTtcblxuLyoqXG4gKiBTZWxlY3RzIGEgd29yZCBhdCB0aGUgZ2l2ZW4gbG9jYXRpb24uXG4gKiBAcGFyYW0ge2ludGVnZXJ9IHJvd19pbmRleFxuICogQHBhcmFtIHtpbnRlZ2VyfSBjaGFyX2luZGV4XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuc2VsZWN0X3dvcmQgPSBmdW5jdGlvbihyb3dfaW5kZXgsIGNoYXJfaW5kZXgpIHtcbiAgICB0aGlzLnNldF9ib3RoKHJvd19pbmRleCwgY2hhcl9pbmRleCk7XG4gICAgdGhpcy53b3JkX3ByaW1hcnkoLTEpO1xuICAgIHRoaXMuX3Jlc2V0X3NlY29uZGFyeSgpO1xuICAgIHRoaXMud29yZF9wcmltYXJ5KDEpO1xufTtcblxuLyoqXG4gKiBTZXQgdGhlIHByaW1hcnkgY3Vyc29yIHBvc2l0aW9uXG4gKiBAcGFyYW0ge2ludGVnZXJ9IHJvd19pbmRleFxuICogQHBhcmFtIHtpbnRlZ2VyfSBjaGFyX2luZGV4XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuc2V0X3ByaW1hcnkgPSBmdW5jdGlvbihyb3dfaW5kZXgsIGNoYXJfaW5kZXgpIHtcbiAgICB0aGlzLnByaW1hcnlfcm93ID0gcm93X2luZGV4O1xuICAgIHRoaXMucHJpbWFyeV9jaGFyID0gY2hhcl9pbmRleDtcblxuICAgIC8vIFJlbWVtYmVyIHRoZSBjaGFyYWN0ZXIgcG9zaXRpb24sIHZlcnRpY2FsIG5hdmlnYXRpb24gYWNyb3NzIGVtcHR5IGxpbmVzXG4gICAgLy8gc2hvdWxkbid0IGNhdXNlIHRoZSBob3Jpem9udGFsIHBvc2l0aW9uIHRvIGJlIGxvc3QuXG4gICAgdGhpcy5fbWVtb3J5X2NoYXIgPSB0aGlzLnByaW1hcnlfY2hhcjtcblxuICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxufTtcblxuLyoqXG4gKiBTZXQgdGhlIHNlY29uZGFyeSBjdXJzb3IgcG9zaXRpb25cbiAqIEBwYXJhbSB7aW50ZWdlcn0gcm93X2luZGV4XG4gKiBAcGFyYW0ge2ludGVnZXJ9IGNoYXJfaW5kZXhcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5zZXRfc2Vjb25kYXJ5ID0gZnVuY3Rpb24ocm93X2luZGV4LCBjaGFyX2luZGV4KSB7XG4gICAgdGhpcy5zZWNvbmRhcnlfcm93ID0gcm93X2luZGV4O1xuICAgIHRoaXMuc2Vjb25kYXJ5X2NoYXIgPSBjaGFyX2luZGV4O1xuICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxufTtcblxuLyoqXG4gKiBTZXRzIGJvdGggdGhlIHByaW1hcnkgYW5kIHNlY29uZGFyeSBjdXJzb3IgcG9zaXRpb25zXG4gKiBAcGFyYW0ge2ludGVnZXJ9IHJvd19pbmRleFxuICogQHBhcmFtIHtpbnRlZ2VyfSBjaGFyX2luZGV4XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuc2V0X2JvdGggPSBmdW5jdGlvbihyb3dfaW5kZXgsIGNoYXJfaW5kZXgpIHtcbiAgICB0aGlzLnByaW1hcnlfcm93ID0gcm93X2luZGV4O1xuICAgIHRoaXMucHJpbWFyeV9jaGFyID0gY2hhcl9pbmRleDtcbiAgICB0aGlzLnNlY29uZGFyeV9yb3cgPSByb3dfaW5kZXg7XG4gICAgdGhpcy5zZWNvbmRhcnlfY2hhciA9IGNoYXJfaW5kZXg7XG5cbiAgICAvLyBSZW1lbWJlciB0aGUgY2hhcmFjdGVyIHBvc2l0aW9uLCB2ZXJ0aWNhbCBuYXZpZ2F0aW9uIGFjcm9zcyBlbXB0eSBsaW5lc1xuICAgIC8vIHNob3VsZG4ndCBjYXVzZSB0aGUgaG9yaXpvbnRhbCBwb3NpdGlvbiB0byBiZSBsb3N0LlxuICAgIHRoaXMuX21lbW9yeV9jaGFyID0gdGhpcy5wcmltYXJ5X2NoYXI7XG5cbiAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZScpOyBcbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIGEga2V5IGlzIHByZXNzZWQuXG4gKiBAcGFyYW0gIHtFdmVudH0gZSAtIG9yaWdpbmFsIGtleSBwcmVzcyBldmVudC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUua2V5cHJlc3MgPSBmdW5jdGlvbihlKSB7XG4gICAgdmFyIGNoYXJfY29kZSA9IGUud2hpY2ggfHwgZS5rZXlDb2RlO1xuICAgIHZhciBjaGFyX3R5cGVkID0gU3RyaW5nLmZyb21DaGFyQ29kZShjaGFyX2NvZGUpO1xuICAgIHRoaXMucmVtb3ZlX3NlbGVjdGVkKCk7XG4gICAgdGhpcy5faGlzdG9yaWNhbChmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5fbW9kZWxfYWRkX3RleHQodGhpcy5wcmltYXJ5X3JvdywgdGhpcy5wcmltYXJ5X2NoYXIsIGNoYXJfdHlwZWQpO1xuICAgIH0pO1xuICAgIHRoaXMubW92ZV9wcmltYXJ5KDEsIDApO1xuICAgIHRoaXMuX3Jlc2V0X3NlY29uZGFyeSgpO1xuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBJbmRlbnRcbiAqIEBwYXJhbSAge0V2ZW50fSBlIC0gb3JpZ2luYWwga2V5IHByZXNzIGV2ZW50LlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5pbmRlbnQgPSBmdW5jdGlvbihlKSB7XG4gICAgdmFyIGluZGVudCA9IHRoaXMuX21ha2VfaW5kZW50cygpWzBdO1xuICAgIHRoaXMuX2hpc3RvcmljYWwoZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aGlzLnByaW1hcnlfcm93ID09IHRoaXMuc2Vjb25kYXJ5X3JvdyAmJiB0aGlzLnByaW1hcnlfY2hhciA9PSB0aGlzLnNlY29uZGFyeV9jaGFyKSB7XG4gICAgICAgICAgICB0aGlzLl9tb2RlbF9hZGRfdGV4dCh0aGlzLnByaW1hcnlfcm93LCB0aGlzLnByaW1hcnlfY2hhciwgaW5kZW50KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAodmFyIHJvdyA9IHRoaXMuc3RhcnRfcm93OyByb3cgPD0gdGhpcy5lbmRfcm93OyByb3crKykge1xuICAgICAgICAgICAgICAgIHRoaXMuX21vZGVsX2FkZF90ZXh0KHJvdywgMCwgaW5kZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMucHJpbWFyeV9jaGFyICs9IGluZGVudC5sZW5ndGg7XG4gICAgdGhpcy5fbWVtb3J5X2NoYXIgPSB0aGlzLnByaW1hcnlfY2hhcjtcbiAgICB0aGlzLnNlY29uZGFyeV9jaGFyICs9IGluZGVudC5sZW5ndGg7XG4gICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogVW5pbmRlbnRcbiAqIEBwYXJhbSAge0V2ZW50fSBlIC0gb3JpZ2luYWwga2V5IHByZXNzIGV2ZW50LlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS51bmluZGVudCA9IGZ1bmN0aW9uKGUpIHtcbiAgICB2YXIgaW5kZW50cyA9IHRoaXMuX21ha2VfaW5kZW50cygpO1xuICAgIHZhciByZW1vdmVkX3N0YXJ0ID0gMDtcbiAgICB2YXIgcmVtb3ZlZF9lbmQgPSAwO1xuXG4gICAgLy8gSWYgbm8gdGV4dCBpcyBzZWxlY3RlZCwgcmVtb3ZlIHRoZSBpbmRlbnQgcHJlY2VkaW5nIHRoZVxuICAgIC8vIGN1cnNvciBpZiBpdCBleGlzdHMuXG4gICAgdGhpcy5faGlzdG9yaWNhbChmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHRoaXMucHJpbWFyeV9yb3cgPT0gdGhpcy5zZWNvbmRhcnlfcm93ICYmIHRoaXMucHJpbWFyeV9jaGFyID09IHRoaXMuc2Vjb25kYXJ5X2NoYXIpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaW5kZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBpbmRlbnQgPSBpbmRlbnRzW2ldO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnByaW1hcnlfY2hhciA+PSBpbmRlbnQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBiZWZvcmUgPSB0aGlzLl9tb2RlbC5nZXRfdGV4dCh0aGlzLnByaW1hcnlfcm93LCB0aGlzLnByaW1hcnlfY2hhci1pbmRlbnQubGVuZ3RoLCB0aGlzLnByaW1hcnlfcm93LCB0aGlzLnByaW1hcnlfY2hhcik7XG4gICAgICAgICAgICAgICAgICAgIGlmIChiZWZvcmUgPT0gaW5kZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9tb2RlbF9yZW1vdmVfdGV4dCh0aGlzLnByaW1hcnlfcm93LCB0aGlzLnByaW1hcnlfY2hhci1pbmRlbnQubGVuZ3RoLCB0aGlzLnByaW1hcnlfcm93LCB0aGlzLnByaW1hcnlfY2hhcik7XG4gICAgICAgICAgICAgICAgICAgICAgICByZW1vdmVkX3N0YXJ0ID0gaW5kZW50Lmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZWRfZW5kID0gaW5kZW50Lmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgIC8vIFRleHQgaXMgc2VsZWN0ZWQuICBSZW1vdmUgdGhlIGFuIGluZGVudCBmcm9tIHRoZSBiZWdpbmluZ1xuICAgICAgICAvLyBvZiBlYWNoIHJvdyBpZiBpdCBleGlzdHMuXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKHZhciByb3cgPSB0aGlzLnN0YXJ0X3Jvdzsgcm93IDw9IHRoaXMuZW5kX3Jvdzsgcm93KyspIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGluZGVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGluZGVudCA9IGluZGVudHNbaV07XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLl9tb2RlbC5fcm93c1tyb3ddLmxlbmd0aCA+PSBpbmRlbnQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5fbW9kZWwuX3Jvd3Nbcm93XS5zdWJzdHJpbmcoMCwgaW5kZW50Lmxlbmd0aCkgPT0gaW5kZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fbW9kZWxfcmVtb3ZlX3RleHQocm93LCAwLCByb3csIGluZGVudC5sZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyb3cgPT0gdGhpcy5zdGFydF9yb3cpIHJlbW92ZWRfc3RhcnQgPSBpbmRlbnQubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyb3cgPT0gdGhpcy5lbmRfcm93KSByZW1vdmVkX2VuZCA9IGluZGVudC5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG4gICAgXG4gICAgLy8gTW92ZSB0aGUgc2VsZWN0ZWQgY2hhcmFjdGVycyBiYWNrd2FyZHMgaWYgaW5kZW50cyB3ZXJlIHJlbW92ZWQuXG4gICAgdmFyIHN0YXJ0X2lzX3ByaW1hcnkgPSAodGhpcy5wcmltYXJ5X3JvdyA9PSB0aGlzLnN0YXJ0X3JvdyAmJiB0aGlzLnByaW1hcnlfY2hhciA9PSB0aGlzLnN0YXJ0X2NoYXIpO1xuICAgIGlmIChzdGFydF9pc19wcmltYXJ5KSB7XG4gICAgICAgIHRoaXMucHJpbWFyeV9jaGFyIC09IHJlbW92ZWRfc3RhcnQ7XG4gICAgICAgIHRoaXMuc2Vjb25kYXJ5X2NoYXIgLT0gcmVtb3ZlZF9lbmQ7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgLT0gcmVtb3ZlZF9lbmQ7XG4gICAgICAgIHRoaXMuc2Vjb25kYXJ5X2NoYXIgLT0gcmVtb3ZlZF9zdGFydDtcbiAgICB9XG4gICAgdGhpcy5fbWVtb3J5X2NoYXIgPSB0aGlzLnByaW1hcnlfY2hhcjtcbiAgICBpZiAocmVtb3ZlZF9lbmQgfHwgcmVtb3ZlZF9zdGFydCkgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogSW5zZXJ0IGEgbmV3bGluZVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5uZXdsaW5lID0gZnVuY3Rpb24oZSkge1xuICAgIHRoaXMucmVtb3ZlX3NlbGVjdGVkKCk7XG5cbiAgICAvLyBHZXQgdGhlIGJsYW5rIHNwYWNlIGF0IHRoZSBiZWdpbmluZyBvZiB0aGUgbGluZS5cbiAgICB2YXIgbGluZV90ZXh0ID0gdGhpcy5fbW9kZWwuZ2V0X3RleHQodGhpcy5wcmltYXJ5X3JvdywgMCwgdGhpcy5wcmltYXJ5X3JvdywgdGhpcy5wcmltYXJ5X2NoYXIpO1xuICAgIHZhciBzcGFjZWxlc3MgPSBsaW5lX3RleHQudHJpbSgpO1xuICAgIHZhciBsZWZ0ID0gbGluZV90ZXh0Lmxlbmd0aDtcbiAgICBpZiAoc3BhY2VsZXNzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgbGVmdCA9IGxpbmVfdGV4dC5pbmRleE9mKHNwYWNlbGVzcyk7XG4gICAgfVxuICAgIHZhciBpbmRlbnQgPSBsaW5lX3RleHQuc3Vic3RyaW5nKDAsIGxlZnQpO1xuICAgIFxuICAgIHRoaXMuX2hpc3RvcmljYWwoZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuX21vZGVsX2FkZF90ZXh0KHRoaXMucHJpbWFyeV9yb3csIHRoaXMucHJpbWFyeV9jaGFyLCAnXFxuJyArIGluZGVudCk7XG4gICAgfSk7XG4gICAgdGhpcy5wcmltYXJ5X3JvdyArPSAxO1xuICAgIHRoaXMucHJpbWFyeV9jaGFyID0gaW5kZW50Lmxlbmd0aDtcbiAgICB0aGlzLl9tZW1vcnlfY2hhciA9IHRoaXMucHJpbWFyeV9jaGFyO1xuICAgIHRoaXMuX3Jlc2V0X3NlY29uZGFyeSgpO1xuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBJbnNlcnQgdGV4dFxuICogQHBhcmFtICB7c3RyaW5nfSB0ZXh0XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3IucHJvdG90eXBlLmluc2VydF90ZXh0ID0gZnVuY3Rpb24odGV4dCkge1xuICAgIHRoaXMucmVtb3ZlX3NlbGVjdGVkKCk7XG4gICAgdGhpcy5faGlzdG9yaWNhbChmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5fbW9kZWxfYWRkX3RleHQodGhpcy5wcmltYXJ5X3JvdywgdGhpcy5wcmltYXJ5X2NoYXIsIHRleHQpO1xuICAgIH0pO1xuICAgIFxuICAgIC8vIE1vdmUgY3Vyc29yIHRvIHRoZSBlbmQuXG4gICAgaWYgKHRleHQuaW5kZXhPZignXFxuJyk9PS0xKSB7XG4gICAgICAgIHRoaXMucHJpbWFyeV9jaGFyID0gdGhpcy5zdGFydF9jaGFyICsgdGV4dC5sZW5ndGg7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGxpbmVzID0gdGV4dC5zcGxpdCgnXFxuJyk7XG4gICAgICAgIHRoaXMucHJpbWFyeV9yb3cgKz0gbGluZXMubGVuZ3RoIC0gMTtcbiAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgPSBsaW5lc1tsaW5lcy5sZW5ndGgtMV0ubGVuZ3RoO1xuICAgIH1cbiAgICB0aGlzLl9yZXNldF9zZWNvbmRhcnkoKTtcblxuICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBQYXN0ZSB0ZXh0XG4gKiBAcGFyYW0gIHtzdHJpbmd9IHRleHRcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUucGFzdGUgPSBmdW5jdGlvbih0ZXh0KSB7XG4gICAgaWYgKHRoaXMuX2NvcGllZF9yb3cgPT09IHRleHQpIHtcbiAgICAgICAgdGhpcy5faGlzdG9yaWNhbChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHRoaXMuX21vZGVsX2FkZF9yb3codGhpcy5wcmltYXJ5X3JvdywgdGV4dCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLnByaW1hcnlfcm93Kys7XG4gICAgICAgIHRoaXMuc2Vjb25kYXJ5X3JvdysrO1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZScpOyBcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmluc2VydF90ZXh0KHRleHQpO1xuICAgIH1cbn07XG5cbi8qKlxuICogUmVtb3ZlIHRoZSBzZWxlY3RlZCB0ZXh0XG4gKiBAcmV0dXJuIHtib29sZWFufSB0cnVlIGlmIHRleHQgd2FzIHJlbW92ZWQuXG4gKi9cbkN1cnNvci5wcm90b3R5cGUucmVtb3ZlX3NlbGVjdGVkID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMucHJpbWFyeV9yb3cgIT09IHRoaXMuc2Vjb25kYXJ5X3JvdyB8fCB0aGlzLnByaW1hcnlfY2hhciAhPT0gdGhpcy5zZWNvbmRhcnlfY2hhcikge1xuICAgICAgICB2YXIgcm93X2luZGV4ID0gdGhpcy5zdGFydF9yb3c7XG4gICAgICAgIHZhciBjaGFyX2luZGV4ID0gdGhpcy5zdGFydF9jaGFyO1xuICAgICAgICB0aGlzLl9oaXN0b3JpY2FsKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhpcy5fbW9kZWxfcmVtb3ZlX3RleHQodGhpcy5zdGFydF9yb3csIHRoaXMuc3RhcnRfY2hhciwgdGhpcy5lbmRfcm93LCB0aGlzLmVuZF9jaGFyKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMucHJpbWFyeV9yb3cgPSByb3dfaW5kZXg7XG4gICAgICAgIHRoaXMucHJpbWFyeV9jaGFyID0gY2hhcl9pbmRleDtcbiAgICAgICAgdGhpcy5fcmVzZXRfc2Vjb25kYXJ5KCk7XG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBHZXRzIHRoZSBzZWxlY3RlZCB0ZXh0LlxuICogQHJldHVybiB7c3RyaW5nfSBzZWxlY3RlZCB0ZXh0XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMucHJpbWFyeV9yb3cgPT0gdGhpcy5zZWNvbmRhcnlfcm93ICYmIHRoaXMucHJpbWFyeV9jaGFyID09IHRoaXMuc2Vjb25kYXJ5X2NoYXIpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX21vZGVsLl9yb3dzW3RoaXMucHJpbWFyeV9yb3ddO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9tb2RlbC5nZXRfdGV4dCh0aGlzLnN0YXJ0X3JvdywgdGhpcy5zdGFydF9jaGFyLCB0aGlzLmVuZF9yb3csIHRoaXMuZW5kX2NoYXIpO1xuICAgIH1cbn07XG5cbi8qKlxuICogQ3V0cyB0aGUgc2VsZWN0ZWQgdGV4dC5cbiAqIEByZXR1cm4ge3N0cmluZ30gc2VsZWN0ZWQgdGV4dFxuICovXG5DdXJzb3IucHJvdG90eXBlLmN1dCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0ZXh0ID0gdGhpcy5nZXQoKTtcbiAgICBpZiAodGhpcy5wcmltYXJ5X3JvdyA9PSB0aGlzLnNlY29uZGFyeV9yb3cgJiYgdGhpcy5wcmltYXJ5X2NoYXIgPT0gdGhpcy5zZWNvbmRhcnlfY2hhcikge1xuICAgICAgICB0aGlzLl9jb3BpZWRfcm93ID0gdGhpcy5fbW9kZWwuX3Jvd3NbdGhpcy5wcmltYXJ5X3Jvd107ICAgIFxuICAgICAgICB0aGlzLl9oaXN0b3JpY2FsKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhpcy5fbW9kZWxfcmVtb3ZlX3Jvdyh0aGlzLnByaW1hcnlfcm93KTtcbiAgICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fY29waWVkX3JvdyA9IG51bGw7XG4gICAgICAgIHRoaXMucmVtb3ZlX3NlbGVjdGVkKCk7XG4gICAgfVxuICAgIHJldHVybiB0ZXh0O1xufTtcblxuLyoqXG4gKiBDb3BpZXMgdGhlIHNlbGVjdGVkIHRleHQuXG4gKiBAcmV0dXJuIHtzdHJpbmd9IHNlbGVjdGVkIHRleHRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRleHQgPSB0aGlzLmdldCgpO1xuICAgIGlmICh0aGlzLnByaW1hcnlfcm93ID09IHRoaXMuc2Vjb25kYXJ5X3JvdyAmJiB0aGlzLnByaW1hcnlfY2hhciA9PSB0aGlzLnNlY29uZGFyeV9jaGFyKSB7XG4gICAgICAgIHRoaXMuX2NvcGllZF9yb3cgPSB0aGlzLl9tb2RlbC5fcm93c1t0aGlzLnByaW1hcnlfcm93XTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9jb3BpZWRfcm93ID0gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRleHQ7XG59O1xuXG4vKipcbiAqIERlbGV0ZSBmb3J3YXJkLCB0eXBpY2FsbHkgY2FsbGVkIGJ5IGBkZWxldGVgIGtleXByZXNzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5kZWxldGVfZm9yd2FyZCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICghdGhpcy5yZW1vdmVfc2VsZWN0ZWQoKSkge1xuICAgICAgICB0aGlzLm1vdmVfcHJpbWFyeSgxLCAwKTtcbiAgICAgICAgdGhpcy5yZW1vdmVfc2VsZWN0ZWQoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIERlbGV0ZSBiYWNrd2FyZCwgdHlwaWNhbGx5IGNhbGxlZCBieSBgYmFja3NwYWNlYCBrZXlwcmVzcy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuZGVsZXRlX2JhY2t3YXJkID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKCF0aGlzLnJlbW92ZV9zZWxlY3RlZCgpKSB7XG4gICAgICAgIHRoaXMubW92ZV9wcmltYXJ5KC0xLCAwKTtcbiAgICAgICAgdGhpcy5yZW1vdmVfc2VsZWN0ZWQoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIERlbGV0ZSBvbmUgd29yZCBiYWNrd2FyZHMuXG4gKiBAcmV0dXJuIHtib29sZWFufSBzdWNjZXNzXG4gKi9cbkN1cnNvci5wcm90b3R5cGUuZGVsZXRlX3dvcmRfbGVmdCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICghdGhpcy5yZW1vdmVfc2VsZWN0ZWQoKSkge1xuICAgICAgICBpZiAodGhpcy5wcmltYXJ5X2NoYXIgPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMud29yZF9wcmltYXJ5KC0xKTsgXG4gICAgICAgICAgICB0aGlzLnJlbW92ZV9zZWxlY3RlZCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gV2FsayBiYWNrd2FyZHMgdW50aWwgY2hhciBpbmRleCBpcyAwIG9yXG4gICAgICAgICAgICAvLyBhIGRpZmZlcmVudCB0eXBlIG9mIGNoYXJhY3RlciBpcyBoaXQuXG4gICAgICAgICAgICB2YXIgcm93ID0gdGhpcy5fbW9kZWwuX3Jvd3NbdGhpcy5wcmltYXJ5X3Jvd107XG4gICAgICAgICAgICB2YXIgaSA9IHRoaXMucHJpbWFyeV9jaGFyIC0gMTtcbiAgICAgICAgICAgIHZhciBzdGFydF9ub3RfdGV4dCA9IHV0aWxzLm5vdF90ZXh0KHJvd1tpXSk7XG4gICAgICAgICAgICB3aGlsZSAoaSA+PSAwICYmIHV0aWxzLm5vdF90ZXh0KHJvd1tpXSkgPT0gc3RhcnRfbm90X3RleHQpIHtcbiAgICAgICAgICAgICAgICBpLS07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnNlY29uZGFyeV9jaGFyID0gaSsxO1xuICAgICAgICAgICAgdGhpcy5yZW1vdmVfc2VsZWN0ZWQoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogRGVsZXRlIG9uZSB3b3JkIGZvcndhcmRzLlxuICogQHJldHVybiB7Ym9vbGVhbn0gc3VjY2Vzc1xuICovXG5DdXJzb3IucHJvdG90eXBlLmRlbGV0ZV93b3JkX3JpZ2h0ID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKCF0aGlzLnJlbW92ZV9zZWxlY3RlZCgpKSB7XG4gICAgICAgIHZhciByb3cgPSB0aGlzLl9tb2RlbC5fcm93c1t0aGlzLnByaW1hcnlfcm93XTtcbiAgICAgICAgaWYgKHRoaXMucHJpbWFyeV9jaGFyID09PSByb3cubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLndvcmRfcHJpbWFyeSgxKTsgXG4gICAgICAgICAgICB0aGlzLnJlbW92ZV9zZWxlY3RlZCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gV2FsayBmb3J3YXJkcyB1bnRpbCBjaGFyIGluZGV4IGlzIGF0IGVuZCBvclxuICAgICAgICAgICAgLy8gYSBkaWZmZXJlbnQgdHlwZSBvZiBjaGFyYWN0ZXIgaXMgaGl0LlxuICAgICAgICAgICAgdmFyIGkgPSB0aGlzLnByaW1hcnlfY2hhcjtcbiAgICAgICAgICAgIHZhciBzdGFydF9ub3RfdGV4dCA9IHV0aWxzLm5vdF90ZXh0KHJvd1tpXSk7XG4gICAgICAgICAgICB3aGlsZSAoaSA8IHJvdy5sZW5ndGggJiYgdXRpbHMubm90X3RleHQocm93W2ldKSA9PSBzdGFydF9ub3RfdGV4dCkge1xuICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc2Vjb25kYXJ5X2NoYXIgPSBpO1xuICAgICAgICAgICAgdGhpcy5yZW1vdmVfc2VsZWN0ZWQoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB0aGlzLl9lbmRfaGlzdG9yaWNhbF9tb3ZlKCk7XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIFJlc2V0IHRoZSBzZWNvbmRhcnkgY3Vyc29yIHRvIHRoZSB2YWx1ZSBvZiB0aGUgcHJpbWFyeS5cbiAqIEByZXR1cm4ge1t0eXBlXX0gW2Rlc2NyaXB0aW9uXVxuICovXG5DdXJzb3IucHJvdG90eXBlLl9yZXNldF9zZWNvbmRhcnkgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnNlY29uZGFyeV9yb3cgPSB0aGlzLnByaW1hcnlfcm93O1xuICAgIHRoaXMuc2Vjb25kYXJ5X2NoYXIgPSB0aGlzLnByaW1hcnlfY2hhcjtcblxuICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxufTtcblxuLyoqXG4gKiBDcmVhdGUgdGhlIHByb3BlcnRpZXMgb2YgdGhlIGN1cnNvci5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuX2luaXRfcHJvcGVydGllcyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLnByb3BlcnR5KCdzdGFydF9yb3cnLCBmdW5jdGlvbigpIHsgcmV0dXJuIE1hdGgubWluKHRoYXQucHJpbWFyeV9yb3csIHRoYXQuc2Vjb25kYXJ5X3Jvdyk7IH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ2VuZF9yb3cnLCBmdW5jdGlvbigpIHsgcmV0dXJuIE1hdGgubWF4KHRoYXQucHJpbWFyeV9yb3csIHRoYXQuc2Vjb25kYXJ5X3Jvdyk7IH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ3N0YXJ0X2NoYXInLCBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHRoYXQucHJpbWFyeV9yb3cgPCB0aGF0LnNlY29uZGFyeV9yb3cgfHwgKHRoYXQucHJpbWFyeV9yb3cgPT0gdGhhdC5zZWNvbmRhcnlfcm93ICYmIHRoYXQucHJpbWFyeV9jaGFyIDw9IHRoYXQuc2Vjb25kYXJ5X2NoYXIpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhhdC5wcmltYXJ5X2NoYXI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhhdC5zZWNvbmRhcnlfY2hhcjtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ2VuZF9jaGFyJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aGF0LnByaW1hcnlfcm93IDwgdGhhdC5zZWNvbmRhcnlfcm93IHx8ICh0aGF0LnByaW1hcnlfcm93ID09IHRoYXQuc2Vjb25kYXJ5X3JvdyAmJiB0aGF0LnByaW1hcnlfY2hhciA8PSB0aGF0LnNlY29uZGFyeV9jaGFyKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoYXQuc2Vjb25kYXJ5X2NoYXI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhhdC5wcmltYXJ5X2NoYXI7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbi8qKlxuICogQWRkcyB0ZXh0IHRvIHRoZSBtb2RlbCB3aGlsZSBrZWVwaW5nIHRyYWNrIG9mIHRoZSBoaXN0b3J5LlxuICogQHBhcmFtICB7aW50ZWdlcn0gcm93X2luZGV4XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBjaGFyX2luZGV4XG4gKiBAcGFyYW0gIHtzdHJpbmd9IHRleHRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5fbW9kZWxfYWRkX3RleHQgPSBmdW5jdGlvbihyb3dfaW5kZXgsIGNoYXJfaW5kZXgsIHRleHQpIHtcbiAgICB2YXIgbGluZXMgPSB0ZXh0LnNwbGl0KCdcXG4nKTtcbiAgICB0aGlzLl9wdXNoX2hpc3RvcnkoXG4gICAgICAgICdfbW9kZWxfYWRkX3RleHQnLCBcbiAgICAgICAgW3Jvd19pbmRleCwgY2hhcl9pbmRleCwgdGV4dF0sIFxuICAgICAgICAnX21vZGVsX3JlbW92ZV90ZXh0JywgXG4gICAgICAgIFtyb3dfaW5kZXgsIGNoYXJfaW5kZXgsIHJvd19pbmRleCArIGxpbmVzLmxlbmd0aCAtIDEsIGxpbmVzLmxlbmd0aCA+IDEgPyBsaW5lc1tsaW5lcy5sZW5ndGgtMV0ubGVuZ3RoIDogY2hhcl9pbmRleCArIHRleHQubGVuZ3RoXSwgXG4gICAgICAgIGNvbmZpZy5oaXN0b3J5X2dyb3VwX2RlbGF5IHx8IDEwMCk7XG4gICAgdGhpcy5fbW9kZWwuYWRkX3RleHQocm93X2luZGV4LCBjaGFyX2luZGV4LCB0ZXh0KTtcbn07XG5cbi8qKlxuICogUmVtb3ZlcyB0ZXh0IGZyb20gdGhlIG1vZGVsIHdoaWxlIGtlZXBpbmcgdHJhY2sgb2YgdGhlIGhpc3RvcnkuXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBzdGFydF9yb3dcbiAqIEBwYXJhbSAge2ludGVnZXJ9IHN0YXJ0X2NoYXJcbiAqIEBwYXJhbSAge2ludGVnZXJ9IGVuZF9yb3dcbiAqIEBwYXJhbSAge2ludGVnZXJ9IGVuZF9jaGFyXG4gKi9cbkN1cnNvci5wcm90b3R5cGUuX21vZGVsX3JlbW92ZV90ZXh0ID0gZnVuY3Rpb24oc3RhcnRfcm93LCBzdGFydF9jaGFyLCBlbmRfcm93LCBlbmRfY2hhcikge1xuICAgIHZhciB0ZXh0ID0gdGhpcy5fbW9kZWwuZ2V0X3RleHQoc3RhcnRfcm93LCBzdGFydF9jaGFyLCBlbmRfcm93LCBlbmRfY2hhcik7XG4gICAgdGhpcy5fcHVzaF9oaXN0b3J5KFxuICAgICAgICAnX21vZGVsX3JlbW92ZV90ZXh0JywgXG4gICAgICAgIFtzdGFydF9yb3csIHN0YXJ0X2NoYXIsIGVuZF9yb3csIGVuZF9jaGFyXSwgXG4gICAgICAgICdfbW9kZWxfYWRkX3RleHQnLCBcbiAgICAgICAgW3N0YXJ0X3Jvdywgc3RhcnRfY2hhciwgdGV4dF0sIFxuICAgICAgICBjb25maWcuaGlzdG9yeV9ncm91cF9kZWxheSB8fCAxMDApO1xuICAgIHRoaXMuX21vZGVsLnJlbW92ZV90ZXh0KHN0YXJ0X3Jvdywgc3RhcnRfY2hhciwgZW5kX3JvdywgZW5kX2NoYXIpO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgcm93IG9mIHRleHQgd2hpbGUga2VlcGluZyB0cmFjayBvZiB0aGUgaGlzdG9yeS5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IHJvd19pbmRleFxuICogQHBhcmFtICB7c3RyaW5nfSB0ZXh0XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuX21vZGVsX2FkZF9yb3cgPSBmdW5jdGlvbihyb3dfaW5kZXgsIHRleHQpIHtcbiAgICB0aGlzLl9wdXNoX2hpc3RvcnkoXG4gICAgICAgICdfbW9kZWxfYWRkX3JvdycsIFxuICAgICAgICBbcm93X2luZGV4LCB0ZXh0XSwgXG4gICAgICAgICdfbW9kZWxfcmVtb3ZlX3JvdycsIFxuICAgICAgICBbcm93X2luZGV4XSwgXG4gICAgICAgIGNvbmZpZy5oaXN0b3J5X2dyb3VwX2RlbGF5IHx8IDEwMCk7XG4gICAgdGhpcy5fbW9kZWwuYWRkX3Jvdyhyb3dfaW5kZXgsIHRleHQpO1xuXG59O1xuXG4vKipcbiAqIFJlbW92ZXMgYSByb3cgb2YgdGV4dCB3aGlsZSBrZWVwaW5nIHRyYWNrIG9mIHRoZSBoaXN0b3J5LlxuICogQHBhcmFtICB7aW50ZWdlcn0gcm93X2luZGV4XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuX21vZGVsX3JlbW92ZV9yb3cgPSBmdW5jdGlvbihyb3dfaW5kZXgpIHtcbiAgICB0aGlzLl9wdXNoX2hpc3RvcnkoXG4gICAgICAgICdfbW9kZWxfcmVtb3ZlX3JvdycsIFxuICAgICAgICBbcm93X2luZGV4XSwgXG4gICAgICAgICdfbW9kZWxfYWRkX3JvdycsIFxuICAgICAgICBbcm93X2luZGV4LCB0aGlzLl9tb2RlbC5fcm93c1tyb3dfaW5kZXhdXSwgXG4gICAgICAgIGNvbmZpZy5oaXN0b3J5X2dyb3VwX2RlbGF5IHx8IDEwMCk7XG4gICAgdGhpcy5fbW9kZWwucmVtb3ZlX3Jvdyhyb3dfaW5kZXgpO1xufTtcblxuLyoqXG4gKiBSZWNvcmQgdGhlIGJlZm9yZSBhbmQgYWZ0ZXIgcG9zaXRpb25zIG9mIHRoZSBjdXJzb3IgZm9yIGhpc3RvcnkuXG4gKiBAcGFyYW0gIHtmdW5jdGlvbn0gZiAtIGV4ZWN1dGVzIHdpdGggYHRoaXNgIGNvbnRleHRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5faGlzdG9yaWNhbCA9IGZ1bmN0aW9uKGYpIHtcbiAgICB0aGlzLl9zdGFydF9oaXN0b3JpY2FsX21vdmUoKTtcbiAgICB2YXIgcmV0ID0gZi5hcHBseSh0aGlzKTtcbiAgICB0aGlzLl9lbmRfaGlzdG9yaWNhbF9tb3ZlKCk7XG4gICAgcmV0dXJuIHJldDtcbn07XG5cbi8qKlxuICogUmVjb3JkIHRoZSBzdGFydGluZyBzdGF0ZSBvZiB0aGUgY3Vyc29yIGZvciB0aGUgaGlzdG9yeSBidWZmZXIuXG4gKi9cbkN1cnNvci5wcm90b3R5cGUuX3N0YXJ0X2hpc3RvcmljYWxfbW92ZSA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICghdGhpcy5faGlzdG9yaWNhbF9zdGFydCkge1xuICAgICAgICB0aGlzLl9oaXN0b3JpY2FsX3N0YXJ0ID0gdGhpcy5nZXRfc3RhdGUoKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFJlY29yZCB0aGUgZW5kaW5nIHN0YXRlIG9mIHRoZSBjdXJzb3IgZm9yIHRoZSBoaXN0b3J5IGJ1ZmZlciwgdGhlblxuICogcHVzaCBhIHJldmVyc2FibGUgYWN0aW9uIGRlc2NyaWJpbmcgdGhlIGNoYW5nZSBvZiB0aGUgY3Vyc29yLlxuICovXG5DdXJzb3IucHJvdG90eXBlLl9lbmRfaGlzdG9yaWNhbF9tb3ZlID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fcHVzaF9oaXN0b3J5KFxuICAgICAgICAnc2V0X3N0YXRlJywgXG4gICAgICAgIFt0aGlzLmdldF9zdGF0ZSgpXSwgXG4gICAgICAgICdzZXRfc3RhdGUnLCBcbiAgICAgICAgW3RoaXMuX2hpc3RvcmljYWxfc3RhcnRdLCBcbiAgICAgICAgY29uZmlnLmhpc3RvcnlfZ3JvdXBfZGVsYXkgfHwgMTAwKTtcbiAgICB0aGlzLl9oaXN0b3JpY2FsX3N0YXJ0ID0gbnVsbDtcbn07XG5cbi8qKlxuICogTWFrZXMgYSBsaXN0IG9mIGluZGVudGF0aW9uIHN0cmluZ3MgdXNlZCB0byBpbmRlbnQgb25lIGxldmVsLFxuICogb3JkZXJlZCBieSB1c2FnZSBwcmVmZXJlbmNlLlxuICogQHJldHVybiB7c3RyaW5nfVxuICovXG5DdXJzb3IucHJvdG90eXBlLl9tYWtlX2luZGVudHMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaW5kZW50cyA9IFtdO1xuICAgIGlmIChjb25maWcudXNlX3NwYWNlcykge1xuICAgICAgICB2YXIgaW5kZW50ID0gJyc7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29uZmlnLnRhYl93aWR0aDsgaSsrKSB7XG4gICAgICAgICAgICBpbmRlbnQgKz0gJyAnO1xuICAgICAgICAgICAgaW5kZW50cy5wdXNoKGluZGVudCk7XG4gICAgICAgIH1cbiAgICAgICAgaW5kZW50cy5yZXZlcnNlKCk7XG4gICAgfVxuICAgIGluZGVudHMucHVzaCgnXFx0Jyk7XG4gICAgcmV0dXJuIGluZGVudHM7XG59O1xuXG4vKipcbiAqIFJlZ2lzdGVycyBhbiBhY3Rpb24gQVBJIHdpdGggdGhlIG1hcFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5fcmVnaXN0ZXJfYXBpID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3Iuc2V0X3N0YXRlJywgdXRpbHMucHJveHkodGhpcy5zZXRfc3RhdGUsIHRoaXMpLCB0aGlzKTtcbiAgICByZWdpc3RlcignY3Vyc29yLnJlbW92ZV9zZWxlY3RlZCcsIHV0aWxzLnByb3h5KHRoaXMucmVtb3ZlX3NlbGVjdGVkLCB0aGlzKSwgdGhpcyk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5rZXlwcmVzcycsIHV0aWxzLnByb3h5KHRoaXMua2V5cHJlc3MsIHRoaXMpLCB0aGlzKTtcbiAgICByZWdpc3RlcignY3Vyc29yLmluZGVudCcsIHV0aWxzLnByb3h5KHRoaXMuaW5kZW50LCB0aGlzKSwgdGhpcyk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci51bmluZGVudCcsIHV0aWxzLnByb3h5KHRoaXMudW5pbmRlbnQsIHRoaXMpLCB0aGlzKTtcbiAgICByZWdpc3RlcignY3Vyc29yLm5ld2xpbmUnLCB1dGlscy5wcm94eSh0aGlzLm5ld2xpbmUsIHRoaXMpLCB0aGlzKTtcbiAgICByZWdpc3RlcignY3Vyc29yLmluc2VydF90ZXh0JywgdXRpbHMucHJveHkodGhpcy5pbnNlcnRfdGV4dCwgdGhpcyksIHRoaXMpO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3IuZGVsZXRlX2JhY2t3YXJkJywgdXRpbHMucHJveHkodGhpcy5kZWxldGVfYmFja3dhcmQsIHRoaXMpLCB0aGlzKTtcbiAgICByZWdpc3RlcignY3Vyc29yLmRlbGV0ZV9mb3J3YXJkJywgdXRpbHMucHJveHkodGhpcy5kZWxldGVfZm9yd2FyZCwgdGhpcyksIHRoaXMpO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3IuZGVsZXRlX3dvcmRfbGVmdCcsIHV0aWxzLnByb3h5KHRoaXMuZGVsZXRlX3dvcmRfbGVmdCwgdGhpcyksIHRoaXMpO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3IuZGVsZXRlX3dvcmRfcmlnaHQnLCB1dGlscy5wcm94eSh0aGlzLmRlbGV0ZV93b3JkX3JpZ2h0LCB0aGlzKSwgdGhpcyk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5zZWxlY3RfYWxsJywgdXRpbHMucHJveHkodGhpcy5zZWxlY3RfYWxsLCB0aGlzKSwgdGhpcyk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5sZWZ0JywgZnVuY3Rpb24oKSB7IHRoYXQubW92ZV9wcmltYXJ5KC0xLCAwLCB0cnVlKTsgdGhhdC5fcmVzZXRfc2Vjb25kYXJ5KCk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLnJpZ2h0JywgZnVuY3Rpb24oKSB7IHRoYXQubW92ZV9wcmltYXJ5KDEsIDAsIHRydWUpOyB0aGF0Ll9yZXNldF9zZWNvbmRhcnkoKTsgcmV0dXJuIHRydWU7IH0pO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3IudXAnLCBmdW5jdGlvbigpIHsgdGhhdC5tb3ZlX3ByaW1hcnkoMCwgLTEsIHRydWUpOyB0aGF0Ll9yZXNldF9zZWNvbmRhcnkoKTsgcmV0dXJuIHRydWU7IH0pO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3IuZG93bicsIGZ1bmN0aW9uKCkgeyB0aGF0Lm1vdmVfcHJpbWFyeSgwLCAxLCB0cnVlKTsgdGhhdC5fcmVzZXRfc2Vjb25kYXJ5KCk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLnNlbGVjdF9sZWZ0JywgZnVuY3Rpb24oKSB7IHRoYXQubW92ZV9wcmltYXJ5KC0xLCAwKTsgcmV0dXJuIHRydWU7IH0pO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3Iuc2VsZWN0X3JpZ2h0JywgZnVuY3Rpb24oKSB7IHRoYXQubW92ZV9wcmltYXJ5KDEsIDApOyByZXR1cm4gdHJ1ZTsgfSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5zZWxlY3RfdXAnLCBmdW5jdGlvbigpIHsgdGhhdC5tb3ZlX3ByaW1hcnkoMCwgLTEpOyByZXR1cm4gdHJ1ZTsgfSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5zZWxlY3RfZG93bicsIGZ1bmN0aW9uKCkgeyB0aGF0Lm1vdmVfcHJpbWFyeSgwLCAxKTsgcmV0dXJuIHRydWU7IH0pO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3Iud29yZF9sZWZ0JywgZnVuY3Rpb24oKSB7IHRoYXQud29yZF9wcmltYXJ5KC0xKTsgdGhhdC5fcmVzZXRfc2Vjb25kYXJ5KCk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLndvcmRfcmlnaHQnLCBmdW5jdGlvbigpIHsgdGhhdC53b3JkX3ByaW1hcnkoMSk7IHRoYXQuX3Jlc2V0X3NlY29uZGFyeSgpOyByZXR1cm4gdHJ1ZTsgfSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5zZWxlY3Rfd29yZF9sZWZ0JywgZnVuY3Rpb24oKSB7IHRoYXQud29yZF9wcmltYXJ5KC0xKTsgcmV0dXJuIHRydWU7IH0pO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3Iuc2VsZWN0X3dvcmRfcmlnaHQnLCBmdW5jdGlvbigpIHsgdGhhdC53b3JkX3ByaW1hcnkoMSk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLmxpbmVfc3RhcnQnLCBmdW5jdGlvbigpIHsgdGhhdC5wcmltYXJ5X2dvdG9fc3RhcnQoKTsgdGhhdC5fcmVzZXRfc2Vjb25kYXJ5KCk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLmxpbmVfZW5kJywgZnVuY3Rpb24oKSB7IHRoYXQucHJpbWFyeV9nb3RvX2VuZCgpOyB0aGF0Ll9yZXNldF9zZWNvbmRhcnkoKTsgcmV0dXJuIHRydWU7IH0pO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3Iuc2VsZWN0X2xpbmVfc3RhcnQnLCBmdW5jdGlvbigpIHsgdGhhdC5wcmltYXJ5X2dvdG9fc3RhcnQoKTsgcmV0dXJuIHRydWU7IH0pO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3Iuc2VsZWN0X2xpbmVfZW5kJywgZnVuY3Rpb24oKSB7IHRoYXQucHJpbWFyeV9nb3RvX2VuZCgpOyByZXR1cm4gdHJ1ZTsgfSk7XG59O1xuXG5leHBvcnRzLkN1cnNvciA9IEN1cnNvcjsiLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxudmFyIGtleW1hcCA9IHJlcXVpcmUoJy4vZXZlbnRzL21hcC5qcycpO1xudmFyIHJlZ2lzdGVyID0ga2V5bWFwLk1hcC5yZWdpc3RlcjtcblxudmFyIGN1cnNvciA9IHJlcXVpcmUoJy4vY3Vyc29yLmpzJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG4vKipcbiAqIE1hbmFnZXMgb25lIG9yIG1vcmUgY3Vyc29yc1xuICovXG52YXIgQ3Vyc29ycyA9IGZ1bmN0aW9uKG1vZGVsLCBjbGlwYm9hcmQsIGhpc3RvcnkpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX21vZGVsID0gbW9kZWw7XG4gICAgdGhpcy5nZXRfcm93X2NoYXIgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5jdXJzb3JzID0gW107XG4gICAgdGhpcy5fc2VsZWN0aW5nX3RleHQgPSBmYWxzZTtcbiAgICB0aGlzLl9jbGlwYm9hcmQgPSBjbGlwYm9hcmQ7XG4gICAgdGhpcy5fYWN0aXZlX2N1cnNvciA9IG51bGw7XG4gICAgdGhpcy5faGlzdG9yeSA9IGhpc3Rvcnk7XG5cbiAgICAvLyBDcmVhdGUgaW5pdGlhbCBjdXJzb3IuXG4gICAgdGhpcy5jcmVhdGUodW5kZWZpbmVkLCBmYWxzZSk7XG5cbiAgICAvLyBSZWdpc3RlciBhY3Rpb25zLlxuICAgIHJlZ2lzdGVyKCdjdXJzb3JzLl9jdXJzb3JfcHJveHknLCB1dGlscy5wcm94eSh0aGlzLl9jdXJzb3JfcHJveHksIHRoaXMpKTtcbiAgICByZWdpc3RlcignY3Vyc29ycy5jcmVhdGUnLCB1dGlscy5wcm94eSh0aGlzLmNyZWF0ZSwgdGhpcykpO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3JzLnNpbmdsZScsIHV0aWxzLnByb3h5KHRoaXMuc2luZ2xlLCB0aGlzKSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvcnMucG9wJywgdXRpbHMucHJveHkodGhpcy5wb3AsIHRoaXMpKTtcbiAgICByZWdpc3RlcignY3Vyc29ycy5zdGFydF9zZWxlY3Rpb24nLCB1dGlscy5wcm94eSh0aGlzLnN0YXJ0X3NlbGVjdGlvbiwgdGhpcykpO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3JzLnNldF9zZWxlY3Rpb24nLCB1dGlscy5wcm94eSh0aGlzLnNldF9zZWxlY3Rpb24sIHRoaXMpKTtcbiAgICByZWdpc3RlcignY3Vyc29ycy5zdGFydF9zZXRfc2VsZWN0aW9uJywgdXRpbHMucHJveHkodGhpcy5zdGFydF9zZXRfc2VsZWN0aW9uLCB0aGlzKSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvcnMuZW5kX3NlbGVjdGlvbicsIHV0aWxzLnByb3h5KHRoaXMuZW5kX3NlbGVjdGlvbiwgdGhpcykpO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3JzLnNlbGVjdF93b3JkJywgdXRpbHMucHJveHkodGhpcy5zZWxlY3Rfd29yZCwgdGhpcykpO1xuXG4gICAgLy8gQmluZCBjbGlwYm9hcmQgZXZlbnRzLlxuICAgIHRoaXMuX2NsaXBib2FyZC5vbignY3V0JywgdXRpbHMucHJveHkodGhpcy5faGFuZGxlX2N1dCwgdGhpcykpO1xuICAgIHRoaXMuX2NsaXBib2FyZC5vbignY29weScsIHV0aWxzLnByb3h5KHRoaXMuX2hhbmRsZV9jb3B5LCB0aGlzKSk7XG4gICAgdGhpcy5fY2xpcGJvYXJkLm9uKCdwYXN0ZScsIHV0aWxzLnByb3h5KHRoaXMuX2hhbmRsZV9wYXN0ZSwgdGhpcykpO1xufTtcbnV0aWxzLmluaGVyaXQoQ3Vyc29ycywgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vKipcbiAqIEhhbmRsZXMgaGlzdG9yeSBwcm94eSBldmVudHMgZm9yIGluZGl2aWR1YWwgY3Vyc29ycy5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IGN1cnNvcl9pbmRleFxuICogQHBhcmFtICB7c3RyaW5nfSBmdW5jdGlvbl9uYW1lXG4gKiBAcGFyYW0gIHthcnJheX0gZnVuY3Rpb25fcGFyYW1zXG4gKi9cbkN1cnNvcnMucHJvdG90eXBlLl9jdXJzb3JfcHJveHkgPSBmdW5jdGlvbihjdXJzb3JfaW5kZXgsIGZ1bmN0aW9uX25hbWUsIGZ1bmN0aW9uX3BhcmFtcykge1xuICAgIGlmIChjdXJzb3JfaW5kZXggPCB0aGlzLmN1cnNvcnMubGVuZ3RoKSB7XG4gICAgICAgIHZhciBjdXJzb3IgPSB0aGlzLmN1cnNvcnNbY3Vyc29yX2luZGV4XTtcbiAgICAgICAgY3Vyc29yW2Z1bmN0aW9uX25hbWVdLmFwcGx5KGN1cnNvciwgZnVuY3Rpb25fcGFyYW1zKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYSBjdXJzb3IgYW5kIG1hbmFnZXMgaXQuXG4gKiBAcGFyYW0ge29iamVjdH0gW3N0YXRlXSBzdGF0ZSB0byBhcHBseSB0byB0aGUgbmV3IGN1cnNvci5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW3JldmVyc2FibGVdIC0gZGVmYXVsdHMgdG8gdHJ1ZSwgaXMgYWN0aW9uIHJldmVyc2FibGUuXG4gKiBAcmV0dXJuIHtDdXJzb3J9IGN1cnNvclxuICovXG5DdXJzb3JzLnByb3RvdHlwZS5jcmVhdGUgPSBmdW5jdGlvbihzdGF0ZSwgcmV2ZXJzYWJsZSkge1xuICAgIC8vIFJlY29yZCB0aGlzIGFjdGlvbiBpbiBoaXN0b3J5LlxuICAgIGlmIChyZXZlcnNhYmxlID09PSB1bmRlZmluZWQgfHwgcmV2ZXJzYWJsZSA9PT0gdHJ1ZSkge1xuICAgICAgICB0aGlzLl9oaXN0b3J5LnB1c2hfYWN0aW9uKCdjdXJzb3JzLmNyZWF0ZScsIGFyZ3VtZW50cywgJ2N1cnNvcnMucG9wJywgW10pO1xuICAgIH1cblxuICAgIC8vIENyZWF0ZSBhIHByb3h5aW5nIGhpc3RvcnkgbWV0aG9kIGZvciB0aGUgY3Vyc29yIGl0c2VsZi5cbiAgICB2YXIgaW5kZXggPSB0aGlzLmN1cnNvcnMubGVuZ3RoO1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB2YXIgaGlzdG9yeV9wcm94eSA9IGZ1bmN0aW9uKGZvcndhcmRfbmFtZSwgZm9yd2FyZF9wYXJhbXMsIGJhY2t3YXJkX25hbWUsIGJhY2t3YXJkX3BhcmFtcywgYXV0b2dyb3VwX2RlbGF5KSB7XG4gICAgICAgIHRoYXQuX2hpc3RvcnkucHVzaF9hY3Rpb24oXG4gICAgICAgICAgICAnY3Vyc29ycy5fY3Vyc29yX3Byb3h5JywgW2luZGV4LCBmb3J3YXJkX25hbWUsIGZvcndhcmRfcGFyYW1zXSxcbiAgICAgICAgICAgICdjdXJzb3JzLl9jdXJzb3JfcHJveHknLCBbaW5kZXgsIGJhY2t3YXJkX25hbWUsIGJhY2t3YXJkX3BhcmFtc10sXG4gICAgICAgICAgICBhdXRvZ3JvdXBfZGVsYXkpO1xuICAgIH07XG5cbiAgICAvLyBDcmVhdGUgdGhlIGN1cnNvci5cbiAgICB2YXIgbmV3X2N1cnNvciA9IG5ldyBjdXJzb3IuQ3Vyc29yKHRoaXMuX21vZGVsLCBoaXN0b3J5X3Byb3h5KTtcbiAgICB0aGlzLmN1cnNvcnMucHVzaChuZXdfY3Vyc29yKTtcblxuICAgIC8vIFNldCB0aGUgaW5pdGlhbCBwcm9wZXJ0aWVzIG9mIHRoZSBjdXJzb3IuXG4gICAgbmV3X2N1cnNvci5zZXRfc3RhdGUoc3RhdGUsIGZhbHNlKTtcblxuICAgIC8vIExpc3RlbiBmb3IgY3Vyc29yIGNoYW5nZSBldmVudHMuXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIG5ld19jdXJzb3Iub24oJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGF0LnRyaWdnZXIoJ2NoYW5nZScsIG5ld19jdXJzb3IpO1xuICAgICAgICB0aGF0Ll91cGRhdGVfc2VsZWN0aW9uKCk7XG4gICAgfSk7XG4gICAgdGhhdC50cmlnZ2VyKCdjaGFuZ2UnLCBuZXdfY3Vyc29yKTtcblxuICAgIHJldHVybiBuZXdfY3Vyc29yO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgZXZlcnkgY3Vyc29yIGV4Y2VwdCBmb3IgdGhlIGZpcnN0IG9uZS5cbiAqL1xuQ3Vyc29ycy5wcm90b3R5cGUuc2luZ2xlID0gZnVuY3Rpb24oKSB7XG4gICAgd2hpbGUgKHRoaXMuY3Vyc29ycy5sZW5ndGggPiAxKSB7XG4gICAgICAgIHRoaXMucG9wKCk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBSZW1vdmUgdGhlIGxhc3QgY3Vyc29yLlxuICogQHJldHVybnMge0N1cnNvcn0gbGFzdCBjdXJzb3Igb3IgbnVsbFxuICovXG5DdXJzb3JzLnByb3RvdHlwZS5wb3AgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5jdXJzb3JzLmxlbmd0aCA+IDEpIHtcblxuICAgICAgICAvLyBSZW1vdmUgdGhlIGxhc3QgY3Vyc29yIGFuZCB1bnJlZ2lzdGVyIGl0LlxuICAgICAgICB2YXIgY3Vyc29yID0gdGhpcy5jdXJzb3JzLnBvcCgpO1xuICAgICAgICBjdXJzb3IudW5yZWdpc3RlcigpO1xuICAgICAgICBjdXJzb3Iub2ZmKCdjaGFuZ2UnKTtcblxuICAgICAgICAvLyBSZWNvcmQgdGhpcyBhY3Rpb24gaW4gaGlzdG9yeS5cbiAgICAgICAgdGhpcy5faGlzdG9yeS5wdXNoX2FjdGlvbignY3Vyc29ycy5wb3AnLCBbXSwgJ2N1cnNvcnMuY3JlYXRlJywgW2N1cnNvci5nZXRfc3RhdGUoKV0pO1xuXG4gICAgICAgIC8vIEFsZXJ0IGxpc3RlbmVycyBvZiBjaGFuZ2VzLlxuICAgICAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICByZXR1cm4gY3Vyc29yO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIHRoZSBzZWxlY3RlZCB0ZXh0IGlzIGNvcGllZCB0byB0aGUgY2xpcGJvYXJkLlxuICogQHBhcmFtICB7c3RyaW5nfSB0ZXh0IC0gYnkgdmFsIHRleHQgdGhhdCB3YXMgY3V0XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3JzLnByb3RvdHlwZS5faGFuZGxlX2NvcHkgPSBmdW5jdGlvbih0ZXh0KSB7XG4gICAgdGhpcy5jdXJzb3JzLmZvckVhY2goZnVuY3Rpb24oY3Vyc29yKSB7XG4gICAgICAgIGN1cnNvci5jb3B5KCk7XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgd2hlbiB0aGUgc2VsZWN0ZWQgdGV4dCBpcyBjdXQgdG8gdGhlIGNsaXBib2FyZC5cbiAqIEBwYXJhbSAge3N0cmluZ30gdGV4dCAtIGJ5IHZhbCB0ZXh0IHRoYXQgd2FzIGN1dFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29ycy5wcm90b3R5cGUuX2hhbmRsZV9jdXQgPSBmdW5jdGlvbih0ZXh0KSB7XG4gICAgdGhpcy5jdXJzb3JzLmZvckVhY2goZnVuY3Rpb24oY3Vyc29yKSB7XG4gICAgICAgIGN1cnNvci5jdXQoKTtcbiAgICB9KTtcbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIHRleHQgaXMgcGFzdGVkIGludG8gdGhlIGRvY3VtZW50LlxuICogQHBhcmFtICB7c3RyaW5nfSB0ZXh0XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3JzLnByb3RvdHlwZS5faGFuZGxlX3Bhc3RlID0gZnVuY3Rpb24odGV4dCkge1xuXG4gICAgLy8gSWYgdGhlIG1vZHVsdXMgb2YgdGhlIG51bWJlciBvZiBjdXJzb3JzIGFuZCB0aGUgbnVtYmVyIG9mIHBhc3RlZCBsaW5lc1xuICAgIC8vIG9mIHRleHQgaXMgemVybywgc3BsaXQgdGhlIGN1dCBsaW5lcyBhbW9uZyB0aGUgY3Vyc29ycy5cbiAgICB2YXIgbGluZXMgPSB0ZXh0LnNwbGl0KCdcXG4nKTtcbiAgICBpZiAodGhpcy5jdXJzb3JzLmxlbmd0aCA+IDEgJiYgbGluZXMubGVuZ3RoID4gMSAmJiBsaW5lcy5sZW5ndGggJSB0aGlzLmN1cnNvcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHZhciBsaW5lc19wZXJfY3Vyc29yID0gbGluZXMubGVuZ3RoIC8gdGhpcy5jdXJzb3JzLmxlbmd0aDtcbiAgICAgICAgdGhpcy5jdXJzb3JzLmZvckVhY2goZnVuY3Rpb24oY3Vyc29yLCBpbmRleCkge1xuICAgICAgICAgICAgY3Vyc29yLmluc2VydF90ZXh0KGxpbmVzLnNsaWNlKFxuICAgICAgICAgICAgICAgIGluZGV4ICogbGluZXNfcGVyX2N1cnNvciwgXG4gICAgICAgICAgICAgICAgaW5kZXggKiBsaW5lc19wZXJfY3Vyc29yICsgbGluZXNfcGVyX2N1cnNvcikuam9pbignXFxuJykpO1xuICAgICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmN1cnNvcnMuZm9yRWFjaChmdW5jdGlvbihjdXJzb3IpIHtcbiAgICAgICAgICAgIGN1cnNvci5wYXN0ZSh0ZXh0KTtcbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBVcGRhdGUgdGhlIGNsaXBwYWJsZSB0ZXh0IGJhc2VkIG9uIG5ldyBzZWxlY3Rpb24uXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3JzLnByb3RvdHlwZS5fdXBkYXRlX3NlbGVjdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgIFxuICAgIC8vIENvcHkgYWxsIG9mIHRoZSBzZWxlY3RlZCB0ZXh0LlxuICAgIHZhciBzZWxlY3Rpb25zID0gW107XG4gICAgdGhpcy5jdXJzb3JzLmZvckVhY2goZnVuY3Rpb24oY3Vyc29yKSB7XG4gICAgICAgIHNlbGVjdGlvbnMucHVzaChjdXJzb3IuZ2V0KCkpO1xuICAgIH0pO1xuXG4gICAgLy8gTWFrZSB0aGUgY29waWVkIHRleHQgY2xpcHBhYmxlLlxuICAgIHRoaXMuX2NsaXBib2FyZC5zZXRfY2xpcHBhYmxlKHNlbGVjdGlvbnMuam9pbignXFxuJykpO1xufTtcblxuLyoqXG4gKiBTdGFydHMgc2VsZWN0aW5nIHRleHQgZnJvbSBtb3VzZSBjb29yZGluYXRlcy5cbiAqIEBwYXJhbSAge01vdXNlRXZlbnR9IGUgLSBtb3VzZSBldmVudCBjb250YWluaW5nIHRoZSBjb29yZGluYXRlcy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvcnMucHJvdG90eXBlLnN0YXJ0X3NlbGVjdGlvbiA9IGZ1bmN0aW9uKGUpIHtcbiAgICB2YXIgeCA9IGUub2Zmc2V0WDtcbiAgICB2YXIgeSA9IGUub2Zmc2V0WTtcblxuICAgIHRoaXMuX3NlbGVjdGluZ190ZXh0ID0gdHJ1ZTtcbiAgICBpZiAodGhpcy5nZXRfcm93X2NoYXIpIHtcbiAgICAgICAgdmFyIGxvY2F0aW9uID0gdGhpcy5nZXRfcm93X2NoYXIoeCwgeSk7XG4gICAgICAgIHRoaXMuY3Vyc29yc1swXS5zZXRfYm90aChsb2NhdGlvbi5yb3dfaW5kZXgsIGxvY2F0aW9uLmNoYXJfaW5kZXgpO1xuICAgIH1cbn07XG5cbi8qKlxuICogRmluYWxpemVzIHRoZSBzZWxlY3Rpb24gb2YgdGV4dC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvcnMucHJvdG90eXBlLmVuZF9zZWxlY3Rpb24gPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9zZWxlY3RpbmdfdGV4dCA9IGZhbHNlO1xufTtcblxuLyoqXG4gKiBTZXRzIHRoZSBlbmRwb2ludCBvZiB0ZXh0IHNlbGVjdGlvbiBmcm9tIG1vdXNlIGNvb3JkaW5hdGVzLlxuICogQHBhcmFtICB7TW91c2VFdmVudH0gZSAtIG1vdXNlIGV2ZW50IGNvbnRhaW5pbmcgdGhlIGNvb3JkaW5hdGVzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29ycy5wcm90b3R5cGUuc2V0X3NlbGVjdGlvbiA9IGZ1bmN0aW9uKGUpIHtcbiAgICB2YXIgeCA9IGUub2Zmc2V0WDtcbiAgICB2YXIgeSA9IGUub2Zmc2V0WTtcbiAgICBpZiAodGhpcy5fc2VsZWN0aW5nX3RleHQgJiYgdGhpcy5nZXRfcm93X2NoYXIpIHtcbiAgICAgICAgdmFyIGxvY2F0aW9uID0gdGhpcy5nZXRfcm93X2NoYXIoeCwgeSk7XG4gICAgICAgIHRoaXMuY3Vyc29yc1t0aGlzLmN1cnNvcnMubGVuZ3RoLTFdLnNldF9wcmltYXJ5KGxvY2F0aW9uLnJvd19pbmRleCwgbG9jYXRpb24uY2hhcl9pbmRleCk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBTZXRzIHRoZSBlbmRwb2ludCBvZiB0ZXh0IHNlbGVjdGlvbiBmcm9tIG1vdXNlIGNvb3JkaW5hdGVzLlxuICogRGlmZmVyZW50IHRoYW4gc2V0X3NlbGVjdGlvbiBiZWNhdXNlIGl0IGRvZXNuJ3QgbmVlZCBhIGNhbGxcbiAqIHRvIHN0YXJ0X3NlbGVjdGlvbiB0byB3b3JrLlxuICogQHBhcmFtICB7TW91c2VFdmVudH0gZSAtIG1vdXNlIGV2ZW50IGNvbnRhaW5pbmcgdGhlIGNvb3JkaW5hdGVzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29ycy5wcm90b3R5cGUuc3RhcnRfc2V0X3NlbGVjdGlvbiA9IGZ1bmN0aW9uKGUpIHtcbiAgICB0aGlzLl9zZWxlY3RpbmdfdGV4dCA9IHRydWU7XG4gICAgdGhpcy5zZXRfc2VsZWN0aW9uKGUpO1xufTtcblxuLyoqXG4gKiBTZWxlY3RzIGEgd29yZCBhdCB0aGUgZ2l2ZW4gbW91c2UgY29vcmRpbmF0ZXMuXG4gKiBAcGFyYW0gIHtNb3VzZUV2ZW50fSBlIC0gbW91c2UgZXZlbnQgY29udGFpbmluZyB0aGUgY29vcmRpbmF0ZXMuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3JzLnByb3RvdHlwZS5zZWxlY3Rfd29yZCA9IGZ1bmN0aW9uKGUpIHtcbiAgICB2YXIgeCA9IGUub2Zmc2V0WDtcbiAgICB2YXIgeSA9IGUub2Zmc2V0WTtcbiAgICBpZiAodGhpcy5nZXRfcm93X2NoYXIpIHtcbiAgICAgICAgdmFyIGxvY2F0aW9uID0gdGhpcy5nZXRfcm93X2NoYXIoeCwgeSk7XG4gICAgICAgIHRoaXMuY3Vyc29yc1t0aGlzLmN1cnNvcnMubGVuZ3RoLTFdLnNlbGVjdF93b3JkKGxvY2F0aW9uLnJvd19pbmRleCwgbG9jYXRpb24uY2hhcl9pbmRleCk7XG4gICAgfVxufTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5DdXJzb3JzID0gQ3Vyc29ycztcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcbnZhciBub3JtYWxpemVyID0gcmVxdWlyZSgnLi9ldmVudHMvbm9ybWFsaXplci5qcycpO1xudmFyIGtleW1hcCA9IHJlcXVpcmUoJy4vZXZlbnRzL21hcC5qcycpO1xudmFyIGRlZmF1bHRfa2V5bWFwID0gcmVxdWlyZSgnLi9ldmVudHMvZGVmYXVsdC5qcycpO1xudmFyIGN1cnNvcnMgPSByZXF1aXJlKCcuL2N1cnNvcnMuanMnKTtcbnZhciBjbGlwYm9hcmQgPSByZXF1aXJlKCcuL2NsaXBib2FyZC5qcycpO1xudmFyIGhpc3RvcnkgPSByZXF1aXJlKCcuL2hpc3RvcnkuanMnKTtcblxuLyoqXG4gKiBDb250cm9sbGVyIGZvciBhIERvY3VtZW50TW9kZWwuXG4gKi9cbnZhciBEb2N1bWVudENvbnRyb2xsZXIgPSBmdW5jdGlvbihlbCwgbW9kZWwpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuY2xpcGJvYXJkID0gbmV3IGNsaXBib2FyZC5DbGlwYm9hcmQoZWwpO1xuICAgIHRoaXMubm9ybWFsaXplciA9IG5ldyBub3JtYWxpemVyLk5vcm1hbGl6ZXIoKTtcbiAgICB0aGlzLm5vcm1hbGl6ZXIubGlzdGVuX3RvKGVsKTtcbiAgICB0aGlzLm5vcm1hbGl6ZXIubGlzdGVuX3RvKHRoaXMuY2xpcGJvYXJkLmhpZGRlbl9pbnB1dCk7XG4gICAgdGhpcy5tYXAgPSBuZXcga2V5bWFwLk1hcCh0aGlzLm5vcm1hbGl6ZXIpO1xuICAgIHRoaXMubWFwLm1hcChkZWZhdWx0X2tleW1hcC5tYXApO1xuICAgIHRoaXMuaGlzdG9yeSA9IG5ldyBoaXN0b3J5Lkhpc3RvcnkodGhpcy5tYXApXG4gICAgdGhpcy5jdXJzb3JzID0gbmV3IGN1cnNvcnMuQ3Vyc29ycyhtb2RlbCwgdGhpcy5jbGlwYm9hcmQsIHRoaXMuaGlzdG9yeSk7XG59O1xudXRpbHMuaW5oZXJpdChEb2N1bWVudENvbnRyb2xsZXIsIHV0aWxzLlBvc3RlckNsYXNzKTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5Eb2N1bWVudENvbnRyb2xsZXIgPSBEb2N1bWVudENvbnRyb2xsZXI7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG5cbi8qKlxuICogTW9kZWwgY29udGFpbmluZyBhbGwgb2YgdGhlIGRvY3VtZW50J3MgZGF0YSAodGV4dCkuXG4gKi9cbnZhciBEb2N1bWVudE1vZGVsID0gZnVuY3Rpb24oKSB7XG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzKTtcbiAgICB0aGlzLl9yb3dzID0gW107XG4gICAgdGhpcy5fcm93X3RhZ3MgPSBbXTtcbiAgICB0aGlzLl90YWdfbG9jayA9IDA7XG4gICAgdGhpcy5fcGVuZGluZ190YWdfZXZlbnRzID0gZmFsc2U7XG4gICAgdGhpcy5faW5pdF9wcm9wZXJ0aWVzKCk7XG59O1xudXRpbHMuaW5oZXJpdChEb2N1bWVudE1vZGVsLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8qKlxuICogQWNxdWlyZSBhIGxvY2sgb24gdGFnIGV2ZW50c1xuICpcbiAqIFByZXZlbnRzIHRhZyBldmVudHMgZnJvbSBmaXJpbmcuXG4gKiBAcmV0dXJuIHtpbnRlZ2VyfSBsb2NrIGNvdW50XG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLmFjcXVpcmVfdGFnX2V2ZW50X2xvY2sgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fdGFnX2xvY2srKztcbn07XG5cbi8qKlxuICogUmVsZWFzZSBhIGxvY2sgb24gdGFnIGV2ZW50c1xuICogQHJldHVybiB7aW50ZWdlcn0gbG9jayBjb3VudFxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5yZWxlYXNlX3RhZ19ldmVudF9sb2NrID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fdGFnX2xvY2stLTtcbiAgICBpZiAodGhpcy5fdGFnX2xvY2sgPCAwKSB7XG4gICAgICAgIHRoaXMuX3RhZ19sb2NrID0gMDtcbiAgICB9XG4gICAgaWYgKHRoaXMuX3RhZ19sb2NrID09PSAwICYmIHRoaXMuX3BlbmRpbmdfdGFnX2V2ZW50cykge1xuICAgICAgICB0aGlzLl9wZW5kaW5nX3RhZ19ldmVudHMgPSBmYWxzZTtcbiAgICAgICAgdGhpcy50cmlnZ2VyX3RhZ19ldmVudHMoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX3RhZ19sb2NrO1xufTtcblxuLyoqXG4gKiBUcmlnZ2VycyB0aGUgdGFnIGNoYW5nZSBldmVudHMuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS50cmlnZ2VyX3RhZ19ldmVudHMgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5fdGFnX2xvY2sgPT09IDApIHtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCd0YWdzX2NoYW5nZWQnKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2VkJyk7ICAgIFxuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3BlbmRpbmdfdGFnX2V2ZW50cyA9IHRydWU7XG4gICAgfVxufTtcblxuLyoqXG4gKiBTZXRzIGEgJ3RhZycgb24gdGhlIHRleHQgc3BlY2lmaWVkLlxuICogQHBhcmFtIHtpbnRlZ2VyfSBzdGFydF9yb3cgLSByb3cgdGhlIHRhZyBzdGFydHMgb25cbiAqIEBwYXJhbSB7aW50ZWdlcn0gc3RhcnRfY2hhciAtIGluZGV4LCBpbiB0aGUgcm93LCBvZiB0aGUgZmlyc3QgdGFnZ2VkIGNoYXJhY3RlclxuICogQHBhcmFtIHtpbnRlZ2VyfSBlbmRfcm93IC0gcm93IHRoZSB0YWcgZW5kcyBvblxuICogQHBhcmFtIHtpbnRlZ2VyfSBlbmRfY2hhciAtIGluZGV4LCBpbiB0aGUgcm93LCBvZiB0aGUgbGFzdCB0YWdnZWQgY2hhcmFjdGVyXG4gKiBAcGFyYW0ge3N0cmluZ30gdGFnX25hbWVcbiAqIEBwYXJhbSB7YW55fSB0YWdfdmFsdWUgLSBvdmVycmlkZXMgYW55IHByZXZpb3VzIHRhZ3NcbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUuc2V0X3RhZyA9IGZ1bmN0aW9uKHN0YXJ0X3Jvdywgc3RhcnRfY2hhciwgZW5kX3JvdywgZW5kX2NoYXIsIHRhZ19uYW1lLCB0YWdfdmFsdWUpIHtcbiAgICB2YXIgY29vcmRzID0gdGhpcy52YWxpZGF0ZV9jb29yZHMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICBmb3IgKHZhciByb3cgPSBjb29yZHMuc3RhcnRfcm93OyByb3cgPD0gY29vcmRzLmVuZF9yb3c7IHJvdysrKSB7XG4gICAgICAgIHZhciBzdGFydCA9IGNvb3Jkcy5zdGFydF9jaGFyO1xuICAgICAgICB2YXIgZW5kID0gY29vcmRzLmVuZF9jaGFyO1xuICAgICAgICBpZiAocm93ID4gY29vcmRzLnN0YXJ0X3JvdykgeyBzdGFydCA9IC0xOyB9XG4gICAgICAgIGlmIChyb3cgPCBjb29yZHMuZW5kX3JvdykgeyBlbmQgPSAtMTsgfVxuXG4gICAgICAgIC8vIFJlbW92ZSBvciBtb2RpZnkgY29uZmxpY3RpbmcgdGFncy5cbiAgICAgICAgdmFyIGFkZF90YWdzID0gW107XG4gICAgICAgIHRoaXMuX3Jvd190YWdzW3Jvd10uZmlsdGVyKGZ1bmN0aW9uKHRhZykge1xuICAgICAgICAgICAgaWYgKHRhZy5uYW1lID09IHRhZ19uYW1lKSB7XG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGFnIGlzIHdpdGhpblxuICAgICAgICAgICAgICAgIGlmIChzdGFydCA9PSAtMSAmJiBlbmQgPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodGFnLnN0YXJ0ID49IHN0YXJ0ICYmICh0YWcuZW5kIDwgZW5kIHx8IGVuZCA9PSAtMSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0YWcgaXMgb3V0c2lkZVxuICAgICAgICAgICAgICAgIC8vIFRvIHRoZSByaWdodD9cbiAgICAgICAgICAgICAgICBpZiAodGFnLnN0YXJ0ID4gZW5kICYmIGVuZCAhPSAtMSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gVG8gdGhlIGxlZnQ/XG4gICAgICAgICAgICAgICAgaWYgKHRhZy5lbmQgPCBzdGFydCAmJiB0YWcuZW5kICE9IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRhZyBlbmNhcHN1bGF0ZXNcbiAgICAgICAgICAgICAgICB2YXIgbGVmdF9pbnRlcnNlY3RpbmcgPSB0YWcuc3RhcnQgPCBzdGFydDtcbiAgICAgICAgICAgICAgICB2YXIgcmlnaHRfaW50ZXJzZWN0aW5nID0gZW5kICE9IC0xICYmICh0YWcuZW5kID09IC0xIHx8IHRhZy5lbmQgPiBlbmQpO1xuXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGFnIGlzIGxlZnQgaW50ZXJzZWN0aW5nXG4gICAgICAgICAgICAgICAgaWYgKGxlZnRfaW50ZXJzZWN0aW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIGFkZF90YWdzLnB1c2goe25hbWU6IHRhZ19uYW1lLCB2YWx1ZTogdGFnLnZhbHVlLCBzdGFydDogdGFnLnN0YXJ0LCBlbmQ6IHN0YXJ0LTF9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0YWcgaXMgcmlnaHQgaW50ZXJzZWN0aW5nXG4gICAgICAgICAgICAgICAgaWYgKHJpZ2h0X2ludGVyc2VjdGluZykge1xuICAgICAgICAgICAgICAgICAgICBhZGRfdGFncy5wdXNoKHtuYW1lOiB0YWdfbmFtZSwgdmFsdWU6IHRhZy52YWx1ZSwgc3RhcnQ6IGVuZCsxLCBlbmQ6IHRhZy5lbmR9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCB0YWdzIGFuZCBjb3JyZWN0ZWQgdGFncy5cbiAgICAgICAgdGhpcy5fcm93X3RhZ3Nbcm93XSA9IHRoaXMuX3Jvd190YWdzW3Jvd10uY29uY2F0KGFkZF90YWdzKTtcbiAgICAgICAgdGhpcy5fcm93X3RhZ3Nbcm93XS5wdXNoKHtuYW1lOiB0YWdfbmFtZSwgdmFsdWU6IHRhZ192YWx1ZSwgc3RhcnQ6IHN0YXJ0LCBlbmQ6IGVuZH0pO1xuICAgIH1cbiAgICB0aGlzLnRyaWdnZXJfdGFnX2V2ZW50cygpO1xufTtcblxuLyoqXG4gKiBSZW1vdmVkIGFsbCBvZiB0aGUgdGFncyBvbiB0aGUgZG9jdW1lbnQuXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBzdGFydF9yb3dcbiAqIEBwYXJhbSAge2ludGVnZXJ9IGVuZF9yb3dcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLmNsZWFyX3RhZ3MgPSBmdW5jdGlvbihzdGFydF9yb3csIGVuZF9yb3cpIHtcbiAgICBzdGFydF9yb3cgPSBzdGFydF9yb3cgIT09IHVuZGVmaW5lZCA/IHN0YXJ0X3JvdyA6IDA7XG4gICAgZW5kX3JvdyA9IGVuZF9yb3cgIT09IHVuZGVmaW5lZCA/IGVuZF9yb3cgOiB0aGlzLl9yb3dfdGFncy5sZW5ndGggLSAxO1xuICAgIGZvciAodmFyIGkgPSBzdGFydF9yb3c7IGkgPD0gZW5kX3JvdzsgaSsrKSB7XG4gICAgICAgIHRoaXMuX3Jvd190YWdzW2ldID0gW107XG4gICAgfVxuICAgIHRoaXMudHJpZ2dlcl90YWdfZXZlbnRzKCk7XG59O1xuXG4vKipcbiAqIEdldCB0aGUgdGFncyBhcHBsaWVkIHRvIGEgY2hhcmFjdGVyLlxuICogQHBhcmFtICB7aW50ZWdlcn0gcm93X2luZGV4XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBjaGFyX2luZGV4XG4gKiBAcmV0dXJuIHtkaWN0aW9uYXJ5fVxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5nZXRfdGFncyA9IGZ1bmN0aW9uKHJvd19pbmRleCwgY2hhcl9pbmRleCkge1xuICAgIHZhciBjb29yZHMgPSB0aGlzLnZhbGlkYXRlX2Nvb3Jkcy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIHZhciB0YWdzID0ge307XG4gICAgdGhpcy5fcm93X3RhZ3NbY29vcmRzLnN0YXJ0X3Jvd10uZm9yRWFjaChmdW5jdGlvbih0YWcpIHtcbiAgICAgICAgLy8gVGFnIHN0YXJ0IG9mIC0xIG1lYW5zIHRoZSB0YWcgY29udGludWVzIHRvIHRoZSBwcmV2aW91cyBsaW5lLlxuICAgICAgICB2YXIgYWZ0ZXJfc3RhcnQgPSAoY29vcmRzLnN0YXJ0X2NoYXIgPj0gdGFnLnN0YXJ0IHx8IHRhZy5zdGFydCA9PSAtMSk7XG4gICAgICAgIC8vIFRhZyBlbmQgb2YgLTEgbWVhbnMgdGhlIHRhZyBjb250aW51ZXMgdG8gdGhlIG5leHQgbGluZS5cbiAgICAgICAgdmFyIGJlZm9yZV9lbmQgPSAoY29vcmRzLnN0YXJ0X2NoYXIgPD0gdGFnLmVuZCB8fCB0YWcuZW5kID09IC0xKTtcbiAgICAgICAgaWYgKGFmdGVyX3N0YXJ0ICYmIGJlZm9yZV9lbmQpIHtcbiAgICAgICAgICAgIHRhZ3NbdGFnLm5hbWVdID0gdGFnLnZhbHVlO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHRhZ3M7XG59O1xuXG4vKipcbiAqIEFkZHMgdGV4dCBlZmZpY2llbnRseSBzb21ld2hlcmUgaW4gdGhlIGRvY3VtZW50LlxuICogQHBhcmFtIHtpbnRlZ2VyfSByb3dfaW5kZXggIFxuICogQHBhcmFtIHtpbnRlZ2VyfSBjaGFyX2luZGV4IFxuICogQHBhcmFtIHtzdHJpbmd9IHRleHRcbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUuYWRkX3RleHQgPSBmdW5jdGlvbihyb3dfaW5kZXgsIGNoYXJfaW5kZXgsIHRleHQpIHtcbiAgICB2YXIgY29vcmRzID0gdGhpcy52YWxpZGF0ZV9jb29yZHMuYXBwbHkodGhpcywgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwLDIpKTtcbiAgICB2YXIgb2xkX3RleHQgPSB0aGlzLl9yb3dzW2Nvb3Jkcy5zdGFydF9yb3ddO1xuICAgIC8vIElmIHRoZSB0ZXh0IGhhcyBhIG5ldyBsaW5lIGluIGl0LCBqdXN0IHJlLXNldFxuICAgIC8vIHRoZSByb3dzIGxpc3QuXG4gICAgaWYgKHRleHQuaW5kZXhPZignXFxuJykgIT0gLTEpIHtcbiAgICAgICAgdmFyIG5ld19yb3dzID0gW107XG4gICAgICAgIGlmIChjb29yZHMuc3RhcnRfcm93ID4gMCkge1xuICAgICAgICAgICAgbmV3X3Jvd3MgPSB0aGlzLl9yb3dzLnNsaWNlKDAsIGNvb3Jkcy5zdGFydF9yb3cpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIG9sZF9yb3dfc3RhcnQgPSBvbGRfdGV4dC5zdWJzdHJpbmcoMCwgY29vcmRzLnN0YXJ0X2NoYXIpO1xuICAgICAgICB2YXIgb2xkX3Jvd19lbmQgPSBvbGRfdGV4dC5zdWJzdHJpbmcoY29vcmRzLnN0YXJ0X2NoYXIpO1xuICAgICAgICB2YXIgc3BsaXRfdGV4dCA9IHRleHQuc3BsaXQoJ1xcbicpO1xuICAgICAgICBuZXdfcm93cy5wdXNoKG9sZF9yb3dfc3RhcnQgKyBzcGxpdF90ZXh0WzBdKTtcblxuICAgICAgICBpZiAoc3BsaXRfdGV4dC5sZW5ndGggPiAyKSB7XG4gICAgICAgICAgICBuZXdfcm93cyA9IG5ld19yb3dzLmNvbmNhdChzcGxpdF90ZXh0LnNsaWNlKDEsc3BsaXRfdGV4dC5sZW5ndGgtMSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgbmV3X3Jvd3MucHVzaChzcGxpdF90ZXh0W3NwbGl0X3RleHQubGVuZ3RoLTFdICsgb2xkX3Jvd19lbmQpO1xuXG4gICAgICAgIGlmIChjb29yZHMuc3RhcnRfcm93KzEgPCB0aGlzLl9yb3dzLmxlbmd0aCkge1xuICAgICAgICAgICAgbmV3X3Jvd3MgPSBuZXdfcm93cy5jb25jYXQodGhpcy5fcm93cy5zbGljZShjb29yZHMuc3RhcnRfcm93KzEpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX3Jvd3MgPSBuZXdfcm93cztcbiAgICAgICAgdGhpcy5fcmVzaXplZF9yb3dzKCk7XG4gICAgICAgIHRoaXMudHJpZ2dlcigncm93X2NoYW5nZWQnLCBvbGRfdGV4dCwgY29vcmRzLnN0YXJ0X3Jvdyk7XG4gICAgICAgIHRoaXMudHJpZ2dlcigncm93c19hZGRlZCcsIGNvb3Jkcy5zdGFydF9yb3cgKyAxLCBjb29yZHMuc3RhcnRfcm93ICsgc3BsaXRfdGV4dC5sZW5ndGggLSAxKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2VkJyk7XG5cbiAgICAvLyBUZXh0IGRvZXNuJ3QgaGF2ZSBhbnkgbmV3IGxpbmVzLCBqdXN0IG1vZGlmeSB0aGVcbiAgICAvLyBsaW5lIGFuZCB0aGVuIHRyaWdnZXIgdGhlIHJvdyBjaGFuZ2VkIGV2ZW50LlxuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3Jvd3NbY29vcmRzLnN0YXJ0X3Jvd10gPSBvbGRfdGV4dC5zdWJzdHJpbmcoMCwgY29vcmRzLnN0YXJ0X2NoYXIpICsgdGV4dCArIG9sZF90ZXh0LnN1YnN0cmluZyhjb29yZHMuc3RhcnRfY2hhcik7XG4gICAgICAgIHRoaXMudHJpZ2dlcigncm93X2NoYW5nZWQnLCBvbGRfdGV4dCwgY29vcmRzLnN0YXJ0X3Jvdyk7XG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgIH1cbn07XG5cbi8qKlxuICogUmVtb3ZlcyBhIGJsb2NrIG9mIHRleHQgZnJvbSB0aGUgZG9jdW1lbnRcbiAqIEBwYXJhbSAge2ludGVnZXJ9IHN0YXJ0X3Jvd1xuICogQHBhcmFtICB7aW50ZWdlcn0gc3RhcnRfY2hhclxuICogQHBhcmFtICB7aW50ZWdlcn0gZW5kX3Jvd1xuICogQHBhcmFtICB7aW50ZWdlcn0gZW5kX2NoYXJcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLnJlbW92ZV90ZXh0ID0gZnVuY3Rpb24oc3RhcnRfcm93LCBzdGFydF9jaGFyLCBlbmRfcm93LCBlbmRfY2hhcikge1xuICAgIHZhciBjb29yZHMgPSB0aGlzLnZhbGlkYXRlX2Nvb3Jkcy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIHZhciBvbGRfdGV4dCA9IHRoaXMuX3Jvd3NbY29vcmRzLnN0YXJ0X3Jvd107XG4gICAgaWYgKGNvb3Jkcy5zdGFydF9yb3cgPT0gY29vcmRzLmVuZF9yb3cpIHtcbiAgICAgICAgdGhpcy5fcm93c1tjb29yZHMuc3RhcnRfcm93XSA9IHRoaXMuX3Jvd3NbY29vcmRzLnN0YXJ0X3Jvd10uc3Vic3RyaW5nKDAsIGNvb3Jkcy5zdGFydF9jaGFyKSArIHRoaXMuX3Jvd3NbY29vcmRzLnN0YXJ0X3Jvd10uc3Vic3RyaW5nKGNvb3Jkcy5lbmRfY2hhcik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fcm93c1tjb29yZHMuc3RhcnRfcm93XSA9IHRoaXMuX3Jvd3NbY29vcmRzLnN0YXJ0X3Jvd10uc3Vic3RyaW5nKDAsIGNvb3Jkcy5zdGFydF9jaGFyKSArIHRoaXMuX3Jvd3NbY29vcmRzLmVuZF9yb3ddLnN1YnN0cmluZyhjb29yZHMuZW5kX2NoYXIpO1xuICAgIH1cblxuICAgIGlmIChjb29yZHMuZW5kX3JvdyAtIGNvb3Jkcy5zdGFydF9yb3cgPiAwKSB7XG4gICAgICAgIHZhciByb3dzX3JlbW92ZWQgPSB0aGlzLl9yb3dzLnNwbGljZShjb29yZHMuc3RhcnRfcm93ICsgMSwgY29vcmRzLmVuZF9yb3cgLSBjb29yZHMuc3RhcnRfcm93KTtcbiAgICAgICAgdGhpcy5fcmVzaXplZF9yb3dzKCk7XG5cbiAgICAgICAgLy8gSWYgdGhlcmUgYXJlIG1vcmUgZGVsZXRlZCByb3dzIHRoYW4gcm93cyByZW1haW5pbmcsIGl0XG4gICAgICAgIC8vIGlzIGZhc3RlciB0byBydW4gYSBjYWxjdWxhdGlvbiBvbiB0aGUgcmVtYWluaW5nIHJvd3MgdGhhblxuICAgICAgICAvLyB0byBydW4gaXQgb24gdGhlIHJvd3MgcmVtb3ZlZC5cbiAgICAgICAgaWYgKHJvd3NfcmVtb3ZlZC5sZW5ndGggPiB0aGlzLl9yb3dzLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy50cmlnZ2VyKCd0ZXh0X2NoYW5nZWQnKTtcbiAgICAgICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy50cmlnZ2VyKCdyb3dfY2hhbmdlZCcsIG9sZF90ZXh0LCBjb29yZHMuc3RhcnRfcm93KTtcbiAgICAgICAgICAgIHRoaXMudHJpZ2dlcigncm93c19yZW1vdmVkJywgcm93c19yZW1vdmVkKTtcbiAgICAgICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChjb29yZHMuZW5kX3JvdyA9PSBjb29yZHMuc3RhcnRfcm93KSB7XG4gICAgICAgIHRoaXMudHJpZ2dlcigncm93X2NoYW5nZWQnLCBvbGRfdGV4dCwgY29vcmRzLnN0YXJ0X3Jvdyk7XG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgIH1cbn07XG5cbi8qKlxuICogUmVtb3ZlIGEgcm93IGZyb20gdGhlIGRvY3VtZW50LlxuICogQHBhcmFtICB7aW50ZWdlcn0gcm93X2luZGV4XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5yZW1vdmVfcm93ID0gZnVuY3Rpb24ocm93X2luZGV4KSB7XG4gICAgaWYgKDAgPCByb3dfaW5kZXggJiYgcm93X2luZGV4IDwgdGhpcy5fcm93cy5sZW5ndGgpIHtcbiAgICAgICAgdmFyIHJvd3NfcmVtb3ZlZCA9IHRoaXMuX3Jvd3Muc3BsaWNlKHJvd19pbmRleCwgMSk7XG4gICAgICAgIHRoaXMuX3Jlc2l6ZWRfcm93cygpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ3Jvd3NfcmVtb3ZlZCcsIHJvd3NfcmVtb3ZlZCk7XG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgIH1cbn07XG5cbi8qKlxuICogR2V0cyBhIGNodW5rIG9mIHRleHQuXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBzdGFydF9yb3dcbiAqIEBwYXJhbSAge2ludGVnZXJ9IHN0YXJ0X2NoYXJcbiAqIEBwYXJhbSAge2ludGVnZXJ9IGVuZF9yb3dcbiAqIEBwYXJhbSAge2ludGVnZXJ9IGVuZF9jaGFyXG4gKiBAcmV0dXJuIHtzdHJpbmd9XG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLmdldF90ZXh0ID0gZnVuY3Rpb24oc3RhcnRfcm93LCBzdGFydF9jaGFyLCBlbmRfcm93LCBlbmRfY2hhcikge1xuICAgIHZhciBjb29yZHMgPSB0aGlzLnZhbGlkYXRlX2Nvb3Jkcy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIGlmIChjb29yZHMuc3RhcnRfcm93PT1jb29yZHMuZW5kX3Jvdykge1xuICAgICAgICByZXR1cm4gdGhpcy5fcm93c1tjb29yZHMuc3RhcnRfcm93XS5zdWJzdHJpbmcoY29vcmRzLnN0YXJ0X2NoYXIsIGNvb3Jkcy5lbmRfY2hhcik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHRleHQgPSBbXTtcbiAgICAgICAgdGV4dC5wdXNoKHRoaXMuX3Jvd3NbY29vcmRzLnN0YXJ0X3Jvd10uc3Vic3RyaW5nKGNvb3Jkcy5zdGFydF9jaGFyKSk7XG4gICAgICAgIGlmIChjb29yZHMuZW5kX3JvdyAtIGNvb3Jkcy5zdGFydF9yb3cgPiAxKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gY29vcmRzLnN0YXJ0X3JvdyArIDE7IGkgPCBjb29yZHMuZW5kX3JvdzsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGV4dC5wdXNoKHRoaXMuX3Jvd3NbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRleHQucHVzaCh0aGlzLl9yb3dzW2Nvb3Jkcy5lbmRfcm93XS5zdWJzdHJpbmcoMCwgY29vcmRzLmVuZF9jaGFyKSk7XG4gICAgICAgIHJldHVybiB0ZXh0LmpvaW4oJ1xcbicpO1xuICAgIH1cbn07XG5cbi8qKlxuICogQWRkIGEgcm93IHRvIHRoZSBkb2N1bWVudFxuICogQHBhcmFtIHtpbnRlZ2VyfSByb3dfaW5kZXhcbiAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gbmV3IHJvdydzIHRleHRcbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUuYWRkX3JvdyA9IGZ1bmN0aW9uKHJvd19pbmRleCwgdGV4dCkge1xuICAgIHZhciBuZXdfcm93cyA9IFtdO1xuICAgIGlmIChyb3dfaW5kZXggPiAwKSB7XG4gICAgICAgIG5ld19yb3dzID0gdGhpcy5fcm93cy5zbGljZSgwLCByb3dfaW5kZXgpO1xuICAgIH1cbiAgICBuZXdfcm93cy5wdXNoKHRleHQpO1xuICAgIGlmIChyb3dfaW5kZXggPCB0aGlzLl9yb3dzLmxlbmd0aCkge1xuICAgICAgICBuZXdfcm93cyA9IG5ld19yb3dzLmNvbmNhdCh0aGlzLl9yb3dzLnNsaWNlKHJvd19pbmRleCkpO1xuICAgIH1cblxuICAgIHRoaXMuX3Jvd3MgPSBuZXdfcm93cztcbiAgICB0aGlzLl9yZXNpemVkX3Jvd3MoKTtcbiAgICB0aGlzLnRyaWdnZXIoJ3Jvd3NfYWRkZWQnLCByb3dfaW5kZXgsIHJvd19pbmRleCk7XG4gICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2VkJyk7XG59O1xuXG4vKipcbiAqIFZhbGlkYXRlcyByb3csIGNoYXJhY3RlciBjb29yZGluYXRlcyBpbiB0aGUgZG9jdW1lbnQuXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBzdGFydF9yb3dcbiAqIEBwYXJhbSAge2ludGVnZXJ9IHN0YXJ0X2NoYXJcbiAqIEBwYXJhbSAge2ludGVnZXJ9IChvcHRpb25hbCkgZW5kX3Jvd1xuICogQHBhcmFtICB7aW50ZWdlcn0gKG9wdGlvbmFsKSBlbmRfY2hhclxuICogQHJldHVybiB7ZGljdGlvbmFyeX0gZGljdGlvbmFyeSBjb250YWluaW5nIHZhbGlkYXRlZCBjb29yZGluYXRlcyB7c3RhcnRfcm93LCBcbiAqICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0X2NoYXIsIGVuZF9yb3csIGVuZF9jaGFyfVxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS52YWxpZGF0ZV9jb29yZHMgPSBmdW5jdGlvbihzdGFydF9yb3csIHN0YXJ0X2NoYXIsIGVuZF9yb3csIGVuZF9jaGFyKSB7XG5cbiAgICAvLyBNYWtlIHN1cmUgdGhlIHZhbHVlcyBhcmVuJ3QgdW5kZWZpbmVkLlxuICAgIGlmIChzdGFydF9yb3cgPT09IHVuZGVmaW5lZCkgc3RhcnRfcm93ID0gMDtcbiAgICBpZiAoc3RhcnRfY2hhciA9PT0gdW5kZWZpbmVkKSBzdGFydF9jaGFyID0gMDtcbiAgICBpZiAoZW5kX3JvdyA9PT0gdW5kZWZpbmVkKSBlbmRfcm93ID0gc3RhcnRfcm93O1xuICAgIGlmIChlbmRfY2hhciA9PT0gdW5kZWZpbmVkKSBlbmRfY2hhciA9IHN0YXJ0X2NoYXI7XG5cbiAgICAvLyBNYWtlIHN1cmUgdGhlIHZhbHVlcyBhcmUgd2l0aGluIHRoZSBib3VuZHMgb2YgdGhlIGNvbnRlbnRzLlxuICAgIGlmICh0aGlzLl9yb3dzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBzdGFydF9yb3cgPSAwO1xuICAgICAgICBzdGFydF9jaGFyID0gMDtcbiAgICAgICAgZW5kX3JvdyA9IDA7XG4gICAgICAgIGVuZF9jaGFyID0gMDtcbiAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoc3RhcnRfcm93ID49IHRoaXMuX3Jvd3MubGVuZ3RoKSBzdGFydF9yb3cgPSB0aGlzLl9yb3dzLmxlbmd0aCAtIDE7XG4gICAgICAgIGlmIChzdGFydF9yb3cgPCAwKSBzdGFydF9yb3cgPSAwO1xuICAgICAgICBpZiAoZW5kX3JvdyA+PSB0aGlzLl9yb3dzLmxlbmd0aCkgZW5kX3JvdyA9IHRoaXMuX3Jvd3MubGVuZ3RoIC0gMTtcbiAgICAgICAgaWYgKGVuZF9yb3cgPCAwKSBlbmRfcm93ID0gMDtcblxuICAgICAgICBpZiAoc3RhcnRfY2hhciA+IHRoaXMuX3Jvd3Nbc3RhcnRfcm93XS5sZW5ndGgpIHN0YXJ0X2NoYXIgPSB0aGlzLl9yb3dzW3N0YXJ0X3Jvd10ubGVuZ3RoO1xuICAgICAgICBpZiAoc3RhcnRfY2hhciA8IDApIHN0YXJ0X2NoYXIgPSAwO1xuICAgICAgICBpZiAoZW5kX2NoYXIgPiB0aGlzLl9yb3dzW2VuZF9yb3ddLmxlbmd0aCkgZW5kX2NoYXIgPSB0aGlzLl9yb3dzW2VuZF9yb3ddLmxlbmd0aDtcbiAgICAgICAgaWYgKGVuZF9jaGFyIDwgMCkgZW5kX2NoYXIgPSAwO1xuICAgIH1cblxuICAgIC8vIE1ha2Ugc3VyZSB0aGUgc3RhcnQgaXMgYmVmb3JlIHRoZSBlbmQuXG4gICAgaWYgKHN0YXJ0X3JvdyA+IGVuZF9yb3cgfHwgKHN0YXJ0X3JvdyA9PSBlbmRfcm93ICYmIHN0YXJ0X2NoYXIgPiBlbmRfY2hhcikpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN0YXJ0X3JvdzogZW5kX3JvdyxcbiAgICAgICAgICAgIHN0YXJ0X2NoYXI6IGVuZF9jaGFyLFxuICAgICAgICAgICAgZW5kX3Jvdzogc3RhcnRfcm93LFxuICAgICAgICAgICAgZW5kX2NoYXI6IHN0YXJ0X2NoYXIsXG4gICAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN0YXJ0X3Jvdzogc3RhcnRfcm93LFxuICAgICAgICAgICAgc3RhcnRfY2hhcjogc3RhcnRfY2hhcixcbiAgICAgICAgICAgIGVuZF9yb3c6IGVuZF9yb3csXG4gICAgICAgICAgICBlbmRfY2hhcjogZW5kX2NoYXIsXG4gICAgICAgIH07XG4gICAgfVxufTtcblxuLyoqXG4gKiBHZXRzIHRoZSB0ZXh0IG9mIHRoZSBkb2N1bWVudC5cbiAqIEByZXR1cm4ge3N0cmluZ31cbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUuX2dldF90ZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3Jvd3Muam9pbignXFxuJyk7XG59O1xuXG4vKipcbiAqIFNldHMgdGhlIHRleHQgb2YgdGhlIGRvY3VtZW50LlxuICogQ29tcGxleGl0eSBPKE4pIGZvciBOIHJvd3NcbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZVxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5fc2V0X3RleHQgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHRoaXMuX3Jvd3MgPSB2YWx1ZS5zcGxpdCgnXFxuJyk7XG4gICAgdGhpcy5fcmVzaXplZF9yb3dzKCk7XG4gICAgdGhpcy50cmlnZ2VyKCd0ZXh0X2NoYW5nZWQnKTtcbiAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZWQnKTtcbn07XG5cbi8qKlxuICogVXBkYXRlcyBfcm93J3MgcGFydG5lciBhcnJheXMuXG4gKiBAcmV0dXJuIHtudWxsfSBcbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUuX3Jlc2l6ZWRfcm93cyA9IGZ1bmN0aW9uKCkge1xuXG4gICAgLy8gTWFrZSBzdXJlIHRoZXJlIGFyZSBhcyBtYW55IHRhZyByb3dzIGFzIHRoZXJlIGFyZSB0ZXh0IHJvd3MuXG4gICAgd2hpbGUgKHRoaXMuX3Jvd190YWdzLmxlbmd0aCA8IHRoaXMuX3Jvd3MubGVuZ3RoKSB7XG4gICAgICAgIHRoaXMuX3Jvd190YWdzLnB1c2goW10pO1xuICAgIH1cbiAgICBpZiAodGhpcy5fcm93X3RhZ3MubGVuZ3RoID4gdGhpcy5fcm93cy5sZW5ndGgpIHtcbiAgICAgICAgdGhpcy5fcm93X3RhZ3Muc3BsaWNlKHRoaXMuX3Jvd3MubGVuZ3RoLCB0aGlzLl9yb3dfdGFncy5sZW5ndGggLSB0aGlzLl9yb3dzLmxlbmd0aCk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBDcmVhdGUgdGhlIGRvY3VtZW50J3MgcHJvcGVydGllcy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLl9pbml0X3Byb3BlcnRpZXMgPSBmdW5jdGlvbigpIHsgICAgXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMucHJvcGVydHkoJ3Jvd3MnLCBmdW5jdGlvbigpIHsgXG4gICAgICAgIC8vIFJldHVybiBhIHNoYWxsb3cgY29weSBvZiB0aGUgYXJyYXkgc28gaXQgY2Fubm90IGJlIG1vZGlmaWVkLlxuICAgICAgICByZXR1cm4gW10uY29uY2F0KHRoYXQuX3Jvd3MpOyBcbiAgICB9KTtcbiAgICB0aGlzLnByb3BlcnR5KCd0ZXh0JywgXG4gICAgICAgIHV0aWxzLnByb3h5KHRoaXMuX2dldF90ZXh0LCB0aGlzKSwgXG4gICAgICAgIHV0aWxzLnByb3h5KHRoaXMuX3NldF90ZXh0LCB0aGlzKSk7XG59O1xuXG5leHBvcnRzLkRvY3VtZW50TW9kZWwgPSBEb2N1bWVudE1vZGVsOyIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcblxuLy8gUmVuZGVyZXJzXG52YXIgYmF0Y2ggPSByZXF1aXJlKCcuL3JlbmRlcmVycy9iYXRjaC5qcycpO1xudmFyIGhpZ2hsaWdodGVkX3JvdyA9IHJlcXVpcmUoJy4vcmVuZGVyZXJzL2hpZ2hsaWdodGVkX3Jvdy5qcycpO1xudmFyIGN1cnNvcnMgPSByZXF1aXJlKCcuL3JlbmRlcmVycy9jdXJzb3JzLmpzJyk7XG52YXIgc2VsZWN0aW9ucyA9IHJlcXVpcmUoJy4vcmVuZGVyZXJzL3NlbGVjdGlvbnMuanMnKTtcbnZhciBjb2xvciA9IHJlcXVpcmUoJy4vcmVuZGVyZXJzL2NvbG9yLmpzJyk7XG52YXIgaGlnaGxpZ2h0ZXIgPSByZXF1aXJlKCcuL2hpZ2hsaWdodGVycy9wcmlzbS5qcycpO1xuXG4vKipcbiAqIFZpc3VhbCByZXByZXNlbnRhdGlvbiBvZiBhIERvY3VtZW50TW9kZWwgaW5zdGFuY2VcbiAqIEBwYXJhbSB7Q2FudmFzfSBjYW52YXMgaW5zdGFuY2VcbiAqIEBwYXJhbSB7RG9jdW1lbnRNb2RlbH0gbW9kZWwgaW5zdGFuY2VcbiAqIEBwYXJhbSB7Q3Vyc29yc30gY3Vyc29yc19tb2RlbCBpbnN0YW5jZVxuICogQHBhcmFtIHtTdHlsZX0gc3R5bGUgLSBkZXNjcmliZXMgcmVuZGVyaW5nIHN0eWxlXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBoYXNfZm9jdXMgLSBmdW5jdGlvbiB0aGF0IGNoZWNrcyBpZiB0aGUgdGV4dCBhcmVhIGhhcyBmb2N1c1xuICovXG52YXIgRG9jdW1lbnRWaWV3ID0gZnVuY3Rpb24oY2FudmFzLCBtb2RlbCwgY3Vyc29yc19tb2RlbCwgc3R5bGUsIGhhc19mb2N1cykge1xuICAgIHRoaXMuX21vZGVsID0gbW9kZWw7XG5cbiAgICAvLyBDcmVhdGUgY2hpbGQgcmVuZGVyZXJzLlxuICAgIHZhciByb3dfcmVuZGVyZXIgPSBuZXcgaGlnaGxpZ2h0ZWRfcm93LkhpZ2hsaWdodGVkUm93UmVuZGVyZXIobW9kZWwsIGNhbnZhcywgc3R5bGUpO1xuICAgIHJvd19yZW5kZXJlci5tYXJnaW5fbGVmdCA9IDI7XG4gICAgcm93X3JlbmRlcmVyLm1hcmdpbl90b3AgPSAyO1xuICAgIHRoaXMucm93X3JlbmRlcmVyID0gcm93X3JlbmRlcmVyO1xuICAgIFxuICAgIC8vIE1ha2Ugc3VyZSBjaGFuZ2VzIG1hZGUgdG8gdGhlIGN1cnNvcihzKSBhcmUgd2l0aGluIHRoZSB2aXNpYmxlIHJlZ2lvbi5cbiAgICBjdXJzb3JzX21vZGVsLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbihjdXJzb3IpIHtcbiAgICAgICAgdmFyIHJvd19pbmRleCA9IGN1cnNvci5wcmltYXJ5X3JvdztcbiAgICAgICAgdmFyIGNoYXJfaW5kZXggPSBjdXJzb3IucHJpbWFyeV9jaGFyO1xuXG4gICAgICAgIHZhciB0b3AgPSByb3dfcmVuZGVyZXIuZ2V0X3Jvd190b3Aocm93X2luZGV4KTtcbiAgICAgICAgdmFyIGhlaWdodCA9IHJvd19yZW5kZXJlci5nZXRfcm93X2hlaWdodChyb3dfaW5kZXgpO1xuICAgICAgICB2YXIgbGVmdCA9IHJvd19yZW5kZXJlci5tZWFzdXJlX3BhcnRpYWxfcm93X3dpZHRoKHJvd19pbmRleCwgY2hhcl9pbmRleCkgKyByb3dfcmVuZGVyZXIubWFyZ2luX2xlZnQ7XG4gICAgICAgIHZhciBib3R0b20gPSB0b3AgKyBoZWlnaHQ7XG5cbiAgICAgICAgdmFyIGNhbnZhc19oZWlnaHQgPSBjYW52YXMuaGVpZ2h0IC0gMjA7XG4gICAgICAgIGlmIChib3R0b20gPiBjYW52YXMuc2Nyb2xsX3RvcCArIGNhbnZhc19oZWlnaHQpIHtcbiAgICAgICAgICAgIGNhbnZhcy5zY3JvbGxfdG9wID0gYm90dG9tIC0gY2FudmFzX2hlaWdodDtcbiAgICAgICAgfSBlbHNlIGlmICh0b3AgPCBjYW52YXMuc2Nyb2xsX3RvcCkge1xuICAgICAgICAgICAgY2FudmFzLnNjcm9sbF90b3AgPSB0b3A7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgY2FudmFzX3dpZHRoID0gY2FudmFzLndpZHRoIC0gMjA7XG4gICAgICAgIGlmIChsZWZ0ID4gY2FudmFzLnNjcm9sbF9sZWZ0ICsgY2FudmFzX3dpZHRoKSB7XG4gICAgICAgICAgICBjYW52YXMuc2Nyb2xsX2xlZnQgPSBsZWZ0IC0gY2FudmFzX3dpZHRoO1xuICAgICAgICB9IGVsc2UgaWYgKGxlZnQgPCBjYW52YXMuc2Nyb2xsX2xlZnQpIHtcbiAgICAgICAgICAgIGNhbnZhcy5zY3JvbGxfbGVmdCA9IGxlZnQ7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHZhciBjdXJzb3JzX3JlbmRlcmVyID0gbmV3IGN1cnNvcnMuQ3Vyc29yc1JlbmRlcmVyKFxuICAgICAgICBjdXJzb3JzX21vZGVsLCBcbiAgICAgICAgc3R5bGUsIFxuICAgICAgICByb3dfcmVuZGVyZXIsXG4gICAgICAgIGhhc19mb2N1cyk7XG4gICAgdmFyIHNlbGVjdGlvbnNfcmVuZGVyZXIgPSBuZXcgc2VsZWN0aW9ucy5TZWxlY3Rpb25zUmVuZGVyZXIoXG4gICAgICAgIGN1cnNvcnNfbW9kZWwsIFxuICAgICAgICBzdHlsZSwgXG4gICAgICAgIHJvd19yZW5kZXJlcixcbiAgICAgICAgaGFzX2ZvY3VzLFxuICAgICAgICBjdXJzb3JzX3JlbmRlcmVyKTtcblxuICAgIC8vIENyZWF0ZSB0aGUgYmFja2dyb3VuZCByZW5kZXJlclxuICAgIHZhciBjb2xvcl9yZW5kZXJlciA9IG5ldyBjb2xvci5Db2xvclJlbmRlcmVyKCk7XG4gICAgY29sb3JfcmVuZGVyZXIuY29sb3IgPSBzdHlsZS5iYWNrZ3JvdW5kIHx8ICd3aGl0ZSc7XG4gICAgc3R5bGUub24oJ2NoYW5nZWQ6c3R5bGUnLCBmdW5jdGlvbigpIHsgY29sb3JfcmVuZGVyZXIuY29sb3IgPSBzdHlsZS5iYWNrZ3JvdW5kOyB9KTtcblxuICAgIC8vIENyZWF0ZSB0aGUgZG9jdW1lbnQgaGlnaGxpZ2h0ZXIsIHdoaWNoIG5lZWRzIHRvIGtub3cgYWJvdXQgdGhlIGN1cnJlbnRseVxuICAgIC8vIHJlbmRlcmVkIHJvd3MgaW4gb3JkZXIgdG8ga25vdyB3aGVyZSB0byBoaWdobGlnaHQuXG4gICAgdGhpcy5oaWdobGlnaHRlciA9IG5ldyBoaWdobGlnaHRlci5QcmlzbUhpZ2hsaWdodGVyKG1vZGVsLCByb3dfcmVuZGVyZXIpO1xuXG4gICAgLy8gUGFzcyBnZXRfcm93X2NoYXIgaW50byBjdXJzb3JzLlxuICAgIGN1cnNvcnNfbW9kZWwuZ2V0X3Jvd19jaGFyID0gdXRpbHMucHJveHkocm93X3JlbmRlcmVyLmdldF9yb3dfY2hhciwgcm93X3JlbmRlcmVyKTtcblxuICAgIC8vIENhbGwgYmFzZSBjb25zdHJ1Y3Rvci5cbiAgICBiYXRjaC5CYXRjaFJlbmRlcmVyLmNhbGwodGhpcywgW1xuICAgICAgICBjb2xvcl9yZW5kZXJlcixcbiAgICAgICAgc2VsZWN0aW9uc19yZW5kZXJlcixcbiAgICAgICAgcm93X3JlbmRlcmVyLFxuICAgICAgICBjdXJzb3JzX3JlbmRlcmVyLFxuICAgIF0sIGNhbnZhcyk7XG5cbiAgICAvLyBIb29rdXAgcmVuZGVyIGV2ZW50cy5cbiAgICB0aGlzLl9jYW52YXMub24oJ3JlZHJhdycsIHV0aWxzLnByb3h5KHRoaXMucmVuZGVyLCB0aGlzKSk7XG4gICAgdGhpcy5fbW9kZWwub24oJ2NoYW5nZWQnLCB1dGlscy5wcm94eShjYW52YXMucmVkcmF3LCBjYW52YXMpKTtcblxuICAgIC8vIENyZWF0ZSBwcm9wZXJ0aWVzXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMucHJvcGVydHkoJ2xhbmd1YWdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9sYW5ndWFnZTtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0LmhpZ2hsaWdodGVyLmxvYWQodmFsdWUpO1xuICAgICAgICB0aGF0Ll9sYW5ndWFnZSA9IHZhbHVlO1xuICAgIH0pO1xufTtcbnV0aWxzLmluaGVyaXQoRG9jdW1lbnRWaWV3LCBiYXRjaC5CYXRjaFJlbmRlcmVyKTtcblxuZXhwb3J0cy5Eb2N1bWVudFZpZXcgPSBEb2N1bWVudFZpZXc7IiwiLy8gT1NYIGJpbmRpbmdzXG5pZiAobmF2aWdhdG9yLmFwcFZlcnNpb24uaW5kZXhPZihcIk1hY1wiKSAhPSAtMSkge1xuICAgIGV4cG9ydHMubWFwID0ge1xuICAgICAgICAnYWx0LWxlZnRhcnJvdycgOiAnY3Vyc29yLndvcmRfbGVmdCcsXG4gICAgICAgICdhbHQtcmlnaHRhcnJvdycgOiAnY3Vyc29yLndvcmRfcmlnaHQnLFxuICAgICAgICAnc2hpZnQtYWx0LWxlZnRhcnJvdycgOiAnY3Vyc29yLnNlbGVjdF93b3JkX2xlZnQnLFxuICAgICAgICAnc2hpZnQtYWx0LXJpZ2h0YXJyb3cnIDogJ2N1cnNvci5zZWxlY3Rfd29yZF9yaWdodCcsXG4gICAgICAgICdhbHQtYmFja3NwYWNlJyA6ICdjdXJzb3IuZGVsZXRlX3dvcmRfbGVmdCcsXG4gICAgICAgICdhbHQtZGVsZXRlJyA6ICdjdXJzb3IuZGVsZXRlX3dvcmRfcmlnaHQnLFxuICAgICAgICAnbWV0YS1sZWZ0YXJyb3cnIDogJ2N1cnNvci5saW5lX3N0YXJ0JyxcbiAgICAgICAgJ21ldGEtcmlnaHRhcnJvdycgOiAnY3Vyc29yLmxpbmVfZW5kJyxcbiAgICAgICAgJ3NoaWZ0LW1ldGEtbGVmdGFycm93JyA6ICdjdXJzb3Iuc2VsZWN0X2xpbmVfc3RhcnQnLFxuICAgICAgICAnc2hpZnQtbWV0YS1yaWdodGFycm93JyA6ICdjdXJzb3Iuc2VsZWN0X2xpbmVfZW5kJyxcbiAgICAgICAgJ21ldGEtYScgOiAnY3Vyc29yLnNlbGVjdF9hbGwnLFxuICAgICAgICAnbWV0YS16JyA6ICdoaXN0b3J5LnVuZG8nLFxuICAgICAgICAnbWV0YS15JyA6ICdoaXN0b3J5LnJlZG8nLFxuICAgIH07XG5cbi8vIE5vbiBPU1ggYmluZGluZ3Ncbn0gZWxzZSB7XG4gICAgZXhwb3J0cy5tYXAgPSB7XG4gICAgICAgICdjdHJsLWxlZnRhcnJvdycgOiAnY3Vyc29yLndvcmRfbGVmdCcsXG4gICAgICAgICdjdHJsLXJpZ2h0YXJyb3cnIDogJ2N1cnNvci53b3JkX3JpZ2h0JyxcbiAgICAgICAgJ2N0cmwtYmFja3NwYWNlJyA6ICdjdXJzb3IuZGVsZXRlX3dvcmRfbGVmdCcsXG4gICAgICAgICdjdHJsLWRlbGV0ZScgOiAnY3Vyc29yLmRlbGV0ZV93b3JkX3JpZ2h0JyxcbiAgICAgICAgJ3NoaWZ0LWN0cmwtbGVmdGFycm93JyA6ICdjdXJzb3Iuc2VsZWN0X3dvcmRfbGVmdCcsXG4gICAgICAgICdzaGlmdC1jdHJsLXJpZ2h0YXJyb3cnIDogJ2N1cnNvci5zZWxlY3Rfd29yZF9yaWdodCcsXG4gICAgICAgICdob21lJyA6ICdjdXJzb3IubGluZV9zdGFydCcsXG4gICAgICAgICdlbmQnIDogJ2N1cnNvci5saW5lX2VuZCcsXG4gICAgICAgICdzaGlmdC1ob21lJyA6ICdjdXJzb3Iuc2VsZWN0X2xpbmVfc3RhcnQnLFxuICAgICAgICAnc2hpZnQtZW5kJyA6ICdjdXJzb3Iuc2VsZWN0X2xpbmVfZW5kJyxcbiAgICAgICAgJ2N0cmwtYScgOiAnY3Vyc29yLnNlbGVjdF9hbGwnLFxuICAgICAgICAnY3RybC16JyA6ICdoaXN0b3J5LnVuZG8nLFxuICAgICAgICAnY3RybC15JyA6ICdoaXN0b3J5LnJlZG8nLFxuICAgIH07XG5cbn1cblxuLy8gQ29tbW9uIGJpbmRpbmdzXG5leHBvcnRzLm1hcFsna2V5cHJlc3MnXSA9ICdjdXJzb3Iua2V5cHJlc3MnO1xuZXhwb3J0cy5tYXBbJ2VudGVyJ10gPSAnY3Vyc29yLm5ld2xpbmUnO1xuZXhwb3J0cy5tYXBbJ2RlbGV0ZSddID0gJ2N1cnNvci5kZWxldGVfZm9yd2FyZCc7XG5leHBvcnRzLm1hcFsnYmFja3NwYWNlJ10gPSAnY3Vyc29yLmRlbGV0ZV9iYWNrd2FyZCc7XG5leHBvcnRzLm1hcFsnbGVmdGFycm93J10gPSAnY3Vyc29yLmxlZnQnO1xuZXhwb3J0cy5tYXBbJ3JpZ2h0YXJyb3cnXSA9ICdjdXJzb3IucmlnaHQnO1xuZXhwb3J0cy5tYXBbJ3VwYXJyb3cnXSA9ICdjdXJzb3IudXAnO1xuZXhwb3J0cy5tYXBbJ2Rvd25hcnJvdyddID0gJ2N1cnNvci5kb3duJztcbmV4cG9ydHMubWFwWydzaGlmdC1sZWZ0YXJyb3cnXSA9ICdjdXJzb3Iuc2VsZWN0X2xlZnQnO1xuZXhwb3J0cy5tYXBbJ3NoaWZ0LXJpZ2h0YXJyb3cnXSA9ICdjdXJzb3Iuc2VsZWN0X3JpZ2h0JztcbmV4cG9ydHMubWFwWydzaGlmdC11cGFycm93J10gPSAnY3Vyc29yLnNlbGVjdF91cCc7XG5leHBvcnRzLm1hcFsnc2hpZnQtZG93bmFycm93J10gPSAnY3Vyc29yLnNlbGVjdF9kb3duJztcbmV4cG9ydHMubWFwWydtb3VzZTAtZGJsY2xpY2snXSA9ICdjdXJzb3JzLnNlbGVjdF93b3JkJztcbmV4cG9ydHMubWFwWydtb3VzZTAtZG93biddID0gJ2N1cnNvcnMuc3RhcnRfc2VsZWN0aW9uJztcbmV4cG9ydHMubWFwWydtb3VzZS1tb3ZlJ10gPSAnY3Vyc29ycy5zZXRfc2VsZWN0aW9uJztcbmV4cG9ydHMubWFwWydtb3VzZTAtdXAnXSA9ICdjdXJzb3JzLmVuZF9zZWxlY3Rpb24nO1xuZXhwb3J0cy5tYXBbJ3NoaWZ0LW1vdXNlMC11cCddID0gJ2N1cnNvcnMuZW5kX3NlbGVjdGlvbic7XG5leHBvcnRzLm1hcFsnc2hpZnQtbW91c2UwLWRvd24nXSA9ICdjdXJzb3JzLnN0YXJ0X3NldF9zZWxlY3Rpb24nO1xuZXhwb3J0cy5tYXBbJ3NoaWZ0LW1vdXNlLW1vdmUnXSA9ICdjdXJzb3JzLnNldF9zZWxlY3Rpb24nO1xuZXhwb3J0cy5tYXBbJ3RhYiddID0gJ2N1cnNvci5pbmRlbnQnO1xuZXhwb3J0cy5tYXBbJ3NoaWZ0LXRhYiddID0gJ2N1cnNvci51bmluZGVudCc7XG5leHBvcnRzLm1hcFsnZXNjYXBlJ10gPSAnY3Vyc29ycy5zaW5nbGUnO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJyk7XG5cbi8qKlxuICogRXZlbnQgbm9ybWFsaXplclxuICpcbiAqIExpc3RlbnMgdG8gRE9NIGV2ZW50cyBhbmQgZW1pdHMgJ2NsZWFuZWQnIHZlcnNpb25zIG9mIHRob3NlIGV2ZW50cy5cbiAqL1xudmFyIE1hcCA9IGZ1bmN0aW9uKG5vcm1hbGl6ZXIpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX21hcCA9IHt9O1xuXG4gICAgLy8gQ3JlYXRlIG5vcm1hbGl6ZXIgcHJvcGVydHlcbiAgICB0aGlzLl9ub3JtYWxpemVyID0gbnVsbDtcbiAgICB0aGlzLl9wcm94eV9oYW5kbGVfZXZlbnQgPSB1dGlscy5wcm94eSh0aGlzLl9oYW5kbGVfZXZlbnQsIHRoaXMpO1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLnByb3BlcnR5KCdub3JtYWxpemVyJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9ub3JtYWxpemVyO1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIC8vIFJlbW92ZSBldmVudCBoYW5kbGVyLlxuICAgICAgICBpZiAodGhhdC5fbm9ybWFsaXplcikgdGhhdC5fbm9ybWFsaXplci5vZmZfYWxsKHRoYXQuX3Byb3h5X2hhbmRsZV9ldmVudCk7XG4gICAgICAgIC8vIFNldCwgYW5kIGFkZCBldmVudCBoYW5kbGVyLlxuICAgICAgICB0aGF0Ll9ub3JtYWxpemVyID0gdmFsdWU7XG4gICAgICAgIGlmICh2YWx1ZSkgdmFsdWUub25fYWxsKHRoYXQuX3Byb3h5X2hhbmRsZV9ldmVudCk7XG4gICAgfSk7XG5cbiAgICAvLyBJZiBkZWZpbmVkLCBzZXQgdGhlIG5vcm1hbGl6ZXIuXG4gICAgaWYgKG5vcm1hbGl6ZXIpIHRoaXMubm9ybWFsaXplciA9IG5vcm1hbGl6ZXI7XG59O1xudXRpbHMuaW5oZXJpdChNYXAsIHV0aWxzLlBvc3RlckNsYXNzKTtcblxuLyoqXG4gKiBNYXAgb2YgQVBJIG1ldGhvZHMgYnkgbmFtZS5cbiAqIEB0eXBlIHtkaWN0aW9uYXJ5fVxuICovXG5NYXAucmVnaXN0cnkgPSB7fTtcbk1hcC5fcmVnaXN0cnlfdGFncyA9IHt9O1xuXG4vKipcbiAqIFJlZ2lzdGVycyBhbiBhY3Rpb24uXG4gKiBAcGFyYW0gIHtzdHJpbmd9IG5hbWUgLSBuYW1lIG9mIHRoZSBhY3Rpb25cbiAqIEBwYXJhbSAge2Z1bmN0aW9ufSBmXG4gKiBAcGFyYW0gIHtPYmplY3R9IChvcHRpb25hbCkgdGFnIC0gYWxsb3dzIHlvdSB0byBzcGVjaWZ5IGEgdGFnXG4gKiAgICAgICAgICAgICAgICAgIHdoaWNoIGNhbiBiZSB1c2VkIHdpdGggdGhlIGB1bnJlZ2lzdGVyX2J5X3RhZ2BcbiAqICAgICAgICAgICAgICAgICAgbWV0aG9kIHRvIHF1aWNrbHkgdW5yZWdpc3RlciBhY3Rpb25zIHdpdGhcbiAqICAgICAgICAgICAgICAgICAgdGhlIHRhZyBzcGVjaWZpZWQuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5NYXAucmVnaXN0ZXIgPSBmdW5jdGlvbihuYW1lLCBmLCB0YWcpIHtcbiAgICBpZiAodXRpbHMuaXNfYXJyYXkoTWFwLnJlZ2lzdHJ5W25hbWVdKSkge1xuICAgICAgICBNYXAucmVnaXN0cnlbbmFtZV0ucHVzaChmKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoTWFwLnJlZ2lzdHJ5W25hbWVdPT09dW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBNYXAucmVnaXN0cnlbbmFtZV0gPSBmO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgTWFwLnJlZ2lzdHJ5W25hbWVdID0gW01hcC5yZWdpc3RyeVtuYW1lXSwgZl07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGFnKSB7XG4gICAgICAgIGlmIChNYXAuX3JlZ2lzdHJ5X3RhZ3NbdGFnXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBNYXAuX3JlZ2lzdHJ5X3RhZ3NbdGFnXSA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIE1hcC5fcmVnaXN0cnlfdGFnc1t0YWddLnB1c2goe25hbWU6IG5hbWUsIGY6IGZ9KTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFVucmVnaXN0ZXIgYW4gYWN0aW9uLlxuICogQHBhcmFtICB7c3RyaW5nfSBuYW1lIC0gbmFtZSBvZiB0aGUgYWN0aW9uXG4gKiBAcGFyYW0gIHtmdW5jdGlvbn0gZlxuICogQHJldHVybiB7Ym9vbGVhbn0gdHJ1ZSBpZiBhY3Rpb24gd2FzIGZvdW5kIGFuZCB1bnJlZ2lzdGVyZWRcbiAqL1xuTWFwLnVucmVnaXN0ZXIgPSBmdW5jdGlvbihuYW1lLCBmKSB7XG4gICAgaWYgKHV0aWxzLmlzX2FycmF5KE1hcC5yZWdpc3RyeVtuYW1lXSkpIHtcbiAgICAgICAgdmFyIGluZGV4ID0gTWFwLnJlZ2lzdHJ5W25hbWVdLmluZGV4T2YoZik7XG4gICAgICAgIGlmIChpbmRleCAhPSAtMSkge1xuICAgICAgICAgICAgTWFwLnJlZ2lzdHJ5W25hbWVdLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoTWFwLnJlZ2lzdHJ5W25hbWVdID09IGYpIHtcbiAgICAgICAgZGVsZXRlIE1hcC5yZWdpc3RyeVtuYW1lXTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn07XG5cbi8qKlxuICogVW5yZWdpc3RlcnMgYWxsIG9mIHRoZSBhY3Rpb25zIHJlZ2lzdGVyZWQgd2l0aCBhIGdpdmVuIHRhZy5cbiAqIEBwYXJhbSAge09iamVjdH0gdGFnIC0gc3BlY2lmaWVkIGluIE1hcC5yZWdpc3Rlci5cbiAqIEByZXR1cm4ge2Jvb2xlYW59IHRydWUgaWYgdGhlIHRhZyB3YXMgZm91bmQgYW5kIGRlbGV0ZWQuXG4gKi9cbk1hcC51bnJlZ2lzdGVyX2J5X3RhZyA9IGZ1bmN0aW9uKHRhZykge1xuICAgIGlmIChNYXAuX3JlZ2lzdHJ5X3RhZ3NbdGFnXSkge1xuICAgICAgICBNYXAuX3JlZ2lzdHJ5X3RhZ3NbdGFnXS5mb3JFYWNoKGZ1bmN0aW9uKHJlZ2lzdHJhdGlvbikge1xuICAgICAgICAgICAgTWFwLnVucmVnaXN0ZXIocmVnaXN0cmF0aW9uLm5hbWUsIHJlZ2lzdHJhdGlvbi5mKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGRlbGV0ZSBNYXAuX3JlZ2lzdHJ5X3RhZ3NbdGFnXTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxufTtcblxuLyoqXG4gKiBBcHBlbmQgZXZlbnQgYWN0aW9ucyB0byB0aGUgbWFwLlxuICpcbiAqIFRoaXMgbWV0aG9kIGhhcyB0d28gc2lnbmF0dXJlcy4gIElmIGEgc2luZ2xlIGFyZ3VtZW50XG4gKiBpcyBwYXNzZWQgdG8gaXQsIHRoYXQgYXJndW1lbnQgaXMgdHJlYXRlZCBsaWtlIGFcbiAqIGRpY3Rpb25hcnkuICBJZiBtb3JlIHRoYW4gb25lIGFyZ3VtZW50IGlzIHBhc3NlZCB0byBpdCxcbiAqIGVhY2ggYXJndW1lbnQgaXMgdHJlYXRlZCBhcyBhbHRlcm5hdGluZyBrZXksIHZhbHVlXG4gKiBwYWlycyBvZiBhIGRpY3Rpb25hcnkuXG4gKlxuICogVGhlIG1hcCBhbGxvd3MgeW91IHRvIHJlZ2lzdGVyIGFjdGlvbnMgZm9yIGtleXMuXG4gKiBFeGFtcGxlOlxuICogICAgIG1hcC5hcHBlbmRfbWFwKHtcbiAqICAgICAgICAgJ2N0cmwtYSc6ICdjdXJzb3JzLnNlbGVjdF9hbGwnLFxuICogICAgIH0pXG4gKlxuICogTXVsdGlwbGUgYWN0aW9ucyBjYW4gYmUgcmVnaXN0ZXJlZCBmb3IgYSBzaW5nbGUgZXZlbnQuXG4gKiBUaGUgYWN0aW9ucyBhcmUgZXhlY3V0ZWQgc2VxdWVudGlhbGx5LCB1bnRpbCBvbmUgYWN0aW9uXG4gKiByZXR1cm5zIGB0cnVlYCBpbiB3aGljaCBjYXNlIHRoZSBleGVjdXRpb24gaGF1bHRzLiAgVGhpc1xuICogYWxsb3dzIGFjdGlvbnMgdG8gcnVuIGNvbmRpdGlvbmFsbHkuXG4gKiBFeGFtcGxlOlxuICogICAgIC8vIEltcGxlbWVudGluZyBhIGR1YWwgbW9kZSBlZGl0b3IsIHlvdSBtYXkgaGF2ZSB0d29cbiAqICAgICAvLyBmdW5jdGlvbnMgdG8gcmVnaXN0ZXIgZm9yIG9uZSBrZXkuIGkuZS46XG4gKiAgICAgdmFyIGRvX2EgPSBmdW5jdGlvbihlKSB7XG4gKiAgICAgICAgIGlmIChtb2RlPT0nZWRpdCcpIHtcbiAqICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdBJyk7XG4gKiAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAqICAgICAgICAgfVxuICogICAgIH1cbiAqICAgICB2YXIgZG9fYiA9IGZ1bmN0aW9uKGUpIHtcbiAqICAgICAgICAgaWYgKG1vZGU9PSdjb21tYW5kJykge1xuICogICAgICAgICAgICAgY29uc29sZS5sb2coJ0InKTtcbiAqICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICogICAgICAgICB9XG4gKiAgICAgfVxuICpcbiAqICAgICAvLyBUbyByZWdpc3RlciBib3RoIGZvciBvbmUga2V5XG4gKiAgICAgTWFwLnJlZ2lzdGVyKCdhY3Rpb25fYScsIGRvX2EpO1xuICogICAgIE1hcC5yZWdpc3RlcignYWN0aW9uX2InLCBkb19iKTtcbiAqICAgICBtYXAuYXBwZW5kX21hcCh7XG4gKiAgICAgICAgICdhbHQtdic6IFsnYWN0aW9uX2EnLCAnYWN0aW9uX2InXSxcbiAqICAgICB9KTtcbiAqIFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTWFwLnByb3RvdHlwZS5hcHBlbmRfbWFwID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHZhciBwYXJzZWQgPSB0aGlzLl9wYXJzZV9tYXBfYXJndW1lbnRzKGFyZ3VtZW50cyk7XG4gICAgT2JqZWN0LmtleXMocGFyc2VkKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICBpZiAodGhhdC5fbWFwW2tleV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhhdC5fbWFwW2tleV0gPSBwYXJzZWRba2V5XTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoYXQuX21hcFtrZXldID0gdGhhdC5fbWFwW2tleV0uY29uY2F0KHBhcnNlZFtrZXldKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuLyoqXG4gKiBBbGlhcyBmb3IgYGFwcGVuZF9tYXBgLlxuICogQHR5cGUge2Z1bmN0aW9ufVxuICovXG5NYXAucHJvdG90eXBlLm1hcCA9IE1hcC5wcm90b3R5cGUuYXBwZW5kX21hcDtcblxuLyoqXG4gKiBQcmVwZW5kIGV2ZW50IGFjdGlvbnMgdG8gdGhlIG1hcC5cbiAqXG4gKiBTZWUgdGhlIGRvYyBmb3IgYGFwcGVuZF9tYXBgIGZvciBhIGRldGFpbGVkIGRlc2NyaXB0aW9uIG9mXG4gKiBwb3NzaWJsZSBpbnB1dCB2YWx1ZXMuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5NYXAucHJvdG90eXBlLnByZXBlbmRfbWFwID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHZhciBwYXJzZWQgPSB0aGlzLl9wYXJzZV9tYXBfYXJndW1lbnRzKGFyZ3VtZW50cyk7XG4gICAgT2JqZWN0LmtleXMocGFyc2VkKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICBpZiAodGhhdC5fbWFwW2tleV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhhdC5fbWFwW2tleV0gPSBwYXJzZWRba2V5XTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoYXQuX21hcFtrZXldID0gcGFyc2VkW2tleV0uY29uY2F0KHRoYXQuX21hcFtrZXldKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuLyoqXG4gKiBVbm1hcCBldmVudCBhY3Rpb25zIGluIHRoZSBtYXAuXG4gKlxuICogU2VlIHRoZSBkb2MgZm9yIGBhcHBlbmRfbWFwYCBmb3IgYSBkZXRhaWxlZCBkZXNjcmlwdGlvbiBvZlxuICogcG9zc2libGUgaW5wdXQgdmFsdWVzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTWFwLnByb3RvdHlwZS51bm1hcCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB2YXIgcGFyc2VkID0gdGhpcy5fcGFyc2VfbWFwX2FyZ3VtZW50cyhhcmd1bWVudHMpO1xuICAgIE9iamVjdC5rZXlzKHBhcnNlZCkuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgaWYgKHRoYXQuX21hcFtrZXldICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHBhcnNlZFtrZXldLmZvckVhY2goZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICB2YXIgaW5kZXggPSB0aGF0Ll9tYXBba2V5XS5pbmRleE9mKHZhbHVlKTtcbiAgICAgICAgICAgICAgICBpZiAoaW5kZXggIT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5fbWFwW2tleV0uc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuLyoqXG4gKiBHZXQgYSBtb2RpZmlhYmxlIGFycmF5IG9mIHRoZSBhY3Rpb25zIGZvciBhIHBhcnRpY3VsYXIgZXZlbnQuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGV2ZW50XG4gKiBAcmV0dXJuIHthcnJheX0gYnkgcmVmIGNvcHkgb2YgdGhlIGFjdGlvbnMgcmVnaXN0ZXJlZCB0byBhbiBldmVudC5cbiAqL1xuTWFwLnByb3RvdHlwZS5nZXRfbWFwcGluZyA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgcmV0dXJuIHRoaXMuX21hcFt0aGlzLl9ub3JtYWxpemVfZXZlbnRfbmFtZShldmVudCldO1xufTtcblxuLyoqXG4gKiBJbnZva2VzIHRoZSBjYWxsYmFja3Mgb2YgYW4gYWN0aW9uIGJ5IG5hbWUuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IG5hbWVcbiAqIEBwYXJhbSAge2FycmF5fSBbYXJnc10gLSBhcmd1bWVudHMgdG8gcGFzcyB0byB0aGUgYWN0aW9uIGNhbGxiYWNrW3NdXG4gKiBAcmV0dXJuIHtib29sZWFufSB0cnVlIGlmIG9uZSBvciBtb3JlIG9mIHRoZSBhY3Rpb25zIHJldHVybmVkIHRydWVcbiAqL1xuTWFwLnByb3RvdHlwZS5pbnZva2UgPSBmdW5jdGlvbihuYW1lLCBhcmdzKSB7XG4gICAgdmFyIGFjdGlvbl9jYWxsYmFja3MgPSBNYXAucmVnaXN0cnlbbmFtZV07XG4gICAgaWYgKGFjdGlvbl9jYWxsYmFja3MpIHtcbiAgICAgICAgaWYgKHV0aWxzLmlzX2FycmF5KGFjdGlvbl9jYWxsYmFja3MpKSB7XG4gICAgICAgICAgICB2YXIgcmV0dXJucyA9IFtdO1xuICAgICAgICAgICAgYWN0aW9uX2NhbGxiYWNrcy5mb3JFYWNoKGZ1bmN0aW9uKGFjdGlvbl9jYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIHJldHVybnMuYXBwZW5kKGFjdGlvbl9jYWxsYmFjay5hcHBseSh1bmRlZmluZWQsIGFyZ3MpPT09dHJ1ZSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gSWYgb25lIG9mIHRoZSBhY3Rpb24gY2FsbGJhY2tzIHJldHVybmVkIHRydWUsIGNhbmNlbCBidWJibGluZy5cbiAgICAgICAgICAgIGlmIChyZXR1cm5zLnNvbWUoZnVuY3Rpb24oeCkge3JldHVybiB4O30pKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoYWN0aW9uX2NhbGxiYWNrcy5hcHBseSh1bmRlZmluZWQsIGFyZ3MpPT09dHJ1ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBQYXJzZSB0aGUgYXJndW1lbnRzIHRvIGEgbWFwIGZ1bmN0aW9uLlxuICogQHBhcmFtICB7YXJndW1lbnRzIGFycmF5fSBhcmdzXG4gKiBAcmV0dXJuIHtkaWN0aW9uYXJ5fSBwYXJzZWQgcmVzdWx0c1xuICovXG5NYXAucHJvdG90eXBlLl9wYXJzZV9tYXBfYXJndW1lbnRzID0gZnVuY3Rpb24oYXJncykge1xuICAgIHZhciBwYXJzZWQgPSB7fTtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG5cbiAgICAvLyBPbmUgYXJ1bWVudCwgdHJlYXQgaXQgYXMgYSBkaWN0aW9uYXJ5IG9mIGV2ZW50IG5hbWVzIGFuZFxuICAgIC8vIGFjdGlvbnMuXG4gICAgaWYgKGFyZ3MubGVuZ3RoID09IDEpIHtcbiAgICAgICAgT2JqZWN0LmtleXMoYXJnc1swXSkuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IGFyZ3NbMF1ba2V5XTtcbiAgICAgICAgICAgIHZhciBub3JtYWxpemVkX2tleSA9IHRoYXQuX25vcm1hbGl6ZV9ldmVudF9uYW1lKGtleSk7XG5cbiAgICAgICAgICAgIC8vIElmIHRoZSB2YWx1ZSBpcyBub3QgYW4gYXJyYXksIHdyYXAgaXQgaW4gb25lLlxuICAgICAgICAgICAgaWYgKCF1dGlscy5pc19hcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IFt2YWx1ZV07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIElmIHRoZSBrZXkgaXMgYWxyZWFkeSBkZWZpbmVkLCBjb25jYXQgdGhlIHZhbHVlcyB0b1xuICAgICAgICAgICAgLy8gaXQuICBPdGhlcndpc2UsIHNldCBpdC5cbiAgICAgICAgICAgIGlmIChwYXJzZWRbbm9ybWFsaXplZF9rZXldID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBwYXJzZWRbbm9ybWFsaXplZF9rZXldID0gdmFsdWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHBhcnNlZFtub3JtYWxpemVkX2tleV0gPSBwYXJzZWRbbm9ybWFsaXplZF9rZXldLmNvbmNhdCh2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgLy8gTW9yZSB0aGFuIG9uZSBhcmd1bWVudC4gIFRyZWF0IGFzIHRoZSBmb3JtYXQ6XG4gICAgLy8gZXZlbnRfbmFtZTEsIGFjdGlvbjEsIGV2ZW50X25hbWUyLCBhY3Rpb24yLCAuLi4sIGV2ZW50X25hbWVOLCBhY3Rpb25OXG4gICAgfSBlbHNlIHtcbiAgICAgICAgZm9yICh2YXIgaT0wOyBpPE1hdGguZmxvb3IoYXJncy5sZW5ndGgvMik7IGkrKykge1xuICAgICAgICAgICAgdmFyIGtleSA9IHRoYXQuX25vcm1hbGl6ZV9ldmVudF9uYW1lKGFyZ3NbMippXSk7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBhcmdzWzIqaSArIDFdO1xuICAgICAgICAgICAgaWYgKHBhcnNlZFtrZXldPT09dW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgcGFyc2VkW2tleV0gPSBbdmFsdWVdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwYXJzZWRba2V5XS5wdXNoKHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcGFyc2VkO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIGEgbm9ybWFsaXplZCBldmVudC5cbiAqIEBwYXJhbSAge3N0cmluZ30gbmFtZSAtIG5hbWUgb2YgdGhlIGV2ZW50XG4gKiBAcGFyYW0gIHtFdmVudH0gZSAtIGJyb3dzZXIgRXZlbnQgb2JqZWN0XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5NYXAucHJvdG90eXBlLl9oYW5kbGVfZXZlbnQgPSBmdW5jdGlvbihuYW1lLCBlKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHZhciBub3JtYWxpemVkX2V2ZW50ID0gdGhpcy5fbm9ybWFsaXplX2V2ZW50X25hbWUobmFtZSk7XG4gICAgdmFyIGFjdGlvbnMgPSB0aGlzLl9tYXBbbm9ybWFsaXplZF9ldmVudF07XG4gICAgaWYgKGFjdGlvbnMpIHtcbiAgICAgICAgYWN0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uKGFjdGlvbikge1xuICAgICAgICAgICAgaWYgKHRoYXQuaW52b2tlKGFjdGlvbiwgW2VdKSkge1xuICAgICAgICAgICAgICAgIHV0aWxzLmNhbmNlbF9idWJibGUoZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKipcbiAqIEFscGhhYmV0aWNhbGx5IHNvcnRzIGtleXMgaW4gZXZlbnQgbmFtZSwgc29cbiAqIEBwYXJhbSAge3N0cmluZ30gbmFtZSAtIGV2ZW50IG5hbWVcbiAqIEByZXR1cm4ge3N0cmluZ30gbm9ybWFsaXplZCBldmVudCBuYW1lXG4gKi9cbk1hcC5wcm90b3R5cGUuX25vcm1hbGl6ZV9ldmVudF9uYW1lID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiBuYW1lLnRvTG93ZXJDYXNlKCkudHJpbSgpLnNwbGl0KCctJykuc29ydCgpLmpvaW4oJy0nKTtcbn07XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuTWFwID0gTWFwO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJyk7XG5cbi8qKlxuICogRXZlbnQgbm9ybWFsaXplclxuICpcbiAqIExpc3RlbnMgdG8gRE9NIGV2ZW50cyBhbmQgZW1pdHMgJ2NsZWFuZWQnIHZlcnNpb25zIG9mIHRob3NlIGV2ZW50cy5cbiAqL1xudmFyIE5vcm1hbGl6ZXIgPSBmdW5jdGlvbigpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX2VsX2hvb2tzID0ge307XG59O1xudXRpbHMuaW5oZXJpdChOb3JtYWxpemVyLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8qKlxuICogTGlzdGVuIHRvIHRoZSBldmVudHMgb2YgYW4gZWxlbWVudC5cbiAqIEBwYXJhbSAge0hUTUxFbGVtZW50fSBlbFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTm9ybWFsaXplci5wcm90b3R5cGUubGlzdGVuX3RvID0gZnVuY3Rpb24oZWwpIHtcbiAgICB2YXIgaG9va3MgPSBbXTtcbiAgICBob29rcy5wdXNoKHV0aWxzLmhvb2soZWwsICdvbmtleXByZXNzJywgdGhpcy5fcHJveHkoJ3ByZXNzJywgdGhpcy5faGFuZGxlX2tleXByZXNzX2V2ZW50LCBlbCkpKTtcbiAgICBob29rcy5wdXNoKHV0aWxzLmhvb2soZWwsICdvbmtleWRvd24nLCAgdGhpcy5fcHJveHkoJ2Rvd24nLCB0aGlzLl9oYW5kbGVfa2V5Ym9hcmRfZXZlbnQsIGVsKSkpO1xuICAgIGhvb2tzLnB1c2godXRpbHMuaG9vayhlbCwgJ29ua2V5dXAnLCAgdGhpcy5fcHJveHkoJ3VwJywgdGhpcy5faGFuZGxlX2tleWJvYXJkX2V2ZW50LCBlbCkpKTtcbiAgICBob29rcy5wdXNoKHV0aWxzLmhvb2soZWwsICdvbmRibGNsaWNrJywgIHRoaXMuX3Byb3h5KCdkYmxjbGljaycsIHRoaXMuX2hhbmRsZV9tb3VzZV9ldmVudCwgZWwpKSk7XG4gICAgaG9va3MucHVzaCh1dGlscy5ob29rKGVsLCAnb25jbGljaycsICB0aGlzLl9wcm94eSgnY2xpY2snLCB0aGlzLl9oYW5kbGVfbW91c2VfZXZlbnQsIGVsKSkpO1xuICAgIGhvb2tzLnB1c2godXRpbHMuaG9vayhlbCwgJ29ubW91c2Vkb3duJywgIHRoaXMuX3Byb3h5KCdkb3duJywgdGhpcy5faGFuZGxlX21vdXNlX2V2ZW50LCBlbCkpKTtcbiAgICBob29rcy5wdXNoKHV0aWxzLmhvb2soZWwsICdvbm1vdXNldXAnLCAgdGhpcy5fcHJveHkoJ3VwJywgdGhpcy5faGFuZGxlX21vdXNlX2V2ZW50LCBlbCkpKTtcbiAgICBob29rcy5wdXNoKHV0aWxzLmhvb2soZWwsICdvbm1vdXNlbW92ZScsICB0aGlzLl9wcm94eSgnbW92ZScsIHRoaXMuX2hhbmRsZV9tb3VzZW1vdmVfZXZlbnQsIGVsKSkpO1xuICAgIHRoaXMuX2VsX2hvb2tzW2VsXSA9IGhvb2tzO1xufTtcblxuLyoqXG4gKiBTdG9wcyBsaXN0ZW5pbmcgdG8gYW4gZWxlbWVudC5cbiAqIEBwYXJhbSAge0hUTUxFbGVtZW50fSBlbFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTm9ybWFsaXplci5wcm90b3R5cGUuc3RvcF9saXN0ZW5pbmdfdG8gPSBmdW5jdGlvbihlbCkge1xuICAgIGlmICh0aGlzLl9lbF9ob29rc1tlbF0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLl9lbF9ob29rc1tlbF0uZm9yRWFjaChmdW5jdGlvbihob29rKSB7XG4gICAgICAgICAgICBob29rLnVuaG9vaygpO1xuICAgICAgICB9KTtcbiAgICAgICAgZGVsZXRlIHRoaXMuX2VsX2hvb2tzW2VsXTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgd2hlbiBhIG1vdXNlIGV2ZW50IG9jY3Vyc1xuICogQHBhcmFtICB7SFRNTEVsZW1lbnR9IGVsXG4gKiBAcGFyYW0gIHtFdmVudH0gZVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTm9ybWFsaXplci5wcm90b3R5cGUuX2hhbmRsZV9tb3VzZV9ldmVudCA9IGZ1bmN0aW9uKGVsLCBldmVudF9uYW1lLCBlKSB7XG4gICAgZSA9IGUgfHwgd2luZG93LmV2ZW50O1xuICAgIHRoaXMudHJpZ2dlcih0aGlzLl9tb2RpZmllcl9zdHJpbmcoZSkgKyAnbW91c2UnICsgZS5idXR0b24gKyAnLScgKyBldmVudF9uYW1lLCBlKTtcbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIGEgbW91c2UgZXZlbnQgb2NjdXJzXG4gKiBAcGFyYW0gIHtIVE1MRWxlbWVudH0gZWxcbiAqIEBwYXJhbSAge0V2ZW50fSBlXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Ob3JtYWxpemVyLnByb3RvdHlwZS5faGFuZGxlX21vdXNlbW92ZV9ldmVudCA9IGZ1bmN0aW9uKGVsLCBldmVudF9uYW1lLCBlKSB7XG4gICAgZSA9IGUgfHwgd2luZG93LmV2ZW50O1xuICAgIHRoaXMudHJpZ2dlcih0aGlzLl9tb2RpZmllcl9zdHJpbmcoZSkgKyAnbW91c2UnICsgJy0nICsgZXZlbnRfbmFtZSwgZSk7XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgd2hlbiBhIGtleWJvYXJkIGV2ZW50IG9jY3Vyc1xuICogQHBhcmFtICB7SFRNTEVsZW1lbnR9IGVsXG4gKiBAcGFyYW0gIHtFdmVudH0gZVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTm9ybWFsaXplci5wcm90b3R5cGUuX2hhbmRsZV9rZXlib2FyZF9ldmVudCA9IGZ1bmN0aW9uKGVsLCBldmVudF9uYW1lLCBlKSB7XG4gICAgZSA9IGUgfHwgd2luZG93LmV2ZW50O1xuICAgIHZhciBrZXluYW1lID0gdGhpcy5fbG9va3VwX2tleWNvZGUoZS5rZXlDb2RlKTtcbiAgICBpZiAoa2V5bmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMudHJpZ2dlcih0aGlzLl9tb2RpZmllcl9zdHJpbmcoZSkgKyBrZXluYW1lICsgJy0nICsgZXZlbnRfbmFtZSwgZSk7XG5cbiAgICAgICAgaWYgKGV2ZW50X25hbWU9PSdkb3duJykgeyAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy50cmlnZ2VyKHRoaXMuX21vZGlmaWVyX3N0cmluZyhlKSArIGtleW5hbWUsIGUpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHRoaXMudHJpZ2dlcih0aGlzLl9tb2RpZmllcl9zdHJpbmcoZSkgKyBTdHJpbmcoZS5rZXlDb2RlKSArICctJyArIGV2ZW50X25hbWUsIGUpO1xuICAgIHRoaXMudHJpZ2dlcigna2V5JyArIGV2ZW50X25hbWUsIGUpO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gYSBrZXlwcmVzcyBldmVudCBvY2N1cnNcbiAqIEBwYXJhbSAge0hUTUxFbGVtZW50fSBlbFxuICogQHBhcmFtICB7RXZlbnR9IGVcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbk5vcm1hbGl6ZXIucHJvdG90eXBlLl9oYW5kbGVfa2V5cHJlc3NfZXZlbnQgPSBmdW5jdGlvbihlbCwgZXZlbnRfbmFtZSwgZSkge1xuICAgIHRoaXMudHJpZ2dlcigna2V5cHJlc3MnLCBlKTtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBlbGVtZW50IGV2ZW50IHByb3h5LlxuICogQHBhcmFtICB7ZnVuY3Rpb259IGZcbiAqIEBwYXJhbSAge3N0cmluZ30gZXZlbnRfbmFtZVxuICogQHBhcmFtICB7SFRNTEVsZW1lbnR9IGVsXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Ob3JtYWxpemVyLnByb3RvdHlwZS5fcHJveHkgPSBmdW5jdGlvbihldmVudF9uYW1lLCBmLCBlbCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBhcmdzID0gW2VsLCBldmVudF9uYW1lXS5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSk7XG4gICAgICAgIHJldHVybiBmLmFwcGx5KHRoYXQsIGFyZ3MpO1xuICAgIH07XG59O1xuXG4vKipcbiAqIENyZWF0ZSBhIG1vZGlmaWVycyBzdHJpbmcgZnJvbSBhbiBldmVudC5cbiAqIEBwYXJhbSAge0V2ZW50fSBlXG4gKiBAcmV0dXJuIHtzdHJpbmd9IGRhc2ggc2VwYXJhdGVkIG1vZGlmaWVyIHN0cmluZ1xuICovXG5Ob3JtYWxpemVyLnByb3RvdHlwZS5fbW9kaWZpZXJfc3RyaW5nID0gZnVuY3Rpb24oZSkge1xuICAgIHZhciBtb2RpZmllcnMgPSBbXTtcbiAgICBpZiAoZS5jdHJsS2V5KSBtb2RpZmllcnMucHVzaCgnY3RybCcpO1xuICAgIGlmIChlLmFsdEtleSkgbW9kaWZpZXJzLnB1c2goJ2FsdCcpO1xuICAgIGlmIChlLm1ldGFLZXkpIG1vZGlmaWVycy5wdXNoKCdtZXRhJyk7XG4gICAgaWYgKGUuc2hpZnRLZXkpIG1vZGlmaWVycy5wdXNoKCdzaGlmdCcpO1xuICAgIHZhciBzdHJpbmcgPSBtb2RpZmllcnMuc29ydCgpLmpvaW4oJy0nKTtcbiAgICBpZiAoc3RyaW5nLmxlbmd0aCA+IDApIHN0cmluZyA9IHN0cmluZyArICctJztcbiAgICByZXR1cm4gc3RyaW5nO1xufTtcblxuLyoqXG4gKiBMb29rdXAgdGhlIGh1bWFuIGZyaWVuZGx5IG5hbWUgZm9yIGEga2V5Y29kZS5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IGtleWNvZGVcbiAqIEByZXR1cm4ge3N0cmluZ30ga2V5IG5hbWVcbiAqL1xuTm9ybWFsaXplci5wcm90b3R5cGUuX2xvb2t1cF9rZXljb2RlID0gZnVuY3Rpb24oa2V5Y29kZSkge1xuICAgIGlmICgxMTIgPD0ga2V5Y29kZSAmJiBrZXljb2RlIDw9IDEyMykgeyAvLyBGMS1GMTJcbiAgICAgICAgcmV0dXJuICdmJyArIChrZXljb2RlLTExMSk7XG4gICAgfSBlbHNlIGlmICg0OCA8PSBrZXljb2RlICYmIGtleWNvZGUgPD0gNTcpIHsgLy8gMC05XG4gICAgICAgIHJldHVybiBTdHJpbmcoa2V5Y29kZS00OCk7XG4gICAgfSBlbHNlIGlmICg2NSA8PSBrZXljb2RlICYmIGtleWNvZGUgPD0gOTApIHsgLy8gQS1aXG4gICAgICAgIHJldHVybiAnYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXonLnN1YnN0cmluZyhTdHJpbmcoa2V5Y29kZS02NSksIFN0cmluZyhrZXljb2RlLTY0KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGNvZGVzID0ge1xuICAgICAgICAgICAgODogJ2JhY2tzcGFjZScsXG4gICAgICAgICAgICA5OiAndGFiJyxcbiAgICAgICAgICAgIDEzOiAnZW50ZXInLFxuICAgICAgICAgICAgMTY6ICdzaGlmdCcsXG4gICAgICAgICAgICAxNzogJ2N0cmwnLFxuICAgICAgICAgICAgMTg6ICdhbHQnLFxuICAgICAgICAgICAgMTk6ICdwYXVzZScsXG4gICAgICAgICAgICAyMDogJ2NhcHNsb2NrJyxcbiAgICAgICAgICAgIDI3OiAnZXNjJyxcbiAgICAgICAgICAgIDMyOiAnc3BhY2UnLFxuICAgICAgICAgICAgMzM6ICdwYWdldXAnLFxuICAgICAgICAgICAgMzQ6ICdwYWdlZG93bicsXG4gICAgICAgICAgICAzNTogJ2VuZCcsXG4gICAgICAgICAgICAzNjogJ2hvbWUnLFxuICAgICAgICAgICAgMzc6ICdsZWZ0YXJyb3cnLFxuICAgICAgICAgICAgMzg6ICd1cGFycm93JyxcbiAgICAgICAgICAgIDM5OiAncmlnaHRhcnJvdycsXG4gICAgICAgICAgICA0MDogJ2Rvd25hcnJvdycsXG4gICAgICAgICAgICA0NDogJ3ByaW50c2NyZWVuJyxcbiAgICAgICAgICAgIDQ1OiAnaW5zZXJ0JyxcbiAgICAgICAgICAgIDQ2OiAnZGVsZXRlJyxcbiAgICAgICAgICAgIDkxOiAnd2luZG93cycsXG4gICAgICAgICAgICA5MzogJ21lbnUnLFxuICAgICAgICAgICAgMTQ0OiAnbnVtbG9jaycsXG4gICAgICAgICAgICAxNDU6ICdzY3JvbGxsb2NrJyxcbiAgICAgICAgICAgIDE4ODogJ2NvbW1hJyxcbiAgICAgICAgICAgIDE5MDogJ3BlcmlvZCcsXG4gICAgICAgICAgICAxOTE6ICdmb3dhcmRzbGFzaCcsXG4gICAgICAgICAgICAxOTI6ICd0aWxkZScsXG4gICAgICAgICAgICAyMTk6ICdsZWZ0YnJhY2tldCcsXG4gICAgICAgICAgICAyMjA6ICdiYWNrc2xhc2gnLFxuICAgICAgICAgICAgMjIxOiAncmlnaHRicmFja2V0JyxcbiAgICAgICAgICAgIDIyMjogJ3F1b3RlJyxcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGNvZGVzW2tleWNvZGVdO1xuICAgIH0gXG4gICAgLy8gVE9ETzogdGhpcyBmdW5jdGlvbiBpcyBtaXNzaW5nIHNvbWUgYnJvd3NlciBzcGVjaWZpY1xuICAgIC8vIGtleWNvZGUgbWFwcGluZ3MuXG59O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLk5vcm1hbGl6ZXIgPSBOb3JtYWxpemVyO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMuanMnKTtcblxuLyoqXG4gKiBMaXN0ZW5zIHRvIGEgbW9kZWwgYW5kIGhpZ2xpZ2h0cyB0aGUgdGV4dCBhY2NvcmRpbmdseS5cbiAqIEBwYXJhbSB7RG9jdW1lbnRNb2RlbH0gbW9kZWxcbiAqL1xudmFyIEhpZ2hsaWdodGVyQmFzZSA9IGZ1bmN0aW9uKG1vZGVsLCByb3dfcmVuZGVyZXIpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX21vZGVsID0gbW9kZWw7XG4gICAgdGhpcy5fcm93X3JlbmRlcmVyID0gcm93X3JlbmRlcmVyO1xuICAgIHRoaXMuX3F1ZXVlZCA9IG51bGw7XG4gICAgdGhpcy5kZWxheSA9IDE1OyAvL21zXG5cbiAgICAvLyBCaW5kIGV2ZW50cy5cbiAgICB0aGlzLl9yb3dfcmVuZGVyZXIub24oJ3Jvd3NfY2hhbmdlZCcsIHV0aWxzLnByb3h5KHRoaXMuX2hhbmRsZV9zY3JvbGwsIHRoaXMpKTtcbiAgICB0aGlzLl9tb2RlbC5vbigndGV4dF9jaGFuZ2VkJywgdXRpbHMucHJveHkodGhpcy5faGFuZGxlX3RleHRfY2hhbmdlLCB0aGlzKSk7XG4gICAgdGhpcy5fbW9kZWwub24oJ3Jvd19jaGFuZ2VkJywgdXRpbHMucHJveHkodGhpcy5faGFuZGxlX3RleHRfY2hhbmdlLCB0aGlzKSk7XG59O1xudXRpbHMuaW5oZXJpdChIaWdobGlnaHRlckJhc2UsIHV0aWxzLlBvc3RlckNsYXNzKTtcblxuLyoqXG4gKiBIaWdobGlnaHQgdGhlIGRvY3VtZW50XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5IaWdobGlnaHRlckJhc2UucHJvdG90eXBlLmhpZ2hsaWdodCA9IGZ1bmN0aW9uKHN0YXJ0X3JvdywgZW5kX3Jvdykge1xuICAgIHRocm93IG5ldyBFcnJvcignTm90IGltcGxlbWVudGVkJyk7XG59O1xuXG4vKipcbiAqIFF1ZXVlcyBhIGhpZ2hsaWdodCBvcGVyYXRpb24uXG4gKlxuICogSWYgYSBoaWdobGlnaHQgb3BlcmF0aW9uIGlzIGFscmVhZHkgcXVldWVkLCBkb24ndCBxdWV1ZVxuICogYW5vdGhlciBvbmUuICBUaGlzIGVuc3VyZXMgdGhhdCB0aGUgaGlnaGxpZ2h0aW5nIGlzXG4gKiBmcmFtZSByYXRlIGxvY2tlZC4gIEhpZ2hsaWdodGluZyBpcyBhbiBleHBlbnNpdmUgb3BlcmF0aW9uLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuSGlnaGxpZ2h0ZXJCYXNlLnByb3RvdHlwZS5fcXVldWVfaGlnaGxpZ2h0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5fcXVldWVkID09PSBudWxsKSB7XG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgdGhpcy5fcXVldWVkID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHRoYXQuX21vZGVsLmFjcXVpcmVfdGFnX2V2ZW50X2xvY2soKTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgdmFyIHZpc2libGVfcm93cyA9IHRoYXQuX3Jvd19yZW5kZXJlci5nZXRfdmlzaWJsZV9yb3dzKCk7XG4gICAgICAgICAgICAgICAgdmFyIHRvcF9yb3cgPSB2aXNpYmxlX3Jvd3MudG9wX3JvdztcbiAgICAgICAgICAgICAgICB2YXIgYm90dG9tX3JvdyA9IHZpc2libGVfcm93cy5ib3R0b21fcm93O1xuICAgICAgICAgICAgICAgIHRoYXQuaGlnaGxpZ2h0KHRvcF9yb3csIGJvdHRvbV9yb3cpO1xuICAgICAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgICAgICB0aGF0Ll9tb2RlbC5yZWxlYXNlX3RhZ19ldmVudF9sb2NrKCk7XG4gICAgICAgICAgICAgICAgdGhhdC5fcXVldWVkID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdGhpcy5kZWxheSk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gdGhlIHZpc2libGUgcm93IGluZGljaWVzIGFyZSBjaGFuZ2VkLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuSGlnaGxpZ2h0ZXJCYXNlLnByb3RvdHlwZS5faGFuZGxlX3Njcm9sbCA9IGZ1bmN0aW9uKHN0YXJ0X3JvdywgZW5kX3Jvdykge1xuICAgIHRoaXMuX3F1ZXVlX2hpZ2hsaWdodGVyKCk7XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgd2hlbiB0aGUgdGV4dCBjaGFuZ2VzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuSGlnaGxpZ2h0ZXJCYXNlLnByb3RvdHlwZS5faGFuZGxlX3RleHRfY2hhbmdlID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fcXVldWVfaGlnaGxpZ2h0ZXIoKTtcbn07XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuSGlnaGxpZ2h0ZXJCYXNlID0gSGlnaGxpZ2h0ZXJCYXNlO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJyk7XG52YXIgaGlnaGxpZ2h0ZXIgPSByZXF1aXJlKCcuL2hpZ2hsaWdodGVyLmpzJyk7XG52YXIgcHJpc20gPSByZXF1aXJlKCcuLi8uLi9jb21wb25lbnRzL3ByaXNtLmpzJyk7XG5cbi8qKlxuICogTGlzdGVucyB0byBhIG1vZGVsIGFuZCBoaWdobGlnaHRzIHRoZSB0ZXh0IGFjY29yZGluZ2x5LlxuICogQHBhcmFtIHtEb2N1bWVudE1vZGVsfSBtb2RlbFxuICovXG52YXIgUHJpc21IaWdobGlnaHRlciA9IGZ1bmN0aW9uKG1vZGVsLCByb3dfcmVuZGVyZXIpIHtcbiAgICBoaWdobGlnaHRlci5IaWdobGlnaHRlckJhc2UuY2FsbCh0aGlzLCBtb2RlbCwgcm93X3JlbmRlcmVyKTtcblxuICAgIC8vIExvb2sgYmFjayBhbmQgZm9yd2FyZCB0aGlzIG1hbnkgcm93cyBmb3IgY29udGV4dHVhbGx5IFxuICAgIC8vIHNlbnNpdGl2ZSBoaWdobGlnaHRpbmcuXG4gICAgdGhpcy5fcm93X3BhZGRpbmcgPSAxNTtcbiAgICB0aGlzLl9sYW5ndWFnZSA9IG51bGw7XG5cbiAgICAvLyBQcm9wZXJ0aWVzXG4gICAgdGhpcy5wcm9wZXJ0eSgnbGFuZ3VhZ2VzJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBsYW5ndWFnZXMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgbCBpbiBwcmlzbS5sYW5ndWFnZXMpIHtcbiAgICAgICAgICAgIGlmIChwcmlzbS5sYW5ndWFnZXMuaGFzT3duUHJvcGVydHkobCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoW1wiZXh0ZW5kXCIsIFwiaW5zZXJ0QmVmb3JlXCIsIFwiREZTXCJdLmluZGV4T2YobCkgPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgbGFuZ3VhZ2VzLnB1c2gobCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBsYW5ndWFnZXM7XG4gICAgfSk7XG59O1xudXRpbHMuaW5oZXJpdChQcmlzbUhpZ2hsaWdodGVyLCBoaWdobGlnaHRlci5IaWdobGlnaHRlckJhc2UpO1xuXG4vKipcbiAqIEhpZ2hsaWdodCB0aGUgZG9jdW1lbnRcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblByaXNtSGlnaGxpZ2h0ZXIucHJvdG90eXBlLmhpZ2hsaWdodCA9IGZ1bmN0aW9uKHN0YXJ0X3JvdywgZW5kX3Jvdykge1xuICAgIC8vIEdldCB0aGUgZmlyc3QgYW5kIGxhc3Qgcm93cyB0aGF0IHNob3VsZCBiZSBoaWdobGlnaHRlZC5cbiAgICBzdGFydF9yb3cgPSBNYXRoLm1heCgwLCBzdGFydF9yb3cgLSB0aGlzLl9yb3dfcGFkZGluZyk7XG4gICAgZW5kX3JvdyA9IE1hdGgubWluKHRoaXMuX21vZGVsLl9yb3dzLmxlbmd0aCAtIDEsIGVuZF9yb3cgKyB0aGlzLl9yb3dfcGFkZGluZyk7XG5cbiAgICAvLyBDbGVhciB0aGUgb2xkIGhpZ2hsaWdodGluZy5cbiAgICB0aGlzLl9tb2RlbC5jbGVhcl90YWdzKHN0YXJ0X3JvdywgZW5kX3Jvdyk7XG5cbiAgICAvLyBBYm9ydCBpZiBsYW5ndWFnZSBpc24ndCBzcGVjaWZpZWQuXG4gICAgaWYgKCF0aGlzLl9sYW5ndWFnZSkgcmV0dXJuO1xuICAgIFxuICAgIC8vIEdldCB0aGUgdGV4dCBvZiB0aGUgcm93cy5cbiAgICB2YXIgdGV4dCA9IHRoaXMuX21vZGVsLmdldF90ZXh0KHN0YXJ0X3JvdywgMCwgZW5kX3JvdywgdGhpcy5fbW9kZWwuX3Jvd3NbZW5kX3Jvd10ubGVuZ3RoKTtcblxuICAgIC8vIEZpZ3VyZSBvdXQgd2hlcmUgZWFjaCB0YWcgYmVsb25ncy5cbiAgICB2YXIgaGlnaGxpZ2h0cyA9IHRoaXMuX2hpZ2hsaWdodCh0ZXh0KTsgLy8gW3N0YXJ0X2luZGV4LCBlbmRfaW5kZXgsIHRhZ11cbiAgICBcbiAgICAvLyBBcHBseSB0YWdzXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIGhpZ2hsaWdodHMuZm9yRWFjaChmdW5jdGlvbihoaWdobGlnaHQpIHtcblxuICAgICAgICAvLyBUcmFuc2xhdGUgdGFnIGNoYXJhY3RlciBpbmRpY2llcyB0byByb3csIGNoYXIgY29vcmRpbmF0ZXMuXG4gICAgICAgIHZhciBiZWZvcmVfcm93cyA9IHRleHQuc3Vic3RyaW5nKDAsIGhpZ2hsaWdodFswXSkuc3BsaXQoJ1xcbicpO1xuICAgICAgICB2YXIgZ3JvdXBfc3RhcnRfcm93ID0gc3RhcnRfcm93ICsgYmVmb3JlX3Jvd3MubGVuZ3RoIC0gMTtcbiAgICAgICAgdmFyIGdyb3VwX3N0YXJ0X2NoYXIgPSBiZWZvcmVfcm93c1tiZWZvcmVfcm93cy5sZW5ndGggLSAxXS5sZW5ndGg7XG4gICAgICAgIHZhciBhZnRlcl9yb3dzID0gdGV4dC5zdWJzdHJpbmcoMCwgaGlnaGxpZ2h0WzFdIC0gMSkuc3BsaXQoJ1xcbicpO1xuICAgICAgICB2YXIgZ3JvdXBfZW5kX3JvdyA9IHN0YXJ0X3JvdyArIGFmdGVyX3Jvd3MubGVuZ3RoIC0gMTtcbiAgICAgICAgdmFyIGdyb3VwX2VuZF9jaGFyID0gYWZ0ZXJfcm93c1thZnRlcl9yb3dzLmxlbmd0aCAtIDFdLmxlbmd0aDtcblxuICAgICAgICAvLyBBcHBseSB0YWcuXG4gICAgICAgIHZhciB0YWcgPSBoaWdobGlnaHRbMl0udG9Mb3dlckNhc2UoKTtcbiAgICAgICAgdGhhdC5fbW9kZWwuc2V0X3RhZyhncm91cF9zdGFydF9yb3csIGdyb3VwX3N0YXJ0X2NoYXIsIGdyb3VwX2VuZF9yb3csIGdyb3VwX2VuZF9jaGFyLCAnc3ludGF4JywgdGFnKTtcbiAgICB9KTtcbn07XG5cbi8qKlxuICogRmluZCBlYWNoIHBhcnQgb2YgdGV4dCB0aGF0IG5lZWRzIHRvIGJlIGhpZ2hsaWdodGVkLlxuICogQHBhcmFtICB7c3RyaW5nfSB0ZXh0XG4gKiBAcmV0dXJuIHthcnJheX0gbGlzdCBjb250YWluaW5nIGl0ZW1zIG9mIHRoZSBmb3JtIFtzdGFydF9pbmRleCwgZW5kX2luZGV4LCB0YWddXG4gKi9cblByaXNtSGlnaGxpZ2h0ZXIucHJvdG90eXBlLl9oaWdobGlnaHQgPSBmdW5jdGlvbih0ZXh0KSB7XG5cbiAgICAvLyBUb2tlbml6ZSB1c2luZyBwcmlzbS5qc1xuICAgIHZhciB0b2tlbnMgPSBwcmlzbS50b2tlbml6ZSh0ZXh0LCB0aGlzLl9sYW5ndWFnZSk7XG5cbiAgICAvLyBDb252ZXJ0IHRoZSB0b2tlbnMgaW50byBbc3RhcnRfaW5kZXgsIGVuZF9pbmRleCwgdGFnXVxuICAgIHZhciBsZWZ0ID0gMDtcbiAgICB2YXIgZmxhdHRlbiA9IGZ1bmN0aW9uKHRva2VucywgcHJlZml4KSB7XG4gICAgICAgIGlmICghcHJlZml4KSB7IHByZWZpeCA9IFtdOyB9XG4gICAgICAgIHZhciBmbGF0ID0gW107XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdG9rZW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgdG9rZW4gPSB0b2tlbnNbaV07XG4gICAgICAgICAgICBpZiAodG9rZW4uY29udGVudCkge1xuICAgICAgICAgICAgICAgIGZsYXQgPSBmbGF0LmNvbmNhdChmbGF0dGVuKFtdLmNvbmNhdCh0b2tlbi5jb250ZW50KSwgcHJlZml4LmNvbmNhdCh0b2tlbi50eXBlKSkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAocHJlZml4Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgZmxhdC5wdXNoKFtsZWZ0LCBsZWZ0ICsgdG9rZW4ubGVuZ3RoLCBwcmVmaXguam9pbignICcpXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGxlZnQgKz0gdG9rZW4ubGVuZ3RoO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmbGF0O1xuICAgIH07XG4gICAgdmFyIHRhZ3MgPSBmbGF0dGVuKHRva2Vucyk7XG4gICAgcmV0dXJuIHRhZ3M7XG59O1xuXG4vKipcbiAqIExvYWRzIGEgc3ludGF4IGJ5IGxhbmd1YWdlIG5hbWUuXG4gKiBAcGFyYW0gIHtzdHJpbmcgb3IgZGljdGlvbmFyeX0gbGFuZ3VhZ2VcbiAqIEByZXR1cm4ge2Jvb2xlYW59IHN1Y2Nlc3NcbiAqL1xuUHJpc21IaWdobGlnaHRlci5wcm90b3R5cGUubG9hZCA9IGZ1bmN0aW9uKGxhbmd1YWdlKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIGxhbmd1YWdlIGV4aXN0cy5cbiAgICAgICAgaWYgKHByaXNtLmxhbmd1YWdlc1tsYW5ndWFnZV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdMYW5ndWFnZSBkb2VzIG5vdCBleGlzdCEnKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9sYW5ndWFnZSA9IHByaXNtLmxhbmd1YWdlc1tsYW5ndWFnZV07XG4gICAgICAgIHRoaXMuX3F1ZXVlX2hpZ2hsaWdodGVyKCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgbG9hZGluZyBsYW5ndWFnZScsIGUpO1xuICAgICAgICB0aGlzLl9sYW5ndWFnZSA9IG51bGw7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLlByaXNtSGlnaGxpZ2h0ZXIgPSBQcmlzbUhpZ2hsaWdodGVyO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xudmFyIGtleW1hcCA9IHJlcXVpcmUoJy4vZXZlbnRzL21hcC5qcycpO1xuXG4vKipcbiAqIFJldmVyc2libGUgYWN0aW9uIGhpc3RvcnkuXG4gKi9cbnZhciBIaXN0b3J5ID0gZnVuY3Rpb24obWFwKSB7XG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzKTtcbiAgICB0aGlzLl9tYXAgPSBtYXA7XG4gICAgdGhpcy5fYWN0aW9ucyA9IFtdO1xuICAgIHRoaXMuX2FjdGlvbl9ncm91cHMgPSBbXTtcbiAgICB0aGlzLl91bmRvbmUgPSBbXTtcbiAgICB0aGlzLl9hdXRvZ3JvdXAgPSBudWxsO1xuICAgIHRoaXMuX2FjdGlvbl9sb2NrID0gZmFsc2U7XG5cbiAgICBrZXltYXAuTWFwLnJlZ2lzdGVyKCdoaXN0b3J5LnVuZG8nLCB1dGlscy5wcm94eSh0aGlzLnVuZG8sIHRoaXMpKTtcbiAgICBrZXltYXAuTWFwLnJlZ2lzdGVyKCdoaXN0b3J5LnJlZG8nLCB1dGlscy5wcm94eSh0aGlzLnJlZG8sIHRoaXMpKTtcbn07XG51dGlscy5pbmhlcml0KEhpc3RvcnksIHV0aWxzLlBvc3RlckNsYXNzKTtcblxuLyoqXG4gKiBQdXNoIGEgcmV2ZXJzaWJsZSBhY3Rpb24gdG8gdGhlIGhpc3RvcnkuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGZvcndhcmRfbmFtZSAtIG5hbWUgb2YgdGhlIGZvcndhcmQgYWN0aW9uXG4gKiBAcGFyYW0gIHthcnJheX0gZm9yd2FyZF9wYXJhbXMgLSBwYXJhbWV0ZXJzIHRvIHVzZSB3aGVuIGludm9raW5nIHRoZSBmb3J3YXJkIGFjdGlvblxuICogQHBhcmFtICB7c3RyaW5nfSBiYWNrd2FyZF9uYW1lIC0gbmFtZSBvZiB0aGUgYmFja3dhcmQgYWN0aW9uXG4gKiBAcGFyYW0gIHthcnJheX0gYmFja3dhcmRfcGFyYW1zIC0gcGFyYW1ldGVycyB0byB1c2Ugd2hlbiBpbnZva2luZyB0aGUgYmFja3dhcmQgYWN0aW9uXG4gKiBAcGFyYW0gIHtmbG9hdH0gW2F1dG9ncm91cF9kZWxheV0gLSB0aW1lIHRvIHdhaXQgdG8gYXV0b21hdGljYWxseSBncm91cCB0aGUgYWN0aW9ucy5cbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIElmIHRoaXMgaXMgdW5kZWZpbmVkLCBhdXRvZ3JvdXBpbmcgd2lsbCBub3Qgb2NjdXIuXG4gKi9cbkhpc3RvcnkucHJvdG90eXBlLnB1c2hfYWN0aW9uID0gZnVuY3Rpb24oZm9yd2FyZF9uYW1lLCBmb3J3YXJkX3BhcmFtcywgYmFja3dhcmRfbmFtZSwgYmFja3dhcmRfcGFyYW1zLCBhdXRvZ3JvdXBfZGVsYXkpIHtcbiAgICBpZiAodGhpcy5fYWN0aW9uX2xvY2spIHJldHVybjtcblxuICAgIHRoaXMuX2FjdGlvbnMucHVzaCh7XG4gICAgICAgIGZvcndhcmQ6IHtcbiAgICAgICAgICAgIG5hbWU6IGZvcndhcmRfbmFtZSxcbiAgICAgICAgICAgIHBhcmFtZXRlcnM6IGZvcndhcmRfcGFyYW1zLFxuICAgICAgICB9LFxuICAgICAgICBiYWNrd2FyZDoge1xuICAgICAgICAgICAgbmFtZTogYmFja3dhcmRfbmFtZSxcbiAgICAgICAgICAgIHBhcmFtZXRlcnM6IGJhY2t3YXJkX3BhcmFtcyxcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMuX3VuZG9uZSA9IFtdO1xuXG4gICAgLy8gSWYgYSBkZWxheSBpcyBkZWZpbmVkLCBwcmVwYXJlIGEgdGltZW91dCB0byBhdXRvZ3JvdXAuXG4gICAgaWYgKGF1dG9ncm91cF9kZWxheSAhPT0gdW5kZWZpbmVkKSB7XG5cbiAgICAgICAgLy8gSWYgYW5vdGhlciB0aW1lb3V0IHdhcyBhbHJlYWR5IHNldCwgY2FuY2VsIGl0LlxuICAgICAgICBpZiAodGhpcy5fYXV0b2dyb3VwICE9PSBudWxsKSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5fYXV0b2dyb3VwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCBhIG5ldyB0aW1lb3V0LlxuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIHRoaXMuX2F1dG9ncm91cCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGF0Lmdyb3VwX2FjdGlvbnMoKTtcbiAgICAgICAgfSwgYXV0b2dyb3VwX2RlbGF5KTtcbiAgICB9O1xufTtcblxuLyoqXG4gKiBDb21taXQgdGhlIHB1c2hlZCBhY3Rpb25zIHRvIG9uZSBncm91cC5cbiAqL1xuSGlzdG9yeS5wcm90b3R5cGUuZ3JvdXBfYWN0aW9ucyA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2F1dG9ncm91cCA9IG51bGw7XG4gICAgaWYgKHRoaXMuX2FjdGlvbl9sb2NrKSByZXR1cm47XG4gICAgXG4gICAgdGhpcy5fYWN0aW9uX2dyb3Vwcy5wdXNoKHRoaXMuX2FjdGlvbnMpO1xuICAgIHRoaXMuX2FjdGlvbnMgPSBbXTtcbiAgICB0aGlzLl91bmRvbmUgPSBbXTtcbn07XG5cbi8qKlxuICogVW5kbyBvbmUgc2V0IG9mIGFjdGlvbnMuXG4gKi9cbkhpc3RvcnkucHJvdG90eXBlLnVuZG8gPSBmdW5jdGlvbigpIHtcbiAgICAvLyBJZiBhIHRpbWVvdXQgaXMgc2V0LCBncm91cCBub3cuXG4gICAgaWYgKHRoaXMuX2F1dG9ncm91cCAhPT0gbnVsbCkge1xuICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5fYXV0b2dyb3VwKTtcbiAgICAgICAgdGhpcy5ncm91cF9hY3Rpb25zKCk7XG4gICAgfVxuXG4gICAgdmFyIHVuZG87XG4gICAgaWYgKHRoaXMuX2FjdGlvbnMubGVuZ3RoID4gMCkge1xuICAgICAgICB1bmRvID0gdGhpcy5fYWN0aW9ucztcbiAgICB9IGVsc2UgaWYgKHRoaXMuX2FjdGlvbl9ncm91cHMubGVuZ3RoID4gMCkge1xuICAgICAgICB1bmRvID0gdGhpcy5fYWN0aW9uX2dyb3Vwcy5wb3AoKTtcbiAgICAgICAgdW5kby5yZXZlcnNlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKCd1bmRvaW5nIHNvbWV0aGluZycsIHVuZG8pO1xuXG4gICAgLy8gVW5kbyB0aGUgYWN0aW9ucy5cbiAgICBpZiAoIXRoaXMuX2FjdGlvbl9sb2NrKSB7XG4gICAgICAgIHRoaXMuX2FjdGlvbl9sb2NrID0gdHJ1ZTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgICAgIHVuZG8uZm9yRWFjaChmdW5jdGlvbihhY3Rpb24pIHtcbiAgICAgICAgICAgICAgICB0aGF0Ll9tYXAuaW52b2tlKGFjdGlvbi5iYWNrd2FyZC5uYW1lLCBhY3Rpb24uYmFja3dhcmQucGFyYW1ldGVycyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIHRoaXMuX2FjdGlvbl9sb2NrID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBBbGxvdyB0aGUgYWN0aW9uIHRvIGJlIHJlZG9uZS5cbiAgICB0aGlzLl91bmRvbmUucHVzaCh1bmRvKTtcbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogUmVkbyBvbmUgc2V0IG9mIGFjdGlvbnMuXG4gKi9cbkhpc3RvcnkucHJvdG90eXBlLnJlZG8gPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5fdW5kb25lLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdmFyIHJlZG8gPSB0aGlzLl91bmRvbmUucG9wKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZWRvIHRoZSBhY3Rpb25zLlxuICAgICAgICBpZiAoIXRoaXMuX2FjdGlvbl9sb2NrKSB7XG4gICAgICAgICAgICB0aGlzLl9hY3Rpb25fbG9jayA9IHRydWU7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgICAgICAgICByZWRvLmZvckVhY2goZnVuY3Rpb24oYWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQuX21hcC5pbnZva2UoYWN0aW9uLmZvcndhcmQubmFtZSwgYWN0aW9uLmZvcndhcmQucGFyYW1ldGVycyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2FjdGlvbl9sb2NrID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBbGxvdyB0aGUgYWN0aW9uIHRvIGJlIHVuZG9uZS5cbiAgICAgICAgdGhpcy5fYWN0aW9uX2dyb3Vwcy5wdXNoKHJlZG8pO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbmV4cG9ydHMuSGlzdG9yeSA9IEhpc3Rvcnk7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxudmFyIHBsdWdpbiA9IHJlcXVpcmUoJy4uL3BsdWdpbi5qcycpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vLi4vdXRpbHMuanMnKTtcbnZhciByZW5kZXJlciA9IHJlcXVpcmUoJy4vcmVuZGVyZXIuanMnKTtcblxuLyoqXG4gKiBHdXR0ZXIgcGx1Z2luLlxuICovXG52YXIgR3V0dGVyID0gZnVuY3Rpb24oKSB7XG4gICAgcGx1Z2luLlBsdWdpbkJhc2UuY2FsbCh0aGlzKTtcbiAgICB0aGlzLm9uKCdsb2FkJywgdGhpcy5faGFuZGxlX2xvYWQsIHRoaXMpO1xuICAgIHRoaXMub24oJ3VubG9hZCcsIHRoaXMuX2hhbmRsZV91bmxvYWQsIHRoaXMpO1xuXG4gICAgLy8gQ3JlYXRlIGEgZ3V0dGVyX3dpZHRoIHByb3BlcnR5IHRoYXQgaXMgYWRqdXN0YWJsZS5cbiAgICB0aGlzLl9ndXR0ZXJfd2lkdGggPSA1MDtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhpcy5wcm9wZXJ0eSgnZ3V0dGVyX3dpZHRoJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9ndXR0ZXJfd2lkdGg7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgaWYgKHRoYXQubG9hZGVkKSB7XG4gICAgICAgICAgICB0aGlzLnBvc3Rlci52aWV3LnJvd19yZW5kZXJlci5tYXJnaW5fbGVmdCArPSB2YWx1ZSAtIHRoaXMuX2d1dHRlcl93aWR0aDtcbiAgICAgICAgfVxuICAgICAgICB0aGF0Ll9ndXR0ZXJfd2lkdGggPSB2YWx1ZTtcbiAgICAgICAgdGhhdC50cmlnZ2VyKCdjaGFuZ2VkJyk7XG4gICAgfSk7XG59O1xudXRpbHMuaW5oZXJpdChHdXR0ZXIsIHBsdWdpbi5QbHVnaW5CYXNlKTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gdGhlIHBsdWdpbiBpcyBsb2FkZWQuXG4gKi9cbkd1dHRlci5wcm90b3R5cGUuX2hhbmRsZV9sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5wb3N0ZXIudmlldy5yb3dfcmVuZGVyZXIubWFyZ2luX2xlZnQgKz0gdGhpcy5fZ3V0dGVyX3dpZHRoO1xuICAgIHRoaXMuX3JlbmRlcmVyID0gbmV3IHJlbmRlcmVyLkd1dHRlclJlbmRlcmVyKHRoaXMpO1xuICAgIHRoaXMucmVnaXN0ZXJfcmVuZGVyZXIodGhpcy5fcmVuZGVyZXIpO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gdGhlIHBsdWdpbiBpcyB1bmxvYWRlZC5cbiAqL1xuR3V0dGVyLnByb3RvdHlwZS5faGFuZGxlX3VubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIFJlbW92ZSBhbGwgbGlzdGVuZXJzIHRvIHRoaXMgcGx1Z2luJ3MgY2hhbmdlZCBldmVudC5cbiAgICB0aGlzLl9yZW5kZXJlci51bnJlZ2lzdGVyKCk7XG4gICAgdGhpcy5wb3N0ZXIudmlldy5yb3dfcmVuZGVyZXIubWFyZ2luX2xlZnQgLT0gdGhpcy5fZ3V0dGVyX3dpZHRoO1xufTtcblxuZXhwb3J0cy5HdXR0ZXIgPSBHdXR0ZXI7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxudmFyIHJlbmRlcmVyID0gcmVxdWlyZSgnLi4vLi4vcmVuZGVyZXJzL3JlbmRlcmVyLmpzJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi8uLi91dGlscy5qcycpO1xuXG4vKipcbiAqIFJlbmRlcmVycyB0aGUgZ3V0dGVyLlxuICovXG52YXIgR3V0dGVyUmVuZGVyZXIgPSBmdW5jdGlvbihndXR0ZXIpIHtcbiAgICByZW5kZXJlci5SZW5kZXJlckJhc2UuY2FsbCh0aGlzLCB1bmRlZmluZWQsIHtwYXJlbnRfaW5kZXBlbmRlbnQ6IHRydWV9KTtcbiAgICB0aGlzLl9ndXR0ZXIgID0gZ3V0dGVyO1xuICAgIHRoaXMuX2d1dHRlci5vbignY2hhbmdlZCcsIHRoaXMuX3JlbmRlciwgdGhpcyk7XG4gICAgdGhpcy5faG92ZXJpbmcgPSBmYWxzZTtcbn07XG51dGlscy5pbmhlcml0KEd1dHRlclJlbmRlcmVyLCByZW5kZXJlci5SZW5kZXJlckJhc2UpO1xuXG4vKipcbiAqIEhhbmRsZXMgcmVuZGVyaW5nXG4gKiBPbmx5IHJlLXJlbmRlciB3aGVuIHNjcm9sbGVkIGhvcml6b250YWxseS5cbiAqL1xuR3V0dGVyUmVuZGVyZXIucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKHNjcm9sbCkge1xuICAgIC8vIFNjcm9sbGVkIHJpZ2h0IHhvciBob3ZlcmluZ1xuICAgIHZhciBsZWZ0ID0gdGhpcy5fZ3V0dGVyLnBvc3Rlci5jYW52YXMuc2Nyb2xsX2xlZnQ7XG4gICAgaWYgKChsZWZ0ID4gMCkgXiB0aGlzLl9ob3ZlcmluZykge1xuICAgICAgICB0aGlzLl9ob3ZlcmluZyA9IGxlZnQgPiAwO1xuICAgICAgICB0aGlzLl9yZW5kZXIoKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFJlbmRlcnMgdGhlIGd1dHRlclxuICovXG5HdXR0ZXJSZW5kZXJlci5wcm90b3R5cGUuX3JlbmRlciA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2NhbnZhcy5jbGVhcigpO1xuICAgIHZhciB3aWR0aCA9IHRoaXMuX2d1dHRlci5ndXR0ZXJfd2lkdGg7XG4gICAgdGhpcy5fY2FudmFzLmRyYXdfcmVjdGFuZ2xlKFxuICAgICAgICAwLCAwLCB3aWR0aCwgdGhpcy5oZWlnaHQsIFxuICAgICAgICB7XG4gICAgICAgICAgICBmaWxsX2NvbG9yOiB0aGlzLl9ndXR0ZXIucG9zdGVyLnN0eWxlLmd1dHRlcixcbiAgICAgICAgfVxuICAgICk7XG5cbiAgICAvLyBJZiB0aGUgZ3V0dGVyIGlzIGhvdmVyaW5nIG92ZXIgY29udGVudCwgZHJhdyBhIGRyb3Agc2hhZG93LlxuICAgIGlmICh0aGlzLl9ob3ZlcmluZykge1xuICAgICAgICB2YXIgc2hhZG93X3dpZHRoID0gMTU7XG4gICAgICAgIHZhciBncmFkaWVudCA9IHRoaXMuX2NhbnZhcy5ncmFkaWVudChcbiAgICAgICAgICAgIHdpZHRoLCAwLCB3aWR0aCtzaGFkb3dfd2lkdGgsIDAsIHRoaXMuX2d1dHRlci5wb3N0ZXIuc3R5bGUuZ3V0dGVyX3NoYWRvdyB8fFxuICAgICAgICAgICAgW1xuICAgICAgICAgICAgICAgIFswLCAnYmxhY2snXSwgXG4gICAgICAgICAgICAgICAgWzEsICd0cmFuc3BhcmVudCddXG4gICAgICAgICAgICBdKTtcbiAgICAgICAgdGhpcy5fY2FudmFzLmRyYXdfcmVjdGFuZ2xlKFxuICAgICAgICAgICAgd2lkdGgsIDAsIHNoYWRvd193aWR0aCwgdGhpcy5oZWlnaHQsIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGZpbGxfY29sb3I6IGdyYWRpZW50LFxuICAgICAgICAgICAgICAgIGFscGhhOiAwLjM1LFxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuXG4gICAgfVxufTtcblxuLyoqXG4gKiBVbnJlZ2lzdGVyIHRoZSBldmVudCBsaXN0ZW5lcnNcbiAqIEBwYXJhbSAge1Bvc3Rlcn0gcG9zdGVyXG4gKiBAcGFyYW0gIHtHdXR0ZXJ9IGd1dHRlclxuICovXG5HdXR0ZXJSZW5kZXJlci5wcm90b3R5cGUudW5yZWdpc3RlciA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2d1dHRlci5vZmYoJ2NoYW5nZWQnLCB0aGlzLl9yZW5kZXIpO1xufTtcblxuZXhwb3J0cy5HdXR0ZXJSZW5kZXJlciA9IEd1dHRlclJlbmRlcmVyO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cbnZhciBwbHVnaW4gPSByZXF1aXJlKCcuLi9wbHVnaW4uanMnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uLy4uL3V0aWxzLmpzJyk7XG52YXIgcmVuZGVyZXIgPSByZXF1aXJlKCcuL3JlbmRlcmVyLmpzJyk7XG5cbi8qKlxuICogTGluZSBudW1iZXJzIHBsdWdpbi5cbiAqL1xudmFyIExpbmVOdW1iZXJzID0gZnVuY3Rpb24oKSB7XG4gICAgcGx1Z2luLlBsdWdpbkJhc2UuY2FsbCh0aGlzKTtcbiAgICB0aGlzLm9uKCdsb2FkJywgdGhpcy5faGFuZGxlX2xvYWQsIHRoaXMpO1xuICAgIHRoaXMub24oJ3VubG9hZCcsIHRoaXMuX2hhbmRsZV91bmxvYWQsIHRoaXMpO1xufTtcbnV0aWxzLmluaGVyaXQoTGluZU51bWJlcnMsIHBsdWdpbi5QbHVnaW5CYXNlKTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gdGhlIHBsdWdpbiBpcyBsb2FkZWQuXG4gKi9cbkxpbmVOdW1iZXJzLnByb3RvdHlwZS5faGFuZGxlX2xvYWQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9yZW5kZXJlciA9IG5ldyByZW5kZXJlci5MaW5lTnVtYmVyc1JlbmRlcmVyKHRoaXMpO1xuICAgIHRoaXMucmVnaXN0ZXJfcmVuZGVyZXIodGhpcy5fcmVuZGVyZXIpO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gdGhlIHBsdWdpbiBpcyB1bmxvYWRlZC5cbiAqL1xuTGluZU51bWJlcnMucHJvdG90eXBlLl9oYW5kbGVfdW5sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gUmVtb3ZlIGFsbCBsaXN0ZW5lcnMgdG8gdGhpcyBwbHVnaW4ncyBjaGFuZ2VkIGV2ZW50LlxuICAgIHRoaXMuX3JlbmRlcmVyLnVucmVnaXN0ZXIoKTtcbn07XG5cbmV4cG9ydHMuTGluZU51bWJlcnMgPSBMaW5lTnVtYmVycztcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG52YXIgcmVuZGVyZXIgPSByZXF1aXJlKCcuLi8uLi9yZW5kZXJlcnMvcmVuZGVyZXIuanMnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uLy4uL3V0aWxzLmpzJyk7XG52YXIgY2FudmFzID0gcmVxdWlyZSgnLi4vLi4vY2FudmFzLmpzJyk7XG5cbi8qKlxuICogUmVuZGVyZXJzIHRoZSBsaW5lIG51bWJlcnMuXG4gKi9cbnZhciBMaW5lTnVtYmVyc1JlbmRlcmVyID0gZnVuY3Rpb24ocGx1Z2luKSB7XG4gICAgcmVuZGVyZXIuUmVuZGVyZXJCYXNlLmNhbGwodGhpcywgdW5kZWZpbmVkLCB7cGFyZW50X2luZGVwZW5kZW50OiB0cnVlfSk7XG4gICAgdGhpcy5fcGx1Z2luICA9IHBsdWdpbjtcbiAgICB0aGlzLl90b3AgPSBudWxsO1xuICAgIHRoaXMuX3RvcF9yb3cgPSBudWxsO1xuXG4gICAgLy8gRmluZCBndXR0ZXIgcGx1Z2luLCBsaXN0ZW4gdG8gaXRzIGNoYW5nZSBldmVudC5cbiAgICB2YXIgbWFuYWdlciA9IHRoaXMuX3BsdWdpbi5wb3N0ZXIucGx1Z2lucztcbiAgICB0aGlzLl9ndXR0ZXIgPSBtYW5hZ2VyLmZpbmQoJ2d1dHRlcicpWzBdO1xuICAgIHRoaXMuX2d1dHRlci5vbignY2hhbmdlZCcsIHRoaXMuX2d1dHRlcl9yZXNpemUsIHRoaXMpO1xuXG4gICAgLy8gR2V0IHJvdyByZW5kZXJlci5cbiAgICB0aGlzLl9yb3dfcmVuZGVyZXIgPSB0aGlzLl9wbHVnaW4ucG9zdGVyLnZpZXcucm93X3JlbmRlcmVyO1xuXG4gICAgLy8gRG91YmxlIGJ1ZmZlci5cbiAgICB0aGlzLl90ZXh0X2NhbnZhcyA9IG5ldyBjYW52YXMuQ2FudmFzKCk7XG4gICAgdGhpcy5fdG1wX2NhbnZhcyA9IG5ldyBjYW52YXMuQ2FudmFzKCk7XG4gICAgdGhpcy5fdGV4dF9jYW52YXMud2lkdGggPSB0aGlzLl9ndXR0ZXIuZ3V0dGVyX3dpZHRoO1xuICAgIHRoaXMuX3RtcF9jYW52YXMud2lkdGggPSB0aGlzLl9ndXR0ZXIuZ3V0dGVyX3dpZHRoO1xuXG4gICAgLy8gQWRqdXN0IGV2ZXJ5IGJ1ZmZlcidzIHNpemUgd2hlbiB0aGUgaGVpZ2h0IGNoYW5nZXMuXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMucHJvcGVydHkoJ2hlaWdodCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fY2FudmFzLmhlaWdodDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Ll9jYW52YXMuaGVpZ2h0ID0gdmFsdWU7XG5cbiAgICAgICAgLy8gVGhlIHRleHQgY2FudmFzIHNob3VsZCBiZSB0aGUgcmlnaHQgaGVpZ2h0IHRvIGZpdCBhbGwgb2YgdGhlIGxpbmVzXG4gICAgICAgIC8vIHRoYXQgd2lsbCBiZSByZW5kZXJlZCBpbiB0aGUgYmFzZSBjYW52YXMuICBUaGlzIGluY2x1ZGVzIHRoZSBsaW5lc1xuICAgICAgICAvLyB0aGF0IGFyZSBwYXJ0aWFsbHkgcmVuZGVyZWQgYXQgdGhlIHRvcCBhbmQgYm90dG9tIG9mIHRoZSBiYXNlIGNhbnZhcy5cbiAgICAgICAgdmFyIHJvd19oZWlnaHQgPSB0aGF0Ll9yb3dfcmVuZGVyZXIuZ2V0X3Jvd19oZWlnaHQoKTtcbiAgICAgICAgdGhhdC5fcm93X2hlaWdodCA9IHJvd19oZWlnaHQ7XG4gICAgICAgIHRoYXQuX3Zpc2libGVfcm93X2NvdW50ID0gTWF0aC5jZWlsKHZhbHVlL3Jvd19oZWlnaHQpICsgMTtcbiAgICAgICAgdGhhdC5fdGV4dF9jYW52YXMuaGVpZ2h0ID0gdGhhdC5fdmlzaWJsZV9yb3dfY291bnQgKiByb3dfaGVpZ2h0O1xuICAgICAgICB0aGF0Ll90bXBfY2FudmFzLmhlaWdodCA9IHRoYXQuX3RleHRfY2FudmFzLmhlaWdodDtcbiAgICAgICAgdGhhdC5yZXJlbmRlcigpO1xuICAgIH0pO1xuICAgIHRoaXMuaGVpZ2h0ID0gdGhpcy5oZWlnaHQ7XG59O1xudXRpbHMuaW5oZXJpdChMaW5lTnVtYmVyc1JlbmRlcmVyLCByZW5kZXJlci5SZW5kZXJlckJhc2UpO1xuXG4vKipcbiAqIEhhbmRsZXMgcmVuZGVyaW5nXG4gKiBPbmx5IHJlLXJlbmRlciB3aGVuIHNjcm9sbGVkIHZlcnRpY2FsbHkuXG4gKi9cbkxpbmVOdW1iZXJzUmVuZGVyZXIucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKHNjcm9sbCkge1xuICAgIHZhciB0b3AgPSB0aGlzLl9ndXR0ZXIucG9zdGVyLmNhbnZhcy5zY3JvbGxfdG9wO1xuICAgIGlmICh0aGlzLl90b3AgPT09IG51bGwgfHwgdGhpcy5fdG9wICE9PSB0b3ApIHtcbiAgICAgICAgdGhpcy5fdG9wID0gdG9wO1xuICAgICAgICB0aGlzLl9yZW5kZXIoKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFJlbmRlcnMgdGhlIGxpbmUgbnVtYmVyc1xuICovXG5MaW5lTnVtYmVyc1JlbmRlcmVyLnByb3RvdHlwZS5fcmVuZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gVXBkYXRlIHRoZSB0ZXh0IGJ1ZmZlciBpZiBuZWVkZWQuXG4gICAgdmFyIHRvcF9yb3cgPSB0aGlzLl9yb3dfcmVuZGVyZXIuZ2V0X3Jvd19jaGFyKDAsIHRoaXMuX3RvcCkucm93X2luZGV4O1xuICAgIGlmICh0aGlzLl90b3Bfcm93ICE9PSB0b3Bfcm93KSB7XG4gICAgICAgIHZhciBsYXN0X3RvcF9yb3cgPSB0aGlzLl90b3Bfcm93O1xuICAgICAgICB0aGlzLl90b3Bfcm93ID0gdG9wX3JvdztcblxuICAgICAgICAvLyBSZWN5Y2xlIHJvd3MgaWYgcG9zc2libGUuXG4gICAgICAgIHZhciByb3dfc2Nyb2xsID0gdGhpcy5fdG9wX3JvdyAtIGxhc3RfdG9wX3JvdztcbiAgICAgICAgdmFyIHJvd19kZWx0YSA9IE1hdGguYWJzKHJvd19zY3JvbGwpO1xuICAgICAgICBpZiAodGhpcy5fdG9wX3JvdyAhPT0gbnVsbCAmJiByb3dfZGVsdGEgPCB0aGlzLl92aXNpYmxlX3Jvd19jb3VudCkge1xuXG4gICAgICAgICAgICAvLyBHZXQgYSBzbmFwc2hvdCBvZiB0aGUgdGV4dCBiZWZvcmUgdGhlIHNjcm9sbC5cbiAgICAgICAgICAgIHRoaXMuX3RtcF9jYW52YXMuY2xlYXIoKTtcbiAgICAgICAgICAgIHRoaXMuX3RtcF9jYW52YXMuZHJhd19pbWFnZSh0aGlzLl90ZXh0X2NhbnZhcywgMCwgMCk7XG5cbiAgICAgICAgICAgIC8vIFJlbmRlciB0aGUgbmV3IHJvd3MuXG4gICAgICAgICAgICB0aGlzLl90ZXh0X2NhbnZhcy5jbGVhcigpO1xuICAgICAgICAgICAgaWYgKHRoaXMuX3RvcF9yb3cgPCBsYXN0X3RvcF9yb3cpIHtcbiAgICAgICAgICAgICAgICAvLyBTY3JvbGxlZCB1cCB0aGUgZG9jdW1lbnQgKHRoZSBzY3JvbGxiYXIgbW92ZWQgdXAsIHBhZ2UgZG93bilcbiAgICAgICAgICAgICAgICB0aGlzLl9yZW5kZXJfcm93cyh0aGlzLl90b3Bfcm93LCByb3dfZGVsdGEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBTY3JvbGxlZCBkb3duIHRoZSBkb2N1bWVudCAodGhlIHNjcm9sbGJhciBtb3ZlZCBkb3duLCBwYWdlIHVwKVxuICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlcl9yb3dzKHRoaXMuX3RvcF9yb3cgKyB0aGlzLl92aXNpYmxlX3Jvd19jb3VudCAtIHJvd19kZWx0YSwgcm93X2RlbHRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXNlIHRoZSBvbGQgY29udGVudCB0byBmaWxsIGluIHRoZSByZXN0LlxuICAgICAgICAgICAgdGhpcy5fdGV4dF9jYW52YXMuZHJhd19pbWFnZSh0aGlzLl90bXBfY2FudmFzLCAwLCAtcm93X3Njcm9sbCAqIHRoaXMuX3Jvd19oZWlnaHQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRHJhdyBldmVyeXRoaW5nLlxuICAgICAgICAgICAgdGhpcy5fdGV4dF9jYW52YXMuY2xlYXIoKTtcbiAgICAgICAgICAgIHRoaXMuX3JlbmRlcl9yb3dzKHRoaXMuX3RvcF9yb3csIHRoaXMuX3Zpc2libGVfcm93X2NvdW50KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvLyBSZW5kZXIgdGhlIGJ1ZmZlciBhdCB0aGUgY29ycmVjdCBvZmZzZXQuXG4gICAgdGhpcy5fY2FudmFzLmNsZWFyKCk7XG4gICAgdGhpcy5fY2FudmFzLmRyYXdfaW1hZ2UoXG4gICAgICAgIHRoaXMuX3RleHRfY2FudmFzLFxuICAgICAgICAwLCBcbiAgICAgICAgdGhpcy5fcm93X3JlbmRlcmVyLmdldF9yb3dfdG9wKHRoaXMuX3RvcF9yb3cpIC0gdGhpcy5fcm93X3JlbmRlcmVyLnRvcCk7XG59O1xuXG5MaW5lTnVtYmVyc1JlbmRlcmVyLnByb3RvdHlwZS5yZXJlbmRlciA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIERyYXcgZXZlcnl0aGluZy5cbiAgICB0aGlzLl90ZXh0X2NhbnZhcy5lcmFzZV9vcHRpb25zX2NhY2hlKCk7XG4gICAgdGhpcy5fdGV4dF9jYW52YXMuY2xlYXIoKTtcbiAgICB0aGlzLl9yZW5kZXJfcm93cyh0aGlzLl90b3Bfcm93LCB0aGlzLl92aXNpYmxlX3Jvd19jb3VudCk7XG5cbiAgICAvLyBSZW5kZXIgdGhlIGJ1ZmZlciBhdCB0aGUgY29ycmVjdCBvZmZzZXQuXG4gICAgdGhpcy5fY2FudmFzLmNsZWFyKCk7XG4gICAgdGhpcy5fY2FudmFzLmRyYXdfaW1hZ2UoXG4gICAgICAgIHRoaXMuX3RleHRfY2FudmFzLFxuICAgICAgICAwLCBcbiAgICAgICAgdGhpcy5fcm93X3JlbmRlcmVyLmdldF9yb3dfdG9wKHRoaXMuX3RvcF9yb3cpIC0gdGhpcy5fcm93X3JlbmRlcmVyLnRvcCk7XG59O1xuXG4vKipcbiAqIFJlbmRlcnMgYSBzZXQgb2YgbGluZSBudW1iZXJzLlxuICogQHBhcmFtICB7aW50ZWdlcn0gc3RhcnRfcm93XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBudW1fcm93c1xuICovXG5MaW5lTnVtYmVyc1JlbmRlcmVyLnByb3RvdHlwZS5fcmVuZGVyX3Jvd3MgPSBmdW5jdGlvbihzdGFydF9yb3csIG51bV9yb3dzKSB7XG4gICAgZm9yICh2YXIgaSA9IHN0YXJ0X3JvdzsgaSA8IHN0YXJ0X3JvdyArIG51bV9yb3dzOyBpKyspIHtcbiAgICAgICAgdmFyIHkgPSAoaSAtIHRoaXMuX3RvcF9yb3cpICogdGhpcy5fcm93X2hlaWdodDtcbiAgICAgICAgaWYgKHRoaXMuX3BsdWdpbi5wb3N0ZXIuY29uZmlnLmhpZ2hsaWdodF9kcmF3KSB7XG4gICAgICAgICAgICB0aGlzLl90ZXh0X2NhbnZhcy5kcmF3X3JlY3RhbmdsZSgwLCB5LCB0aGlzLl90ZXh0X2NhbnZhcy53aWR0aCwgdGhpcy5fcm93X2hlaWdodCwge1xuICAgICAgICAgICAgICAgIGZpbGxfY29sb3I6IHV0aWxzLnJhbmRvbV9jb2xvcigpLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl90ZXh0X2NhbnZhcy5kcmF3X3RleHQoMTAsIHksIFN0cmluZyhpKzEpLCB7XG4gICAgICAgICAgICBmb250X2ZhbWlseTogJ21vbm9zcGFjZScsXG4gICAgICAgICAgICBmb250X3NpemU6IDE0LFxuICAgICAgICAgICAgY29sb3I6IHRoaXMuX3BsdWdpbi5wb3N0ZXIuc3R5bGUuZ3V0dGVyX3RleHQgfHwgJ2JsYWNrJyxcbiAgICAgICAgfSk7XG4gICAgfVxuXG59O1xuXG4vKipcbiAqIEhhbmRsZXMgd2hlbiB0aGUgZ3V0dGVyIGlzIHJlc2l6ZWRcbiAqL1xuTGluZU51bWJlcnNSZW5kZXJlci5wcm90b3R5cGUuX2d1dHRlcl9yZXNpemUgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl90ZXh0X2NhbnZhcy53aWR0aCA9IHRoaXMuX2d1dHRlci5ndXR0ZXJfd2lkdGg7XG4gICAgdGhpcy5fdG1wX2NhbnZhcy53aWR0aCA9IHRoaXMuX2d1dHRlci5ndXR0ZXJfd2lkdGg7IFxuICAgIHRoaXMuX3RvcF9yb3cgPSBudWxsO1xuICAgIHRoaXMucmVyZW5kZXIoKTtcbn07XG5cbi8qKlxuICogVW5yZWdpc3RlciB0aGUgZXZlbnQgbGlzdGVuZXJzXG4gKiBAcGFyYW0gIHtQb3N0ZXJ9IHBvc3RlclxuICogQHBhcmFtICB7R3V0dGVyfSBndXR0ZXJcbiAqL1xuTGluZU51bWJlcnNSZW5kZXJlci5wcm90b3R5cGUudW5yZWdpc3RlciA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2d1dHRlci5vZmYoJ2NoYW5nZWQnLCB0aGlzLl9yZW5kZXIpO1xufTtcblxuZXhwb3J0cy5MaW5lTnVtYmVyc1JlbmRlcmVyID0gTGluZU51bWJlcnNSZW5kZXJlcjtcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJyk7XG52YXIgcGx1Z2luYmFzZSA9IHJlcXVpcmUoJy4vcGx1Z2luLmpzJyk7XG52YXIgZ3V0dGVyID0gcmVxdWlyZSgnLi9ndXR0ZXIvZ3V0dGVyLmpzJyk7XG52YXIgbGluZW51bWJlcnMgPSByZXF1aXJlKCcuL2xpbmVudW1iZXJzL2xpbmVudW1iZXJzLmpzJyk7XG5cbi8qKlxuICogUGx1Z2luIG1hbmFnZXIgY2xhc3NcbiAqL1xudmFyIFBsdWdpbk1hbmFnZXIgPSBmdW5jdGlvbihwb3N0ZXIpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX3Bvc3RlciA9IHBvc3RlcjtcblxuICAgIC8vIFBvcHVsYXRlIGJ1aWx0LWluIHBsdWdpbiBsaXN0LlxuICAgIHRoaXMuX2ludGVybmFsX3BsdWdpbnMgPSB7fTtcbiAgICB0aGlzLl9pbnRlcm5hbF9wbHVnaW5zLmd1dHRlciA9IGd1dHRlci5HdXR0ZXI7XG4gICAgdGhpcy5faW50ZXJuYWxfcGx1Z2lucy5saW5lbnVtYmVycyA9IGxpbmVudW1iZXJzLkxpbmVOdW1iZXJzO1xuXG4gICAgLy8gUHJvcGVydGllc1xuICAgIHRoaXMuX3BsdWdpbnMgPSBbXTtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhpcy5wcm9wZXJ0eSgncGx1Z2lucycsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gW10uY29uY2F0KHRoYXQuX3BsdWdpbnMpO1xuICAgIH0pO1xufTtcbnV0aWxzLmluaGVyaXQoUGx1Z2luTWFuYWdlciwgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vKipcbiAqIExvYWRzIGEgcGx1Z2luXG4gKiBAcGFyYW0gIHtzdHJpbmcgb3IgUGx1Z2luQmFzZX0gcGx1Z2luXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gc3VjY2Vzc1xuICovXG5QbHVnaW5NYW5hZ2VyLnByb3RvdHlwZS5sb2FkID0gZnVuY3Rpb24ocGx1Z2luKSB7XG4gICAgaWYgKCEocGx1Z2luIGluc3RhbmNlb2YgcGx1Z2luYmFzZS5QbHVnaW5CYXNlKSkge1xuICAgICAgICB2YXIgcGx1Z2luX2NsYXNzID0gdGhpcy5faW50ZXJuYWxfcGx1Z2luc1twbHVnaW5dO1xuICAgICAgICBpZiAocGx1Z2luX2NsYXNzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHBsdWdpbiA9IG5ldyBwbHVnaW5fY2xhc3MoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwbHVnaW4gaW5zdGFuY2VvZiBwbHVnaW5iYXNlLlBsdWdpbkJhc2UpIHtcbiAgICAgICAgdGhpcy5fcGx1Z2lucy5wdXNoKHBsdWdpbik7XG4gICAgICAgIHBsdWdpbi5fbG9hZCh0aGlzLCB0aGlzLl9wb3N0ZXIpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBVbmxvYWRzIGEgcGx1Z2luXG4gKiBAcGFyYW0gIHtQbHVnaW5CYXNlfSBwbHVnaW5cbiAqIEByZXR1cm5zIHtib29sZWFufSBzdWNjZXNzXG4gKi9cblBsdWdpbk1hbmFnZXIucHJvdG90eXBlLnVubG9hZCA9IGZ1bmN0aW9uKHBsdWdpbikge1xuICAgIHZhciBpbmRleCA9IHRoaXMuX3BsdWdpbnMuaW5kZXhPZihwbHVnaW4pO1xuICAgIGlmIChpbmRleCAhPSAtMSkge1xuICAgICAgICB0aGlzLl9wbHVnaW5zLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgIHBsdWdpbi5fdW5sb2FkKCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKipcbiAqIEZpbmRzIHRoZSBpbnN0YW5jZSBvZiBhIHBsdWdpbi5cbiAqIEBwYXJhbSAge3N0cmluZyBvciB0eXBlfSBwbHVnaW5fY2xhc3MgLSBuYW1lIG9mIGludGVybmFsIHBsdWdpbiBvciBwbHVnaW4gY2xhc3NcbiAqIEByZXR1cm4ge2FycmF5fSBvZiBwbHVnaW4gaW5zdGFuY2VzXG4gKi9cblBsdWdpbk1hbmFnZXIucHJvdG90eXBlLmZpbmQgPSBmdW5jdGlvbihwbHVnaW5fY2xhc3MpIHtcbiAgICBpZiAodGhpcy5faW50ZXJuYWxfcGx1Z2luc1twbHVnaW5fY2xhc3NdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcGx1Z2luX2NsYXNzID0gdGhpcy5faW50ZXJuYWxfcGx1Z2luc1twbHVnaW5fY2xhc3NdO1xuICAgIH1cblxuICAgIHZhciBmb3VuZCA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fcGx1Z2lucy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAodGhpcy5fcGx1Z2luc1tpXSBpbnN0YW5jZW9mIHBsdWdpbl9jbGFzcykge1xuICAgICAgICAgICAgZm91bmQucHVzaCh0aGlzLl9wbHVnaW5zW2ldKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZm91bmQ7XG59O1xuXG5leHBvcnRzLlBsdWdpbk1hbmFnZXIgPSBQbHVnaW5NYW5hZ2VyO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMuanMnKTtcblxuLyoqXG4gKiBQbHVnaW4gYmFzZSBjbGFzc1xuICovXG52YXIgUGx1Z2luQmFzZSA9IGZ1bmN0aW9uKCkge1xuICAgIHV0aWxzLlBvc3RlckNsYXNzLmNhbGwodGhpcyk7XG4gICAgdGhpcy5fcmVuZGVyZXJzID0gW107XG4gICAgdGhpcy5sb2FkZWQgPSBmYWxzZTtcblxuICAgIC8vIFByb3BlcnRpZXNcbiAgICB0aGlzLl9wb3N0ZXIgPSBudWxsO1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLnByb3BlcnR5KCdwb3N0ZXInLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQuX3Bvc3RlcjtcbiAgICB9KTtcbn07XG51dGlscy5pbmhlcml0KFBsdWdpbkJhc2UsIHV0aWxzLlBvc3RlckNsYXNzKTtcblxuLyoqXG4gKiBMb2FkcyB0aGUgcGx1Z2luXG4gKi9cblBsdWdpbkJhc2UucHJvdG90eXBlLl9sb2FkID0gZnVuY3Rpb24obWFuYWdlciwgcG9zdGVyKSB7XG4gICAgdGhpcy5fcG9zdGVyID0gcG9zdGVyO1xuICAgIHRoaXMuX21hbmFnZXIgPSBtYW5hZ2VyO1xuICAgIHRoaXMubG9hZGVkID0gdHJ1ZTtcblxuICAgIHRoaXMudHJpZ2dlcignbG9hZCcpO1xufTtcblxuLyoqXG4gKiBVbmxvYWRzIHRoaXMgcGx1Z2luXG4gKi9cblBsdWdpbkJhc2UucHJvdG90eXBlLnVubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX21hbmFnZXIudW5sb2FkKHRoaXMpO1xufTtcblxuLyoqXG4gKiBUcmlnZ2VyIHVubG9hZCBldmVudFxuICovXG5QbHVnaW5CYXNlLnByb3RvdHlwZS5fdW5sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gVW5yZWdpc3RlciBhbGwgcmVuZGVyZXJzLlxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fcmVuZGVyZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRoaXMuX3VucmVnaXN0ZXJfcmVuZGVyZXIodGhpcy5fcmVuZGVyZXJzW2ldKTtcbiAgICB9XG4gICAgdGhpcy5sb2FkZWQgPSBmYWxzZTtcbiAgICB0aGlzLnRyaWdnZXIoJ3VubG9hZCcpO1xufTtcblxuLyoqXG4gKiBSZWdpc3RlcnMgYSByZW5kZXJlclxuICogQHBhcmFtICB7UmVuZGVyZXJCYXNlfSByZW5kZXJlclxuICovXG5QbHVnaW5CYXNlLnByb3RvdHlwZS5yZWdpc3Rlcl9yZW5kZXJlciA9IGZ1bmN0aW9uKHJlbmRlcmVyKSB7XG4gICAgdGhpcy5fcmVuZGVyZXJzLnB1c2gocmVuZGVyZXIpO1xuICAgIHRoaXMucG9zdGVyLnZpZXcuYWRkX3JlbmRlcmVyKHJlbmRlcmVyKTtcbn07XG5cbi8qKlxuICogVW5yZWdpc3RlcnMgYSByZW5kZXJlciBhbmQgcmVtb3ZlcyBpdCBmcm9tIHRoZSBpbnRlcm5hbCBsaXN0LlxuICogQHBhcmFtICB7UmVuZGVyZXJCYXNlfSByZW5kZXJlclxuICovXG5QbHVnaW5CYXNlLnByb3RvdHlwZS51bnJlZ2lzdGVyX3JlbmRlcmVyID0gZnVuY3Rpb24ocmVuZGVyZXIpIHtcbiAgICB2YXIgaW5kZXggPSB0aGlzLl9yZW5kZXJlcnMuaW5kZXhPZihyZW5kZXJlcik7XG4gICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgICB0aGlzLl9yZW5kZXJlcnMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9XG5cbiAgICB0aGlzLl91bnJlZ2lzdGVyX3JlbmRlcmVyKHJlbmRlcmVyKTtcbn07XG5cbi8qKlxuICogVW5yZWdpc3RlcnMgYSByZW5kZXJlclxuICogQHBhcmFtICB7UmVuZGVyZXJCYXNlfSByZW5kZXJlclxuICovXG5QbHVnaW5CYXNlLnByb3RvdHlwZS5fdW5yZWdpc3Rlcl9yZW5kZXJlciA9IGZ1bmN0aW9uKHJlbmRlcmVyKSB7XG4gICAgdGhpcy5wb3N0ZXIudmlldy5yZW1vdmVfcmVuZGVyZXIocmVuZGVyZXIpO1xufTtcblxuZXhwb3J0cy5QbHVnaW5CYXNlID0gUGx1Z2luQmFzZTtcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJyk7XG52YXIgcmVuZGVyZXIgPSByZXF1aXJlKCcuL3JlbmRlcmVyLmpzJyk7XG5cbi8qKlxuICogR3JvdXBzIG11bHRpcGxlIHJlbmRlcmVyc1xuICogQHBhcmFtIHthcnJheX0gcmVuZGVyZXJzIC0gYXJyYXkgb2YgcmVuZGVyZXJzXG4gKiBAcGFyYW0ge0NhbnZhc30gY2FudmFzXG4gKi9cbnZhciBCYXRjaFJlbmRlcmVyID0gZnVuY3Rpb24ocmVuZGVyZXJzLCBjYW52YXMpIHtcbiAgICByZW5kZXJlci5SZW5kZXJlckJhc2UuY2FsbCh0aGlzLCBjYW52YXMpO1xuICAgIHRoaXMuX3JlbmRlcl9sb2NrID0gZmFsc2U7XG4gICAgdGhpcy5fcmVuZGVyZXJzID0gcmVuZGVyZXJzO1xuXG4gICAgLy8gTGlzdGVuIHRvIHRoZSBsYXllcnMsIGlmIG9uZSBsYXllciBjaGFuZ2VzLCByZWNvbXBvc2VcbiAgICAvLyB0aGUgZnVsbCBpbWFnZSBieSBjb3B5aW5nIHRoZW0gYWxsIGFnYWluLlxuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLl9yZW5kZXJlcnMuZm9yRWFjaChmdW5jdGlvbihyZW5kZXJlcikge1xuICAgICAgICByZW5kZXJlci5vbignY2hhbmdlZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhhdC5fY29weV9yZW5kZXJlcnMoKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgXG4gICAgLy8gQ3JlYXRlIHByb3BlcnRpZXMuXG4gICAgdGhpcy5wcm9wZXJ0eSgnd2lkdGgnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQuX2NhbnZhcy53aWR0aDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Ll9jYW52YXMud2lkdGggPSB2YWx1ZTtcbiAgICAgICAgdGhhdC5fcmVuZGVyZXJzLmZvckVhY2goZnVuY3Rpb24ocmVuZGVyZXIpIHtcbiAgICAgICAgICAgIHJlbmRlcmVyLndpZHRoID0gdmFsdWU7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ2hlaWdodCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fY2FudmFzLmhlaWdodDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Ll9jYW52YXMuaGVpZ2h0ID0gdmFsdWU7XG4gICAgICAgIHRoYXQuX3JlbmRlcmVycy5mb3JFYWNoKGZ1bmN0aW9uKHJlbmRlcmVyKSB7XG4gICAgICAgICAgICByZW5kZXJlci5oZWlnaHQgPSB2YWx1ZTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59O1xudXRpbHMuaW5oZXJpdChCYXRjaFJlbmRlcmVyLCByZW5kZXJlci5SZW5kZXJlckJhc2UpO1xuXG4vKipcbiAqIEFkZHMgYSByZW5kZXJlclxuICovXG5CYXRjaFJlbmRlcmVyLnByb3RvdHlwZS5hZGRfcmVuZGVyZXIgPSBmdW5jdGlvbihyZW5kZXJlcikge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLl9yZW5kZXJlcnMucHVzaChyZW5kZXJlcik7XG4gICAgcmVuZGVyZXIub24oJ2NoYW5nZWQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhhdC5fY29weV9yZW5kZXJlcnMoKTtcbiAgICB9KTtcbn07XG5cbi8qKlxuICogUmVtb3ZlcyBhIHJlbmRlcmVyXG4gKi9cbkJhdGNoUmVuZGVyZXIucHJvdG90eXBlLnJlbW92ZV9yZW5kZXJlciA9IGZ1bmN0aW9uKHJlbmRlcmVyKSB7XG4gICAgdmFyIGluZGV4ID0gdGhpcy5fcmVuZGVyZXJzLmluZGV4T2YocmVuZGVyZXIpO1xuICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgICAgdGhpcy5fcmVuZGVyZXJzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgIHJlbmRlcmVyLm9mZignY2hhbmdlZCcpO1xuICAgIH1cbn07XG5cbi8qKlxuICogUmVuZGVyIHRvIHRoZSBjYW52YXNcbiAqIEBwYXJhbSB7ZGljdGlvbmFyeX0gKG9wdGlvbmFsKSBzY3JvbGwgLSBIb3cgbXVjaCB0aGUgY2FudmFzIHdhcyBzY3JvbGxlZC4gIFRoaXNcbiAqICAgICAgICAgICAgICAgICAgICAgaXMgYSBkaWN0aW9uYXJ5IG9mIHRoZSBmb3JtIHt4OiBmbG9hdCwgeTogZmxvYXR9XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5CYXRjaFJlbmRlcmVyLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbihzY3JvbGwpIHtcbiAgICBpZiAoIXRoaXMuX3JlbmRlcl9sb2NrKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLl9yZW5kZXJfbG9jayA9IHRydWU7XG5cbiAgICAgICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgICAgIHRoaXMuX3JlbmRlcmVycy5mb3JFYWNoKGZ1bmN0aW9uKHJlbmRlcmVyKSB7XG5cbiAgICAgICAgICAgICAgICAvLyBBcHBseSB0aGUgcmVuZGVyaW5nIGNvb3JkaW5hdGUgdHJhbnNmb3JtcyBvZiB0aGUgcGFyZW50LlxuICAgICAgICAgICAgICAgIGlmICghcmVuZGVyZXIub3B0aW9ucy5wYXJlbnRfaW5kZXBlbmRlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVuZGVyZXIuX2NhbnZhcy5fdHggPSB1dGlscy5wcm94eSh0aGF0Ll9jYW52YXMuX3R4LCB0aGF0Ll9jYW52YXMpO1xuICAgICAgICAgICAgICAgICAgICByZW5kZXJlci5fY2FudmFzLl90eSA9IHV0aWxzLnByb3h5KHRoYXQuX2NhbnZhcy5fdHksIHRoYXQuX2NhbnZhcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHRoaXMuX3JlbmRlcmVycy5mb3JFYWNoKGZ1bmN0aW9uKHJlbmRlcmVyKSB7XG4gICAgICAgICAgICAgICAgIC8vIFRlbGwgdGhlIHJlbmRlcmVyIHRvIHJlbmRlciBpdHNlbGYuXG4gICAgICAgICAgICAgICAgcmVuZGVyZXIucmVuZGVyKHNjcm9sbCk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gQ29weSB0aGUgcmVzdWx0cyB0byBzZWxmLlxuICAgICAgICAgICAgdGhpcy5fY29weV9yZW5kZXJlcnMoKTtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIHRoaXMuX3JlbmRlcl9sb2NrID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vKipcbiAqIENvcGllcyBhbGwgdGhlIHJlbmRlcmVyIGxheWVycyB0byB0aGUgY2FudmFzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQmF0Y2hSZW5kZXJlci5wcm90b3R5cGUuX2NvcHlfcmVuZGVyZXJzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMuX2NhbnZhcy5jbGVhcigpO1xuICAgIHRoaXMuX3JlbmRlcmVycy5mb3JFYWNoKGZ1bmN0aW9uKHJlbmRlcmVyKSB7XG4gICAgICAgIHRoYXQuX2NvcHlfcmVuZGVyZXIocmVuZGVyZXIpO1xuICAgIH0pO1xufTtcblxuLyoqXG4gKiBDb3B5IGEgcmVuZGVyZXIgdG8gdGhlIGNhbnZhcy5cbiAqIEBwYXJhbSAge1JlbmRlcmVyQmFzZX0gcmVuZGVyZXJcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkJhdGNoUmVuZGVyZXIucHJvdG90eXBlLl9jb3B5X3JlbmRlcmVyID0gZnVuY3Rpb24ocmVuZGVyZXIpIHtcbiAgICB0aGlzLl9jYW52YXMuZHJhd19pbWFnZShcbiAgICAgICAgcmVuZGVyZXIuX2NhbnZhcywgXG4gICAgICAgIHRoaXMubGVmdCwgXG4gICAgICAgIHRoaXMudG9wLCBcbiAgICAgICAgdGhpcy5fY2FudmFzLndpZHRoLCBcbiAgICAgICAgdGhpcy5fY2FudmFzLmhlaWdodCk7XG59O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLkJhdGNoUmVuZGVyZXIgPSBCYXRjaFJlbmRlcmVyO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMuanMnKTtcbnZhciByZW5kZXJlciA9IHJlcXVpcmUoJy4vcmVuZGVyZXIuanMnKTtcblxuLyoqXG4gKiBSZW5kZXJzIHRvIGEgY2FudmFzXG4gKiBAcGFyYW0ge0NhbnZhc30gZGVmYXVsdF9jYW52YXNcbiAqL1xudmFyIENvbG9yUmVuZGVyZXIgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBDcmVhdGUgd2l0aCB0aGUgb3B0aW9uICdwYXJlbnRfaW5kZXBlbmRlbnQnIHRvIGRpc2FibGVcbiAgICAvLyBwYXJlbnQgY29vcmRpbmF0ZSB0cmFuc2xhdGlvbnMgZnJvbSBiZWluZyBhcHBsaWVkIGJ5IFxuICAgIC8vIGEgYmF0Y2ggcmVuZGVyZXIuXG4gICAgcmVuZGVyZXIuUmVuZGVyZXJCYXNlLmNhbGwodGhpcywgdW5kZWZpbmVkLCB7cGFyZW50X2luZGVwZW5kZW50OiB0cnVlfSk7XG4gICAgdGhpcy5fcmVuZGVyZWQgPSBmYWxzZTtcbiAgICBcbiAgICAvLyBDcmVhdGUgcHJvcGVydGllcy5cbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhpcy5wcm9wZXJ0eSgnd2lkdGgnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQuX2NhbnZhcy53aWR0aDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Ll9jYW52YXMud2lkdGggPSB2YWx1ZTtcbiAgICAgICAgdGhhdC5fcmVuZGVyKCk7XG5cbiAgICAgICAgLy8gVGVsbCBwYXJlbnQgbGF5ZXIgdGhpcyBvbmUgaGFzIGNoYW5nZWQuXG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgIH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ2hlaWdodCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fY2FudmFzLmhlaWdodDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Ll9jYW52YXMuaGVpZ2h0ID0gdmFsdWU7XG4gICAgICAgIHRoYXQuX3JlbmRlcigpO1xuXG4gICAgICAgIC8vIFRlbGwgcGFyZW50IGxheWVyIHRoaXMgb25lIGhhcyBjaGFuZ2VkLlxuICAgICAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZWQnKTtcbiAgICB9KTtcbiAgICB0aGlzLnByb3BlcnR5KCdjb2xvcicsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fY29sb3I7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC5fY29sb3IgPSB2YWx1ZTtcbiAgICAgICAgdGhhdC5fcmVuZGVyKCk7XG5cbiAgICAgICAgLy8gVGVsbCBwYXJlbnQgbGF5ZXIgdGhpcyBvbmUgaGFzIGNoYW5nZWQuXG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgIH0pO1xufTtcbnV0aWxzLmluaGVyaXQoQ29sb3JSZW5kZXJlciwgcmVuZGVyZXIuUmVuZGVyZXJCYXNlKTtcblxuLyoqXG4gKiBSZW5kZXIgdG8gdGhlIGNhbnZhc1xuICogQHBhcmFtIHtkaWN0aW9uYXJ5fSAob3B0aW9uYWwpIHNjcm9sbCAtIEhvdyBtdWNoIHRoZSBjYW52YXMgd2FzIHNjcm9sbGVkLiAgVGhpc1xuICogICAgICAgICAgICAgICAgICAgICBpcyBhIGRpY3Rpb25hcnkgb2YgdGhlIGZvcm0ge3g6IGZsb2F0LCB5OiBmbG9hdH1cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkNvbG9yUmVuZGVyZXIucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKHNjcm9sbCkge1xuICAgIGlmICghdGhpcy5fcmVuZGVyZWQpIHtcbiAgICAgICAgdGhpcy5fcmVuZGVyKCk7XG4gICAgICAgIHRoaXMuX3JlbmRlcmVkID0gdHJ1ZTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFJlbmRlciBhIGZyYW1lLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ29sb3JSZW5kZXJlci5wcm90b3R5cGUuX3JlbmRlciA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2NhbnZhcy5jbGVhcigpO1xuICAgIHRoaXMuX2NhbnZhcy5kcmF3X3JlY3RhbmdsZSgwLCAwLCB0aGlzLl9jYW52YXMud2lkdGgsIHRoaXMuX2NhbnZhcy5oZWlnaHQsIHtmaWxsX2NvbG9yOiB0aGlzLl9jb2xvcn0pO1xufTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5Db2xvclJlbmRlcmVyID0gQ29sb3JSZW5kZXJlcjtcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciBhbmltYXRvciA9IHJlcXVpcmUoJy4uL2FuaW1hdG9yLmpzJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpO1xudmFyIHJlbmRlcmVyID0gcmVxdWlyZSgnLi9yZW5kZXJlci5qcycpO1xuXG4vKipcbiAqIFJlbmRlciBkb2N1bWVudCBjdXJzb3JzXG4gKlxuICogVE9ETzogT25seSByZW5kZXIgdmlzaWJsZS5cbiAqL1xudmFyIEN1cnNvcnNSZW5kZXJlciA9IGZ1bmN0aW9uKGN1cnNvcnMsIHN0eWxlLCByb3dfcmVuZGVyZXIsIGhhc19mb2N1cykge1xuICAgIHJlbmRlcmVyLlJlbmRlcmVyQmFzZS5jYWxsKHRoaXMpO1xuICAgIHRoaXMuc3R5bGUgPSBzdHlsZTtcbiAgICB0aGlzLl9oYXNfZm9jdXMgPSBoYXNfZm9jdXM7XG4gICAgdGhpcy5fY3Vyc29ycyA9IGN1cnNvcnM7XG5cbiAgICB0aGlzLl9yb3dfcmVuZGVyZXIgPSByb3dfcmVuZGVyZXI7XG4gICAgLy8gVE9ETzogUmVtb3ZlIHRoZSBmb2xsb3dpbmcgYmxvY2suXG4gICAgdGhpcy5fZ2V0X3Zpc2libGVfcm93cyA9IHV0aWxzLnByb3h5KHJvd19yZW5kZXJlci5nZXRfdmlzaWJsZV9yb3dzLCByb3dfcmVuZGVyZXIpO1xuICAgIHRoaXMuX2dldF9yb3dfaGVpZ2h0ID0gdXRpbHMucHJveHkocm93X3JlbmRlcmVyLmdldF9yb3dfaGVpZ2h0LCByb3dfcmVuZGVyZXIpO1xuICAgIHRoaXMuX2dldF9yb3dfdG9wID0gdXRpbHMucHJveHkocm93X3JlbmRlcmVyLmdldF9yb3dfdG9wLCByb3dfcmVuZGVyZXIpO1xuICAgIHRoaXMuX21lYXN1cmVfcGFydGlhbF9yb3cgPSB1dGlscy5wcm94eShyb3dfcmVuZGVyZXIubWVhc3VyZV9wYXJ0aWFsX3Jvd193aWR0aCwgcm93X3JlbmRlcmVyKTtcbiAgICBcbiAgICB0aGlzLl9ibGlua19hbmltYXRvciA9IG5ldyBhbmltYXRvci5BbmltYXRvcigxMDAwKTtcbiAgICB0aGlzLl9mcHMgPSAyO1xuXG4gICAgLy8gU3RhcnQgdGhlIGN1cnNvciByZW5kZXJpbmcgY2xvY2suXG4gICAgdGhpcy5fcmVuZGVyX2Nsb2NrKCk7XG4gICAgdGhpcy5fbGFzdF9yZW5kZXJlZCA9IG51bGw7XG5cbiAgICAvLyBXYXRjaCBmb3IgY3Vyc29yIGNoYW5nZSBldmVudHMuXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHZhciByZXJlbmRlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGF0Ll9ibGlua19hbmltYXRvci5yZXNldCgpO1xuICAgICAgICB0aGF0LnJlbmRlcigpO1xuICAgICAgICAvLyBUZWxsIHBhcmVudCBsYXllciB0aGlzIG9uZSBoYXMgY2hhbmdlZC5cbiAgICAgICAgdGhhdC50cmlnZ2VyKCdjaGFuZ2VkJyk7XG4gICAgfTtcbiAgICB0aGlzLl9jdXJzb3JzLm9uKCdjaGFuZ2UnLCByZXJlbmRlcik7XG59O1xudXRpbHMuaW5oZXJpdChDdXJzb3JzUmVuZGVyZXIsIHJlbmRlcmVyLlJlbmRlcmVyQmFzZSk7XG5cbi8qKlxuICogUmVuZGVyIHRvIHRoZSBjYW52YXNcbiAqIE5vdGU6IFRoaXMgbWV0aG9kIGlzIGNhbGxlZCBvZnRlbiwgc28gaXQncyBpbXBvcnRhbnQgdGhhdCBpdCdzXG4gKiBvcHRpbWl6ZWQgZm9yIHNwZWVkLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yc1JlbmRlcmVyLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9jYW52YXMuY2xlYXIoKTtcblxuICAgIC8vIE9ubHkgcmVuZGVyIGlmIHRoZSBjYW52YXMgaGFzIGZvY3VzLlxuICAgIGlmICh0aGlzLl9oYXNfZm9jdXMoKSAmJiB0aGlzLl9ibGlua19hbmltYXRvci50aW1lKCkgPCAwLjUpIHtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB0aGlzLl9jdXJzb3JzLmN1cnNvcnMuZm9yRWFjaChmdW5jdGlvbihjdXJzb3IpIHtcbiAgICAgICAgICAgIC8vIEdldCB0aGUgdmlzaWJsZSByb3dzLlxuICAgICAgICAgICAgdmFyIHZpc2libGVfcm93cyA9IHRoYXQuX2dldF92aXNpYmxlX3Jvd3MoKTtcblxuICAgICAgICAgICAgLy8gSWYgYSBjdXJzb3IgZG9lc24ndCBoYXZlIGEgcG9zaXRpb24sIHJlbmRlciBpdCBhdCB0aGVcbiAgICAgICAgICAgIC8vIGJlZ2lubmluZyBvZiB0aGUgZG9jdW1lbnQuXG4gICAgICAgICAgICB2YXIgcm93X2luZGV4ID0gY3Vyc29yLnByaW1hcnlfcm93IHx8IDA7XG4gICAgICAgICAgICB2YXIgY2hhcl9pbmRleCA9IGN1cnNvci5wcmltYXJ5X2NoYXIgfHwgMDtcblxuICAgICAgICAgICAgLy8gRHJhdyB0aGUgY3Vyc29yLlxuICAgICAgICAgICAgdmFyIGhlaWdodCA9IHRoYXQuX2dldF9yb3dfaGVpZ2h0KHJvd19pbmRleCk7XG4gICAgICAgICAgICB2YXIgbXVsdGlwbGllciA9IHRoYXQuc3R5bGUuY3Vyc29yX2hlaWdodCB8fCAxLjA7XG4gICAgICAgICAgICB2YXIgb2Zmc2V0ID0gKGhlaWdodCAtIChtdWx0aXBsaWVyKmhlaWdodCkpIC8gMjtcbiAgICAgICAgICAgIGhlaWdodCAqPSBtdWx0aXBsaWVyO1xuICAgICAgICAgICAgaWYgKHZpc2libGVfcm93cy50b3Bfcm93IDw9IHJvd19pbmRleCAmJiByb3dfaW5kZXggPD0gdmlzaWJsZV9yb3dzLmJvdHRvbV9yb3cpIHtcbiAgICAgICAgICAgICAgICB0aGF0Ll9jYW52YXMuZHJhd19yZWN0YW5nbGUoXG4gICAgICAgICAgICAgICAgICAgIGNoYXJfaW5kZXggPT09IDAgPyB0aGF0Ll9yb3dfcmVuZGVyZXIubWFyZ2luX2xlZnQgOiB0aGF0Ll9tZWFzdXJlX3BhcnRpYWxfcm93KHJvd19pbmRleCwgY2hhcl9pbmRleCkgKyB0aGF0Ll9yb3dfcmVuZGVyZXIubWFyZ2luX2xlZnQsIFxuICAgICAgICAgICAgICAgICAgICB0aGF0Ll9nZXRfcm93X3RvcChyb3dfaW5kZXgpICsgb2Zmc2V0LCBcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5zdHlsZS5jdXJzb3Jfd2lkdGg9PT11bmRlZmluZWQgPyAxLjAgOiB0aGF0LnN0eWxlLmN1cnNvcl93aWR0aCwgXG4gICAgICAgICAgICAgICAgICAgIGhlaWdodCwgXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbGxfY29sb3I6IHRoYXQuc3R5bGUuY3Vyc29yIHx8ICdiYWNrJyxcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9ICAgXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICB0aGlzLl9sYXN0X3JlbmRlcmVkID0gRGF0ZS5ub3coKTtcbn07XG5cbi8qKlxuICogQ2xvY2sgZm9yIHJlbmRlcmluZyB0aGUgY3Vyc29yLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yc1JlbmRlcmVyLnByb3RvdHlwZS5fcmVuZGVyX2Nsb2NrID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gSWYgdGhlIGNhbnZhcyBpcyBmb2N1c2VkLCByZWRyYXcuXG4gICAgaWYgKHRoaXMuX2hhc19mb2N1cygpKSB7XG4gICAgICAgIHZhciBmaXJzdF9yZW5kZXIgPSAhdGhpcy5fd2FzX2ZvY3VzZWQ7XG4gICAgICAgIHRoaXMuX3dhc19mb2N1c2VkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgLy8gVGVsbCBwYXJlbnQgbGF5ZXIgdGhpcyBvbmUgaGFzIGNoYW5nZWQuXG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgICAgICBpZiAoZmlyc3RfcmVuZGVyKSB0aGlzLnRyaWdnZXIoJ3RvZ2dsZScpO1xuXG4gICAgLy8gVGhlIGNhbnZhcyBpc24ndCBmb2N1c2VkLiAgSWYgdGhpcyBpcyB0aGUgZmlyc3QgdGltZVxuICAgIC8vIGl0IGhhc24ndCBiZWVuIGZvY3VzZWQsIHJlbmRlciBhZ2FpbiB3aXRob3V0IHRoZSBcbiAgICAvLyBjdXJzb3JzLlxuICAgIH0gZWxzZSBpZiAodGhpcy5fd2FzX2ZvY3VzZWQpIHtcbiAgICAgICAgdGhpcy5fd2FzX2ZvY3VzZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgLy8gVGVsbCBwYXJlbnQgbGF5ZXIgdGhpcyBvbmUgaGFzIGNoYW5nZWQuXG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ3RvZ2dsZScpO1xuICAgIH1cblxuICAgIC8vIFRpbWVyLlxuICAgIHNldFRpbWVvdXQodXRpbHMucHJveHkodGhpcy5fcmVuZGVyX2Nsb2NrLCB0aGlzKSwgMTAwMCAvIHRoaXMuX2Zwcyk7XG59O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLkN1cnNvcnNSZW5kZXJlciA9IEN1cnNvcnNSZW5kZXJlcjtcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJyk7XG52YXIgcm93ID0gcmVxdWlyZSgnLi9yb3cuanMnKTtcbnZhciBjb25maWcgPSByZXF1aXJlKCcuLi9jb25maWcuanMnKTtcbmNvbmZpZyA9IGNvbmZpZy5jb25maWc7XG5cbi8qKlxuICogUmVuZGVyIHRoZSB0ZXh0IHJvd3Mgb2YgYSBEb2N1bWVudE1vZGVsLlxuICogQHBhcmFtIHtEb2N1bWVudE1vZGVsfSBtb2RlbCBpbnN0YW5jZVxuICovXG52YXIgSGlnaGxpZ2h0ZWRSb3dSZW5kZXJlciA9IGZ1bmN0aW9uKG1vZGVsLCBzY3JvbGxpbmdfY2FudmFzLCBzdHlsZSkge1xuICAgIHJvdy5Sb3dSZW5kZXJlci5jYWxsKHRoaXMsIG1vZGVsLCBzY3JvbGxpbmdfY2FudmFzKTtcbiAgICB0aGlzLnN0eWxlID0gc3R5bGU7XG59O1xudXRpbHMuaW5oZXJpdChIaWdobGlnaHRlZFJvd1JlbmRlcmVyLCByb3cuUm93UmVuZGVyZXIpO1xuXG4vKipcbiAqIFJlbmRlciBhIHNpbmdsZSByb3dcbiAqIEBwYXJhbSAge2ludGVnZXJ9IGluZGV4XG4gKiBAcGFyYW0gIHtmbG9hdH0geFxuICogQHBhcmFtICB7ZmxvYXR9IHlcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkhpZ2hsaWdodGVkUm93UmVuZGVyZXIucHJvdG90eXBlLl9yZW5kZXJfcm93ID0gZnVuY3Rpb24oaW5kZXgsIHggLHkpIHtcbiAgICBpZiAoaW5kZXggPCAwIHx8IHRoaXMuX21vZGVsLl9yb3dzLmxlbmd0aCA8PSBpbmRleCkgcmV0dXJuO1xuICAgIFxuICAgIHZhciBncm91cHMgPSB0aGlzLl9nZXRfZ3JvdXBzKGluZGV4KTtcbiAgICB2YXIgbGVmdCA9IHg7XG4gICAgZm9yICh2YXIgaT0wOyBpPGdyb3Vwcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgd2lkdGggPSB0aGlzLl90ZXh0X2NhbnZhcy5tZWFzdXJlX3RleHQoZ3JvdXBzW2ldLnRleHQsIGdyb3Vwc1tpXS5vcHRpb25zKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChjb25maWcuaGlnaGxpZ2h0X2RyYXcpIHtcbiAgICAgICAgICAgIHRoaXMuX3RleHRfY2FudmFzLmRyYXdfcmVjdGFuZ2xlKGxlZnQsIHksIHdpZHRoLCB0aGlzLmdldF9yb3dfaGVpZ2h0KGkpLCB7XG4gICAgICAgICAgICAgICAgZmlsbF9jb2xvcjogdXRpbHMucmFuZG9tX2NvbG9yKCksXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX3RleHRfY2FudmFzLmRyYXdfdGV4dChsZWZ0LCB5LCBncm91cHNbaV0udGV4dCwgZ3JvdXBzW2ldLm9wdGlvbnMpO1xuICAgICAgICBsZWZ0ICs9IHdpZHRoO1xuICAgIH1cbn07XG5cbi8qKlxuICogR2V0IHJlbmRlciBncm91cHMgZm9yIGEgcm93LlxuICogQHBhcmFtICB7aW50ZWdlcn0gaW5kZXggb2YgdGhlIHJvd1xuICogQHJldHVybiB7YXJyYXl9IGFycmF5IG9mIHJlbmRlcmluZ3MsIGVhY2ggcmVuZGVyaW5nIGlzIGFuIGFycmF5IG9mXG4gKiAgICAgICAgICAgICAgICAgdGhlIGZvcm0ge29wdGlvbnMsIHRleHR9LlxuICovXG5IaWdobGlnaHRlZFJvd1JlbmRlcmVyLnByb3RvdHlwZS5fZ2V0X2dyb3VwcyA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgaWYgKGluZGV4IDwgMCB8fCB0aGlzLl9tb2RlbC5fcm93cy5sZW5ndGggPD0gaW5kZXgpIHJldHVybjtcblxuICAgIHZhciByb3dfdGV4dCA9IHRoaXMuX21vZGVsLl9yb3dzW2luZGV4XTtcbiAgICB2YXIgZ3JvdXBzID0gW107XG4gICAgdmFyIGxhc3Rfc3ludGF4ID0gbnVsbDtcbiAgICB2YXIgY2hhcl9pbmRleCA9IDA7XG4gICAgdmFyIHN0YXJ0ID0gMDtcbiAgICBmb3IgKGNoYXJfaW5kZXg7IGNoYXJfaW5kZXg8cm93X3RleHQubGVuZ3RoOyBjaGFyX2luZGV4KyspIHtcbiAgICAgICAgdmFyIHN5bnRheCA9IHRoaXMuX21vZGVsLmdldF90YWdzKGluZGV4LCBjaGFyX2luZGV4KS5zeW50YXg7XG4gICAgICAgIGlmICghdGhpcy5fY29tcGFyZV9zeW50YXgobGFzdF9zeW50YXgsc3ludGF4KSkge1xuICAgICAgICAgICAgaWYgKGNoYXJfaW5kZXggIT09IDApIHtcbiAgICAgICAgICAgICAgICBncm91cHMucHVzaCh7b3B0aW9uczogdGhpcy5fZ2V0X29wdGlvbnMobGFzdF9zeW50YXgpLCB0ZXh0OiByb3dfdGV4dC5zdWJzdHJpbmcoc3RhcnQsIGNoYXJfaW5kZXgpfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsYXN0X3N5bnRheCA9IHN5bnRheDtcbiAgICAgICAgICAgIHN0YXJ0ID0gY2hhcl9pbmRleDtcbiAgICAgICAgfVxuICAgIH1cbiAgICBncm91cHMucHVzaCh7b3B0aW9uczogdGhpcy5fZ2V0X29wdGlvbnMobGFzdF9zeW50YXgpLCB0ZXh0OiByb3dfdGV4dC5zdWJzdHJpbmcoc3RhcnQpfSk7XG5cbiAgICByZXR1cm4gZ3JvdXBzO1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgc3R5bGUgb3B0aW9ucyBkaWN0aW9uYXJ5IGZyb20gYSBzeW50YXggdGFnLlxuICogQHBhcmFtICB7c3RyaW5nfSBzeW50YXhcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkhpZ2hsaWdodGVkUm93UmVuZGVyZXIucHJvdG90eXBlLl9nZXRfb3B0aW9ucyA9IGZ1bmN0aW9uKHN5bnRheCkge1xuICAgIHZhciByZW5kZXJfb3B0aW9ucyA9IHV0aWxzLnNoYWxsb3dfY29weSh0aGlzLl9iYXNlX29wdGlvbnMpO1xuICAgIFxuICAgIC8vIEhpZ2hsaWdodCBpZiBhIHN5dGF4IGl0ZW0gYW5kIHN0eWxlIGFyZSBwcm92aWRlZC5cbiAgICBpZiAodGhpcy5zdHlsZSkge1xuXG4gICAgICAgIC8vIElmIHRoaXMgaXMgYSBuZXN0ZWQgc3ludGF4IGl0ZW0sIHVzZSB0aGUgbW9zdCBzcGVjaWZpYyBwYXJ0XG4gICAgICAgIC8vIHdoaWNoIGlzIGRlZmluZWQgaW4gdGhlIGFjdGl2ZSBzdHlsZS5cbiAgICAgICAgaWYgKHN5bnRheCAmJiBzeW50YXguaW5kZXhPZignICcpICE9IC0xKSB7XG4gICAgICAgICAgICB2YXIgcGFydHMgPSBzeW50YXguc3BsaXQoJyAnKTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSBwYXJ0cy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnN0eWxlW3BhcnRzW2ldXSkge1xuICAgICAgICAgICAgICAgICAgICBzeW50YXggPSBwYXJ0c1tpXTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gU3R5bGUgaWYgdGhlIHN5bnRheCBpdGVtIGlzIGRlZmluZWQgaW4gdGhlIHN0eWxlLlxuICAgICAgICBpZiAoc3ludGF4ICYmIHRoaXMuc3R5bGVbc3ludGF4XSkge1xuICAgICAgICAgICAgcmVuZGVyX29wdGlvbnMuY29sb3IgPSB0aGlzLnN0eWxlW3N5bnRheF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZW5kZXJfb3B0aW9ucy5jb2xvciA9IHRoaXMuc3R5bGUudGV4dCB8fCAnYmxhY2snO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIHJldHVybiByZW5kZXJfb3B0aW9ucztcbn07XG5cbi8qKlxuICogQ29tcGFyZSB0d28gc3ludGF4cy5cbiAqIEBwYXJhbSAge3N0cmluZ30gYSAtIHN5bnRheFxuICogQHBhcmFtICB7c3RyaW5nfSBiIC0gc3ludGF4XG4gKiBAcmV0dXJuIHtib29sfSB0cnVlIGlmIGEgYW5kIGIgYXJlIGVxdWFsXG4gKi9cbkhpZ2hsaWdodGVkUm93UmVuZGVyZXIucHJvdG90eXBlLl9jb21wYXJlX3N5bnRheCA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICByZXR1cm4gYSA9PT0gYjtcbn07XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuSGlnaGxpZ2h0ZWRSb3dSZW5kZXJlciA9IEhpZ2hsaWdodGVkUm93UmVuZGVyZXI7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgY2FudmFzID0gcmVxdWlyZSgnLi4vY2FudmFzLmpzJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpO1xuXG4vKipcbiAqIFJlbmRlcnMgdG8gYSBjYW52YXNcbiAqIEBwYXJhbSB7Q2FudmFzfSBkZWZhdWx0X2NhbnZhc1xuICovXG52YXIgUmVuZGVyZXJCYXNlID0gZnVuY3Rpb24oZGVmYXVsdF9jYW52YXMsIG9wdGlvbnMpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgdGhpcy5fY2FudmFzID0gZGVmYXVsdF9jYW52YXMgPyBkZWZhdWx0X2NhbnZhcyA6IG5ldyBjYW52YXMuQ2FudmFzKCk7XG4gICAgXG4gICAgLy8gQ3JlYXRlIHByb3BlcnRpZXMuXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMucHJvcGVydHkoJ3dpZHRoJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMud2lkdGg7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC5fY2FudmFzLndpZHRoID0gdmFsdWU7XG4gICAgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgnaGVpZ2h0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMuaGVpZ2h0O1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy5oZWlnaHQgPSB2YWx1ZTtcbiAgICB9KTtcbiAgICB0aGlzLnByb3BlcnR5KCd0b3AnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIC10aGF0Ll9jYW52YXMuX3R5KDApO1xuICAgIH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ2xlZnQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIC10aGF0Ll9jYW52YXMuX3R4KDApO1xuICAgIH0pO1xufTtcbnV0aWxzLmluaGVyaXQoUmVuZGVyZXJCYXNlLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8qKlxuICogUmVuZGVyIHRvIHRoZSBjYW52YXNcbiAqIEBwYXJhbSB7ZGljdGlvbmFyeX0gKG9wdGlvbmFsKSBzY3JvbGwgLSBIb3cgbXVjaCB0aGUgY2FudmFzIHdhcyBzY3JvbGxlZC4gIFRoaXNcbiAqICAgICAgICAgICAgICAgICAgICAgaXMgYSBkaWN0aW9uYXJ5IG9mIHRoZSBmb3JtIHt4OiBmbG9hdCwgeTogZmxvYXR9XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5SZW5kZXJlckJhc2UucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKHNjcm9sbCkge1xuICAgIHRocm93IG5ldyBFcnJvcignTm90IGltcGxlbWVudGVkJyk7XG59O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLlJlbmRlcmVyQmFzZSA9IFJlbmRlcmVyQmFzZTtcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciBjYW52YXMgPSByZXF1aXJlKCcuLi9jYW52YXMuanMnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJyk7XG52YXIgcmVuZGVyZXIgPSByZXF1aXJlKCcuL3JlbmRlcmVyLmpzJyk7XG5cbi8qKlxuICogUmVuZGVyIHRoZSB0ZXh0IHJvd3Mgb2YgYSBEb2N1bWVudE1vZGVsLlxuICogQHBhcmFtIHtEb2N1bWVudE1vZGVsfSBtb2RlbCBpbnN0YW5jZVxuICovXG52YXIgUm93UmVuZGVyZXIgPSBmdW5jdGlvbihtb2RlbCwgc2Nyb2xsaW5nX2NhbnZhcykge1xuICAgIHRoaXMuX21vZGVsID0gbW9kZWw7XG4gICAgdGhpcy5fdmlzaWJsZV9yb3dfY291bnQgPSAwO1xuXG4gICAgLy8gU2V0dXAgY2FudmFzZXNcbiAgICB0aGlzLl90ZXh0X2NhbnZhcyA9IG5ldyBjYW52YXMuQ2FudmFzKCk7XG4gICAgdGhpcy5fdG1wX2NhbnZhcyA9IG5ldyBjYW52YXMuQ2FudmFzKCk7XG4gICAgdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcyA9IHNjcm9sbGluZ19jYW52YXM7XG4gICAgdGhpcy5fcm93X3dpZHRoX2NvdW50cyA9IHt9OyAvLyBEaWN0aW9uYXJ5IG9mIHdpZHRocyAtPiByb3cgY291bnQgXG5cbiAgICAvLyBCYXNlXG4gICAgcmVuZGVyZXIuUmVuZGVyZXJCYXNlLmNhbGwodGhpcyk7XG5cbiAgICAvLyBTZXQgc29tZSBiYXNpYyByZW5kZXJpbmcgcHJvcGVydGllcy5cbiAgICB0aGlzLl9iYXNlX29wdGlvbnMgPSB7XG4gICAgICAgIGZvbnRfZmFtaWx5OiAnbW9ub3NwYWNlJyxcbiAgICAgICAgZm9udF9zaXplOiAxNCxcbiAgICB9O1xuICAgIHRoaXMuX2xpbmVfc3BhY2luZyA9IDI7XG5cbiAgICAvLyBDcmVhdGUgcHJvcGVydGllcy5cbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhpcy5wcm9wZXJ0eSgnd2lkdGgnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQuX2NhbnZhcy53aWR0aDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Ll9jYW52YXMud2lkdGggPSB2YWx1ZTtcbiAgICAgICAgdGhhdC5fdGV4dF9jYW52YXMud2lkdGggPSB2YWx1ZTtcbiAgICAgICAgdGhhdC5fdG1wX2NhbnZhcy53aWR0aCA9IHZhbHVlO1xuICAgIH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ2hlaWdodCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fY2FudmFzLmhlaWdodDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Ll9jYW52YXMuaGVpZ2h0ID0gdmFsdWU7XG5cbiAgICAgICAgLy8gVGhlIHRleHQgY2FudmFzIHNob3VsZCBiZSB0aGUgcmlnaHQgaGVpZ2h0IHRvIGZpdCBhbGwgb2YgdGhlIGxpbmVzXG4gICAgICAgIC8vIHRoYXQgd2lsbCBiZSByZW5kZXJlZCBpbiB0aGUgYmFzZSBjYW52YXMuICBUaGlzIGluY2x1ZGVzIHRoZSBsaW5lc1xuICAgICAgICAvLyB0aGF0IGFyZSBwYXJ0aWFsbHkgcmVuZGVyZWQgYXQgdGhlIHRvcCBhbmQgYm90dG9tIG9mIHRoZSBiYXNlIGNhbnZhcy5cbiAgICAgICAgdmFyIHJvd19oZWlnaHQgPSB0aGF0LmdldF9yb3dfaGVpZ2h0KCk7XG4gICAgICAgIHRoYXQuX3Zpc2libGVfcm93X2NvdW50ID0gTWF0aC5jZWlsKHZhbHVlL3Jvd19oZWlnaHQpICsgMTtcbiAgICAgICAgdGhhdC5fdGV4dF9jYW52YXMuaGVpZ2h0ID0gdGhhdC5fdmlzaWJsZV9yb3dfY291bnQgKiByb3dfaGVpZ2h0O1xuICAgICAgICB0aGF0Ll90bXBfY2FudmFzLmhlaWdodCA9IHRoYXQuX3RleHRfY2FudmFzLmhlaWdodDtcbiAgICB9KTtcbiAgICB0aGlzLl9tYXJnaW5fbGVmdCA9IDA7XG4gICAgdGhpcy5wcm9wZXJ0eSgnbWFyZ2luX2xlZnQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQuX21hcmdpbl9sZWZ0O1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgaW50ZXJuYWwgdmFsdWUuXG4gICAgICAgIHRoYXQuX21hcmdpbl9sZWZ0ID0gdmFsdWU7XG5cbiAgICAgICAgLy8gRm9yY2UgdGhlIGRvY3VtZW50IHRvIHJlY2FsY3VsYXRlIGl0cyBzaXplLlxuICAgICAgICB0aGF0Ll9oYW5kbGVfdmFsdWVfY2hhbmdlZCgpO1xuXG4gICAgICAgIC8vIFJlLXJlbmRlciB3aXRoIG5ldyBtYXJnaW4uXG4gICAgICAgIHRoYXQucmVuZGVyKCk7XG4gICAgICAgIC8vIFRlbGwgcGFyZW50IGxheWVyIHRoaXMgb25lIGhhcyBjaGFuZ2VkLlxuICAgICAgICB0aGF0LnRyaWdnZXIoJ2NoYW5nZWQnKTtcbiAgICB9KTtcbiAgICB0aGlzLl9tYXJnaW5fdG9wID0gMDtcbiAgICB0aGlzLnByb3BlcnR5KCdtYXJnaW5fdG9wJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9tYXJnaW5fdG9wO1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIC8vIFVwZGF0ZSB0aGUgc2Nyb2xsYmFycy5cbiAgICAgICAgdGhhdC5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfaGVpZ2h0ICs9IHZhbHVlIC0gdGhhdC5fbWFyZ2luX3RvcDtcblxuICAgICAgICAvLyBVcGRhdGUgaW50ZXJuYWwgdmFsdWUuXG4gICAgICAgIHRoYXQuX21hcmdpbl90b3AgPSB2YWx1ZTtcblxuICAgICAgICAvLyBSZS1yZW5kZXIgd2l0aCBuZXcgbWFyZ2luLlxuICAgICAgICB0aGF0LnJlbmRlcigpO1xuICAgICAgICAvLyBUZWxsIHBhcmVudCBsYXllciB0aGlzIG9uZSBoYXMgY2hhbmdlZC5cbiAgICAgICAgdGhhdC50cmlnZ2VyKCdjaGFuZ2VkJyk7XG4gICAgfSk7XG5cbiAgICAvLyBTZXQgaW5pdGlhbCBjYW52YXMgc2l6ZXMuICBUaGVzZSBsaW5lcyBtYXkgbG9vayByZWR1bmRhbnQsIGJ1dCBiZXdhcmVcbiAgICAvLyBiZWNhdXNlIHRoZXkgYWN0dWFsbHkgY2F1c2UgYW4gYXBwcm9wcmlhdGUgd2lkdGggYW5kIGhlaWdodCB0byBiZSBzZXQgZm9yXG4gICAgLy8gdGhlIHRleHQgY2FudmFzIGJlY2F1c2Ugb2YgdGhlIHByb3BlcnRpZXMgZGVjbGFyZWQgYWJvdmUuXG4gICAgdGhpcy53aWR0aCA9IHRoaXMuX2NhbnZhcy53aWR0aDtcbiAgICB0aGlzLmhlaWdodCA9IHRoaXMuX2NhbnZhcy5oZWlnaHQ7XG5cbiAgICB0aGlzLl9tb2RlbC5vbigndGV4dF9jaGFuZ2VkJywgdXRpbHMucHJveHkodGhpcy5faGFuZGxlX3ZhbHVlX2NoYW5nZWQsIHRoaXMpKTtcbiAgICB0aGlzLl9tb2RlbC5vbigncm93c19hZGRlZCcsIHV0aWxzLnByb3h5KHRoaXMuX2hhbmRsZV9yb3dzX2FkZGVkLCB0aGlzKSk7XG4gICAgdGhpcy5fbW9kZWwub24oJ3Jvd3NfcmVtb3ZlZCcsIHV0aWxzLnByb3h5KHRoaXMuX2hhbmRsZV9yb3dzX3JlbW92ZWQsIHRoaXMpKTtcbiAgICB0aGlzLl9tb2RlbC5vbigncm93X2NoYW5nZWQnLCB1dGlscy5wcm94eSh0aGlzLl9oYW5kbGVfcm93X2NoYW5nZWQsIHRoaXMpKTsgLy8gVE9ETzogSW1wbGVtZW50IG15IGV2ZW50LlxufTtcbnV0aWxzLmluaGVyaXQoUm93UmVuZGVyZXIsIHJlbmRlcmVyLlJlbmRlcmVyQmFzZSk7XG5cbi8qKlxuICogUmVuZGVyIHRvIHRoZSBjYW52YXNcbiAqIE5vdGU6IFRoaXMgbWV0aG9kIGlzIGNhbGxlZCBvZnRlbiwgc28gaXQncyBpbXBvcnRhbnQgdGhhdCBpdCdzXG4gKiBvcHRpbWl6ZWQgZm9yIHNwZWVkLlxuICogQHBhcmFtIHtkaWN0aW9uYXJ5fSAob3B0aW9uYWwpIHNjcm9sbCAtIEhvdyBtdWNoIHRoZSBjYW52YXMgd2FzIHNjcm9sbGVkLiAgVGhpc1xuICogICAgICAgICAgICAgICAgICAgICBpcyBhIGRpY3Rpb25hcnkgb2YgdGhlIGZvcm0ge3g6IGZsb2F0LCB5OiBmbG9hdH1cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbihzY3JvbGwpIHtcblxuICAgIC8vIElmIG9ubHkgdGhlIHkgYXhpcyB3YXMgc2Nyb2xsZWQsIGJsaXQgdGhlIGdvb2QgY29udGVudHMgYW5kIGp1c3QgcmVuZGVyXG4gICAgLy8gd2hhdCdzIG1pc3NpbmcuXG4gICAgdmFyIHBhcnRpYWxfcmVkcmF3ID0gKHNjcm9sbCAmJiBzY3JvbGwueCA9PT0gMCAmJiBNYXRoLmFicyhzY3JvbGwueSkgPCB0aGlzLl9jYW52YXMuaGVpZ2h0KTtcblxuICAgIC8vIFVwZGF0ZSB0aGUgdGV4dCByZW5kZXJpbmdcbiAgICB2YXIgdmlzaWJsZV9yb3dzID0gdGhpcy5nZXRfdmlzaWJsZV9yb3dzKCk7XG4gICAgdGhpcy5fcmVuZGVyX3RleHRfY2FudmFzKC10aGlzLl9zY3JvbGxpbmdfY2FudmFzLnNjcm9sbF9sZWZ0K3RoaXMuX21hcmdpbl9sZWZ0LCB2aXNpYmxlX3Jvd3MudG9wX3JvdywgIXBhcnRpYWxfcmVkcmF3KTtcblxuICAgIC8vIENvcHkgdGhlIHRleHQgaW1hZ2UgdG8gdGhpcyBjYW52YXNcbiAgICB0aGlzLl9jYW52YXMuY2xlYXIoKTtcbiAgICB0aGlzLl9jYW52YXMuZHJhd19pbWFnZShcbiAgICAgICAgdGhpcy5fdGV4dF9jYW52YXMsIFxuICAgICAgICB0aGlzLl9zY3JvbGxpbmdfY2FudmFzLnNjcm9sbF9sZWZ0LCBcbiAgICAgICAgdGhpcy5nZXRfcm93X3RvcCh2aXNpYmxlX3Jvd3MudG9wX3JvdykpO1xufTtcblxuLyoqXG4gKiBSZW5kZXIgdGV4dCB0byB0aGUgdGV4dCBjYW52YXMuXG4gKlxuICogTGF0ZXIsIHRoZSBtYWluIHJlbmRlcmluZyBmdW5jdGlvbiBjYW4gdXNlIHRoaXMgcmVuZGVyZWQgdGV4dCB0byBkcmF3IHRoZVxuICogYmFzZSBjYW52YXMuXG4gKiBAcGFyYW0gIHtmbG9hdH0geF9vZmZzZXQgLSBob3Jpem9udGFsIG9mZnNldCBvZiB0aGUgdGV4dFxuICogQHBhcmFtICB7aW50ZWdlcn0gdG9wX3Jvd1xuICogQHBhcmFtICB7Ym9vbGVhbn0gZm9yY2VfcmVkcmF3IC0gcmVkcmF3IHRoZSBjb250ZW50cyBldmVuIGlmIHRoZXkgYXJlXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlIHNhbWUgYXMgdGhlIGNhY2hlZCBjb250ZW50cy5cbiAqIEByZXR1cm4ge251bGx9ICAgICAgICAgIFxuICovXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuX3JlbmRlcl90ZXh0X2NhbnZhcyA9IGZ1bmN0aW9uKHhfb2Zmc2V0LCB0b3Bfcm93LCBmb3JjZV9yZWRyYXcpIHtcblxuICAgIC8vIFRyeSB0byByZXVzZSBzb21lIG9mIHRoZSBhbHJlYWR5IHJlbmRlcmVkIHRleHQgaWYgcG9zc2libGUuXG4gICAgdmFyIHJlbmRlcmVkID0gZmFsc2U7XG4gICAgdmFyIHJvd19oZWlnaHQgPSB0aGlzLmdldF9yb3dfaGVpZ2h0KCk7XG4gICAgaWYgKCFmb3JjZV9yZWRyYXcgJiYgdGhpcy5fbGFzdF9yZW5kZXJlZF9vZmZzZXQgPT09IHhfb2Zmc2V0KSB7XG4gICAgICAgIHZhciBsYXN0X3RvcCA9IHRoaXMuX2xhc3RfcmVuZGVyZWRfcm93O1xuICAgICAgICB2YXIgc2Nyb2xsID0gdG9wX3JvdyAtIGxhc3RfdG9wOyAvLyBQb3NpdGl2ZSA9IHVzZXIgc2Nyb2xsaW5nIGRvd253YXJkLlxuICAgICAgICBpZiAoc2Nyb2xsIDwgdGhpcy5fbGFzdF9yZW5kZXJlZF9yb3dfY291bnQpIHtcblxuICAgICAgICAgICAgLy8gR2V0IGEgc25hcHNob3Qgb2YgdGhlIHRleHQgYmVmb3JlIHRoZSBzY3JvbGwuXG4gICAgICAgICAgICB0aGlzLl90bXBfY2FudmFzLmNsZWFyKCk7XG4gICAgICAgICAgICB0aGlzLl90bXBfY2FudmFzLmRyYXdfaW1hZ2UodGhpcy5fdGV4dF9jYW52YXMsIDAsIDApO1xuXG4gICAgICAgICAgICAvLyBSZW5kZXIgdGhlIG5ldyB0ZXh0LlxuICAgICAgICAgICAgdmFyIHNhdmVkX3Jvd3MgPSB0aGlzLl9sYXN0X3JlbmRlcmVkX3Jvd19jb3VudCAtIE1hdGguYWJzKHNjcm9sbCk7XG4gICAgICAgICAgICB2YXIgbmV3X3Jvd3MgPSB0aGlzLl92aXNpYmxlX3Jvd19jb3VudCAtIHNhdmVkX3Jvd3M7XG4gICAgICAgICAgICBpZiAoc2Nyb2xsID4gMCkge1xuICAgICAgICAgICAgICAgIC8vIFJlbmRlciB0aGUgYm90dG9tLlxuICAgICAgICAgICAgICAgIHRoaXMuX3RleHRfY2FudmFzLmNsZWFyKCk7XG4gICAgICAgICAgICAgICAgZm9yIChpID0gdG9wX3JvdytzYXZlZF9yb3dzOyBpIDwgdG9wX3Jvdyt0aGlzLl92aXNpYmxlX3Jvd19jb3VudDsgaSsrKSB7ICAgICBcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fcmVuZGVyX3JvdyhpLCB4X29mZnNldCwgKGkgLSB0b3Bfcm93KSAqIHJvd19oZWlnaHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc2Nyb2xsIDwgMCkge1xuICAgICAgICAgICAgICAgIC8vIFJlbmRlciB0aGUgdG9wLlxuICAgICAgICAgICAgICAgIHRoaXMuX3RleHRfY2FudmFzLmNsZWFyKCk7XG4gICAgICAgICAgICAgICAgZm9yIChpID0gdG9wX3JvdzsgaSA8IHRvcF9yb3crbmV3X3Jvd3M7IGkrKykgeyAgIFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9yZW5kZXJfcm93KGksIHhfb2Zmc2V0LCAoaSAtIHRvcF9yb3cpICogcm93X2hlaWdodCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBOb3RoaW5nIGhhcyBjaGFuZ2VkLlxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXNlIHRoZSBvbGQgY29udGVudCB0byBmaWxsIGluIHRoZSByZXN0LlxuICAgICAgICAgICAgdGhpcy5fdGV4dF9jYW52YXMuZHJhd19pbWFnZSh0aGlzLl90bXBfY2FudmFzLCAwLCAtc2Nyb2xsICogdGhpcy5nZXRfcm93X2hlaWdodCgpKTtcbiAgICAgICAgICAgIHRoaXMudHJpZ2dlcigncm93c19jaGFuZ2VkJywgdG9wX3JvdywgdG9wX3JvdyArIHRoaXMuX3Zpc2libGVfcm93X2NvdW50IC0gMSk7XG4gICAgICAgICAgICByZW5kZXJlZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBGdWxsIHJlbmRlcmluZy5cbiAgICBpZiAoIXJlbmRlcmVkKSB7XG4gICAgICAgIHRoaXMuX3RleHRfY2FudmFzLmNsZWFyKCk7XG5cbiAgICAgICAgLy8gUmVuZGVyIHRpbGwgdGhlcmUgYXJlIG5vIHJvd3MgbGVmdCwgb3IgdGhlIHRvcCBvZiB0aGUgcm93IGlzXG4gICAgICAgIC8vIGJlbG93IHRoZSBib3R0b20gb2YgdGhlIHZpc2libGUgYXJlYS5cbiAgICAgICAgZm9yIChpID0gdG9wX3JvdzsgaSA8IHRvcF9yb3cgKyB0aGlzLl92aXNpYmxlX3Jvd19jb3VudDsgaSsrKSB7ICAgICAgICBcbiAgICAgICAgICAgIHRoaXMuX3JlbmRlcl9yb3coaSwgeF9vZmZzZXQsIChpIC0gdG9wX3JvdykgKiByb3dfaGVpZ2h0KTtcbiAgICAgICAgfSAgIFxuICAgICAgICB0aGlzLnRyaWdnZXIoJ3Jvd3NfY2hhbmdlZCcsIHRvcF9yb3csIHRvcF9yb3cgKyB0aGlzLl92aXNpYmxlX3Jvd19jb3VudCAtIDEpO1xuICAgIH1cblxuICAgIC8vIFJlbWVtYmVyIGZvciBkZWx0YSByZW5kZXJpbmcuXG4gICAgdGhpcy5fbGFzdF9yZW5kZXJlZF9yb3cgPSB0b3Bfcm93O1xuICAgIHRoaXMuX2xhc3RfcmVuZGVyZWRfcm93X2NvdW50ID0gdGhpcy5fdmlzaWJsZV9yb3dfY291bnQ7XG4gICAgdGhpcy5fbGFzdF9yZW5kZXJlZF9vZmZzZXQgPSB4X29mZnNldDtcbn07XG5cbi8qKlxuICogR2V0cyB0aGUgcm93IGFuZCBjaGFyYWN0ZXIgaW5kaWNpZXMgY2xvc2VzdCB0byBnaXZlbiBjb250cm9sIHNwYWNlIGNvb3JkaW5hdGVzLlxuICogQHBhcmFtICB7ZmxvYXR9IGN1cnNvcl94IC0geCB2YWx1ZSwgMCBpcyB0aGUgbGVmdCBvZiB0aGUgY2FudmFzLlxuICogQHBhcmFtICB7ZmxvYXR9IGN1cnNvcl95IC0geSB2YWx1ZSwgMCBpcyB0aGUgdG9wIG9mIHRoZSBjYW52YXMuXG4gKiBAcmV0dXJuIHtkaWN0aW9uYXJ5fSBkaWN0aW9uYXJ5IG9mIHRoZSBmb3JtIHtyb3dfaW5kZXgsIGNoYXJfaW5kZXh9XG4gKi9cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5nZXRfcm93X2NoYXIgPSBmdW5jdGlvbihjdXJzb3JfeCwgY3Vyc29yX3kpIHtcbiAgICB2YXIgcm93X2luZGV4ID0gTWF0aC5mbG9vcigoY3Vyc29yX3kgLSB0aGlzLl9tYXJnaW5fdG9wKSAvIHRoaXMuZ2V0X3Jvd19oZWlnaHQoKSk7XG5cbiAgICAvLyBGaW5kIHRoZSBjaGFyYWN0ZXIgaW5kZXguXG4gICAgdmFyIHdpZHRocyA9IFswXTtcbiAgICB0cnkge1xuICAgICAgICBmb3IgKHZhciBsZW5ndGg9MTsgbGVuZ3RoPD10aGlzLl9tb2RlbC5fcm93c1tyb3dfaW5kZXhdLmxlbmd0aDsgbGVuZ3RoKyspIHtcbiAgICAgICAgICAgIHdpZHRocy5wdXNoKHRoaXMubWVhc3VyZV9wYXJ0aWFsX3Jvd193aWR0aChyb3dfaW5kZXgsIGxlbmd0aCkpO1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyBOb20gbm9tIG5vbS4uLlxuICAgIH1cbiAgICB2YXIgY29vcmRzID0gdGhpcy5fbW9kZWwudmFsaWRhdGVfY29vcmRzKHJvd19pbmRleCwgdXRpbHMuZmluZF9jbG9zZXN0KHdpZHRocywgY3Vyc29yX3ggLSB0aGlzLl9tYXJnaW5fbGVmdCkpO1xuICAgIHJldHVybiB7XG4gICAgICAgIHJvd19pbmRleDogY29vcmRzLnN0YXJ0X3JvdyxcbiAgICAgICAgY2hhcl9pbmRleDogY29vcmRzLnN0YXJ0X2NoYXIsXG4gICAgfTtcbn07XG5cbi8qKlxuICogTWVhc3VyZXMgdGhlIHBhcnRpYWwgd2lkdGggb2YgYSB0ZXh0IHJvdy5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IGluZGV4XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSAob3B0aW9uYWwpIGxlbmd0aCAtIG51bWJlciBvZiBjaGFyYWN0ZXJzXG4gKiBAcmV0dXJuIHtmbG9hdH0gd2lkdGhcbiAqL1xuUm93UmVuZGVyZXIucHJvdG90eXBlLm1lYXN1cmVfcGFydGlhbF9yb3dfd2lkdGggPSBmdW5jdGlvbihpbmRleCwgbGVuZ3RoKSB7XG4gICAgaWYgKDAgPiBpbmRleCB8fCBpbmRleCA+PSB0aGlzLl9tb2RlbC5fcm93cy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIDA7IFxuICAgIH1cblxuICAgIHZhciB0ZXh0ID0gdGhpcy5fbW9kZWwuX3Jvd3NbaW5kZXhdO1xuICAgIHRleHQgPSAobGVuZ3RoID09PSB1bmRlZmluZWQpID8gdGV4dCA6IHRleHQuc3Vic3RyaW5nKDAsIGxlbmd0aCk7XG5cbiAgICByZXR1cm4gdGhpcy5fY2FudmFzLm1lYXN1cmVfdGV4dCh0ZXh0LCB0aGlzLl9iYXNlX29wdGlvbnMpO1xufTtcblxuLyoqXG4gKiBNZWFzdXJlcyBhIHN0cmluZ3Mgd2lkdGguXG4gKiBAcGFyYW0gIHtzdHJpbmd9IHRleHQgLSB0ZXh0IHRvIG1lYXN1cmUgdGhlIHdpZHRoIG9mXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBbaW5kZXhdIC0gcm93IGluZGV4LCBjYW4gYmUgdXNlZCB0byBhcHBseSBzaXplIHNlbnNpdGl2ZSBcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3JtYXR0aW5nIHRvIHRoZSB0ZXh0LlxuICogQHJldHVybiB7ZmxvYXR9IHdpZHRoXG4gKi9cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5fbWVhc3VyZV90ZXh0X3dpZHRoID0gZnVuY3Rpb24odGV4dCkge1xuICAgIHJldHVybiB0aGlzLl9jYW52YXMubWVhc3VyZV90ZXh0KHRleHQsIHRoaXMuX2Jhc2Vfb3B0aW9ucyk7XG59O1xuXG4vKipcbiAqIE1lYXN1cmVzIHRoZSBoZWlnaHQgb2YgYSB0ZXh0IHJvdyBhcyBpZiBpdCB3ZXJlIHJlbmRlcmVkLlxuICogQHBhcmFtICB7aW50ZWdlcn0gKG9wdGlvbmFsKSBpbmRleFxuICogQHJldHVybiB7ZmxvYXR9IGhlaWdodFxuICovXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuZ2V0X3Jvd19oZWlnaHQgPSBmdW5jdGlvbihpbmRleCkge1xuICAgIHJldHVybiB0aGlzLl9iYXNlX29wdGlvbnMuZm9udF9zaXplICsgdGhpcy5fbGluZV9zcGFjaW5nO1xufTtcblxuLyoqXG4gKiBHZXRzIHRoZSB0b3Agb2YgdGhlIHJvdyB3aGVuIHJlbmRlcmVkXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBpbmRleFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuUm93UmVuZGVyZXIucHJvdG90eXBlLmdldF9yb3dfdG9wID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICByZXR1cm4gaW5kZXggKiB0aGlzLmdldF9yb3dfaGVpZ2h0KCkgKyB0aGlzLl9tYXJnaW5fdG9wO1xufTtcblxuLyoqXG4gKiBHZXRzIHRoZSB2aXNpYmxlIHJvd3MuXG4gKiBAcmV0dXJuIHtkaWN0aW9uYXJ5fSBkaWN0aW9uYXJ5IGNvbnRhaW5pbmcgaW5mb3JtYXRpb24gYWJvdXQgXG4gKiAgICAgICAgICAgICAgICAgICAgICB0aGUgdmlzaWJsZSByb3dzLiAgRm9ybWF0IHt0b3Bfcm93LCBcbiAqICAgICAgICAgICAgICAgICAgICAgIGJvdHRvbV9yb3csIHJvd19jb3VudH0uXG4gKi9cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5nZXRfdmlzaWJsZV9yb3dzID0gZnVuY3Rpb24oKSB7XG5cbiAgICAvLyBGaW5kIHRoZSByb3cgY2xvc2VzdCB0byB0aGUgc2Nyb2xsIHRvcC4gIElmIHRoYXQgcm93IGlzIGJlbG93XG4gICAgLy8gdGhlIHNjcm9sbCB0b3AsIHVzZSB0aGUgcGFydGlhbGx5IGRpc3BsYXllZCByb3cgYWJvdmUgaXQuXG4gICAgdmFyIHRvcF9yb3cgPSBNYXRoLm1heCgwLCBNYXRoLmZsb29yKCh0aGlzLl9zY3JvbGxpbmdfY2FudmFzLnNjcm9sbF90b3AgLSB0aGlzLl9tYXJnaW5fdG9wKSAgLyB0aGlzLmdldF9yb3dfaGVpZ2h0KCkpKTtcblxuICAgIC8vIEZpbmQgdGhlIHJvdyBjbG9zZXN0IHRvIHRoZSBzY3JvbGwgYm90dG9tLiAgSWYgdGhhdCByb3cgaXMgYWJvdmVcbiAgICAvLyB0aGUgc2Nyb2xsIGJvdHRvbSwgdXNlIHRoZSBwYXJ0aWFsbHkgZGlzcGxheWVkIHJvdyBiZWxvdyBpdC5cbiAgICB2YXIgcm93X2NvdW50ID0gTWF0aC5jZWlsKHRoaXMuX2NhbnZhcy5oZWlnaHQgLyB0aGlzLmdldF9yb3dfaGVpZ2h0KCkpO1xuICAgIHZhciBib3R0b21fcm93ID0gdG9wX3JvdyArIHJvd19jb3VudDtcblxuICAgIC8vIFJvdyBjb3VudCArIDEgdG8gaW5jbHVkZSBmaXJzdCByb3cuXG4gICAgcmV0dXJuIHt0b3Bfcm93OiB0b3Bfcm93LCBib3R0b21fcm93OiBib3R0b21fcm93LCByb3dfY291bnQ6IHJvd19jb3VudCsxfTtcbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIHRoZSBtb2RlbCdzIHZhbHVlIGNoYW5nZXNcbiAqIENvbXBsZXhpdHk6IE8oTikgZm9yIE4gcm93cyBvZiB0ZXh0LlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuUm93UmVuZGVyZXIucHJvdG90eXBlLl9oYW5kbGVfdmFsdWVfY2hhbmdlZCA9IGZ1bmN0aW9uKCkge1xuXG4gICAgLy8gQ2FsY3VsYXRlIHRoZSBkb2N1bWVudCB3aWR0aC5cbiAgICB0aGlzLl9yb3dfd2lkdGhfY291bnRzID0ge307XG4gICAgdmFyIGRvY3VtZW50X3dpZHRoID0gMDtcbiAgICBmb3IgKHZhciBpPTA7IGk8dGhpcy5fbW9kZWwuX3Jvd3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHdpZHRoID0gdGhpcy5fbWVhc3VyZV9yb3dfd2lkdGgoaSkgKyB0aGlzLl9tYXJnaW5fbGVmdDtcbiAgICAgICAgZG9jdW1lbnRfd2lkdGggPSBNYXRoLm1heCh3aWR0aCwgZG9jdW1lbnRfd2lkdGgpO1xuICAgICAgICBpZiAodGhpcy5fcm93X3dpZHRoX2NvdW50c1t3aWR0aF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhpcy5fcm93X3dpZHRoX2NvdW50c1t3aWR0aF0gPSAxO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fcm93X3dpZHRoX2NvdW50c1t3aWR0aF0rKztcbiAgICAgICAgfVxuICAgIH1cbiAgICB0aGlzLl9zY3JvbGxpbmdfY2FudmFzLnNjcm9sbF93aWR0aCA9IGRvY3VtZW50X3dpZHRoO1xuICAgIHRoaXMuX3Njcm9sbGluZ19jYW52YXMuc2Nyb2xsX2hlaWdodCA9IHRoaXMuX21vZGVsLl9yb3dzLmxlbmd0aCAqIHRoaXMuZ2V0X3Jvd19oZWlnaHQoKSArIHRoaXMuX21hcmdpbl90b3A7XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgd2hlbiBvbmUgb2YgdGhlIG1vZGVsJ3Mgcm93cyBjaGFuZ2VcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5faGFuZGxlX3Jvd19jaGFuZ2VkID0gZnVuY3Rpb24odGV4dCwgaW5kZXgpIHtcbiAgICB2YXIgbmV3X3dpZHRoID0gdGhpcy5fbWVhc3VyZV9yb3dfd2lkdGgoaW5kZXgpICsgdGhpcy5fbWFyZ2luX2xlZnQ7XG4gICAgdmFyIG9sZF93aWR0aCA9IHRoaXMuX21lYXN1cmVfdGV4dF93aWR0aCh0ZXh0LCBpbmRleCkgKyB0aGlzLl9tYXJnaW5fbGVmdDtcbiAgICBpZiAodGhpcy5fcm93X3dpZHRoX2NvdW50c1tvbGRfd2lkdGhdID09IDEpIHtcbiAgICAgICAgZGVsZXRlIHRoaXMuX3Jvd193aWR0aF9jb3VudHNbb2xkX3dpZHRoXTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9yb3dfd2lkdGhfY291bnRzW29sZF93aWR0aF0tLTsgICAgICAgIFxuICAgIH1cblxuICAgIGlmICh0aGlzLl9yb3dfd2lkdGhfY291bnRzW25ld193aWR0aF0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLl9yb3dfd2lkdGhfY291bnRzW25ld193aWR0aF0rKztcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9yb3dfd2lkdGhfY291bnRzW25ld193aWR0aF0gPSAxO1xuICAgIH1cblxuICAgIHRoaXMuX3Njcm9sbGluZ19jYW52YXMuc2Nyb2xsX3dpZHRoID0gdGhpcy5fZmluZF9sYXJnZXN0X3dpZHRoKCk7XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgd2hlbiBvbmUgb3IgbW9yZSByb3dzIGFyZSBhZGRlZCB0byB0aGUgbW9kZWxcbiAqXG4gKiBBc3N1bWVzIGNvbnN0YW50IHJvdyBoZWlnaHQuXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBzdGFydFxuICogQHBhcmFtICB7aW50ZWdlcn0gZW5kXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuX2hhbmRsZV9yb3dzX2FkZGVkID0gZnVuY3Rpb24oc3RhcnQsIGVuZCkge1xuICAgIHRoaXMuX3Njcm9sbGluZ19jYW52YXMuc2Nyb2xsX2hlaWdodCArPSAoZW5kIC0gc3RhcnQgKyAxKSAqIHRoaXMuZ2V0X3Jvd19oZWlnaHQoKTtcbiAgICBcbiAgICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPD0gZW5kOyBpKyspIHsgXG4gICAgICAgIHZhciBuZXdfd2lkdGggPSB0aGlzLl9tZWFzdXJlX3Jvd193aWR0aChpKSArIHRoaXMuX21hcmdpbl9sZWZ0O1xuICAgICAgICBpZiAodGhpcy5fcm93X3dpZHRoX2NvdW50c1tuZXdfd2lkdGhdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRoaXMuX3Jvd193aWR0aF9jb3VudHNbbmV3X3dpZHRoXSsrO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fcm93X3dpZHRoX2NvdW50c1tuZXdfd2lkdGhdID0gMTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuX3Njcm9sbGluZ19jYW52YXMuc2Nyb2xsX3dpZHRoID0gdGhpcy5fZmluZF9sYXJnZXN0X3dpZHRoKCk7XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgd2hlbiBvbmUgb3IgbW9yZSByb3dzIGFyZSByZW1vdmVkIGZyb20gdGhlIG1vZGVsXG4gKlxuICogQXNzdW1lcyBjb25zdGFudCByb3cgaGVpZ2h0LlxuICogQHBhcmFtICB7YXJyYXl9IHJvd3NcbiAqIEBwYXJhbSAge2ludGVnZXJ9IFtpbmRleF1cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5faGFuZGxlX3Jvd3NfcmVtb3ZlZCA9IGZ1bmN0aW9uKHJvd3MsIGluZGV4KSB7XG4gICAgLy8gRGVjcmVhc2UgdGhlIHNjcm9sbGluZyBoZWlnaHQgYmFzZWQgb24gdGhlIG51bWJlciBvZiByb3dzIHJlbW92ZWQuXG4gICAgdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfaGVpZ2h0IC09IHJvd3MubGVuZ3RoICogdGhpcy5nZXRfcm93X2hlaWdodCgpO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCByb3dzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBvbGRfd2lkdGggPSB0aGlzLl9tZWFzdXJlX3RleHRfd2lkdGgocm93c1tpXSwgaSArIGluZGV4KSArIHRoaXMuX21hcmdpbl9sZWZ0O1xuICAgICAgICBpZiAodGhpcy5fcm93X3dpZHRoX2NvdW50c1tvbGRfd2lkdGhdID09IDEpIHtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9yb3dfd2lkdGhfY291bnRzW29sZF93aWR0aF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9yb3dfd2lkdGhfY291bnRzW29sZF93aWR0aF0tLTsgICAgICAgIFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfd2lkdGggPSB0aGlzLl9maW5kX2xhcmdlc3Rfd2lkdGgoKTtcbn07XG5cbi8qKlxuICogUmVuZGVyIGEgc2luZ2xlIHJvd1xuICogQHBhcmFtICB7aW50ZWdlcn0gaW5kZXhcbiAqIEBwYXJhbSAge2Zsb2F0fSB4XG4gKiBAcGFyYW0gIHtmbG9hdH0geVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuUm93UmVuZGVyZXIucHJvdG90eXBlLl9yZW5kZXJfcm93ID0gZnVuY3Rpb24oaW5kZXgsIHggLHkpIHtcbiAgICB0aGlzLl90ZXh0X2NhbnZhcy5kcmF3X3RleHQoeCwgeSwgdGhpcy5fbW9kZWwuX3Jvd3NbaW5kZXhdLCB0aGlzLl9iYXNlX29wdGlvbnMpO1xufTtcblxuLyoqXG4gKiBNZWFzdXJlcyB0aGUgd2lkdGggb2YgYSB0ZXh0IHJvdyBhcyBpZiBpdCB3ZXJlIHJlbmRlcmVkLlxuICogQHBhcmFtICB7aW50ZWdlcn0gaW5kZXhcbiAqIEByZXR1cm4ge2Zsb2F0fSB3aWR0aFxuICovXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuX21lYXN1cmVfcm93X3dpZHRoID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICByZXR1cm4gdGhpcy5tZWFzdXJlX3BhcnRpYWxfcm93X3dpZHRoKGluZGV4LCB0aGlzLl9tb2RlbC5fcm93c1tpbmRleF0ubGVuZ3RoKTtcbn07XG5cbi8qKlxuICogRmluZCB0aGUgbGFyZ2VzdCB3aWR0aCBpbiB0aGUgd2lkdGggcm93IGNvdW50IGRpY3Rpb25hcnkuXG4gKiBAcmV0dXJuIHtmbG9hdH0gd2lkdGhcbiAqL1xuUm93UmVuZGVyZXIucHJvdG90eXBlLl9maW5kX2xhcmdlc3Rfd2lkdGggPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdmFsdWVzID0gT2JqZWN0LmtleXModGhpcy5fcm93X3dpZHRoX2NvdW50cyk7XG4gICAgdmFsdWVzLnNvcnQoZnVuY3Rpb24oYSwgYil7IFxuICAgICAgICByZXR1cm4gcGFyc2VGbG9hdChiKSAtIHBhcnNlRmxvYXQoYSk7IFxuICAgIH0pO1xuICAgIHJldHVybiBwYXJzZUZsb2F0KHZhbHVlc1swXSk7XG59O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLlJvd1JlbmRlcmVyID0gUm93UmVuZGVyZXI7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgYW5pbWF0b3IgPSByZXF1aXJlKCcuLi9hbmltYXRvci5qcycpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMuanMnKTtcbnZhciByZW5kZXJlciA9IHJlcXVpcmUoJy4vcmVuZGVyZXIuanMnKTtcbnZhciBjb25maWcgPSByZXF1aXJlKCcuLi9jb25maWcuanMnKTtcbmNvbmZpZyA9IGNvbmZpZy5jb25maWc7XG5cbi8qKlxuICogUmVuZGVyIGRvY3VtZW50IHNlbGVjdGlvbiBib3hlc1xuICpcbiAqIFRPRE86IE9ubHkgcmVuZGVyIHZpc2libGUuXG4gKi9cbnZhciBTZWxlY3Rpb25zUmVuZGVyZXIgPSBmdW5jdGlvbihjdXJzb3JzLCBzdHlsZSwgcm93X3JlbmRlcmVyLCBoYXNfZm9jdXMsIGN1cnNvcnNfcmVuZGVyZXIpIHtcbiAgICByZW5kZXJlci5SZW5kZXJlckJhc2UuY2FsbCh0aGlzKTtcbiAgICB0aGlzLnN0eWxlID0gc3R5bGU7XG4gICAgdGhpcy5faGFzX2ZvY3VzID0gaGFzX2ZvY3VzO1xuXG4gICAgLy8gV2hlbiB0aGUgY3Vyc29ycyBjaGFuZ2UsIHJlZHJhdyB0aGUgc2VsZWN0aW9uIGJveChlcykuXG4gICAgdGhpcy5fY3Vyc29ycyA9IGN1cnNvcnM7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHZhciByZXJlbmRlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGF0LnJlbmRlcigpO1xuICAgICAgICAvLyBUZWxsIHBhcmVudCBsYXllciB0aGlzIG9uZSBoYXMgY2hhbmdlZC5cbiAgICAgICAgdGhhdC50cmlnZ2VyKCdjaGFuZ2VkJyk7XG4gICAgfTtcbiAgICB0aGlzLl9jdXJzb3JzLm9uKCdjaGFuZ2UnLCByZXJlbmRlcik7XG5cbiAgICAvLyBXaGVuIHRoZSBzdHlsZSBpcyBjaGFuZ2VkLCByZWRyYXcgdGhlIHNlbGVjdGlvbiBib3goZXMpLlxuICAgIHRoaXMuc3R5bGUub24oJ2NoYW5nZScsIHJlcmVuZGVyKTtcbiAgICBjb25maWcub24oJ2NoYW5nZScsIHJlcmVuZGVyKTtcblxuICAgIHRoaXMuX3Jvd19yZW5kZXJlciA9IHJvd19yZW5kZXJlcjtcbiAgICAvLyBUT0RPOiBSZW1vdmUgdGhlIGZvbGxvd2luZyBibG9jay5cbiAgICB0aGlzLl9nZXRfdmlzaWJsZV9yb3dzID0gdXRpbHMucHJveHkocm93X3JlbmRlcmVyLmdldF92aXNpYmxlX3Jvd3MsIHJvd19yZW5kZXJlcik7XG4gICAgdGhpcy5fZ2V0X3Jvd19oZWlnaHQgPSB1dGlscy5wcm94eShyb3dfcmVuZGVyZXIuZ2V0X3Jvd19oZWlnaHQsIHJvd19yZW5kZXJlcik7XG4gICAgdGhpcy5fZ2V0X3Jvd190b3AgPSB1dGlscy5wcm94eShyb3dfcmVuZGVyZXIuZ2V0X3Jvd190b3AsIHJvd19yZW5kZXJlcik7XG4gICAgdGhpcy5fbWVhc3VyZV9wYXJ0aWFsX3JvdyA9IHV0aWxzLnByb3h5KHJvd19yZW5kZXJlci5tZWFzdXJlX3BhcnRpYWxfcm93X3dpZHRoLCByb3dfcmVuZGVyZXIpO1xuXG4gICAgLy8gV2hlbiB0aGUgY3Vyc29yIGlzIGhpZGRlbi9zaG93biwgcmVkcmF3IHRoZSBzZWxlY3Rpb24uXG4gICAgY3Vyc29yc19yZW5kZXJlci5vbigndG9nZ2xlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoYXQucmVuZGVyKCk7XG4gICAgICAgIC8vIFRlbGwgcGFyZW50IGxheWVyIHRoaXMgb25lIGhhcyBjaGFuZ2VkLlxuICAgICAgICB0aGF0LnRyaWdnZXIoJ2NoYW5nZWQnKTtcbiAgICB9KTtcbn07XG51dGlscy5pbmhlcml0KFNlbGVjdGlvbnNSZW5kZXJlciwgcmVuZGVyZXIuUmVuZGVyZXJCYXNlKTtcblxuLyoqXG4gKiBSZW5kZXIgdG8gdGhlIGNhbnZhc1xuICogTm90ZTogVGhpcyBtZXRob2QgaXMgY2FsbGVkIG9mdGVuLCBzbyBpdCdzIGltcG9ydGFudCB0aGF0IGl0J3NcbiAqIG9wdGltaXplZCBmb3Igc3BlZWQuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5TZWxlY3Rpb25zUmVuZGVyZXIucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2NhbnZhcy5jbGVhcigpO1xuXG4gICAgLy8gR2V0IG5ld2xpbmUgd2lkdGguXG4gICAgdmFyIG5ld2xpbmVfd2lkdGggPSBjb25maWcubmV3bGluZV93aWR0aDtcbiAgICBpZiAobmV3bGluZV93aWR0aCA9PT0gdW5kZWZpbmVkIHx8IG5ld2xpbmVfd2lkdGggPT09IG51bGwpIHtcbiAgICAgICAgbmV3bGluZV93aWR0aCA9IDI7XG4gICAgfVxuXG4gICAgLy8gT25seSByZW5kZXIgaWYgdGhlIGNhbnZhcyBoYXMgZm9jdXMuXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMuX2N1cnNvcnMuY3Vyc29ycy5mb3JFYWNoKGZ1bmN0aW9uKGN1cnNvcikge1xuICAgICAgICAvLyBHZXQgdGhlIHZpc2libGUgcm93cy5cbiAgICAgICAgdmFyIHZpc2libGVfcm93cyA9IHRoYXQuX2dldF92aXNpYmxlX3Jvd3MoKTtcblxuICAgICAgICAvLyBEcmF3IHRoZSBzZWxlY3Rpb24gYm94LlxuICAgICAgICBpZiAoY3Vyc29yLnN0YXJ0X3JvdyAhPT0gbnVsbCAmJiBjdXJzb3Iuc3RhcnRfY2hhciAhPT0gbnVsbCAmJlxuICAgICAgICAgICAgY3Vyc29yLmVuZF9yb3cgIT09IG51bGwgJiYgY3Vyc29yLmVuZF9jaGFyICE9PSBudWxsKSB7XG4gICAgICAgICAgICBcblxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IE1hdGgubWF4KGN1cnNvci5zdGFydF9yb3csIHZpc2libGVfcm93cy50b3Bfcm93KTsgXG4gICAgICAgICAgICAgICAgaSA8PSBNYXRoLm1pbihjdXJzb3IuZW5kX3JvdywgdmlzaWJsZV9yb3dzLmJvdHRvbV9yb3cpOyBcbiAgICAgICAgICAgICAgICBpKyspIHtcblxuICAgICAgICAgICAgICAgIHZhciBsZWZ0ID0gdGhhdC5fcm93X3JlbmRlcmVyLm1hcmdpbl9sZWZ0O1xuICAgICAgICAgICAgICAgIGlmIChpID09IGN1cnNvci5zdGFydF9yb3cgJiYgY3Vyc29yLnN0YXJ0X2NoYXIgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGxlZnQgKz0gdGhhdC5fbWVhc3VyZV9wYXJ0aWFsX3JvdyhpLCBjdXJzb3Iuc3RhcnRfY2hhcik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIHNlbGVjdGlvbl9jb2xvcjtcbiAgICAgICAgICAgICAgICBpZiAodGhhdC5faGFzX2ZvY3VzKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0aW9uX2NvbG9yID0gdGhhdC5zdHlsZS5zZWxlY3Rpb24gfHwgJ3NreWJsdWUnO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGlvbl9jb2xvciA9IHRoYXQuc3R5bGUuc2VsZWN0aW9uX3VuZm9jdXNlZCB8fCAnZ3JheSc7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIHJpZ2h0O1xuICAgICAgICAgICAgICAgIGlmIChpICE9PSBjdXJzb3IuZW5kX3Jvdykge1xuICAgICAgICAgICAgICAgICAgICByaWdodCA9IHRoYXQuX21lYXN1cmVfcGFydGlhbF9yb3coaSkgLSBsZWZ0ICsgdGhhdC5fcm93X3JlbmRlcmVyLm1hcmdpbl9sZWZ0ICsgbmV3bGluZV93aWR0aDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByaWdodCA9IHRoYXQuX21lYXN1cmVfcGFydGlhbF9yb3coaSwgY3Vyc29yLmVuZF9jaGFyKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBJZiB0aGlzIGlzbid0IHRoZSBmaXJzdCBzZWxlY3RlZCByb3csIG1ha2Ugc3VyZSBhdGxlYXN0IHRoZSBuZXdsaW5lXG4gICAgICAgICAgICAgICAgICAgIC8vIGlzIHZpc2liaWx5IHNlbGVjdGVkIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIHJvdyBieSBtYWtpbmcgc3VyZSB0aGF0XG4gICAgICAgICAgICAgICAgICAgIC8vIHRoZSBzZWxlY3Rpb24gYm94IGlzIGF0bGVhc3QgdGhlIHNpemUgb2YgYSBuZXdsaW5lIGNoYXJhY3RlciAoYXNcbiAgICAgICAgICAgICAgICAgICAgLy8gZGVmaW5lZCBieSB0aGUgdXNlciBjb25maWcpLlxuICAgICAgICAgICAgICAgICAgICBpZiAoaSAhPT0gY3Vyc29yLnN0YXJ0X3Jvdykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmlnaHQgPSBNYXRoLm1heChuZXdsaW5lX3dpZHRoLCByaWdodCk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICByaWdodCA9IHJpZ2h0IC0gbGVmdCArIHRoYXQuX3Jvd19yZW5kZXJlci5tYXJnaW5fbGVmdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdGhhdC5fY2FudmFzLmRyYXdfcmVjdGFuZ2xlKFxuICAgICAgICAgICAgICAgICAgICBsZWZ0LCBcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5fZ2V0X3Jvd190b3AoaSksIFxuICAgICAgICAgICAgICAgICAgICByaWdodCwgXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuX2dldF9yb3dfaGVpZ2h0KGkpLCBcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlsbF9jb2xvcjogc2VsZWN0aW9uX2NvbG9yLFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5TZWxlY3Rpb25zUmVuZGVyZXIgPSBTZWxlY3Rpb25zUmVuZGVyZXI7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxudmFyIGNhbnZhcyA9IHJlcXVpcmUoJy4vY2FudmFzLmpzJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG5cbi8qKlxuICogSFRNTCBjYW52YXMgd2l0aCBkcmF3aW5nIGNvbnZpbmllbmNlIGZ1bmN0aW9ucy5cbiAqL1xudmFyIFNjcm9sbGluZ0NhbnZhcyA9IGZ1bmN0aW9uKCkge1xuICAgIGNhbnZhcy5DYW52YXMuY2FsbCh0aGlzKTtcbiAgICB0aGlzLl9iaW5kX2V2ZW50cygpO1xuICAgIHRoaXMuX29sZF9zY3JvbGxfbGVmdCA9IDA7XG4gICAgdGhpcy5fb2xkX3Njcm9sbF90b3AgPSAwO1xuXG4gICAgLy8gU2V0IGRlZmF1bHQgc2l6ZS5cbiAgICB0aGlzLndpZHRoID0gNDAwO1xuICAgIHRoaXMuaGVpZ2h0ID0gMzAwO1xufTtcbnV0aWxzLmluaGVyaXQoU2Nyb2xsaW5nQ2FudmFzLCBjYW52YXMuQ2FudmFzKTtcblxuLyoqXG4gKiBDYXVzZXMgdGhlIGNhbnZhcyBjb250ZW50cyB0byBiZSByZWRyYXduLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuU2Nyb2xsaW5nQ2FudmFzLnByb3RvdHlwZS5yZWRyYXcgPSBmdW5jdGlvbihzY3JvbGwpIHtcbiAgICB0aGlzLmNsZWFyKCk7XG4gICAgdGhpcy50cmlnZ2VyKCdyZWRyYXcnLCBzY3JvbGwpO1xufTtcblxuLyoqXG4gKiBMYXlvdXQgdGhlIGVsZW1lbnRzIGZvciB0aGUgY2FudmFzLlxuICogQ3JlYXRlcyBgdGhpcy5lbGBcbiAqIFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuU2Nyb2xsaW5nQ2FudmFzLnByb3RvdHlwZS5fbGF5b3V0ID0gZnVuY3Rpb24oKSB7XG4gICAgY2FudmFzLkNhbnZhcy5wcm90b3R5cGUuX2xheW91dC5jYWxsKHRoaXMpO1xuICAgIC8vIENoYW5nZSB0aGUgY2FudmFzIGNsYXNzIHNvIGl0J3Mgbm90IGhpZGRlbi5cbiAgICB0aGlzLl9jYW52YXMuc2V0QXR0cmlidXRlKCdjbGFzcycsICdjYW52YXMnKTtcblxuICAgIHRoaXMuZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB0aGlzLmVsLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAncG9zdGVyIHNjcm9sbC13aW5kb3cnKTtcbiAgICB0aGlzLmVsLnNldEF0dHJpYnV0ZSgndGFiaW5kZXgnLCAwKTtcbiAgICB0aGlzLl9zY3JvbGxfYmFycyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIHRoaXMuX3Njcm9sbF9iYXJzLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnc2Nyb2xsLWJhcnMnKTtcbiAgICB0aGlzLl90b3VjaF9wYW5lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgdGhpcy5fdG91Y2hfcGFuZS5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ3RvdWNoLXBhbmUnKTtcbiAgICB0aGlzLl9kdW1teSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIHRoaXMuX2R1bW15LnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnc2Nyb2xsLWR1bW15Jyk7XG5cbiAgICB0aGlzLmVsLmFwcGVuZENoaWxkKHRoaXMuX2NhbnZhcyk7XG4gICAgdGhpcy5lbC5hcHBlbmRDaGlsZCh0aGlzLl9zY3JvbGxfYmFycyk7XG4gICAgdGhpcy5fc2Nyb2xsX2JhcnMuYXBwZW5kQ2hpbGQodGhpcy5fZHVtbXkpO1xuICAgIHRoaXMuX3Njcm9sbF9iYXJzLmFwcGVuZENoaWxkKHRoaXMuX3RvdWNoX3BhbmUpO1xufTtcblxuLyoqXG4gKiBNYWtlIHRoZSBwcm9wZXJ0aWVzIG9mIHRoZSBjbGFzcy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblNjcm9sbGluZ0NhbnZhcy5wcm90b3R5cGUuX2luaXRfcHJvcGVydGllcyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcblxuICAgIC8qKlxuICAgICAqIFdpZHRoIG9mIHRoZSBzY3JvbGxhYmxlIGNhbnZhcyBhcmVhXG4gICAgICovXG4gICAgdGhpcy5wcm9wZXJ0eSgnc2Nyb2xsX3dpZHRoJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIEdldFxuICAgICAgICByZXR1cm4gdGhhdC5fc2Nyb2xsX3dpZHRoIHx8IDA7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgLy8gU2V0XG4gICAgICAgIHRoYXQuX3Njcm9sbF93aWR0aCA9IHZhbHVlO1xuICAgICAgICB0aGF0Ll9tb3ZlX2R1bW15KHRoYXQuX3Njcm9sbF93aWR0aCwgdGhhdC5fc2Nyb2xsX2hlaWdodCB8fCAwKTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIEhlaWdodCBvZiB0aGUgc2Nyb2xsYWJsZSBjYW52YXMgYXJlYS5cbiAgICAgKi9cbiAgICB0aGlzLnByb3BlcnR5KCdzY3JvbGxfaGVpZ2h0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIEdldFxuICAgICAgICByZXR1cm4gdGhhdC5fc2Nyb2xsX2hlaWdodCB8fCAwO1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIC8vIFNldFxuICAgICAgICB0aGF0Ll9zY3JvbGxfaGVpZ2h0ID0gdmFsdWU7XG4gICAgICAgIHRoYXQuX21vdmVfZHVtbXkodGhhdC5fc2Nyb2xsX3dpZHRoIHx8IDAsIHRoYXQuX3Njcm9sbF9oZWlnaHQpO1xuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogVG9wIG1vc3QgcGl4ZWwgaW4gdGhlIHNjcm9sbGVkIHdpbmRvdy5cbiAgICAgKi9cbiAgICB0aGlzLnByb3BlcnR5KCdzY3JvbGxfdG9wJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIEdldFxuICAgICAgICByZXR1cm4gdGhhdC5fc2Nyb2xsX2JhcnMuc2Nyb2xsVG9wO1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIC8vIFNldFxuICAgICAgICB0aGF0Ll9zY3JvbGxfYmFycy5zY3JvbGxUb3AgPSB2YWx1ZTtcbiAgICAgICAgdGhhdC5faGFuZGxlX3Njcm9sbCgpO1xuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogTGVmdCBtb3N0IHBpeGVsIGluIHRoZSBzY3JvbGxlZCB3aW5kb3cuXG4gICAgICovXG4gICAgdGhpcy5wcm9wZXJ0eSgnc2Nyb2xsX2xlZnQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gR2V0XG4gICAgICAgIHJldHVybiB0aGF0Ll9zY3JvbGxfYmFycy5zY3JvbGxMZWZ0O1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIC8vIFNldFxuICAgICAgICB0aGF0Ll9zY3JvbGxfYmFycy5zY3JvbGxMZWZ0ID0gdmFsdWU7XG4gICAgICAgIHRoYXQuX2hhbmRsZV9zY3JvbGwoKTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIEhlaWdodCBvZiB0aGUgY2FudmFzXG4gICAgICogQHJldHVybiB7ZmxvYXR9XG4gICAgICovXG4gICAgdGhpcy5wcm9wZXJ0eSgnaGVpZ2h0JywgZnVuY3Rpb24oKSB7IFxuICAgICAgICByZXR1cm4gdGhhdC5fY2FudmFzLmhlaWdodCAvIDI7IFxuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsIHZhbHVlICogMik7XG4gICAgICAgIHRoYXQuZWwuc2V0QXR0cmlidXRlKCdzdHlsZScsICd3aWR0aDogJyArIHRoYXQud2lkdGggKyAncHg7IGhlaWdodDogJyArIHZhbHVlICsgJ3B4OycpO1xuXG4gICAgICAgIHRoYXQudHJpZ2dlcigncmVzaXplJywge2hlaWdodDogdmFsdWV9KTtcbiAgICAgICAgdGhhdC5fdHJ5X3JlZHJhdygpO1xuICAgICAgICBcbiAgICAgICAgLy8gU3RyZXRjaCB0aGUgaW1hZ2UgZm9yIHJldGluYSBzdXBwb3J0LlxuICAgICAgICB0aGlzLnNjYWxlKDIsMik7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBXaWR0aCBvZiB0aGUgY2FudmFzXG4gICAgICogQHJldHVybiB7ZmxvYXR9XG4gICAgICovXG4gICAgdGhpcy5wcm9wZXJ0eSgnd2lkdGgnLCBmdW5jdGlvbigpIHsgXG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMud2lkdGggLyAyOyBcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Ll9jYW52YXMuc2V0QXR0cmlidXRlKCd3aWR0aCcsIHZhbHVlICogMik7XG4gICAgICAgIHRoYXQuZWwuc2V0QXR0cmlidXRlKCdzdHlsZScsICd3aWR0aDogJyArIHZhbHVlICsgJ3B4OyBoZWlnaHQ6ICcgKyB0aGF0LmhlaWdodCArICdweDsnKTtcblxuICAgICAgICB0aGF0LnRyaWdnZXIoJ3Jlc2l6ZScsIHt3aWR0aDogdmFsdWV9KTtcbiAgICAgICAgdGhhdC5fdHJ5X3JlZHJhdygpO1xuICAgICAgICBcbiAgICAgICAgLy8gU3RyZXRjaCB0aGUgaW1hZ2UgZm9yIHJldGluYSBzdXBwb3J0LlxuICAgICAgICB0aGlzLnNjYWxlKDIsMik7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBJcyB0aGUgY2FudmFzIG9yIHJlbGF0ZWQgZWxlbWVudHMgZm9jdXNlZD9cbiAgICAgKiBAcmV0dXJuIHtib29sZWFufVxuICAgICAqL1xuICAgIHRoaXMucHJvcGVydHkoJ2ZvY3VzZWQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQgPT09IHRoYXQuZWwgfHxcbiAgICAgICAgICAgIGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQgPT09IHRoYXQuX3Njcm9sbF9iYXJzIHx8XG4gICAgICAgICAgICBkb2N1bWVudC5hY3RpdmVFbGVtZW50ID09PSB0aGF0Ll9kdW1teSB8fFxuICAgICAgICAgICAgZG9jdW1lbnQuYWN0aXZlRWxlbWVudCA9PT0gdGhhdC5fY2FudmFzO1xuICAgIH0pO1xufTtcblxuLyoqXG4gKiBCaW5kIHRvIHRoZSBldmVudHMgb2YgdGhlIGNhbnZhcy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblNjcm9sbGluZ0NhbnZhcy5wcm90b3R5cGUuX2JpbmRfZXZlbnRzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuXG4gICAgLy8gVHJpZ2dlciBzY3JvbGwgYW5kIHJlZHJhdyBldmVudHMgb24gc2Nyb2xsLlxuICAgIHRoaXMuX3Njcm9sbF9iYXJzLm9uc2Nyb2xsID0gZnVuY3Rpb24oZSkge1xuICAgICAgICB0aGF0LnRyaWdnZXIoJ3Njcm9sbCcsIGUpO1xuICAgICAgICB0aGF0Ll9oYW5kbGVfc2Nyb2xsKCk7XG4gICAgfTtcblxuICAgIC8vIFByZXZlbnQgc2Nyb2xsIGJhciBoYW5kbGVkIG1vdXNlIGV2ZW50cyBmcm9tIGJ1YmJsaW5nLlxuICAgIHZhciBzY3JvbGxiYXJfZXZlbnQgPSBmdW5jdGlvbihlKSB7XG4gICAgICAgIGlmIChlLnRhcmdldCAhPT0gdGhhdC5fdG91Y2hfcGFuZSkge1xuICAgICAgICAgICAgdXRpbHMuY2FuY2VsX2J1YmJsZShlKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdGhpcy5fc2Nyb2xsX2JhcnMub25tb3VzZWRvd24gPSBzY3JvbGxiYXJfZXZlbnQ7XG4gICAgdGhpcy5fc2Nyb2xsX2JhcnMub25tb3VzZXVwID0gc2Nyb2xsYmFyX2V2ZW50O1xuICAgIHRoaXMuX3Njcm9sbF9iYXJzLm9uY2xpY2sgPSBzY3JvbGxiYXJfZXZlbnQ7XG4gICAgdGhpcy5fc2Nyb2xsX2JhcnMub25kYmxjbGljayA9IHNjcm9sbGJhcl9ldmVudDtcbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIHRoZSBjYW52YXMgaXMgc2Nyb2xsZWQuXG4gKi9cblNjcm9sbGluZ0NhbnZhcy5wcm90b3R5cGUuX2hhbmRsZV9zY3JvbGwgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5fb2xkX3Njcm9sbF90b3AgIT09IHVuZGVmaW5lZCAmJiB0aGlzLl9vbGRfc2Nyb2xsX2xlZnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB2YXIgc2Nyb2xsID0ge1xuICAgICAgICAgICAgeDogdGhpcy5zY3JvbGxfbGVmdCAtIHRoaXMuX29sZF9zY3JvbGxfbGVmdCxcbiAgICAgICAgICAgIHk6IHRoaXMuc2Nyb2xsX3RvcCAtIHRoaXMuX29sZF9zY3JvbGxfdG9wLFxuICAgICAgICB9O1xuICAgICAgICB0aGlzLl90cnlfcmVkcmF3KHNjcm9sbCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fdHJ5X3JlZHJhdygpO1xuICAgIH1cbiAgICB0aGlzLl9vbGRfc2Nyb2xsX2xlZnQgPSB0aGlzLnNjcm9sbF9sZWZ0O1xuICAgIHRoaXMuX29sZF9zY3JvbGxfdG9wID0gdGhpcy5zY3JvbGxfdG9wO1xufTtcblxuLyoqXG4gKiBRdWVyaWVzIHRvIHNlZSBpZiByZWRyYXcgaXMgb2theSwgYW5kIHRoZW4gcmVkcmF3cyBpZiBpdCBpcy5cbiAqIEByZXR1cm4ge2Jvb2xlYW59IHRydWUgaWYgcmVkcmF3IGhhcHBlbmVkLlxuICovXG5TY3JvbGxpbmdDYW52YXMucHJvdG90eXBlLl90cnlfcmVkcmF3ID0gZnVuY3Rpb24oc2Nyb2xsKSB7XG4gICAgaWYgKHRoaXMuX3F1ZXJ5X3JlZHJhdygpKSB7XG4gICAgICAgIHRoaXMucmVkcmF3KHNjcm9sbCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKipcbiAqIFRyaWdnZXIgdGhlICdxdWVyeV9yZWRyYXcnIGV2ZW50LlxuICogQHJldHVybiB7Ym9vbGVhbn0gdHJ1ZSBpZiBjb250cm9sIHNob3VsZCByZWRyYXcgaXRzZWxmLlxuICovXG5TY3JvbGxpbmdDYW52YXMucHJvdG90eXBlLl9xdWVyeV9yZWRyYXcgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy50cmlnZ2VyKCdxdWVyeV9yZWRyYXcnKS5ldmVyeShmdW5jdGlvbih4KSB7IHJldHVybiB4OyB9KTsgXG59O1xuXG4vKipcbiAqIE1vdmVzIHRoZSBkdW1teSBlbGVtZW50IHRoYXQgY2F1c2VzIHRoZSBzY3JvbGxiYXIgdG8gYXBwZWFyLlxuICogQHBhcmFtICB7ZmxvYXR9IHhcbiAqIEBwYXJhbSAge2Zsb2F0fSB5XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5TY3JvbGxpbmdDYW52YXMucHJvdG90eXBlLl9tb3ZlX2R1bW15ID0gZnVuY3Rpb24oeCwgeSkge1xuICAgIHRoaXMuX2R1bW15LnNldEF0dHJpYnV0ZSgnc3R5bGUnLCAnbGVmdDogJyArIFN0cmluZyh4KSArICdweDsgdG9wOiAnICsgU3RyaW5nKHkpICsgJ3B4OycpO1xuICAgIHRoaXMuX3RvdWNoX3BhbmUuc2V0QXR0cmlidXRlKCdzdHlsZScsIFxuICAgICAgICAnd2lkdGg6ICcgKyBTdHJpbmcoTWF0aC5tYXgoeCwgdGhpcy5fc2Nyb2xsX2JhcnMuY2xpZW50V2lkdGgpKSArICdweDsgJyArXG4gICAgICAgICdoZWlnaHQ6ICcgKyBTdHJpbmcoTWF0aC5tYXgoeSwgdGhpcy5fc2Nyb2xsX2JhcnMuY2xpZW50SGVpZ2h0KSkgKyAncHg7Jyk7XG59O1xuXG4vKipcbiAqIFRyYW5zZm9ybSBhbiB4IHZhbHVlIGJhc2VkIG9uIHNjcm9sbCBwb3NpdGlvbi5cbiAqIEBwYXJhbSAge2Zsb2F0fSB4XG4gKiBAcGFyYW0gIHtib29sZWFufSBpbnZlcnNlIC0gcGVyZm9ybSBpbnZlcnNlIHRyYW5zZm9ybWF0aW9uXG4gKiBAcmV0dXJuIHtmbG9hdH1cbiAqL1xuU2Nyb2xsaW5nQ2FudmFzLnByb3RvdHlwZS5fdHggPSBmdW5jdGlvbih4LCBpbnZlcnNlKSB7IHJldHVybiB4IC0gKGludmVyc2U/LTE6MSkgKiB0aGlzLnNjcm9sbF9sZWZ0OyB9O1xuXG4vKipcbiAqIFRyYW5zZm9ybSBhIHkgdmFsdWUgYmFzZWQgb24gc2Nyb2xsIHBvc2l0aW9uLlxuICogQHBhcmFtICB7ZmxvYXR9IHlcbiAqIEBwYXJhbSAge2Jvb2xlYW59IGludmVyc2UgLSBwZXJmb3JtIGludmVyc2UgdHJhbnNmb3JtYXRpb25cbiAqIEByZXR1cm4ge2Zsb2F0fVxuICovXG5TY3JvbGxpbmdDYW52YXMucHJvdG90eXBlLl90eSA9IGZ1bmN0aW9uKHksIGludmVyc2UpIHsgcmV0dXJuIHkgLSAoaW52ZXJzZT8tMToxKSAqIHRoaXMuc2Nyb2xsX3RvcDsgfTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5TY3JvbGxpbmdDYW52YXMgPSBTY3JvbGxpbmdDYW52YXM7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG52YXIgc3R5bGVzID0gcmVxdWlyZSgnLi9zdHlsZXMvaW5pdC5qcycpO1xuXG4vKipcbiAqIFN0eWxlXG4gKi9cbnZhciBTdHlsZSA9IGZ1bmN0aW9uKCkge1xuICAgIHV0aWxzLlBvc3RlckNsYXNzLmNhbGwodGhpcywgW1xuICAgICAgICAnY29tbWVudCcsXG4gICAgICAgICdzdHJpbmcnLFxuICAgICAgICAnY2xhc3MtbmFtZScsXG4gICAgICAgICdrZXl3b3JkJyxcbiAgICAgICAgJ2Jvb2xlYW4nLFxuICAgICAgICAnZnVuY3Rpb24nLFxuICAgICAgICAnb3BlcmF0b3InLFxuICAgICAgICAnbnVtYmVyJyxcbiAgICAgICAgJ2lnbm9yZScsXG4gICAgICAgICdwdW5jdHVhdGlvbicsXG5cbiAgICAgICAgJ2N1cnNvcicsXG4gICAgICAgICdjdXJzb3Jfd2lkdGgnLFxuICAgICAgICAnY3Vyc29yX2hlaWdodCcsXG4gICAgICAgICdzZWxlY3Rpb24nLFxuICAgICAgICAnc2VsZWN0aW9uX3VuZm9jdXNlZCcsXG5cbiAgICAgICAgJ3RleHQnLFxuICAgICAgICAnYmFja2dyb3VuZCcsXG4gICAgICAgICdndXR0ZXInLFxuICAgICAgICAnZ3V0dGVyX3RleHQnLFxuICAgICAgICAnZ3V0dGVyX3NoYWRvdydcbiAgICBdKTtcblxuICAgIC8vIExvYWQgdGhlIGRlZmF1bHQgc3R5bGUuXG4gICAgdGhpcy5sb2FkKCdwZWFjb2NrJyk7XG59O1xudXRpbHMuaW5oZXJpdChTdHlsZSwgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vKipcbiAqIExvYWQgYSByZW5kZXJpbmcgc3R5bGVcbiAqIEBwYXJhbSAge3N0cmluZyBvciBkaWN0aW9uYXJ5fSBzdHlsZSAtIG5hbWUgb2YgdGhlIGJ1aWx0LWluIHN0eWxlIFxuICogICAgICAgICBvciBzdHlsZSBkaWN0aW9uYXJ5IGl0c2VsZi5cbiAqIEByZXR1cm4ge2Jvb2xlYW59IHN1Y2Nlc3NcbiAqL1xuU3R5bGUucHJvdG90eXBlLmxvYWQgPSBmdW5jdGlvbihzdHlsZSkge1xuICAgIHRyeSB7XG4gICAgICAgIC8vIExvYWQgdGhlIHN0eWxlIGlmIGl0J3MgYnVpbHQtaW4uXG4gICAgICAgIGlmIChzdHlsZXMuc3R5bGVzW3N0eWxlXSkge1xuICAgICAgICAgICAgc3R5bGUgPSBzdHlsZXMuc3R5bGVzW3N0eWxlXS5zdHlsZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlYWQgZWFjaCBhdHRyaWJ1dGUgb2YgdGhlIHN0eWxlLlxuICAgICAgICBmb3IgKHZhciBrZXkgaW4gc3R5bGUpIHtcbiAgICAgICAgICAgIGlmIChzdHlsZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICAgICAgdGhpc1trZXldID0gc3R5bGVba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBsb2FkaW5nIHN0eWxlJywgZSk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59O1xuXG5leHBvcnRzLlN0eWxlID0gU3R5bGU7IiwiZXhwb3J0cy5zdHlsZXMgPSB7XG4gICAgXCJwZWFjb2NrXCI6IHJlcXVpcmUoXCIuL3BlYWNvY2suanNcIiksXG59O1xuIiwiZXhwb3J0cy5zdHlsZSA9IHtcbiAgICBjb21tZW50OiAnIzdhNzI2NycsXG4gICAgc3RyaW5nOiAnI2JjZDQyYScsXG4gICAgJ2NsYXNzLW5hbWUnOiAnI2VkZTBjZScsXG4gICAga2V5d29yZDogJyMyNkE2QTYnLFxuICAgIGJvb2xlYW46ICcjYmNkNDJhJyxcbiAgICBmdW5jdGlvbjogJyNmZjVkMzgnLFxuICAgIG9wZXJhdG9yOiAnIzI2QTZBNicsXG4gICAgbnVtYmVyOiAnI2JjZDQyYScsXG4gICAgaWdub3JlOiAnI2NjY2NjYycsXG4gICAgcHVuY3R1YXRpb246ICcjZWRlMGNlJyxcblxuICAgIGN1cnNvcjogJyNmOGY4ZjAnLFxuICAgIGN1cnNvcl93aWR0aDogMS4wLFxuICAgIGN1cnNvcl9oZWlnaHQ6IDEuMSxcbiAgICBzZWxlY3Rpb246ICcjZmY1ZDM4JyxcbiAgICBzZWxlY3Rpb25fdW5mb2N1c2VkOiAnI2VmNGQyOCcsXG5cbiAgICB0ZXh0OiAnI2VkZTBjZScsXG4gICAgYmFja2dyb3VuZDogJyMyYjJhMjcnLFxuICAgIGd1dHRlcjogJyMyYjJhMjcnLFxuICAgIGd1dHRlcl90ZXh0OiAnIzdhNzI2NycsXG4gICAgZ3V0dGVyX3NoYWRvdzogW1xuICAgICAgICBbMCwgJ2JsYWNrJ10sIFxuICAgICAgICBbMSwgJ3RyYW5zcGFyZW50J11cbiAgICBdLFxufTtcblxuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxuLyoqXG4gKiBCYXNlIGNsYXNzIHdpdGggaGVscGZ1bCB1dGlsaXRpZXNcbiAqIEBwYXJhbSB7YXJyYXl9IFtldmVudGZ1bF9wcm9wZXJ0aWVzXSBsaXN0IG9mIHByb3BlcnR5IG5hbWVzIChzdHJpbmdzKVxuICogICAgICAgICAgICAgICAgdG8gY3JlYXRlIGFuZCB3aXJlIGNoYW5nZSBldmVudHMgdG8uXG4gKi9cbnZhciBQb3N0ZXJDbGFzcyA9IGZ1bmN0aW9uKGV2ZW50ZnVsX3Byb3BlcnRpZXMpIHtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICB0aGlzLl9vbl9hbGwgPSBbXTtcblxuICAgIC8vIENvbnN0cnVjdCBldmVudGZ1bCBwcm9wZXJ0aWVzLlxuICAgIGlmIChldmVudGZ1bF9wcm9wZXJ0aWVzICYmIGV2ZW50ZnVsX3Byb3BlcnRpZXMubGVuZ3RoPjApIHtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICBmb3IgKHZhciBpPTA7IGk8ZXZlbnRmdWxfcHJvcGVydGllcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgICAgICAgICB0aGF0LnByb3BlcnR5KG5hbWUsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhhdFsnXycgKyBuYW1lXTtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICB0aGF0LnRyaWdnZXIoJ2NoYW5nZTonICsgbmFtZSwgdmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB0aGF0LnRyaWdnZXIoJ2NoYW5nZScsIG5hbWUsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgdGhhdFsnXycgKyBuYW1lXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICB0aGF0LnRyaWdnZXIoJ2NoYW5nZWQ6JyArIG5hbWUpO1xuICAgICAgICAgICAgICAgICAgICB0aGF0LnRyaWdnZXIoJ2NoYW5nZWQnLCBuYW1lKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pKGV2ZW50ZnVsX3Byb3BlcnRpZXNbaV0pO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuLyoqXG4gKiBEZWZpbmUgYSBwcm9wZXJ0eSBmb3IgdGhlIGNsYXNzXG4gKiBAcGFyYW0gIHtzdHJpbmd9IG5hbWVcbiAqIEBwYXJhbSAge2Z1bmN0aW9ufSBnZXR0ZXJcbiAqIEBwYXJhbSAge2Z1bmN0aW9ufSBzZXR0ZXJcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblBvc3RlckNsYXNzLnByb3RvdHlwZS5wcm9wZXJ0eSA9IGZ1bmN0aW9uKG5hbWUsIGdldHRlciwgc2V0dGVyKSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIG5hbWUsIHtcbiAgICAgICAgZ2V0OiBnZXR0ZXIsXG4gICAgICAgIHNldDogc2V0dGVyLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICB9KTtcbn07XG5cbi8qKlxuICogUmVnaXN0ZXIgYW4gZXZlbnQgbGlzdGVuZXJcbiAqIEBwYXJhbSAge3N0cmluZ30gZXZlbnRcbiAqIEBwYXJhbSAge2Z1bmN0aW9ufSBoYW5kbGVyXG4gKiBAcGFyYW0gIHtvYmplY3R9IGNvbnRleHRcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblBvc3RlckNsYXNzLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uKGV2ZW50LCBoYW5kbGVyLCBjb250ZXh0KSB7XG4gICAgZXZlbnQgPSBldmVudC50cmltKCkudG9Mb3dlckNhc2UoKTtcblxuICAgIC8vIE1ha2Ugc3VyZSBhIGxpc3QgZm9yIHRoZSBldmVudCBleGlzdHMuXG4gICAgaWYgKCF0aGlzLl9ldmVudHNbZXZlbnRdKSB7IHRoaXMuX2V2ZW50c1tldmVudF0gPSBbXTsgfVxuXG4gICAgLy8gUHVzaCB0aGUgaGFuZGxlciBhbmQgdGhlIGNvbnRleHQgdG8gdGhlIGV2ZW50J3MgY2FsbGJhY2sgbGlzdC5cbiAgICB0aGlzLl9ldmVudHNbZXZlbnRdLnB1c2goW2hhbmRsZXIsIGNvbnRleHRdKTtcbn07XG5cbi8qKlxuICogVW5yZWdpc3RlciBvbmUgb3IgYWxsIGV2ZW50IGxpc3RlbmVycyBmb3IgYSBzcGVjaWZpYyBldmVudFxuICogQHBhcmFtICB7c3RyaW5nfSBldmVudFxuICogQHBhcmFtICB7Y2FsbGJhY2t9IChvcHRpb25hbCkgaGFuZGxlclxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuUG9zdGVyQ2xhc3MucHJvdG90eXBlLm9mZiA9IGZ1bmN0aW9uKGV2ZW50LCBoYW5kbGVyKSB7XG4gICAgZXZlbnQgPSBldmVudC50cmltKCkudG9Mb3dlckNhc2UoKTtcbiAgICBcbiAgICAvLyBJZiBhIGhhbmRsZXIgaXMgc3BlY2lmaWVkLCByZW1vdmUgYWxsIHRoZSBjYWxsYmFja3NcbiAgICAvLyB3aXRoIHRoYXQgaGFuZGxlci4gIE90aGVyd2lzZSwganVzdCByZW1vdmUgYWxsIG9mXG4gICAgLy8gdGhlIHJlZ2lzdGVyZWQgY2FsbGJhY2tzLlxuICAgIGlmIChoYW5kbGVyKSB7XG4gICAgICAgIHRoaXMuX2V2ZW50c1tldmVudF0gPSB0aGlzLl9ldmVudHNbZXZlbnRdLmZpbHRlcihmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrWzBdICE9PSBoYW5kbGVyO1xuICAgICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9ldmVudHNbZXZlbnRdID0gW107XG4gICAgfVxufTtcblxuLyoqXG4gKiBSZWdpc3RlciBhIGdsb2JhbCBldmVudCBoYW5kbGVyLiBcbiAqIFxuICogQSBnbG9iYWwgZXZlbnQgaGFuZGxlciBmaXJlcyBmb3IgYW55IGV2ZW50IHRoYXQnc1xuICogdHJpZ2dlcmVkLlxuICogQHBhcmFtICB7c3RyaW5nfSBoYW5kbGVyIC0gZnVuY3Rpb24gdGhhdCBhY2NlcHRzIG9uZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJndW1lbnQsIHRoZSBuYW1lIG9mIHRoZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQsXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Qb3N0ZXJDbGFzcy5wcm90b3R5cGUub25fYWxsID0gZnVuY3Rpb24oaGFuZGxlcikge1xuICAgIHZhciBpbmRleCA9IHRoaXMuX29uX2FsbC5pbmRleE9mKGhhbmRsZXIpO1xuICAgIGlmIChpbmRleCA9PT0gLTEpIHtcbiAgICAgICAgdGhpcy5fb25fYWxsLnB1c2goaGFuZGxlcik7XG4gICAgfVxufTtcblxuLyoqXG4gKiBVbnJlZ2lzdGVyIGEgZ2xvYmFsIGV2ZW50IGhhbmRsZXIuXG4gKiBAcGFyYW0gIHtbdHlwZV19IGhhbmRsZXJcbiAqIEByZXR1cm4ge2Jvb2xlYW59IHRydWUgaWYgYSBoYW5kbGVyIHdhcyByZW1vdmVkXG4gKi9cblBvc3RlckNsYXNzLnByb3RvdHlwZS5vZmZfYWxsID0gZnVuY3Rpb24oaGFuZGxlcikge1xuICAgIHZhciBpbmRleCA9IHRoaXMuX29uX2FsbC5pbmRleE9mKGhhbmRsZXIpO1xuICAgIGlmIChpbmRleCAhPSAtMSkge1xuICAgICAgICB0aGlzLl9vbl9hbGwuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn07XG5cbi8qKlxuICogVHJpZ2dlcnMgdGhlIGNhbGxiYWNrcyBvZiBhbiBldmVudCB0byBmaXJlLlxuICogQHBhcmFtICB7c3RyaW5nfSBldmVudFxuICogQHJldHVybiB7YXJyYXl9IGFycmF5IG9mIHJldHVybiB2YWx1ZXNcbiAqL1xuUG9zdGVyQ2xhc3MucHJvdG90eXBlLnRyaWdnZXIgPSBmdW5jdGlvbihldmVudCkge1xuICAgIGV2ZW50ID0gZXZlbnQudHJpbSgpLnRvTG93ZXJDYXNlKCk7XG5cbiAgICAvLyBDb252ZXJ0IGFyZ3VtZW50cyB0byBhbiBhcnJheSBhbmQgY2FsbCBjYWxsYmFja3MuXG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgIGFyZ3Muc3BsaWNlKDAsMSk7XG5cbiAgICAvLyBUcmlnZ2VyIGdsb2JhbCBoYW5kbGVycyBmaXJzdC5cbiAgICB0aGlzLl9vbl9hbGwuZm9yRWFjaChmdW5jdGlvbihoYW5kbGVyKSB7XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgW2V2ZW50XS5jb25jYXQoYXJncykpO1xuICAgIH0pO1xuXG4gICAgLy8gVHJpZ2dlciBpbmRpdmlkdWFsIGhhbmRsZXJzIHNlY29uZC5cbiAgICB2YXIgZXZlbnRzID0gdGhpcy5fZXZlbnRzW2V2ZW50XTtcbiAgICBpZiAoZXZlbnRzKSB7XG4gICAgICAgIHZhciByZXR1cm5zID0gW107XG4gICAgICAgIGV2ZW50cy5mb3JFYWNoKGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICByZXR1cm5zLnB1c2goY2FsbGJhY2tbMF0uYXBwbHkoY2FsbGJhY2tbMV0sIGFyZ3MpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiByZXR1cm5zO1xuICAgIH1cbiAgICByZXR1cm4gW107XG59O1xuXG4vKipcbiAqIENhdXNlIG9uZSBjbGFzcyB0byBpbmhlcml0IGZyb20gYW5vdGhlclxuICogQHBhcmFtICB7dHlwZX0gY2hpbGRcbiAqIEBwYXJhbSAge3R5cGV9IHBhcmVudFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xudmFyIGluaGVyaXQgPSBmdW5jdGlvbihjaGlsZCwgcGFyZW50KSB7XG4gICAgY2hpbGQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShwYXJlbnQucHJvdG90eXBlLCB7fSk7XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiBhIHZhbHVlIGlzIGNhbGxhYmxlXG4gKiBAcGFyYW0gIHthbnl9IHZhbHVlXG4gKiBAcmV0dXJuIHtib29sZWFufVxuICovXG52YXIgY2FsbGFibGUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT0gJ2Z1bmN0aW9uJztcbn07XG5cbi8qKlxuICogQ2FsbHMgdGhlIHZhbHVlIGlmIGl0J3MgY2FsbGFibGUgYW5kIHJldHVybnMgaXQncyByZXR1cm4uXG4gKiBPdGhlcndpc2UgcmV0dXJucyB0aGUgdmFsdWUgYXMtaXMuXG4gKiBAcGFyYW0gIHthbnl9IHZhbHVlXG4gKiBAcmV0dXJuIHthbnl9XG4gKi9cbnZhciByZXNvbHZlX2NhbGxhYmxlID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICBpZiAoY2FsbGFibGUodmFsdWUpKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZS5jYWxsKHRoaXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYSBwcm94eSB0byBhIGZ1bmN0aW9uIHNvIGl0IGlzIGNhbGxlZCBpbiB0aGUgY29ycmVjdCBjb250ZXh0LlxuICogQHJldHVybiB7ZnVuY3Rpb259IHByb3hpZWQgZnVuY3Rpb24uXG4gKi9cbnZhciBwcm94eSA9IGZ1bmN0aW9uKGYsIGNvbnRleHQpIHtcbiAgICBpZiAoZj09PXVuZGVmaW5lZCkgeyB0aHJvdyBuZXcgRXJyb3IoJ2YgY2Fubm90IGJlIHVuZGVmaW5lZCcpOyB9XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkgeyByZXR1cm4gZi5hcHBseShjb250ZXh0LCBhcmd1bWVudHMpOyB9O1xufTtcblxuLyoqXG4gKiBDbGVhcnMgYW4gYXJyYXkgaW4gcGxhY2UuXG4gKlxuICogRGVzcGl0ZSBhbiBPKE4pIGNvbXBsZXhpdHksIHRoaXMgc2VlbXMgdG8gYmUgdGhlIGZhc3Rlc3Qgd2F5IHRvIGNsZWFyXG4gKiBhIGxpc3QgaW4gcGxhY2UgaW4gSmF2YXNjcmlwdC4gXG4gKiBCZW5jaG1hcms6IGh0dHA6Ly9qc3BlcmYuY29tL2VtcHR5LWphdmFzY3JpcHQtYXJyYXlcbiAqIENvbXBsZXhpdHk6IE8oTilcbiAqIEBwYXJhbSAge2FycmF5fSBhcnJheVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xudmFyIGNsZWFyX2FycmF5ID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgICB3aGlsZSAoYXJyYXkubGVuZ3RoID4gMCkge1xuICAgICAgICBhcnJheS5wb3AoKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiBhIHZhbHVlIGlzIGFuIGFycmF5XG4gKiBAcGFyYW0gIHthbnl9IHhcbiAqIEByZXR1cm4ge2Jvb2xlYW59IHRydWUgaWYgdmFsdWUgaXMgYW4gYXJyYXlcbiAqL1xudmFyIGlzX2FycmF5ID0gZnVuY3Rpb24oeCkge1xuICAgIHJldHVybiB4IGluc3RhbmNlb2YgQXJyYXk7XG59O1xuXG4vKipcbiAqIEZpbmQgdGhlIGNsb3Nlc3QgdmFsdWUgaW4gYSBsaXN0XG4gKiBcbiAqIEludGVycG9sYXRpb24gc2VhcmNoIGFsZ29yaXRobS4gIFxuICogQ29tcGxleGl0eTogTyhsZyhsZyhOKSkpXG4gKiBAcGFyYW0gIHthcnJheX0gc29ydGVkIC0gc29ydGVkIGFycmF5IG9mIG51bWJlcnNcbiAqIEBwYXJhbSAge2Zsb2F0fSB4IC0gbnVtYmVyIHRvIHRyeSB0byBmaW5kXG4gKiBAcmV0dXJuIHtpbnRlZ2VyfSBpbmRleCBvZiB0aGUgdmFsdWUgdGhhdCdzIGNsb3Nlc3QgdG8geFxuICovXG52YXIgZmluZF9jbG9zZXN0ID0gZnVuY3Rpb24oc29ydGVkLCB4KSB7XG4gICAgdmFyIG1pbiA9IHNvcnRlZFswXTtcbiAgICB2YXIgbWF4ID0gc29ydGVkW3NvcnRlZC5sZW5ndGgtMV07XG4gICAgaWYgKHggPCBtaW4pIHJldHVybiAwO1xuICAgIGlmICh4ID4gbWF4KSByZXR1cm4gc29ydGVkLmxlbmd0aC0xO1xuICAgIGlmIChzb3J0ZWQubGVuZ3RoID09IDIpIHtcbiAgICAgICAgaWYgKG1heCAtIHggPiB4IC0gbWluKSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9XG4gICAgfVxuICAgIHZhciByYXRlID0gKG1heCAtIG1pbikgLyBzb3J0ZWQubGVuZ3RoO1xuICAgIGlmIChyYXRlID09PSAwKSByZXR1cm4gMDtcbiAgICB2YXIgZ3Vlc3MgPSBNYXRoLmZsb29yKHggLyByYXRlKTtcbiAgICBpZiAoc29ydGVkW2d1ZXNzXSA9PSB4KSB7XG4gICAgICAgIHJldHVybiBndWVzcztcbiAgICB9IGVsc2UgaWYgKGd1ZXNzID4gMCAmJiBzb3J0ZWRbZ3Vlc3MtMV0gPCB4ICYmIHggPCBzb3J0ZWRbZ3Vlc3NdKSB7XG4gICAgICAgIHJldHVybiBmaW5kX2Nsb3Nlc3Qoc29ydGVkLnNsaWNlKGd1ZXNzLTEsIGd1ZXNzKzEpLCB4KSArIGd1ZXNzLTE7XG4gICAgfSBlbHNlIGlmIChndWVzcyA8IHNvcnRlZC5sZW5ndGgtMSAmJiBzb3J0ZWRbZ3Vlc3NdIDwgeCAmJiB4IDwgc29ydGVkW2d1ZXNzKzFdKSB7XG4gICAgICAgIHJldHVybiBmaW5kX2Nsb3Nlc3Qoc29ydGVkLnNsaWNlKGd1ZXNzLCBndWVzcysyKSwgeCkgKyBndWVzcztcbiAgICB9IGVsc2UgaWYgKHNvcnRlZFtndWVzc10gPiB4KSB7XG4gICAgICAgIHJldHVybiBmaW5kX2Nsb3Nlc3Qoc29ydGVkLnNsaWNlKDAsIGd1ZXNzKSwgeCk7XG4gICAgfSBlbHNlIGlmIChzb3J0ZWRbZ3Vlc3NdIDwgeCkge1xuICAgICAgICByZXR1cm4gZmluZF9jbG9zZXN0KHNvcnRlZC5zbGljZShndWVzcysxKSwgeCkgKyBndWVzcysxO1xuICAgIH1cbn07XG5cbi8qKlxuICogTWFrZSBhIHNoYWxsb3cgY29weSBvZiBhIGRpY3Rpb25hcnkuXG4gKiBAcGFyYW0gIHtkaWN0aW9uYXJ5fSB4XG4gKiBAcmV0dXJuIHtkaWN0aW9uYXJ5fVxuICovXG52YXIgc2hhbGxvd19jb3B5ID0gZnVuY3Rpb24oeCkge1xuICAgIHZhciB5ID0ge307XG4gICAgZm9yICh2YXIga2V5IGluIHgpIHtcbiAgICAgICAgaWYgKHguaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgeVtrZXldID0geFtrZXldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB5O1xufTtcblxuLyoqXG4gKiBIb29rcyBhIGZ1bmN0aW9uLlxuICogQHBhcmFtICB7b2JqZWN0fSBvYmogLSBvYmplY3QgdG8gaG9va1xuICogQHBhcmFtICB7c3RyaW5nfSBtZXRob2QgLSBuYW1lIG9mIHRoZSBmdW5jdGlvbiB0byBob29rXG4gKiBAcGFyYW0gIHtmdW5jdGlvbn0gaG9vayAtIGZ1bmN0aW9uIHRvIGNhbGwgYmVmb3JlIHRoZSBvcmlnaW5hbFxuICogQHJldHVybiB7b2JqZWN0fSBob29rIHJlZmVyZW5jZSwgb2JqZWN0IHdpdGggYW4gYHVuaG9va2AgbWV0aG9kXG4gKi9cbnZhciBob29rID0gZnVuY3Rpb24ob2JqLCBtZXRob2QsIGhvb2spIHtcblxuICAgIC8vIElmIHRoZSBvcmlnaW5hbCBoYXMgYWxyZWFkeSBiZWVuIGhvb2tlZCwgYWRkIHRoaXMgaG9vayB0byB0aGUgbGlzdCBcbiAgICAvLyBvZiBob29rcy5cbiAgICBpZiAob2JqW21ldGhvZF0gJiYgb2JqW21ldGhvZF0ub3JpZ2luYWwgJiYgb2JqW21ldGhvZF0uaG9va3MpIHtcbiAgICAgICAgb2JqW21ldGhvZF0uaG9va3MucHVzaChob29rKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBDcmVhdGUgdGhlIGhvb2tlZCBmdW5jdGlvblxuICAgICAgICB2YXIgaG9va3MgPSBbaG9va107XG4gICAgICAgIHZhciBvcmlnaW5hbCA9IG9ialttZXRob2RdO1xuICAgICAgICB2YXIgaG9va2VkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgICAgICAgIHZhciByZXQ7XG4gICAgICAgICAgICB2YXIgcmVzdWx0cztcbiAgICAgICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgICAgIGhvb2tzLmZvckVhY2goZnVuY3Rpb24oaG9vaykge1xuICAgICAgICAgICAgICAgIHJlc3VsdHMgPSBob29rLmFwcGx5KHRoYXQsIGFyZ3MpO1xuICAgICAgICAgICAgICAgIHJldCA9IHJldCAhPT0gdW5kZWZpbmVkID8gcmV0IDogcmVzdWx0cztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKG9yaWdpbmFsKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0cyA9IG9yaWdpbmFsLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJldCAhPT0gdW5kZWZpbmVkID8gcmV0IDogcmVzdWx0cztcbiAgICAgICAgfTtcbiAgICAgICAgaG9va2VkLm9yaWdpbmFsID0gb3JpZ2luYWw7XG4gICAgICAgIGhvb2tlZC5ob29rcyA9IGhvb2tzO1xuICAgICAgICBvYmpbbWV0aG9kXSA9IGhvb2tlZDtcbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gdW5ob29rIG1ldGhvZC5cbiAgICByZXR1cm4ge1xuICAgICAgICB1bmhvb2s6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGluZGV4ID0gb2JqW21ldGhvZF0uaG9va3MuaW5kZXhPZihob29rKTtcbiAgICAgICAgICAgIGlmIChpbmRleCAhPSAtMSkge1xuICAgICAgICAgICAgICAgIG9ialttZXRob2RdLmhvb2tzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChvYmpbbWV0aG9kXS5ob29rcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICBvYmpbbWV0aG9kXSA9IG9ialttZXRob2RdLm9yaWdpbmFsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgIH07XG4gICAgXG59O1xuXG4vKipcbiAqIENhbmNlbHMgZXZlbnQgYnViYmxpbmcuXG4gKiBAcGFyYW0gIHtldmVudH0gZVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xudmFyIGNhbmNlbF9idWJibGUgPSBmdW5jdGlvbihlKSB7XG4gICAgaWYgKGUuc3RvcFByb3BhZ2F0aW9uKSBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIGlmIChlLmNhbmNlbEJ1YmJsZSAhPT0gbnVsbCkgZS5jYW5jZWxCdWJibGUgPSB0cnVlO1xuICAgIGlmIChlLnByZXZlbnREZWZhdWx0KSBlLnByZXZlbnREZWZhdWx0KCk7XG59O1xuXG4vKipcbiAqIEdlbmVyYXRlcyBhIHJhbmRvbSBjb2xvciBzdHJpbmdcbiAqIEByZXR1cm4ge3N0cmluZ30gaGV4YWRlY2ltYWwgY29sb3Igc3RyaW5nXG4gKi9cbnZhciByYW5kb21fY29sb3IgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcmFuZG9tX2J5dGUgPSBmdW5jdGlvbigpIHsgXG4gICAgICAgIHZhciBiID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogMjU1KS50b1N0cmluZygxNik7XG4gICAgICAgIHJldHVybiBiLmxlbmd0aCA9PSAxID8gJzAnICsgYiA6IGI7XG4gICAgfTtcbiAgICByZXR1cm4gJyMnICsgcmFuZG9tX2J5dGUoKSArIHJhbmRvbV9ieXRlKCkgKyByYW5kb21fYnl0ZSgpO1xufTtcblxuLyoqXG4gKiBDb21wYXJlIHR3byBhcnJheXMgYnkgY29udGVudHMgZm9yIGVxdWFsaXR5LlxuICogQHBhcmFtICB7YXJyYXl9IHhcbiAqIEBwYXJhbSAge2FycmF5fSB5XG4gKiBAcmV0dXJuIHtib29sZWFufVxuICovXG52YXIgY29tcGFyZV9hcnJheXMgPSBmdW5jdGlvbih4LCB5KSB7XG4gICAgaWYgKHgubGVuZ3RoICE9IHkubGVuZ3RoKSByZXR1cm4gZmFsc2U7XG4gICAgZm9yIChpPTA7IGk8eC5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoeFtpXSE9PXlbaV0pIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIEZpbmQgYWxsIHRoZSBvY2N1cmFuY2VzIG9mIGEgcmVndWxhciBleHByZXNzaW9uIGluc2lkZSBhIHN0cmluZy5cbiAqIEBwYXJhbSAge3N0cmluZ30gdGV4dCAtIHN0cmluZyB0byBsb29rIGluXG4gKiBAcGFyYW0gIHtzdHJpbmd9IHJlIC0gcmVndWxhciBleHByZXNzaW9uIHRvIGZpbmRcbiAqIEByZXR1cm4ge2FycmF5fSBhcnJheSBvZiBbc3RhcnRfaW5kZXgsIGVuZF9pbmRleF0gcGFpcnNcbiAqL1xudmFyIGZpbmRhbGwgPSBmdW5jdGlvbih0ZXh0LCByZSwgZmxhZ3MpIHtcbiAgICByZSA9IG5ldyBSZWdFeHAocmUsIGZsYWdzIHx8ICdnbScpO1xuICAgIHZhciByZXN1bHRzO1xuICAgIHZhciBmb3VuZCA9IFtdO1xuICAgIHdoaWxlICgocmVzdWx0cyA9IHJlLmV4ZWModGV4dCkpICE9PSBudWxsKSB7XG4gICAgICAgIHZhciBlbmRfaW5kZXggPSByZXN1bHRzLmluZGV4ICsgKHJlc3VsdHNbMF0ubGVuZ3RoIHx8IDEpO1xuICAgICAgICBmb3VuZC5wdXNoKFtyZXN1bHRzLmluZGV4LCBlbmRfaW5kZXhdKTtcbiAgICAgICAgcmUubGFzdEluZGV4ID0gTWF0aC5tYXgoZW5kX2luZGV4LCByZS5sYXN0SW5kZXgpO1xuICAgIH1cbiAgICByZXR1cm4gZm91bmQ7XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiB0aGUgY2hhcmFjdGVyIGlzbid0IHRleHQuXG4gKiBAcGFyYW0gIHtjaGFyfSBjIC0gY2hhcmFjdGVyXG4gKiBAcmV0dXJuIHtib29sZWFufSB0cnVlIGlmIHRoZSBjaGFyYWN0ZXIgaXMgbm90IHRleHQuXG4gKi9cbnZhciBub3RfdGV4dCA9IGZ1bmN0aW9uKGMpIHtcbiAgICByZXR1cm4gJ2FiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MTIzNDU2Nzg5MF8nLmluZGV4T2YoYy50b0xvd2VyQ2FzZSgpKSA9PSAtMTtcbn07XG5cbi8vIEV4cG9ydCBuYW1lcy5cbmV4cG9ydHMuUG9zdGVyQ2xhc3MgPSBQb3N0ZXJDbGFzcztcbmV4cG9ydHMuaW5oZXJpdCA9IGluaGVyaXQ7XG5leHBvcnRzLmNhbGxhYmxlID0gY2FsbGFibGU7XG5leHBvcnRzLnJlc29sdmVfY2FsbGFibGUgPSByZXNvbHZlX2NhbGxhYmxlO1xuZXhwb3J0cy5wcm94eSA9IHByb3h5O1xuZXhwb3J0cy5jbGVhcl9hcnJheSA9IGNsZWFyX2FycmF5O1xuZXhwb3J0cy5pc19hcnJheSA9IGlzX2FycmF5O1xuZXhwb3J0cy5maW5kX2Nsb3Nlc3QgPSBmaW5kX2Nsb3Nlc3Q7XG5leHBvcnRzLnNoYWxsb3dfY29weSA9IHNoYWxsb3dfY29weTtcbmV4cG9ydHMuaG9vayA9IGhvb2s7XG5leHBvcnRzLmNhbmNlbF9idWJibGUgPSBjYW5jZWxfYnViYmxlO1xuZXhwb3J0cy5yYW5kb21fY29sb3IgPSByYW5kb21fY29sb3I7XG5leHBvcnRzLmNvbXBhcmVfYXJyYXlzID0gY29tcGFyZV9hcnJheXM7XG5leHBvcnRzLmZpbmRhbGwgPSBmaW5kYWxsO1xuZXhwb3J0cy5ub3RfdGV4dCA9IG5vdF90ZXh0O1xuIl19
