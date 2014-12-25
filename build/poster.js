!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.poster=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var scrolling_canvas = require('./scrolling_canvas.js');
var document_controller = require('./document_controller.js');
var document_model = require('./document_model.js');
var document_view = require('./document_view.js');
var style = require('./style.js');
var utils = require('./utils.js');
var _config = require('./config.js');
var config = _config.config;

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
    });
    this.property('height', function() {
        return that.view.height;
    }, function(value) {
        that.view.height = value;
    });
    this.property('language', function() {
        return that.view.language;
    }, function(value) {
        that.view.language = value;
    });
};
utils.inherit(Poster, utils.PosterClass);

// Exports
exports.Poster = Poster;

},{"./config.js":6,"./document_controller.js":9,"./document_model.js":10,"./document_view.js":11,"./scrolling_canvas.js":24,"./style.js":25,"./utils.js":28}],2:[function(require,module,exports){
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

exports.Animator = Animator;
},{"./utils.js":28}],4:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var utils = require('./utils.js');

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

// Exports
exports.Canvas = Canvas;

},{"./utils.js":28}],5:[function(require,module,exports){
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

},{"./utils.js":28}],6:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('./utils.js');
exports.config = new utils.PosterClass([
    'highlight_draw', // bool - Whether or not to highlight re-renders
    'newline_width', // integer - Width of newline characters
]);

},{"./utils.js":28}],7:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var keymap = require('./events/map.js');
var register = keymap.Map.register;

var utils = require('./utils.js');

/**
 * Input cursor.
 */
var Cursor = function(model) {
    utils.PosterClass.call(this);
    this._model = model;

    this.primary_row = null;
    this.primary_char = null;
    this.secondary_row = null;
    this.secondary_char = null;

    this._init_properties();
    this._register_api();
};
utils.inherit(Cursor, utils.PosterClass);

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
    this.primary_char = this._model._rows[this.primary_row].length;
    this._memory_char = this.primary_char;
    this.trigger('change'); 
};

/**
 * Move the primary cursor to the line start.
 * @return {null}
 */
Cursor.prototype.primary_goto_start = function() {
    this.primary_char = 0;
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
    this._model.add_text(this.primary_row, this.primary_char, char_typed);
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
    if (this.primary_row == this.secondary_row && this.primary_char == this.secondary_char) {
        this._model.add_text(this.primary_row, this.primary_char, '\t');
    } else {
        for (var row = this.start_row; row <= this.end_row; row++) {
            this._model.add_text(row, 0, '\t');
        }
    }

    this.primary_char += 1;
    this.secondary_char += 1;
    this.trigger('change');
    return true;
};

/**
 * Unindent
 * @param  {Event} e - original key press event.
 * @return {null}
 */
Cursor.prototype.unindent = function(e) {
    var removed_start = false;
    var removed_end = false;

    // If no text is selected, remove the indent preceding the
    // cursor if it exists.
    if (this.primary_row == this.secondary_row && this.primary_char == this.secondary_char) {
        if (this.primary_char > 0) {
            var before = this._model.get_text(this.primary_row, this.primary_char-1, this.primary_row, this.primary_char);
            if (before == '\t') {
                this._model.remove_text(this.primary_row, this.primary_char-1, this.primary_row, this.primary_char);
                removed_start = true;
                removed_end = true;
            }
        }

    // Text is selected.  Remove the an indent from the begining
    // of each row if it exists.
    } else {
        for (var row = this.start_row; row <= this.end_row; row++) {
            if (this._model._rows[row].length > 0) {
                if (this._model._rows[row].substring(0, 1) == '\t') {
                    this._model.remove_text(row, 0, row, 1);
                    if (row == this.start_row) removed_start = true;
                    if (row == this.end_row) removed_end = true;
                }
            };
        }
    }
    
    // Move the selected characters backwards if indents were removed.
    var start_is_primary = (this.primary_row == this.start_row && this.primary_char == this.start_char);
    if (start_is_primary) {
        if (removed_start) this.primary_char -= 1;
        if (removed_end) this.secondary_char -= 1;
    } else {
        if (removed_end) this.primary_char -= 1;
        if (removed_start) this.secondary_char -= 1;
    }
    if (removed_end || removed_start) this.trigger('change');
    return true;
};

/**
 * Insert a newline
 * @return {null}
 */
Cursor.prototype.newline = function(e) {
    this.remove_selected();
    this._model.add_text(this.primary_row, this.primary_char, '\n');
    this.move_primary(0, 1);
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
    this._model.add_text(this.primary_row, this.primary_char, text);
    
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
 * Remove the selected text
 * @return {boolean} true if text was removed.
 */
Cursor.prototype.remove_selected = function() {
    if (this.primary_row !== this.secondary_row || this.primary_char !== this.secondary_char) {
        var row_index = this.start_row;
        var char_index = this.start_char;
        this._model.remove_text(this.start_row, this.start_char, this.end_row, this.end_char);
        this.primary_row = row_index;
        this.primary_char = char_index;
        this._reset_secondary();
        this.trigger('change'); 
        return true;
    }
    return false;
};

/**
 * Copies the selected text.
 * @return {string} selected text
 */
Cursor.prototype.copy = function() {
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
    var text = this.copy();
    if (this.primary_row == this.secondary_row && this.primary_char == this.secondary_char) {
        this._model.remove_row(this.primary_row);
    } else {
        this.remove_selected();
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
 * Registers an action API with the map
 * @return {null}
 */
Cursor.prototype._register_api = function() {
    var that = this;
    register('cursor.remove_selected', utils.proxy(this.remove_selected, this), this);
    register('cursor.keypress', utils.proxy(this.keypress, this), this);
    register('cursor.indent', utils.proxy(this.indent, this), this);
    register('cursor.unindent', utils.proxy(this.unindent, this), this);
    register('cursor.newline', utils.proxy(this.newline, this), this);
    register('cursor.insert_text', utils.proxy(this.insert_text, this), this);
    register('cursor.delete_backward', utils.proxy(this.delete_backward, this), this);
    register('cursor.delete_forward', utils.proxy(this.delete_forward, this), this);
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
},{"./events/map.js":13,"./utils.js":28}],8:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var keymap = require('./events/map.js');
var register = keymap.Map.register;

var cursor = require('./cursor.js');
var utils = require('./utils.js');
/**
 * Manages one or more cursors
 */
var Cursors = function(model, clipboard) {
    utils.PosterClass.call(this);
    this._model = model;
    this.get_row_char = undefined;
    this.cursors = [];
    this._selecting_text = false;
    this._clipboard = clipboard;

    // Create initial cursor.
    this.create();

    // Register actions.
    register('cursors.start_selection', utils.proxy(this.start_selection, this));
    register('cursors.set_selection', utils.proxy(this.set_selection, this));
    register('cursors.start_set_selection', utils.proxy(this.start_set_selection, this));
    register('cursors.end_selection', utils.proxy(this.end_selection, this));
    register('cursors.select_word', utils.proxy(this.select_word, this));

    // Bind clipboard events.
    this._clipboard.on('cut', utils.proxy(this._handle_cut, this));
    this._clipboard.on('paste', utils.proxy(this._handle_paste, this));
};
utils.inherit(Cursors, utils.PosterClass);

/**
 * Creates a cursor and manages it.
 * @return {Cursor} cursor
 */
Cursors.prototype.create = function() {
    var new_cursor = new cursor.Cursor(this._model, this._input_dispatcher);
    this.cursors.push(new_cursor);

    var that = this;
    new_cursor.on('change', function() {
        that.trigger('change', new_cursor);
        that._update_selection();
    });

    return new_cursor;
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
            cursor.insert_text(text);
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
        selections.push(cursor.copy());
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

},{"./cursor.js":7,"./events/map.js":13,"./utils.js":28}],9:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('./utils.js');
var normalizer = require('./events/normalizer.js');
var keymap = require('./events/map.js');
var default_keymap = require('./events/default.js');
var cursors = require('./cursors.js');
var clipboard = require('./clipboard.js');

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

    this.cursors = new cursors.Cursors(model, this.clipboard);
};
utils.inherit(DocumentController, utils.PosterClass);

// Exports
exports.DocumentController = DocumentController;

},{"./clipboard.js":5,"./cursors.js":8,"./events/default.js":12,"./events/map.js":13,"./events/normalizer.js":14,"./utils.js":28}],10:[function(require,module,exports){
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
    // If the text has a new line in it, just re-set
    // the rows list.
    if (text.indexOf('\n') != -1) {
        var new_rows = [];
        if (coords.start_row > 0) {
            new_rows = this._rows.slice(0, coords.start_row);
        }

        var old_row = this._rows[coords.start_row];
        var old_row_start = old_row.substring(0, coords.start_char);
        var old_row_end = old_row.substring(coords.start_char);
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
        this.trigger('row_changed', coords.start_row);
        this.trigger('rows_added', coords.start_row + 1, coords.start_row + split_text.length - 1);
        this.trigger('changed');

    // Text doesn't have any new lines, just modify the
    // line and then trigger the row changed event.
    } else {
        var old_text = this._rows[coords.start_row];
        this._rows[coords.start_row] = old_text.substring(0, coords.start_char) + text + old_text.substring(coords.start_char);
        this.trigger('row_changed', coords.start_row);
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
    if (coords.start_row == coords.end_row) {
        this._rows[coords.start_row] = this._rows[coords.start_row].substring(0, coords.start_char) + this._rows[coords.start_row].substring(coords.end_char);
    } else {
        this._rows[coords.start_row] = this._rows[coords.start_row].substring(0, coords.start_char) + this._rows[coords.end_row].substring(coords.end_char);
    }

    if (coords.end_row - coords.start_row > 0) {
        this._rows.splice(coords.start_row + 1, coords.end_row - coords.start_row);
        this._resized_rows();
        this.trigger('text_changed');
        this.trigger('changed');
    } else if (coords.end_row == coords.start_row) {
        this.trigger('row_changed', coords.start_row);
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
        this._rows.splice(row_index, 1);
        this._resized_rows();
        this.trigger('text_changed');
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
},{"./utils.js":28}],11:[function(require,module,exports){
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
},{"./highlighters/prism.js":16,"./renderers/batch.js":17,"./renderers/color.js":18,"./renderers/cursors.js":19,"./renderers/highlighted_row.js":20,"./renderers/selections.js":23,"./utils.js":28}],12:[function(require,module,exports){
// OSX bindings
if (navigator.appVersion.indexOf("Mac") != -1) {
    exports.map = {
        'alt-leftarrow' : 'cursor.word_left',
        'alt-rightarrow' : 'cursor.word_right',
        'shift-alt-leftarrow' : 'cursor.select_word_left',
        'shift-alt-rightarrow' : 'cursor.select_word_right',
        'meta-leftarrow' : 'cursor.line_start',
        'meta-rightarrow' : 'cursor.line_end',
        'shift-meta-leftarrow' : 'cursor.select_line_start',
        'shift-meta-rightarrow' : 'cursor.select_line_end',
        'meta-a' : 'cursor.select_all',
    };

// Non OSX bindings
} else {
    exports.map = {
        'ctrl-leftarrow' : 'cursor.word_left',
        'ctrl-rightarrow' : 'cursor.word_right',
        'shift-ctrl-leftarrow' : 'cursor.select_word_left',
        'shift-ctrl-rightarrow' : 'cursor.select_word_right',
        'home' : 'cursor.line_start',
        'end' : 'cursor.line_end',
        'shift-home' : 'cursor.select_line_start',
        'shift-end' : 'cursor.select_line_end',
        'ctrl-a' : 'cursor.select_all',
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
            var action_callbacks = Map.registry[action];
            if (action_callbacks) {
                if (utils.is_array(action_callbacks)) {
                    var returns = [];
                    action_callbacks.forEach(function(action_callback) {
                        returns.append(action_callback.call(undefined, e)===true);
                    });

                    // If one of the action callbacks returned true, cancel bubbling.
                    if (returns.some(function(x) {return x;})) {
                        utils.cancel_bubble(e);
                        return true;
                    }
                } else {
                    if (action_callbacks.call(undefined, e)===true) {
                        utils.cancel_bubble(e);
                        return true;
                    }
                }
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

},{"../utils.js":28}],14:[function(require,module,exports){
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

},{"../utils.js":28}],15:[function(require,module,exports){
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
    this.delay = 100; //ms

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

},{"../utils.js":28}],16:[function(require,module,exports){
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

},{"../../components/prism.js":2,"../utils.js":28,"./highlighter.js":15}],17:[function(require,module,exports){
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
 * Render to the canvas
 * @param {dictionary} (optional) scroll - How much the canvas was scrolled.  This
 *                     is a dictionary of the form {x: float, y: float}
 * @return {null}
 */
BatchRenderer.prototype.render = function(scroll) {
    var that = this;
    this._renderers.forEach(function(renderer) {

        // Apply the rendering coordinate transforms of the parent.
        if (!renderer.options.parent_independent) {
            renderer._canvas._tx = utils.proxy(that._canvas._tx, that._canvas);
            renderer._canvas._ty = utils.proxy(that._canvas._ty, that._canvas);
        }

        // Tell the renderer to render itself.
        renderer.render(scroll);
    });

    // Copy the results to self.
    this._copy_renderers();
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
        -this._canvas._tx(0), 
        -this._canvas._ty(0), 
        this._canvas.width, 
        this._canvas.height);
};

// Exports
exports.BatchRenderer = BatchRenderer;

},{"../utils.js":28,"./renderer.js":21}],18:[function(require,module,exports){
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

},{"../utils.js":28,"./renderer.js":21}],19:[function(require,module,exports){
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
    this._fps = 30;

    // Start the cursor rendering clock.
    this._render_clock();
    this._last_rendered = null;
};
utils.inherit(CursorsRenderer, renderer.RendererBase);

/**
 * Render to the canvas
 * Note: This method is called often, so it's important that it's
 * optimized for speed.
 * @return {null}
 */
CursorsRenderer.prototype.render = function() {
    // Frame limit the rendering.
    if (Date.now() - this._last_rendered < 1000/this._fps) {
        return;
    }
    this._canvas.clear();

    // Only render if the canvas has focus.
    if (this._has_focus()) {
        var that = this;
        this._cursors.cursors.forEach(function(cursor) {
            // Get the visible rows.
            var visible_rows = that._get_visible_rows();

            // If a cursor doesn't have a position, render it at the
            // beginning of the document.
            var row_index = cursor.primary_row || 0;
            var char_index = cursor.primary_char || 0;

            // Calculate opacity of the cursor.  Blinking cursor.
            var sin = Math.sin(2*Math.PI*that._blink_animator.time());
            var alpha = Math.min(Math.max(sin+0.5, 0), 1); // Offset, truncated sine wave.

            // Draw the cursor.
            if (alpha > 0) {
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
                            alpha: alpha,
                        }
                    );
                }    
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

},{"../animator.js":3,"../utils.js":28,"./renderer.js":21}],20:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = require('../utils.js');
var row = require('./row.js');
var _config = require('../config.js');
var config = _config.config;

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

},{"../config.js":6,"../utils.js":28,"./row.js":22}],21:[function(require,module,exports){
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

},{"../canvas.js":4,"../utils.js":28}],22:[function(require,module,exports){
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
        // Update the scrollbars.
        that._scrolling_canvas.scroll_width += value - that._margin_left;
        
        // Update internal value.
        that._margin_left = value;

        // Re-render with new margin.
        that.render();
        // Tell parent layer this one has changed.
        that.trigger('changed');
    })
    this._margin_top = 0
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
    })

    // Set initial canvas sizes.  These lines may look redundant, but beware
    // because they actually cause an appropriate width and height to be set for
    // the text canvas because of the properties declared above.
    this.width = this._canvas.width;
    this.height = this._canvas.height;

    this._model.on('text_changed', utils.proxy(this._handle_value_changed, this));
    this._model.on('rows_added', utils.proxy(this._handle_rows_added, this));
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
    var document_width = 0;
    for (var i=0; i<this._model._rows.length; i++) {
        document_width = Math.max(this._measure_row_width(i)+this._margin_left, document_width);
    }
    this._scrolling_canvas.scroll_width = document_width;
    this._scrolling_canvas.scroll_height = this._model._rows.length * this.get_row_height() + this._margin_top;
};

/**
 * Handles when one of the model's rows change
 * @return {null}
 */
RowRenderer.prototype._handle_row_changed = function(index) {
    this._scrolling_canvas.scroll_width = Math.max(this._measure_row_width(index)+this._margin_left, this._scrolling_canvas.scroll_width);
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
    var width = this._scrolling_canvas.scroll_width;
    for (var i = start; i <= end; i++) { 
        width = Math.max(this._measure_row_width(i)+this._margin_left, width);
    }
    this._scrolling_canvas.scroll_width = width;
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

// Exports
exports.RowRenderer = RowRenderer;

},{"../canvas.js":4,"../utils.js":28,"./renderer.js":21}],23:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var animator = require('../animator.js');
var utils = require('../utils.js');
var renderer = require('./renderer.js');
var _config = require('../config.js');
var config = _config.config;

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
    }
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

},{"../animator.js":3,"../config.js":6,"../utils.js":28,"./renderer.js":21}],24:[function(require,module,exports){
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
        if (that._old_scroll_top !== undefined && that._old_scroll_left !== undefined) {
            var scroll = {
                x: that.scroll_left - that._old_scroll_left,
                y: that.scroll_top - that._old_scroll_top,
            };
            that._try_redraw(scroll);
        } else {
            that._try_redraw();
        }
        that._old_scroll_left = that.scroll_left;
        that._old_scroll_top = that.scroll_top;
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

},{"./canvas.js":4,"./utils.js":28}],25:[function(require,module,exports){
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
},{"./styles/init.js":26,"./utils.js":28}],26:[function(require,module,exports){
exports.styles = {
    "peacock": require("./peacock.js"),
};

},{"./peacock.js":27}],27:[function(require,module,exports){
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
};


},{}],28:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzb3VyY2UvanMvcG9zdGVyLmpzIiwic291cmNlL2NvbXBvbmVudHMvcHJpc20uanMiLCJzb3VyY2UvanMvYW5pbWF0b3IuanMiLCJzb3VyY2UvanMvY2FudmFzLmpzIiwic291cmNlL2pzL2NsaXBib2FyZC5qcyIsInNvdXJjZS9qcy9jb25maWcuanMiLCJzb3VyY2UvanMvY3Vyc29yLmpzIiwic291cmNlL2pzL2N1cnNvcnMuanMiLCJzb3VyY2UvanMvZG9jdW1lbnRfY29udHJvbGxlci5qcyIsInNvdXJjZS9qcy9kb2N1bWVudF9tb2RlbC5qcyIsInNvdXJjZS9qcy9kb2N1bWVudF92aWV3LmpzIiwic291cmNlL2pzL2V2ZW50cy9kZWZhdWx0LmpzIiwic291cmNlL2pzL2V2ZW50cy9tYXAuanMiLCJzb3VyY2UvanMvZXZlbnRzL25vcm1hbGl6ZXIuanMiLCJzb3VyY2UvanMvaGlnaGxpZ2h0ZXJzL2hpZ2hsaWdodGVyLmpzIiwic291cmNlL2pzL2hpZ2hsaWdodGVycy9wcmlzbS5qcyIsInNvdXJjZS9qcy9yZW5kZXJlcnMvYmF0Y2guanMiLCJzb3VyY2UvanMvcmVuZGVyZXJzL2NvbG9yLmpzIiwic291cmNlL2pzL3JlbmRlcmVycy9jdXJzb3JzLmpzIiwic291cmNlL2pzL3JlbmRlcmVycy9oaWdobGlnaHRlZF9yb3cuanMiLCJzb3VyY2UvanMvcmVuZGVyZXJzL3JlbmRlcmVyLmpzIiwic291cmNlL2pzL3JlbmRlcmVycy9yb3cuanMiLCJzb3VyY2UvanMvcmVuZGVyZXJzL3NlbGVjdGlvbnMuanMiLCJzb3VyY2UvanMvc2Nyb2xsaW5nX2NhbnZhcy5qcyIsInNvdXJjZS9qcy9zdHlsZS5qcyIsInNvdXJjZS9qcy9zdHlsZXMvaW5pdC5qcyIsInNvdXJjZS9qcy9zdHlsZXMvcGVhY29jay5qcyIsInNvdXJjZS9qcy91dGlscy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcGtEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdmVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNlQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6WUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciBzY3JvbGxpbmdfY2FudmFzID0gcmVxdWlyZSgnLi9zY3JvbGxpbmdfY2FudmFzLmpzJyk7XG52YXIgZG9jdW1lbnRfY29udHJvbGxlciA9IHJlcXVpcmUoJy4vZG9jdW1lbnRfY29udHJvbGxlci5qcycpO1xudmFyIGRvY3VtZW50X21vZGVsID0gcmVxdWlyZSgnLi9kb2N1bWVudF9tb2RlbC5qcycpO1xudmFyIGRvY3VtZW50X3ZpZXcgPSByZXF1aXJlKCcuL2RvY3VtZW50X3ZpZXcuanMnKTtcbnZhciBzdHlsZSA9IHJlcXVpcmUoJy4vc3R5bGUuanMnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcbnZhciBfY29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcuanMnKTtcbnZhciBjb25maWcgPSBfY29uZmlnLmNvbmZpZztcblxuLyoqXG4gKiBDYW52YXMgYmFzZWQgdGV4dCBlZGl0b3JcbiAqL1xudmFyIFBvc3RlciA9IGZ1bmN0aW9uKCkge1xuICAgIHV0aWxzLlBvc3RlckNsYXNzLmNhbGwodGhpcyk7XG5cbiAgICAvLyBDcmVhdGUgY2FudmFzXG4gICAgdGhpcy5jYW52YXMgPSBuZXcgc2Nyb2xsaW5nX2NhbnZhcy5TY3JvbGxpbmdDYW52YXMoKTtcbiAgICB0aGlzLmVsID0gdGhpcy5jYW52YXMuZWw7IC8vIENvbnZlbmllbmNlXG4gICAgdGhpcy5fc3R5bGUgPSBuZXcgc3R5bGUuU3R5bGUoKTtcblxuICAgIC8vIENyZWF0ZSBtb2RlbCwgY29udHJvbGxlciwgYW5kIHZpZXcuXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMubW9kZWwgPSBuZXcgZG9jdW1lbnRfbW9kZWwuRG9jdW1lbnRNb2RlbCgpO1xuICAgIHRoaXMuY29udHJvbGxlciA9IG5ldyBkb2N1bWVudF9jb250cm9sbGVyLkRvY3VtZW50Q29udHJvbGxlcih0aGlzLmNhbnZhcy5lbCwgdGhpcy5tb2RlbCk7XG4gICAgdGhpcy52aWV3ID0gbmV3IGRvY3VtZW50X3ZpZXcuRG9jdW1lbnRWaWV3KFxuICAgICAgICB0aGlzLmNhbnZhcywgXG4gICAgICAgIHRoaXMubW9kZWwsIFxuICAgICAgICB0aGlzLmNvbnRyb2xsZXIuY3Vyc29ycywgXG4gICAgICAgIHRoaXMuX3N0eWxlLFxuICAgICAgICBmdW5jdGlvbigpIHsgcmV0dXJuIHRoYXQuY29udHJvbGxlci5jbGlwYm9hcmQuaGlkZGVuX2lucHV0ID09PSBkb2N1bWVudC5hY3RpdmVFbGVtZW50IHx8IHRoYXQuY2FudmFzLmZvY3VzZWQ7IH1cbiAgICApO1xuXG4gICAgLy8gQ3JlYXRlIHByb3BlcnRpZXNcbiAgICB0aGlzLnByb3BlcnR5KCdzdHlsZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fc3R5bGU7XG4gICAgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgnY29uZmlnJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBjb25maWc7XG4gICAgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgndmFsdWUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQubW9kZWwudGV4dDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Lm1vZGVsLnRleHQgPSB2YWx1ZTtcbiAgICB9KTtcbiAgICB0aGlzLnByb3BlcnR5KCd3aWR0aCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC52aWV3LndpZHRoO1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQudmlldy53aWR0aCA9IHZhbHVlO1xuICAgIH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ2hlaWdodCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC52aWV3LmhlaWdodDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0LnZpZXcuaGVpZ2h0ID0gdmFsdWU7XG4gICAgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgnbGFuZ3VhZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQudmlldy5sYW5ndWFnZTtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0LnZpZXcubGFuZ3VhZ2UgPSB2YWx1ZTtcbiAgICB9KTtcbn07XG51dGlscy5pbmhlcml0KFBvc3RlciwgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLlBvc3RlciA9IFBvc3RlcjtcbiIsInNlbGYgPSAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpXG5cdD8gd2luZG93ICAgLy8gaWYgaW4gYnJvd3NlclxuXHQ6IChcblx0XHQodHlwZW9mIFdvcmtlckdsb2JhbFNjb3BlICE9PSAndW5kZWZpbmVkJyAmJiBzZWxmIGluc3RhbmNlb2YgV29ya2VyR2xvYmFsU2NvcGUpXG5cdFx0PyBzZWxmIC8vIGlmIGluIHdvcmtlclxuXHRcdDoge30gICAvLyBpZiBpbiBub2RlIGpzXG5cdCk7XG5cbi8qKlxuICogUHJpc206IExpZ2h0d2VpZ2h0LCByb2J1c3QsIGVsZWdhbnQgc3ludGF4IGhpZ2hsaWdodGluZ1xuICogTUlUIGxpY2Vuc2UgaHR0cDovL3d3dy5vcGVuc291cmNlLm9yZy9saWNlbnNlcy9taXQtbGljZW5zZS5waHAvXG4gKiBAYXV0aG9yIExlYSBWZXJvdSBodHRwOi8vbGVhLnZlcm91Lm1lXG4gKi9cblxudmFyIFByaXNtID0gKGZ1bmN0aW9uKCl7XG5cbi8vIFByaXZhdGUgaGVscGVyIHZhcnNcbnZhciBsYW5nID0gL1xcYmxhbmcoPzp1YWdlKT8tKD8hXFwqKShcXHcrKVxcYi9pO1xuXG52YXIgXyA9IHNlbGYuUHJpc20gPSB7XG5cdHV0aWw6IHtcblx0XHRlbmNvZGU6IGZ1bmN0aW9uICh0b2tlbnMpIHtcblx0XHRcdGlmICh0b2tlbnMgaW5zdGFuY2VvZiBUb2tlbikge1xuXHRcdFx0XHRyZXR1cm4gbmV3IFRva2VuKHRva2Vucy50eXBlLCBfLnV0aWwuZW5jb2RlKHRva2Vucy5jb250ZW50KSwgdG9rZW5zLmFsaWFzKTtcblx0XHRcdH0gZWxzZSBpZiAoXy51dGlsLnR5cGUodG9rZW5zKSA9PT0gJ0FycmF5Jykge1xuXHRcdFx0XHRyZXR1cm4gdG9rZW5zLm1hcChfLnV0aWwuZW5jb2RlKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybiB0b2tlbnMucmVwbGFjZSgvJi9nLCAnJmFtcDsnKS5yZXBsYWNlKC88L2csICcmbHQ7JykucmVwbGFjZSgvXFx1MDBhMC9nLCAnICcpO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHR0eXBlOiBmdW5jdGlvbiAobykge1xuXHRcdFx0cmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKS5tYXRjaCgvXFxbb2JqZWN0IChcXHcrKVxcXS8pWzFdO1xuXHRcdH0sXG5cblx0XHQvLyBEZWVwIGNsb25lIGEgbGFuZ3VhZ2UgZGVmaW5pdGlvbiAoZS5nLiB0byBleHRlbmQgaXQpXG5cdFx0Y2xvbmU6IGZ1bmN0aW9uIChvKSB7XG5cdFx0XHR2YXIgdHlwZSA9IF8udXRpbC50eXBlKG8pO1xuXG5cdFx0XHRzd2l0Y2ggKHR5cGUpIHtcblx0XHRcdFx0Y2FzZSAnT2JqZWN0Jzpcblx0XHRcdFx0XHR2YXIgY2xvbmUgPSB7fTtcblxuXHRcdFx0XHRcdGZvciAodmFyIGtleSBpbiBvKSB7XG5cdFx0XHRcdFx0XHRpZiAoby5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG5cdFx0XHRcdFx0XHRcdGNsb25lW2tleV0gPSBfLnV0aWwuY2xvbmUob1trZXldKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRyZXR1cm4gY2xvbmU7XG5cblx0XHRcdFx0Y2FzZSAnQXJyYXknOlxuXHRcdFx0XHRcdHJldHVybiBvLnNsaWNlKCk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBvO1xuXHRcdH1cblx0fSxcblxuXHRsYW5ndWFnZXM6IHtcblx0XHRleHRlbmQ6IGZ1bmN0aW9uIChpZCwgcmVkZWYpIHtcblx0XHRcdHZhciBsYW5nID0gXy51dGlsLmNsb25lKF8ubGFuZ3VhZ2VzW2lkXSk7XG5cblx0XHRcdGZvciAodmFyIGtleSBpbiByZWRlZikge1xuXHRcdFx0XHRsYW5nW2tleV0gPSByZWRlZltrZXldO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gbGFuZztcblx0XHR9LFxuXG5cdFx0LyoqXG5cdFx0ICogSW5zZXJ0IGEgdG9rZW4gYmVmb3JlIGFub3RoZXIgdG9rZW4gaW4gYSBsYW5ndWFnZSBsaXRlcmFsXG5cdFx0ICogQXMgdGhpcyBuZWVkcyB0byByZWNyZWF0ZSB0aGUgb2JqZWN0ICh3ZSBjYW5ub3QgYWN0dWFsbHkgaW5zZXJ0IGJlZm9yZSBrZXlzIGluIG9iamVjdCBsaXRlcmFscyksXG5cdFx0ICogd2UgY2Fubm90IGp1c3QgcHJvdmlkZSBhbiBvYmplY3QsIHdlIG5lZWQgYW5vYmplY3QgYW5kIGEga2V5LlxuXHRcdCAqIEBwYXJhbSBpbnNpZGUgVGhlIGtleSAob3IgbGFuZ3VhZ2UgaWQpIG9mIHRoZSBwYXJlbnRcblx0XHQgKiBAcGFyYW0gYmVmb3JlIFRoZSBrZXkgdG8gaW5zZXJ0IGJlZm9yZS4gSWYgbm90IHByb3ZpZGVkLCB0aGUgZnVuY3Rpb24gYXBwZW5kcyBpbnN0ZWFkLlxuXHRcdCAqIEBwYXJhbSBpbnNlcnQgT2JqZWN0IHdpdGggdGhlIGtleS92YWx1ZSBwYWlycyB0byBpbnNlcnRcblx0XHQgKiBAcGFyYW0gcm9vdCBUaGUgb2JqZWN0IHRoYXQgY29udGFpbnMgYGluc2lkZWAuIElmIGVxdWFsIHRvIFByaXNtLmxhbmd1YWdlcywgaXQgY2FuIGJlIG9taXR0ZWQuXG5cdFx0ICovXG5cdFx0aW5zZXJ0QmVmb3JlOiBmdW5jdGlvbiAoaW5zaWRlLCBiZWZvcmUsIGluc2VydCwgcm9vdCkge1xuXHRcdFx0cm9vdCA9IHJvb3QgfHwgXy5sYW5ndWFnZXM7XG5cdFx0XHR2YXIgZ3JhbW1hciA9IHJvb3RbaW5zaWRlXTtcblx0XHRcdFxuXHRcdFx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPT0gMikge1xuXHRcdFx0XHRpbnNlcnQgPSBhcmd1bWVudHNbMV07XG5cdFx0XHRcdFxuXHRcdFx0XHRmb3IgKHZhciBuZXdUb2tlbiBpbiBpbnNlcnQpIHtcblx0XHRcdFx0XHRpZiAoaW5zZXJ0Lmhhc093blByb3BlcnR5KG5ld1Rva2VuKSkge1xuXHRcdFx0XHRcdFx0Z3JhbW1hcltuZXdUb2tlbl0gPSBpbnNlcnRbbmV3VG9rZW5dO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0cmV0dXJuIGdyYW1tYXI7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHZhciByZXQgPSB7fTtcblxuXHRcdFx0Zm9yICh2YXIgdG9rZW4gaW4gZ3JhbW1hcikge1xuXG5cdFx0XHRcdGlmIChncmFtbWFyLmhhc093blByb3BlcnR5KHRva2VuKSkge1xuXG5cdFx0XHRcdFx0aWYgKHRva2VuID09IGJlZm9yZSkge1xuXG5cdFx0XHRcdFx0XHRmb3IgKHZhciBuZXdUb2tlbiBpbiBpbnNlcnQpIHtcblxuXHRcdFx0XHRcdFx0XHRpZiAoaW5zZXJ0Lmhhc093blByb3BlcnR5KG5ld1Rva2VuKSkge1xuXHRcdFx0XHRcdFx0XHRcdHJldFtuZXdUb2tlbl0gPSBpbnNlcnRbbmV3VG9rZW5dO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0cmV0W3Rva2VuXSA9IGdyYW1tYXJbdG9rZW5dO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdC8vIFVwZGF0ZSByZWZlcmVuY2VzIGluIG90aGVyIGxhbmd1YWdlIGRlZmluaXRpb25zXG5cdFx0XHRfLmxhbmd1YWdlcy5ERlMoXy5sYW5ndWFnZXMsIGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcblx0XHRcdFx0aWYgKHZhbHVlID09PSByb290W2luc2lkZV0gJiYga2V5ICE9IGluc2lkZSkge1xuXHRcdFx0XHRcdHRoaXNba2V5XSA9IHJldDtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHRcdHJldHVybiByb290W2luc2lkZV0gPSByZXQ7XG5cdFx0fSxcblxuXHRcdC8vIFRyYXZlcnNlIGEgbGFuZ3VhZ2UgZGVmaW5pdGlvbiB3aXRoIERlcHRoIEZpcnN0IFNlYXJjaFxuXHRcdERGUzogZnVuY3Rpb24obywgY2FsbGJhY2ssIHR5cGUpIHtcblx0XHRcdGZvciAodmFyIGkgaW4gbykge1xuXHRcdFx0XHRpZiAoby5oYXNPd25Qcm9wZXJ0eShpKSkge1xuXHRcdFx0XHRcdGNhbGxiYWNrLmNhbGwobywgaSwgb1tpXSwgdHlwZSB8fCBpKTtcblxuXHRcdFx0XHRcdGlmIChfLnV0aWwudHlwZShvW2ldKSA9PT0gJ09iamVjdCcpIHtcblx0XHRcdFx0XHRcdF8ubGFuZ3VhZ2VzLkRGUyhvW2ldLCBjYWxsYmFjayk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2UgaWYgKF8udXRpbC50eXBlKG9baV0pID09PSAnQXJyYXknKSB7XG5cdFx0XHRcdFx0XHRfLmxhbmd1YWdlcy5ERlMob1tpXSwgY2FsbGJhY2ssIGkpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fSxcblxuXHRoaWdobGlnaHRBbGw6IGZ1bmN0aW9uKGFzeW5jLCBjYWxsYmFjaykge1xuXHRcdHZhciBlbGVtZW50cyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ2NvZGVbY2xhc3MqPVwibGFuZ3VhZ2UtXCJdLCBbY2xhc3MqPVwibGFuZ3VhZ2UtXCJdIGNvZGUsIGNvZGVbY2xhc3MqPVwibGFuZy1cIl0sIFtjbGFzcyo9XCJsYW5nLVwiXSBjb2RlJyk7XG5cblx0XHRmb3IgKHZhciBpPTAsIGVsZW1lbnQ7IGVsZW1lbnQgPSBlbGVtZW50c1tpKytdOykge1xuXHRcdFx0Xy5oaWdobGlnaHRFbGVtZW50KGVsZW1lbnQsIGFzeW5jID09PSB0cnVlLCBjYWxsYmFjayk7XG5cdFx0fVxuXHR9LFxuXG5cdGhpZ2hsaWdodEVsZW1lbnQ6IGZ1bmN0aW9uKGVsZW1lbnQsIGFzeW5jLCBjYWxsYmFjaykge1xuXHRcdC8vIEZpbmQgbGFuZ3VhZ2Vcblx0XHR2YXIgbGFuZ3VhZ2UsIGdyYW1tYXIsIHBhcmVudCA9IGVsZW1lbnQ7XG5cblx0XHR3aGlsZSAocGFyZW50ICYmICFsYW5nLnRlc3QocGFyZW50LmNsYXNzTmFtZSkpIHtcblx0XHRcdHBhcmVudCA9IHBhcmVudC5wYXJlbnROb2RlO1xuXHRcdH1cblxuXHRcdGlmIChwYXJlbnQpIHtcblx0XHRcdGxhbmd1YWdlID0gKHBhcmVudC5jbGFzc05hbWUubWF0Y2gobGFuZykgfHwgWywnJ10pWzFdO1xuXHRcdFx0Z3JhbW1hciA9IF8ubGFuZ3VhZ2VzW2xhbmd1YWdlXTtcblx0XHR9XG5cblx0XHRpZiAoIWdyYW1tYXIpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHQvLyBTZXQgbGFuZ3VhZ2Ugb24gdGhlIGVsZW1lbnQsIGlmIG5vdCBwcmVzZW50XG5cdFx0ZWxlbWVudC5jbGFzc05hbWUgPSBlbGVtZW50LmNsYXNzTmFtZS5yZXBsYWNlKGxhbmcsICcnKS5yZXBsYWNlKC9cXHMrL2csICcgJykgKyAnIGxhbmd1YWdlLScgKyBsYW5ndWFnZTtcblxuXHRcdC8vIFNldCBsYW5ndWFnZSBvbiB0aGUgcGFyZW50LCBmb3Igc3R5bGluZ1xuXHRcdHBhcmVudCA9IGVsZW1lbnQucGFyZW50Tm9kZTtcblxuXHRcdGlmICgvcHJlL2kudGVzdChwYXJlbnQubm9kZU5hbWUpKSB7XG5cdFx0XHRwYXJlbnQuY2xhc3NOYW1lID0gcGFyZW50LmNsYXNzTmFtZS5yZXBsYWNlKGxhbmcsICcnKS5yZXBsYWNlKC9cXHMrL2csICcgJykgKyAnIGxhbmd1YWdlLScgKyBsYW5ndWFnZTtcblx0XHR9XG5cblx0XHR2YXIgY29kZSA9IGVsZW1lbnQudGV4dENvbnRlbnQ7XG5cblx0XHRpZighY29kZSkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHZhciBlbnYgPSB7XG5cdFx0XHRlbGVtZW50OiBlbGVtZW50LFxuXHRcdFx0bGFuZ3VhZ2U6IGxhbmd1YWdlLFxuXHRcdFx0Z3JhbW1hcjogZ3JhbW1hcixcblx0XHRcdGNvZGU6IGNvZGVcblx0XHR9O1xuXG5cdFx0Xy5ob29rcy5ydW4oJ2JlZm9yZS1oaWdobGlnaHQnLCBlbnYpO1xuXG5cdFx0aWYgKGFzeW5jICYmIHNlbGYuV29ya2VyKSB7XG5cdFx0XHR2YXIgd29ya2VyID0gbmV3IFdvcmtlcihfLmZpbGVuYW1lKTtcblxuXHRcdFx0d29ya2VyLm9ubWVzc2FnZSA9IGZ1bmN0aW9uKGV2dCkge1xuXHRcdFx0XHRlbnYuaGlnaGxpZ2h0ZWRDb2RlID0gVG9rZW4uc3RyaW5naWZ5KEpTT04ucGFyc2UoZXZ0LmRhdGEpLCBsYW5ndWFnZSk7XG5cblx0XHRcdFx0Xy5ob29rcy5ydW4oJ2JlZm9yZS1pbnNlcnQnLCBlbnYpO1xuXG5cdFx0XHRcdGVudi5lbGVtZW50LmlubmVySFRNTCA9IGVudi5oaWdobGlnaHRlZENvZGU7XG5cblx0XHRcdFx0Y2FsbGJhY2sgJiYgY2FsbGJhY2suY2FsbChlbnYuZWxlbWVudCk7XG5cdFx0XHRcdF8uaG9va3MucnVuKCdhZnRlci1oaWdobGlnaHQnLCBlbnYpO1xuXHRcdFx0fTtcblxuXHRcdFx0d29ya2VyLnBvc3RNZXNzYWdlKEpTT04uc3RyaW5naWZ5KHtcblx0XHRcdFx0bGFuZ3VhZ2U6IGVudi5sYW5ndWFnZSxcblx0XHRcdFx0Y29kZTogZW52LmNvZGVcblx0XHRcdH0pKTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHRlbnYuaGlnaGxpZ2h0ZWRDb2RlID0gXy5oaWdobGlnaHQoZW52LmNvZGUsIGVudi5ncmFtbWFyLCBlbnYubGFuZ3VhZ2UpXG5cblx0XHRcdF8uaG9va3MucnVuKCdiZWZvcmUtaW5zZXJ0JywgZW52KTtcblxuXHRcdFx0ZW52LmVsZW1lbnQuaW5uZXJIVE1MID0gZW52LmhpZ2hsaWdodGVkQ29kZTtcblxuXHRcdFx0Y2FsbGJhY2sgJiYgY2FsbGJhY2suY2FsbChlbGVtZW50KTtcblxuXHRcdFx0Xy5ob29rcy5ydW4oJ2FmdGVyLWhpZ2hsaWdodCcsIGVudik7XG5cdFx0fVxuXHR9LFxuXG5cdGhpZ2hsaWdodDogZnVuY3Rpb24gKHRleHQsIGdyYW1tYXIsIGxhbmd1YWdlKSB7XG5cdFx0dmFyIHRva2VucyA9IF8udG9rZW5pemUodGV4dCwgZ3JhbW1hcik7XG5cdFx0cmV0dXJuIFRva2VuLnN0cmluZ2lmeShfLnV0aWwuZW5jb2RlKHRva2VucyksIGxhbmd1YWdlKTtcblx0fSxcblxuXHR0b2tlbml6ZTogZnVuY3Rpb24odGV4dCwgZ3JhbW1hciwgbGFuZ3VhZ2UpIHtcblx0XHR2YXIgVG9rZW4gPSBfLlRva2VuO1xuXG5cdFx0dmFyIHN0cmFyciA9IFt0ZXh0XTtcblxuXHRcdHZhciByZXN0ID0gZ3JhbW1hci5yZXN0O1xuXG5cdFx0aWYgKHJlc3QpIHtcblx0XHRcdGZvciAodmFyIHRva2VuIGluIHJlc3QpIHtcblx0XHRcdFx0Z3JhbW1hclt0b2tlbl0gPSByZXN0W3Rva2VuXTtcblx0XHRcdH1cblxuXHRcdFx0ZGVsZXRlIGdyYW1tYXIucmVzdDtcblx0XHR9XG5cblx0XHR0b2tlbmxvb3A6IGZvciAodmFyIHRva2VuIGluIGdyYW1tYXIpIHtcblx0XHRcdGlmKCFncmFtbWFyLmhhc093blByb3BlcnR5KHRva2VuKSB8fCAhZ3JhbW1hclt0b2tlbl0pIHtcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHR9XG5cblx0XHRcdHZhciBwYXR0ZXJucyA9IGdyYW1tYXJbdG9rZW5dO1xuXHRcdFx0cGF0dGVybnMgPSAoXy51dGlsLnR5cGUocGF0dGVybnMpID09PSBcIkFycmF5XCIpID8gcGF0dGVybnMgOiBbcGF0dGVybnNdO1xuXG5cdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IHBhdHRlcm5zLmxlbmd0aDsgKytqKSB7XG5cdFx0XHRcdHZhciBwYXR0ZXJuID0gcGF0dGVybnNbal0sXG5cdFx0XHRcdFx0aW5zaWRlID0gcGF0dGVybi5pbnNpZGUsXG5cdFx0XHRcdFx0bG9va2JlaGluZCA9ICEhcGF0dGVybi5sb29rYmVoaW5kLFxuXHRcdFx0XHRcdGxvb2tiZWhpbmRMZW5ndGggPSAwLFxuXHRcdFx0XHRcdGFsaWFzID0gcGF0dGVybi5hbGlhcztcblxuXHRcdFx0XHRwYXR0ZXJuID0gcGF0dGVybi5wYXR0ZXJuIHx8IHBhdHRlcm47XG5cblx0XHRcdFx0Zm9yICh2YXIgaT0wOyBpPHN0cmFyci5sZW5ndGg7IGkrKykgeyAvLyBEb27igJl0IGNhY2hlIGxlbmd0aCBhcyBpdCBjaGFuZ2VzIGR1cmluZyB0aGUgbG9vcFxuXG5cdFx0XHRcdFx0dmFyIHN0ciA9IHN0cmFycltpXTtcblxuXHRcdFx0XHRcdGlmIChzdHJhcnIubGVuZ3RoID4gdGV4dC5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdC8vIFNvbWV0aGluZyB3ZW50IHRlcnJpYmx5IHdyb25nLCBBQk9SVCwgQUJPUlQhXG5cdFx0XHRcdFx0XHRicmVhayB0b2tlbmxvb3A7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKHN0ciBpbnN0YW5jZW9mIFRva2VuKSB7XG5cdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRwYXR0ZXJuLmxhc3RJbmRleCA9IDA7XG5cblx0XHRcdFx0XHR2YXIgbWF0Y2ggPSBwYXR0ZXJuLmV4ZWMoc3RyKTtcblxuXHRcdFx0XHRcdGlmIChtYXRjaCkge1xuXHRcdFx0XHRcdFx0aWYobG9va2JlaGluZCkge1xuXHRcdFx0XHRcdFx0XHRsb29rYmVoaW5kTGVuZ3RoID0gbWF0Y2hbMV0ubGVuZ3RoO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHR2YXIgZnJvbSA9IG1hdGNoLmluZGV4IC0gMSArIGxvb2tiZWhpbmRMZW5ndGgsXG5cdFx0XHRcdFx0XHRcdG1hdGNoID0gbWF0Y2hbMF0uc2xpY2UobG9va2JlaGluZExlbmd0aCksXG5cdFx0XHRcdFx0XHRcdGxlbiA9IG1hdGNoLmxlbmd0aCxcblx0XHRcdFx0XHRcdFx0dG8gPSBmcm9tICsgbGVuLFxuXHRcdFx0XHRcdFx0XHRiZWZvcmUgPSBzdHIuc2xpY2UoMCwgZnJvbSArIDEpLFxuXHRcdFx0XHRcdFx0XHRhZnRlciA9IHN0ci5zbGljZSh0byArIDEpO1xuXG5cdFx0XHRcdFx0XHR2YXIgYXJncyA9IFtpLCAxXTtcblxuXHRcdFx0XHRcdFx0aWYgKGJlZm9yZSkge1xuXHRcdFx0XHRcdFx0XHRhcmdzLnB1c2goYmVmb3JlKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0dmFyIHdyYXBwZWQgPSBuZXcgVG9rZW4odG9rZW4sIGluc2lkZT8gXy50b2tlbml6ZShtYXRjaCwgaW5zaWRlKSA6IG1hdGNoLCBhbGlhcyk7XG5cblx0XHRcdFx0XHRcdGFyZ3MucHVzaCh3cmFwcGVkKTtcblxuXHRcdFx0XHRcdFx0aWYgKGFmdGVyKSB7XG5cdFx0XHRcdFx0XHRcdGFyZ3MucHVzaChhZnRlcik7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdEFycmF5LnByb3RvdHlwZS5zcGxpY2UuYXBwbHkoc3RyYXJyLCBhcmdzKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gc3RyYXJyO1xuXHR9LFxuXG5cdGhvb2tzOiB7XG5cdFx0YWxsOiB7fSxcblxuXHRcdGFkZDogZnVuY3Rpb24gKG5hbWUsIGNhbGxiYWNrKSB7XG5cdFx0XHR2YXIgaG9va3MgPSBfLmhvb2tzLmFsbDtcblxuXHRcdFx0aG9va3NbbmFtZV0gPSBob29rc1tuYW1lXSB8fCBbXTtcblxuXHRcdFx0aG9va3NbbmFtZV0ucHVzaChjYWxsYmFjayk7XG5cdFx0fSxcblxuXHRcdHJ1bjogZnVuY3Rpb24gKG5hbWUsIGVudikge1xuXHRcdFx0dmFyIGNhbGxiYWNrcyA9IF8uaG9va3MuYWxsW25hbWVdO1xuXG5cdFx0XHRpZiAoIWNhbGxiYWNrcyB8fCAhY2FsbGJhY2tzLmxlbmd0aCkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGZvciAodmFyIGk9MCwgY2FsbGJhY2s7IGNhbGxiYWNrID0gY2FsbGJhY2tzW2krK107KSB7XG5cdFx0XHRcdGNhbGxiYWNrKGVudik7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59O1xuXG52YXIgVG9rZW4gPSBfLlRva2VuID0gZnVuY3Rpb24odHlwZSwgY29udGVudCwgYWxpYXMpIHtcblx0dGhpcy50eXBlID0gdHlwZTtcblx0dGhpcy5jb250ZW50ID0gY29udGVudDtcblx0dGhpcy5hbGlhcyA9IGFsaWFzO1xufTtcblxuVG9rZW4uc3RyaW5naWZ5ID0gZnVuY3Rpb24obywgbGFuZ3VhZ2UsIHBhcmVudCkge1xuXHRpZiAodHlwZW9mIG8gPT0gJ3N0cmluZycpIHtcblx0XHRyZXR1cm4gbztcblx0fVxuXG5cdGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobykgPT0gJ1tvYmplY3QgQXJyYXldJykge1xuXHRcdHJldHVybiBvLm1hcChmdW5jdGlvbihlbGVtZW50KSB7XG5cdFx0XHRyZXR1cm4gVG9rZW4uc3RyaW5naWZ5KGVsZW1lbnQsIGxhbmd1YWdlLCBvKTtcblx0XHR9KS5qb2luKCcnKTtcblx0fVxuXG5cdHZhciBlbnYgPSB7XG5cdFx0dHlwZTogby50eXBlLFxuXHRcdGNvbnRlbnQ6IFRva2VuLnN0cmluZ2lmeShvLmNvbnRlbnQsIGxhbmd1YWdlLCBwYXJlbnQpLFxuXHRcdHRhZzogJ3NwYW4nLFxuXHRcdGNsYXNzZXM6IFsndG9rZW4nLCBvLnR5cGVdLFxuXHRcdGF0dHJpYnV0ZXM6IHt9LFxuXHRcdGxhbmd1YWdlOiBsYW5ndWFnZSxcblx0XHRwYXJlbnQ6IHBhcmVudFxuXHR9O1xuXG5cdGlmIChlbnYudHlwZSA9PSAnY29tbWVudCcpIHtcblx0XHRlbnYuYXR0cmlidXRlc1snc3BlbGxjaGVjayddID0gJ3RydWUnO1xuXHR9XG5cblx0aWYgKG8uYWxpYXMpIHtcblx0XHR2YXIgYWxpYXNlcyA9IF8udXRpbC50eXBlKG8uYWxpYXMpID09PSAnQXJyYXknID8gby5hbGlhcyA6IFtvLmFsaWFzXTtcblx0XHRBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShlbnYuY2xhc3NlcywgYWxpYXNlcyk7XG5cdH1cblxuXHRfLmhvb2tzLnJ1bignd3JhcCcsIGVudik7XG5cblx0dmFyIGF0dHJpYnV0ZXMgPSAnJztcblxuXHRmb3IgKHZhciBuYW1lIGluIGVudi5hdHRyaWJ1dGVzKSB7XG5cdFx0YXR0cmlidXRlcyArPSBuYW1lICsgJz1cIicgKyAoZW52LmF0dHJpYnV0ZXNbbmFtZV0gfHwgJycpICsgJ1wiJztcblx0fVxuXG5cdHJldHVybiAnPCcgKyBlbnYudGFnICsgJyBjbGFzcz1cIicgKyBlbnYuY2xhc3Nlcy5qb2luKCcgJykgKyAnXCIgJyArIGF0dHJpYnV0ZXMgKyAnPicgKyBlbnYuY29udGVudCArICc8LycgKyBlbnYudGFnICsgJz4nO1xuXG59O1xuXG5pZiAoIXNlbGYuZG9jdW1lbnQpIHtcblx0aWYgKCFzZWxmLmFkZEV2ZW50TGlzdGVuZXIpIHtcblx0XHQvLyBpbiBOb2RlLmpzXG5cdFx0cmV0dXJuIHNlbGYuUHJpc207XG5cdH1cbiBcdC8vIEluIHdvcmtlclxuXHRzZWxmLmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbihldnQpIHtcblx0XHR2YXIgbWVzc2FnZSA9IEpTT04ucGFyc2UoZXZ0LmRhdGEpLFxuXHRcdCAgICBsYW5nID0gbWVzc2FnZS5sYW5ndWFnZSxcblx0XHQgICAgY29kZSA9IG1lc3NhZ2UuY29kZTtcblxuXHRcdHNlbGYucG9zdE1lc3NhZ2UoSlNPTi5zdHJpbmdpZnkoXy51dGlsLmVuY29kZShfLnRva2VuaXplKGNvZGUsIF8ubGFuZ3VhZ2VzW2xhbmddKSkpKTtcblx0XHRzZWxmLmNsb3NlKCk7XG5cdH0sIGZhbHNlKTtcblxuXHRyZXR1cm4gc2VsZi5QcmlzbTtcbn1cblxuLy8gR2V0IGN1cnJlbnQgc2NyaXB0IGFuZCBoaWdobGlnaHRcbnZhciBzY3JpcHQgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnc2NyaXB0Jyk7XG5cbnNjcmlwdCA9IHNjcmlwdFtzY3JpcHQubGVuZ3RoIC0gMV07XG5cbmlmIChzY3JpcHQpIHtcblx0Xy5maWxlbmFtZSA9IHNjcmlwdC5zcmM7XG5cblx0aWYgKGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIgJiYgIXNjcmlwdC5oYXNBdHRyaWJ1dGUoJ2RhdGEtbWFudWFsJykpIHtcblx0XHRkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgXy5oaWdobGlnaHRBbGwpO1xuXHR9XG59XG5cbnJldHVybiBzZWxmLlByaXNtO1xuXG59KSgpO1xuXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcblx0bW9kdWxlLmV4cG9ydHMgPSBQcmlzbTtcbn1cblxuUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cCA9IHtcblx0J2NvbW1lbnQnOiAvPCEtLVtcXHdcXFddKj8tLT4vZyxcblx0J3Byb2xvZyc6IC88XFw/Lis/XFw/Pi8sXG5cdCdkb2N0eXBlJzogLzwhRE9DVFlQRS4rPz4vLFxuXHQnY2RhdGEnOiAvPCFcXFtDREFUQVxcW1tcXHdcXFddKj9dXT4vaSxcblx0J3RhZyc6IHtcblx0XHRwYXR0ZXJuOiAvPFxcLz9bXFx3Oi1dK1xccyooPzpcXHMrW1xcdzotXSsoPzo9KD86KFwifCcpKFxcXFw/W1xcd1xcV10pKj9cXDF8W15cXHMnXCI+PV0rKSk/XFxzKikqXFwvPz4vZ2ksXG5cdFx0aW5zaWRlOiB7XG5cdFx0XHQndGFnJzoge1xuXHRcdFx0XHRwYXR0ZXJuOiAvXjxcXC8/W1xcdzotXSsvaSxcblx0XHRcdFx0aW5zaWRlOiB7XG5cdFx0XHRcdFx0J3B1bmN0dWF0aW9uJzogL148XFwvPy8sXG5cdFx0XHRcdFx0J25hbWVzcGFjZSc6IC9eW1xcdy1dKz86L1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0J2F0dHItdmFsdWUnOiB7XG5cdFx0XHRcdHBhdHRlcm46IC89KD86KCd8XCIpW1xcd1xcV10qPyhcXDEpfFteXFxzPl0rKS9naSxcblx0XHRcdFx0aW5zaWRlOiB7XG5cdFx0XHRcdFx0J3B1bmN0dWF0aW9uJzogLz18PnxcIi9nXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHQncHVuY3R1YXRpb24nOiAvXFwvPz4vZyxcblx0XHRcdCdhdHRyLW5hbWUnOiB7XG5cdFx0XHRcdHBhdHRlcm46IC9bXFx3Oi1dKy9nLFxuXHRcdFx0XHRpbnNpZGU6IHtcblx0XHRcdFx0XHQnbmFtZXNwYWNlJzogL15bXFx3LV0rPzovXG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdH1cblx0fSxcblx0J2VudGl0eSc6IC9cXCYjP1tcXGRhLXpdezEsOH07L2dpXG59O1xuXG4vLyBQbHVnaW4gdG8gbWFrZSBlbnRpdHkgdGl0bGUgc2hvdyB0aGUgcmVhbCBlbnRpdHksIGlkZWEgYnkgUm9tYW4gS29tYXJvdlxuUHJpc20uaG9va3MuYWRkKCd3cmFwJywgZnVuY3Rpb24oZW52KSB7XG5cblx0aWYgKGVudi50eXBlID09PSAnZW50aXR5Jykge1xuXHRcdGVudi5hdHRyaWJ1dGVzWyd0aXRsZSddID0gZW52LmNvbnRlbnQucmVwbGFjZSgvJmFtcDsvLCAnJicpO1xuXHR9XG59KTtcblxuUHJpc20ubGFuZ3VhZ2VzLmNsaWtlID0ge1xuXHQnY29tbWVudCc6IFtcblx0XHR7XG5cdFx0XHRwYXR0ZXJuOiAvKF58W15cXFxcXSlcXC9cXCpbXFx3XFxXXSo/XFwqXFwvL2csXG5cdFx0XHRsb29rYmVoaW5kOiB0cnVlXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRwYXR0ZXJuOiAvKF58W15cXFxcOl0pXFwvXFwvLio/KFxccj9cXG58JCkvZyxcblx0XHRcdGxvb2tiZWhpbmQ6IHRydWVcblx0XHR9XG5cdF0sXG5cdCdzdHJpbmcnOiAvKFwifCcpKFxcXFw/LikqP1xcMS9nLFxuXHQnY2xhc3MtbmFtZSc6IHtcblx0XHRwYXR0ZXJuOiAvKCg/Oig/OmNsYXNzfGludGVyZmFjZXxleHRlbmRzfGltcGxlbWVudHN8dHJhaXR8aW5zdGFuY2VvZnxuZXcpXFxzKyl8KD86Y2F0Y2hcXHMrXFwoKSlbYS16MC05X1xcLlxcXFxdKy9pZyxcblx0XHRsb29rYmVoaW5kOiB0cnVlLFxuXHRcdGluc2lkZToge1xuXHRcdFx0cHVuY3R1YXRpb246IC8oXFwufFxcXFwpL1xuXHRcdH1cblx0fSxcblx0J2tleXdvcmQnOiAvXFxiKGlmfGVsc2V8d2hpbGV8ZG98Zm9yfHJldHVybnxpbnxpbnN0YW5jZW9mfGZ1bmN0aW9ufG5ld3x0cnl8dGhyb3d8Y2F0Y2h8ZmluYWxseXxudWxsfGJyZWFrfGNvbnRpbnVlKVxcYi9nLFxuXHQnYm9vbGVhbic6IC9cXGIodHJ1ZXxmYWxzZSlcXGIvZyxcblx0J2Z1bmN0aW9uJzoge1xuXHRcdHBhdHRlcm46IC9bYS16MC05X10rXFwoL2lnLFxuXHRcdGluc2lkZToge1xuXHRcdFx0cHVuY3R1YXRpb246IC9cXCgvXG5cdFx0fVxuXHR9LFxuXHQnbnVtYmVyJzogL1xcYi0/KDB4W1xcZEEtRmEtZl0rfFxcZCpcXC4/XFxkKyhbRWVdLT9cXGQrKT8pXFxiL2csXG5cdCdvcGVyYXRvcic6IC9bLStdezEsMn18IXw8PT98Pj0/fD17MSwzfXwmezEsMn18XFx8P1xcfHxcXD98XFwqfFxcL3xcXH58XFxefFxcJS9nLFxuXHQnaWdub3JlJzogLyYobHR8Z3R8YW1wKTsvZ2ksXG5cdCdwdW5jdHVhdGlvbic6IC9be31bXFxdOygpLC46XS9nXG59O1xuXG5QcmlzbS5sYW5ndWFnZXMuYXBhY2hlY29uZiA9IHtcblx0J2NvbW1lbnQnOiAvXFwjLiovZyxcblx0J2RpcmVjdGl2ZS1pbmxpbmUnOiB7XG5cdFx0cGF0dGVybjogL15cXHMqXFxiKEFjY2VwdEZpbHRlcnxBY2NlcHRQYXRoSW5mb3xBY2Nlc3NGaWxlTmFtZXxBY3Rpb258QWRkQWx0fEFkZEFsdEJ5RW5jb2Rpbmd8QWRkQWx0QnlUeXBlfEFkZENoYXJzZXR8QWRkRGVmYXVsdENoYXJzZXR8QWRkRGVzY3JpcHRpb258QWRkRW5jb2Rpbmd8QWRkSGFuZGxlcnxBZGRJY29ufEFkZEljb25CeUVuY29kaW5nfEFkZEljb25CeVR5cGV8QWRkSW5wdXRGaWx0ZXJ8QWRkTGFuZ3VhZ2V8QWRkTW9kdWxlSW5mb3xBZGRPdXRwdXRGaWx0ZXJ8QWRkT3V0cHV0RmlsdGVyQnlUeXBlfEFkZFR5cGV8QWxpYXN8QWxpYXNNYXRjaHxBbGxvd3xBbGxvd0NPTk5FQ1R8QWxsb3dFbmNvZGVkU2xhc2hlc3xBbGxvd01ldGhvZHN8QWxsb3dPdmVycmlkZXxBbGxvd092ZXJyaWRlTGlzdHxBbm9ueW1vdXN8QW5vbnltb3VzX0xvZ0VtYWlsfEFub255bW91c19NdXN0R2l2ZUVtYWlsfEFub255bW91c19Ob1VzZXJJRHxBbm9ueW1vdXNfVmVyaWZ5RW1haWx8QXN5bmNSZXF1ZXN0V29ya2VyRmFjdG9yfEF1dGhCYXNpY0F1dGhvcml0YXRpdmV8QXV0aEJhc2ljRmFrZXxBdXRoQmFzaWNQcm92aWRlcnxBdXRoQmFzaWNVc2VEaWdlc3RBbGdvcml0aG18QXV0aERCRFVzZXJQV1F1ZXJ5fEF1dGhEQkRVc2VyUmVhbG1RdWVyeXxBdXRoREJNR3JvdXBGaWxlfEF1dGhEQk1UeXBlfEF1dGhEQk1Vc2VyRmlsZXxBdXRoRGlnZXN0QWxnb3JpdGhtfEF1dGhEaWdlc3REb21haW58QXV0aERpZ2VzdE5vbmNlTGlmZXRpbWV8QXV0aERpZ2VzdFByb3ZpZGVyfEF1dGhEaWdlc3RRb3B8QXV0aERpZ2VzdFNobWVtU2l6ZXxBdXRoRm9ybUF1dGhvcml0YXRpdmV8QXV0aEZvcm1Cb2R5fEF1dGhGb3JtRGlzYWJsZU5vU3RvcmV8QXV0aEZvcm1GYWtlQmFzaWNBdXRofEF1dGhGb3JtTG9jYXRpb258QXV0aEZvcm1Mb2dpblJlcXVpcmVkTG9jYXRpb258QXV0aEZvcm1Mb2dpblN1Y2Nlc3NMb2NhdGlvbnxBdXRoRm9ybUxvZ291dExvY2F0aW9ufEF1dGhGb3JtTWV0aG9kfEF1dGhGb3JtTWltZXR5cGV8QXV0aEZvcm1QYXNzd29yZHxBdXRoRm9ybVByb3ZpZGVyfEF1dGhGb3JtU2l0ZVBhc3NwaHJhc2V8QXV0aEZvcm1TaXplfEF1dGhGb3JtVXNlcm5hbWV8QXV0aEdyb3VwRmlsZXxBdXRoTERBUEF1dGhvcml6ZVByZWZpeHxBdXRoTERBUEJpbmRBdXRob3JpdGF0aXZlfEF1dGhMREFQQmluZEROfEF1dGhMREFQQmluZFBhc3N3b3JkfEF1dGhMREFQQ2hhcnNldENvbmZpZ3xBdXRoTERBUENvbXBhcmVBc1VzZXJ8QXV0aExEQVBDb21wYXJlRE5PblNlcnZlcnxBdXRoTERBUERlcmVmZXJlbmNlQWxpYXNlc3xBdXRoTERBUEdyb3VwQXR0cmlidXRlfEF1dGhMREFQR3JvdXBBdHRyaWJ1dGVJc0ROfEF1dGhMREFQSW5pdGlhbEJpbmRBc1VzZXJ8QXV0aExEQVBJbml0aWFsQmluZFBhdHRlcm58QXV0aExEQVBNYXhTdWJHcm91cERlcHRofEF1dGhMREFQUmVtb3RlVXNlckF0dHJpYnV0ZXxBdXRoTERBUFJlbW90ZVVzZXJJc0ROfEF1dGhMREFQU2VhcmNoQXNVc2VyfEF1dGhMREFQU3ViR3JvdXBBdHRyaWJ1dGV8QXV0aExEQVBTdWJHcm91cENsYXNzfEF1dGhMREFQVXJsfEF1dGhNZXJnaW5nfEF1dGhOYW1lfEF1dGhuQ2FjaGVDb250ZXh0fEF1dGhuQ2FjaGVFbmFibGV8QXV0aG5DYWNoZVByb3ZpZGVGb3J8QXV0aG5DYWNoZVNPQ2FjaGV8QXV0aG5DYWNoZVRpbWVvdXR8QXV0aG56RmNnaUNoZWNrQXV0aG5Qcm92aWRlcnxBdXRobnpGY2dpRGVmaW5lUHJvdmlkZXJ8QXV0aFR5cGV8QXV0aFVzZXJGaWxlfEF1dGh6REJETG9naW5Ub1JlZmVyZXJ8QXV0aHpEQkRRdWVyeXxBdXRoekRCRFJlZGlyZWN0UXVlcnl8QXV0aHpEQk1UeXBlfEF1dGh6U2VuZEZvcmJpZGRlbk9uRmFpbHVyZXxCYWxhbmNlckdyb3d0aHxCYWxhbmNlckluaGVyaXR8QmFsYW5jZXJNZW1iZXJ8QmFsYW5jZXJQZXJzaXN0fEJyb3dzZXJNYXRjaHxCcm93c2VyTWF0Y2hOb0Nhc2V8QnVmZmVyZWRMb2dzfEJ1ZmZlclNpemV8Q2FjaGVEZWZhdWx0RXhwaXJlfENhY2hlRGV0YWlsSGVhZGVyfENhY2hlRGlyTGVuZ3RofENhY2hlRGlyTGV2ZWxzfENhY2hlRGlzYWJsZXxDYWNoZUVuYWJsZXxDYWNoZUZpbGV8Q2FjaGVIZWFkZXJ8Q2FjaGVJZ25vcmVDYWNoZUNvbnRyb2x8Q2FjaGVJZ25vcmVIZWFkZXJzfENhY2hlSWdub3JlTm9MYXN0TW9kfENhY2hlSWdub3JlUXVlcnlTdHJpbmd8Q2FjaGVJZ25vcmVVUkxTZXNzaW9uSWRlbnRpZmllcnN8Q2FjaGVLZXlCYXNlVVJMfENhY2hlTGFzdE1vZGlmaWVkRmFjdG9yfENhY2hlTG9ja3xDYWNoZUxvY2tNYXhBZ2V8Q2FjaGVMb2NrUGF0aHxDYWNoZU1heEV4cGlyZXxDYWNoZU1heEZpbGVTaXplfENhY2hlTWluRXhwaXJlfENhY2hlTWluRmlsZVNpemV8Q2FjaGVOZWdvdGlhdGVkRG9jc3xDYWNoZVF1aWNrSGFuZGxlcnxDYWNoZVJlYWRTaXplfENhY2hlUmVhZFRpbWV8Q2FjaGVSb290fENhY2hlU29jYWNoZXxDYWNoZVNvY2FjaGVNYXhTaXplfENhY2hlU29jYWNoZU1heFRpbWV8Q2FjaGVTb2NhY2hlTWluVGltZXxDYWNoZVNvY2FjaGVSZWFkU2l6ZXxDYWNoZVNvY2FjaGVSZWFkVGltZXxDYWNoZVN0YWxlT25FcnJvcnxDYWNoZVN0b3JlRXhwaXJlZHxDYWNoZVN0b3JlTm9TdG9yZXxDYWNoZVN0b3JlUHJpdmF0ZXxDR0lEU2NyaXB0VGltZW91dHxDR0lNYXBFeHRlbnNpb258Q2hhcnNldERlZmF1bHR8Q2hhcnNldE9wdGlvbnN8Q2hhcnNldFNvdXJjZUVuY3xDaGVja0Nhc2VPbmx5fENoZWNrU3BlbGxpbmd8Q2hyb290RGlyfENvbnRlbnREaWdlc3R8Q29va2llRG9tYWlufENvb2tpZUV4cGlyZXN8Q29va2llTmFtZXxDb29raWVTdHlsZXxDb29raWVUcmFja2luZ3xDb3JlRHVtcERpcmVjdG9yeXxDdXN0b21Mb2d8RGF2fERhdkRlcHRoSW5maW5pdHl8RGF2R2VuZXJpY0xvY2tEQnxEYXZMb2NrREJ8RGF2TWluVGltZW91dHxEQkRFeHB0aW1lfERCREluaXRTUUx8REJES2VlcHxEQkRNYXh8REJETWlufERCRFBhcmFtc3xEQkRQZXJzaXN0fERCRFByZXBhcmVTUUx8REJEcml2ZXJ8RGVmYXVsdEljb258RGVmYXVsdExhbmd1YWdlfERlZmF1bHRSdW50aW1lRGlyfERlZmF1bHRUeXBlfERlZmluZXxEZWZsYXRlQnVmZmVyU2l6ZXxEZWZsYXRlQ29tcHJlc3Npb25MZXZlbHxEZWZsYXRlRmlsdGVyTm90ZXxEZWZsYXRlSW5mbGF0ZUxpbWl0UmVxdWVzdEJvZHl8RGVmbGF0ZUluZmxhdGVSYXRpb0J1cnN0fERlZmxhdGVJbmZsYXRlUmF0aW9MaW1pdHxEZWZsYXRlTWVtTGV2ZWx8RGVmbGF0ZVdpbmRvd1NpemV8RGVueXxEaXJlY3RvcnlDaGVja0hhbmRsZXJ8RGlyZWN0b3J5SW5kZXh8RGlyZWN0b3J5SW5kZXhSZWRpcmVjdHxEaXJlY3RvcnlTbGFzaHxEb2N1bWVudFJvb3R8RFRyYWNlUHJpdmlsZWdlc3xEdW1wSU9JbnB1dHxEdW1wSU9PdXRwdXR8RW5hYmxlRXhjZXB0aW9uSG9va3xFbmFibGVNTUFQfEVuYWJsZVNlbmRmaWxlfEVycm9yfEVycm9yRG9jdW1lbnR8RXJyb3JMb2d8RXJyb3JMb2dGb3JtYXR8RXhhbXBsZXxFeHBpcmVzQWN0aXZlfEV4cGlyZXNCeVR5cGV8RXhwaXJlc0RlZmF1bHR8RXh0ZW5kZWRTdGF0dXN8RXh0RmlsdGVyRGVmaW5lfEV4dEZpbHRlck9wdGlvbnN8RmFsbGJhY2tSZXNvdXJjZXxGaWxlRVRhZ3xGaWx0ZXJDaGFpbnxGaWx0ZXJEZWNsYXJlfEZpbHRlclByb3RvY29sfEZpbHRlclByb3ZpZGVyfEZpbHRlclRyYWNlfEZvcmNlTGFuZ3VhZ2VQcmlvcml0eXxGb3JjZVR5cGV8Rm9yZW5zaWNMb2d8R3Byb2ZEaXJ8R3JhY2VmdWxTaHV0ZG93blRpbWVvdXR8R3JvdXB8SGVhZGVyfEhlYWRlck5hbWV8SGVhcnRiZWF0QWRkcmVzc3xIZWFydGJlYXRMaXN0ZW58SGVhcnRiZWF0TWF4U2VydmVyc3xIZWFydGJlYXRTdG9yYWdlfEhlYXJ0YmVhdFN0b3JhZ2V8SG9zdG5hbWVMb29rdXBzfElkZW50aXR5Q2hlY2t8SWRlbnRpdHlDaGVja1RpbWVvdXR8SW1hcEJhc2V8SW1hcERlZmF1bHR8SW1hcE1lbnV8SW5jbHVkZXxJbmNsdWRlT3B0aW9uYWx8SW5kZXhIZWFkSW5zZXJ0fEluZGV4SWdub3JlfEluZGV4SWdub3JlUmVzZXR8SW5kZXhPcHRpb25zfEluZGV4T3JkZXJEZWZhdWx0fEluZGV4U3R5bGVTaGVldHxJbnB1dFNlZHxJU0FQSUFwcGVuZExvZ1RvRXJyb3JzfElTQVBJQXBwZW5kTG9nVG9RdWVyeXxJU0FQSUNhY2hlRmlsZXxJU0FQSUZha2VBc3luY3xJU0FQSUxvZ05vdFN1cHBvcnRlZHxJU0FQSVJlYWRBaGVhZEJ1ZmZlcnxLZWVwQWxpdmV8S2VlcEFsaXZlVGltZW91dHxLZXB0Qm9keVNpemV8TGFuZ3VhZ2VQcmlvcml0eXxMREFQQ2FjaGVFbnRyaWVzfExEQVBDYWNoZVRUTHxMREFQQ29ubmVjdGlvblBvb2xUVEx8TERBUENvbm5lY3Rpb25UaW1lb3V0fExEQVBMaWJyYXJ5RGVidWd8TERBUE9wQ2FjaGVFbnRyaWVzfExEQVBPcENhY2hlVFRMfExEQVBSZWZlcnJhbEhvcExpbWl0fExEQVBSZWZlcnJhbHN8TERBUFJldHJpZXN8TERBUFJldHJ5RGVsYXl8TERBUFNoYXJlZENhY2hlRmlsZXxMREFQU2hhcmVkQ2FjaGVTaXplfExEQVBUaW1lb3V0fExEQVBUcnVzdGVkQ2xpZW50Q2VydHxMREFQVHJ1c3RlZEdsb2JhbENlcnR8TERBUFRydXN0ZWRNb2RlfExEQVBWZXJpZnlTZXJ2ZXJDZXJ0fExpbWl0SW50ZXJuYWxSZWN1cnNpb258TGltaXRSZXF1ZXN0Qm9keXxMaW1pdFJlcXVlc3RGaWVsZHN8TGltaXRSZXF1ZXN0RmllbGRTaXplfExpbWl0UmVxdWVzdExpbmV8TGltaXRYTUxSZXF1ZXN0Qm9keXxMaXN0ZW58TGlzdGVuQmFja0xvZ3xMb2FkRmlsZXxMb2FkTW9kdWxlfExvZ0Zvcm1hdHxMb2dMZXZlbHxMb2dNZXNzYWdlfEx1YUF1dGh6UHJvdmlkZXJ8THVhQ29kZUNhY2hlfEx1YUhvb2tBY2Nlc3NDaGVja2VyfEx1YUhvb2tBdXRoQ2hlY2tlcnxMdWFIb29rQ2hlY2tVc2VySUR8THVhSG9va0ZpeHVwc3xMdWFIb29rSW5zZXJ0RmlsdGVyfEx1YUhvb2tMb2d8THVhSG9va01hcFRvU3RvcmFnZXxMdWFIb29rVHJhbnNsYXRlTmFtZXxMdWFIb29rVHlwZUNoZWNrZXJ8THVhSW5oZXJpdHxMdWFJbnB1dEZpbHRlcnxMdWFNYXBIYW5kbGVyfEx1YU91dHB1dEZpbHRlcnxMdWFQYWNrYWdlQ1BhdGh8THVhUGFja2FnZVBhdGh8THVhUXVpY2tIYW5kbGVyfEx1YVJvb3R8THVhU2NvcGV8TWF4Q29ubmVjdGlvbnNQZXJDaGlsZHxNYXhLZWVwQWxpdmVSZXF1ZXN0c3xNYXhNZW1GcmVlfE1heFJhbmdlT3ZlcmxhcHN8TWF4UmFuZ2VSZXZlcnNhbHN8TWF4UmFuZ2VzfE1heFJlcXVlc3RXb3JrZXJzfE1heFNwYXJlU2VydmVyc3xNYXhTcGFyZVRocmVhZHN8TWF4VGhyZWFkc3xNZXJnZVRyYWlsZXJzfE1ldGFEaXJ8TWV0YUZpbGVzfE1ldGFTdWZmaXh8TWltZU1hZ2ljRmlsZXxNaW5TcGFyZVNlcnZlcnN8TWluU3BhcmVUaHJlYWRzfE1NYXBGaWxlfE1vZGVtU3RhbmRhcmR8TW9kTWltZVVzZVBhdGhJbmZvfE11bHRpdmlld3NNYXRjaHxNdXRleHxOYW1lVmlydHVhbEhvc3R8Tm9Qcm94eXxOV1NTTFRydXN0ZWRDZXJ0c3xOV1NTTFVwZ3JhZGVhYmxlfE9wdGlvbnN8T3JkZXJ8T3V0cHV0U2VkfFBhc3NFbnZ8UGlkRmlsZXxQcml2aWxlZ2VzTW9kZXxQcm90b2NvbHxQcm90b2NvbEVjaG98UHJveHlBZGRIZWFkZXJzfFByb3h5QmFkSGVhZGVyfFByb3h5QmxvY2t8UHJveHlEb21haW58UHJveHlFcnJvck92ZXJyaWRlfFByb3h5RXhwcmVzc0RCTUZpbGV8UHJveHlFeHByZXNzREJNVHlwZXxQcm94eUV4cHJlc3NFbmFibGV8UHJveHlGdHBEaXJDaGFyc2V0fFByb3h5RnRwRXNjYXBlV2lsZGNhcmRzfFByb3h5RnRwTGlzdE9uV2lsZGNhcmR8UHJveHlIVE1MQnVmU2l6ZXxQcm94eUhUTUxDaGFyc2V0T3V0fFByb3h5SFRNTERvY1R5cGV8UHJveHlIVE1MRW5hYmxlfFByb3h5SFRNTEV2ZW50c3xQcm94eUhUTUxFeHRlbmRlZHxQcm94eUhUTUxGaXh1cHN8UHJveHlIVE1MSW50ZXJwfFByb3h5SFRNTExpbmtzfFByb3h5SFRNTE1ldGF8UHJveHlIVE1MU3RyaXBDb21tZW50c3xQcm94eUhUTUxVUkxNYXB8UHJveHlJT0J1ZmZlclNpemV8UHJveHlNYXhGb3J3YXJkc3xQcm94eVBhc3N8UHJveHlQYXNzSW5oZXJpdHxQcm94eVBhc3NJbnRlcnBvbGF0ZUVudnxQcm94eVBhc3NNYXRjaHxQcm94eVBhc3NSZXZlcnNlfFByb3h5UGFzc1JldmVyc2VDb29raWVEb21haW58UHJveHlQYXNzUmV2ZXJzZUNvb2tpZVBhdGh8UHJveHlQcmVzZXJ2ZUhvc3R8UHJveHlSZWNlaXZlQnVmZmVyU2l6ZXxQcm94eVJlbW90ZXxQcm94eVJlbW90ZU1hdGNofFByb3h5UmVxdWVzdHN8UHJveHlTQ0dJSW50ZXJuYWxSZWRpcmVjdHxQcm94eVNDR0lTZW5kZmlsZXxQcm94eVNldHxQcm94eVNvdXJjZUFkZHJlc3N8UHJveHlTdGF0dXN8UHJveHlUaW1lb3V0fFByb3h5VmlhfFJlYWRtZU5hbWV8UmVjZWl2ZUJ1ZmZlclNpemV8UmVkaXJlY3R8UmVkaXJlY3RNYXRjaHxSZWRpcmVjdFBlcm1hbmVudHxSZWRpcmVjdFRlbXB8UmVmbGVjdG9ySGVhZGVyfFJlbW90ZUlQSGVhZGVyfFJlbW90ZUlQSW50ZXJuYWxQcm94eXxSZW1vdGVJUEludGVybmFsUHJveHlMaXN0fFJlbW90ZUlQUHJveGllc0hlYWRlcnxSZW1vdGVJUFRydXN0ZWRQcm94eXxSZW1vdGVJUFRydXN0ZWRQcm94eUxpc3R8UmVtb3ZlQ2hhcnNldHxSZW1vdmVFbmNvZGluZ3xSZW1vdmVIYW5kbGVyfFJlbW92ZUlucHV0RmlsdGVyfFJlbW92ZUxhbmd1YWdlfFJlbW92ZU91dHB1dEZpbHRlcnxSZW1vdmVUeXBlfFJlcXVlc3RIZWFkZXJ8UmVxdWVzdFJlYWRUaW1lb3V0fFJlcXVpcmV8UmV3cml0ZUJhc2V8UmV3cml0ZUNvbmR8UmV3cml0ZUVuZ2luZXxSZXdyaXRlTWFwfFJld3JpdGVPcHRpb25zfFJld3JpdGVSdWxlfFJMaW1pdENQVXxSTGltaXRNRU18UkxpbWl0TlBST0N8U2F0aXNmeXxTY29yZUJvYXJkRmlsZXxTY3JpcHR8U2NyaXB0QWxpYXN8U2NyaXB0QWxpYXNNYXRjaHxTY3JpcHRJbnRlcnByZXRlclNvdXJjZXxTY3JpcHRMb2d8U2NyaXB0TG9nQnVmZmVyfFNjcmlwdExvZ0xlbmd0aHxTY3JpcHRTb2NrfFNlY3VyZUxpc3RlbnxTZWVSZXF1ZXN0VGFpbHxTZW5kQnVmZmVyU2l6ZXxTZXJ2ZXJBZG1pbnxTZXJ2ZXJBbGlhc3xTZXJ2ZXJMaW1pdHxTZXJ2ZXJOYW1lfFNlcnZlclBhdGh8U2VydmVyUm9vdHxTZXJ2ZXJTaWduYXR1cmV8U2VydmVyVG9rZW5zfFNlc3Npb258U2Vzc2lvbkNvb2tpZU5hbWV8U2Vzc2lvbkNvb2tpZU5hbWUyfFNlc3Npb25Db29raWVSZW1vdmV8U2Vzc2lvbkNyeXB0b0NpcGhlcnxTZXNzaW9uQ3J5cHRvRHJpdmVyfFNlc3Npb25DcnlwdG9QYXNzcGhyYXNlfFNlc3Npb25DcnlwdG9QYXNzcGhyYXNlRmlsZXxTZXNzaW9uREJEQ29va2llTmFtZXxTZXNzaW9uREJEQ29va2llTmFtZTJ8U2Vzc2lvbkRCRENvb2tpZVJlbW92ZXxTZXNzaW9uREJERGVsZXRlTGFiZWx8U2Vzc2lvbkRCREluc2VydExhYmVsfFNlc3Npb25EQkRQZXJVc2VyfFNlc3Npb25EQkRTZWxlY3RMYWJlbHxTZXNzaW9uREJEVXBkYXRlTGFiZWx8U2Vzc2lvbkVudnxTZXNzaW9uRXhjbHVkZXxTZXNzaW9uSGVhZGVyfFNlc3Npb25JbmNsdWRlfFNlc3Npb25NYXhBZ2V8U2V0RW52fFNldEVudklmfFNldEVudklmRXhwcnxTZXRFbnZJZk5vQ2FzZXxTZXRIYW5kbGVyfFNldElucHV0RmlsdGVyfFNldE91dHB1dEZpbHRlcnxTU0lFbmRUYWd8U1NJRXJyb3JNc2d8U1NJRVRhZ3xTU0lMYXN0TW9kaWZpZWR8U1NJTGVnYWN5RXhwclBhcnNlcnxTU0lTdGFydFRhZ3xTU0lUaW1lRm9ybWF0fFNTSVVuZGVmaW5lZEVjaG98U1NMQ0FDZXJ0aWZpY2F0ZUZpbGV8U1NMQ0FDZXJ0aWZpY2F0ZVBhdGh8U1NMQ0FETlJlcXVlc3RGaWxlfFNTTENBRE5SZXF1ZXN0UGF0aHxTU0xDQVJldm9jYXRpb25DaGVja3xTU0xDQVJldm9jYXRpb25GaWxlfFNTTENBUmV2b2NhdGlvblBhdGh8U1NMQ2VydGlmaWNhdGVDaGFpbkZpbGV8U1NMQ2VydGlmaWNhdGVGaWxlfFNTTENlcnRpZmljYXRlS2V5RmlsZXxTU0xDaXBoZXJTdWl0ZXxTU0xDb21wcmVzc2lvbnxTU0xDcnlwdG9EZXZpY2V8U1NMRW5naW5lfFNTTEZJUFN8U1NMSG9ub3JDaXBoZXJPcmRlcnxTU0xJbnNlY3VyZVJlbmVnb3RpYXRpb258U1NMT0NTUERlZmF1bHRSZXNwb25kZXJ8U1NMT0NTUEVuYWJsZXxTU0xPQ1NQT3ZlcnJpZGVSZXNwb25kZXJ8U1NMT0NTUFJlc3BvbmRlclRpbWVvdXR8U1NMT0NTUFJlc3BvbnNlTWF4QWdlfFNTTE9DU1BSZXNwb25zZVRpbWVTa2V3fFNTTE9DU1BVc2VSZXF1ZXN0Tm9uY2V8U1NMT3BlblNTTENvbmZDbWR8U1NMT3B0aW9uc3xTU0xQYXNzUGhyYXNlRGlhbG9nfFNTTFByb3RvY29sfFNTTFByb3h5Q0FDZXJ0aWZpY2F0ZUZpbGV8U1NMUHJveHlDQUNlcnRpZmljYXRlUGF0aHxTU0xQcm94eUNBUmV2b2NhdGlvbkNoZWNrfFNTTFByb3h5Q0FSZXZvY2F0aW9uRmlsZXxTU0xQcm94eUNBUmV2b2NhdGlvblBhdGh8U1NMUHJveHlDaGVja1BlZXJDTnxTU0xQcm94eUNoZWNrUGVlckV4cGlyZXxTU0xQcm94eUNoZWNrUGVlck5hbWV8U1NMUHJveHlDaXBoZXJTdWl0ZXxTU0xQcm94eUVuZ2luZXxTU0xQcm94eU1hY2hpbmVDZXJ0aWZpY2F0ZUNoYWluRmlsZXxTU0xQcm94eU1hY2hpbmVDZXJ0aWZpY2F0ZUZpbGV8U1NMUHJveHlNYWNoaW5lQ2VydGlmaWNhdGVQYXRofFNTTFByb3h5UHJvdG9jb2x8U1NMUHJveHlWZXJpZnl8U1NMUHJveHlWZXJpZnlEZXB0aHxTU0xSYW5kb21TZWVkfFNTTFJlbmVnQnVmZmVyU2l6ZXxTU0xSZXF1aXJlfFNTTFJlcXVpcmVTU0x8U1NMU2Vzc2lvbkNhY2hlfFNTTFNlc3Npb25DYWNoZVRpbWVvdXR8U1NMU2Vzc2lvblRpY2tldEtleUZpbGV8U1NMU1JQVW5rbm93blVzZXJTZWVkfFNTTFNSUFZlcmlmaWVyRmlsZXxTU0xTdGFwbGluZ0NhY2hlfFNTTFN0YXBsaW5nRXJyb3JDYWNoZVRpbWVvdXR8U1NMU3RhcGxpbmdGYWtlVHJ5TGF0ZXJ8U1NMU3RhcGxpbmdGb3JjZVVSTHxTU0xTdGFwbGluZ1Jlc3BvbmRlclRpbWVvdXR8U1NMU3RhcGxpbmdSZXNwb25zZU1heEFnZXxTU0xTdGFwbGluZ1Jlc3BvbnNlVGltZVNrZXd8U1NMU3RhcGxpbmdSZXR1cm5SZXNwb25kZXJFcnJvcnN8U1NMU3RhcGxpbmdTdGFuZGFyZENhY2hlVGltZW91dHxTU0xTdHJpY3RTTklWSG9zdENoZWNrfFNTTFVzZXJOYW1lfFNTTFVzZVN0YXBsaW5nfFNTTFZlcmlmeUNsaWVudHxTU0xWZXJpZnlEZXB0aHxTdGFydFNlcnZlcnN8U3RhcnRUaHJlYWRzfFN1YnN0aXR1dGV8U3VleGVjfFN1ZXhlY1VzZXJHcm91cHxUaHJlYWRMaW1pdHxUaHJlYWRzUGVyQ2hpbGR8VGhyZWFkU3RhY2tTaXplfFRpbWVPdXR8VHJhY2VFbmFibGV8VHJhbnNmZXJMb2d8VHlwZXNDb25maWd8VW5EZWZpbmV8VW5kZWZNYWNyb3xVbnNldEVudnxVc2V8VXNlQ2Fub25pY2FsTmFtZXxVc2VDYW5vbmljYWxQaHlzaWNhbFBvcnR8VXNlcnxVc2VyRGlyfFZIb3N0Q0dJTW9kZXxWSG9zdENHSVByaXZzfFZIb3N0R3JvdXB8Vkhvc3RQcml2c3xWSG9zdFNlY3VyZXxWSG9zdFVzZXJ8VmlydHVhbERvY3VtZW50Um9vdHxWaXJ0dWFsRG9jdW1lbnRSb290SVB8VmlydHVhbFNjcmlwdEFsaWFzfFZpcnR1YWxTY3JpcHRBbGlhc0lQfFdhdGNoZG9nSW50ZXJ2YWx8WEJpdEhhY2t8eG1sMkVuY0FsaWFzfHhtbDJFbmNEZWZhdWx0fHhtbDJTdGFydFBhcnNlKVxcYi9nbWksXG5cdFx0YWxpYXM6ICdwcm9wZXJ0eSdcblx0fSxcblx0J2RpcmVjdGl2ZS1ibG9jayc6IHtcblx0XHRwYXR0ZXJuOiAvPFxcLz9cXGIoQXV0aG5Qcm92aWRlckFsaWFzfEF1dGh6UHJvdmlkZXJBbGlhc3xEaXJlY3Rvcnl8RGlyZWN0b3J5TWF0Y2h8RWxzZXxFbHNlSWZ8RmlsZXN8RmlsZXNNYXRjaHxJZnxJZkRlZmluZXxJZk1vZHVsZXxJZlZlcnNpb258TGltaXR8TGltaXRFeGNlcHR8TG9jYXRpb258TG9jYXRpb25NYXRjaHxNYWNyb3xQcm94eXxSZXF1aXJlQWxsfFJlcXVpcmVBbnl8UmVxdWlyZU5vbmV8VmlydHVhbEhvc3QpXFxiICouKj4vZ2ksXG5cdFx0aW5zaWRlOiB7XG5cdFx0XHQnZGlyZWN0aXZlLWJsb2NrJzoge1xuXHRcdFx0XHRwYXR0ZXJuOiAvXjxcXC8/XFx3Ky8sXG5cdFx0XHRcdGluc2lkZToge1xuXHRcdFx0XHRcdCdwdW5jdHVhdGlvbic6IC9ePFxcLz8vXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGFsaWFzOiAndGFnJ1xuXHRcdFx0fSxcblx0XHRcdCdkaXJlY3RpdmUtYmxvY2stcGFyYW1ldGVyJzoge1xuXHRcdFx0XHRwYXR0ZXJuOiAvLipbXj5dLyxcblx0XHRcdFx0aW5zaWRlOiB7XG5cdFx0XHRcdFx0J3B1bmN0dWF0aW9uJzogLzovLFxuXHRcdFx0XHRcdCdzdHJpbmcnOiB7XG5cdFx0XHRcdFx0XHRwYXR0ZXJuOiAvKFwifCcpLipcXDEvZyxcblx0XHRcdFx0XHRcdGluc2lkZToge1xuXHRcdFx0XHRcdFx0XHQndmFyaWFibGUnOiAvKFxcJHwlKVxcez8oXFx3XFwuPyhcXCt8XFwtfDopPykrXFx9Py9nXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRhbGlhczogJ2F0dHItdmFsdWUnXG5cdFx0XHR9LFxuXHRcdFx0J3B1bmN0dWF0aW9uJzogLz4vXG5cdFx0fSxcblx0XHRhbGlhczogJ3RhZydcblx0fSxcblx0J2RpcmVjdGl2ZS1mbGFncyc6IHtcblx0XHRwYXR0ZXJuOiAvXFxbKFxcdyw/KStcXF0vZyxcblx0XHRhbGlhczogJ2tleXdvcmQnXG5cdH0sXG5cdCdzdHJpbmcnOiB7XG5cdFx0cGF0dGVybjogLyhcInwnKS4qXFwxL2csXG5cdFx0aW5zaWRlOiB7XG5cdFx0XHQndmFyaWFibGUnOiAvKFxcJHwlKVxcez8oXFx3XFwuPyhcXCt8XFwtfDopPykrXFx9Py9nXG5cdFx0fVxuXHR9LFxuXHQndmFyaWFibGUnOiAvKFxcJHwlKVxcez8oXFx3XFwuPyhcXCt8XFwtfDopPykrXFx9Py9nLFxuXHQncmVnZXgnOiAvXFxePy4qXFwkfFxcXi4qXFwkPy9nXG59O1xuXG5QcmlzbS5sYW5ndWFnZXMuamF2YSA9IFByaXNtLmxhbmd1YWdlcy5leHRlbmQoJ2NsaWtlJywge1xuXHQna2V5d29yZCc6IC9cXGIoYWJzdHJhY3R8Y29udGludWV8Zm9yfG5ld3xzd2l0Y2h8YXNzZXJ0fGRlZmF1bHR8Z290b3xwYWNrYWdlfHN5bmNocm9uaXplZHxib29sZWFufGRvfGlmfHByaXZhdGV8dGhpc3xicmVha3xkb3VibGV8aW1wbGVtZW50c3xwcm90ZWN0ZWR8dGhyb3d8Ynl0ZXxlbHNlfGltcG9ydHxwdWJsaWN8dGhyb3dzfGNhc2V8ZW51bXxpbnN0YW5jZW9mfHJldHVybnx0cmFuc2llbnR8Y2F0Y2h8ZXh0ZW5kc3xpbnR8c2hvcnR8dHJ5fGNoYXJ8ZmluYWx8aW50ZXJmYWNlfHN0YXRpY3x2b2lkfGNsYXNzfGZpbmFsbHl8bG9uZ3xzdHJpY3RmcHx2b2xhdGlsZXxjb25zdHxmbG9hdHxuYXRpdmV8c3VwZXJ8d2hpbGUpXFxiL2csXG5cdCdudW1iZXInOiAvXFxiMGJbMDFdK1xcYnxcXGIweFtcXGRhLWZdKlxcLj9bXFxkYS1mcFxcLV0rXFxifFxcYlxcZCpcXC4/XFxkK1tlXT9bXFxkXSpbZGZdXFxifFxcV1xcZCpcXC4/XFxkK1xcYi9naSxcblx0J29wZXJhdG9yJzoge1xuXHRcdHBhdHRlcm46IC8oXnxbXlxcLl0pKD86XFwrPXxcXCtcXCs/fC09fC0tP3whPT98PHsxLDJ9PT98PnsxLDN9PT98PT0/fCY9fCYmP3xcXHw9fFxcfFxcfD98XFw/fFxcKj0/fFxcLz0/fCU9P3xcXF49P3w6fH4pL2dtLFxuXHRcdGxvb2tiZWhpbmQ6IHRydWVcblx0fVxufSk7XG5QcmlzbS5sYW5ndWFnZXMucHl0aG9uPSB7IFxuXHQnY29tbWVudCc6IHtcblx0XHRwYXR0ZXJuOiAvKF58W15cXFxcXSkjLio/KFxccj9cXG58JCkvZyxcblx0XHRsb29rYmVoaW5kOiB0cnVlXG5cdH0sXG5cdCdzdHJpbmcnOiAvXCJcIlwiW1xcc1xcU10rP1wiXCJcInwoXCJ8JykoXFxcXD8uKSo/XFwxL2csXG5cdCdrZXl3b3JkJyA6IC9cXGIoYXN8YXNzZXJ0fGJyZWFrfGNsYXNzfGNvbnRpbnVlfGRlZnxkZWx8ZWxpZnxlbHNlfGV4Y2VwdHxleGVjfGZpbmFsbHl8Zm9yfGZyb218Z2xvYmFsfGlmfGltcG9ydHxpbnxpc3xsYW1iZGF8cGFzc3xwcmludHxyYWlzZXxyZXR1cm58dHJ5fHdoaWxlfHdpdGh8eWllbGQpXFxiL2csXG5cdCdib29sZWFuJyA6IC9cXGIoVHJ1ZXxGYWxzZSlcXGIvZyxcblx0J251bWJlcicgOiAvXFxiLT8oMHgpP1xcZCpcXC4/W1xcZGEtZl0rXFxiL2csXG5cdCdvcGVyYXRvcicgOiAvWy0rXXsxLDJ9fD0/Jmx0O3w9PyZndDt8IXw9ezEsMn18KCYpezEsMn18KCZhbXA7KXsxLDJ9fFxcfD9cXHx8XFw/fFxcKnxcXC98fnxcXF58JXxcXGIob3J8YW5kfG5vdClcXGIvZyxcblx0J2lnbm9yZScgOiAvJihsdHxndHxhbXApOy9naSxcblx0J3B1bmN0dWF0aW9uJyA6IC9be31bXFxdOygpLC46XS9nXG59O1xuXG5cblByaXNtLmxhbmd1YWdlcy5hc3BuZXQgPSBQcmlzbS5sYW5ndWFnZXMuZXh0ZW5kKCdtYXJrdXAnLCB7XG5cdCdwYWdlLWRpcmVjdGl2ZSB0YWcnOiB7XG5cdFx0cGF0dGVybjogLzwlXFxzKkAuKiU+L2dpLFxuXHRcdGluc2lkZToge1xuXHRcdFx0J3BhZ2UtZGlyZWN0aXZlIHRhZyc6IC88JVxccypAXFxzKig/OkFzc2VtYmx5fENvbnRyb2x8SW1wbGVtZW50c3xJbXBvcnR8TWFzdGVyfE1hc3RlclR5cGV8T3V0cHV0Q2FjaGV8UGFnZXxQcmV2aW91c1BhZ2VUeXBlfFJlZmVyZW5jZXxSZWdpc3Rlcik/fCU+L2lnLFxuXHRcdFx0cmVzdDogUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cC50YWcuaW5zaWRlXG5cdFx0fVxuXHR9LFxuXHQnZGlyZWN0aXZlIHRhZyc6IHtcblx0XHRwYXR0ZXJuOiAvPCUuKiU+L2dpLFxuXHRcdGluc2lkZToge1xuXHRcdFx0J2RpcmVjdGl2ZSB0YWcnOiAvPCVcXHMqP1skPSUjOl17MCwyfXwlPi9naSxcblx0XHRcdHJlc3Q6IFByaXNtLmxhbmd1YWdlcy5jc2hhcnBcblx0XHR9XG5cdH1cbn0pO1xuXG4vLyBtYXRjaCBkaXJlY3RpdmVzIG9mIGF0dHJpYnV0ZSB2YWx1ZSBmb289XCI8JSBCYXIgJT5cIlxuUHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZSgnaW5zaWRlJywgJ3B1bmN0dWF0aW9uJywge1xuXHQnZGlyZWN0aXZlIHRhZyc6IFByaXNtLmxhbmd1YWdlcy5hc3BuZXRbJ2RpcmVjdGl2ZSB0YWcnXVxufSwgUHJpc20ubGFuZ3VhZ2VzLmFzcG5ldC50YWcuaW5zaWRlW1wiYXR0ci12YWx1ZVwiXSk7XG5cblByaXNtLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoJ2FzcG5ldCcsICdjb21tZW50Jywge1xuXHQnYXNwIGNvbW1lbnQnOiAvPCUtLVtcXHdcXFddKj8tLSU+L2dcbn0pO1xuXG4vLyBzY3JpcHQgcnVuYXQ9XCJzZXJ2ZXJcIiBjb250YWlucyBjc2hhcnAsIG5vdCBqYXZhc2NyaXB0XG5QcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKCdhc3BuZXQnLCBQcmlzbS5sYW5ndWFnZXMuamF2YXNjcmlwdCA/ICdzY3JpcHQnIDogJ3RhZycsIHtcblx0J2FzcCBzY3JpcHQnOiB7XG5cdFx0cGF0dGVybjogLzxzY3JpcHQoPz0uKnJ1bmF0PVsnXCJdP3NlcnZlclsnXCJdPylbXFx3XFxXXSo/PltcXHdcXFddKj88XFwvc2NyaXB0Pi9pZyxcblx0XHRpbnNpZGU6IHtcblx0XHRcdHRhZzoge1xuXHRcdFx0XHRwYXR0ZXJuOiAvPFxcLz9zY3JpcHRcXHMqKD86XFxzK1tcXHc6LV0rKD86PSg/OihcInwnKShcXFxcP1tcXHdcXFddKSo/XFwxfFxcdyspKT9cXHMqKSpcXC8/Pi9naSxcblx0XHRcdFx0aW5zaWRlOiBQcmlzbS5sYW5ndWFnZXMuYXNwbmV0LnRhZy5pbnNpZGVcblx0XHRcdH0sXG5cdFx0XHRyZXN0OiBQcmlzbS5sYW5ndWFnZXMuY3NoYXJwIHx8IHt9XG5cdFx0fVxuXHR9XG59KTtcblxuLy8gSGFja3MgdG8gZml4IGVhZ2VyIHRhZyBtYXRjaGluZyBmaW5pc2hpbmcgdG9vIGVhcmx5OiA8c2NyaXB0IHNyYz1cIjwlIEZvby5CYXIgJT5cIj4gPT4gPHNjcmlwdCBzcmM9XCI8JSBGb28uQmFyICU+XG5pZiAoIFByaXNtLmxhbmd1YWdlcy5hc3BuZXQuc3R5bGUgKSB7XG5cdFByaXNtLmxhbmd1YWdlcy5hc3BuZXQuc3R5bGUuaW5zaWRlLnRhZy5wYXR0ZXJuID0gLzxcXC8/c3R5bGVcXHMqKD86XFxzK1tcXHc6LV0rKD86PSg/OihcInwnKShcXFxcP1tcXHdcXFddKSo/XFwxfFxcdyspKT9cXHMqKSpcXC8/Pi9naTtcblx0UHJpc20ubGFuZ3VhZ2VzLmFzcG5ldC5zdHlsZS5pbnNpZGUudGFnLmluc2lkZSA9IFByaXNtLmxhbmd1YWdlcy5hc3BuZXQudGFnLmluc2lkZTtcbn1cbmlmICggUHJpc20ubGFuZ3VhZ2VzLmFzcG5ldC5zY3JpcHQgKSB7XG5cdFByaXNtLmxhbmd1YWdlcy5hc3BuZXQuc2NyaXB0Lmluc2lkZS50YWcucGF0dGVybiA9IFByaXNtLmxhbmd1YWdlcy5hc3BuZXRbJ2FzcCBzY3JpcHQnXS5pbnNpZGUudGFnLnBhdHRlcm5cblx0UHJpc20ubGFuZ3VhZ2VzLmFzcG5ldC5zY3JpcHQuaW5zaWRlLnRhZy5pbnNpZGUgPSBQcmlzbS5sYW5ndWFnZXMuYXNwbmV0LnRhZy5pbnNpZGU7XG59XG5QcmlzbS5sYW5ndWFnZXMuY3NzID0ge1xuXHQnY29tbWVudCc6IC9cXC9cXCpbXFx3XFxXXSo/XFwqXFwvL2csXG5cdCdhdHJ1bGUnOiB7XG5cdFx0cGF0dGVybjogL0BbXFx3LV0rPy4qPyg7fCg/PVxccyp7KSkvZ2ksXG5cdFx0aW5zaWRlOiB7XG5cdFx0XHQncHVuY3R1YXRpb24nOiAvWzs6XS9nXG5cdFx0fVxuXHR9LFxuXHQndXJsJzogL3VybFxcKChbXCInXT8pLio/XFwxXFwpL2dpLFxuXHQnc2VsZWN0b3InOiAvW15cXHtcXH1cXHNdW15cXHtcXH07XSooPz1cXHMqXFx7KS9nLFxuXHQncHJvcGVydHknOiAvKFxcYnxcXEIpW1xcdy1dKyg/PVxccyo6KS9pZyxcblx0J3N0cmluZyc6IC8oXCJ8JykoXFxcXD8uKSo/XFwxL2csXG5cdCdpbXBvcnRhbnQnOiAvXFxCIWltcG9ydGFudFxcYi9naSxcblx0J3B1bmN0dWF0aW9uJzogL1tcXHtcXH07Ol0vZyxcblx0J2Z1bmN0aW9uJzogL1stYS16MC05XSsoPz1cXCgpL2lnXG59O1xuXG5pZiAoUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cCkge1xuXHRQcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKCdtYXJrdXAnLCAndGFnJywge1xuXHRcdCdzdHlsZSc6IHtcblx0XHRcdHBhdHRlcm46IC88c3R5bGVbXFx3XFxXXSo/PltcXHdcXFddKj88XFwvc3R5bGU+L2lnLFxuXHRcdFx0aW5zaWRlOiB7XG5cdFx0XHRcdCd0YWcnOiB7XG5cdFx0XHRcdFx0cGF0dGVybjogLzxzdHlsZVtcXHdcXFddKj8+fDxcXC9zdHlsZT4vaWcsXG5cdFx0XHRcdFx0aW5zaWRlOiBQcmlzbS5sYW5ndWFnZXMubWFya3VwLnRhZy5pbnNpZGVcblx0XHRcdFx0fSxcblx0XHRcdFx0cmVzdDogUHJpc20ubGFuZ3VhZ2VzLmNzc1xuXHRcdFx0fSxcblx0XHRcdGFsaWFzOiAnbGFuZ3VhZ2UtY3NzJ1xuXHRcdH1cblx0fSk7XG5cdFxuXHRQcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKCdpbnNpZGUnLCAnYXR0ci12YWx1ZScsIHtcblx0XHQnc3R5bGUtYXR0cic6IHtcblx0XHRcdHBhdHRlcm46IC9cXHMqc3R5bGU9KFwifCcpLis/XFwxL2lnLFxuXHRcdFx0aW5zaWRlOiB7XG5cdFx0XHRcdCdhdHRyLW5hbWUnOiB7XG5cdFx0XHRcdFx0cGF0dGVybjogL15cXHMqc3R5bGUvaWcsXG5cdFx0XHRcdFx0aW5zaWRlOiBQcmlzbS5sYW5ndWFnZXMubWFya3VwLnRhZy5pbnNpZGVcblx0XHRcdFx0fSxcblx0XHRcdFx0J3B1bmN0dWF0aW9uJzogL15cXHMqPVxccypbJ1wiXXxbJ1wiXVxccyokLyxcblx0XHRcdFx0J2F0dHItdmFsdWUnOiB7XG5cdFx0XHRcdFx0cGF0dGVybjogLy4rL2dpLFxuXHRcdFx0XHRcdGluc2lkZTogUHJpc20ubGFuZ3VhZ2VzLmNzc1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0YWxpYXM6ICdsYW5ndWFnZS1jc3MnXG5cdFx0fVxuXHR9LCBQcmlzbS5sYW5ndWFnZXMubWFya3VwLnRhZyk7XG59XG5QcmlzbS5sYW5ndWFnZXMuamF2YXNjcmlwdCA9IFByaXNtLmxhbmd1YWdlcy5leHRlbmQoJ2NsaWtlJywge1xuXHQna2V5d29yZCc6IC9cXGIoYnJlYWt8Y2FzZXxjYXRjaHxjbGFzc3xjb25zdHxjb250aW51ZXxkZWJ1Z2dlcnxkZWZhdWx0fGRlbGV0ZXxkb3xlbHNlfGVudW18ZXhwb3J0fGV4dGVuZHN8ZmFsc2V8ZmluYWxseXxmb3J8ZnVuY3Rpb258Z2V0fGlmfGltcGxlbWVudHN8aW1wb3J0fGlufGluc3RhbmNlb2Z8aW50ZXJmYWNlfGxldHxuZXd8bnVsbHxwYWNrYWdlfHByaXZhdGV8cHJvdGVjdGVkfHB1YmxpY3xyZXR1cm58c2V0fHN0YXRpY3xzdXBlcnxzd2l0Y2h8dGhpc3x0aHJvd3x0cnVlfHRyeXx0eXBlb2Z8dmFyfHZvaWR8d2hpbGV8d2l0aHx5aWVsZClcXGIvZyxcblx0J251bWJlcic6IC9cXGItPygweFtcXGRBLUZhLWZdK3xcXGQqXFwuP1xcZCsoW0VlXS0/XFxkKyk/fE5hTnwtP0luZmluaXR5KVxcYi9nXG59KTtcblxuUHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZSgnamF2YXNjcmlwdCcsICdrZXl3b3JkJywge1xuXHQncmVnZXgnOiB7XG5cdFx0cGF0dGVybjogLyhefFteL10pXFwvKD8hXFwvKShcXFsuKz9dfFxcXFwufFteL1xcclxcbl0pK1xcL1tnaW1dezAsM30oPz1cXHMqKCR8W1xcclxcbiwuO30pXSkpL2csXG5cdFx0bG9va2JlaGluZDogdHJ1ZVxuXHR9XG59KTtcblxuaWYgKFByaXNtLmxhbmd1YWdlcy5tYXJrdXApIHtcblx0UHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZSgnbWFya3VwJywgJ3RhZycsIHtcblx0XHQnc2NyaXB0Jzoge1xuXHRcdFx0cGF0dGVybjogLzxzY3JpcHRbXFx3XFxXXSo/PltcXHdcXFddKj88XFwvc2NyaXB0Pi9pZyxcblx0XHRcdGluc2lkZToge1xuXHRcdFx0XHQndGFnJzoge1xuXHRcdFx0XHRcdHBhdHRlcm46IC88c2NyaXB0W1xcd1xcV10qPz58PFxcL3NjcmlwdD4vaWcsXG5cdFx0XHRcdFx0aW5zaWRlOiBQcmlzbS5sYW5ndWFnZXMubWFya3VwLnRhZy5pbnNpZGVcblx0XHRcdFx0fSxcblx0XHRcdFx0cmVzdDogUHJpc20ubGFuZ3VhZ2VzLmphdmFzY3JpcHRcblx0XHRcdH0sXG5cdFx0XHRhbGlhczogJ2xhbmd1YWdlLWphdmFzY3JpcHQnXG5cdFx0fVxuXHR9KTtcbn1cblxuUHJpc20ubGFuZ3VhZ2VzLnJpcCA9IHtcblx0J2NvbW1lbnQnOiAvI1teXFxyXFxuXSooXFxyP1xcbnwkKS9nLFxuXG5cdCdrZXl3b3JkJzogLyg/Oj0+fC0+KXxcXGIoPzpjbGFzc3xpZnxlbHNlfHN3aXRjaHxjYXNlfHJldHVybnxleGl0fHRyeXxjYXRjaHxmaW5hbGx5fHJhaXNlKVxcYi9nLFxuXG5cdCdidWlsdGluJzogL1xcYihAfFN5c3RlbSlcXGIvZyxcblxuXHQnYm9vbGVhbic6IC9cXGIodHJ1ZXxmYWxzZSlcXGIvZyxcblxuXHQnZGF0ZSc6IC9cXGJcXGR7NH0tXFxkezJ9LVxcZHsyfVxcYi9nLFxuXHQndGltZSc6IC9cXGJcXGR7Mn06XFxkezJ9OlxcZHsyfVxcYi9nLFxuXHQnZGF0ZXRpbWUnOiAvXFxiXFxkezR9LVxcZHsyfS1cXGR7Mn1UXFxkezJ9OlxcZHsyfTpcXGR7Mn1cXGIvZyxcblxuXHQnbnVtYmVyJzogL1srLV0/KD86KD86XFxkK1xcLlxcZCspfCg/OlxcZCspKS9nLFxuXG5cdCdjaGFyYWN0ZXInOiAvXFxCYFteXFxzXFxgXFwnXCIsLjo7I1xcL1xcXFwoKTw+XFxbXFxde31dXFxiL2csXG5cblx0J3JlZ2V4Jzoge1xuXHRcdHBhdHRlcm46IC8oXnxbXi9dKVxcLyg/IVxcLykoXFxbLis/XXxcXFxcLnxbXi9cXHJcXG5dKStcXC8oPz1cXHMqKCR8W1xcclxcbiwuO30pXSkpL2csXG5cdFx0bG9va2JlaGluZDogdHJ1ZVxuXHR9LFxuXG5cdCdzeW1ib2wnOiAvOlteXFxkXFxzXFxgXFwnXCIsLjo7I1xcL1xcXFwoKTw+XFxbXFxde31dW15cXHNcXGBcXCdcIiwuOjsjXFwvXFxcXCgpPD5cXFtcXF17fV0qL2csXG5cdCdzdHJpbmcnOiAvKFwifCcpKFxcXFw/LikqP1xcMS9nLFxuXG5cdCdwdW5jdHVhdGlvbic6IC8oPzpcXC57MiwzfSl8W1xcYCwuOjs9XFwvXFxcXCgpPD5cXFtcXF17fV0vLFxuXG5cdCdyZWZlcmVuY2UnOiAvW15cXGRcXHNcXGBcXCdcIiwuOjsjXFwvXFxcXCgpPD5cXFtcXF17fV1bXlxcc1xcYFxcJ1wiLC46OyNcXC9cXFxcKCk8PlxcW1xcXXt9XSovZ1xufTtcblxuLy8gTk9URVMgLSBmb2xsb3dzIGZpcnN0LWZpcnN0IGhpZ2hsaWdodCBtZXRob2QsIGJsb2NrIGlzIGxvY2tlZCBhZnRlciBoaWdobGlnaHQsIGRpZmZlcmVudCBmcm9tIFN5bnRheEhsXHJcblByaXNtLmxhbmd1YWdlcy5hdXRvaG90a2V5PSB7XHJcblx0J2NvbW1lbnQnOiB7XHJcblx0XHRwYXR0ZXJuOiAvKF5bXlwiO1xcbl0qKFwiW15cIlxcbl0qP1wiW15cIlxcbl0qPykqKSg7LiokfF5cXHMqXFwvXFwqW1xcc1xcU10qXFxuXFwqXFwvKS9nbSxcclxuXHRcdGxvb2tiZWhpbmQ6IHRydWVcclxuXHR9LFxyXG5cdCdzdHJpbmcnOiAvXCIoKFteXCJcXG5cXHJdfFwiXCIpKilcIi9nbSxcclxuXHQnZnVuY3Rpb24nOiAvW15cXChcXCk7IFxcdFxcLFxcblxcK1xcKlxcLVxcPVxcPz46XFxcXFxcLzxcXCYlXFxbXFxdXSs/KD89XFwoKS9nbSwgIC8vZnVuY3Rpb24gLSBkb24ndCB1c2UgLipcXCkgaW4gdGhlIGVuZCBiY296IHN0cmluZyBsb2NrcyBpdFxyXG5cdCd0YWcnOiAvXlsgXFx0XSpbXlxcczpdKz8oPz06W146XSkvZ20sICAvL2xhYmVsc1xyXG5cdCd2YXJpYWJsZSc6IC9cXCVcXHcrXFwlL2csXHJcblx0J251bWJlcic6IC9cXGItPygweFtcXGRBLUZhLWZdK3xcXGQqXFwuP1xcZCsoW0VlXS0/XFxkKyk/KVxcYi9nLFxyXG5cdCdvcGVyYXRvcic6IC9bXFwrXFwtXFwqXFxcXFxcLzo9XFw/XFwmXFx8PD5dL2csXHJcblx0J3B1bmN0dWF0aW9uJzogL1tcXHt9W1xcXVxcKFxcKTpdL2csXHJcblx0J2Jvb2xlYW4nOiAvXFxiKHRydWV8ZmFsc2UpXFxiL2csXHJcblxyXG5cdCdzZWxlY3Rvcic6IC9cXGIoQXV0b1RyaW18QmxvY2tJbnB1dHxCcmVha3xDbGlja3xDbGlwV2FpdHxDb250aW51ZXxDb250cm9sfENvbnRyb2xDbGlja3xDb250cm9sRm9jdXN8Q29udHJvbEdldHxDb250cm9sR2V0Rm9jdXN8Q29udHJvbEdldFBvc3xDb250cm9sR2V0VGV4dHxDb250cm9sTW92ZXxDb250cm9sU2VuZHxDb250cm9sU2VuZFJhd3xDb250cm9sU2V0VGV4dHxDb29yZE1vZGV8Q3JpdGljYWx8RGV0ZWN0SGlkZGVuVGV4dHxEZXRlY3RIaWRkZW5XaW5kb3dzfERyaXZlfERyaXZlR2V0fERyaXZlU3BhY2VGcmVlfEVudkFkZHxFbnZEaXZ8RW52R2V0fEVudk11bHR8RW52U2V0fEVudlN1YnxFbnZVcGRhdGV8RXhpdHxFeGl0QXBwfEZpbGVBcHBlbmR8RmlsZUNvcHl8RmlsZUNvcHlEaXJ8RmlsZUNyZWF0ZURpcnxGaWxlQ3JlYXRlU2hvcnRjdXR8RmlsZURlbGV0ZXxGaWxlRW5jb2Rpbmd8RmlsZUdldEF0dHJpYnxGaWxlR2V0U2hvcnRjdXR8RmlsZUdldFNpemV8RmlsZUdldFRpbWV8RmlsZUdldFZlcnNpb258RmlsZUluc3RhbGx8RmlsZU1vdmV8RmlsZU1vdmVEaXJ8RmlsZVJlYWR8RmlsZVJlYWRMaW5lfEZpbGVSZWN5Y2xlfEZpbGVSZWN5Y2xlRW1wdHl8RmlsZVJlbW92ZURpcnxGaWxlU2VsZWN0RmlsZXxGaWxlU2VsZWN0Rm9sZGVyfEZpbGVTZXRBdHRyaWJ8RmlsZVNldFRpbWV8Rm9ybWF0VGltZXxHZXRLZXlTdGF0ZXxHb3N1YnxHb3RvfEdyb3VwQWN0aXZhdGV8R3JvdXBBZGR8R3JvdXBDbG9zZXxHcm91cERlYWN0aXZhdGV8R3VpfEd1aUNvbnRyb2x8R3VpQ29udHJvbEdldHxIb3RrZXl8SW1hZ2VTZWFyY2h8SW5pRGVsZXRlfEluaVJlYWR8SW5pV3JpdGV8SW5wdXR8SW5wdXRCb3h8S2V5V2FpdHxMaXN0SG90a2V5c3xMaXN0TGluZXN8TGlzdFZhcnN8TG9vcHxNZW51fE1vdXNlQ2xpY2t8TW91c2VDbGlja0RyYWd8TW91c2VHZXRQb3N8TW91c2VNb3ZlfE1zZ0JveHxPbkV4aXR8T3V0cHV0RGVidWd8UGF1c2V8UGl4ZWxHZXRDb2xvcnxQaXhlbFNlYXJjaHxQb3N0TWVzc2FnZXxQcm9jZXNzfFByb2dyZXNzfFJhbmRvbXxSZWdEZWxldGV8UmVnUmVhZHxSZWdXcml0ZXxSZWxvYWR8UmVwZWF0fFJldHVybnxSdW58UnVuQXN8UnVuV2FpdHxTZW5kfFNlbmRFdmVudHxTZW5kSW5wdXR8U2VuZE1lc3NhZ2V8U2VuZE1vZGV8U2VuZFBsYXl8U2VuZFJhd3xTZXRCYXRjaExpbmVzfFNldENhcHNsb2NrU3RhdGV8U2V0Q29udHJvbERlbGF5fFNldERlZmF1bHRNb3VzZVNwZWVkfFNldEVudnxTZXRGb3JtYXR8U2V0S2V5RGVsYXl8U2V0TW91c2VEZWxheXxTZXROdW1sb2NrU3RhdGV8U2V0U2Nyb2xsTG9ja1N0YXRlfFNldFN0b3JlQ2Fwc2xvY2tNb2RlfFNldFRpbWVyfFNldFRpdGxlTWF0Y2hNb2RlfFNldFdpbkRlbGF5fFNldFdvcmtpbmdEaXJ8U2h1dGRvd258U2xlZXB8U29ydHxTb3VuZEJlZXB8U291bmRHZXR8U291bmRHZXRXYXZlVm9sdW1lfFNvdW5kUGxheXxTb3VuZFNldHxTb3VuZFNldFdhdmVWb2x1bWV8U3BsYXNoSW1hZ2V8U3BsYXNoVGV4dE9mZnxTcGxhc2hUZXh0T258U3BsaXRQYXRofFN0YXR1c0JhckdldFRleHR8U3RhdHVzQmFyV2FpdHxTdHJpbmdDYXNlU2Vuc2V8U3RyaW5nR2V0UG9zfFN0cmluZ0xlZnR8U3RyaW5nTGVufFN0cmluZ0xvd2VyfFN0cmluZ01pZHxTdHJpbmdSZXBsYWNlfFN0cmluZ1JpZ2h0fFN0cmluZ1NwbGl0fFN0cmluZ1RyaW1MZWZ0fFN0cmluZ1RyaW1SaWdodHxTdHJpbmdVcHBlcnxTdXNwZW5kfFN5c0dldHxUaHJlYWR8VG9vbFRpcHxUcmFuc2Zvcm18VHJheVRpcHxVUkxEb3dubG9hZFRvRmlsZXxXaW5BY3RpdmF0ZXxXaW5BY3RpdmF0ZUJvdHRvbXxXaW5DbG9zZXxXaW5HZXR8V2luR2V0QWN0aXZlU3RhdHN8V2luR2V0QWN0aXZlVGl0bGV8V2luR2V0Q2xhc3N8V2luR2V0UG9zfFdpbkdldFRleHR8V2luR2V0VGl0bGV8V2luSGlkZXxXaW5LaWxsfFdpbk1heGltaXplfFdpbk1lbnVTZWxlY3RJdGVtfFdpbk1pbmltaXplfFdpbk1pbmltaXplQWxsfFdpbk1pbmltaXplQWxsVW5kb3xXaW5Nb3ZlfFdpblJlc3RvcmV8V2luU2V0fFdpblNldFRpdGxlfFdpblNob3d8V2luV2FpdHxXaW5XYWl0QWN0aXZlfFdpbldhaXRDbG9zZXxXaW5XYWl0Tm90QWN0aXZlKVxcYi9pLFxyXG5cclxuXHQnY29uc3RhbnQnOiAvXFxiKGFfYWhrcGF0aHxhX2Foa3ZlcnNpb258YV9hcHBkYXRhfGFfYXBwZGF0YWNvbW1vbnxhX2F1dG90cmltfGFfYmF0Y2hsaW5lc3xhX2NhcmV0eHxhX2NhcmV0eXxhX2NvbXB1dGVybmFtZXxhX2NvbnRyb2xkZWxheXxhX2N1cnNvcnxhX2RkfGFfZGRkfGFfZGRkZHxhX2RlZmF1bHRtb3VzZXNwZWVkfGFfZGVza3RvcHxhX2Rlc2t0b3Bjb21tb258YV9kZXRlY3RoaWRkZW50ZXh0fGFfZGV0ZWN0aGlkZGVud2luZG93c3xhX2VuZGNoYXJ8YV9ldmVudGluZm98YV9leGl0cmVhc29ufGFfZm9ybWF0ZmxvYXR8YV9mb3JtYXRpbnRlZ2VyfGFfZ3VpfGFfZ3VpZXZlbnR8YV9ndWljb250cm9sfGFfZ3VpY29udHJvbGV2ZW50fGFfZ3VpaGVpZ2h0fGFfZ3Vpd2lkdGh8YV9ndWl4fGFfZ3VpeXxhX2hvdXJ8YV9pY29uZmlsZXxhX2ljb25oaWRkZW58YV9pY29ubnVtYmVyfGFfaWNvbnRpcHxhX2luZGV4fGFfaXBhZGRyZXNzMXxhX2lwYWRkcmVzczJ8YV9pcGFkZHJlc3MzfGFfaXBhZGRyZXNzNHxhX2lzYWRtaW58YV9pc2NvbXBpbGVkfGFfaXNjcml0aWNhbHxhX2lzcGF1c2VkfGFfaXNzdXNwZW5kZWR8YV9pc3VuaWNvZGV8YV9rZXlkZWxheXxhX2xhbmd1YWdlfGFfbGFzdGVycm9yfGFfbGluZWZpbGV8YV9saW5lbnVtYmVyfGFfbG9vcGZpZWxkfGFfbG9vcGZpbGVhdHRyaWJ8YV9sb29wZmlsZWRpcnxhX2xvb3BmaWxlZXh0fGFfbG9vcGZpbGVmdWxscGF0aHxhX2xvb3BmaWxlbG9uZ3BhdGh8YV9sb29wZmlsZW5hbWV8YV9sb29wZmlsZXNob3J0bmFtZXxhX2xvb3BmaWxlc2hvcnRwYXRofGFfbG9vcGZpbGVzaXplfGFfbG9vcGZpbGVzaXpla2J8YV9sb29wZmlsZXNpemVtYnxhX2xvb3BmaWxldGltZWFjY2Vzc2VkfGFfbG9vcGZpbGV0aW1lY3JlYXRlZHxhX2xvb3BmaWxldGltZW1vZGlmaWVkfGFfbG9vcHJlYWRsaW5lfGFfbG9vcHJlZ2tleXxhX2xvb3ByZWduYW1lfGFfbG9vcHJlZ3N1YmtleXxhX2xvb3ByZWd0aW1lbW9kaWZpZWR8YV9sb29wcmVndHlwZXxhX21kYXl8YV9taW58YV9tbXxhX21tbXxhX21tbW18YV9tb258YV9tb3VzZWRlbGF5fGFfbXNlY3xhX215ZG9jdW1lbnRzfGFfbm93fGFfbm93dXRjfGFfbnVtYmF0Y2hsaW5lc3xhX29zdHlwZXxhX29zdmVyc2lvbnxhX3ByaW9yaG90a2V5fHByb2dyYW1maWxlc3xhX3Byb2dyYW1maWxlc3xhX3Byb2dyYW1zfGFfcHJvZ3JhbXNjb21tb258YV9zY3JlZW5oZWlnaHR8YV9zY3JlZW53aWR0aHxhX3NjcmlwdGRpcnxhX3NjcmlwdGZ1bGxwYXRofGFfc2NyaXB0bmFtZXxhX3NlY3xhX3NwYWNlfGFfc3RhcnRtZW51fGFfc3RhcnRtZW51Y29tbW9ufGFfc3RhcnR1cHxhX3N0YXJ0dXBjb21tb258YV9zdHJpbmdjYXNlc2Vuc2V8YV90YWJ8YV90ZW1wfGFfdGhpc2Z1bmN8YV90aGlzaG90a2V5fGFfdGhpc2xhYmVsfGFfdGhpc21lbnV8YV90aGlzbWVudWl0ZW18YV90aGlzbWVudWl0ZW1wb3N8YV90aWNrY291bnR8YV90aW1laWRsZXxhX3RpbWVpZGxlcGh5c2ljYWx8YV90aW1lc2luY2VwcmlvcmhvdGtleXxhX3RpbWVzaW5jZXRoaXNob3RrZXl8YV90aXRsZW1hdGNobW9kZXxhX3RpdGxlbWF0Y2htb2Rlc3BlZWR8YV91c2VybmFtZXxhX3dkYXl8YV93aW5kZWxheXxhX3dpbmRpcnxhX3dvcmtpbmdkaXJ8YV95ZGF5fGFfeWVhcnxhX3l3ZWVrfGFfeXl5eXxjbGlwYm9hcmR8Y2xpcGJvYXJkYWxsfGNvbXNwZWN8ZXJyb3JsZXZlbClcXGIvaSxcclxuXHJcblx0J2J1aWx0aW4nOiAvXFxiKGFic3xhY29zfGFzY3xhc2lufGF0YW58Y2VpbHxjaHJ8Y2xhc3N8Y29zfGRsbGNhbGx8ZXhwfGZpbGVleGlzdHxGaWxlb3BlbnxmbG9vcnxnZXRrZXlzdGF0ZXxpbF9hZGR8aWxfY3JlYXRlfGlsX2Rlc3Ryb3l8aW5zdHJ8c3Vic3RyfGlzZnVuY3xpc2xhYmVsfElzT2JqZWN0fGxufGxvZ3xsdl9hZGR8bHZfZGVsZXRlfGx2X2RlbGV0ZWNvbHxsdl9nZXRjb3VudHxsdl9nZXRuZXh0fGx2X2dldHRleHR8bHZfaW5zZXJ0fGx2X2luc2VydGNvbHxsdl9tb2RpZnl8bHZfbW9kaWZ5Y29sfGx2X3NldGltYWdlbGlzdHxtb2R8b25tZXNzYWdlfG51bWdldHxudW1wdXR8cmVnaXN0ZXJjYWxsYmFja3xyZWdleG1hdGNofHJlZ2V4cmVwbGFjZXxyb3VuZHxzaW58dGFufHNxcnR8c3RybGVufHNiX3NldGljb258c2Jfc2V0cGFydHN8c2Jfc2V0dGV4dHxzdHJzcGxpdHx0dl9hZGR8dHZfZGVsZXRlfHR2X2dldGNoaWxkfHR2X2dldGNvdW50fHR2X2dldG5leHR8dHZfZ2V0fHR2X2dldHBhcmVudHx0dl9nZXRwcmV2fHR2X2dldHNlbGVjdGlvbnx0dl9nZXR0ZXh0fHR2X21vZGlmeXx2YXJzZXRjYXBhY2l0eXx3aW5hY3RpdmV8d2luZXhpc3R8X19OZXd8X19DYWxsfF9fR2V0fF9fU2V0KVxcYi9pLFxyXG5cclxuXHQnc3ltYm9sJzogL1xcYihhbHR8YWx0ZG93bnxhbHR1cHxhcHBza2V5fGJhY2tzcGFjZXxicm93c2VyX2JhY2t8YnJvd3Nlcl9mYXZvcml0ZXN8YnJvd3Nlcl9mb3J3YXJkfGJyb3dzZXJfaG9tZXxicm93c2VyX3JlZnJlc2h8YnJvd3Nlcl9zZWFyY2h8YnJvd3Nlcl9zdG9wfGJzfGNhcHNsb2NrfGNvbnRyb2x8Y3RybHxjdHJsYnJlYWt8Y3RybGRvd258Y3RybHVwfGRlbHxkZWxldGV8ZG93bnxlbmR8ZW50ZXJ8ZXNjfGVzY2FwZXxmMXxmMTB8ZjExfGYxMnxmMTN8ZjE0fGYxNXxmMTZ8ZjE3fGYxOHxmMTl8ZjJ8ZjIwfGYyMXxmMjJ8ZjIzfGYyNHxmM3xmNHxmNXxmNnxmN3xmOHxmOXxob21lfGluc3xpbnNlcnR8am95MXxqb3kxMHxqb3kxMXxqb3kxMnxqb3kxM3xqb3kxNHxqb3kxNXxqb3kxNnxqb3kxN3xqb3kxOHxqb3kxOXxqb3kyfGpveTIwfGpveTIxfGpveTIyfGpveTIzfGpveTI0fGpveTI1fGpveTI2fGpveTI3fGpveTI4fGpveTI5fGpveTN8am95MzB8am95MzF8am95MzJ8am95NHxqb3k1fGpveTZ8am95N3xqb3k4fGpveTl8am95YXhlc3xqb3lidXR0b25zfGpveWluZm98am95bmFtZXxqb3lwb3Z8am95cnxqb3l1fGpveXZ8am95eHxqb3l5fGpveXp8bGFsdHxsYXVuY2hfYXBwMXxsYXVuY2hfYXBwMnxsYXVuY2hfbWFpbHxsYXVuY2hfbWVkaWF8bGJ1dHRvbnxsY29udHJvbHxsY3RybHxsZWZ0fGxzaGlmdHxsd2lufGx3aW5kb3dufGx3aW51cHxtYnV0dG9ufG1lZGlhX25leHR8bWVkaWFfcGxheV9wYXVzZXxtZWRpYV9wcmV2fG1lZGlhX3N0b3B8bnVtbG9ja3xudW1wYWQwfG51bXBhZDF8bnVtcGFkMnxudW1wYWQzfG51bXBhZDR8bnVtcGFkNXxudW1wYWQ2fG51bXBhZDd8bnVtcGFkOHxudW1wYWQ5fG51bXBhZGFkZHxudW1wYWRjbGVhcnxudW1wYWRkZWx8bnVtcGFkZGl2fG51bXBhZGRvdHxudW1wYWRkb3dufG51bXBhZGVuZHxudW1wYWRlbnRlcnxudW1wYWRob21lfG51bXBhZGluc3xudW1wYWRsZWZ0fG51bXBhZG11bHR8bnVtcGFkcGdkbnxudW1wYWRwZ3VwfG51bXBhZHJpZ2h0fG51bXBhZHN1YnxudW1wYWR1cHxwYXVzZXxwZ2RufHBndXB8cHJpbnRzY3JlZW58cmFsdHxyYnV0dG9ufHJjb250cm9sfHJjdHJsfHJpZ2h0fHJzaGlmdHxyd2lufHJ3aW5kb3dufHJ3aW51cHxzY3JvbGxsb2NrfHNoaWZ0fHNoaWZ0ZG93bnxzaGlmdHVwfHNwYWNlfHRhYnx1cHx2b2x1bWVfZG93bnx2b2x1bWVfbXV0ZXx2b2x1bWVfdXB8d2hlZWxkb3dufHdoZWVsbGVmdHx3aGVlbHJpZ2h0fHdoZWVsdXB8eGJ1dHRvbjF8eGJ1dHRvbjIpXFxiL2ksXHJcblxyXG5cdCdpbXBvcnRhbnQnOiAvI1xcYihBbGxvd1NhbWVMaW5lQ29tbWVudHN8Q2xpcGJvYXJkVGltZW91dHxDb21tZW50RmxhZ3xFcnJvclN0ZE91dHxFc2NhcGVDaGFyfEhvdGtleUludGVydmFsfEhvdGtleU1vZGlmaWVyVGltZW91dHxIb3RzdHJpbmd8SWZXaW5BY3RpdmV8SWZXaW5FeGlzdHxJZldpbk5vdEFjdGl2ZXxJZldpbk5vdEV4aXN0fEluY2x1ZGV8SW5jbHVkZUFnYWlufEluc3RhbGxLZXliZEhvb2t8SW5zdGFsbE1vdXNlSG9va3xLZXlIaXN0b3J5fExUcmltfE1heEhvdGtleXNQZXJJbnRlcnZhbHxNYXhNZW18TWF4VGhyZWFkc3xNYXhUaHJlYWRzQnVmZmVyfE1heFRocmVhZHNQZXJIb3RrZXl8Tm9FbnZ8Tm9UcmF5SWNvbnxQZXJzaXN0ZW50fFNpbmdsZUluc3RhbmNlfFVzZUhvb2t8V2luQWN0aXZhdGVGb3JjZSlcXGIvaSxcclxuXHJcblx0J2tleXdvcmQnOiAvXFxiKEFib3J0fEFib3ZlTm9ybWFsfEFkZHxhaGtfY2xhc3N8YWhrX2dyb3VwfGFoa19pZHxhaGtfcGlkfEFsbHxBbG51bXxBbHBoYXxBbHRTdWJtaXR8QWx0VGFifEFsdFRhYkFuZE1lbnV8QWx0VGFiTWVudXxBbHRUYWJNZW51RGlzbWlzc3xBbHdheXNPblRvcHxBdXRvU2l6ZXxCYWNrZ3JvdW5kfEJhY2tncm91bmRUcmFuc3xCZWxvd05vcm1hbHxiZXR3ZWVufEJpdEFuZHxCaXROb3R8Qml0T3J8Qml0U2hpZnRMZWZ0fEJpdFNoaWZ0UmlnaHR8Qml0WE9yfEJvbGR8Qm9yZGVyfEJ1dHRvbnxCeVJlZnxDaGVja2JveHxDaGVja2VkfENoZWNrZWRHcmF5fENob29zZXxDaG9vc2VTdHJpbmd8Q2xpY2t8Q2xvc2V8Q29sb3J8Q29tYm9Cb3h8Q29udGFpbnN8Q29udHJvbExpc3R8Q291bnR8RGF0ZXxEYXRlVGltZXxEYXlzfERETHxEZWZhdWx0fERlbGV0ZXxEZWxldGVBbGx8RGVsaW1pdGVyfERlcmVmfERlc3Ryb3l8RGlnaXR8RGlzYWJsZXxEaXNhYmxlZHxEcm9wRG93bkxpc3R8RWRpdHxFamVjdHxFbHNlfEVuYWJsZXxFbmFibGVkfEVycm9yfEV4aXN0fEV4cHxFeHBhbmR8RXhTdHlsZXxGaWxlU3lzdGVtfEZpcnN0fEZsYXNofEZsb2F0fEZsb2F0RmFzdHxGb2N1c3xGb250fGZvcnxnbG9iYWx8R3JpZHxHcm91cHxHcm91cEJveHxHdWlDbG9zZXxHdWlDb250ZXh0TWVudXxHdWlEcm9wRmlsZXN8R3VpRXNjYXBlfEd1aVNpemV8SGRyfEhpZGRlbnxIaWRlfEhpZ2h8SEtDQ3xIS0NSfEhLQ1V8SEtFWV9DTEFTU0VTX1JPT1R8SEtFWV9DVVJSRU5UX0NPTkZJR3xIS0VZX0NVUlJFTlRfVVNFUnxIS0VZX0xPQ0FMX01BQ0hJTkV8SEtFWV9VU0VSU3xIS0xNfEhLVXxIb3Vyc3xIU2Nyb2xsfEljb258SWNvblNtYWxsfElEfElETGFzdHxJZnxJZkVxdWFsfElmRXhpc3R8SWZHcmVhdGVyfElmR3JlYXRlck9yRXF1YWx8SWZJblN0cmluZ3xJZkxlc3N8SWZMZXNzT3JFcXVhbHxJZk1zZ0JveHxJZk5vdEVxdWFsfElmTm90RXhpc3R8SWZOb3RJblN0cmluZ3xJZldpbkFjdGl2ZXxJZldpbkV4aXN0fElmV2luTm90QWN0aXZlfElmV2luTm90RXhpc3R8SWdub3JlfEltYWdlTGlzdHxpbnxJbnRlZ2VyfEludGVnZXJGYXN0fEludGVycnVwdHxpc3xpdGFsaWN8Sm9pbnxMYWJlbHxMYXN0Rm91bmR8TGFzdEZvdW5kRXhpc3R8TGltaXR8TGluZXN8TGlzdHxMaXN0Qm94fExpc3RWaWV3fExufGxvY2FsfExvY2t8TG9nb2ZmfExvd3xMb3dlcnxMb3dlcmNhc2V8TWFpbldpbmRvd3xNYXJnaW58TWF4aW1pemV8TWF4aW1pemVCb3h8TWF4U2l6ZXxNaW5pbWl6ZXxNaW5pbWl6ZUJveHxNaW5NYXh8TWluU2l6ZXxNaW51dGVzfE1vbnRoQ2FsfE1vdXNlfE1vdmV8TXVsdGl8TkF8Tm98Tm9BY3RpdmF0ZXxOb0RlZmF1bHR8Tm9IaWRlfE5vSWNvbnxOb01haW5XaW5kb3d8bm9ybXxOb3JtYWx8Tm9Tb3J0fE5vU29ydEhkcnxOb1N0YW5kYXJkfE5vdHxOb1RhYnxOb1RpbWVyc3xOdW1iZXJ8T2ZmfE9rfE9ufE93bkRpYWxvZ3N8T3duZXJ8UGFyc2V8UGFzc3dvcmR8UGljdHVyZXxQaXhlbHxQb3N8UG93fFByaW9yaXR5fFByb2Nlc3NOYW1lfFJhZGlvfFJhbmdlfFJlYWR8UmVhZE9ubHl8UmVhbHRpbWV8UmVkcmF3fFJFR19CSU5BUll8UkVHX0RXT1JEfFJFR19FWFBBTkRfU1p8UkVHX01VTFRJX1NafFJFR19TWnxSZWdpb258UmVsYXRpdmV8UmVuYW1lfFJlcG9ydHxSZXNpemV8UmVzdG9yZXxSZXRyeXxSR0J8UmlnaHR8U2NyZWVufFNlY29uZHN8U2VjdGlvbnxTZXJpYWx8U2V0TGFiZWx8U2hpZnRBbHRUYWJ8U2hvd3xTaW5nbGV8U2xpZGVyfFNvcnREZXNjfFN0YW5kYXJkfHN0YXRpY3xTdGF0dXN8U3RhdHVzQmFyfFN0YXR1c0NEfHN0cmlrZXxTdHlsZXxTdWJtaXR8U3lzTWVudXxUYWJ8VGFiMnxUYWJTdG9wfFRleHR8VGhlbWV8VGlsZXxUb2dnbGVDaGVja3xUb2dnbGVFbmFibGV8VG9vbFdpbmRvd3xUb3B8VG9wbW9zdHxUcmFuc0NvbG9yfFRyYW5zcGFyZW50fFRyYXl8VHJlZVZpZXd8VHJ5QWdhaW58VHlwZXxVbkNoZWNrfHVuZGVybGluZXxVbmljb2RlfFVubG9ja3xVcERvd258VXBwZXJ8VXBwZXJjYXNlfFVzZUVycm9yTGV2ZWx8VmlzfFZpc0ZpcnN0fFZpc2libGV8VlNjcm9sbHxXYWl0fFdhaXRDbG9zZXxXYW50Q3RybEF8V2FudEYyfFdhbnRSZXR1cm58V2hpbGV8V3JhcHxYZGlnaXR8eG18eHB8eHN8WWVzfHltfHlwfHlzKVxcYi9pXHJcbn07XG4vLyBUT0RPOlxuLy8gXHRcdC0gU3VwcG9ydCBmb3Igb3V0bGluZSBwYXJhbWV0ZXJzXG4vLyBcdFx0LSBTdXBwb3J0IGZvciB0YWJsZXNcblxuUHJpc20ubGFuZ3VhZ2VzLmdoZXJraW4gPSB7XG5cdCdjb21tZW50Jzoge1xuXHRcdHBhdHRlcm46IC8oXnxbXlxcXFxdKShcXC9cXCpbXFx3XFxXXSo/XFwqXFwvfCgoIyl8KFxcL1xcLykpLio/KFxccj9cXG58JCkpL2csXG5cdFx0bG9va2JlaGluZDogdHJ1ZVxuXHR9LFxuXHQnc3RyaW5nJzogLyhcInwnKShcXFxcPy4pKj9cXDEvZyxcblx0J2F0cnVsZSc6IC9cXGIoQW5kfEdpdmVufFdoZW58VGhlbnxJbiBvcmRlciB0b3xBcyBhbnxJIHdhbnQgdG98QXMgYSlcXGIvZyxcblx0J2tleXdvcmQnOiAvXFxiKFNjZW5hcmlvIE91dGxpbmV8U2NlbmFyaW98RmVhdHVyZXxCYWNrZ3JvdW5kfFN0b3J5KVxcYi9nLFxufTtcblxuUHJpc20ubGFuZ3VhZ2VzLmxhdGV4ID0ge1xuXHQnY29tbWVudCc6IC8lLio/KFxccj9cXG58JCkkL20sXG5cdCdzdHJpbmcnOiAvKFxcJCkoXFxcXD8uKSo/XFwxL2csXG5cdCdwdW5jdHVhdGlvbic6IC9be31dL2csXG5cdCdzZWxlY3Rvcic6IC9cXFxcW2EtejssOlxcLl0qL2lcbn1cbi8qKlxuICogT3JpZ2luYWwgYnkgU2FtdWVsIEZsb3Jlc1xuICpcbiAqIEFkZHMgdGhlIGZvbGxvd2luZyBuZXcgdG9rZW4gY2xhc3NlczpcbiAqIFx0XHRjb25zdGFudCwgYnVpbHRpbiwgdmFyaWFibGUsIHN5bWJvbCwgcmVnZXhcbiAqL1xuUHJpc20ubGFuZ3VhZ2VzLnJ1YnkgPSBQcmlzbS5sYW5ndWFnZXMuZXh0ZW5kKCdjbGlrZScsIHtcblx0J2NvbW1lbnQnOiAvI1teXFxyXFxuXSooXFxyP1xcbnwkKS9nLFxuXHQna2V5d29yZCc6IC9cXGIoYWxpYXN8YW5kfEJFR0lOfGJlZ2lufGJyZWFrfGNhc2V8Y2xhc3N8ZGVmfGRlZmluZV9tZXRob2R8ZGVmaW5lZHxkb3xlYWNofGVsc2V8ZWxzaWZ8RU5EfGVuZHxlbnN1cmV8ZmFsc2V8Zm9yfGlmfGlufG1vZHVsZXxuZXd8bmV4dHxuaWx8bm90fG9yfHJhaXNlfHJlZG98cmVxdWlyZXxyZXNjdWV8cmV0cnl8cmV0dXJufHNlbGZ8c3VwZXJ8dGhlbnx0aHJvd3x0cnVlfHVuZGVmfHVubGVzc3x1bnRpbHx3aGVufHdoaWxlfHlpZWxkKVxcYi9nLFxuXHQnYnVpbHRpbic6IC9cXGIoQXJyYXl8QmlnbnVtfEJpbmRpbmd8Q2xhc3N8Q29udGludWF0aW9ufERpcnxFeGNlcHRpb258RmFsc2VDbGFzc3xGaWxlfFN0YXR8RmlsZXxGaXhudW18RmxvYWR8SGFzaHxJbnRlZ2VyfElPfE1hdGNoRGF0YXxNZXRob2R8TW9kdWxlfE5pbENsYXNzfE51bWVyaWN8T2JqZWN0fFByb2N8UmFuZ2V8UmVnZXhwfFN0cmluZ3xTdHJ1Y3R8VE1TfFN5bWJvbHxUaHJlYWRHcm91cHxUaHJlYWR8VGltZXxUcnVlQ2xhc3MpXFxiLyxcblx0J2NvbnN0YW50JzogL1xcYltBLVpdW2EtekEtWl8wLTldKls/IV0/XFxiL2dcbn0pO1xuXG5QcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKCdydWJ5JywgJ2tleXdvcmQnLCB7XG5cdCdyZWdleCc6IHtcblx0XHRwYXR0ZXJuOiAvKF58W14vXSlcXC8oPyFcXC8pKFxcWy4rP118XFxcXC58W14vXFxyXFxuXSkrXFwvW2dpbV17MCwzfSg/PVxccyooJHxbXFxyXFxuLC47fSldKSkvZyxcblx0XHRsb29rYmVoaW5kOiB0cnVlXG5cdH0sXG5cdCd2YXJpYWJsZSc6IC9bQCRdK1xcYlthLXpBLVpfXVthLXpBLVpfMC05XSpbPyFdP1xcYi9nLFxuXHQnc3ltYm9sJzogLzpcXGJbYS16QS1aX11bYS16QS1aXzAtOV0qWz8hXT9cXGIvZ1xufSk7XG5cblByaXNtLmxhbmd1YWdlcy5iYXNoID0gUHJpc20ubGFuZ3VhZ2VzLmV4dGVuZCgnY2xpa2UnLCB7XG5cdCdjb21tZW50Jzoge1xuXHRcdHBhdHRlcm46IC8oXnxbXlwie1xcXFxdKSgjLio/KFxccj9cXG58JCkpL2csXG5cdFx0bG9va2JlaGluZDogdHJ1ZVxuXHR9LFxuXHQnc3RyaW5nJzoge1xuXHRcdC8vYWxsb3cgbXVsdGlsaW5lIHN0cmluZ1xuXHRcdHBhdHRlcm46IC8oXCJ8JykoXFxcXD9bXFxzXFxTXSkqP1xcMS9nLFxuXHRcdGluc2lkZToge1xuXHRcdFx0Ly8ncHJvcGVydHknIGNsYXNzIHJldXNlZCBmb3IgYmFzaCB2YXJpYWJsZXNcblx0XHRcdCdwcm9wZXJ0eSc6IC9cXCQoW2EtekEtWjAtOV8jXFw/XFwtXFwqIUBdK3xcXHtbXlxcfV0rXFx9KS9nXG5cdFx0fVxuXHR9LFxuXHQna2V5d29yZCc6IC9cXGIoaWZ8dGhlbnxlbHNlfGVsaWZ8Zml8Zm9yfGJyZWFrfGNvbnRpbnVlfHdoaWxlfGlufGNhc2V8ZnVuY3Rpb258c2VsZWN0fGRvfGRvbmV8dW50aWx8ZWNob3xleGl0fHJldHVybnxzZXR8ZGVjbGFyZSlcXGIvZ1xufSk7XG5cblByaXNtLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoJ2Jhc2gnLCAna2V5d29yZCcsIHtcblx0Ly8ncHJvcGVydHknIGNsYXNzIHJldXNlZCBmb3IgYmFzaCB2YXJpYWJsZXNcblx0J3Byb3BlcnR5JzogL1xcJChbYS16QS1aMC05XyNcXD9cXC1cXCohQF0rfFxce1tefV0rXFx9KS9nXG59KTtcblByaXNtLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoJ2Jhc2gnLCAnY29tbWVudCcsIHtcblx0Ly9zaGViYW5nIG11c3QgYmUgYmVmb3JlIGNvbW1lbnQsICdpbXBvcnRhbnQnIGNsYXNzIGZyb20gY3NzIHJldXNlZFxuXHQnaW1wb3J0YW50JzogLyheIyFcXHMqXFwvYmluXFwvYmFzaCl8KF4jIVxccypcXC9iaW5cXC9zaCkvZ1xufSk7XG5cblByaXNtLmxhbmd1YWdlcy5naXQgPSB7XG5cdC8qXG5cdCAqIEEgc2ltcGxlIG9uZSBsaW5lIGNvbW1lbnQgbGlrZSBpbiBhIGdpdCBzdGF0dXMgY29tbWFuZFxuXHQgKiBGb3IgaW5zdGFuY2U6XG5cdCAqICQgZ2l0IHN0YXR1c1xuXHQgKiAjIE9uIGJyYW5jaCBpbmZpbml0ZS1zY3JvbGxcblx0ICogIyBZb3VyIGJyYW5jaCBhbmQgJ29yaWdpbi9zaGFyZWRCcmFuY2hlcy9mcm9udGVuZFRlYW0vaW5maW5pdGUtc2Nyb2xsJyBoYXZlIGRpdmVyZ2VkLFxuXHQgKiAjIGFuZCBoYXZlIDEgYW5kIDIgZGlmZmVyZW50IGNvbW1pdHMgZWFjaCwgcmVzcGVjdGl2ZWx5LlxuXHQgKiBub3RoaW5nIHRvIGNvbW1pdCAod29ya2luZyBkaXJlY3RvcnkgY2xlYW4pXG5cdCAqL1xuXHQnY29tbWVudCc6IC9eIy4qJC9tLFxuXG5cdC8qXG5cdCAqIGEgc3RyaW5nIChkb3VibGUgYW5kIHNpbXBsZSBxdW90ZSlcblx0ICovXG5cdCdzdHJpbmcnOiAvKFwifCcpKFxcXFw/LikqP1xcMS9nbSxcblxuXHQvKlxuXHQgKiBhIGdpdCBjb21tYW5kLiBJdCBzdGFydHMgd2l0aCBhIHJhbmRvbSBwcm9tcHQgZmluaXNoaW5nIGJ5IGEgJCwgdGhlbiBcImdpdFwiIHRoZW4gc29tZSBvdGhlciBwYXJhbWV0ZXJzXG5cdCAqIEZvciBpbnN0YW5jZTpcblx0ICogJCBnaXQgYWRkIGZpbGUudHh0XG5cdCAqL1xuXHQnY29tbWFuZCc6IHtcblx0XHRwYXR0ZXJuOiAvXi4qXFwkIGdpdCAuKiQvbSxcblx0XHRpbnNpZGU6IHtcblx0XHRcdC8qXG5cdFx0XHQgKiBBIGdpdCBjb21tYW5kIGNhbiBjb250YWluIGEgcGFyYW1ldGVyIHN0YXJ0aW5nIGJ5IGEgc2luZ2xlIG9yIGEgZG91YmxlIGRhc2ggZm9sbG93ZWQgYnkgYSBzdHJpbmdcblx0XHRcdCAqIEZvciBpbnN0YW5jZTpcblx0XHRcdCAqICQgZ2l0IGRpZmYgLS1jYWNoZWRcblx0XHRcdCAqICQgZ2l0IGxvZyAtcFxuXHRcdFx0ICovXG5cdFx0XHQncGFyYW1ldGVyJzogL1xccygtLXwtKVxcdysvbVxuXHRcdH1cblx0fSxcblxuXHQvKlxuXHQgKiBDb29yZGluYXRlcyBkaXNwbGF5ZWQgaW4gYSBnaXQgZGlmZiBjb21tYW5kXG5cdCAqIEZvciBpbnN0YW5jZTpcblx0ICogJCBnaXQgZGlmZlxuXHQgKiBkaWZmIC0tZ2l0IGZpbGUudHh0IGZpbGUudHh0XG5cdCAqIGluZGV4IDYyMTQ5NTMuLjFkNTRhNTIgMTAwNjQ0XG5cdCAqIC0tLSBmaWxlLnR4dFxuXHQgKiArKysgZmlsZS50eHRcblx0ICogQEAgLTEgKzEsMiBAQFxuXHQgKiAtSGVyZSdzIG15IHRldHggZmlsZVxuXHQgKiArSGVyZSdzIG15IHRleHQgZmlsZVxuXHQgKiArQW5kIHRoaXMgaXMgdGhlIHNlY29uZCBsaW5lXG5cdCAqL1xuXHQnY29vcmQnOiAvXkBALipAQCQvbSxcblxuXHQvKlxuXHQgKiBSZWdleHAgdG8gbWF0Y2ggdGhlIGNoYW5nZWQgbGluZXMgaW4gYSBnaXQgZGlmZiBvdXRwdXQuIENoZWNrIHRoZSBleGFtcGxlIGFib3ZlLlxuXHQgKi9cblx0J2RlbGV0ZWQnOiAvXi0oPyEtKS4rJC9tLFxuXHQnaW5zZXJ0ZWQnOiAvXlxcKyg/IVxcKykuKyQvbSxcblxuXHQvKlxuXHQgKiBNYXRjaCBhIFwiY29tbWl0IFtTSEExXVwiIGxpbmUgaW4gYSBnaXQgbG9nIG91dHB1dC5cblx0ICogRm9yIGluc3RhbmNlOlxuXHQgKiAkIGdpdCBsb2dcblx0ICogY29tbWl0IGExMWExNGVmN2UyNmYyY2E2MmQ0YjM1ZWFjNDU1Y2U2MzZkMGRjMDlcblx0ICogQXV0aG9yOiBsZ2lyYXVkZWxcblx0ICogRGF0ZTogICBNb24gRmViIDE3IDExOjE4OjM0IDIwMTQgKzAxMDBcblx0ICpcblx0ICogICAgIEFkZCBvZiBhIG5ldyBsaW5lXG5cdCAqL1xuXHQnY29tbWl0X3NoYTEnOiAvXmNvbW1pdCBcXHd7NDB9JC9tXG59O1xuXG5QcmlzbS5sYW5ndWFnZXMuc2NhbGEgPSBQcmlzbS5sYW5ndWFnZXMuZXh0ZW5kKCdqYXZhJywge1xuXHQna2V5d29yZCc6IC8oPC18PT4pfFxcYihhYnN0cmFjdHxjYXNlfGNhdGNofGNsYXNzfGRlZnxkb3xlbHNlfGV4dGVuZHN8ZmluYWx8ZmluYWxseXxmb3J8Zm9yU29tZXxpZnxpbXBsaWNpdHxpbXBvcnR8bGF6eXxtYXRjaHxuZXd8bnVsbHxvYmplY3R8b3ZlcnJpZGV8cGFja2FnZXxwcml2YXRlfHByb3RlY3RlZHxyZXR1cm58c2VhbGVkfHNlbGZ8c3VwZXJ8dGhpc3x0aHJvd3x0cmFpdHx0cnl8dHlwZXx2YWx8dmFyfHdoaWxlfHdpdGh8eWllbGQpXFxiL2csXG5cdCdidWlsdGluJzogL1xcYihTdHJpbmd8SW50fExvbmd8U2hvcnR8Qnl0ZXxCb29sZWFufERvdWJsZXxGbG9hdHxDaGFyfEFueXxBbnlSZWZ8QW55VmFsfFVuaXR8Tm90aGluZylcXGIvZyxcblx0J251bWJlcic6IC9cXGIweFtcXGRhLWZdKlxcLj9bXFxkYS1mXFwtXStcXGJ8XFxiXFxkKlxcLj9cXGQrW2VdP1tcXGRdKltkZmxdP1xcYi9naSxcblx0J3N5bWJvbCc6IC8nKFteXFxkXFxzXVxcdyopL2csXG5cdCdzdHJpbmcnOiAvKFwiXCJcIilbXFxXXFx3XSo/XFwxfChcInxcXC8pW1xcV1xcd10qP1xcMnwoJy4nKS9nXG59KTtcbmRlbGV0ZSBQcmlzbS5sYW5ndWFnZXMuc2NhbGFbJ2NsYXNzLW5hbWUnLCdmdW5jdGlvbiddO1xuXG5QcmlzbS5sYW5ndWFnZXMuYyA9IFByaXNtLmxhbmd1YWdlcy5leHRlbmQoJ2NsaWtlJywge1xuXHQvLyBhbGxvdyBmb3IgYyBtdWx0aWxpbmUgc3RyaW5nc1xuXHQnc3RyaW5nJzogLyhcInwnKShbXlxcblxcXFxcXDFdfFxcXFwufFxcXFxcXHIqXFxuKSo/XFwxL2csXG5cdCdrZXl3b3JkJzogL1xcYihhc218dHlwZW9mfGlubGluZXxhdXRvfGJyZWFrfGNhc2V8Y2hhcnxjb25zdHxjb250aW51ZXxkZWZhdWx0fGRvfGRvdWJsZXxlbHNlfGVudW18ZXh0ZXJufGZsb2F0fGZvcnxnb3RvfGlmfGludHxsb25nfHJlZ2lzdGVyfHJldHVybnxzaG9ydHxzaWduZWR8c2l6ZW9mfHN0YXRpY3xzdHJ1Y3R8c3dpdGNofHR5cGVkZWZ8dW5pb258dW5zaWduZWR8dm9pZHx2b2xhdGlsZXx3aGlsZSlcXGIvZyxcblx0J29wZXJhdG9yJzogL1stK117MSwyfXwhPT98PHsxLDJ9PT98PnsxLDJ9PT98XFwtPnw9ezEsMn18XFxefH58JXwmezEsMn18XFx8P1xcfHxcXD98XFwqfFxcLy9nXG59KTtcblxuUHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZSgnYycsICdzdHJpbmcnLCB7XG5cdC8vIHByb3BlcnR5IGNsYXNzIHJldXNlZCBmb3IgbWFjcm8gc3RhdGVtZW50c1xuXHQncHJvcGVydHknOiB7XG5cdFx0Ly8gYWxsb3cgZm9yIG11bHRpbGluZSBtYWNybyBkZWZpbml0aW9uc1xuXHRcdC8vIHNwYWNlcyBhZnRlciB0aGUgIyBjaGFyYWN0ZXIgY29tcGlsZSBmaW5lIHdpdGggZ2NjXG5cdFx0cGF0dGVybjogLygoXnxcXG4pXFxzKikjXFxzKlthLXpdKyhbXlxcblxcXFxdfFxcXFwufFxcXFxcXHIqXFxuKSovZ2ksXG5cdFx0bG9va2JlaGluZDogdHJ1ZSxcblx0XHRpbnNpZGU6IHtcblx0XHRcdC8vIGhpZ2hsaWdodCB0aGUgcGF0aCBvZiB0aGUgaW5jbHVkZSBzdGF0ZW1lbnQgYXMgYSBzdHJpbmdcblx0XHRcdCdzdHJpbmcnOiB7XG5cdFx0XHRcdHBhdHRlcm46IC8oI1xccyppbmNsdWRlXFxzKikoPC4rPz58KFwifCcpKFxcXFw/LikrP1xcMykvZyxcblx0XHRcdFx0bG9va2JlaGluZDogdHJ1ZSxcblx0XHRcdH1cblx0XHR9XG5cdH1cbn0pO1xuXG5kZWxldGUgUHJpc20ubGFuZ3VhZ2VzLmNbJ2NsYXNzLW5hbWUnXTtcbmRlbGV0ZSBQcmlzbS5sYW5ndWFnZXMuY1snYm9vbGVhbiddO1xuUHJpc20ubGFuZ3VhZ2VzLmdvID0gUHJpc20ubGFuZ3VhZ2VzLmV4dGVuZCgnY2xpa2UnLCB7XG5cdCdrZXl3b3JkJzogL1xcYihicmVha3xjYXNlfGNoYW58Y29uc3R8Y29udGludWV8ZGVmYXVsdHxkZWZlcnxlbHNlfGZhbGx0aHJvdWdofGZvcnxmdW5jfGdvKHRvKT98aWZ8aW1wb3J0fGludGVyZmFjZXxtYXB8cGFja2FnZXxyYW5nZXxyZXR1cm58c2VsZWN0fHN0cnVjdHxzd2l0Y2h8dHlwZXx2YXIpXFxiL2csXG5cdCdidWlsdGluJzogL1xcYihib29sfGJ5dGV8Y29tcGxleCg2NHwxMjgpfGVycm9yfGZsb2F0KDMyfDY0KXxydW5lfHN0cmluZ3x1P2ludCg4fDE2fDMyfDY0fCl8dWludHB0cnxhcHBlbmR8Y2FwfGNsb3NlfGNvbXBsZXh8Y29weXxkZWxldGV8aW1hZ3xsZW58bWFrZXxuZXd8cGFuaWN8cHJpbnQobG4pP3xyZWFsfHJlY292ZXIpXFxiL2csXG5cdCdib29sZWFuJzogL1xcYihffGlvdGF8bmlsfHRydWV8ZmFsc2UpXFxiL2csXG5cdCdvcGVyYXRvcic6IC8oWygpe31cXFtcXF1dfFsqXFwvJV4hXT0/fFxcK1s9K10/fC1bPj0tXT98XFx8Wz18XT98Pls9Pl0/fDwoPHxbPS1dKT98PT0/fCYoJnw9fF49Pyk/fFxcLihcXC5cXC4pP3xbLDtdfDo9PykvZyxcblx0J251bWJlcic6IC9cXGIoLT8oMHhbYS1mXFxkXSt8KFxcZCtcXC4/XFxkKnxcXC5cXGQrKShlWy0rXT9cXGQrKT8paT8pXFxiL2lnLFxuXHQnc3RyaW5nJzogLyhcInwnfGApKFxcXFw/LnxcXHJ8XFxuKSo/XFwxL2dcbn0pO1xuZGVsZXRlIFByaXNtLmxhbmd1YWdlcy5nb1snY2xhc3MtbmFtZSddO1xuXG5QcmlzbS5sYW5ndWFnZXMubmFzbSA9IHtcbiAgICAnY29tbWVudCc6IC87LiokL20sXG4gICAgJ3N0cmluZyc6IC8oXCJ8J3xgKShcXFxcPy4pKj9cXDEvZ20sXG4gICAgJ2xhYmVsJzoge1xuICAgICAgICBwYXR0ZXJuOiAvXlxccypbQS1aYS16XFwuX1xcP1xcJF1bXFx3XFwuXFw/XFwkQH4jXSo6L20sXG4gICAgICAgIGFsaWFzOiAnZnVuY3Rpb24nXG4gICAgfSxcbiAgICAna2V5d29yZCc6IFtcbiAgICAgICAgL1xcWz9CSVRTICgxNnwzMnw2NClcXF0/L20sXG4gICAgICAgIC9eXFxzKnNlY3Rpb25cXHMqW2EtekEtWlxcLl0rOj8vaW0sXG4gICAgICAgIC8oPzpleHRlcm58Z2xvYmFsKVteO10qL2ltLFxuICAgICAgICAvKD86Q1BVfEZMT0FUfERFRkFVTFQpLiokL20sXG4gICAgXSxcbiAgICAncmVnaXN0ZXInOiB7XG4gICAgICAgIHBhdHRlcm46IC9cXGIoPzpzdFxcZHxbeHl6XW1tXFxkXFxkP3xbY2R0XXJcXGR8clxcZFxcZD9bYndkXT98W2VyXT9bYWJjZF14fFthYmNkXVtobF18W2VyXT8oYnB8c3B8c2l8ZGkpfFtjZGVmZ3NdcylcXGIvZ2ksIFxuICAgICAgICBhbGlhczogJ3ZhcmlhYmxlJ1xuICAgIH0sXG4gICAgJ251bWJlcic6IC8oXFxifC18KD89XFwkKSkoMFtoSHhYXVtcXGRBLUZhLWZdKlxcLj9bXFxkQS1GYS1mXSsoW3BQXVsrLV0/XFxkKyk/fFxcZFtcXGRBLUZhLWZdK1toSHhYXXxcXCRcXGRbXFxkQS1GYS1mXSp8MFtvT3FRXVswLTddK3xbMC03XStbb09xUV18MFtiQnlZXVswMV0rfFswMV0rW2JCeVldfDBbZER0VF1cXGQrfFxcZCtbZER0VF0/fFxcZCpcXC4/XFxkKyhbRWVdWystXT9cXGQrKT8pXFxiL2csXG4gICAgJ29wZXJhdG9yJzogL1tcXFtcXF1cXCorXFwtXFwvJTw+PSZ8XFwkIV0vZ21cbn07XG5cblByaXNtLmxhbmd1YWdlcy5zY2hlbWUgPSB7XG4gICAgJ2Jvb2xlYW4nIDogLyModHxmKXsxfS8sXG4gICAgJ2NvbW1lbnQnIDogLzsuKi8sXG4gICAgJ2tleXdvcmQnIDoge1xuXHRwYXR0ZXJuIDogLyhbKF0pKGRlZmluZSgtc3ludGF4fC1saWJyYXJ5fC12YWx1ZXMpP3woY2FzZS0pP2xhbWJkYXxsZXQoLXZhbHVlc3wocmVjKT8oXFwqKT8pP3xlbHNlfGlmfGNvbmR8YmVnaW58ZGVsYXl8ZGVsYXktZm9yY2V8cGFyYW1ldGVyaXplfGd1YXJkfHNldCF8KHF1YXNpLSk/cXVvdGV8c3ludGF4LXJ1bGVzKS8sXG5cdGxvb2tiZWhpbmQgOiB0cnVlXG4gICAgfSxcbiAgICAnYnVpbHRpbicgOiB7XG5cdHBhdHRlcm4gOiAgLyhbKF0pKGNvbnN8Y2FyfGNkcnxudWxsXFw/fHBhaXJcXD98Ym9vbGVhblxcP3xlb2Ytb2JqZWN0XFw/fGNoYXJcXD98cHJvY2VkdXJlXFw/fG51bWJlclxcP3xwb3J0XFw/fHN0cmluZ1xcP3x2ZWN0b3JcXD98c3ltYm9sXFw/fGJ5dGV2ZWN0b3JcXD98bGlzdHxjYWxsLXdpdGgtY3VycmVudC1jb250aW51YXRpb258Y2FsbFxcL2NjfGFwcGVuZHxhYnN8YXBwbHl8ZXZhbClcXGIvLFxuXHRsb29rYmVoaW5kIDogdHJ1ZVxuICAgIH0sXG4gICAgJ3N0cmluZycgOiAgLyhbXCJdKSg/Oig/PShcXFxcPykpXFwyLikqP1xcMXwnW14oJ3xcXHMpXSsvLCAvL3RoYW5rcyBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzE3MTQ4MC9yZWdleC1ncmFiYmluZy12YWx1ZXMtYmV0d2Vlbi1xdW90YXRpb24tbWFya3NcbiAgICAnbnVtYmVyJyA6IC8oXFxzfFxcKSlbLStdP1swLTldKlxcLj9bMC05XSsoKFxccyopWy0rXXsxfShcXHMqKVswLTldKlxcLj9bMC05XStpKT8vLFxuICAgICdvcGVyYXRvcic6IC8oXFwqfFxcK3xcXC18XFwlfFxcL3w8PXw9Pnw+PXw8fD18PikvLFxuICAgICdmdW5jdGlvbicgOiB7XG5cdHBhdHRlcm4gOiAvKFsoXSlbXihcXHN8XFwpKV0qXFxzLyxcblx0bG9va2JlaGluZCA6IHRydWVcbiAgICB9LFxuICAgICdwdW5jdHVhdGlvbicgOiAvWygpXS9cbn07XG5cbiAgICBcblxuICAgIFxuXG5QcmlzbS5sYW5ndWFnZXMuZ3Jvb3Z5ID0gUHJpc20ubGFuZ3VhZ2VzLmV4dGVuZCgnY2xpa2UnLCB7XG5cdCdrZXl3b3JkJzogL1xcYihhc3xkZWZ8aW58YWJzdHJhY3R8YXNzZXJ0fGJvb2xlYW58YnJlYWt8Ynl0ZXxjYXNlfGNhdGNofGNoYXJ8Y2xhc3N8Y29uc3R8Y29udGludWV8ZGVmYXVsdHxkb3xkb3VibGV8ZWxzZXxlbnVtfGV4dGVuZHN8ZmluYWx8ZmluYWxseXxmbG9hdHxmb3J8Z290b3xpZnxpbXBsZW1lbnRzfGltcG9ydHxpbnN0YW5jZW9mfGludHxpbnRlcmZhY2V8bG9uZ3xuYXRpdmV8bmV3fHBhY2thZ2V8cHJpdmF0ZXxwcm90ZWN0ZWR8cHVibGljfHJldHVybnxzaG9ydHxzdGF0aWN8c3RyaWN0ZnB8c3VwZXJ8c3dpdGNofHN5bmNocm9uaXplZHx0aGlzfHRocm93fHRocm93c3x0cmFpdHx0cmFuc2llbnR8dHJ5fHZvaWR8dm9sYXRpbGV8d2hpbGUpXFxiL2csXG5cdCdzdHJpbmcnOiAvKFwiXCJcInwnJycpW1xcV1xcd10qP1xcMXwoXCJ8J3xcXC8pW1xcV1xcd10qP1xcMnwoXFwkXFwvKShcXCRcXC9cXCR8W1xcV1xcd10pKj9cXC9cXCQvZyxcblx0J251bWJlcic6IC9cXGIwYlswMV9dK1xcYnxcXGIweFtcXGRhLWZfXSsoXFwuW1xcZGEtZl9wXFwtXSspP1xcYnxcXGJbXFxkX10rKFxcLltcXGRfXStbZV0/W1xcZF0qKT9bZ2xpZGZdXFxifFtcXGRfXSsoXFwuW1xcZF9dKyk/XFxiL2dpLFxuXHQnb3BlcmF0b3InOiB7XG5cdFx0cGF0dGVybjogLyhefFteLl0pKD17MCwyfX58XFw/XFwufFxcKj9cXC5AfFxcLiZ8XFwuezEsMn0oPyFcXC4pfFxcLnsyfTw/KD89XFx3KXwtPnxcXD86fFstK117MSwyfXwhfDw9Pnw+ezEsM318PHsxLDJ9fD17MSwyfXwmezEsMn18XFx8ezEsMn18XFw/fFxcKnsxLDJ9fFxcL3xcXF58JSkvZyxcblx0XHRsb29rYmVoaW5kOiB0cnVlXG5cdH0sXG5cdCdwdW5jdHVhdGlvbic6IC9cXC4rfFt7fVtcXF07KCksOiRdL2dcbn0pO1xuXG5QcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKCdncm9vdnknLCAncHVuY3R1YXRpb24nLCB7XG5cdCdzcG9jay1ibG9jayc6IC9cXGIoc2V0dXB8Z2l2ZW58d2hlbnx0aGVufGFuZHxjbGVhbnVwfGV4cGVjdHx3aGVyZSk6L2dcbn0pO1xuXG5QcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKCdncm9vdnknLCAnZnVuY3Rpb24nLCB7XG5cdCdhbm5vdGF0aW9uJzoge1xuXHRcdHBhdHRlcm46IC8oXnxbXi5dKUBcXHcrLyxcblx0XHRsb29rYmVoaW5kOiB0cnVlXG5cdH1cbn0pO1xuXG5QcmlzbS5ob29rcy5hZGQoJ3dyYXAnLCBmdW5jdGlvbihlbnYpIHtcblx0aWYgKGVudi5sYW5ndWFnZSA9PT0gJ2dyb292eScgJiYgZW52LnR5cGUgPT09ICdzdHJpbmcnKSB7XG5cdFx0dmFyIGRlbGltaXRlciA9IGVudi5jb250ZW50WzBdO1xuXG5cdFx0aWYgKGRlbGltaXRlciAhPSBcIidcIikge1xuXHRcdFx0dmFyIHBhdHRlcm4gPSAvKFteXFxcXF0pKFxcJChcXHsuKj9cXH18W1xcd1xcLl0rKSkvO1xuXHRcdFx0aWYgKGRlbGltaXRlciA9PT0gJyQnKSB7XG5cdFx0XHRcdHBhdHRlcm4gPSAvKFteXFwkXSkoXFwkKFxcey4qP1xcfXxbXFx3XFwuXSspKS87XG5cdFx0XHR9XG5cdFx0XHRlbnYuY29udGVudCA9IFByaXNtLmhpZ2hsaWdodChlbnYuY29udGVudCwge1xuXHRcdFx0XHQnZXhwcmVzc2lvbic6IHtcblx0XHRcdFx0XHRwYXR0ZXJuOiBwYXR0ZXJuLFxuXHRcdFx0XHRcdGxvb2tiZWhpbmQ6IHRydWUsXG5cdFx0XHRcdFx0aW5zaWRlOiBQcmlzbS5sYW5ndWFnZXMuZ3Jvb3Z5XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0XHRlbnYuY2xhc3Nlcy5wdXNoKGRlbGltaXRlciA9PT0gJy8nID8gJ3JlZ2V4JyA6ICdnc3RyaW5nJyk7XG5cdFx0fVxuXHR9XG59KTtcblxuLyoqXG4gKiBPcmlnaW5hbCBieSBKYW4gVC4gU290dCAoaHR0cDovL2dpdGh1Yi5jb20vaWRsZWJlcmcpXG4gKlxuICogSW5jbHVkZXMgYWxsIGNvbW1hbmRzIGFuZCBwbHVnLWlucyBzaGlwcGVkIHdpdGggTlNJUyAzLjBhMlxuICovXG4gUHJpc20ubGFuZ3VhZ2VzLm5zaXMgPSB7XG5cdCdjb21tZW50Jzoge1xuXHRcdHBhdHRlcm46IC8oXnxbXlxcXFxdKShcXC9cXCpbXFx3XFxXXSo/XFwqXFwvfChefFteOl0pKCN8OykuKj8oXFxyP1xcbnwkKSkvZyxcblx0XHRsb29rYmVoaW5kOiB0cnVlXG5cdH0sXG5cdCdzdHJpbmcnOiAvKFwifCcpKFxcXFw/LikqP1xcMS9nLFxuXHQna2V5d29yZCc6IC9cXGIoQWJvcnR8QWRkKEJyYW5kaW5nSW1hZ2V8U2l6ZSl8QWR2U3BsYXNofEFsbG93KFJvb3REaXJJbnN0YWxsfFNraXBGaWxlcyl8QXV0b0Nsb3NlV2luZG93fEJhbm5lcnxCRyhGb250fEdyYWRpZW50fEltYWdlKXxCcmFuZGluZ1RleHR8QnJpbmdUb0Zyb250fENhbGwoXFxifEluc3RETEwpfENhcHRpb258Q2hhbmdlVUl8Q2hlY2tCaXRtYXB8Q2xlYXJFcnJvcnN8Q29tcGxldGVkVGV4dHxDb21wb25lbnRUZXh0fENvcHlGaWxlc3xDUkNDaGVja3xDcmVhdGUoRGlyZWN0b3J5fEZvbnR8U2hvcnRDdXQpfERlbGV0ZShcXGJ8SU5JU2VjfElOSVN0cnxSZWdLZXl8UmVnVmFsdWUpfERldGFpbChQcmludHxzQnV0dG9uVGV4dCl8RGlhbGVyfERpcihUZXh0fFZhcnxWZXJpZnkpfEVuYWJsZVdpbmRvd3xFbnVtKFJlZ0tleXxSZWdWYWx1ZSl8RXhjaHxFeGVjKFxcYnxTaGVsbHxXYWl0KXxFeHBhbmRFbnZTdHJpbmdzfEZpbGUoXFxifEJ1ZlNpemV8Q2xvc2V8RXJyb3JUZXh0fE9wZW58UmVhZHxSZWFkQnl0ZXxSZWFkVVRGMTZMRXxSZWFkV29yZHxXcml0ZVVURjE2TEV8U2Vla3xXcml0ZXxXcml0ZUJ5dGV8V3JpdGVXb3JkKXxGaW5kKENsb3NlfEZpcnN0fE5leHR8V2luZG93KXxGbHVzaElOSXxHZXQoQ3VySW5zdFR5cGV8Q3VycmVudEFkZHJlc3N8RGxnSXRlbXxETExWZXJzaW9ufERMTFZlcnNpb25Mb2NhbHxFcnJvckxldmVsfEZpbGVUaW1lfEZpbGVUaW1lTG9jYWx8RnVsbFBhdGhOYW1lfEZ1bmN0aW9uKFxcYnxBZGRyZXNzfEVuZCl8SW5zdERpckVycm9yfExhYmVsQWRkcmVzc3xUZW1wRmlsZU5hbWUpfEdvdG98SGlkZVdpbmRvd3xJY29ufElmKEFib3J0fEVycm9yc3xGaWxlRXhpc3RzfFJlYm9vdEZsYWd8U2lsZW50KXxJbml0UGx1Z2luc0RpcnxJbnN0YWxsKEJ1dHRvblRleHR8Q29sb3JzfERpcnxEaXJSZWdLZXkpfEluc3RQcm9ncmVzc0ZsYWdzfEluc3QoVHlwZXxUeXBlR2V0VGV4dHxUeXBlU2V0VGV4dCl8SW50KENtcHxDbXBVfEZtdHxPcCl8SXNXaW5kb3d8TGFuZyhETEx8U3RyaW5nKXxMaWNlbnNlKEJrQ29sb3J8RGF0YXxGb3JjZVNlbGVjdGlvbnxMYW5nU3RyaW5nfFRleHQpfExvYWRMYW5ndWFnZUZpbGV8TG9ja1dpbmRvd3xMb2coU2V0fFRleHQpfE1hbmlmZXN0KERQSUF3YXJlfFN1cHBvcnRlZE9TKXxNYXRofE1lc3NhZ2VCb3h8TWlzY0J1dHRvblRleHR8TmFtZXxOb3B8bnMoRGlhbG9nc3xFeGVjKXxOU0lTZGx8T3V0RmlsZXxQYWdlKFxcYnxDYWxsYmFja3MpfFBvcHxQdXNofFF1aXR8UmVhZChFbnZTdHJ8SU5JU3RyfFJlZ0RXT1JEfFJlZ1N0cil8UmVib290fFJlZ0RMTHxSZW5hbWV8UmVxdWVzdEV4ZWN1dGlvbkxldmVsfFJlc2VydmVGaWxlfFJldHVybnxSTURpcnxTZWFyY2hQYXRofFNlY3Rpb24oXFxifEVuZHxHZXRGbGFnc3xHZXRJbnN0VHlwZXN8R2V0U2l6ZXxHZXRUZXh0fEdyb3VwfElufFNldEZsYWdzfFNldEluc3RUeXBlc3xTZXRTaXplfFNldFRleHQpfFNlbmRNZXNzYWdlfFNldChBdXRvQ2xvc2V8QnJhbmRpbmdJbWFnZXxDb21wcmVzc3xDb21wcmVzc29yfENvbXByZXNzb3JEaWN0U2l6ZXxDdGxDb2xvcnN8Q3VySW5zdFR5cGV8RGF0YWJsb2NrT3B0aW1pemV8RGF0ZVNhdmV8RGV0YWlsc1ByaW50fERldGFpbHNWaWV3fEVycm9yTGV2ZWx8RXJyb3JzfEZpbGVBdHRyaWJ1dGVzfEZvbnR8T3V0UGF0aHxPdmVyd3JpdGV8UGx1Z2luVW5sb2FkfFJlYm9vdEZsYWd8UmVnVmlld3xTaGVsbFZhckNvbnRleHR8U2lsZW50KXxTaG93KEluc3REZXRhaWxzfFVuaW5zdERldGFpbHN8V2luZG93KXxTaWxlbnQoSW5zdGFsbHxVbkluc3RhbGwpfFNsZWVwfFNwYWNlVGV4dHN8U3BsYXNofFN0YXJ0TWVudXxTdHIoQ21wfENtcFN8Q3B5fExlbil8U3ViQ2FwdGlvbnxTeXN0ZW18VW5pY29kZXxVbmluc3RhbGwoQnV0dG9uVGV4dHxDYXB0aW9ufEljb258U3ViQ2FwdGlvbnxUZXh0KXxVbmluc3RQYWdlfFVuUmVnRExMfFVzZXJJbmZvfFZhcnxWSShBZGRWZXJzaW9uS2V5fEZpbGVWZXJzaW9ufFByb2R1Y3RWZXJzaW9uKXxWUGF0Y2h8V2luZG93SWNvbnxXcml0ZUlOSVN0cnxXcml0ZVJlZ0JpbnxXcml0ZVJlZ0RXT1JEfFdyaXRlUmVnRXhwYW5kU3RyfFdyaXRlKFJlZ1N0cnxVbmluc3RhbGxlcil8WFBTdHlsZSlcXGIvZyxcblx0J3Byb3BlcnR5JzogL1xcYihhZG1pbnxhbGx8YXV0b3xib3RofGNvbG9yZWR8ZmFsc2V8Zm9yY2V8aGlkZXxoaWdoZXN0fGxhc3R1c2VkfGxlYXZlfGxpc3Rvbmx5fG5vbmV8bm9ybWFsfG5vdHNldHxvZmZ8b258b3BlbnxwcmludHxzaG93fHNpbGVudHxzaWxlbnRsb2d8c21vb3RofHRleHRvbmx5fHRydWV8dXNlcnxBUkNISVZFfEZJTEVfKEFUVFJJQlVURV9BUkNISVZFfEFUVFJJQlVURV9OT1JNQUx8QVRUUklCVVRFX09GRkxJTkV8QVRUUklCVVRFX1JFQURPTkxZfEFUVFJJQlVURV9TWVNURU18QVRUUklCVVRFX1RFTVBPUkFSWSl8SEsoQ1J8Q1V8RER8TE18UER8VSl8SEtFWV8oQ0xBU1NFU19ST09UfENVUlJFTlRfQ09ORklHfENVUlJFTlRfVVNFUnxEWU5fREFUQXxMT0NBTF9NQUNISU5FfFBFUkZPUk1BTkNFX0RBVEF8VVNFUlMpfElEKEFCT1JUfENBTkNFTHxJR05PUkV8Tk98T0t8UkVUUll8WUVTKXxNQl8oQUJPUlRSRVRSWUlHTk9SRXxERUZCVVRUT04xfERFRkJVVFRPTjJ8REVGQlVUVE9OM3xERUZCVVRUT040fElDT05FWENMQU1BVElPTnxJQ09OSU5GT1JNQVRJT058SUNPTlFVRVNUSU9OfElDT05TVE9QfE9LfE9LQ0FOQ0VMfFJFVFJZQ0FOQ0VMfFJJR0hUfFJUTFJFQURJTkd8U0VURk9SRUdST1VORHxUT1BNT1NUfFVTRVJJQ09OfFlFU05PKXxOT1JNQUx8T0ZGTElORXxSRUFET05MWXxTSENUWHxTSEVMTF9DT05URVhUfFNZU1RFTXxURU1QT1JBUlkpXFxiL2csXG5cdCd2YXJpYWJsZSc6IC8oXFwkKFxcKHxcXHspP1stX1xcd10rKShcXCl8XFx9KT8vaSxcblx0J251bWJlcic6IC9cXGItPygweFtcXGRBLUZhLWZdK3xcXGQqXFwuP1xcZCsoW0VlXS0/XFxkKyk/KVxcYi9nLFxuXHQnb3BlcmF0b3InOiAvWy0rXXsxLDJ9fCZsdDs9P3w+PT98PXsxLDN9fCgmYW1wOyl7MSwyfXxcXHw/XFx8fFxcP3xcXCp8XFwvfFxcfnxcXF58XFwlL2csXG5cdCdwdW5jdHVhdGlvbic6IC9be31bXFxdOygpLC46XS9nLFxuXHQnaW1wb3J0YW50JzogL1xcIShhZGRpbmNsdWRlZGlyfGFkZHBsdWdpbmRpcnxhcHBlbmRmaWxlfGNkfGRlZmluZXxkZWxmaWxlfGVjaG98ZWxzZXxlbmRpZnxlcnJvcnxleGVjdXRlfGZpbmFsaXplfGdldGRsbHZlcnNpb25zeXN0ZW18aWZkZWZ8aWZtYWNyb2RlZnxpZm1hY3JvbmRlZnxpZm5kZWZ8aWZ8aW5jbHVkZXxpbnNlcnRtYWNyb3xtYWNyb2VuZHxtYWNyb3xtYWtlbnNpc3xwYWNraGRyfHNlYXJjaHBhcnNlfHNlYXJjaHJlcGxhY2V8dGVtcGZpbGV8dW5kZWZ8dmVyYm9zZXx3YXJuaW5nKVxcYi9naSxcbn07XG5cblByaXNtLmxhbmd1YWdlcy5zY3NzID0gUHJpc20ubGFuZ3VhZ2VzLmV4dGVuZCgnY3NzJywge1xuXHQnY29tbWVudCc6IHtcblx0XHRwYXR0ZXJuOiAvKF58W15cXFxcXSkoXFwvXFwqW1xcd1xcV10qP1xcKlxcL3xcXC9cXC8uKj8oXFxyP1xcbnwkKSkvZyxcblx0XHRsb29rYmVoaW5kOiB0cnVlXG5cdH0sXG5cdC8vIGF0dXJsZSBpcyBqdXN0IHRoZSBAKioqLCBub3QgdGhlIGVudGlyZSBydWxlICh0byBoaWdobGlnaHQgdmFyICYgc3R1ZmZzKVxuXHQvLyArIGFkZCBhYmlsaXR5IHRvIGhpZ2hsaWdodCBudW1iZXIgJiB1bml0IGZvciBtZWRpYSBxdWVyaWVzXG5cdCdhdHJ1bGUnOiAvQFtcXHctXSsoPz1cXHMrKFxcKHxcXHt8OykpL2dpLFxuXHQvLyB1cmwsIGNvbXBhc3NpZmllZFxuXHQndXJsJzogLyhbLWEtel0rLSkqdXJsKD89XFwoKS9naSxcblx0Ly8gQ1NTIHNlbGVjdG9yIHJlZ2V4IGlzIG5vdCBhcHByb3ByaWF0ZSBmb3IgU2Fzc1xuXHQvLyBzaW5jZSB0aGVyZSBjYW4gYmUgbG90IG1vcmUgdGhpbmdzICh2YXIsIEAgZGlyZWN0aXZlLCBuZXN0aW5nLi4pXG5cdC8vIGEgc2VsZWN0b3IgbXVzdCBzdGFydCBhdCB0aGUgZW5kIG9mIGEgcHJvcGVydHkgb3IgYWZ0ZXIgYSBicmFjZSAoZW5kIG9mIG90aGVyIHJ1bGVzIG9yIG5lc3RpbmcpXG5cdC8vIGl0IGNhbiBjb250YWluIHNvbWUgY2FyYWN0ZXJzIHRoYXQgYXJlbid0IHVzZWQgZm9yIGRlZmluaW5nIHJ1bGVzIG9yIGVuZCBvZiBzZWxlY3RvciwgJiAocGFyZW50IHNlbGVjdG9yKSwgb3IgaW50ZXJwb2xhdGVkIHZhcmlhYmxlXG5cdC8vIHRoZSBlbmQgb2YgYSBzZWxlY3RvciBpcyBmb3VuZCB3aGVuIHRoZXJlIGlzIG5vIHJ1bGVzIGluIGl0ICgge30gb3Ige1xcc30pIG9yIGlmIHRoZXJlIGlzIGEgcHJvcGVydHkgKGJlY2F1c2UgYW4gaW50ZXJwb2xhdGVkIHZhclxuXHQvLyBjYW4gXCJwYXNzXCIgYXMgYSBzZWxlY3Rvci0gZS5nOiBwcm9wZXIjeyRlcnR5fSlcblx0Ly8gdGhpcyBvbmUgd2FzIGFyZCB0byBkbywgc28gcGxlYXNlIGJlIGNhcmVmdWwgaWYgeW91IGVkaXQgdGhpcyBvbmUgOilcblx0J3NlbGVjdG9yJzogLyhbXkA7XFx7XFx9XFwoXFwpXT8oW15AO1xce1xcfVxcKFxcKV18JnxcXCNcXHtcXCRbLV9cXHddK1xcfSkrKSg/PVxccypcXHsoXFx9fFxcc3xbXlxcfV0rKDp8XFx7KVteXFx9XSspKS9nbVxufSk7XG5cblByaXNtLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoJ3Njc3MnLCAnYXRydWxlJywge1xuXHQna2V5d29yZCc6IC9AKGlmfGVsc2UgaWZ8ZWxzZXxmb3J8ZWFjaHx3aGlsZXxpbXBvcnR8ZXh0ZW5kfGRlYnVnfHdhcm58bWl4aW58aW5jbHVkZXxmdW5jdGlvbnxyZXR1cm58Y29udGVudCl8KD89QGZvclxccytcXCRbLV9cXHddK1xccykrZnJvbS9pXG59KTtcblxuUHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZSgnc2NzcycsICdwcm9wZXJ0eScsIHtcblx0Ly8gdmFyIGFuZCBpbnRlcnBvbGF0ZWQgdmFyc1xuXHQndmFyaWFibGUnOiAvKChcXCRbLV9cXHddKyl8KCNcXHtcXCRbLV9cXHddK1xcfSkpL2lcbn0pO1xuXG5QcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKCdzY3NzJywgJ2lnbm9yZScsIHtcblx0J3BsYWNlaG9sZGVyJzogLyVbLV9cXHddKy9pLFxuXHQnc3RhdGVtZW50JzogL1xcQiEoZGVmYXVsdHxvcHRpb25hbClcXGIvZ2ksXG5cdCdib29sZWFuJzogL1xcYih0cnVlfGZhbHNlKVxcYi9nLFxuXHQnbnVsbCc6IC9cXGIobnVsbClcXGIvZyxcblx0J29wZXJhdG9yJzogL1xccysoWy0rXXsxLDJ9fD17MSwyfXwhPXxcXHw/XFx8fFxcP3xcXCp8XFwvfFxcJSlcXHMrL2dcbn0pO1xuXG5QcmlzbS5sYW5ndWFnZXMuY29mZmVlc2NyaXB0ID0gUHJpc20ubGFuZ3VhZ2VzLmV4dGVuZCgnamF2YXNjcmlwdCcsIHtcblx0J2NvbW1lbnQnOiBbXG5cdFx0LyhbI117M31cXHMqXFxyP1xcbiguKlxccypcXHIqXFxuKilcXHMqP1xccj9cXG5bI117M30pL2csXG5cdFx0LyhcXHN8XikoWyNdezF9W14jXlxccl5cXG5dezIsfT8oXFxyP1xcbnwkKSkvZ1xuXHRdLFxuXHQna2V5d29yZCc6IC9cXGIodGhpc3x3aW5kb3d8ZGVsZXRlfGNsYXNzfGV4dGVuZHN8bmFtZXNwYWNlfGV4dGVuZHxhcnxsZXR8aWZ8ZWxzZXx3aGlsZXxkb3xmb3J8ZWFjaHxvZnxyZXR1cm58aW58aW5zdGFuY2VvZnxuZXd8d2l0aHx0eXBlb2Z8dHJ5fGNhdGNofGZpbmFsbHl8bnVsbHx1bmRlZmluZWR8YnJlYWt8Y29udGludWUpXFxiL2dcbn0pO1xuXG5QcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKCdjb2ZmZWVzY3JpcHQnLCAna2V5d29yZCcsIHtcblx0J2Z1bmN0aW9uJzoge1xuXHRcdHBhdHRlcm46IC9bYS16fEEtel0rXFxzKls6fD1dXFxzKihcXChbLnxhLXpcXHN8LHw6fHt8fXxcXFwifFxcJ3w9XSpcXCkpP1xccyotJmd0Oy9naSxcblx0XHRpbnNpZGU6IHtcblx0XHRcdCdmdW5jdGlvbi1uYW1lJzogL1tfP2Etei18QS1aLV0rKFxccypbOnw9XSl8IEBbXz8kP2Etei18QS1aLV0rKFxccyopfCAvZyxcblx0XHRcdCdvcGVyYXRvcic6IC9bLStdezEsMn18IXw9PyZsdDt8PT8mZ3Q7fD17MSwyfXwoJmFtcDspezEsMn18XFx8P1xcfHxcXD98XFwqfFxcLy9nXG5cdFx0fVxuXHR9LFxuXHQnYXR0ci1uYW1lJzogL1tfP2Etei18QS1aLV0rKFxccyo6KXwgQFtfPyQ/YS16LXxBLVotXSsoXFxzKil8IC9nXG59KTtcblxuUHJpc20ubGFuZ3VhZ2VzLmhhbmRsZWJhcnMgPSB7XG5cdCdleHByZXNzaW9uJzoge1xuXHRcdHBhdHRlcm46IC9cXHtcXHtcXHtbXFx3XFxXXSs/XFx9XFx9XFx9fFxce1xce1tcXHdcXFddKz9cXH1cXH0vZyxcblx0XHRpbnNpZGU6IHtcblx0XHRcdCdjb21tZW50Jzoge1xuXHRcdFx0XHRwYXR0ZXJuOiAvKFxce1xceykhW1xcd1xcV10qKD89XFx9XFx9KS9nLFxuXHRcdFx0XHRsb29rYmVoaW5kOiB0cnVlXG5cdFx0XHR9LFxuXHRcdFx0J2RlbGltaXRlcic6IHtcblx0XHRcdFx0cGF0dGVybjogL15cXHtcXHtcXHs/fFxcfVxcfVxcfT8kL2lnLFxuXHRcdFx0XHRhbGlhczogJ3B1bmN0dWF0aW9uJ1xuXHRcdFx0fSxcblx0XHRcdCdzdHJpbmcnOiAvKFtcIiddKShcXFxcPy4pKz9cXDEvZyxcblx0XHRcdCdudW1iZXInOiAvXFxiLT8oMHhbXFxkQS1GYS1mXSt8XFxkKlxcLj9cXGQrKFtFZV0tP1xcZCspPylcXGIvZyxcblx0XHRcdCdib29sZWFuJzogL1xcYih0cnVlfGZhbHNlKVxcYi9nLFxuXHRcdFx0J2Jsb2NrJzoge1xuXHRcdFx0XHRwYXR0ZXJuOiAvXihcXHMqfj9cXHMqKVsjXFwvXVxcdysvaWcsXG5cdFx0XHRcdGxvb2tiZWhpbmQ6IHRydWUsXG5cdFx0XHRcdGFsaWFzOiAna2V5d29yZCdcblx0XHRcdH0sXG5cdFx0XHQnYnJhY2tldHMnOiB7XG5cdFx0XHRcdHBhdHRlcm46IC9cXFtbXlxcXV0rXFxdLyxcblx0XHRcdFx0aW5zaWRlOiB7XG5cdFx0XHRcdFx0cHVuY3R1YXRpb246IC9cXFt8XFxdL2csXG5cdFx0XHRcdFx0dmFyaWFibGU6IC9bXFx3XFxXXSsvZ1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0J3B1bmN0dWF0aW9uJzogL1shXCIjJSYnKCkqKywuXFwvOzw9PkBcXFtcXFxcXFxdXmB7fH1+XS9nLFxuXHRcdFx0J3ZhcmlhYmxlJzogL1teIVwiIyUmJygpKissLlxcLzs8PT5AXFxbXFxcXFxcXV5ge3x9fl0rL2dcblx0XHR9XG5cdH1cbn07XG5cbmlmIChQcmlzbS5sYW5ndWFnZXMubWFya3VwKSB7XG5cblx0Ly8gVG9rZW5pemUgYWxsIGlubGluZSBIYW5kbGViYXJzIGV4cHJlc3Npb25zIHRoYXQgYXJlIHdyYXBwZWQgaW4ge3sgfX0gb3Ige3t7IH19fVxuXHQvLyBUaGlzIGFsbG93cyBmb3IgZWFzeSBIYW5kbGViYXJzICsgbWFya3VwIGhpZ2hsaWdodGluZ1xuXHRQcmlzbS5ob29rcy5hZGQoJ2JlZm9yZS1oaWdobGlnaHQnLCBmdW5jdGlvbihlbnYpIHtcblx0XHRjb25zb2xlLmxvZyhlbnYubGFuZ3VhZ2UpO1xuXHRcdGlmIChlbnYubGFuZ3VhZ2UgIT09ICdoYW5kbGViYXJzJykge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGVudi50b2tlblN0YWNrID0gW107XG5cblx0XHRlbnYuYmFja3VwQ29kZSA9IGVudi5jb2RlO1xuXHRcdGVudi5jb2RlID0gZW52LmNvZGUucmVwbGFjZSgvXFx7XFx7XFx7W1xcd1xcV10rP1xcfVxcfVxcfXxcXHtcXHtbXFx3XFxXXSs/XFx9XFx9L2lnLCBmdW5jdGlvbihtYXRjaCkge1xuXHRcdFx0Y29uc29sZS5sb2cobWF0Y2gpO1xuXHRcdFx0ZW52LnRva2VuU3RhY2sucHVzaChtYXRjaCk7XG5cblx0XHRcdHJldHVybiAnX19fSEFORExFQkFSUycgKyBlbnYudG9rZW5TdGFjay5sZW5ndGggKyAnX19fJztcblx0XHR9KTtcblx0fSk7XG5cblx0Ly8gUmVzdG9yZSBlbnYuY29kZSBmb3Igb3RoZXIgcGx1Z2lucyAoZS5nLiBsaW5lLW51bWJlcnMpXG5cdFByaXNtLmhvb2tzLmFkZCgnYmVmb3JlLWluc2VydCcsIGZ1bmN0aW9uKGVudikge1xuXHRcdGlmIChlbnYubGFuZ3VhZ2UgPT09ICdoYW5kbGViYXJzJykge1xuXHRcdFx0ZW52LmNvZGUgPSBlbnYuYmFja3VwQ29kZTtcblx0XHRcdGRlbGV0ZSBlbnYuYmFja3VwQ29kZTtcblx0XHR9XG5cdH0pO1xuXG5cdC8vIFJlLWluc2VydCB0aGUgdG9rZW5zIGFmdGVyIGhpZ2hsaWdodGluZ1xuXHRQcmlzbS5ob29rcy5hZGQoJ2FmdGVyLWhpZ2hsaWdodCcsIGZ1bmN0aW9uKGVudikge1xuXHRcdGlmIChlbnYubGFuZ3VhZ2UgIT09ICdoYW5kbGViYXJzJykge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGZvciAodmFyIGkgPSAwLCB0OyB0ID0gZW52LnRva2VuU3RhY2tbaV07IGkrKykge1xuXHRcdFx0ZW52LmhpZ2hsaWdodGVkQ29kZSA9IGVudi5oaWdobGlnaHRlZENvZGUucmVwbGFjZSgnX19fSEFORExFQkFSUycgKyAoaSArIDEpICsgJ19fXycsIFByaXNtLmhpZ2hsaWdodCh0LCBlbnYuZ3JhbW1hciwgJ2hhbmRsZWJhcnMnKSk7XG5cdFx0fVxuXG5cdFx0ZW52LmVsZW1lbnQuaW5uZXJIVE1MID0gZW52LmhpZ2hsaWdodGVkQ29kZTtcblx0fSk7XG5cblx0Ly8gV3JhcCB0b2tlbnMgaW4gY2xhc3NlcyB0aGF0IGFyZSBtaXNzaW5nIHRoZW1cblx0UHJpc20uaG9va3MuYWRkKCd3cmFwJywgZnVuY3Rpb24oZW52KSB7XG5cdFx0aWYgKGVudi5sYW5ndWFnZSA9PT0gJ2hhbmRsZWJhcnMnICYmIGVudi50eXBlID09PSAnbWFya3VwJykge1xuXHRcdFx0ZW52LmNvbnRlbnQgPSBlbnYuY29udGVudC5yZXBsYWNlKC8oX19fSEFORExFQkFSU1swLTldK19fXykvZywgXCI8c3BhbiBjbGFzcz1cXFwidG9rZW4gaGFuZGxlYmFyc1xcXCI+JDE8L3NwYW4+XCIpO1xuXHRcdH1cblx0fSk7XG5cblx0Ly8gQWRkIHRoZSBydWxlcyBiZWZvcmUgYWxsIG90aGVyc1xuXHRQcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKCdoYW5kbGViYXJzJywgJ2V4cHJlc3Npb24nLCB7XG5cdFx0J21hcmt1cCc6IHtcblx0XHRcdHBhdHRlcm46IC88W14/XVxcLz8oLio/KT4vZyxcblx0XHRcdGluc2lkZTogUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cFxuXHRcdH0sXG5cdFx0J2hhbmRsZWJhcnMnOiAvX19fSEFORExFQkFSU1swLTldK19fXy9nXG5cdH0pO1xufVxuXG5cblByaXNtLmxhbmd1YWdlcy5vYmplY3RpdmVjID0gUHJpc20ubGFuZ3VhZ2VzLmV4dGVuZCgnYycsIHtcblx0J2tleXdvcmQnOiAvKFxcYihhc218dHlwZW9mfGlubGluZXxhdXRvfGJyZWFrfGNhc2V8Y2hhcnxjb25zdHxjb250aW51ZXxkZWZhdWx0fGRvfGRvdWJsZXxlbHNlfGVudW18ZXh0ZXJufGZsb2F0fGZvcnxnb3RvfGlmfGludHxsb25nfHJlZ2lzdGVyfHJldHVybnxzaG9ydHxzaWduZWR8c2l6ZW9mfHN0YXRpY3xzdHJ1Y3R8c3dpdGNofHR5cGVkZWZ8dW5pb258dW5zaWduZWR8dm9pZHx2b2xhdGlsZXx3aGlsZXxpbnxzZWxmfHN1cGVyKVxcYil8KCg/PVtcXHd8QF0pKEBpbnRlcmZhY2V8QGVuZHxAaW1wbGVtZW50YXRpb258QHByb3RvY29sfEBjbGFzc3xAcHVibGljfEBwcm90ZWN0ZWR8QHByaXZhdGV8QHByb3BlcnR5fEB0cnl8QGNhdGNofEBmaW5hbGx5fEB0aHJvd3xAc3ludGhlc2l6ZXxAZHluYW1pY3xAc2VsZWN0b3IpXFxiKS9nLFxuXHQnc3RyaW5nJzogLyg/OihcInwnKShbXlxcblxcXFxcXDFdfFxcXFwufFxcXFxcXHIqXFxuKSo/XFwxKXwoQFwiKFteXFxuXFxcXFwiXXxcXFxcLnxcXFxcXFxyKlxcbikqP1wiKS9nLFxuXHQnb3BlcmF0b3InOiAvWy0rXXsxLDJ9fCE9P3w8ezEsMn09P3w+ezEsMn09P3xcXC0+fD17MSwyfXxcXF58fnwlfCZ7MSwyfXxcXHw/XFx8fFxcP3xcXCp8XFwvfEAvZ1xufSk7XG5cblByaXNtLmxhbmd1YWdlcy5zcWw9IHsgXG5cdCdjb21tZW50Jzoge1xuXHRcdHBhdHRlcm46IC8oXnxbXlxcXFxdKShcXC9cXCpbXFx3XFxXXSo/XFwqXFwvfCgoLS0pfChcXC9cXC8pfCMpLio/KFxccj9cXG58JCkpL2csXG5cdFx0bG9va2JlaGluZDogdHJ1ZVxuXHR9LFxuXHQnc3RyaW5nJyA6IHtcblx0XHRwYXR0ZXJuOiAvKF58W15AXSkoXCJ8JykoXFxcXD9bXFxzXFxTXSkqP1xcMi9nLFxuXHRcdGxvb2tiZWhpbmQ6IHRydWVcblx0fSxcblx0J3ZhcmlhYmxlJzogL0BbXFx3LiRdK3xAKFwifCd8YCkoXFxcXD9bXFxzXFxTXSkrP1xcMS9nLFxuXHQnZnVuY3Rpb24nOiAvXFxiKD86Q09VTlR8U1VNfEFWR3xNSU58TUFYfEZJUlNUfExBU1R8VUNBU0V8TENBU0V8TUlEfExFTnxST1VORHxOT1d8Rk9STUFUKSg/PVxccypcXCgpL2lnLCAvLyBTaG91bGQgd2UgaGlnaGxpZ2h0IHVzZXIgZGVmaW5lZCBmdW5jdGlvbnMgdG9vP1xuXHQna2V5d29yZCc6IC9cXGIoPzpBQ1RJT058QUREfEFGVEVSfEFMR09SSVRITXxBTFRFUnxBTkFMWVpFfEFQUExZfEFTfEFTQ3xBVVRIT1JJWkFUSU9OfEJBQ0tVUHxCREJ8QkVHSU58QkVSS0VMRVlEQnxCSUdJTlR8QklOQVJZfEJJVHxCTE9CfEJPT0x8Qk9PTEVBTnxCUkVBS3xCUk9XU0V8QlRSRUV8QlVMS3xCWXxDQUxMfENBU0NBREV8Q0FTQ0FERUR8Q0FTRXxDSEFJTnxDSEFSIFZBUllJTkd8Q0hBUkFDVEVSIFZBUllJTkd8Q0hFQ0t8Q0hFQ0tQT0lOVHxDTE9TRXxDTFVTVEVSRUR8Q09BTEVTQ0V8Q09MVU1OfENPTFVNTlN8Q09NTUVOVHxDT01NSVR8Q09NTUlUVEVEfENPTVBVVEV8Q09OTkVDVHxDT05TSVNURU5UfENPTlNUUkFJTlR8Q09OVEFJTlN8Q09OVEFJTlNUQUJMRXxDT05USU5VRXxDT05WRVJUfENSRUFURXxDUk9TU3xDVVJSRU5UfENVUlJFTlRfREFURXxDVVJSRU5UX1RJTUV8Q1VSUkVOVF9USU1FU1RBTVB8Q1VSUkVOVF9VU0VSfENVUlNPUnxEQVRBfERBVEFCQVNFfERBVEFCQVNFU3xEQVRFVElNRXxEQkNDfERFQUxMT0NBVEV8REVDfERFQ0lNQUx8REVDTEFSRXxERUZBVUxUfERFRklORVJ8REVMQVlFRHxERUxFVEV8REVOWXxERVNDfERFU0NSSUJFfERFVEVSTUlOSVNUSUN8RElTQUJMRXxESVNDQVJEfERJU0t8RElTVElOQ1R8RElTVElOQ1RST1d8RElTVFJJQlVURUR8RE98RE9VQkxFfERPVUJMRSBQUkVDSVNJT058RFJPUHxEVU1NWXxEVU1QfERVTVBGSUxFfERVUExJQ0FURSBLRVl8RUxTRXxFTkFCTEV8RU5DTE9TRUQgQll8RU5EfEVOR0lORXxFTlVNfEVSUkxWTHxFUlJPUlN8RVNDQVBFfEVTQ0FQRUQgQll8RVhDRVBUfEVYRUN8RVhFQ1VURXxFWElUfEVYUExBSU58RVhURU5ERUR8RkVUQ0h8RklFTERTfEZJTEV8RklMTEZBQ1RPUnxGSVJTVHxGSVhFRHxGTE9BVHxGT0xMT1dJTkd8Rk9SfEZPUiBFQUNIIFJPV3xGT1JDRXxGT1JFSUdOfEZSRUVURVhUfEZSRUVURVhUVEFCTEV8RlJPTXxGVUxMfEZVTkNUSU9OfEdFT01FVFJZfEdFT01FVFJZQ09MTEVDVElPTnxHTE9CQUx8R09UT3xHUkFOVHxHUk9VUHxIQU5ETEVSfEhBU0h8SEFWSU5HfEhPTERMT0NLfElERU5USVRZfElERU5USVRZX0lOU0VSVHxJREVOVElUWUNPTHxJRnxJR05PUkV8SU1QT1JUfElOREVYfElORklMRXxJTk5FUnxJTk5PREJ8SU5PVVR8SU5TRVJUfElOVHxJTlRFR0VSfElOVEVSU0VDVHxJTlRPfElOVk9LRVJ8SVNPTEFUSU9OIExFVkVMfEpPSU58S0VZfEtFWVN8S0lMTHxMQU5HVUFHRSBTUUx8TEFTVHxMRUZUfExJTUlUfExJTkVOT3xMSU5FU3xMSU5FU1RSSU5HfExPQUR8TE9DQUx8TE9DS3xMT05HQkxPQnxMT05HVEVYVHxNQVRDSHxNQVRDSEVEfE1FRElVTUJMT0J8TUVESVVNSU5UfE1FRElVTVRFWFR8TUVSR0V8TUlERExFSU5UfE1PRElGSUVTIFNRTCBEQVRBfE1PRElGWXxNVUxUSUxJTkVTVFJJTkd8TVVMVElQT0lOVHxNVUxUSVBPTFlHT058TkFUSU9OQUx8TkFUSU9OQUwgQ0hBUiBWQVJZSU5HfE5BVElPTkFMIENIQVJBQ1RFUnxOQVRJT05BTCBDSEFSQUNURVIgVkFSWUlOR3xOQVRJT05BTCBWQVJDSEFSfE5BVFVSQUx8TkNIQVJ8TkNIQVIgVkFSQ0hBUnxORVhUfE5PfE5PIFNRTHxOT0NIRUNLfE5PQ1lDTEV8Tk9OQ0xVU1RFUkVEfE5VTExJRnxOVU1FUklDfE9GfE9GRnxPRkZTRVRTfE9OfE9QRU58T1BFTkRBVEFTT1VSQ0V8T1BFTlFVRVJZfE9QRU5ST1dTRVR8T1BUSU1JWkV8T1BUSU9OfE9QVElPTkFMTFl8T1JERVJ8T1VUfE9VVEVSfE9VVEZJTEV8T1ZFUnxQQVJUSUFMfFBBUlRJVElPTnxQRVJDRU5UfFBJVk9UfFBMQU58UE9JTlR8UE9MWUdPTnxQUkVDRURJTkd8UFJFQ0lTSU9OfFBSRVZ8UFJJTUFSWXxQUklOVHxQUklWSUxFR0VTfFBST0N8UFJPQ0VEVVJFfFBVQkxJQ3xQVVJHRXxRVUlDS3xSQUlTRVJST1J8UkVBRHxSRUFEUyBTUUwgREFUQXxSRUFEVEVYVHxSRUFMfFJFQ09ORklHVVJFfFJFRkVSRU5DRVN8UkVMRUFTRXxSRU5BTUV8UkVQRUFUQUJMRXxSRVBMSUNBVElPTnxSRVFVSVJFfFJFU1RPUkV8UkVTVFJJQ1R8UkVUVVJOfFJFVFVSTlN8UkVWT0tFfFJJR0hUfFJPTExCQUNLfFJPVVRJTkV8Uk9XQ09VTlR8Uk9XR1VJRENPTHxST1dTP3xSVFJFRXxSVUxFfFNBVkV8U0FWRVBPSU5UfFNDSEVNQXxTRUxFQ1R8U0VSSUFMfFNFUklBTElaQUJMRXxTRVNTSU9OfFNFU1NJT05fVVNFUnxTRVR8U0VUVVNFUnxTSEFSRSBNT0RFfFNIT1d8U0hVVERPV058U0lNUExFfFNNQUxMSU5UfFNOQVBTSE9UfFNPTUV8U09OQU1FfFNUQVJUfFNUQVJUSU5HIEJZfFNUQVRJU1RJQ1N8U1RBVFVTfFNUUklQRUR8U1lTVEVNX1VTRVJ8VEFCTEV8VEFCTEVTfFRBQkxFU1BBQ0V8VEVNUCg/Ok9SQVJZKT98VEVNUFRBQkxFfFRFUk1JTkFURUQgQll8VEVYVHxURVhUU0laRXxUSEVOfFRJTUVTVEFNUHxUSU5ZQkxPQnxUSU5ZSU5UfFRJTllURVhUfFRPfFRPUHxUUkFOfFRSQU5TQUNUSU9OfFRSQU5TQUNUSU9OU3xUUklHR0VSfFRSVU5DQVRFfFRTRVFVQUx8VFlQRXxUWVBFU3xVTkJPVU5ERUR8VU5DT01NSVRURUR8VU5ERUZJTkVEfFVOSU9OfFVOUElWT1R8VVBEQVRFfFVQREFURVRFWFR8VVNBR0V8VVNFfFVTRVJ8VVNJTkd8VkFMVUV8VkFMVUVTfFZBUkJJTkFSWXxWQVJDSEFSfFZBUkNIQVJBQ1RFUnxWQVJZSU5HfFZJRVd8V0FJVEZPUnxXQVJOSU5HU3xXSEVOfFdIRVJFfFdISUxFfFdJVEh8V0lUSCBST0xMVVB8V0lUSElOfFdPUkt8V1JJVEV8V1JJVEVURVhUKVxcYi9naSxcblx0J2Jvb2xlYW4nOiAvXFxiKD86VFJVRXxGQUxTRXxOVUxMKVxcYi9naSxcblx0J251bWJlcic6IC9cXGItPygweCk/XFxkKlxcLj9bXFxkYS1mXStcXGIvZyxcblx0J29wZXJhdG9yJzogL1xcYig/OkFMTHxBTkR8QU5ZfEJFVFdFRU58RVhJU1RTfElOfExJS0V8Tk9UfE9SfElTfFVOSVFVRXxDSEFSQUNURVIgU0VUfENPTExBVEV8RElWfE9GRlNFVHxSRUdFWFB8UkxJS0V8U09VTkRTIExJS0V8WE9SKVxcYnxbLStdezF9fCF8Wz08Pl17MSwyfXwoJil7MSwyfXxcXHw/XFx8fFxcP3xcXCp8XFwvL2dpLFxuXHQncHVuY3R1YXRpb24nOiAvWztbXFxdKClgLC5dL2dcbn07XG5QcmlzbS5sYW5ndWFnZXMuaGFza2VsbD0ge1xuXHQnY29tbWVudCc6IHtcblx0XHRwYXR0ZXJuOiAvKF58W14tISMkJSorPVxcPyZAfH4uOjw+XlxcXFxdKSgtLVteLSEjJCUqKz1cXD8mQHx+Ljo8Pl5cXFxcXS4qKFxccj9cXG58JCl8ey1bXFx3XFxXXSo/LX0pL2dtLFxuXHRcdGxvb2tiZWhpbmQ6IHRydWVcblx0fSxcblx0J2NoYXInOiAvJyhbXlxcXFxcIl18XFxcXChbYWJmbnJ0dlxcXFxcIicmXXxcXF5bQS1aQFtcXF1cXF5fXXxOVUx8U09IfFNUWHxFVFh8RU9UfEVOUXxBQ0t8QkVMfEJTfEhUfExGfFZUfEZGfENSfFNPfFNJfERMRXxEQzF8REMyfERDM3xEQzR8TkFLfFNZTnxFVEJ8Q0FOfEVNfFNVQnxFU0N8RlN8R1N8UlN8VVN8U1B8REVMfFxcZCt8b1swLTddK3x4WzAtOWEtZkEtRl0rKSknL2csXG5cdCdzdHJpbmcnOiAvXCIoW15cXFxcXCJdfFxcXFwoW2FiZm5ydHZcXFxcXCInJl18XFxeW0EtWkBbXFxdXFxeX118TlVMfFNPSHxTVFh8RVRYfEVPVHxFTlF8QUNLfEJFTHxCU3xIVHxMRnxWVHxGRnxDUnxTT3xTSXxETEV8REMxfERDMnxEQzN8REM0fE5BS3xTWU58RVRCfENBTnxFTXxTVUJ8RVNDfEZTfEdTfFJTfFVTfFNQfERFTHxcXGQrfG9bMC03XSt8eFswLTlhLWZBLUZdKyl8XFxcXFxccytcXFxcKSpcIi9nLFxuXHQna2V5d29yZCcgOiAvXFxiKGNhc2V8Y2xhc3N8ZGF0YXxkZXJpdmluZ3xkb3xlbHNlfGlmfGlufGluZml4bHxpbmZpeHJ8aW5zdGFuY2V8bGV0fG1vZHVsZXxuZXd0eXBlfG9mfHByaW1pdGl2ZXx0aGVufHR5cGV8d2hlcmUpXFxiL2csXG5cdCdpbXBvcnRfc3RhdGVtZW50JyA6IHtcblx0XHQvLyBUaGUgaW1wb3J0ZWQgb3IgaGlkZGVuIG5hbWVzIGFyZSBub3QgaW5jbHVkZWQgaW4gdGhpcyBpbXBvcnRcblx0XHQvLyBzdGF0ZW1lbnQuIFRoaXMgaXMgYmVjYXVzZSB3ZSB3YW50IHRvIGhpZ2hsaWdodCB0aG9zZSBleGFjdGx5IGxpa2Vcblx0XHQvLyB3ZSBkbyBmb3IgdGhlIG5hbWVzIGluIHRoZSBwcm9ncmFtLlxuXHRcdHBhdHRlcm46IC8oXFxufF4pXFxzKihpbXBvcnQpXFxzKyhxdWFsaWZpZWRcXHMrKT8oKFtBLVpdW19hLXpBLVowLTknXSopKFxcLltBLVpdW19hLXpBLVowLTknXSopKikoXFxzKyhhcylcXHMrKChbQS1aXVtfYS16QS1aMC05J10qKShcXC5bQS1aXVtfYS16QS1aMC05J10qKSopKT8oXFxzK2hpZGluZ1xcYik/L2dtLFxuXHRcdGluc2lkZToge1xuXHRcdFx0J2tleXdvcmQnOiAvXFxiKGltcG9ydHxxdWFsaWZpZWR8YXN8aGlkaW5nKVxcYi9nXG5cdFx0fVxuXHR9LFxuXHQvLyBUaGVzZSBhcmUgYnVpbHRpbiB2YXJpYWJsZXMgb25seS4gQ29uc3RydWN0b3JzIGFyZSBoaWdobGlnaHRlZCBsYXRlciBhcyBhIGNvbnN0YW50LlxuXHQnYnVpbHRpbic6IC9cXGIoYWJzfGFjb3N8YWNvc2h8YWxsfGFuZHxhbnl8YXBwZW5kRmlsZXxhcHByb3hSYXRpb25hbHxhc1R5cGVPZnxhc2lufGFzaW5ofGF0YW58YXRhbjJ8YXRhbmh8YmFzaWNJT1J1bnxicmVha3xjYXRjaHxjZWlsaW5nfGNocnxjb21wYXJlfGNvbmNhdHxjb25jYXRNYXB8Y29uc3R8Y29zfGNvc2h8Y3Vycnl8Y3ljbGV8ZGVjb2RlRmxvYXR8ZGVub21pbmF0b3J8ZGlnaXRUb0ludHxkaXZ8ZGl2TW9kfGRyb3B8ZHJvcFdoaWxlfGVpdGhlcnxlbGVtfGVuY29kZUZsb2F0fGVudW1Gcm9tfGVudW1Gcm9tVGhlbnxlbnVtRnJvbVRoZW5Ub3xlbnVtRnJvbVRvfGVycm9yfGV2ZW58ZXhwfGV4cG9uZW50fGZhaWx8ZmlsdGVyfGZsaXB8ZmxvYXREaWdpdHN8ZmxvYXRSYWRpeHxmbG9hdFJhbmdlfGZsb29yfGZtYXB8Zm9sZGx8Zm9sZGwxfGZvbGRyfGZvbGRyMXxmcm9tRG91YmxlfGZyb21FbnVtfGZyb21JbnR8ZnJvbUludGVnZXJ8ZnJvbUludGVncmFsfGZyb21SYXRpb25hbHxmc3R8Z2NkfGdldENoYXJ8Z2V0Q29udGVudHN8Z2V0TGluZXxncm91cHxoZWFkfGlkfGluUmFuZ2V8aW5kZXh8aW5pdHxpbnRUb0RpZ2l0fGludGVyYWN0fGlvRXJyb3J8aXNBbHBoYXxpc0FscGhhTnVtfGlzQXNjaWl8aXNDb250cm9sfGlzRGVub3JtYWxpemVkfGlzRGlnaXR8aXNIZXhEaWdpdHxpc0lFRUV8aXNJbmZpbml0ZXxpc0xvd2VyfGlzTmFOfGlzTmVnYXRpdmVaZXJvfGlzT2N0RGlnaXR8aXNQcmludHxpc1NwYWNlfGlzVXBwZXJ8aXRlcmF0ZXxsYXN0fGxjbXxsZW5ndGh8bGV4fGxleERpZ2l0c3xsZXhMaXRDaGFyfGxpbmVzfGxvZ3xsb2dCYXNlfGxvb2t1cHxtYXB8bWFwTXxtYXBNX3xtYXh8bWF4Qm91bmR8bWF4aW11bXxtYXliZXxtaW58bWluQm91bmR8bWluaW11bXxtb2R8bmVnYXRlfG5vdHxub3RFbGVtfG51bGx8bnVtZXJhdG9yfG9kZHxvcnxvcmR8b3RoZXJ3aXNlfHBhY2t8cGl8cHJlZHxwcmltRXhpdFdpdGh8cHJpbnR8cHJvZHVjdHxwcm9wZXJGcmFjdGlvbnxwdXRDaGFyfHB1dFN0cnxwdXRTdHJMbnxxdW90fHF1b3RSZW18cmFuZ2V8cmFuZ2VTaXplfHJlYWR8cmVhZERlY3xyZWFkRmlsZXxyZWFkRmxvYXR8cmVhZEhleHxyZWFkSU98cmVhZEludHxyZWFkTGlzdHxyZWFkTGl0Q2hhcnxyZWFkTG58cmVhZE9jdHxyZWFkUGFyZW58cmVhZFNpZ25lZHxyZWFkc3xyZWFkc1ByZWN8cmVhbFRvRnJhY3xyZWNpcHxyZW18cmVwZWF0fHJlcGxpY2F0ZXxyZXR1cm58cmV2ZXJzZXxyb3VuZHxzY2FsZUZsb2F0fHNjYW5sfHNjYW5sMXxzY2FucnxzY2FucjF8c2VxfHNlcXVlbmNlfHNlcXVlbmNlX3xzaG93fHNob3dDaGFyfHNob3dJbnR8c2hvd0xpc3R8c2hvd0xpdENoYXJ8c2hvd1BhcmVufHNob3dTaWduZWR8c2hvd1N0cmluZ3xzaG93c3xzaG93c1ByZWN8c2lnbmlmaWNhbmR8c2lnbnVtfHNpbnxzaW5ofHNuZHxzb3J0fHNwYW58c3BsaXRBdHxzcXJ0fHN1YnRyYWN0fHN1Y2N8c3VtfHRhaWx8dGFrZXx0YWtlV2hpbGV8dGFufHRhbmh8dGhyZWFkVG9JT1Jlc3VsdHx0b0VudW18dG9JbnR8dG9JbnRlZ2VyfHRvTG93ZXJ8dG9SYXRpb25hbHx0b1VwcGVyfHRydW5jYXRlfHVuY3Vycnl8dW5kZWZpbmVkfHVubGluZXN8dW50aWx8dW53b3Jkc3x1bnppcHx1bnppcDN8dXNlckVycm9yfHdvcmRzfHdyaXRlRmlsZXx6aXB8emlwM3x6aXBXaXRofHppcFdpdGgzKVxcYi9nLFxuXHQvLyBkZWNpbWFsIGludGVnZXJzIGFuZCBmbG9hdGluZyBwb2ludCBudW1iZXJzIHwgb2N0YWwgaW50ZWdlcnMgfCBoZXhhZGVjaW1hbCBpbnRlZ2Vyc1xuXHQnbnVtYmVyJyA6IC9cXGIoXFxkKyhcXC5cXGQrKT8oW2VFXVsrLV0/XFxkKyk/fDBbT29dWzAtN10rfDBbWHhdWzAtOWEtZkEtRl0rKVxcYi9nLFxuXHQvLyBNb3N0IG9mIHRoaXMgaXMgbmVlZGVkIGJlY2F1c2Ugb2YgdGhlIG1lYW5pbmcgb2YgYSBzaW5nbGUgJy4nLlxuXHQvLyBJZiBpdCBzdGFuZHMgYWxvbmUgZnJlZWx5LCBpdCBpcyB0aGUgZnVuY3Rpb24gY29tcG9zaXRpb24uXG5cdC8vIEl0IG1heSBhbHNvIGJlIGEgc2VwYXJhdG9yIGJldHdlZW4gYSBtb2R1bGUgbmFtZSBhbmQgYW4gaWRlbnRpZmllciA9PiBub1xuXHQvLyBvcGVyYXRvci4gSWYgaXQgY29tZXMgdG9nZXRoZXIgd2l0aCBvdGhlciBzcGVjaWFsIGNoYXJhY3RlcnMgaXQgaXMgYW5cblx0Ly8gb3BlcmF0b3IgdG9vLlxuXHQnb3BlcmF0b3InIDogL1xcc1xcLlxcc3woWy0hIyQlKis9XFw/JkB8fjo8Pl5cXFxcXSpcXC5bLSEjJCUqKz1cXD8mQHx+Ojw+XlxcXFxdKyl8KFstISMkJSorPVxcPyZAfH46PD5eXFxcXF0rXFwuWy0hIyQlKis9XFw/JkB8fjo8Pl5cXFxcXSopfFstISMkJSorPVxcPyZAfH46PD5eXFxcXF0rfChgKFtBLVpdW19hLXpBLVowLTknXSpcXC4pKltfYS16XVtfYS16QS1aMC05J10qYCkvZyxcblx0Ly8gSW4gSGFza2VsbCwgbmVhcmx5IGV2ZXJ5dGhpbmcgaXMgYSB2YXJpYWJsZSwgZG8gbm90IGhpZ2hsaWdodCB0aGVzZS5cblx0J2h2YXJpYWJsZSc6IC9cXGIoW0EtWl1bX2EtekEtWjAtOSddKlxcLikqW19hLXpdW19hLXpBLVowLTknXSpcXGIvZyxcblx0J2NvbnN0YW50JzogL1xcYihbQS1aXVtfYS16QS1aMC05J10qXFwuKSpbQS1aXVtfYS16QS1aMC05J10qXFxiL2csXG5cdCdwdW5jdHVhdGlvbicgOiAvW3t9W1xcXTsoKSwuOl0vZ1xufTtcblxuUHJpc20ubGFuZ3VhZ2VzLnBlcmwgPSB7XG5cdCdjb21tZW50JzogW1xuXHRcdHtcblx0XHRcdC8vIFBPRFxuXHRcdFx0cGF0dGVybjogLygoPzpefFxcbilcXHMqKT1cXHcrW1xcc1xcU10qPz1jdXQuKy9nLFxuXHRcdFx0bG9va2JlaGluZDogdHJ1ZVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0cGF0dGVybjogLyhefFteXFxcXCRdKSMuKj8oXFxyP1xcbnwkKS9nLFxuXHRcdFx0bG9va2JlaGluZDogdHJ1ZVxuXHRcdH1cblx0XSxcblx0Ly8gVE9ETyBDb3VsZCBiZSBuaWNlIHRvIGhhbmRsZSBIZXJlZG9jIHRvby5cblx0J3N0cmluZyc6IFtcblx0XHQvLyBxLy4uLi9cblx0XHQvXFxiKD86cXxxcXxxeHxxdylcXHMqKFteYS16QS1aMC05XFxzXFx7XFwoXFxbPF0pKFxcXFw/LikqP1xccypcXDEvZyxcblx0XG5cdFx0Ly8gcSBhLi4uYVxuXHRcdC9cXGIoPzpxfHFxfHF4fHF3KVxccysoW2EtekEtWjAtOV0pKFxcXFw/LikqP1xccypcXDEvZyxcblx0XG5cdFx0Ly8gcSguLi4pXG5cdFx0L1xcYig/OnF8cXF8cXh8cXcpXFxzKlxcKChbXigpXXxcXFxcLikqXFxzKlxcKS9nLFxuXHRcblx0XHQvLyBxey4uLn1cblx0XHQvXFxiKD86cXxxcXxxeHxxdylcXHMqXFx7KFtee31dfFxcXFwuKSpcXHMqXFx9L2csXG5cdFxuXHRcdC8vIHFbLi4uXVxuXHRcdC9cXGIoPzpxfHFxfHF4fHF3KVxccypcXFsoW15bXFxdXXxcXFxcLikqXFxzKlxcXS9nLFxuXHRcblx0XHQvLyBxPC4uLj5cblx0XHQvXFxiKD86cXxxcXxxeHxxdylcXHMqPChbXjw+XXxcXFxcLikqXFxzKj4vZyxcblxuXHRcdC8vIFwiLi4uXCIsICcuLi4nLCBgLi4uYFxuXHRcdC8oXCJ8J3xgKShcXFxcPy4pKj9cXDEvZ1xuXHRdLFxuXHQncmVnZXgnOiBbXG5cdFx0Ly8gbS8uLi4vXG5cdFx0L1xcYig/Om18cXIpXFxzKihbXmEtekEtWjAtOVxcc1xce1xcKFxcWzxdKShcXFxcPy4pKj9cXHMqXFwxW21zaXhwb2R1YWxnY10qL2csXG5cdFxuXHRcdC8vIG0gYS4uLmFcblx0XHQvXFxiKD86bXxxcilcXHMrKFthLXpBLVowLTldKShcXFxcPy4pKj9cXHMqXFwxW21zaXhwb2R1YWxnY10qL2csXG5cdFxuXHRcdC8vIG0oLi4uKVxuXHRcdC9cXGIoPzptfHFyKVxccypcXCgoW14oKV18XFxcXC4pKlxccypcXClbbXNpeHBvZHVhbGdjXSovZyxcblx0XG5cdFx0Ly8gbXsuLi59XG5cdFx0L1xcYig/Om18cXIpXFxzKlxceyhbXnt9XXxcXFxcLikqXFxzKlxcfVttc2l4cG9kdWFsZ2NdKi9nLFxuXHRcblx0XHQvLyBtWy4uLl1cblx0XHQvXFxiKD86bXxxcilcXHMqXFxbKFteW1xcXV18XFxcXC4pKlxccypcXF1bbXNpeHBvZHVhbGdjXSovZyxcblx0XG5cdFx0Ly8gbTwuLi4+XG5cdFx0L1xcYig/Om18cXIpXFxzKjwoW148Pl18XFxcXC4pKlxccyo+W21zaXhwb2R1YWxnY10qL2csXG5cdFxuXHRcdC8vIHMvLi4uLy4uLi9cblx0XHQvXFxiKD86c3x0cnx5KVxccyooW15hLXpBLVowLTlcXHNcXHtcXChcXFs8XSkoXFxcXD8uKSo/XFxzKlxcMVxccyooKD8hXFwxKS58XFxcXC4pKlxccypcXDFbbXNpeHBvZHVhbGdjZXJdKi9nLFxuXHRcblx0XHQvLyBzIGEuLi5hLi4uYVxuXHRcdC9cXGIoPzpzfHRyfHkpXFxzKyhbYS16QS1aMC05XSkoXFxcXD8uKSo/XFxzKlxcMVxccyooKD8hXFwxKS58XFxcXC4pKlxccypcXDFbbXNpeHBvZHVhbGdjZXJdKi9nLFxuXHRcblx0XHQvLyBzKC4uLikoLi4uKVxuXHRcdC9cXGIoPzpzfHRyfHkpXFxzKlxcKChbXigpXXxcXFxcLikqXFxzKlxcKVxccypcXChcXHMqKFteKCldfFxcXFwuKSpcXHMqXFwpW21zaXhwb2R1YWxnY2VyXSovZyxcblx0XG5cdFx0Ly8gc3suLi59ey4uLn1cblx0XHQvXFxiKD86c3x0cnx5KVxccypcXHsoW157fV18XFxcXC4pKlxccypcXH1cXHMqXFx7XFxzKihbXnt9XXxcXFxcLikqXFxzKlxcfVttc2l4cG9kdWFsZ2Nlcl0qL2csXG5cdFxuXHRcdC8vIHNbLi4uXVsuLi5dXG5cdFx0L1xcYig/OnN8dHJ8eSlcXHMqXFxbKFteW1xcXV18XFxcXC4pKlxccypcXF1cXHMqXFxbXFxzKihbXltcXF1dfFxcXFwuKSpcXHMqXFxdW21zaXhwb2R1YWxnY2VyXSovZyxcblx0XG5cdFx0Ly8gczwuLi4+PC4uLj5cblx0XHQvXFxiKD86c3x0cnx5KVxccyo8KFtePD5dfFxcXFwuKSpcXHMqPlxccyo8XFxzKihbXjw+XXxcXFxcLikqXFxzKj5bbXNpeHBvZHVhbGdjZXJdKi9nLFxuXHRcblx0XHQvLyAvLi4uL1xuXHRcdC9cXC8oXFxbLis/XXxcXFxcLnxbXlxcL1xcclxcbl0pKlxcL1ttc2l4cG9kdWFsZ2NdKig/PVxccyooJHxbXFxyXFxuLC47fSkmfFxcLSsqPX48PiE/Xl18KGx0fGd0fGxlfGdlfGVxfG5lfGNtcHxub3R8YW5kfG9yfHhvcnx4KVxcYikpL2dcblx0XSxcblxuXHQvLyBGSVhNRSBOb3Qgc3VyZSBhYm91dCB0aGUgaGFuZGxpbmcgb2YgOjosICcsIGFuZCAjXG5cdCd2YXJpYWJsZSc6IFtcblx0XHQvLyAke15QT1NUTUFUQ0h9XG5cdFx0L1smKlxcJEAlXVxce1xcXltBLVpdK1xcfS9nLFxuXHRcdC8vICReVlxuXHRcdC9bJipcXCRAJV1cXF5bQS1aX10vZyxcblx0XHQvLyAkey4uLn1cblx0XHQvWyYqXFwkQCVdIz8oPz1cXHspLyxcblx0XHQvLyAkZm9vXG5cdFx0L1smKlxcJEAlXSM/KCg6OikqJz8oPyFcXGQpW1xcdyRdKykrKDo6KSovaWcsXG5cdFx0Ly8gJDFcblx0XHQvWyYqXFwkQCVdXFxkKy9nLFxuXHRcdC8vICRfLCBAXywgJSFcblx0XHQvW1xcJEAlXVshXCIjXFwkJSYnKCkqKyxcXC0uXFwvOjs8PT4/QFtcXFxcXFxdXl9ge3x9fl0vZ1xuXHRdLFxuXHQnZmlsZWhhbmRsZSc6IHtcblx0XHQvLyA8PiwgPEZPTz4sIF9cblx0XHRwYXR0ZXJuOiAvPCg/IT0pLio+fFxcYl9cXGIvZyxcblx0XHRhbGlhczogJ3N5bWJvbCdcblx0fSxcblx0J3ZzdHJpbmcnOiB7XG5cdFx0Ly8gdjEuMiwgMS4yLjNcblx0XHRwYXR0ZXJuOiAvdlxcZCsoXFwuXFxkKykqfFxcZCsoXFwuXFxkKyl7Mix9L2csXG5cdFx0YWxpYXM6ICdzdHJpbmcnXG5cdH0sXG5cdCdmdW5jdGlvbic6IHtcblx0XHRwYXR0ZXJuOiAvc3ViIFthLXowLTlfXSsvaWcsXG5cdFx0aW5zaWRlOiB7XG5cdFx0XHRrZXl3b3JkOiAvc3ViL1xuXHRcdH1cblx0fSxcblx0J2tleXdvcmQnOiAvXFxiKGFueXxicmVha3xjb250aW51ZXxkZWZhdWx0fGRlbGV0ZXxkaWV8ZG98ZWxzZXxlbHNpZnxldmFsfGZvcnxmb3JlYWNofGdpdmVufGdvdG98aWZ8bGFzdHxsb2NhbHxteXxuZXh0fG91cnxwYWNrYWdlfHByaW50fHJlZG98cmVxdWlyZXxzYXl8c3RhdGV8c3VifHN3aXRjaHx1bmRlZnx1bmxlc3N8dW50aWx8dXNlfHdoZW58d2hpbGUpXFxiL2csXG5cdCdudW1iZXInOiAvKFxcbnxcXGIpLT8oMHhbXFxkQS1GYS1mXShfP1tcXGRBLUZhLWZdKSp8MGJbMDFdKF8/WzAxXSkqfChcXGQoXz9cXGQpKik/XFwuP1xcZChfP1xcZCkqKFtFZV0tP1xcZCspPylcXGIvZyxcblx0J29wZXJhdG9yJzogLy1bcnd4b1JXWE9lenNmZGxwU2JjdHVna1RCTUFDXVxcYnxbLSsqPX5cXC98Jl17MSwyfXw8PT98Pj0/fFxcLnsxLDN9fFshP1xcXFxeXXxcXGIobHR8Z3R8bGV8Z2V8ZXF8bmV8Y21wfG5vdHxhbmR8b3J8eG9yfHgpXFxiL2csXG5cdCdwdW5jdHVhdGlvbic6IC9be31bXFxdOygpLDpdL2dcbn07XG5cbi8vIGlzc3VlczogbmVzdGVkIG11bHRpbGluZSBjb21tZW50cywgaGlnaGxpZ2h0aW5nIGluc2lkZSBzdHJpbmcgaW50ZXJwb2xhdGlvbnNcblByaXNtLmxhbmd1YWdlcy5zd2lmdCA9IFByaXNtLmxhbmd1YWdlcy5leHRlbmQoJ2NsaWtlJywge1xuXHQna2V5d29yZCc6IC9cXGIoYXN8YXNzb2NpYXRpdml0eXxicmVha3xjYXNlfGNsYXNzfGNvbnRpbnVlfGNvbnZlbmllbmNlfGRlZmF1bHR8ZGVpbml0fGRpZFNldHxkb3xkeW5hbWljVHlwZXxlbHNlfGVudW18ZXh0ZW5zaW9ufGZhbGx0aHJvdWdofGZpbmFsfGZvcnxmdW5jfGdldHxpZnxpbXBvcnR8aW58aW5maXh8aW5pdHxpbm91dHxpbnRlcm5hbHxpc3xsYXp5fGxlZnR8bGV0fG11dGF0aW5nfG5ld3xub25lfG5vbm11dGF0aW5nfG9wZXJhdG9yfG9wdGlvbmFsfG92ZXJyaWRlfHBvc3RmaXh8cHJlY2VkZW5jZXxwcmVmaXh8cHJpdmF0ZXxwcm90b2NvbHxwdWJsaWN8cmVxdWlyZWR8cmV0dXJufHJpZ2h0fHNhZmV8c2VsZnxTZWxmfHNldHxzdGF0aWN8c3RydWN0fHN1YnNjcmlwdHxzdXBlcnxzd2l0Y2h8VHlwZXx0eXBlYWxpYXN8dW5vd25lZHx1bm93bmVkfHVuc2FmZXx2YXJ8d2Vha3x3aGVyZXx3aGlsZXx3aWxsU2V0fF9fQ09MVU1OX198X19GSUxFX198X19GVU5DVElPTl9ffF9fTElORV9fKVxcYi9nLFxuXHQnbnVtYmVyJzogL1xcYihbXFxkX10rKFxcLltcXGRlX10rKT98MHhbYS1mMC05X10rKFxcLlthLWYwLTlwX10rKT98MGJbMDFfXSt8MG9bMC03X10rKVxcYi9naSxcblx0J2NvbnN0YW50JzogL1xcYihuaWx8W0EtWl9dezIsfXxrW0EtWl1bQS1aYS16X10rKVxcYi9nLFxuXHQnYXRydWxlJzogL1xcQFxcYihJQk91dGxldHxJQkRlc2lnbmFibGV8SUJBY3Rpb258SUJJbnNwZWN0YWJsZXxjbGFzc19wcm90b2NvbHxleHBvcnRlZHxub3JldHVybnxOU0NvcHlpbmd8TlNNYW5hZ2VkfG9iamN8VUlBcHBsaWNhdGlvbk1haW58YXV0b19jbG9zdXJlKVxcYi9nLFxuXHQnYnVpbHRpbic6IC9cXGIoW0EtWl1cXFMrfGFic3xhZHZhbmNlfGFsaWdub2Z8YWxpZ25vZlZhbHVlfGFzc2VydHxjb250YWluc3xjb3VudHxjb3VudEVsZW1lbnRzfGRlYnVnUHJpbnR8ZGVidWdQcmludGxufGRpc3RhbmNlfGRyb3BGaXJzdHxkcm9wTGFzdHxkdW1wfGVudW1lcmF0ZXxlcXVhbHxmaWx0ZXJ8ZmluZHxmaXJzdHxnZXRWYUxpc3R8aW5kaWNlc3xpc0VtcHR5fGpvaW58bGFzdHxsYXp5fGxleGljb2dyYXBoaWNhbENvbXBhcmV8bWFwfG1heHxtYXhFbGVtZW50fG1pbnxtaW5FbGVtZW50fG51bWVyaWNDYXN0fG92ZXJsYXBzfHBhcnRpdGlvbnxwcmVmaXh8cHJpbnR8cHJpbnRsbnxyZWR1Y2V8cmVmbGVjdHxyZXZlcnNlfHNpemVvZnxzaXplb2ZWYWx1ZXxzb3J0fHNvcnRlZHxzcGxpdHxzdGFydHNXaXRofHN0cmlkZXxzdHJpZGVvZnxzdHJpZGVvZlZhbHVlfHN1ZmZpeHxzd2FwfHRvRGVidWdTdHJpbmd8dG9TdHJpbmd8dHJhbnNjb2RlfHVuZGVyZXN0aW1hdGVDb3VudHx1bnNhZmVCaXRDYXN0fHdpdGhFeHRlbmRlZExpZmV0aW1lfHdpdGhVbnNhZmVNdXRhYmxlUG9pbnRlcnx3aXRoVW5zYWZlTXV0YWJsZVBvaW50ZXJzfHdpdGhVbnNhZmVQb2ludGVyfHdpdGhVbnNhZmVQb2ludGVyc3x3aXRoVmFMaXN0KVxcYi9nXG59KTtcblxuUHJpc20ubGFuZ3VhZ2VzLmNwcCA9IFByaXNtLmxhbmd1YWdlcy5leHRlbmQoJ2MnLCB7XG5cdCdrZXl3b3JkJzogL1xcYihhbGlnbmFzfGFsaWdub2Z8YXNtfGF1dG98Ym9vbHxicmVha3xjYXNlfGNhdGNofGNoYXJ8Y2hhcjE2X3R8Y2hhcjMyX3R8Y2xhc3N8Y29tcGx8Y29uc3R8Y29uc3RleHByfGNvbnN0X2Nhc3R8Y29udGludWV8ZGVjbHR5cGV8ZGVmYXVsdHxkZWxldGV8ZGVsZXRlXFxbXFxdfGRvfGRvdWJsZXxkeW5hbWljX2Nhc3R8ZWxzZXxlbnVtfGV4cGxpY2l0fGV4cG9ydHxleHRlcm58ZmxvYXR8Zm9yfGZyaWVuZHxnb3RvfGlmfGlubGluZXxpbnR8bG9uZ3xtdXRhYmxlfG5hbWVzcGFjZXxuZXd8bmV3XFxbXFxdfG5vZXhjZXB0fG51bGxwdHJ8b3BlcmF0b3J8cHJpdmF0ZXxwcm90ZWN0ZWR8cHVibGljfHJlZ2lzdGVyfHJlaW50ZXJwcmV0X2Nhc3R8cmV0dXJufHNob3J0fHNpZ25lZHxzaXplb2Z8c3RhdGljfHN0YXRpY19hc3NlcnR8c3RhdGljX2Nhc3R8c3RydWN0fHN3aXRjaHx0ZW1wbGF0ZXx0aGlzfHRocmVhZF9sb2NhbHx0aHJvd3x0cnl8dHlwZWRlZnx0eXBlaWR8dHlwZW5hbWV8dW5pb258dW5zaWduZWR8dXNpbmd8dmlydHVhbHx2b2lkfHZvbGF0aWxlfHdjaGFyX3R8d2hpbGUpXFxiL2csXG5cdCdib29sZWFuJzogL1xcYih0cnVlfGZhbHNlKVxcYi9nLFxuXHQnb3BlcmF0b3InOiAvWy0rXXsxLDJ9fCE9P3w8ezEsMn09P3w+ezEsMn09P3xcXC0+fDp7MSwyfXw9ezEsMn18XFxefH58JXwmezEsMn18XFx8P1xcfHxcXD98XFwqfFxcL3xcXGIoYW5kfGFuZF9lcXxiaXRhbmR8Yml0b3J8bm90fG5vdF9lcXxvcnxvcl9lcXx4b3J8eG9yX2VxKVxcYi9nXG59KTtcblxuUHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZSgnY3BwJywgJ2tleXdvcmQnLCB7XG5cdCdjbGFzcy1uYW1lJzoge1xuXHRcdHBhdHRlcm46IC8oY2xhc3NcXHMrKVthLXowLTlfXSsvaWcsXG5cdFx0bG9va2JlaGluZDogdHJ1ZSxcblx0fSxcbn0pO1xuUHJpc20ubGFuZ3VhZ2VzLmh0dHAgPSB7XG4gICAgJ3JlcXVlc3QtbGluZSc6IHtcbiAgICAgICAgcGF0dGVybjogL14oUE9TVHxHRVR8UFVUfERFTEVURXxPUFRJT05TfFBBVENIfFRSQUNFfENPTk5FQ1QpXFxiXFxzaHR0cHM/OlxcL1xcL1xcUytcXHNIVFRQXFwvWzAtOS5dKy9nLFxuICAgICAgICBpbnNpZGU6IHtcbiAgICAgICAgICAgIC8vIEhUVFAgVmVyYlxuICAgICAgICAgICAgcHJvcGVydHk6IC9eXFxiKFBPU1R8R0VUfFBVVHxERUxFVEV8T1BUSU9OU3xQQVRDSHxUUkFDRXxDT05ORUNUKVxcYi9nLFxuICAgICAgICAgICAgLy8gUGF0aCBvciBxdWVyeSBhcmd1bWVudFxuICAgICAgICAgICAgJ2F0dHItbmFtZSc6IC86XFx3Ky9nXG4gICAgICAgIH1cbiAgICB9LFxuICAgICdyZXNwb25zZS1zdGF0dXMnOiB7XG4gICAgICAgIHBhdHRlcm46IC9eSFRUUFxcLzEuWzAxXSBbMC05XSsuKi9nLFxuICAgICAgICBpbnNpZGU6IHtcbiAgICAgICAgICAgIC8vIFN0YXR1cywgZS5nLiAyMDAgT0tcbiAgICAgICAgICAgIHByb3BlcnR5OiAvWzAtOV0rW0EtWlxccy1dKyQvaWdcbiAgICAgICAgfVxuICAgIH0sXG4gICAgLy8gSFRUUCBoZWFkZXIgbmFtZVxuICAgIGtleXdvcmQ6IC9eW1xcdy1dKzooPz0uKykvZ21cbn07XG5cbi8vIENyZWF0ZSBhIG1hcHBpbmcgb2YgQ29udGVudC1UeXBlIGhlYWRlcnMgdG8gbGFuZ3VhZ2UgZGVmaW5pdGlvbnNcbnZhciBodHRwTGFuZ3VhZ2VzID0ge1xuICAgICdhcHBsaWNhdGlvbi9qc29uJzogUHJpc20ubGFuZ3VhZ2VzLmphdmFzY3JpcHQsXG4gICAgJ2FwcGxpY2F0aW9uL3htbCc6IFByaXNtLmxhbmd1YWdlcy5tYXJrdXAsXG4gICAgJ3RleHQveG1sJzogUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cCxcbiAgICAndGV4dC9odG1sJzogUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cFxufTtcblxuLy8gSW5zZXJ0IGVhY2ggY29udGVudCB0eXBlIHBhcnNlciB0aGF0IGhhcyBpdHMgYXNzb2NpYXRlZCBsYW5ndWFnZVxuLy8gY3VycmVudGx5IGxvYWRlZC5cbmZvciAodmFyIGNvbnRlbnRUeXBlIGluIGh0dHBMYW5ndWFnZXMpIHtcbiAgICBpZiAoaHR0cExhbmd1YWdlc1tjb250ZW50VHlwZV0pIHtcbiAgICAgICAgdmFyIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgb3B0aW9uc1tjb250ZW50VHlwZV0gPSB7XG4gICAgICAgICAgICBwYXR0ZXJuOiBuZXcgUmVnRXhwKCcoY29udGVudC10eXBlOlxcXFxzKicgKyBjb250ZW50VHlwZSArICdbXFxcXHdcXFxcV10qPylcXFxcblxcXFxuW1xcXFx3XFxcXFddKicsICdnaScpLFxuICAgICAgICAgICAgbG9va2JlaGluZDogdHJ1ZSxcbiAgICAgICAgICAgIGluc2lkZToge1xuICAgICAgICAgICAgICAgIHJlc3Q6IGh0dHBMYW5ndWFnZXNbY29udGVudFR5cGVdXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIFByaXNtLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoJ2h0dHAnLCAna2V5d29yZCcsIG9wdGlvbnMpO1xuICAgIH1cbn1cblxuUHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZSgncGhwJywgJ3ZhcmlhYmxlJywge1xuXHQndGhpcyc6IC9cXCR0aGlzL2csXG5cdCdnbG9iYWwnOiAvXFwkXz8oR0xPQkFMU3xTRVJWRVJ8R0VUfFBPU1R8RklMRVN8UkVRVUVTVHxTRVNTSU9OfEVOVnxDT09LSUV8SFRUUF9SQVdfUE9TVF9EQVRBfGFyZ2N8YXJndnxwaHBfZXJyb3Jtc2d8aHR0cF9yZXNwb25zZV9oZWFkZXIpL2csXG5cdCdzY29wZSc6IHtcblx0XHRwYXR0ZXJuOiAvXFxiW1xcd1xcXFxdKzo6L2csXG5cdFx0aW5zaWRlOiB7XG5cdFx0XHRrZXl3b3JkOiAvKHN0YXRpY3xzZWxmfHBhcmVudCkvLFxuXHRcdFx0cHVuY3R1YXRpb246IC8oOjp8XFxcXCkvXG5cdFx0fVxuXHR9XG59KTtcblByaXNtLmxhbmd1YWdlcy50d2lnID0ge1xuXHQnY29tbWVudCc6IC9cXHtcXCNbXFxzXFxTXSo/XFwjXFx9L2csXG5cdCd0YWcnOiB7XG5cdFx0cGF0dGVybjogLyhcXHtcXHtbXFxzXFxTXSo/XFx9XFx9fFxce1xcJVtcXHNcXFNdKj9cXCVcXH0pL2csXG5cdFx0aW5zaWRlOiB7XG5cdFx0XHQnbGQnOiB7XG5cdFx0XHRcdHBhdHRlcm46IC9eKFxce1xce1xcLT98XFx7XFwlXFwtP1xccypcXHcrKS8sXG5cdFx0XHRcdGluc2lkZToge1xuXHRcdFx0XHRcdCdwdW5jdHVhdGlvbic6IC9eKFxce1xce3xcXHtcXCUpXFwtPy8sXG5cdFx0XHRcdFx0J2tleXdvcmQnOiAvXFx3Ky9cblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdCdyZCc6IHtcblx0XHRcdFx0cGF0dGVybjogL1xcLT8oXFwlXFx9fFxcfVxcfSkkLyxcblx0XHRcdFx0aW5zaWRlOiB7XG5cdFx0XHRcdFx0J3B1bmN0dWF0aW9uJzogLy4qL1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0J3N0cmluZyc6IHtcblx0XHRcdFx0cGF0dGVybjogLyhcInwnKShcXFxcPy4pKj9cXDEvZyxcblx0XHRcdFx0aW5zaWRlOiB7XG5cdFx0XHRcdFx0J3B1bmN0dWF0aW9uJzogL14oJ3xcIil8KCd8XCIpJC9nXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHQna2V5d29yZCc6IC9cXGIoaWYpXFxiL2csXG5cdFx0XHQnYm9vbGVhbic6IC9cXGIodHJ1ZXxmYWxzZXxudWxsKVxcYi9nLFxuXHRcdFx0J251bWJlcic6IC9cXGItPygweFtcXGRBLUZhLWZdK3xcXGQqXFwuP1xcZCsoW0VlXS0/XFxkKyk/KVxcYi9nLFxuXHRcdFx0J29wZXJhdG9yJzogLz09fD18XFwhPXw8fD58Pj18PD18XFwrfFxcLXx+fFxcKnxcXC98XFwvXFwvfCV8XFwqXFwqfFxcfC9nLFxuXHRcdFx0J3NwYWNlLW9wZXJhdG9yJzoge1xuXHRcdFx0XHRwYXR0ZXJuOiAvKFxccykoXFxiKG5vdHxiXFwtYW5kfGJcXC14b3J8YlxcLW9yfGFuZHxvcnxpbnxtYXRjaGVzfHN0YXJ0cyB3aXRofGVuZHMgd2l0aHxpcylcXGJ8XFw/fDp8XFw/XFw6KSg/PVxccykvZyxcblx0XHRcdFx0bG9va2JlaGluZDogdHJ1ZSxcblx0XHRcdFx0aW5zaWRlOiB7XG5cdFx0XHRcdFx0J29wZXJhdG9yJzogLy4qL1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0J3Byb3BlcnR5JzogL1xcYlthLXpBLVpfXVthLXpBLVowLTlfXSpcXGIvZyxcblx0XHRcdCdwdW5jdHVhdGlvbic6IC9cXCh8XFwpfFxcW1xcXXxcXFt8XFxdfFxce3xcXH18XFw6fFxcLnwsL2dcblx0XHR9XG5cdH0sXG5cblx0Ly8gVGhlIHJlc3QgY2FuIGJlIHBhcnNlZCBhcyBIVE1MXG5cdCdvdGhlcic6IHtcblx0XHRwYXR0ZXJuOiAvW1xcc1xcU10qLyxcblx0XHRpbnNpZGU6IFByaXNtLmxhbmd1YWdlcy5tYXJrdXBcblx0fVxufTtcblxuUHJpc20ubGFuZ3VhZ2VzLmNzaGFycCA9IFByaXNtLmxhbmd1YWdlcy5leHRlbmQoJ2NsaWtlJywge1xuXHQna2V5d29yZCc6IC9cXGIoYWJzdHJhY3R8YXN8YmFzZXxib29sfGJyZWFrfGJ5dGV8Y2FzZXxjYXRjaHxjaGFyfGNoZWNrZWR8Y2xhc3N8Y29uc3R8Y29udGludWV8ZGVjaW1hbHxkZWZhdWx0fGRlbGVnYXRlfGRvfGRvdWJsZXxlbHNlfGVudW18ZXZlbnR8ZXhwbGljaXR8ZXh0ZXJufGZhbHNlfGZpbmFsbHl8Zml4ZWR8ZmxvYXR8Zm9yfGZvcmVhY2h8Z290b3xpZnxpbXBsaWNpdHxpbnxpbnR8aW50ZXJmYWNlfGludGVybmFsfGlzfGxvY2t8bG9uZ3xuYW1lc3BhY2V8bmV3fG51bGx8b2JqZWN0fG9wZXJhdG9yfG91dHxvdmVycmlkZXxwYXJhbXN8cHJpdmF0ZXxwcm90ZWN0ZWR8cHVibGljfHJlYWRvbmx5fHJlZnxyZXR1cm58c2J5dGV8c2VhbGVkfHNob3J0fHNpemVvZnxzdGFja2FsbG9jfHN0YXRpY3xzdHJpbmd8c3RydWN0fHN3aXRjaHx0aGlzfHRocm93fHRydWV8dHJ5fHR5cGVvZnx1aW50fHVsb25nfHVuY2hlY2tlZHx1bnNhZmV8dXNob3J0fHVzaW5nfHZpcnR1YWx8dm9pZHx2b2xhdGlsZXx3aGlsZXxhZGR8YWxpYXN8YXNjZW5kaW5nfGFzeW5jfGF3YWl0fGRlc2NlbmRpbmd8ZHluYW1pY3xmcm9tfGdldHxnbG9iYWx8Z3JvdXB8aW50b3xqb2lufGxldHxvcmRlcmJ5fHBhcnRpYWx8cmVtb3ZlfHNlbGVjdHxzZXR8dmFsdWV8dmFyfHdoZXJlfHlpZWxkKVxcYi9nLFxuXHQnc3RyaW5nJzogL0A/KFwifCcpKFxcXFw/LikqP1xcMS9nLFxuXHQncHJlcHJvY2Vzc29yJzogL15cXHMqIy4qL2dtLFxuXHQnbnVtYmVyJzogL1xcYi0/KDB4KT9cXGQqXFwuP1xcZCtcXGIvZ1xufSk7XG5cblByaXNtLmxhbmd1YWdlcy5pbmk9IHtcclxuXHQnY29tbWVudCc6IC9eXFxzKjsuKiQvZ20sXHJcblx0J2ltcG9ydGFudCc6IC9cXFsuKj9cXF0vZ20sXHJcblx0J2NvbnN0YW50JzogL15cXHMqW15cXHNcXD1dKz8oPz1bIFxcdF0qXFw9KS9nbSxcclxuXHQnYXR0ci12YWx1ZSc6IHtcclxuXHRcdHBhdHRlcm46IC9cXD0uKi9nbSwgXHJcblx0XHRpbnNpZGU6IHtcclxuXHRcdFx0J3B1bmN0dWF0aW9uJzogL15bXFw9XS9nXHJcblx0XHR9XHJcblx0fVxyXG59O1xuLyoqXG4gKiBPcmlnaW5hbCBieSBBYXJvbiBIYXJ1bjogaHR0cDovL2FhaGFjcmVhdGl2ZS5jb20vMjAxMi8wNy8zMS9waHAtc3ludGF4LWhpZ2hsaWdodGluZy1wcmlzbS9cbiAqIE1vZGlmaWVkIGJ5IE1pbGVzIEpvaG5zb246IGh0dHA6Ly9taWxlc2oubWVcbiAqXG4gKiBTdXBwb3J0cyB0aGUgZm9sbG93aW5nOlxuICogXHRcdC0gRXh0ZW5kcyBjbGlrZSBzeW50YXhcbiAqIFx0XHQtIFN1cHBvcnQgZm9yIFBIUCA1LjMrIChuYW1lc3BhY2VzLCB0cmFpdHMsIGdlbmVyYXRvcnMsIGV0YylcbiAqIFx0XHQtIFNtYXJ0ZXIgY29uc3RhbnQgYW5kIGZ1bmN0aW9uIG1hdGNoaW5nXG4gKlxuICogQWRkcyB0aGUgZm9sbG93aW5nIG5ldyB0b2tlbiBjbGFzc2VzOlxuICogXHRcdGNvbnN0YW50LCBkZWxpbWl0ZXIsIHZhcmlhYmxlLCBmdW5jdGlvbiwgcGFja2FnZVxuICovXG5cblByaXNtLmxhbmd1YWdlcy5waHAgPSBQcmlzbS5sYW5ndWFnZXMuZXh0ZW5kKCdjbGlrZScsIHtcblx0J2tleXdvcmQnOiAvXFxiKGFuZHxvcnx4b3J8YXJyYXl8YXN8YnJlYWt8Y2FzZXxjZnVuY3Rpb258Y2xhc3N8Y29uc3R8Y29udGludWV8ZGVjbGFyZXxkZWZhdWx0fGRpZXxkb3xlbHNlfGVsc2VpZnxlbmRkZWNsYXJlfGVuZGZvcnxlbmRmb3JlYWNofGVuZGlmfGVuZHN3aXRjaHxlbmR3aGlsZXxleHRlbmRzfGZvcnxmb3JlYWNofGZ1bmN0aW9ufGluY2x1ZGV8aW5jbHVkZV9vbmNlfGdsb2JhbHxpZnxuZXd8cmV0dXJufHN0YXRpY3xzd2l0Y2h8dXNlfHJlcXVpcmV8cmVxdWlyZV9vbmNlfHZhcnx3aGlsZXxhYnN0cmFjdHxpbnRlcmZhY2V8cHVibGljfGltcGxlbWVudHN8cHJpdmF0ZXxwcm90ZWN0ZWR8cGFyZW50fHRocm93fG51bGx8ZWNob3xwcmludHx0cmFpdHxuYW1lc3BhY2V8ZmluYWx8eWllbGR8Z290b3xpbnN0YW5jZW9mfGZpbmFsbHl8dHJ5fGNhdGNoKVxcYi9pZyxcblx0J2NvbnN0YW50JzogL1xcYltBLVowLTlfXXsyLH1cXGIvZyxcblx0J2NvbW1lbnQnOiB7XG5cdFx0cGF0dGVybjogLyhefFteXFxcXF0pKFxcL1xcKltcXHdcXFddKj9cXCpcXC98KF58W146XSkoXFwvXFwvfCMpLio/KFxccj9cXG58JCkpL2csXG5cdFx0bG9va2JlaGluZDogdHJ1ZVxuXHR9XG59KTtcblxuUHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZSgncGhwJywgJ2tleXdvcmQnLCB7XG5cdCdkZWxpbWl0ZXInOiAvKFxcPz58PFxcP3BocHw8XFw/KS9pZyxcblx0J3ZhcmlhYmxlJzogLyhcXCRcXHcrKVxcYi9pZyxcblx0J3BhY2thZ2UnOiB7XG5cdFx0cGF0dGVybjogLyhcXFxcfG5hbWVzcGFjZVxccyt8dXNlXFxzKylbXFx3XFxcXF0rL2csXG5cdFx0bG9va2JlaGluZDogdHJ1ZSxcblx0XHRpbnNpZGU6IHtcblx0XHRcdHB1bmN0dWF0aW9uOiAvXFxcXC9cblx0XHR9XG5cdH1cbn0pO1xuXG4vLyBNdXN0IGJlIGRlZmluZWQgYWZ0ZXIgdGhlIGZ1bmN0aW9uIHBhdHRlcm5cblByaXNtLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoJ3BocCcsICdvcGVyYXRvcicsIHtcblx0J3Byb3BlcnR5Jzoge1xuXHRcdHBhdHRlcm46IC8oLT4pW1xcd10rL2csXG5cdFx0bG9va2JlaGluZDogdHJ1ZVxuXHR9XG59KTtcblxuLy8gQWRkIEhUTUwgc3VwcG9ydCBvZiB0aGUgbWFya3VwIGxhbmd1YWdlIGV4aXN0c1xuaWYgKFByaXNtLmxhbmd1YWdlcy5tYXJrdXApIHtcblxuXHQvLyBUb2tlbml6ZSBhbGwgaW5saW5lIFBIUCBibG9ja3MgdGhhdCBhcmUgd3JhcHBlZCBpbiA8P3BocCA/PlxuXHQvLyBUaGlzIGFsbG93cyBmb3IgZWFzeSBQSFAgKyBtYXJrdXAgaGlnaGxpZ2h0aW5nXG5cdFByaXNtLmhvb2tzLmFkZCgnYmVmb3JlLWhpZ2hsaWdodCcsIGZ1bmN0aW9uKGVudikge1xuXHRcdGlmIChlbnYubGFuZ3VhZ2UgIT09ICdwaHAnKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0ZW52LnRva2VuU3RhY2sgPSBbXTtcblxuXHRcdGVudi5iYWNrdXBDb2RlID0gZW52LmNvZGU7XG5cdFx0ZW52LmNvZGUgPSBlbnYuY29kZS5yZXBsYWNlKC8oPzo8XFw/cGhwfDxcXD8pW1xcd1xcV10qPyg/OlxcPz4pL2lnLCBmdW5jdGlvbihtYXRjaCkge1xuXHRcdFx0ZW52LnRva2VuU3RhY2sucHVzaChtYXRjaCk7XG5cblx0XHRcdHJldHVybiAne3t7UEhQJyArIGVudi50b2tlblN0YWNrLmxlbmd0aCArICd9fX0nO1xuXHRcdH0pO1xuXHR9KTtcblxuXHQvLyBSZXN0b3JlIGVudi5jb2RlIGZvciBvdGhlciBwbHVnaW5zIChlLmcuIGxpbmUtbnVtYmVycylcblx0UHJpc20uaG9va3MuYWRkKCdiZWZvcmUtaW5zZXJ0JywgZnVuY3Rpb24oZW52KSB7XG5cdFx0aWYgKGVudi5sYW5ndWFnZSA9PT0gJ3BocCcpIHtcblx0XHRcdGVudi5jb2RlID0gZW52LmJhY2t1cENvZGU7XG5cdFx0XHRkZWxldGUgZW52LmJhY2t1cENvZGU7XG5cdFx0fVxuXHR9KTtcblxuXHQvLyBSZS1pbnNlcnQgdGhlIHRva2VucyBhZnRlciBoaWdobGlnaHRpbmdcblx0UHJpc20uaG9va3MuYWRkKCdhZnRlci1oaWdobGlnaHQnLCBmdW5jdGlvbihlbnYpIHtcblx0XHRpZiAoZW52Lmxhbmd1YWdlICE9PSAncGhwJykge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGZvciAodmFyIGkgPSAwLCB0OyB0ID0gZW52LnRva2VuU3RhY2tbaV07IGkrKykge1xuXHRcdFx0ZW52LmhpZ2hsaWdodGVkQ29kZSA9IGVudi5oaWdobGlnaHRlZENvZGUucmVwbGFjZSgne3t7UEhQJyArIChpICsgMSkgKyAnfX19JywgUHJpc20uaGlnaGxpZ2h0KHQsIGVudi5ncmFtbWFyLCAncGhwJykpO1xuXHRcdH1cblxuXHRcdGVudi5lbGVtZW50LmlubmVySFRNTCA9IGVudi5oaWdobGlnaHRlZENvZGU7XG5cdH0pO1xuXG5cdC8vIFdyYXAgdG9rZW5zIGluIGNsYXNzZXMgdGhhdCBhcmUgbWlzc2luZyB0aGVtXG5cdFByaXNtLmhvb2tzLmFkZCgnd3JhcCcsIGZ1bmN0aW9uKGVudikge1xuXHRcdGlmIChlbnYubGFuZ3VhZ2UgPT09ICdwaHAnICYmIGVudi50eXBlID09PSAnbWFya3VwJykge1xuXHRcdFx0ZW52LmNvbnRlbnQgPSBlbnYuY29udGVudC5yZXBsYWNlKC8oXFx7XFx7XFx7UEhQWzAtOV0rXFx9XFx9XFx9KS9nLCBcIjxzcGFuIGNsYXNzPVxcXCJ0b2tlbiBwaHBcXFwiPiQxPC9zcGFuPlwiKTtcblx0XHR9XG5cdH0pO1xuXG5cdC8vIEFkZCB0aGUgcnVsZXMgYmVmb3JlIGFsbCBvdGhlcnNcblx0UHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZSgncGhwJywgJ2NvbW1lbnQnLCB7XG5cdFx0J21hcmt1cCc6IHtcblx0XHRcdHBhdHRlcm46IC88W14/XVxcLz8oLio/KT4vZyxcblx0XHRcdGluc2lkZTogUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cFxuXHRcdH0sXG5cdFx0J3BocCc6IC9cXHtcXHtcXHtQSFBbMC05XStcXH1cXH1cXH0vZ1xuXHR9KTtcbn1cbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcblxuLyoqXG4gKiBBbmltYXRpb24gaGVscGVyLlxuICovXG52YXIgQW5pbWF0b3IgPSBmdW5jdGlvbihkdXJhdGlvbikge1xuICAgIHV0aWxzLlBvc3RlckNsYXNzLmNhbGwodGhpcyk7XG4gICAgdGhpcy5kdXJhdGlvbiA9IGR1cmF0aW9uO1xuICAgIHRoaXMuX3N0YXJ0ID0gRGF0ZS5ub3coKTtcbn07XG51dGlscy5pbmhlcml0KEFuaW1hdG9yLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8qKlxuICogR2V0IHRoZSB0aW1lIGluIHRoZSBhbmltYXRpb25cbiAqIEByZXR1cm4ge2Zsb2F0fSBiZXR3ZWVuIDAgYW5kIDFcbiAqL1xuQW5pbWF0b3IucHJvdG90eXBlLnRpbWUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZWxhcHNlZCA9IERhdGUubm93KCkgLSB0aGlzLl9zdGFydDtcbiAgICByZXR1cm4gKGVsYXBzZWQgJSB0aGlzLmR1cmF0aW9uKSAvIHRoaXMuZHVyYXRpb247XG59O1xuXG5leHBvcnRzLkFuaW1hdG9yID0gQW5pbWF0b3I7IiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcblxuLyoqXG4gKiBIVE1MIGNhbnZhcyB3aXRoIGRyYXdpbmcgY29udmluaWVuY2UgZnVuY3Rpb25zLlxuICovXG52YXIgQ2FudmFzID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fcmVuZGVyZWRfcmVnaW9uID0gW251bGwsIG51bGwsIG51bGwsIG51bGxdOyAvLyB4MSx5MSx4Mix5MlxuXG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzKTtcbiAgICB0aGlzLl9sYXlvdXQoKTtcbiAgICB0aGlzLl9pbml0X3Byb3BlcnRpZXMoKTtcbiAgICB0aGlzLl9sYXN0X3NldF9vcHRpb25zID0ge307XG5cbiAgICB0aGlzLl90ZXh0X3NpemVfY2FjaGUgPSB7fTtcbiAgICB0aGlzLl90ZXh0X3NpemVfYXJyYXkgPSBbXTtcbiAgICB0aGlzLl90ZXh0X3NpemVfY2FjaGVfc2l6ZSA9IDEwMDA7XG5cbiAgICAvLyBTZXQgZGVmYXVsdCBzaXplLlxuICAgIHRoaXMud2lkdGggPSA0MDA7XG4gICAgdGhpcy5oZWlnaHQgPSAzMDA7XG59O1xudXRpbHMuaW5oZXJpdChDYW52YXMsIHV0aWxzLlBvc3RlckNsYXNzKTtcblxuLyoqXG4gKiBMYXlvdXQgdGhlIGVsZW1lbnRzIGZvciB0aGUgY2FudmFzLlxuICogQ3JlYXRlcyBgdGhpcy5lbGBcbiAqIFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5fbGF5b3V0ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgdGhpcy5fY2FudmFzLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAncG9zdGVyIGhpZGRlbi1jYW52YXMnKTtcbiAgICB0aGlzLmNvbnRleHQgPSB0aGlzLl9jYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICAgICAgXG4gICAgLy8gU3RyZXRjaCB0aGUgaW1hZ2UgZm9yIHJldGluYSBzdXBwb3J0LlxuICAgIHRoaXMuc2NhbGUoMiwyKTtcbn07XG5cbi8qKlxuICogTWFrZSB0aGUgcHJvcGVydGllcyBvZiB0aGUgY2xhc3MuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DYW52YXMucHJvdG90eXBlLl9pbml0X3Byb3BlcnRpZXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBIZWlnaHQgb2YgdGhlIGNhbnZhc1xuICAgICAqIEByZXR1cm4ge2Zsb2F0fVxuICAgICAqL1xuICAgIHRoaXMucHJvcGVydHkoJ2hlaWdodCcsIGZ1bmN0aW9uKCkgeyBcbiAgICAgICAgcmV0dXJuIHRoYXQuX2NhbnZhcy5oZWlnaHQgLyAyOyBcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Ll9jYW52YXMuc2V0QXR0cmlidXRlKCdoZWlnaHQnLCB2YWx1ZSAqIDIpO1xuICAgICAgICBcbiAgICAgICAgLy8gU3RyZXRjaCB0aGUgaW1hZ2UgZm9yIHJldGluYSBzdXBwb3J0LlxuICAgICAgICB0aGlzLnNjYWxlKDIsMik7XG4gICAgICAgIHRoaXMuX3RvdWNoKCk7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBXaWR0aCBvZiB0aGUgY2FudmFzXG4gICAgICogQHJldHVybiB7ZmxvYXR9XG4gICAgICovXG4gICAgdGhpcy5wcm9wZXJ0eSgnd2lkdGgnLCBmdW5jdGlvbigpIHsgXG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMud2lkdGggLyAyOyBcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Ll9jYW52YXMuc2V0QXR0cmlidXRlKCd3aWR0aCcsIHZhbHVlICogMik7XG4gICAgICAgIFxuICAgICAgICAvLyBTdHJldGNoIHRoZSBpbWFnZSBmb3IgcmV0aW5hIHN1cHBvcnQuXG4gICAgICAgIHRoaXMuc2NhbGUoMiwyKTtcbiAgICAgICAgdGhpcy5fdG91Y2goKTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIFJlZ2lvbiBvZiB0aGUgY2FudmFzIHRoYXQgaGFzIGJlZW4gcmVuZGVyZWQgdG9cbiAgICAgKiBAcmV0dXJuIHtkaWN0aW9uYXJ5fSBkaWN0aW9uYXJ5IGRlc2NyaWJpbmcgYSByZWN0YW5nbGUge3gseSx3aWR0aCxoZWlnaHR9XG4gICAgICovXG4gICAgdGhpcy5wcm9wZXJ0eSgncmVuZGVyZWRfcmVnaW9uJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB4OiB0aGlzLl90eCh0aGlzLl9yZW5kZXJlZF9yZWdpb25bMF0sIHRydWUpLFxuICAgICAgICAgICAgeTogdGhpcy5fdHkodGhpcy5fcmVuZGVyZWRfcmVnaW9uWzFdLCB0cnVlKSxcbiAgICAgICAgICAgIHdpZHRoOiB0aGlzLl9yZW5kZXJlZF9yZWdpb25bMl0gLSB0aGlzLl9yZW5kZXJlZF9yZWdpb25bMF0sXG4gICAgICAgICAgICBoZWlnaHQ6IHRoaXMuX3JlbmRlcmVkX3JlZ2lvblszXSAtIHRoaXMuX3JlbmRlcmVkX3JlZ2lvblsxXSxcbiAgICAgICAgfTtcbiAgICB9KTtcbn07XG5cbi8qKlxuICogRHJhd3MgYSByZWN0YW5nbGVcbiAqIEBwYXJhbSAge2Zsb2F0fSB4XG4gKiBAcGFyYW0gIHtmbG9hdH0geVxuICogQHBhcmFtICB7ZmxvYXR9IHdpZHRoXG4gKiBAcGFyYW0gIHtmbG9hdH0gaGVpZ2h0XG4gKiBAcGFyYW0gIHtkaWN0aW9uYXJ5fSBvcHRpb25zLCBzZWUgX2FwcGx5X29wdGlvbnMoKSBmb3IgZGV0YWlsc1xuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5kcmF3X3JlY3RhbmdsZSA9IGZ1bmN0aW9uKHgsIHksIHdpZHRoLCBoZWlnaHQsIG9wdGlvbnMpIHtcbiAgICB4ID0gdGhpcy5fdHgoeCk7XG4gICAgeSA9IHRoaXMuX3R5KHkpO1xuICAgIHRoaXMuY29udGV4dC5iZWdpblBhdGgoKTtcbiAgICB0aGlzLmNvbnRleHQucmVjdCh4LCB5LCB3aWR0aCwgaGVpZ2h0KTtcbiAgICB0aGlzLl9kb19kcmF3KG9wdGlvbnMpO1xuICAgIHRoaXMuX3RvdWNoKHgsIHksIHgrd2lkdGgsIHkraGVpZ2h0KTtcbn07XG5cbi8qKlxuICogRHJhd3MgYSBjaXJjbGVcbiAqIEBwYXJhbSAge2Zsb2F0fSB4XG4gKiBAcGFyYW0gIHtmbG9hdH0geVxuICogQHBhcmFtICB7ZmxvYXR9IHJcbiAqIEBwYXJhbSAge2RpY3Rpb25hcnl9IG9wdGlvbnMsIHNlZSBfYXBwbHlfb3B0aW9ucygpIGZvciBkZXRhaWxzXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DYW52YXMucHJvdG90eXBlLmRyYXdfY2lyY2xlID0gZnVuY3Rpb24oeCwgeSwgciwgb3B0aW9ucykge1xuICAgIHggPSB0aGlzLl90eCh4KTtcbiAgICB5ID0gdGhpcy5fdHkoeSk7XG4gICAgdGhpcy5jb250ZXh0LmJlZ2luUGF0aCgpO1xuICAgIHRoaXMuY29udGV4dC5hcmMoeCwgeSwgciwgMCwgMiAqIE1hdGguUEkpO1xuICAgIHRoaXMuX2RvX2RyYXcob3B0aW9ucyk7XG4gICAgdGhpcy5fdG91Y2goeC1yLCB5LXIsIHgrciwgeStyKTtcbn07XG5cbi8qKlxuICogRHJhd3MgYW4gaW1hZ2VcbiAqIEBwYXJhbSAge2ltZyBlbGVtZW50fSBpbWdcbiAqIEBwYXJhbSAge2Zsb2F0fSB4XG4gKiBAcGFyYW0gIHtmbG9hdH0geVxuICogQHBhcmFtICB7ZmxvYXR9IChvcHRpb25hbCkgd2lkdGhcbiAqIEBwYXJhbSAge2Zsb2F0fSAob3B0aW9uYWwpIGhlaWdodFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5kcmF3X2ltYWdlID0gZnVuY3Rpb24oaW1nLCB4LCB5LCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgeCA9IHRoaXMuX3R4KHgpO1xuICAgIHkgPSB0aGlzLl90eSh5KTtcbiAgICB3aWR0aCA9IHdpZHRoIHx8IGltZy53aWR0aDtcbiAgICBoZWlnaHQgPSBoZWlnaHQgfHwgaW1nLmhlaWdodDtcbiAgICBpbWcgPSBpbWcuX2NhbnZhcyA/IGltZy5fY2FudmFzIDogaW1nO1xuICAgIHRoaXMuY29udGV4dC5kcmF3SW1hZ2UoaW1nLCB4LCB5LCB3aWR0aCwgaGVpZ2h0KTtcbiAgICB0aGlzLl90b3VjaCh4LCB5LCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCk7XG59O1xuXG4vKipcbiAqIERyYXdzIGEgbGluZVxuICogQHBhcmFtICB7ZmxvYXR9IHgxXG4gKiBAcGFyYW0gIHtmbG9hdH0geTFcbiAqIEBwYXJhbSAge2Zsb2F0fSB4MlxuICogQHBhcmFtICB7ZmxvYXR9IHkyXG4gKiBAcGFyYW0gIHtkaWN0aW9uYXJ5fSBvcHRpb25zLCBzZWUgX2FwcGx5X29wdGlvbnMoKSBmb3IgZGV0YWlsc1xuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5kcmF3X2xpbmUgPSBmdW5jdGlvbih4MSwgeTEsIHgyLCB5Miwgb3B0aW9ucykge1xuICAgIHgxID0gdGhpcy5fdHgoeDEpO1xuICAgIHkxID0gdGhpcy5fdHkoeTEpO1xuICAgIHgyID0gdGhpcy5fdHgoeDIpO1xuICAgIHkyID0gdGhpcy5fdHkoeTIpO1xuICAgIHRoaXMuY29udGV4dC5iZWdpblBhdGgoKTtcbiAgICB0aGlzLmNvbnRleHQubW92ZVRvKHgxLCB5MSk7XG4gICAgdGhpcy5jb250ZXh0LmxpbmVUbyh4MiwgeTIpO1xuICAgIHRoaXMuX2RvX2RyYXcob3B0aW9ucyk7XG4gICAgdGhpcy5fdG91Y2goeDEsIHkxLCB4MiwgeTIpO1xufTtcblxuLyoqXG4gKiBEcmF3cyBhIHBvbHkgbGluZVxuICogQHBhcmFtICB7YXJyYXl9IHBvaW50cyAtIGFycmF5IG9mIHBvaW50cy4gIEVhY2ggcG9pbnQgaXNcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICBhbiBhcnJheSBpdHNlbGYsIG9mIHRoZSBmb3JtIFt4LCB5XSBcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICB3aGVyZSB4IGFuZCB5IGFyZSBmbG9hdGluZyBwb2ludFxuICogICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlcy5cbiAqIEBwYXJhbSAge2RpY3Rpb25hcnl9IG9wdGlvbnMsIHNlZSBfYXBwbHlfb3B0aW9ucygpIGZvciBkZXRhaWxzXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DYW52YXMucHJvdG90eXBlLmRyYXdfcG9seWxpbmUgPSBmdW5jdGlvbihwb2ludHMsIG9wdGlvbnMpIHtcbiAgICBpZiAocG9pbnRzLmxlbmd0aCA8IDIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQb2x5IGxpbmUgbXVzdCBoYXZlIGF0bGVhc3QgdHdvIHBvaW50cy4nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmNvbnRleHQuYmVnaW5QYXRoKCk7XG4gICAgICAgIHZhciBwb2ludCA9IHBvaW50c1swXTtcbiAgICAgICAgdGhpcy5jb250ZXh0Lm1vdmVUbyh0aGlzLl90eChwb2ludFswXSksIHRoaXMuX3R5KHBvaW50WzFdKSk7XG5cbiAgICAgICAgdmFyIG1pbnggPSB0aGlzLndpZHRoO1xuICAgICAgICB2YXIgbWlueSA9IHRoaXMuaGVpZ2h0O1xuICAgICAgICB2YXIgbWF4eCA9IDA7XG4gICAgICAgIHZhciBtYXh5ID0gMDtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBwb2ludHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHBvaW50ID0gcG9pbnRzW2ldO1xuICAgICAgICAgICAgdGhpcy5jb250ZXh0LmxpbmVUbyh0aGlzLl90eChwb2ludFswXSksIHRoaXMuX3R5KHBvaW50WzFdKSk7XG5cbiAgICAgICAgICAgIG1pbnggPSBNYXRoLm1pbih0aGlzLl90eChwb2ludFswXSksIG1pbngpO1xuICAgICAgICAgICAgbWlueSA9IE1hdGgubWluKHRoaXMuX3R5KHBvaW50WzFdKSwgbWlueSk7XG4gICAgICAgICAgICBtYXh4ID0gTWF0aC5tYXgodGhpcy5fdHgocG9pbnRbMF0pLCBtYXh4KTtcbiAgICAgICAgICAgIG1heHkgPSBNYXRoLm1heCh0aGlzLl90eShwb2ludFsxXSksIG1heHkpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2RvX2RyYXcob3B0aW9ucyk7IFxuICAgICAgICB0aGlzLl90b3VjaChtaW54LCBtaW55LCBtYXh4LCBtYXh5KTsgICBcbiAgICB9XG59O1xuXG4vKipcbiAqIERyYXdzIGEgdGV4dCBzdHJpbmdcbiAqIEBwYXJhbSAge2Zsb2F0fSB4XG4gKiBAcGFyYW0gIHtmbG9hdH0geVxuICogQHBhcmFtICB7c3RyaW5nfSB0ZXh0IHN0cmluZyBvciBjYWxsYmFjayB0aGF0IHJlc29sdmVzIHRvIGEgc3RyaW5nLlxuICogQHBhcmFtICB7ZGljdGlvbmFyeX0gb3B0aW9ucywgc2VlIF9hcHBseV9vcHRpb25zKCkgZm9yIGRldGFpbHNcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuZHJhd190ZXh0ID0gZnVuY3Rpb24oeCwgeSwgdGV4dCwgb3B0aW9ucykge1xuICAgIHggPSB0aGlzLl90eCh4KTtcbiAgICB5ID0gdGhpcy5fdHkoeSk7XG4gICAgb3B0aW9ucyA9IHRoaXMuX2FwcGx5X29wdGlvbnMob3B0aW9ucyk7XG4gICAgLy8gJ2ZpbGwnIHRoZSB0ZXh0IGJ5IGRlZmF1bHQgd2hlbiBuZWl0aGVyIGEgc3Ryb2tlIG9yIGZpbGwgXG4gICAgLy8gaXMgZGVmaW5lZC4gIE90aGVyd2lzZSBvbmx5IGZpbGwgaWYgYSBmaWxsIGlzIGRlZmluZWQuXG4gICAgaWYgKG9wdGlvbnMuZmlsbCB8fCAhb3B0aW9ucy5zdHJva2UpIHtcbiAgICAgICAgdGhpcy5jb250ZXh0LmZpbGxUZXh0KHRleHQsIHgsIHkpO1xuICAgIH1cbiAgICAvLyBPbmx5IHN0cm9rZSBpZiBhIHN0cm9rZSBpcyBkZWZpbmVkLlxuICAgIGlmIChvcHRpb25zLnN0cm9rZSkge1xuICAgICAgICB0aGlzLmNvbnRleHQuc3Ryb2tlVGV4dCh0ZXh0LCB4LCB5KTsgICAgICAgXG4gICAgfVxuICAgIHRoaXMuX3RvdWNoKHgsIHksIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KTtcbn07XG5cbi8qKlxuICogR2V0J3MgYSBjaHVuayBvZiB0aGUgY2FudmFzIGFzIGEgcmF3IGltYWdlLlxuICogQHBhcmFtICB7ZmxvYXR9IChvcHRpb25hbCkgeFxuICogQHBhcmFtICB7ZmxvYXR9IChvcHRpb25hbCkgeVxuICogQHBhcmFtICB7ZmxvYXR9IChvcHRpb25hbCkgd2lkdGhcbiAqIEBwYXJhbSAge2Zsb2F0fSAob3B0aW9uYWwpIGhlaWdodFxuICogQHJldHVybiB7aW1hZ2V9IGNhbnZhcyBpbWFnZSBkYXRhXG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuZ2V0X3Jhd19pbWFnZSA9IGZ1bmN0aW9uKHgsIHksIHdpZHRoLCBoZWlnaHQpIHtcbiAgICBjb25zb2xlLndhcm4oJ2dldF9yYXdfaW1hZ2UgaW1hZ2UgaXMgc2xvdywgdXNlIGNhbnZhcyByZWZlcmVuY2VzIGluc3RlYWQgd2l0aCBkcmF3X2ltYWdlJyk7XG4gICAgaWYgKHg9PT11bmRlZmluZWQpIHtcbiAgICAgICAgeCA9IDA7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgeCA9IHRoaXMuX3R4KHgpO1xuICAgIH1cbiAgICBpZiAoeT09PXVuZGVmaW5lZCkge1xuICAgICAgICB5ID0gMDtcbiAgICB9IGVsc2Uge1xuICAgICAgICB5ID0gdGhpcy5fdHkoeSk7XG4gICAgfVxuICAgIGlmICh3aWR0aCA9PT0gdW5kZWZpbmVkKSB3aWR0aCA9IHRoaXMud2lkdGg7XG4gICAgaWYgKGhlaWdodCA9PT0gdW5kZWZpbmVkKSBoZWlnaHQgPSB0aGlzLmhlaWdodDtcblxuICAgIC8vIE11bHRpcGx5IGJ5IHR3byBmb3IgcGl4ZWwgZG91YmxpbmcuXG4gICAgeCA9IDIgKiB4O1xuICAgIHkgPSAyICogeTtcbiAgICB3aWR0aCA9IDIgKiB3aWR0aDtcbiAgICBoZWlnaHQgPSAyICogaGVpZ2h0O1xuICAgIFxuICAgIC8vIFVwZGF0ZSB0aGUgY2FjaGVkIGltYWdlIGlmIGl0J3Mgbm90IHRoZSByZXF1ZXN0ZWQgb25lLlxuICAgIHZhciByZWdpb24gPSBbeCwgeSwgd2lkdGgsIGhlaWdodF07XG4gICAgaWYgKCEodGhpcy5fY2FjaGVkX3RpbWVzdGFtcCA9PT0gdGhpcy5fbW9kaWZpZWQgJiYgdXRpbHMuY29tcGFyZV9hcnJheXMocmVnaW9uLCB0aGlzLl9jYWNoZWRfcmVnaW9uKSkpIHtcbiAgICAgICAgdGhpcy5fY2FjaGVkX2ltYWdlID0gdGhpcy5jb250ZXh0LmdldEltYWdlRGF0YSh4LCB5LCB3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgdGhpcy5fY2FjaGVkX3RpbWVzdGFtcCA9IHRoaXMuX21vZGlmaWVkO1xuICAgICAgICB0aGlzLl9jYWNoZWRfcmVnaW9uID0gcmVnaW9uO1xuICAgIH1cblxuICAgIC8vIFJldHVybiB0aGUgY2FjaGVkIGltYWdlLlxuICAgIHJldHVybiB0aGlzLl9jYWNoZWRfaW1hZ2U7XG59O1xuXG4vKipcbiAqIFB1dCdzIGEgcmF3IGltYWdlIG9uIHRoZSBjYW52YXMgc29tZXdoZXJlLlxuICogQHBhcmFtICB7ZmxvYXR9IHhcbiAqIEBwYXJhbSAge2Zsb2F0fSB5XG4gKiBAcmV0dXJuIHtpbWFnZX0gY2FudmFzIGltYWdlIGRhdGFcbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5wdXRfcmF3X2ltYWdlID0gZnVuY3Rpb24oaW1nLCB4LCB5KSB7XG4gICAgY29uc29sZS53YXJuKCdwdXRfcmF3X2ltYWdlIGltYWdlIGlzIHNsb3csIHVzZSBkcmF3X2ltYWdlIGluc3RlYWQnKTtcbiAgICB4ID0gdGhpcy5fdHgoeCk7XG4gICAgeSA9IHRoaXMuX3R5KHkpO1xuICAgIC8vIE11bHRpcGx5IGJ5IHR3byBmb3IgcGl4ZWwgZG91YmxpbmcuXG4gICAgcmV0ID0gdGhpcy5jb250ZXh0LnB1dEltYWdlRGF0YShpbWcsIHgqMiwgeSoyKTtcbiAgICB0aGlzLl90b3VjaCh4LCB5LCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCk7XG4gICAgcmV0dXJuIHJldDtcbn07XG5cbi8qKlxuICogTWVhc3VyZXMgdGhlIHdpZHRoIG9mIGEgdGV4dCBzdHJpbmcuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IHRleHRcbiAqIEBwYXJhbSAge2RpY3Rpb25hcnl9IG9wdGlvbnMsIHNlZSBfYXBwbHlfb3B0aW9ucygpIGZvciBkZXRhaWxzXG4gKiBAcmV0dXJuIHtmbG9hdH0gd2lkdGhcbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5tZWFzdXJlX3RleHQgPSBmdW5jdGlvbih0ZXh0LCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IHRoaXMuX2FwcGx5X29wdGlvbnMob3B0aW9ucyk7XG5cbiAgICAvLyBDYWNoZSB0aGUgc2l6ZSBpZiBpdCdzIG5vdCBhbHJlYWR5IGNhY2hlZC5cbiAgICBpZiAodGhpcy5fdGV4dF9zaXplX2NhY2hlW3RleHRdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5fdGV4dF9zaXplX2NhY2hlW3RleHRdID0gdGhpcy5jb250ZXh0Lm1lYXN1cmVUZXh0KHRleHQpLndpZHRoO1xuICAgICAgICB0aGlzLl90ZXh0X3NpemVfYXJyYXkucHVzaCh0ZXh0KTtcblxuICAgICAgICAvLyBSZW1vdmUgdGhlIG9sZGVzdCBpdGVtIGluIHRoZSBhcnJheSBpZiB0aGUgY2FjaGUgaXMgdG9vIGxhcmdlLlxuICAgICAgICB3aGlsZSAodGhpcy5fdGV4dF9zaXplX2FycmF5Lmxlbmd0aCA+IHRoaXMuX3RleHRfc2l6ZV9jYWNoZV9zaXplKSB7XG4gICAgICAgICAgICB2YXIgb2xkZXN0ID0gdGhpcy5fdGV4dF9zaXplX2FycmF5LnNoaWZ0KCk7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fdGV4dF9zaXplX2NhY2hlW29sZGVzdF07XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLy8gVXNlIHRoZSBjYWNoZWQgc2l6ZS5cbiAgICByZXR1cm4gdGhpcy5fdGV4dF9zaXplX2NhY2hlW3RleHRdO1xufTtcblxuLyoqXG4gKiBDbGVhcidzIHRoZSBjYW52YXMuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DYW52YXMucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5jb250ZXh0LmNsZWFyUmVjdCgwLCAwLCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCk7XG4gICAgdGhpcy5fdG91Y2goKTtcbn07XG5cbi8qKlxuICogU2NhbGUgdGhlIGN1cnJlbnQgZHJhd2luZy5cbiAqIEBwYXJhbSAge2Zsb2F0fSB4XG4gKiBAcGFyYW0gIHtmbG9hdH0geVxuICogQHJldHVybiB7bnVsbH0gIFxuICovXG5DYW52YXMucHJvdG90eXBlLnNjYWxlID0gZnVuY3Rpb24oeCwgeSkge1xuICAgIHRoaXMuY29udGV4dC5zY2FsZSh4LCB5KTtcbiAgICB0aGlzLl90b3VjaCgpO1xufTtcblxuLyoqXG4gKiBGaW5pc2hlcyB0aGUgZHJhd2luZyBvcGVyYXRpb24gdXNpbmcgdGhlIHNldCBvZiBwcm92aWRlZCBvcHRpb25zLlxuICogQHBhcmFtICB7ZGljdGlvbmFyeX0gKG9wdGlvbmFsKSBkaWN0aW9uYXJ5IHRoYXQgXG4gKiAgcmVzb2x2ZXMgdG8gYSBkaWN0aW9uYXJ5LlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5fZG9fZHJhdyA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gdGhpcy5fYXBwbHlfb3B0aW9ucyhvcHRpb25zKTtcblxuICAgIC8vIE9ubHkgZmlsbCBpZiBhIGZpbGwgaXMgZGVmaW5lZC5cbiAgICBpZiAob3B0aW9ucy5maWxsKSB7XG4gICAgICAgIHRoaXMuY29udGV4dC5maWxsKCk7XG4gICAgfVxuICAgIC8vIFN0cm9rZSBieSBkZWZhdWx0LCBpZiBubyBzdHJva2Ugb3IgZmlsbCBpcyBkZWZpbmVkLiAgT3RoZXJ3aXNlXG4gICAgLy8gb25seSBzdHJva2UgaWYgYSBzdHJva2UgaXMgZGVmaW5lZC5cbiAgICBpZiAob3B0aW9ucy5zdHJva2UgfHwgIW9wdGlvbnMuZmlsbCkge1xuICAgICAgICB0aGlzLmNvbnRleHQuc3Ryb2tlKCk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBBcHBsaWVzIGEgZGljdGlvbmFyeSBvZiBkcmF3aW5nIG9wdGlvbnMgdG8gdGhlIHBlbi5cbiAqIEBwYXJhbSAge2RpY3Rpb25hcnl9IG9wdGlvbnNcbiAqICAgICAgYWxwaGEge2Zsb2F0fSBPcGFjaXR5ICgwLTEpXG4gKiAgICAgIGNvbXBvc2l0ZV9vcGVyYXRpb24ge3N0cmluZ30gSG93IG5ldyBpbWFnZXMgYXJlIFxuICogICAgICAgICAgZHJhd24gb250byBhbiBleGlzdGluZyBpbWFnZS4gIFBvc3NpYmxlIHZhbHVlc1xuICogICAgICAgICAgYXJlIGBzb3VyY2Utb3ZlcmAsIGBzb3VyY2UtYXRvcGAsIGBzb3VyY2UtaW5gLCBcbiAqICAgICAgICAgIGBzb3VyY2Utb3V0YCwgYGRlc3RpbmF0aW9uLW92ZXJgLCBcbiAqICAgICAgICAgIGBkZXN0aW5hdGlvbi1hdG9wYCwgYGRlc3RpbmF0aW9uLWluYCwgXG4gKiAgICAgICAgICBgZGVzdGluYXRpb24tb3V0YCwgYGxpZ2h0ZXJgLCBgY29weWAsIG9yIGB4b3JgLlxuICogICAgICBsaW5lX2NhcCB7c3RyaW5nfSBFbmQgY2FwIHN0eWxlIGZvciBsaW5lcy5cbiAqICAgICAgICAgIFBvc3NpYmxlIHZhbHVlcyBhcmUgJ2J1dHQnLCAncm91bmQnLCBvciAnc3F1YXJlJy5cbiAqICAgICAgbGluZV9qb2luIHtzdHJpbmd9IEhvdyB0byByZW5kZXIgd2hlcmUgdHdvIGxpbmVzXG4gKiAgICAgICAgICBtZWV0LiAgUG9zc2libGUgdmFsdWVzIGFyZSAnYmV2ZWwnLCAncm91bmQnLCBvclxuICogICAgICAgICAgJ21pdGVyJy5cbiAqICAgICAgbGluZV93aWR0aCB7ZmxvYXR9IEhvdyB0aGljayBsaW5lcyBhcmUuXG4gKiAgICAgIGxpbmVfbWl0ZXJfbGltaXQge2Zsb2F0fSBNYXggbGVuZ3RoIG9mIG1pdGVycy5cbiAqICAgICAgbGluZV9jb2xvciB7c3RyaW5nfSBDb2xvciBvZiB0aGUgbGluZS5cbiAqICAgICAgZmlsbF9jb2xvciB7c3RyaW5nfSBDb2xvciB0byBmaWxsIHRoZSBzaGFwZS5cbiAqICAgICAgY29sb3Ige3N0cmluZ30gQ29sb3IgdG8gc3Ryb2tlIGFuZCBmaWxsIHRoZSBzaGFwZS5cbiAqICAgICAgICAgIExvd2VyIHByaW9yaXR5IHRvIGxpbmVfY29sb3IgYW5kIGZpbGxfY29sb3IuXG4gKiAgICAgIGZvbnRfc3R5bGUge3N0cmluZ31cbiAqICAgICAgZm9udF92YXJpYW50IHtzdHJpbmd9XG4gKiAgICAgIGZvbnRfd2VpZ2h0IHtzdHJpbmd9XG4gKiAgICAgIGZvbnRfc2l6ZSB7c3RyaW5nfVxuICogICAgICBmb250X2ZhbWlseSB7c3RyaW5nfVxuICogICAgICBmb250IHtzdHJpbmd9IE92ZXJyaWRkZXMgYWxsIG90aGVyIGZvbnQgcHJvcGVydGllcy5cbiAqICAgICAgdGV4dF9hbGlnbiB7c3RyaW5nfSBIb3Jpem9udGFsIGFsaWdubWVudCBvZiB0ZXh0LiAgXG4gKiAgICAgICAgICBQb3NzaWJsZSB2YWx1ZXMgYXJlIGBzdGFydGAsIGBlbmRgLCBgY2VudGVyYCxcbiAqICAgICAgICAgIGBsZWZ0YCwgb3IgYHJpZ2h0YC5cbiAqICAgICAgdGV4dF9iYXNlbGluZSB7c3RyaW5nfSBWZXJ0aWNhbCBhbGlnbm1lbnQgb2YgdGV4dC5cbiAqICAgICAgICAgIFBvc3NpYmxlIHZhbHVlcyBhcmUgYGFscGhhYmV0aWNgLCBgdG9wYCwgXG4gKiAgICAgICAgICBgaGFuZ2luZ2AsIGBtaWRkbGVgLCBgaWRlb2dyYXBoaWNgLCBvciBcbiAqICAgICAgICAgIGBib3R0b21gLlxuICogQHJldHVybiB7ZGljdGlvbmFyeX0gb3B0aW9ucywgcmVzb2x2ZWQuXG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuX2FwcGx5X29wdGlvbnMgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgb3B0aW9ucyA9IHV0aWxzLnJlc29sdmVfY2FsbGFibGUob3B0aW9ucyk7XG5cbiAgICAvLyBTcGVjaWFsIG9wdGlvbnMuXG4gICAgdmFyIHNldF9vcHRpb25zID0ge307XG4gICAgc2V0X29wdGlvbnMuZ2xvYmFsQWxwaGEgPSBvcHRpb25zLmFscGhhPT09dW5kZWZpbmVkID8gMS4wIDogb3B0aW9ucy5hbHBoYTtcbiAgICBzZXRfb3B0aW9ucy5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb24gPSBvcHRpb25zLmNvbXBvc2l0ZV9vcGVyYXRpb24gfHwgJ3NvdXJjZS1vdmVyJztcbiAgICBcbiAgICAvLyBMaW5lIHN0eWxlLlxuICAgIHNldF9vcHRpb25zLmxpbmVDYXAgPSBvcHRpb25zLmxpbmVfY2FwIHx8ICdidXR0JztcbiAgICBzZXRfb3B0aW9ucy5saW5lSm9pbiA9IG9wdGlvbnMubGluZV9qb2luIHx8ICdiZXZlbCc7XG4gICAgc2V0X29wdGlvbnMubGluZVdpZHRoID0gb3B0aW9ucy5saW5lX3dpZHRoPT09dW5kZWZpbmVkID8gMS4wIDogb3B0aW9ucy5saW5lX3dpZHRoO1xuICAgIHNldF9vcHRpb25zLm1pdGVyTGltaXQgPSBvcHRpb25zLmxpbmVfbWl0ZXJfbGltaXQ9PT11bmRlZmluZWQgPyAxMCA6IG9wdGlvbnMubGluZV9taXRlcl9saW1pdDtcbiAgICB0aGlzLmNvbnRleHQuc3Ryb2tlU3R5bGUgPSBvcHRpb25zLmxpbmVfY29sb3IgfHwgb3B0aW9ucy5jb2xvciB8fCAnYmxhY2snOyAvLyBUT0RPOiBTdXBwb3J0IGdyYWRpZW50XG4gICAgb3B0aW9ucy5zdHJva2UgPSAob3B0aW9ucy5saW5lX2NvbG9yICE9PSB1bmRlZmluZWQgfHwgb3B0aW9ucy5saW5lX3dpZHRoICE9PSB1bmRlZmluZWQpO1xuXG4gICAgLy8gRmlsbCBzdHlsZS5cbiAgICB0aGlzLmNvbnRleHQuZmlsbFN0eWxlID0gb3B0aW9ucy5maWxsX2NvbG9yIHx8IG9wdGlvbnMuY29sb3IgfHwgJ3JlZCc7IC8vIFRPRE86IFN1cHBvcnQgZ3JhZGllbnRcbiAgICBvcHRpb25zLmZpbGwgPSBvcHRpb25zLmZpbGxfY29sb3IgIT09IHVuZGVmaW5lZDtcblxuICAgIC8vIEZvbnQgc3R5bGUuXG4gICAgdmFyIHBpeGVscyA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgaWYgKHggIT09IHVuZGVmaW5lZCAmJiB4ICE9PSBudWxsKSB7XG4gICAgICAgICAgICBpZiAoTnVtYmVyLmlzRmluaXRlKHgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFN0cmluZyh4KSArICdweCc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB4O1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHZhciBmb250X3N0eWxlID0gb3B0aW9ucy5mb250X3N0eWxlIHx8ICcnO1xuICAgIHZhciBmb250X3ZhcmlhbnQgPSBvcHRpb25zLmZvbnRfdmFyaWFudCB8fCAnJztcbiAgICB2YXIgZm9udF93ZWlnaHQgPSBvcHRpb25zLmZvbnRfd2VpZ2h0IHx8ICcnO1xuICAgIHZhciBmb250X3NpemUgPSBwaXhlbHMob3B0aW9ucy5mb250X3NpemUpIHx8ICcxMnB4JztcbiAgICB2YXIgZm9udF9mYW1pbHkgPSBvcHRpb25zLmZvbnRfZmFtaWx5IHx8ICdBcmlhbCc7XG4gICAgdmFyIGZvbnQgPSBmb250X3N0eWxlICsgJyAnICsgZm9udF92YXJpYW50ICsgJyAnICsgZm9udF93ZWlnaHQgKyAnICcgKyBmb250X3NpemUgKyAnICcgKyBmb250X2ZhbWlseTtcbiAgICBzZXRfb3B0aW9ucy5mb250ID0gb3B0aW9ucy5mb250IHx8IGZvbnQ7XG5cbiAgICAvLyBUZXh0IHN0eWxlLlxuICAgIHNldF9vcHRpb25zLnRleHRBbGlnbiA9IG9wdGlvbnMudGV4dF9hbGlnbiB8fCAnbGVmdCc7XG4gICAgc2V0X29wdGlvbnMudGV4dEJhc2VsaW5lID0gb3B0aW9ucy50ZXh0X2Jhc2VsaW5lIHx8ICd0b3AnO1xuXG4gICAgLy8gVE9ETzogU3VwcG9ydCBzaGFkb3dzLlxuICAgIFxuICAgIC8vIEVtcHR5IHRoZSBtZWFzdXJlIHRleHQgY2FjaGUgaWYgdGhlIGZvbnQgaXMgY2hhbmdlZC5cbiAgICBpZiAoc2V0X29wdGlvbnMuZm9udCAhPT0gdGhpcy5fbGFzdF9zZXRfb3B0aW9ucy5mb250KSB7XG4gICAgICAgIHRoaXMuX3RleHRfc2l6ZV9jYWNoZSA9IHt9O1xuICAgICAgICB0aGlzLl90ZXh0X3NpemVfYXJyYXkgPSBbXTtcbiAgICB9XG4gICAgXG4gICAgLy8gU2V0IHRoZSBvcHRpb25zIG9uIHRoZSBjb250ZXh0IG9iamVjdC4gIE9ubHkgc2V0IG9wdGlvbnMgdGhhdFxuICAgIC8vIGhhdmUgY2hhbmdlZCBzaW5jZSB0aGUgbGFzdCBjYWxsLlxuICAgIGZvciAodmFyIGtleSBpbiBzZXRfb3B0aW9ucykge1xuICAgICAgICBpZiAoc2V0X29wdGlvbnMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuX2xhc3Rfc2V0X29wdGlvbnNba2V5XSAhPT0gc2V0X29wdGlvbnNba2V5XSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2xhc3Rfc2V0X29wdGlvbnNba2V5XSA9IHNldF9vcHRpb25zW2tleV07XG4gICAgICAgICAgICAgICAgdGhpcy5jb250ZXh0W2tleV0gPSBzZXRfb3B0aW9uc1trZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG9wdGlvbnM7XG59O1xuXG4vKipcbiAqIFVwZGF0ZSB0aGUgdGltZXN0YW1wIHRoYXQgdGhlIGNhbnZhcyB3YXMgbW9kaWZpZWQgYW5kXG4gKiB0aGUgcmVnaW9uIHRoYXQgaGFzIGNvbnRlbnRzIHJlbmRlcmVkIHRvIGl0LlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5fdG91Y2ggPSBmdW5jdGlvbih4MSwgeTEsIHgyLCB5Mikge1xuICAgIHRoaXMuX21vZGlmaWVkID0gRGF0ZS5ub3coKTtcblxuICAgIC8vIFNldCB0aGUgcmVuZGVyIHJlZ2lvbi5cbiAgICB2YXIgY29tcGFyaXRvciA9IGZ1bmN0aW9uKG9sZF92YWx1ZSwgbmV3X3ZhbHVlLCBjb21wYXJpc29uKSB7XG4gICAgICAgIGlmIChvbGRfdmFsdWUgPT09IG51bGwgfHwgb2xkX3ZhbHVlID09PSB1bmRlZmluZWQgfHwgbmV3X3ZhbHVlID09PSBudWxsIHx8IG5ld192YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3X3ZhbHVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGNvbXBhcmlzb24uY2FsbCh1bmRlZmluZWQsIG9sZF92YWx1ZSwgbmV3X3ZhbHVlKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdGhpcy5fcmVuZGVyZWRfcmVnaW9uWzBdID0gY29tcGFyaXRvcih0aGlzLl9yZW5kZXJlZF9yZWdpb25bMF0sIHgxLCBNYXRoLm1pbik7XG4gICAgdGhpcy5fcmVuZGVyZWRfcmVnaW9uWzFdID0gY29tcGFyaXRvcih0aGlzLl9yZW5kZXJlZF9yZWdpb25bMV0sIHkxLCBNYXRoLm1pbik7XG4gICAgdGhpcy5fcmVuZGVyZWRfcmVnaW9uWzJdID0gY29tcGFyaXRvcih0aGlzLl9yZW5kZXJlZF9yZWdpb25bMl0sIHgyLCBNYXRoLm1heCk7XG4gICAgdGhpcy5fcmVuZGVyZWRfcmVnaW9uWzNdID0gY29tcGFyaXRvcih0aGlzLl9yZW5kZXJlZF9yZWdpb25bM10sIHkyLCBNYXRoLm1heCk7XG59O1xuXG4vKipcbiAqIFRyYW5zZm9ybSBhbiB4IHZhbHVlIGJlZm9yZSByZW5kZXJpbmcuXG4gKiBAcGFyYW0gIHtmbG9hdH0geFxuICogQHBhcmFtICB7Ym9vbGVhbn0gaW52ZXJzZSAtIHBlcmZvcm0gaW52ZXJzZSB0cmFuc2Zvcm1hdGlvblxuICogQHJldHVybiB7ZmxvYXR9XG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuX3R4ID0gZnVuY3Rpb24oeCwgaW52ZXJzZSkgeyByZXR1cm4geDsgfTtcblxuLyoqXG4gKiBUcmFuc2Zvcm0gYSB5IHZhbHVlIGJlZm9yZSByZW5kZXJpbmcuXG4gKiBAcGFyYW0gIHtmbG9hdH0geVxuICogQHBhcmFtICB7Ym9vbGVhbn0gaW52ZXJzZSAtIHBlcmZvcm0gaW52ZXJzZSB0cmFuc2Zvcm1hdGlvblxuICogQHJldHVybiB7ZmxvYXR9XG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuX3R5ID0gZnVuY3Rpb24oeSwgaW52ZXJzZSkgeyByZXR1cm4geTsgfTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5DYW52YXMgPSBDYW52YXM7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG5cbi8qKlxuICogRXZlbnRmdWwgY2xpcGJvYXJkIHN1cHBvcnRcbiAqXG4gKiBXQVJOSU5HOiAgVGhpcyBjbGFzcyBpcyBhIGh1ZGdlIGtsdWRnZSB0aGF0IHdvcmtzIGFyb3VuZCB0aGUgcHJlaGlzdG9yaWNcbiAqIGNsaXBib2FyZCBzdXBwb3J0IChsYWNrIHRoZXJlb2YpIGluIG1vZGVybiB3ZWJyb3dzZXJzLiAgSXQgY3JlYXRlcyBhIGhpZGRlblxuICogdGV4dGJveCB3aGljaCBpcyBmb2N1c2VkLiAgVGhlIHByb2dyYW1tZXIgbXVzdCBjYWxsIGBzZXRfY2xpcHBhYmxlYCB0byBjaGFuZ2VcbiAqIHdoYXQgd2lsbCBiZSBjb3BpZWQgd2hlbiB0aGUgdXNlciBoaXRzIGtleXMgY29ycmVzcG9uZGluZyB0byBhIGNvcHkgXG4gKiBvcGVyYXRpb24uICBFdmVudHMgYGNvcHlgLCBgY3V0YCwgYW5kIGBwYXN0ZWAgYXJlIHJhaXNlZCBieSB0aGlzIGNsYXNzLlxuICovXG52YXIgQ2xpcGJvYXJkID0gZnVuY3Rpb24oZWwpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX2VsID0gZWw7XG5cbiAgICAvLyBDcmVhdGUgYSB0ZXh0Ym94IHRoYXQncyBoaWRkZW4uXG4gICAgdGhpcy5oaWRkZW5faW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZXh0YXJlYScpO1xuICAgIHRoaXMuaGlkZGVuX2lucHV0LnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAncG9zdGVyIGhpZGRlbi1jbGlwYm9hcmQnKTtcbiAgICBlbC5hcHBlbmRDaGlsZCh0aGlzLmhpZGRlbl9pbnB1dCk7XG5cbiAgICB0aGlzLl9iaW5kX2V2ZW50cygpO1xufTtcbnV0aWxzLmluaGVyaXQoQ2xpcGJvYXJkLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8qKlxuICogU2V0IHdoYXQgd2lsbCBiZSBjb3BpZWQgd2hlbiB0aGUgdXNlciBjb3BpZXMuXG4gKiBAcGFyYW0ge3N0cmluZ30gdGV4dFxuICovXG5DbGlwYm9hcmQucHJvdG90eXBlLnNldF9jbGlwcGFibGUgPSBmdW5jdGlvbih0ZXh0KSB7XG4gICAgdGhpcy5fY2xpcHBhYmxlID0gdGV4dDtcbiAgICB0aGlzLmhpZGRlbl9pbnB1dC52YWx1ZSA9IHRoaXMuX2NsaXBwYWJsZTtcbiAgICB0aGlzLl9mb2N1cygpO1xufTsgXG5cbi8qKlxuICogRm9jdXMgdGhlIGhpZGRlbiB0ZXh0IGFyZWEuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DbGlwYm9hcmQucHJvdG90eXBlLl9mb2N1cyA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuaGlkZGVuX2lucHV0LmZvY3VzKCk7XG4gICAgdGhpcy5oaWRkZW5faW5wdXQuc2VsZWN0KCk7XG59O1xuXG4vKipcbiAqIEhhbmRsZSB3aGVuIHRoZSB1c2VyIHBhc3RlcyBpbnRvIHRoZSB0ZXh0Ym94LlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2xpcGJvYXJkLnByb3RvdHlwZS5faGFuZGxlX3Bhc3RlID0gZnVuY3Rpb24oZSkge1xuICAgIHZhciBwYXN0ZWQgPSBlLmNsaXBib2FyZERhdGEuZ2V0RGF0YShlLmNsaXBib2FyZERhdGEudHlwZXNbMF0pO1xuICAgIHV0aWxzLmNhbmNlbF9idWJibGUoZSk7XG4gICAgdGhpcy50cmlnZ2VyKCdwYXN0ZScsIHBhc3RlZCk7XG59O1xuXG4vKipcbiAqIEJpbmQgZXZlbnRzIG9mIHRoZSBoaWRkZW4gdGV4dGJveC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkNsaXBib2FyZC5wcm90b3R5cGUuX2JpbmRfZXZlbnRzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuXG4gICAgLy8gTGlzdGVuIHRvIGVsJ3MgZm9jdXMgZXZlbnQuICBJZiBlbCBpcyBmb2N1c2VkLCBmb2N1cyB0aGUgaGlkZGVuIGlucHV0XG4gICAgLy8gaW5zdGVhZC5cbiAgICB1dGlscy5ob29rKHRoaXMuX2VsLCAnb25mb2N1cycsIHV0aWxzLnByb3h5KHRoaXMuX2ZvY3VzLCB0aGlzKSk7XG5cbiAgICB1dGlscy5ob29rKHRoaXMuaGlkZGVuX2lucHV0LCAnb25wYXN0ZScsIHV0aWxzLnByb3h5KHRoaXMuX2hhbmRsZV9wYXN0ZSwgdGhpcykpO1xuICAgIHV0aWxzLmhvb2sodGhpcy5oaWRkZW5faW5wdXQsICdvbmN1dCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgLy8gVHJpZ2dlciB0aGUgZXZlbnQgaW4gYSB0aW1lb3V0IHNvIGl0IGZpcmVzIGFmdGVyIHRoZSBzeXN0ZW0gZXZlbnQuXG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHRoYXQudHJpZ2dlcignY3V0JywgdGhhdC5fY2xpcHBhYmxlKTtcbiAgICAgICAgfSwgMCk7XG4gICAgfSk7XG4gICAgdXRpbHMuaG9vayh0aGlzLmhpZGRlbl9pbnB1dCwgJ29uY29weScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgdGhhdC50cmlnZ2VyKCdjb3B5JywgdGhhdC5fY2xpcHBhYmxlKTtcbiAgICB9KTtcbiAgICB1dGlscy5ob29rKHRoaXMuaGlkZGVuX2lucHV0LCAnb25rZXlwcmVzcycsIGZ1bmN0aW9uKCkge1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhhdC5oaWRkZW5faW5wdXQudmFsdWUgPSB0aGF0Ll9jbGlwcGFibGU7XG4gICAgICAgICAgICB0aGF0Ll9mb2N1cygpO1xuICAgICAgICB9LCAwKTtcbiAgICB9KTtcbiAgICB1dGlscy5ob29rKHRoaXMuaGlkZGVuX2lucHV0LCAnb25rZXl1cCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhhdC5oaWRkZW5faW5wdXQudmFsdWUgPSB0aGF0Ll9jbGlwcGFibGU7XG4gICAgICAgICAgICB0aGF0Ll9mb2N1cygpO1xuICAgICAgICB9LCAwKTtcbiAgICB9KTtcbn07XG5cbmV4cG9ydHMuQ2xpcGJvYXJkID0gQ2xpcGJvYXJkO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xuZXhwb3J0cy5jb25maWcgPSBuZXcgdXRpbHMuUG9zdGVyQ2xhc3MoW1xuICAgICdoaWdobGlnaHRfZHJhdycsIC8vIGJvb2wgLSBXaGV0aGVyIG9yIG5vdCB0byBoaWdobGlnaHQgcmUtcmVuZGVyc1xuICAgICduZXdsaW5lX3dpZHRoJywgLy8gaW50ZWdlciAtIFdpZHRoIG9mIG5ld2xpbmUgY2hhcmFjdGVyc1xuXSk7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxudmFyIGtleW1hcCA9IHJlcXVpcmUoJy4vZXZlbnRzL21hcC5qcycpO1xudmFyIHJlZ2lzdGVyID0ga2V5bWFwLk1hcC5yZWdpc3RlcjtcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xuXG4vKipcbiAqIElucHV0IGN1cnNvci5cbiAqL1xudmFyIEN1cnNvciA9IGZ1bmN0aW9uKG1vZGVsKSB7XG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzKTtcbiAgICB0aGlzLl9tb2RlbCA9IG1vZGVsO1xuXG4gICAgdGhpcy5wcmltYXJ5X3JvdyA9IG51bGw7XG4gICAgdGhpcy5wcmltYXJ5X2NoYXIgPSBudWxsO1xuICAgIHRoaXMuc2Vjb25kYXJ5X3JvdyA9IG51bGw7XG4gICAgdGhpcy5zZWNvbmRhcnlfY2hhciA9IG51bGw7XG5cbiAgICB0aGlzLl9pbml0X3Byb3BlcnRpZXMoKTtcbiAgICB0aGlzLl9yZWdpc3Rlcl9hcGkoKTtcbn07XG51dGlscy5pbmhlcml0KEN1cnNvciwgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vKipcbiAqIE1vdmVzIHRoZSBwcmltYXJ5IGN1cnNvciBhIGdpdmVuIG9mZnNldC5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IHhcbiAqIEBwYXJhbSAge2ludGVnZXJ9IHlcbiAqIEBwYXJhbSAge2Jvb2xlYW59IChvcHRpb25hbCkgaG9wPWZhbHNlIC0gaG9wIHRvIHRoZSBvdGhlciBzaWRlIG9mIHRoZVxuICogICAgICAgICAgICAgICAgICAgc2VsZWN0ZWQgcmVnaW9uIGlmIHRoZSBwcmltYXJ5IGlzIG9uIHRoZSBvcHBvc2l0ZSBvZiB0aGVcbiAqICAgICAgICAgICAgICAgICAgIGRpcmVjdGlvbiBvZiBtb3Rpb24uXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3IucHJvdG90eXBlLm1vdmVfcHJpbWFyeSA9IGZ1bmN0aW9uKHgsIHksIGhvcCkge1xuICAgIGlmIChob3ApIHtcbiAgICAgICAgaWYgKHRoaXMucHJpbWFyeV9yb3cgIT0gdGhpcy5zZWNvbmRhcnlfcm93IHx8IHRoaXMucHJpbWFyeV9jaGFyICE9IHRoaXMuc2Vjb25kYXJ5X2NoYXIpIHtcbiAgICAgICAgICAgIHZhciBzdGFydF9yb3cgPSB0aGlzLnN0YXJ0X3JvdztcbiAgICAgICAgICAgIHZhciBzdGFydF9jaGFyID0gdGhpcy5zdGFydF9jaGFyO1xuICAgICAgICAgICAgdmFyIGVuZF9yb3cgPSB0aGlzLmVuZF9yb3c7XG4gICAgICAgICAgICB2YXIgZW5kX2NoYXIgPSB0aGlzLmVuZF9jaGFyO1xuICAgICAgICAgICAgaWYgKHg8MCB8fCB5PDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLnByaW1hcnlfcm93ID0gc3RhcnRfcm93O1xuICAgICAgICAgICAgICAgIHRoaXMucHJpbWFyeV9jaGFyID0gc3RhcnRfY2hhcjtcbiAgICAgICAgICAgICAgICB0aGlzLnNlY29uZGFyeV9yb3cgPSBlbmRfcm93O1xuICAgICAgICAgICAgICAgIHRoaXMuc2Vjb25kYXJ5X2NoYXIgPSBlbmRfY2hhcjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wcmltYXJ5X3JvdyA9IGVuZF9yb3c7XG4gICAgICAgICAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgPSBlbmRfY2hhcjtcbiAgICAgICAgICAgICAgICB0aGlzLnNlY29uZGFyeV9yb3cgPSBzdGFydF9yb3c7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWNvbmRhcnlfY2hhciA9IHN0YXJ0X2NoYXI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoeCA8IDApIHtcbiAgICAgICAgaWYgKHRoaXMucHJpbWFyeV9jaGFyICsgeCA8IDApIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnByaW1hcnlfcm93ID09PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgPSAwO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnByaW1hcnlfcm93IC09IDE7XG4gICAgICAgICAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgPSB0aGlzLl9tb2RlbC5fcm93c1t0aGlzLnByaW1hcnlfcm93XS5sZW5ndGg7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnByaW1hcnlfY2hhciArPSB4O1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmICh4ID4gMCkge1xuICAgICAgICBpZiAodGhpcy5wcmltYXJ5X2NoYXIgKyB4ID4gdGhpcy5fbW9kZWwuX3Jvd3NbdGhpcy5wcmltYXJ5X3Jvd10ubGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5wcmltYXJ5X3JvdyA9PT0gdGhpcy5fbW9kZWwuX3Jvd3MubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgICAgIHRoaXMucHJpbWFyeV9jaGFyID0gdGhpcy5fbW9kZWwuX3Jvd3NbdGhpcy5wcmltYXJ5X3Jvd10ubGVuZ3RoO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnByaW1hcnlfcm93ICs9IDE7XG4gICAgICAgICAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgKz0geDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFJlbWVtYmVyIHRoZSBjaGFyYWN0ZXIgcG9zaXRpb24sIHZlcnRpY2FsIG5hdmlnYXRpb24gYWNyb3NzIGVtcHR5IGxpbmVzXG4gICAgLy8gc2hvdWxkbid0IGNhdXNlIHRoZSBob3Jpem9udGFsIHBvc2l0aW9uIHRvIGJlIGxvc3QuXG4gICAgaWYgKHggIT09IDApIHtcbiAgICAgICAgdGhpcy5fbWVtb3J5X2NoYXIgPSB0aGlzLnByaW1hcnlfY2hhcjtcbiAgICB9XG5cbiAgICBpZiAoeSAhPT0gMCkge1xuICAgICAgICB0aGlzLnByaW1hcnlfcm93ICs9IHk7XG4gICAgICAgIHRoaXMucHJpbWFyeV9yb3cgPSBNYXRoLm1pbihNYXRoLm1heCh0aGlzLnByaW1hcnlfcm93LCAwKSwgdGhpcy5fbW9kZWwuX3Jvd3MubGVuZ3RoLTEpO1xuICAgICAgICBpZiAodGhpcy5fbWVtb3J5X2NoYXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgPSB0aGlzLl9tZW1vcnlfY2hhcjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5wcmltYXJ5X2NoYXIgPiB0aGlzLl9tb2RlbC5fcm93c1t0aGlzLnByaW1hcnlfcm93XS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMucHJpbWFyeV9jaGFyID0gdGhpcy5fbW9kZWwuX3Jvd3NbdGhpcy5wcmltYXJ5X3Jvd10ubGVuZ3RoO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnKTsgXG59O1xuXG4vKipcbiAqIFdhbGsgdGhlIHByaW1hcnkgY3Vyc29yIGluIGEgZGlyZWN0aW9uIHVudGlsIGEgbm90LXRleHQgY2hhcmFjdGVyIGlzIGZvdW5kLlxuICogQHBhcmFtICB7aW50ZWdlcn0gZGlyZWN0aW9uXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3IucHJvdG90eXBlLndvcmRfcHJpbWFyeSA9IGZ1bmN0aW9uKGRpcmVjdGlvbikge1xuICAgIC8vIE1ha2Ugc3VyZSBkaXJlY3Rpb24gaXMgMSBvciAtMS5cbiAgICBkaXJlY3Rpb24gPSBkaXJlY3Rpb24gPCAwID8gLTEgOiAxO1xuXG4gICAgLy8gSWYgbW92aW5nIGxlZnQgYW5kIGF0IGVuZCBvZiByb3csIG1vdmUgdXAgYSByb3cgaWYgcG9zc2libGUuXG4gICAgaWYgKHRoaXMucHJpbWFyeV9jaGFyID09PSAwICYmIGRpcmVjdGlvbiA9PSAtMSkge1xuICAgICAgICBpZiAodGhpcy5wcmltYXJ5X3JvdyAhPT0gMCkge1xuICAgICAgICAgICAgdGhpcy5wcmltYXJ5X3Jvdy0tO1xuICAgICAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgPSB0aGlzLl9tb2RlbC5fcm93c1t0aGlzLnByaW1hcnlfcm93XS5sZW5ndGg7XG4gICAgICAgICAgICB0aGlzLl9tZW1vcnlfY2hhciA9IHRoaXMucHJpbWFyeV9jaGFyO1xuICAgICAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnKTsgXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIElmIG1vdmluZyByaWdodCBhbmQgYXQgZW5kIG9mIHJvdywgbW92ZSBkb3duIGEgcm93IGlmIHBvc3NpYmxlLlxuICAgIGlmICh0aGlzLnByaW1hcnlfY2hhciA+PSB0aGlzLl9tb2RlbC5fcm93c1t0aGlzLnByaW1hcnlfcm93XS5sZW5ndGggJiYgZGlyZWN0aW9uID09IDEpIHtcbiAgICAgICAgaWYgKHRoaXMucHJpbWFyeV9yb3cgPCB0aGlzLl9tb2RlbC5fcm93cy5sZW5ndGgtMSkge1xuICAgICAgICAgICAgdGhpcy5wcmltYXJ5X3JvdysrO1xuICAgICAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgPSAwO1xuICAgICAgICAgICAgdGhpcy5fbWVtb3J5X2NoYXIgPSB0aGlzLnByaW1hcnlfY2hhcjtcbiAgICAgICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgaSA9IHRoaXMucHJpbWFyeV9jaGFyO1xuICAgIHZhciBoaXRfdGV4dCA9IGZhbHNlO1xuICAgIHZhciByb3dfdGV4dCA9IHRoaXMuX21vZGVsLl9yb3dzW3RoaXMucHJpbWFyeV9yb3ddO1xuICAgIGlmIChkaXJlY3Rpb24gPT0gLTEpIHtcbiAgICAgICAgd2hpbGUgKDAgPCBpICYmICEoaGl0X3RleHQgJiYgdXRpbHMubm90X3RleHQocm93X3RleHRbaS0xXSkpKSB7XG4gICAgICAgICAgICBoaXRfdGV4dCA9IGhpdF90ZXh0IHx8ICF1dGlscy5ub3RfdGV4dChyb3dfdGV4dFtpLTFdKTtcbiAgICAgICAgICAgIGkgKz0gZGlyZWN0aW9uO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgd2hpbGUgKGkgPCByb3dfdGV4dC5sZW5ndGggJiYgIShoaXRfdGV4dCAmJiB1dGlscy5ub3RfdGV4dChyb3dfdGV4dFtpXSkpKSB7XG4gICAgICAgICAgICBoaXRfdGV4dCA9IGhpdF90ZXh0IHx8ICF1dGlscy5ub3RfdGV4dChyb3dfdGV4dFtpXSk7XG4gICAgICAgICAgICBpICs9IGRpcmVjdGlvbjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMucHJpbWFyeV9jaGFyID0gaTtcbiAgICB0aGlzLl9tZW1vcnlfY2hhciA9IHRoaXMucHJpbWFyeV9jaGFyO1xuICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxufTtcblxuLyoqXG4gKiBTZWxlY3QgYWxsIG9mIHRoZSB0ZXh0LlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5zZWxlY3RfYWxsID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5wcmltYXJ5X3JvdyA9IHRoaXMuX21vZGVsLl9yb3dzLmxlbmd0aC0xO1xuICAgIHRoaXMucHJpbWFyeV9jaGFyID0gdGhpcy5fbW9kZWwuX3Jvd3NbdGhpcy5wcmltYXJ5X3Jvd10ubGVuZ3RoO1xuICAgIHRoaXMuc2Vjb25kYXJ5X3JvdyA9IDA7XG4gICAgdGhpcy5zZWNvbmRhcnlfY2hhciA9IDA7XG4gICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnKTsgXG59O1xuXG4vKipcbiAqIE1vdmUgdGhlIHByaW1hcnkgY3Vyc29yIHRvIHRoZSBsaW5lIGVuZC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUucHJpbWFyeV9nb3RvX2VuZCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucHJpbWFyeV9jaGFyID0gdGhpcy5fbW9kZWwuX3Jvd3NbdGhpcy5wcmltYXJ5X3Jvd10ubGVuZ3RoO1xuICAgIHRoaXMuX21lbW9yeV9jaGFyID0gdGhpcy5wcmltYXJ5X2NoYXI7XG4gICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnKTsgXG59O1xuXG4vKipcbiAqIE1vdmUgdGhlIHByaW1hcnkgY3Vyc29yIHRvIHRoZSBsaW5lIHN0YXJ0LlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5wcmltYXJ5X2dvdG9fc3RhcnQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnByaW1hcnlfY2hhciA9IDA7XG4gICAgdGhpcy5fbWVtb3J5X2NoYXIgPSB0aGlzLnByaW1hcnlfY2hhcjtcbiAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZScpOyBcbn07XG5cbi8qKlxuICogU2VsZWN0cyBhIHdvcmQgYXQgdGhlIGdpdmVuIGxvY2F0aW9uLlxuICogQHBhcmFtIHtpbnRlZ2VyfSByb3dfaW5kZXhcbiAqIEBwYXJhbSB7aW50ZWdlcn0gY2hhcl9pbmRleFxuICovXG5DdXJzb3IucHJvdG90eXBlLnNlbGVjdF93b3JkID0gZnVuY3Rpb24ocm93X2luZGV4LCBjaGFyX2luZGV4KSB7XG4gICAgdGhpcy5zZXRfYm90aChyb3dfaW5kZXgsIGNoYXJfaW5kZXgpO1xuICAgIHRoaXMud29yZF9wcmltYXJ5KC0xKTtcbiAgICB0aGlzLl9yZXNldF9zZWNvbmRhcnkoKTtcbiAgICB0aGlzLndvcmRfcHJpbWFyeSgxKTtcbn07XG5cbi8qKlxuICogU2V0IHRoZSBwcmltYXJ5IGN1cnNvciBwb3NpdGlvblxuICogQHBhcmFtIHtpbnRlZ2VyfSByb3dfaW5kZXhcbiAqIEBwYXJhbSB7aW50ZWdlcn0gY2hhcl9pbmRleFxuICovXG5DdXJzb3IucHJvdG90eXBlLnNldF9wcmltYXJ5ID0gZnVuY3Rpb24ocm93X2luZGV4LCBjaGFyX2luZGV4KSB7XG4gICAgdGhpcy5wcmltYXJ5X3JvdyA9IHJvd19pbmRleDtcbiAgICB0aGlzLnByaW1hcnlfY2hhciA9IGNoYXJfaW5kZXg7XG5cbiAgICAvLyBSZW1lbWJlciB0aGUgY2hhcmFjdGVyIHBvc2l0aW9uLCB2ZXJ0aWNhbCBuYXZpZ2F0aW9uIGFjcm9zcyBlbXB0eSBsaW5lc1xuICAgIC8vIHNob3VsZG4ndCBjYXVzZSB0aGUgaG9yaXpvbnRhbCBwb3NpdGlvbiB0byBiZSBsb3N0LlxuICAgIHRoaXMuX21lbW9yeV9jaGFyID0gdGhpcy5wcmltYXJ5X2NoYXI7XG5cbiAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZScpOyBcbn07XG5cbi8qKlxuICogU2V0IHRoZSBzZWNvbmRhcnkgY3Vyc29yIHBvc2l0aW9uXG4gKiBAcGFyYW0ge2ludGVnZXJ9IHJvd19pbmRleFxuICogQHBhcmFtIHtpbnRlZ2VyfSBjaGFyX2luZGV4XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuc2V0X3NlY29uZGFyeSA9IGZ1bmN0aW9uKHJvd19pbmRleCwgY2hhcl9pbmRleCkge1xuICAgIHRoaXMuc2Vjb25kYXJ5X3JvdyA9IHJvd19pbmRleDtcbiAgICB0aGlzLnNlY29uZGFyeV9jaGFyID0gY2hhcl9pbmRleDtcbiAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZScpOyBcbn07XG5cbi8qKlxuICogU2V0cyBib3RoIHRoZSBwcmltYXJ5IGFuZCBzZWNvbmRhcnkgY3Vyc29yIHBvc2l0aW9uc1xuICogQHBhcmFtIHtpbnRlZ2VyfSByb3dfaW5kZXhcbiAqIEBwYXJhbSB7aW50ZWdlcn0gY2hhcl9pbmRleFxuICovXG5DdXJzb3IucHJvdG90eXBlLnNldF9ib3RoID0gZnVuY3Rpb24ocm93X2luZGV4LCBjaGFyX2luZGV4KSB7XG4gICAgdGhpcy5wcmltYXJ5X3JvdyA9IHJvd19pbmRleDtcbiAgICB0aGlzLnByaW1hcnlfY2hhciA9IGNoYXJfaW5kZXg7XG4gICAgdGhpcy5zZWNvbmRhcnlfcm93ID0gcm93X2luZGV4O1xuICAgIHRoaXMuc2Vjb25kYXJ5X2NoYXIgPSBjaGFyX2luZGV4O1xuXG4gICAgLy8gUmVtZW1iZXIgdGhlIGNoYXJhY3RlciBwb3NpdGlvbiwgdmVydGljYWwgbmF2aWdhdGlvbiBhY3Jvc3MgZW1wdHkgbGluZXNcbiAgICAvLyBzaG91bGRuJ3QgY2F1c2UgdGhlIGhvcml6b250YWwgcG9zaXRpb24gdG8gYmUgbG9zdC5cbiAgICB0aGlzLl9tZW1vcnlfY2hhciA9IHRoaXMucHJpbWFyeV9jaGFyO1xuXG4gICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnKTsgXG59O1xuXG4vKipcbiAqIEhhbmRsZXMgd2hlbiBhIGtleSBpcyBwcmVzc2VkLlxuICogQHBhcmFtICB7RXZlbnR9IGUgLSBvcmlnaW5hbCBrZXkgcHJlc3MgZXZlbnQuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3IucHJvdG90eXBlLmtleXByZXNzID0gZnVuY3Rpb24oZSkge1xuICAgIHZhciBjaGFyX2NvZGUgPSBlLndoaWNoIHx8IGUua2V5Q29kZTtcbiAgICB2YXIgY2hhcl90eXBlZCA9IFN0cmluZy5mcm9tQ2hhckNvZGUoY2hhcl9jb2RlKTtcbiAgICB0aGlzLnJlbW92ZV9zZWxlY3RlZCgpO1xuICAgIHRoaXMuX21vZGVsLmFkZF90ZXh0KHRoaXMucHJpbWFyeV9yb3csIHRoaXMucHJpbWFyeV9jaGFyLCBjaGFyX3R5cGVkKTtcbiAgICB0aGlzLm1vdmVfcHJpbWFyeSgxLCAwKTtcbiAgICB0aGlzLl9yZXNldF9zZWNvbmRhcnkoKTtcbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogSW5kZW50XG4gKiBAcGFyYW0gIHtFdmVudH0gZSAtIG9yaWdpbmFsIGtleSBwcmVzcyBldmVudC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuaW5kZW50ID0gZnVuY3Rpb24oZSkge1xuICAgIGlmICh0aGlzLnByaW1hcnlfcm93ID09IHRoaXMuc2Vjb25kYXJ5X3JvdyAmJiB0aGlzLnByaW1hcnlfY2hhciA9PSB0aGlzLnNlY29uZGFyeV9jaGFyKSB7XG4gICAgICAgIHRoaXMuX21vZGVsLmFkZF90ZXh0KHRoaXMucHJpbWFyeV9yb3csIHRoaXMucHJpbWFyeV9jaGFyLCAnXFx0Jyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZm9yICh2YXIgcm93ID0gdGhpcy5zdGFydF9yb3c7IHJvdyA8PSB0aGlzLmVuZF9yb3c7IHJvdysrKSB7XG4gICAgICAgICAgICB0aGlzLl9tb2RlbC5hZGRfdGV4dChyb3csIDAsICdcXHQnKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMucHJpbWFyeV9jaGFyICs9IDE7XG4gICAgdGhpcy5zZWNvbmRhcnlfY2hhciArPSAxO1xuICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIFVuaW5kZW50XG4gKiBAcGFyYW0gIHtFdmVudH0gZSAtIG9yaWdpbmFsIGtleSBwcmVzcyBldmVudC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUudW5pbmRlbnQgPSBmdW5jdGlvbihlKSB7XG4gICAgdmFyIHJlbW92ZWRfc3RhcnQgPSBmYWxzZTtcbiAgICB2YXIgcmVtb3ZlZF9lbmQgPSBmYWxzZTtcblxuICAgIC8vIElmIG5vIHRleHQgaXMgc2VsZWN0ZWQsIHJlbW92ZSB0aGUgaW5kZW50IHByZWNlZGluZyB0aGVcbiAgICAvLyBjdXJzb3IgaWYgaXQgZXhpc3RzLlxuICAgIGlmICh0aGlzLnByaW1hcnlfcm93ID09IHRoaXMuc2Vjb25kYXJ5X3JvdyAmJiB0aGlzLnByaW1hcnlfY2hhciA9PSB0aGlzLnNlY29uZGFyeV9jaGFyKSB7XG4gICAgICAgIGlmICh0aGlzLnByaW1hcnlfY2hhciA+IDApIHtcbiAgICAgICAgICAgIHZhciBiZWZvcmUgPSB0aGlzLl9tb2RlbC5nZXRfdGV4dCh0aGlzLnByaW1hcnlfcm93LCB0aGlzLnByaW1hcnlfY2hhci0xLCB0aGlzLnByaW1hcnlfcm93LCB0aGlzLnByaW1hcnlfY2hhcik7XG4gICAgICAgICAgICBpZiAoYmVmb3JlID09ICdcXHQnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fbW9kZWwucmVtb3ZlX3RleHQodGhpcy5wcmltYXJ5X3JvdywgdGhpcy5wcmltYXJ5X2NoYXItMSwgdGhpcy5wcmltYXJ5X3JvdywgdGhpcy5wcmltYXJ5X2NoYXIpO1xuICAgICAgICAgICAgICAgIHJlbW92ZWRfc3RhcnQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHJlbW92ZWRfZW5kID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgLy8gVGV4dCBpcyBzZWxlY3RlZC4gIFJlbW92ZSB0aGUgYW4gaW5kZW50IGZyb20gdGhlIGJlZ2luaW5nXG4gICAgLy8gb2YgZWFjaCByb3cgaWYgaXQgZXhpc3RzLlxuICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAodmFyIHJvdyA9IHRoaXMuc3RhcnRfcm93OyByb3cgPD0gdGhpcy5lbmRfcm93OyByb3crKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuX21vZGVsLl9yb3dzW3Jvd10ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9tb2RlbC5fcm93c1tyb3ddLnN1YnN0cmluZygwLCAxKSA9PSAnXFx0Jykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9tb2RlbC5yZW1vdmVfdGV4dChyb3csIDAsIHJvdywgMSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyb3cgPT0gdGhpcy5zdGFydF9yb3cpIHJlbW92ZWRfc3RhcnQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBpZiAocm93ID09IHRoaXMuZW5kX3JvdykgcmVtb3ZlZF9lbmQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLy8gTW92ZSB0aGUgc2VsZWN0ZWQgY2hhcmFjdGVycyBiYWNrd2FyZHMgaWYgaW5kZW50cyB3ZXJlIHJlbW92ZWQuXG4gICAgdmFyIHN0YXJ0X2lzX3ByaW1hcnkgPSAodGhpcy5wcmltYXJ5X3JvdyA9PSB0aGlzLnN0YXJ0X3JvdyAmJiB0aGlzLnByaW1hcnlfY2hhciA9PSB0aGlzLnN0YXJ0X2NoYXIpO1xuICAgIGlmIChzdGFydF9pc19wcmltYXJ5KSB7XG4gICAgICAgIGlmIChyZW1vdmVkX3N0YXJ0KSB0aGlzLnByaW1hcnlfY2hhciAtPSAxO1xuICAgICAgICBpZiAocmVtb3ZlZF9lbmQpIHRoaXMuc2Vjb25kYXJ5X2NoYXIgLT0gMTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBpZiAocmVtb3ZlZF9lbmQpIHRoaXMucHJpbWFyeV9jaGFyIC09IDE7XG4gICAgICAgIGlmIChyZW1vdmVkX3N0YXJ0KSB0aGlzLnNlY29uZGFyeV9jaGFyIC09IDE7XG4gICAgfVxuICAgIGlmIChyZW1vdmVkX2VuZCB8fCByZW1vdmVkX3N0YXJ0KSB0aGlzLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBJbnNlcnQgYSBuZXdsaW5lXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3IucHJvdG90eXBlLm5ld2xpbmUgPSBmdW5jdGlvbihlKSB7XG4gICAgdGhpcy5yZW1vdmVfc2VsZWN0ZWQoKTtcbiAgICB0aGlzLl9tb2RlbC5hZGRfdGV4dCh0aGlzLnByaW1hcnlfcm93LCB0aGlzLnByaW1hcnlfY2hhciwgJ1xcbicpO1xuICAgIHRoaXMubW92ZV9wcmltYXJ5KDAsIDEpO1xuICAgIHRoaXMuX3Jlc2V0X3NlY29uZGFyeSgpO1xuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBJbnNlcnQgdGV4dFxuICogQHBhcmFtICB7c3RyaW5nfSB0ZXh0XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3IucHJvdG90eXBlLmluc2VydF90ZXh0ID0gZnVuY3Rpb24odGV4dCkge1xuICAgIHRoaXMucmVtb3ZlX3NlbGVjdGVkKCk7XG4gICAgdGhpcy5fbW9kZWwuYWRkX3RleHQodGhpcy5wcmltYXJ5X3JvdywgdGhpcy5wcmltYXJ5X2NoYXIsIHRleHQpO1xuICAgIFxuICAgIC8vIE1vdmUgY3Vyc29yIHRvIHRoZSBlbmQuXG4gICAgaWYgKHRleHQuaW5kZXhPZignXFxuJyk9PS0xKSB7XG4gICAgICAgIHRoaXMucHJpbWFyeV9jaGFyID0gdGhpcy5zdGFydF9jaGFyICsgdGV4dC5sZW5ndGg7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGxpbmVzID0gdGV4dC5zcGxpdCgnXFxuJyk7XG4gICAgICAgIHRoaXMucHJpbWFyeV9yb3cgKz0gbGluZXMubGVuZ3RoIC0gMTtcbiAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgPSBsaW5lc1tsaW5lcy5sZW5ndGgtMV0ubGVuZ3RoO1xuICAgIH1cbiAgICB0aGlzLl9yZXNldF9zZWNvbmRhcnkoKTtcblxuICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgdGhlIHNlbGVjdGVkIHRleHRcbiAqIEByZXR1cm4ge2Jvb2xlYW59IHRydWUgaWYgdGV4dCB3YXMgcmVtb3ZlZC5cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5yZW1vdmVfc2VsZWN0ZWQgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5wcmltYXJ5X3JvdyAhPT0gdGhpcy5zZWNvbmRhcnlfcm93IHx8IHRoaXMucHJpbWFyeV9jaGFyICE9PSB0aGlzLnNlY29uZGFyeV9jaGFyKSB7XG4gICAgICAgIHZhciByb3dfaW5kZXggPSB0aGlzLnN0YXJ0X3JvdztcbiAgICAgICAgdmFyIGNoYXJfaW5kZXggPSB0aGlzLnN0YXJ0X2NoYXI7XG4gICAgICAgIHRoaXMuX21vZGVsLnJlbW92ZV90ZXh0KHRoaXMuc3RhcnRfcm93LCB0aGlzLnN0YXJ0X2NoYXIsIHRoaXMuZW5kX3JvdywgdGhpcy5lbmRfY2hhcik7XG4gICAgICAgIHRoaXMucHJpbWFyeV9yb3cgPSByb3dfaW5kZXg7XG4gICAgICAgIHRoaXMucHJpbWFyeV9jaGFyID0gY2hhcl9pbmRleDtcbiAgICAgICAgdGhpcy5fcmVzZXRfc2Vjb25kYXJ5KCk7XG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBDb3BpZXMgdGhlIHNlbGVjdGVkIHRleHQuXG4gKiBAcmV0dXJuIHtzdHJpbmd9IHNlbGVjdGVkIHRleHRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMucHJpbWFyeV9yb3cgPT0gdGhpcy5zZWNvbmRhcnlfcm93ICYmIHRoaXMucHJpbWFyeV9jaGFyID09IHRoaXMuc2Vjb25kYXJ5X2NoYXIpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX21vZGVsLl9yb3dzW3RoaXMucHJpbWFyeV9yb3ddO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9tb2RlbC5nZXRfdGV4dCh0aGlzLnN0YXJ0X3JvdywgdGhpcy5zdGFydF9jaGFyLCB0aGlzLmVuZF9yb3csIHRoaXMuZW5kX2NoYXIpO1xuICAgIH1cbn07XG5cbi8qKlxuICogQ3V0cyB0aGUgc2VsZWN0ZWQgdGV4dC5cbiAqIEByZXR1cm4ge3N0cmluZ30gc2VsZWN0ZWQgdGV4dFxuICovXG5DdXJzb3IucHJvdG90eXBlLmN1dCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0ZXh0ID0gdGhpcy5jb3B5KCk7XG4gICAgaWYgKHRoaXMucHJpbWFyeV9yb3cgPT0gdGhpcy5zZWNvbmRhcnlfcm93ICYmIHRoaXMucHJpbWFyeV9jaGFyID09IHRoaXMuc2Vjb25kYXJ5X2NoYXIpIHtcbiAgICAgICAgdGhpcy5fbW9kZWwucmVtb3ZlX3Jvdyh0aGlzLnByaW1hcnlfcm93KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnJlbW92ZV9zZWxlY3RlZCgpO1xuICAgIH1cbiAgICByZXR1cm4gdGV4dDtcbn07XG5cbi8qKlxuICogRGVsZXRlIGZvcndhcmQsIHR5cGljYWxseSBjYWxsZWQgYnkgYGRlbGV0ZWAga2V5cHJlc3MuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3IucHJvdG90eXBlLmRlbGV0ZV9mb3J3YXJkID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKCF0aGlzLnJlbW92ZV9zZWxlY3RlZCgpKSB7XG4gICAgICAgIHRoaXMubW92ZV9wcmltYXJ5KDEsIDApO1xuICAgICAgICB0aGlzLnJlbW92ZV9zZWxlY3RlZCgpO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogRGVsZXRlIGJhY2t3YXJkLCB0eXBpY2FsbHkgY2FsbGVkIGJ5IGBiYWNrc3BhY2VgIGtleXByZXNzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5kZWxldGVfYmFja3dhcmQgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoIXRoaXMucmVtb3ZlX3NlbGVjdGVkKCkpIHtcbiAgICAgICAgdGhpcy5tb3ZlX3ByaW1hcnkoLTEsIDApO1xuICAgICAgICB0aGlzLnJlbW92ZV9zZWxlY3RlZCgpO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogUmVzZXQgdGhlIHNlY29uZGFyeSBjdXJzb3IgdG8gdGhlIHZhbHVlIG9mIHRoZSBwcmltYXJ5LlxuICogQHJldHVybiB7W3R5cGVdfSBbZGVzY3JpcHRpb25dXG4gKi9cbkN1cnNvci5wcm90b3R5cGUuX3Jlc2V0X3NlY29uZGFyeSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc2Vjb25kYXJ5X3JvdyA9IHRoaXMucHJpbWFyeV9yb3c7XG4gICAgdGhpcy5zZWNvbmRhcnlfY2hhciA9IHRoaXMucHJpbWFyeV9jaGFyO1xuXG4gICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnKTsgXG59O1xuXG4vKipcbiAqIENyZWF0ZSB0aGUgcHJvcGVydGllcyBvZiB0aGUgY3Vyc29yLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5faW5pdF9wcm9wZXJ0aWVzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMucHJvcGVydHkoJ3N0YXJ0X3JvdycsIGZ1bmN0aW9uKCkgeyByZXR1cm4gTWF0aC5taW4odGhhdC5wcmltYXJ5X3JvdywgdGhhdC5zZWNvbmRhcnlfcm93KTsgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgnZW5kX3JvdycsIGZ1bmN0aW9uKCkgeyByZXR1cm4gTWF0aC5tYXgodGhhdC5wcmltYXJ5X3JvdywgdGhhdC5zZWNvbmRhcnlfcm93KTsgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgnc3RhcnRfY2hhcicsIGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodGhhdC5wcmltYXJ5X3JvdyA8IHRoYXQuc2Vjb25kYXJ5X3JvdyB8fCAodGhhdC5wcmltYXJ5X3JvdyA9PSB0aGF0LnNlY29uZGFyeV9yb3cgJiYgdGhhdC5wcmltYXJ5X2NoYXIgPD0gdGhhdC5zZWNvbmRhcnlfY2hhcikpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGF0LnByaW1hcnlfY2hhcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGF0LnNlY29uZGFyeV9jaGFyO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgnZW5kX2NoYXInLCBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHRoYXQucHJpbWFyeV9yb3cgPCB0aGF0LnNlY29uZGFyeV9yb3cgfHwgKHRoYXQucHJpbWFyeV9yb3cgPT0gdGhhdC5zZWNvbmRhcnlfcm93ICYmIHRoYXQucHJpbWFyeV9jaGFyIDw9IHRoYXQuc2Vjb25kYXJ5X2NoYXIpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhhdC5zZWNvbmRhcnlfY2hhcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGF0LnByaW1hcnlfY2hhcjtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuLyoqXG4gKiBSZWdpc3RlcnMgYW4gYWN0aW9uIEFQSSB3aXRoIHRoZSBtYXBcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuX3JlZ2lzdGVyX2FwaSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICByZWdpc3RlcignY3Vyc29yLnJlbW92ZV9zZWxlY3RlZCcsIHV0aWxzLnByb3h5KHRoaXMucmVtb3ZlX3NlbGVjdGVkLCB0aGlzKSwgdGhpcyk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5rZXlwcmVzcycsIHV0aWxzLnByb3h5KHRoaXMua2V5cHJlc3MsIHRoaXMpLCB0aGlzKTtcbiAgICByZWdpc3RlcignY3Vyc29yLmluZGVudCcsIHV0aWxzLnByb3h5KHRoaXMuaW5kZW50LCB0aGlzKSwgdGhpcyk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci51bmluZGVudCcsIHV0aWxzLnByb3h5KHRoaXMudW5pbmRlbnQsIHRoaXMpLCB0aGlzKTtcbiAgICByZWdpc3RlcignY3Vyc29yLm5ld2xpbmUnLCB1dGlscy5wcm94eSh0aGlzLm5ld2xpbmUsIHRoaXMpLCB0aGlzKTtcbiAgICByZWdpc3RlcignY3Vyc29yLmluc2VydF90ZXh0JywgdXRpbHMucHJveHkodGhpcy5pbnNlcnRfdGV4dCwgdGhpcyksIHRoaXMpO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3IuZGVsZXRlX2JhY2t3YXJkJywgdXRpbHMucHJveHkodGhpcy5kZWxldGVfYmFja3dhcmQsIHRoaXMpLCB0aGlzKTtcbiAgICByZWdpc3RlcignY3Vyc29yLmRlbGV0ZV9mb3J3YXJkJywgdXRpbHMucHJveHkodGhpcy5kZWxldGVfZm9yd2FyZCwgdGhpcyksIHRoaXMpO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3Iuc2VsZWN0X2FsbCcsIHV0aWxzLnByb3h5KHRoaXMuc2VsZWN0X2FsbCwgdGhpcyksIHRoaXMpO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3IubGVmdCcsIGZ1bmN0aW9uKCkgeyB0aGF0Lm1vdmVfcHJpbWFyeSgtMSwgMCwgdHJ1ZSk7IHRoYXQuX3Jlc2V0X3NlY29uZGFyeSgpOyByZXR1cm4gdHJ1ZTsgfSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5yaWdodCcsIGZ1bmN0aW9uKCkgeyB0aGF0Lm1vdmVfcHJpbWFyeSgxLCAwLCB0cnVlKTsgdGhhdC5fcmVzZXRfc2Vjb25kYXJ5KCk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLnVwJywgZnVuY3Rpb24oKSB7IHRoYXQubW92ZV9wcmltYXJ5KDAsIC0xLCB0cnVlKTsgdGhhdC5fcmVzZXRfc2Vjb25kYXJ5KCk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLmRvd24nLCBmdW5jdGlvbigpIHsgdGhhdC5tb3ZlX3ByaW1hcnkoMCwgMSwgdHJ1ZSk7IHRoYXQuX3Jlc2V0X3NlY29uZGFyeSgpOyByZXR1cm4gdHJ1ZTsgfSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5zZWxlY3RfbGVmdCcsIGZ1bmN0aW9uKCkgeyB0aGF0Lm1vdmVfcHJpbWFyeSgtMSwgMCk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLnNlbGVjdF9yaWdodCcsIGZ1bmN0aW9uKCkgeyB0aGF0Lm1vdmVfcHJpbWFyeSgxLCAwKTsgcmV0dXJuIHRydWU7IH0pO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3Iuc2VsZWN0X3VwJywgZnVuY3Rpb24oKSB7IHRoYXQubW92ZV9wcmltYXJ5KDAsIC0xKTsgcmV0dXJuIHRydWU7IH0pO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3Iuc2VsZWN0X2Rvd24nLCBmdW5jdGlvbigpIHsgdGhhdC5tb3ZlX3ByaW1hcnkoMCwgMSk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLndvcmRfbGVmdCcsIGZ1bmN0aW9uKCkgeyB0aGF0LndvcmRfcHJpbWFyeSgtMSk7IHRoYXQuX3Jlc2V0X3NlY29uZGFyeSgpOyByZXR1cm4gdHJ1ZTsgfSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci53b3JkX3JpZ2h0JywgZnVuY3Rpb24oKSB7IHRoYXQud29yZF9wcmltYXJ5KDEpOyB0aGF0Ll9yZXNldF9zZWNvbmRhcnkoKTsgcmV0dXJuIHRydWU7IH0pO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3Iuc2VsZWN0X3dvcmRfbGVmdCcsIGZ1bmN0aW9uKCkgeyB0aGF0LndvcmRfcHJpbWFyeSgtMSk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLnNlbGVjdF93b3JkX3JpZ2h0JywgZnVuY3Rpb24oKSB7IHRoYXQud29yZF9wcmltYXJ5KDEpOyByZXR1cm4gdHJ1ZTsgfSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5saW5lX3N0YXJ0JywgZnVuY3Rpb24oKSB7IHRoYXQucHJpbWFyeV9nb3RvX3N0YXJ0KCk7IHRoYXQuX3Jlc2V0X3NlY29uZGFyeSgpOyByZXR1cm4gdHJ1ZTsgfSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5saW5lX2VuZCcsIGZ1bmN0aW9uKCkgeyB0aGF0LnByaW1hcnlfZ290b19lbmQoKTsgdGhhdC5fcmVzZXRfc2Vjb25kYXJ5KCk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLnNlbGVjdF9saW5lX3N0YXJ0JywgZnVuY3Rpb24oKSB7IHRoYXQucHJpbWFyeV9nb3RvX3N0YXJ0KCk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLnNlbGVjdF9saW5lX2VuZCcsIGZ1bmN0aW9uKCkgeyB0aGF0LnByaW1hcnlfZ290b19lbmQoKTsgcmV0dXJuIHRydWU7IH0pO1xufTtcblxuZXhwb3J0cy5DdXJzb3IgPSBDdXJzb3I7IiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cbnZhciBrZXltYXAgPSByZXF1aXJlKCcuL2V2ZW50cy9tYXAuanMnKTtcbnZhciByZWdpc3RlciA9IGtleW1hcC5NYXAucmVnaXN0ZXI7XG5cbnZhciBjdXJzb3IgPSByZXF1aXJlKCcuL2N1cnNvci5qcycpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xuLyoqXG4gKiBNYW5hZ2VzIG9uZSBvciBtb3JlIGN1cnNvcnNcbiAqL1xudmFyIEN1cnNvcnMgPSBmdW5jdGlvbihtb2RlbCwgY2xpcGJvYXJkKSB7XG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzKTtcbiAgICB0aGlzLl9tb2RlbCA9IG1vZGVsO1xuICAgIHRoaXMuZ2V0X3Jvd19jaGFyID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuY3Vyc29ycyA9IFtdO1xuICAgIHRoaXMuX3NlbGVjdGluZ190ZXh0ID0gZmFsc2U7XG4gICAgdGhpcy5fY2xpcGJvYXJkID0gY2xpcGJvYXJkO1xuXG4gICAgLy8gQ3JlYXRlIGluaXRpYWwgY3Vyc29yLlxuICAgIHRoaXMuY3JlYXRlKCk7XG5cbiAgICAvLyBSZWdpc3RlciBhY3Rpb25zLlxuICAgIHJlZ2lzdGVyKCdjdXJzb3JzLnN0YXJ0X3NlbGVjdGlvbicsIHV0aWxzLnByb3h5KHRoaXMuc3RhcnRfc2VsZWN0aW9uLCB0aGlzKSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvcnMuc2V0X3NlbGVjdGlvbicsIHV0aWxzLnByb3h5KHRoaXMuc2V0X3NlbGVjdGlvbiwgdGhpcykpO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3JzLnN0YXJ0X3NldF9zZWxlY3Rpb24nLCB1dGlscy5wcm94eSh0aGlzLnN0YXJ0X3NldF9zZWxlY3Rpb24sIHRoaXMpKTtcbiAgICByZWdpc3RlcignY3Vyc29ycy5lbmRfc2VsZWN0aW9uJywgdXRpbHMucHJveHkodGhpcy5lbmRfc2VsZWN0aW9uLCB0aGlzKSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvcnMuc2VsZWN0X3dvcmQnLCB1dGlscy5wcm94eSh0aGlzLnNlbGVjdF93b3JkLCB0aGlzKSk7XG5cbiAgICAvLyBCaW5kIGNsaXBib2FyZCBldmVudHMuXG4gICAgdGhpcy5fY2xpcGJvYXJkLm9uKCdjdXQnLCB1dGlscy5wcm94eSh0aGlzLl9oYW5kbGVfY3V0LCB0aGlzKSk7XG4gICAgdGhpcy5fY2xpcGJvYXJkLm9uKCdwYXN0ZScsIHV0aWxzLnByb3h5KHRoaXMuX2hhbmRsZV9wYXN0ZSwgdGhpcykpO1xufTtcbnV0aWxzLmluaGVyaXQoQ3Vyc29ycywgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vKipcbiAqIENyZWF0ZXMgYSBjdXJzb3IgYW5kIG1hbmFnZXMgaXQuXG4gKiBAcmV0dXJuIHtDdXJzb3J9IGN1cnNvclxuICovXG5DdXJzb3JzLnByb3RvdHlwZS5jcmVhdGUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgbmV3X2N1cnNvciA9IG5ldyBjdXJzb3IuQ3Vyc29yKHRoaXMuX21vZGVsLCB0aGlzLl9pbnB1dF9kaXNwYXRjaGVyKTtcbiAgICB0aGlzLmN1cnNvcnMucHVzaChuZXdfY3Vyc29yKTtcblxuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICBuZXdfY3Vyc29yLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhhdC50cmlnZ2VyKCdjaGFuZ2UnLCBuZXdfY3Vyc29yKTtcbiAgICAgICAgdGhhdC5fdXBkYXRlX3NlbGVjdGlvbigpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG5ld19jdXJzb3I7XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgd2hlbiB0aGUgc2VsZWN0ZWQgdGV4dCBpcyBjdXQgdG8gdGhlIGNsaXBib2FyZC5cbiAqIEBwYXJhbSAge3N0cmluZ30gdGV4dCAtIGJ5IHZhbCB0ZXh0IHRoYXQgd2FzIGN1dFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29ycy5wcm90b3R5cGUuX2hhbmRsZV9jdXQgPSBmdW5jdGlvbih0ZXh0KSB7XG4gICAgdGhpcy5jdXJzb3JzLmZvckVhY2goZnVuY3Rpb24oY3Vyc29yKSB7XG4gICAgICAgIGN1cnNvci5jdXQoKTtcbiAgICB9KTtcbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIHRleHQgaXMgcGFzdGVkIGludG8gdGhlIGRvY3VtZW50LlxuICogQHBhcmFtICB7c3RyaW5nfSB0ZXh0XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3JzLnByb3RvdHlwZS5faGFuZGxlX3Bhc3RlID0gZnVuY3Rpb24odGV4dCkge1xuXG4gICAgLy8gSWYgdGhlIG1vZHVsdXMgb2YgdGhlIG51bWJlciBvZiBjdXJzb3JzIGFuZCB0aGUgbnVtYmVyIG9mIHBhc3RlZCBsaW5lc1xuICAgIC8vIG9mIHRleHQgaXMgemVybywgc3BsaXQgdGhlIGN1dCBsaW5lcyBhbW9uZyB0aGUgY3Vyc29ycy5cbiAgICB2YXIgbGluZXMgPSB0ZXh0LnNwbGl0KCdcXG4nKTtcbiAgICBpZiAodGhpcy5jdXJzb3JzLmxlbmd0aCA+IDEgJiYgbGluZXMubGVuZ3RoID4gMSAmJiBsaW5lcy5sZW5ndGggJSB0aGlzLmN1cnNvcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHZhciBsaW5lc19wZXJfY3Vyc29yID0gbGluZXMubGVuZ3RoIC8gdGhpcy5jdXJzb3JzLmxlbmd0aDtcbiAgICAgICAgdGhpcy5jdXJzb3JzLmZvckVhY2goZnVuY3Rpb24oY3Vyc29yLCBpbmRleCkge1xuICAgICAgICAgICAgY3Vyc29yLmluc2VydF90ZXh0KGxpbmVzLnNsaWNlKFxuICAgICAgICAgICAgICAgIGluZGV4ICogbGluZXNfcGVyX2N1cnNvciwgXG4gICAgICAgICAgICAgICAgaW5kZXggKiBsaW5lc19wZXJfY3Vyc29yICsgbGluZXNfcGVyX2N1cnNvcikuam9pbignXFxuJykpO1xuICAgICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmN1cnNvcnMuZm9yRWFjaChmdW5jdGlvbihjdXJzb3IpIHtcbiAgICAgICAgICAgIGN1cnNvci5pbnNlcnRfdGV4dCh0ZXh0KTtcbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBVcGRhdGUgdGhlIGNsaXBwYWJsZSB0ZXh0IGJhc2VkIG9uIG5ldyBzZWxlY3Rpb24uXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3JzLnByb3RvdHlwZS5fdXBkYXRlX3NlbGVjdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgIFxuICAgIC8vIENvcHkgYWxsIG9mIHRoZSBzZWxlY3RlZCB0ZXh0LlxuICAgIHZhciBzZWxlY3Rpb25zID0gW107XG4gICAgdGhpcy5jdXJzb3JzLmZvckVhY2goZnVuY3Rpb24oY3Vyc29yKSB7XG4gICAgICAgIHNlbGVjdGlvbnMucHVzaChjdXJzb3IuY29weSgpKTtcbiAgICB9KTtcblxuICAgIC8vIE1ha2UgdGhlIGNvcGllZCB0ZXh0IGNsaXBwYWJsZS5cbiAgICB0aGlzLl9jbGlwYm9hcmQuc2V0X2NsaXBwYWJsZShzZWxlY3Rpb25zLmpvaW4oJ1xcbicpKTtcbn07XG5cbi8qKlxuICogU3RhcnRzIHNlbGVjdGluZyB0ZXh0IGZyb20gbW91c2UgY29vcmRpbmF0ZXMuXG4gKiBAcGFyYW0gIHtNb3VzZUV2ZW50fSBlIC0gbW91c2UgZXZlbnQgY29udGFpbmluZyB0aGUgY29vcmRpbmF0ZXMuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3JzLnByb3RvdHlwZS5zdGFydF9zZWxlY3Rpb24gPSBmdW5jdGlvbihlKSB7XG4gICAgdmFyIHggPSBlLm9mZnNldFg7XG4gICAgdmFyIHkgPSBlLm9mZnNldFk7XG5cbiAgICB0aGlzLl9zZWxlY3RpbmdfdGV4dCA9IHRydWU7XG4gICAgaWYgKHRoaXMuZ2V0X3Jvd19jaGFyKSB7XG4gICAgICAgIHZhciBsb2NhdGlvbiA9IHRoaXMuZ2V0X3Jvd19jaGFyKHgsIHkpO1xuICAgICAgICB0aGlzLmN1cnNvcnNbMF0uc2V0X2JvdGgobG9jYXRpb24ucm93X2luZGV4LCBsb2NhdGlvbi5jaGFyX2luZGV4KTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEZpbmFsaXplcyB0aGUgc2VsZWN0aW9uIG9mIHRleHQuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3JzLnByb3RvdHlwZS5lbmRfc2VsZWN0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fc2VsZWN0aW5nX3RleHQgPSBmYWxzZTtcbn07XG5cbi8qKlxuICogU2V0cyB0aGUgZW5kcG9pbnQgb2YgdGV4dCBzZWxlY3Rpb24gZnJvbSBtb3VzZSBjb29yZGluYXRlcy5cbiAqIEBwYXJhbSAge01vdXNlRXZlbnR9IGUgLSBtb3VzZSBldmVudCBjb250YWluaW5nIHRoZSBjb29yZGluYXRlcy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvcnMucHJvdG90eXBlLnNldF9zZWxlY3Rpb24gPSBmdW5jdGlvbihlKSB7XG4gICAgdmFyIHggPSBlLm9mZnNldFg7XG4gICAgdmFyIHkgPSBlLm9mZnNldFk7XG4gICAgaWYgKHRoaXMuX3NlbGVjdGluZ190ZXh0ICYmIHRoaXMuZ2V0X3Jvd19jaGFyKSB7XG4gICAgICAgIHZhciBsb2NhdGlvbiA9IHRoaXMuZ2V0X3Jvd19jaGFyKHgsIHkpO1xuICAgICAgICB0aGlzLmN1cnNvcnNbdGhpcy5jdXJzb3JzLmxlbmd0aC0xXS5zZXRfcHJpbWFyeShsb2NhdGlvbi5yb3dfaW5kZXgsIGxvY2F0aW9uLmNoYXJfaW5kZXgpO1xuICAgIH1cbn07XG5cbi8qKlxuICogU2V0cyB0aGUgZW5kcG9pbnQgb2YgdGV4dCBzZWxlY3Rpb24gZnJvbSBtb3VzZSBjb29yZGluYXRlcy5cbiAqIERpZmZlcmVudCB0aGFuIHNldF9zZWxlY3Rpb24gYmVjYXVzZSBpdCBkb2Vzbid0IG5lZWQgYSBjYWxsXG4gKiB0byBzdGFydF9zZWxlY3Rpb24gdG8gd29yay5cbiAqIEBwYXJhbSAge01vdXNlRXZlbnR9IGUgLSBtb3VzZSBldmVudCBjb250YWluaW5nIHRoZSBjb29yZGluYXRlcy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvcnMucHJvdG90eXBlLnN0YXJ0X3NldF9zZWxlY3Rpb24gPSBmdW5jdGlvbihlKSB7XG4gICAgdGhpcy5fc2VsZWN0aW5nX3RleHQgPSB0cnVlO1xuICAgIHRoaXMuc2V0X3NlbGVjdGlvbihlKTtcbn07XG5cbi8qKlxuICogU2VsZWN0cyBhIHdvcmQgYXQgdGhlIGdpdmVuIG1vdXNlIGNvb3JkaW5hdGVzLlxuICogQHBhcmFtICB7TW91c2VFdmVudH0gZSAtIG1vdXNlIGV2ZW50IGNvbnRhaW5pbmcgdGhlIGNvb3JkaW5hdGVzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29ycy5wcm90b3R5cGUuc2VsZWN0X3dvcmQgPSBmdW5jdGlvbihlKSB7XG4gICAgdmFyIHggPSBlLm9mZnNldFg7XG4gICAgdmFyIHkgPSBlLm9mZnNldFk7XG4gICAgaWYgKHRoaXMuZ2V0X3Jvd19jaGFyKSB7XG4gICAgICAgIHZhciBsb2NhdGlvbiA9IHRoaXMuZ2V0X3Jvd19jaGFyKHgsIHkpO1xuICAgICAgICB0aGlzLmN1cnNvcnNbdGhpcy5jdXJzb3JzLmxlbmd0aC0xXS5zZWxlY3Rfd29yZChsb2NhdGlvbi5yb3dfaW5kZXgsIGxvY2F0aW9uLmNoYXJfaW5kZXgpO1xuICAgIH1cbn07XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuQ3Vyc29ycyA9IEN1cnNvcnM7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG52YXIgbm9ybWFsaXplciA9IHJlcXVpcmUoJy4vZXZlbnRzL25vcm1hbGl6ZXIuanMnKTtcbnZhciBrZXltYXAgPSByZXF1aXJlKCcuL2V2ZW50cy9tYXAuanMnKTtcbnZhciBkZWZhdWx0X2tleW1hcCA9IHJlcXVpcmUoJy4vZXZlbnRzL2RlZmF1bHQuanMnKTtcbnZhciBjdXJzb3JzID0gcmVxdWlyZSgnLi9jdXJzb3JzLmpzJyk7XG52YXIgY2xpcGJvYXJkID0gcmVxdWlyZSgnLi9jbGlwYm9hcmQuanMnKTtcblxuLyoqXG4gKiBDb250cm9sbGVyIGZvciBhIERvY3VtZW50TW9kZWwuXG4gKi9cbnZhciBEb2N1bWVudENvbnRyb2xsZXIgPSBmdW5jdGlvbihlbCwgbW9kZWwpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuY2xpcGJvYXJkID0gbmV3IGNsaXBib2FyZC5DbGlwYm9hcmQoZWwpO1xuICAgIHRoaXMubm9ybWFsaXplciA9IG5ldyBub3JtYWxpemVyLk5vcm1hbGl6ZXIoKTtcbiAgICB0aGlzLm5vcm1hbGl6ZXIubGlzdGVuX3RvKGVsKTtcbiAgICB0aGlzLm5vcm1hbGl6ZXIubGlzdGVuX3RvKHRoaXMuY2xpcGJvYXJkLmhpZGRlbl9pbnB1dCk7XG4gICAgdGhpcy5tYXAgPSBuZXcga2V5bWFwLk1hcCh0aGlzLm5vcm1hbGl6ZXIpO1xuICAgIHRoaXMubWFwLm1hcChkZWZhdWx0X2tleW1hcC5tYXApO1xuXG4gICAgdGhpcy5jdXJzb3JzID0gbmV3IGN1cnNvcnMuQ3Vyc29ycyhtb2RlbCwgdGhpcy5jbGlwYm9hcmQpO1xufTtcbnV0aWxzLmluaGVyaXQoRG9jdW1lbnRDb250cm9sbGVyLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuRG9jdW1lbnRDb250cm9sbGVyID0gRG9jdW1lbnRDb250cm9sbGVyO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xuXG4vKipcbiAqIE1vZGVsIGNvbnRhaW5pbmcgYWxsIG9mIHRoZSBkb2N1bWVudCdzIGRhdGEgKHRleHQpLlxuICovXG52YXIgRG9jdW1lbnRNb2RlbCA9IGZ1bmN0aW9uKCkge1xuICAgIHV0aWxzLlBvc3RlckNsYXNzLmNhbGwodGhpcyk7XG4gICAgdGhpcy5fcm93cyA9IFtdO1xuICAgIHRoaXMuX3Jvd190YWdzID0gW107XG4gICAgdGhpcy5fdGFnX2xvY2sgPSAwO1xuICAgIHRoaXMuX3BlbmRpbmdfdGFnX2V2ZW50cyA9IGZhbHNlO1xuICAgIHRoaXMuX2luaXRfcHJvcGVydGllcygpO1xufTtcbnV0aWxzLmluaGVyaXQoRG9jdW1lbnRNb2RlbCwgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vKipcbiAqIEFjcXVpcmUgYSBsb2NrIG9uIHRhZyBldmVudHNcbiAqXG4gKiBQcmV2ZW50cyB0YWcgZXZlbnRzIGZyb20gZmlyaW5nLlxuICogQHJldHVybiB7aW50ZWdlcn0gbG9jayBjb3VudFxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5hY3F1aXJlX3RhZ19ldmVudF9sb2NrID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3RhZ19sb2NrKys7XG59O1xuXG4vKipcbiAqIFJlbGVhc2UgYSBsb2NrIG9uIHRhZyBldmVudHNcbiAqIEByZXR1cm4ge2ludGVnZXJ9IGxvY2sgY291bnRcbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUucmVsZWFzZV90YWdfZXZlbnRfbG9jayA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3RhZ19sb2NrLS07XG4gICAgaWYgKHRoaXMuX3RhZ19sb2NrIDwgMCkge1xuICAgICAgICB0aGlzLl90YWdfbG9jayA9IDA7XG4gICAgfVxuICAgIGlmICh0aGlzLl90YWdfbG9jayA9PT0gMCAmJiB0aGlzLl9wZW5kaW5nX3RhZ19ldmVudHMpIHtcbiAgICAgICAgdGhpcy5fcGVuZGluZ190YWdfZXZlbnRzID0gZmFsc2U7XG4gICAgICAgIHRoaXMudHJpZ2dlcl90YWdfZXZlbnRzKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl90YWdfbG9jaztcbn07XG5cbi8qKlxuICogVHJpZ2dlcnMgdGhlIHRhZyBjaGFuZ2UgZXZlbnRzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUudHJpZ2dlcl90YWdfZXZlbnRzID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX3RhZ19sb2NrID09PSAwKSB7XG4gICAgICAgIHRoaXMudHJpZ2dlcigndGFnc19jaGFuZ2VkJyk7XG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpOyAgICBcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9wZW5kaW5nX3RhZ19ldmVudHMgPSB0cnVlO1xuICAgIH1cbn07XG5cbi8qKlxuICogU2V0cyBhICd0YWcnIG9uIHRoZSB0ZXh0IHNwZWNpZmllZC5cbiAqIEBwYXJhbSB7aW50ZWdlcn0gc3RhcnRfcm93IC0gcm93IHRoZSB0YWcgc3RhcnRzIG9uXG4gKiBAcGFyYW0ge2ludGVnZXJ9IHN0YXJ0X2NoYXIgLSBpbmRleCwgaW4gdGhlIHJvdywgb2YgdGhlIGZpcnN0IHRhZ2dlZCBjaGFyYWN0ZXJcbiAqIEBwYXJhbSB7aW50ZWdlcn0gZW5kX3JvdyAtIHJvdyB0aGUgdGFnIGVuZHMgb25cbiAqIEBwYXJhbSB7aW50ZWdlcn0gZW5kX2NoYXIgLSBpbmRleCwgaW4gdGhlIHJvdywgb2YgdGhlIGxhc3QgdGFnZ2VkIGNoYXJhY3RlclxuICogQHBhcmFtIHtzdHJpbmd9IHRhZ19uYW1lXG4gKiBAcGFyYW0ge2FueX0gdGFnX3ZhbHVlIC0gb3ZlcnJpZGVzIGFueSBwcmV2aW91cyB0YWdzXG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLnNldF90YWcgPSBmdW5jdGlvbihzdGFydF9yb3csIHN0YXJ0X2NoYXIsIGVuZF9yb3csIGVuZF9jaGFyLCB0YWdfbmFtZSwgdGFnX3ZhbHVlKSB7XG4gICAgdmFyIGNvb3JkcyA9IHRoaXMudmFsaWRhdGVfY29vcmRzLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgZm9yICh2YXIgcm93ID0gY29vcmRzLnN0YXJ0X3Jvdzsgcm93IDw9IGNvb3Jkcy5lbmRfcm93OyByb3crKykge1xuICAgICAgICB2YXIgc3RhcnQgPSBjb29yZHMuc3RhcnRfY2hhcjtcbiAgICAgICAgdmFyIGVuZCA9IGNvb3Jkcy5lbmRfY2hhcjtcbiAgICAgICAgaWYgKHJvdyA+IGNvb3Jkcy5zdGFydF9yb3cpIHsgc3RhcnQgPSAtMTsgfVxuICAgICAgICBpZiAocm93IDwgY29vcmRzLmVuZF9yb3cpIHsgZW5kID0gLTE7IH1cblxuICAgICAgICAvLyBSZW1vdmUgb3IgbW9kaWZ5IGNvbmZsaWN0aW5nIHRhZ3MuXG4gICAgICAgIHZhciBhZGRfdGFncyA9IFtdO1xuICAgICAgICB0aGlzLl9yb3dfdGFnc1tyb3ddLmZpbHRlcihmdW5jdGlvbih0YWcpIHtcbiAgICAgICAgICAgIGlmICh0YWcubmFtZSA9PSB0YWdfbmFtZSkge1xuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRhZyBpcyB3aXRoaW5cbiAgICAgICAgICAgICAgICBpZiAoc3RhcnQgPT0gLTEgJiYgZW5kID09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHRhZy5zdGFydCA+PSBzdGFydCAmJiAodGFnLmVuZCA8IGVuZCB8fCBlbmQgPT0gLTEpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGFnIGlzIG91dHNpZGVcbiAgICAgICAgICAgICAgICAvLyBUbyB0aGUgcmlnaHQ/XG4gICAgICAgICAgICAgICAgaWYgKHRhZy5zdGFydCA+IGVuZCAmJiBlbmQgIT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFRvIHRoZSBsZWZ0P1xuICAgICAgICAgICAgICAgIGlmICh0YWcuZW5kIDwgc3RhcnQgJiYgdGFnLmVuZCAhPSAtMSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0YWcgZW5jYXBzdWxhdGVzXG4gICAgICAgICAgICAgICAgdmFyIGxlZnRfaW50ZXJzZWN0aW5nID0gdGFnLnN0YXJ0IDwgc3RhcnQ7XG4gICAgICAgICAgICAgICAgdmFyIHJpZ2h0X2ludGVyc2VjdGluZyA9IGVuZCAhPSAtMSAmJiAodGFnLmVuZCA9PSAtMSB8fCB0YWcuZW5kID4gZW5kKTtcblxuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRhZyBpcyBsZWZ0IGludGVyc2VjdGluZ1xuICAgICAgICAgICAgICAgIGlmIChsZWZ0X2ludGVyc2VjdGluZykge1xuICAgICAgICAgICAgICAgICAgICBhZGRfdGFncy5wdXNoKHtuYW1lOiB0YWdfbmFtZSwgdmFsdWU6IHRhZy52YWx1ZSwgc3RhcnQ6IHRhZy5zdGFydCwgZW5kOiBzdGFydC0xfSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGFnIGlzIHJpZ2h0IGludGVyc2VjdGluZ1xuICAgICAgICAgICAgICAgIGlmIChyaWdodF9pbnRlcnNlY3RpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgYWRkX3RhZ3MucHVzaCh7bmFtZTogdGFnX25hbWUsIHZhbHVlOiB0YWcudmFsdWUsIHN0YXJ0OiBlbmQrMSwgZW5kOiB0YWcuZW5kfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgdGFncyBhbmQgY29ycmVjdGVkIHRhZ3MuXG4gICAgICAgIHRoaXMuX3Jvd190YWdzW3Jvd10gPSB0aGlzLl9yb3dfdGFnc1tyb3ddLmNvbmNhdChhZGRfdGFncyk7XG4gICAgICAgIHRoaXMuX3Jvd190YWdzW3Jvd10ucHVzaCh7bmFtZTogdGFnX25hbWUsIHZhbHVlOiB0YWdfdmFsdWUsIHN0YXJ0OiBzdGFydCwgZW5kOiBlbmR9KTtcbiAgICB9XG4gICAgdGhpcy50cmlnZ2VyX3RhZ19ldmVudHMoKTtcbn07XG5cbi8qKlxuICogUmVtb3ZlZCBhbGwgb2YgdGhlIHRhZ3Mgb24gdGhlIGRvY3VtZW50LlxuICogQHBhcmFtICB7aW50ZWdlcn0gc3RhcnRfcm93XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBlbmRfcm93XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5jbGVhcl90YWdzID0gZnVuY3Rpb24oc3RhcnRfcm93LCBlbmRfcm93KSB7XG4gICAgc3RhcnRfcm93ID0gc3RhcnRfcm93ICE9PSB1bmRlZmluZWQgPyBzdGFydF9yb3cgOiAwO1xuICAgIGVuZF9yb3cgPSBlbmRfcm93ICE9PSB1bmRlZmluZWQgPyBlbmRfcm93IDogdGhpcy5fcm93X3RhZ3MubGVuZ3RoIC0gMTtcbiAgICBmb3IgKHZhciBpID0gc3RhcnRfcm93OyBpIDw9IGVuZF9yb3c7IGkrKykge1xuICAgICAgICB0aGlzLl9yb3dfdGFnc1tpXSA9IFtdO1xuICAgIH1cbiAgICB0aGlzLnRyaWdnZXJfdGFnX2V2ZW50cygpO1xufTtcblxuLyoqXG4gKiBHZXQgdGhlIHRhZ3MgYXBwbGllZCB0byBhIGNoYXJhY3Rlci5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IHJvd19pbmRleFxuICogQHBhcmFtICB7aW50ZWdlcn0gY2hhcl9pbmRleFxuICogQHJldHVybiB7ZGljdGlvbmFyeX1cbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUuZ2V0X3RhZ3MgPSBmdW5jdGlvbihyb3dfaW5kZXgsIGNoYXJfaW5kZXgpIHtcbiAgICB2YXIgY29vcmRzID0gdGhpcy52YWxpZGF0ZV9jb29yZHMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB2YXIgdGFncyA9IHt9O1xuICAgIHRoaXMuX3Jvd190YWdzW2Nvb3Jkcy5zdGFydF9yb3ddLmZvckVhY2goZnVuY3Rpb24odGFnKSB7XG4gICAgICAgIC8vIFRhZyBzdGFydCBvZiAtMSBtZWFucyB0aGUgdGFnIGNvbnRpbnVlcyB0byB0aGUgcHJldmlvdXMgbGluZS5cbiAgICAgICAgdmFyIGFmdGVyX3N0YXJ0ID0gKGNvb3Jkcy5zdGFydF9jaGFyID49IHRhZy5zdGFydCB8fCB0YWcuc3RhcnQgPT0gLTEpO1xuICAgICAgICAvLyBUYWcgZW5kIG9mIC0xIG1lYW5zIHRoZSB0YWcgY29udGludWVzIHRvIHRoZSBuZXh0IGxpbmUuXG4gICAgICAgIHZhciBiZWZvcmVfZW5kID0gKGNvb3Jkcy5zdGFydF9jaGFyIDw9IHRhZy5lbmQgfHwgdGFnLmVuZCA9PSAtMSk7XG4gICAgICAgIGlmIChhZnRlcl9zdGFydCAmJiBiZWZvcmVfZW5kKSB7XG4gICAgICAgICAgICB0YWdzW3RhZy5uYW1lXSA9IHRhZy52YWx1ZTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiB0YWdzO1xufTtcblxuLyoqXG4gKiBBZGRzIHRleHQgZWZmaWNpZW50bHkgc29tZXdoZXJlIGluIHRoZSBkb2N1bWVudC5cbiAqIEBwYXJhbSB7aW50ZWdlcn0gcm93X2luZGV4ICBcbiAqIEBwYXJhbSB7aW50ZWdlcn0gY2hhcl9pbmRleCBcbiAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0XG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLmFkZF90ZXh0ID0gZnVuY3Rpb24ocm93X2luZGV4LCBjaGFyX2luZGV4LCB0ZXh0KSB7XG4gICAgdmFyIGNvb3JkcyA9IHRoaXMudmFsaWRhdGVfY29vcmRzLmFwcGx5KHRoaXMsIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCwyKSk7XG4gICAgLy8gSWYgdGhlIHRleHQgaGFzIGEgbmV3IGxpbmUgaW4gaXQsIGp1c3QgcmUtc2V0XG4gICAgLy8gdGhlIHJvd3MgbGlzdC5cbiAgICBpZiAodGV4dC5pbmRleE9mKCdcXG4nKSAhPSAtMSkge1xuICAgICAgICB2YXIgbmV3X3Jvd3MgPSBbXTtcbiAgICAgICAgaWYgKGNvb3Jkcy5zdGFydF9yb3cgPiAwKSB7XG4gICAgICAgICAgICBuZXdfcm93cyA9IHRoaXMuX3Jvd3Muc2xpY2UoMCwgY29vcmRzLnN0YXJ0X3Jvdyk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgb2xkX3JvdyA9IHRoaXMuX3Jvd3NbY29vcmRzLnN0YXJ0X3Jvd107XG4gICAgICAgIHZhciBvbGRfcm93X3N0YXJ0ID0gb2xkX3Jvdy5zdWJzdHJpbmcoMCwgY29vcmRzLnN0YXJ0X2NoYXIpO1xuICAgICAgICB2YXIgb2xkX3Jvd19lbmQgPSBvbGRfcm93LnN1YnN0cmluZyhjb29yZHMuc3RhcnRfY2hhcik7XG4gICAgICAgIHZhciBzcGxpdF90ZXh0ID0gdGV4dC5zcGxpdCgnXFxuJyk7XG4gICAgICAgIG5ld19yb3dzLnB1c2gob2xkX3Jvd19zdGFydCArIHNwbGl0X3RleHRbMF0pO1xuXG4gICAgICAgIGlmIChzcGxpdF90ZXh0Lmxlbmd0aCA+IDIpIHtcbiAgICAgICAgICAgIG5ld19yb3dzID0gbmV3X3Jvd3MuY29uY2F0KHNwbGl0X3RleHQuc2xpY2UoMSxzcGxpdF90ZXh0Lmxlbmd0aC0xKSk7XG4gICAgICAgIH1cblxuICAgICAgICBuZXdfcm93cy5wdXNoKHNwbGl0X3RleHRbc3BsaXRfdGV4dC5sZW5ndGgtMV0gKyBvbGRfcm93X2VuZCk7XG5cbiAgICAgICAgaWYgKGNvb3Jkcy5zdGFydF9yb3crMSA8IHRoaXMuX3Jvd3MubGVuZ3RoKSB7XG4gICAgICAgICAgICBuZXdfcm93cyA9IG5ld19yb3dzLmNvbmNhdCh0aGlzLl9yb3dzLnNsaWNlKGNvb3Jkcy5zdGFydF9yb3crMSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fcm93cyA9IG5ld19yb3dzO1xuICAgICAgICB0aGlzLl9yZXNpemVkX3Jvd3MoKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdyb3dfY2hhbmdlZCcsIGNvb3Jkcy5zdGFydF9yb3cpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ3Jvd3NfYWRkZWQnLCBjb29yZHMuc3RhcnRfcm93ICsgMSwgY29vcmRzLnN0YXJ0X3JvdyArIHNwbGl0X3RleHQubGVuZ3RoIC0gMSk7XG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xuXG4gICAgLy8gVGV4dCBkb2Vzbid0IGhhdmUgYW55IG5ldyBsaW5lcywganVzdCBtb2RpZnkgdGhlXG4gICAgLy8gbGluZSBhbmQgdGhlbiB0cmlnZ2VyIHRoZSByb3cgY2hhbmdlZCBldmVudC5cbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgb2xkX3RleHQgPSB0aGlzLl9yb3dzW2Nvb3Jkcy5zdGFydF9yb3ddO1xuICAgICAgICB0aGlzLl9yb3dzW2Nvb3Jkcy5zdGFydF9yb3ddID0gb2xkX3RleHQuc3Vic3RyaW5nKDAsIGNvb3Jkcy5zdGFydF9jaGFyKSArIHRleHQgKyBvbGRfdGV4dC5zdWJzdHJpbmcoY29vcmRzLnN0YXJ0X2NoYXIpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ3Jvd19jaGFuZ2VkJywgY29vcmRzLnN0YXJ0X3Jvdyk7XG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgIH1cbn07XG5cbi8qKlxuICogUmVtb3ZlcyBhIGJsb2NrIG9mIHRleHQgZnJvbSB0aGUgZG9jdW1lbnRcbiAqIEBwYXJhbSAge2ludGVnZXJ9IHN0YXJ0X3Jvd1xuICogQHBhcmFtICB7aW50ZWdlcn0gc3RhcnRfY2hhclxuICogQHBhcmFtICB7aW50ZWdlcn0gZW5kX3Jvd1xuICogQHBhcmFtICB7aW50ZWdlcn0gZW5kX2NoYXJcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLnJlbW92ZV90ZXh0ID0gZnVuY3Rpb24oc3RhcnRfcm93LCBzdGFydF9jaGFyLCBlbmRfcm93LCBlbmRfY2hhcikge1xuICAgIHZhciBjb29yZHMgPSB0aGlzLnZhbGlkYXRlX2Nvb3Jkcy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIGlmIChjb29yZHMuc3RhcnRfcm93ID09IGNvb3Jkcy5lbmRfcm93KSB7XG4gICAgICAgIHRoaXMuX3Jvd3NbY29vcmRzLnN0YXJ0X3Jvd10gPSB0aGlzLl9yb3dzW2Nvb3Jkcy5zdGFydF9yb3ddLnN1YnN0cmluZygwLCBjb29yZHMuc3RhcnRfY2hhcikgKyB0aGlzLl9yb3dzW2Nvb3Jkcy5zdGFydF9yb3ddLnN1YnN0cmluZyhjb29yZHMuZW5kX2NoYXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3Jvd3NbY29vcmRzLnN0YXJ0X3Jvd10gPSB0aGlzLl9yb3dzW2Nvb3Jkcy5zdGFydF9yb3ddLnN1YnN0cmluZygwLCBjb29yZHMuc3RhcnRfY2hhcikgKyB0aGlzLl9yb3dzW2Nvb3Jkcy5lbmRfcm93XS5zdWJzdHJpbmcoY29vcmRzLmVuZF9jaGFyKTtcbiAgICB9XG5cbiAgICBpZiAoY29vcmRzLmVuZF9yb3cgLSBjb29yZHMuc3RhcnRfcm93ID4gMCkge1xuICAgICAgICB0aGlzLl9yb3dzLnNwbGljZShjb29yZHMuc3RhcnRfcm93ICsgMSwgY29vcmRzLmVuZF9yb3cgLSBjb29yZHMuc3RhcnRfcm93KTtcbiAgICAgICAgdGhpcy5fcmVzaXplZF9yb3dzKCk7XG4gICAgICAgIHRoaXMudHJpZ2dlcigndGV4dF9jaGFuZ2VkJyk7XG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgIH0gZWxzZSBpZiAoY29vcmRzLmVuZF9yb3cgPT0gY29vcmRzLnN0YXJ0X3Jvdykge1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ3Jvd19jaGFuZ2VkJywgY29vcmRzLnN0YXJ0X3Jvdyk7XG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgIH1cbn07XG5cbi8qKlxuICogUmVtb3ZlIGEgcm93IGZyb20gdGhlIGRvY3VtZW50LlxuICogQHBhcmFtICB7aW50ZWdlcn0gcm93X2luZGV4XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5yZW1vdmVfcm93ID0gZnVuY3Rpb24ocm93X2luZGV4KSB7XG4gICAgaWYgKDAgPCByb3dfaW5kZXggJiYgcm93X2luZGV4IDwgdGhpcy5fcm93cy5sZW5ndGgpIHtcbiAgICAgICAgdGhpcy5fcm93cy5zcGxpY2Uocm93X2luZGV4LCAxKTtcbiAgICAgICAgdGhpcy5fcmVzaXplZF9yb3dzKCk7XG4gICAgICAgIHRoaXMudHJpZ2dlcigndGV4dF9jaGFuZ2VkJyk7XG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgIH1cbn07XG5cbi8qKlxuICogR2V0cyBhIGNodW5rIG9mIHRleHQuXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBzdGFydF9yb3dcbiAqIEBwYXJhbSAge2ludGVnZXJ9IHN0YXJ0X2NoYXJcbiAqIEBwYXJhbSAge2ludGVnZXJ9IGVuZF9yb3dcbiAqIEBwYXJhbSAge2ludGVnZXJ9IGVuZF9jaGFyXG4gKiBAcmV0dXJuIHtzdHJpbmd9XG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLmdldF90ZXh0ID0gZnVuY3Rpb24oc3RhcnRfcm93LCBzdGFydF9jaGFyLCBlbmRfcm93LCBlbmRfY2hhcikge1xuICAgIHZhciBjb29yZHMgPSB0aGlzLnZhbGlkYXRlX2Nvb3Jkcy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIGlmIChjb29yZHMuc3RhcnRfcm93PT1jb29yZHMuZW5kX3Jvdykge1xuICAgICAgICByZXR1cm4gdGhpcy5fcm93c1tjb29yZHMuc3RhcnRfcm93XS5zdWJzdHJpbmcoY29vcmRzLnN0YXJ0X2NoYXIsIGNvb3Jkcy5lbmRfY2hhcik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHRleHQgPSBbXTtcbiAgICAgICAgdGV4dC5wdXNoKHRoaXMuX3Jvd3NbY29vcmRzLnN0YXJ0X3Jvd10uc3Vic3RyaW5nKGNvb3Jkcy5zdGFydF9jaGFyKSk7XG4gICAgICAgIGlmIChjb29yZHMuZW5kX3JvdyAtIGNvb3Jkcy5zdGFydF9yb3cgPiAxKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gY29vcmRzLnN0YXJ0X3JvdyArIDE7IGkgPCBjb29yZHMuZW5kX3JvdzsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGV4dC5wdXNoKHRoaXMuX3Jvd3NbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRleHQucHVzaCh0aGlzLl9yb3dzW2Nvb3Jkcy5lbmRfcm93XS5zdWJzdHJpbmcoMCwgY29vcmRzLmVuZF9jaGFyKSk7XG4gICAgICAgIHJldHVybiB0ZXh0LmpvaW4oJ1xcbicpO1xuICAgIH1cbn07XG5cbi8qKlxuICogQWRkIGEgcm93IHRvIHRoZSBkb2N1bWVudFxuICogQHBhcmFtIHtpbnRlZ2VyfSByb3dfaW5kZXhcbiAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gbmV3IHJvdydzIHRleHRcbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUuYWRkX3JvdyA9IGZ1bmN0aW9uKHJvd19pbmRleCwgdGV4dCkge1xuICAgIHZhciBuZXdfcm93cyA9IFtdO1xuICAgIGlmIChyb3dfaW5kZXggPiAwKSB7XG4gICAgICAgIG5ld19yb3dzID0gdGhpcy5fcm93cy5zbGljZSgwLCByb3dfaW5kZXgpO1xuICAgIH1cbiAgICBuZXdfcm93cy5wdXNoKHRleHQpO1xuICAgIGlmIChyb3dfaW5kZXggPCB0aGlzLl9yb3dzLmxlbmd0aCkge1xuICAgICAgICBuZXdfcm93cyA9IG5ld19yb3dzLmNvbmNhdCh0aGlzLl9yb3dzLnNsaWNlKHJvd19pbmRleCkpO1xuICAgIH1cblxuICAgIHRoaXMuX3Jvd3MgPSBuZXdfcm93cztcbiAgICB0aGlzLl9yZXNpemVkX3Jvd3MoKTtcbiAgICB0aGlzLnRyaWdnZXIoJ3Jvd3NfYWRkZWQnLCByb3dfaW5kZXgsIHJvd19pbmRleCk7XG4gICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2VkJyk7XG59O1xuXG4vKipcbiAqIFZhbGlkYXRlcyByb3csIGNoYXJhY3RlciBjb29yZGluYXRlcyBpbiB0aGUgZG9jdW1lbnQuXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBzdGFydF9yb3dcbiAqIEBwYXJhbSAge2ludGVnZXJ9IHN0YXJ0X2NoYXJcbiAqIEBwYXJhbSAge2ludGVnZXJ9IChvcHRpb25hbCkgZW5kX3Jvd1xuICogQHBhcmFtICB7aW50ZWdlcn0gKG9wdGlvbmFsKSBlbmRfY2hhclxuICogQHJldHVybiB7ZGljdGlvbmFyeX0gZGljdGlvbmFyeSBjb250YWluaW5nIHZhbGlkYXRlZCBjb29yZGluYXRlcyB7c3RhcnRfcm93LCBcbiAqICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0X2NoYXIsIGVuZF9yb3csIGVuZF9jaGFyfVxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS52YWxpZGF0ZV9jb29yZHMgPSBmdW5jdGlvbihzdGFydF9yb3csIHN0YXJ0X2NoYXIsIGVuZF9yb3csIGVuZF9jaGFyKSB7XG5cbiAgICAvLyBNYWtlIHN1cmUgdGhlIHZhbHVlcyBhcmVuJ3QgdW5kZWZpbmVkLlxuICAgIGlmIChzdGFydF9yb3cgPT09IHVuZGVmaW5lZCkgc3RhcnRfcm93ID0gMDtcbiAgICBpZiAoc3RhcnRfY2hhciA9PT0gdW5kZWZpbmVkKSBzdGFydF9jaGFyID0gMDtcbiAgICBpZiAoZW5kX3JvdyA9PT0gdW5kZWZpbmVkKSBlbmRfcm93ID0gc3RhcnRfcm93O1xuICAgIGlmIChlbmRfY2hhciA9PT0gdW5kZWZpbmVkKSBlbmRfY2hhciA9IHN0YXJ0X2NoYXI7XG5cbiAgICAvLyBNYWtlIHN1cmUgdGhlIHZhbHVlcyBhcmUgd2l0aGluIHRoZSBib3VuZHMgb2YgdGhlIGNvbnRlbnRzLlxuICAgIGlmICh0aGlzLl9yb3dzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBzdGFydF9yb3cgPSAwO1xuICAgICAgICBzdGFydF9jaGFyID0gMDtcbiAgICAgICAgZW5kX3JvdyA9IDA7XG4gICAgICAgIGVuZF9jaGFyID0gMDtcbiAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoc3RhcnRfcm93ID49IHRoaXMuX3Jvd3MubGVuZ3RoKSBzdGFydF9yb3cgPSB0aGlzLl9yb3dzLmxlbmd0aCAtIDE7XG4gICAgICAgIGlmIChzdGFydF9yb3cgPCAwKSBzdGFydF9yb3cgPSAwO1xuICAgICAgICBpZiAoZW5kX3JvdyA+PSB0aGlzLl9yb3dzLmxlbmd0aCkgZW5kX3JvdyA9IHRoaXMuX3Jvd3MubGVuZ3RoIC0gMTtcbiAgICAgICAgaWYgKGVuZF9yb3cgPCAwKSBlbmRfcm93ID0gMDtcblxuICAgICAgICBpZiAoc3RhcnRfY2hhciA+IHRoaXMuX3Jvd3Nbc3RhcnRfcm93XS5sZW5ndGgpIHN0YXJ0X2NoYXIgPSB0aGlzLl9yb3dzW3N0YXJ0X3Jvd10ubGVuZ3RoO1xuICAgICAgICBpZiAoc3RhcnRfY2hhciA8IDApIHN0YXJ0X2NoYXIgPSAwO1xuICAgICAgICBpZiAoZW5kX2NoYXIgPiB0aGlzLl9yb3dzW2VuZF9yb3ddLmxlbmd0aCkgZW5kX2NoYXIgPSB0aGlzLl9yb3dzW2VuZF9yb3ddLmxlbmd0aDtcbiAgICAgICAgaWYgKGVuZF9jaGFyIDwgMCkgZW5kX2NoYXIgPSAwO1xuICAgIH1cblxuICAgIC8vIE1ha2Ugc3VyZSB0aGUgc3RhcnQgaXMgYmVmb3JlIHRoZSBlbmQuXG4gICAgaWYgKHN0YXJ0X3JvdyA+IGVuZF9yb3cgfHwgKHN0YXJ0X3JvdyA9PSBlbmRfcm93ICYmIHN0YXJ0X2NoYXIgPiBlbmRfY2hhcikpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN0YXJ0X3JvdzogZW5kX3JvdyxcbiAgICAgICAgICAgIHN0YXJ0X2NoYXI6IGVuZF9jaGFyLFxuICAgICAgICAgICAgZW5kX3Jvdzogc3RhcnRfcm93LFxuICAgICAgICAgICAgZW5kX2NoYXI6IHN0YXJ0X2NoYXIsXG4gICAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN0YXJ0X3Jvdzogc3RhcnRfcm93LFxuICAgICAgICAgICAgc3RhcnRfY2hhcjogc3RhcnRfY2hhcixcbiAgICAgICAgICAgIGVuZF9yb3c6IGVuZF9yb3csXG4gICAgICAgICAgICBlbmRfY2hhcjogZW5kX2NoYXIsXG4gICAgICAgIH07XG4gICAgfVxufTtcblxuLyoqXG4gKiBHZXRzIHRoZSB0ZXh0IG9mIHRoZSBkb2N1bWVudC5cbiAqIEByZXR1cm4ge3N0cmluZ31cbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUuX2dldF90ZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3Jvd3Muam9pbignXFxuJyk7XG59O1xuXG4vKipcbiAqIFNldHMgdGhlIHRleHQgb2YgdGhlIGRvY3VtZW50LlxuICogQ29tcGxleGl0eSBPKE4pIGZvciBOIHJvd3NcbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZVxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5fc2V0X3RleHQgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHRoaXMuX3Jvd3MgPSB2YWx1ZS5zcGxpdCgnXFxuJyk7XG4gICAgdGhpcy5fcmVzaXplZF9yb3dzKCk7XG4gICAgdGhpcy50cmlnZ2VyKCd0ZXh0X2NoYW5nZWQnKTtcbiAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZWQnKTtcbn07XG5cbi8qKlxuICogVXBkYXRlcyBfcm93J3MgcGFydG5lciBhcnJheXMuXG4gKiBAcmV0dXJuIHtudWxsfSBcbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUuX3Jlc2l6ZWRfcm93cyA9IGZ1bmN0aW9uKCkge1xuXG4gICAgLy8gTWFrZSBzdXJlIHRoZXJlIGFyZSBhcyBtYW55IHRhZyByb3dzIGFzIHRoZXJlIGFyZSB0ZXh0IHJvd3MuXG4gICAgd2hpbGUgKHRoaXMuX3Jvd190YWdzLmxlbmd0aCA8IHRoaXMuX3Jvd3MubGVuZ3RoKSB7XG4gICAgICAgIHRoaXMuX3Jvd190YWdzLnB1c2goW10pO1xuICAgIH1cbiAgICBpZiAodGhpcy5fcm93X3RhZ3MubGVuZ3RoID4gdGhpcy5fcm93cy5sZW5ndGgpIHtcbiAgICAgICAgdGhpcy5fcm93X3RhZ3Muc3BsaWNlKHRoaXMuX3Jvd3MubGVuZ3RoLCB0aGlzLl9yb3dfdGFncy5sZW5ndGggLSB0aGlzLl9yb3dzLmxlbmd0aCk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBDcmVhdGUgdGhlIGRvY3VtZW50J3MgcHJvcGVydGllcy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLl9pbml0X3Byb3BlcnRpZXMgPSBmdW5jdGlvbigpIHsgICAgXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMucHJvcGVydHkoJ3Jvd3MnLCBmdW5jdGlvbigpIHsgXG4gICAgICAgIC8vIFJldHVybiBhIHNoYWxsb3cgY29weSBvZiB0aGUgYXJyYXkgc28gaXQgY2Fubm90IGJlIG1vZGlmaWVkLlxuICAgICAgICByZXR1cm4gW10uY29uY2F0KHRoYXQuX3Jvd3MpOyBcbiAgICB9KTtcbiAgICB0aGlzLnByb3BlcnR5KCd0ZXh0JywgXG4gICAgICAgIHV0aWxzLnByb3h5KHRoaXMuX2dldF90ZXh0LCB0aGlzKSwgXG4gICAgICAgIHV0aWxzLnByb3h5KHRoaXMuX3NldF90ZXh0LCB0aGlzKSk7XG59O1xuXG5leHBvcnRzLkRvY3VtZW50TW9kZWwgPSBEb2N1bWVudE1vZGVsOyIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcblxuLy8gUmVuZGVyZXJzXG52YXIgYmF0Y2ggPSByZXF1aXJlKCcuL3JlbmRlcmVycy9iYXRjaC5qcycpO1xudmFyIGhpZ2hsaWdodGVkX3JvdyA9IHJlcXVpcmUoJy4vcmVuZGVyZXJzL2hpZ2hsaWdodGVkX3Jvdy5qcycpO1xudmFyIGN1cnNvcnMgPSByZXF1aXJlKCcuL3JlbmRlcmVycy9jdXJzb3JzLmpzJyk7XG52YXIgc2VsZWN0aW9ucyA9IHJlcXVpcmUoJy4vcmVuZGVyZXJzL3NlbGVjdGlvbnMuanMnKTtcbnZhciBjb2xvciA9IHJlcXVpcmUoJy4vcmVuZGVyZXJzL2NvbG9yLmpzJyk7XG52YXIgaGlnaGxpZ2h0ZXIgPSByZXF1aXJlKCcuL2hpZ2hsaWdodGVycy9wcmlzbS5qcycpO1xuXG4vKipcbiAqIFZpc3VhbCByZXByZXNlbnRhdGlvbiBvZiBhIERvY3VtZW50TW9kZWwgaW5zdGFuY2VcbiAqIEBwYXJhbSB7Q2FudmFzfSBjYW52YXMgaW5zdGFuY2VcbiAqIEBwYXJhbSB7RG9jdW1lbnRNb2RlbH0gbW9kZWwgaW5zdGFuY2VcbiAqIEBwYXJhbSB7Q3Vyc29yc30gY3Vyc29yc19tb2RlbCBpbnN0YW5jZVxuICogQHBhcmFtIHtTdHlsZX0gc3R5bGUgLSBkZXNjcmliZXMgcmVuZGVyaW5nIHN0eWxlXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBoYXNfZm9jdXMgLSBmdW5jdGlvbiB0aGF0IGNoZWNrcyBpZiB0aGUgdGV4dCBhcmVhIGhhcyBmb2N1c1xuICovXG52YXIgRG9jdW1lbnRWaWV3ID0gZnVuY3Rpb24oY2FudmFzLCBtb2RlbCwgY3Vyc29yc19tb2RlbCwgc3R5bGUsIGhhc19mb2N1cykge1xuICAgIHRoaXMuX21vZGVsID0gbW9kZWw7XG5cbiAgICAvLyBDcmVhdGUgY2hpbGQgcmVuZGVyZXJzLlxuICAgIHZhciByb3dfcmVuZGVyZXIgPSBuZXcgaGlnaGxpZ2h0ZWRfcm93LkhpZ2hsaWdodGVkUm93UmVuZGVyZXIobW9kZWwsIGNhbnZhcywgc3R5bGUpO1xuICAgIHJvd19yZW5kZXJlci5tYXJnaW5fbGVmdCA9IDI7XG4gICAgcm93X3JlbmRlcmVyLm1hcmdpbl90b3AgPSAyO1xuICAgIFxuICAgIHZhciBjdXJzb3JzX3JlbmRlcmVyID0gbmV3IGN1cnNvcnMuQ3Vyc29yc1JlbmRlcmVyKFxuICAgICAgICBjdXJzb3JzX21vZGVsLCBcbiAgICAgICAgc3R5bGUsIFxuICAgICAgICByb3dfcmVuZGVyZXIsXG4gICAgICAgIGhhc19mb2N1cyk7XG4gICAgdmFyIHNlbGVjdGlvbnNfcmVuZGVyZXIgPSBuZXcgc2VsZWN0aW9ucy5TZWxlY3Rpb25zUmVuZGVyZXIoXG4gICAgICAgIGN1cnNvcnNfbW9kZWwsIFxuICAgICAgICBzdHlsZSwgXG4gICAgICAgIHJvd19yZW5kZXJlcixcbiAgICAgICAgaGFzX2ZvY3VzLFxuICAgICAgICBjdXJzb3JzX3JlbmRlcmVyKTtcblxuICAgIC8vIENyZWF0ZSB0aGUgYmFja2dyb3VuZCByZW5kZXJlclxuICAgIHZhciBjb2xvcl9yZW5kZXJlciA9IG5ldyBjb2xvci5Db2xvclJlbmRlcmVyKCk7XG4gICAgY29sb3JfcmVuZGVyZXIuY29sb3IgPSBzdHlsZS5iYWNrZ3JvdW5kIHx8ICd3aGl0ZSc7XG4gICAgc3R5bGUub24oJ2NoYW5nZWQ6c3R5bGUnLCBmdW5jdGlvbigpIHsgY29sb3JfcmVuZGVyZXIuY29sb3IgPSBzdHlsZS5iYWNrZ3JvdW5kOyB9KTtcblxuICAgIC8vIENyZWF0ZSB0aGUgZG9jdW1lbnQgaGlnaGxpZ2h0ZXIsIHdoaWNoIG5lZWRzIHRvIGtub3cgYWJvdXQgdGhlIGN1cnJlbnRseVxuICAgIC8vIHJlbmRlcmVkIHJvd3MgaW4gb3JkZXIgdG8ga25vdyB3aGVyZSB0byBoaWdobGlnaHQuXG4gICAgdGhpcy5oaWdobGlnaHRlciA9IG5ldyBoaWdobGlnaHRlci5QcmlzbUhpZ2hsaWdodGVyKG1vZGVsLCByb3dfcmVuZGVyZXIpO1xuXG4gICAgLy8gUGFzcyBnZXRfcm93X2NoYXIgaW50byBjdXJzb3JzLlxuICAgIGN1cnNvcnNfbW9kZWwuZ2V0X3Jvd19jaGFyID0gdXRpbHMucHJveHkocm93X3JlbmRlcmVyLmdldF9yb3dfY2hhciwgcm93X3JlbmRlcmVyKTtcblxuICAgIC8vIENhbGwgYmFzZSBjb25zdHJ1Y3Rvci5cbiAgICBiYXRjaC5CYXRjaFJlbmRlcmVyLmNhbGwodGhpcywgW1xuICAgICAgICBjb2xvcl9yZW5kZXJlcixcbiAgICAgICAgc2VsZWN0aW9uc19yZW5kZXJlcixcbiAgICAgICAgcm93X3JlbmRlcmVyLFxuICAgICAgICBjdXJzb3JzX3JlbmRlcmVyLFxuICAgIF0sIGNhbnZhcyk7XG5cbiAgICAvLyBIb29rdXAgcmVuZGVyIGV2ZW50cy5cbiAgICB0aGlzLl9jYW52YXMub24oJ3JlZHJhdycsIHV0aWxzLnByb3h5KHRoaXMucmVuZGVyLCB0aGlzKSk7XG4gICAgdGhpcy5fbW9kZWwub24oJ2NoYW5nZWQnLCB1dGlscy5wcm94eShjYW52YXMucmVkcmF3LCBjYW52YXMpKTtcblxuICAgIC8vIENyZWF0ZSBwcm9wZXJ0aWVzXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMucHJvcGVydHkoJ2xhbmd1YWdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9sYW5ndWFnZTtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0LmhpZ2hsaWdodGVyLmxvYWQodmFsdWUpO1xuICAgICAgICB0aGF0Ll9sYW5ndWFnZSA9IHZhbHVlO1xuICAgIH0pO1xufTtcbnV0aWxzLmluaGVyaXQoRG9jdW1lbnRWaWV3LCBiYXRjaC5CYXRjaFJlbmRlcmVyKTtcblxuZXhwb3J0cy5Eb2N1bWVudFZpZXcgPSBEb2N1bWVudFZpZXc7IiwiLy8gT1NYIGJpbmRpbmdzXG5pZiAobmF2aWdhdG9yLmFwcFZlcnNpb24uaW5kZXhPZihcIk1hY1wiKSAhPSAtMSkge1xuICAgIGV4cG9ydHMubWFwID0ge1xuICAgICAgICAnYWx0LWxlZnRhcnJvdycgOiAnY3Vyc29yLndvcmRfbGVmdCcsXG4gICAgICAgICdhbHQtcmlnaHRhcnJvdycgOiAnY3Vyc29yLndvcmRfcmlnaHQnLFxuICAgICAgICAnc2hpZnQtYWx0LWxlZnRhcnJvdycgOiAnY3Vyc29yLnNlbGVjdF93b3JkX2xlZnQnLFxuICAgICAgICAnc2hpZnQtYWx0LXJpZ2h0YXJyb3cnIDogJ2N1cnNvci5zZWxlY3Rfd29yZF9yaWdodCcsXG4gICAgICAgICdtZXRhLWxlZnRhcnJvdycgOiAnY3Vyc29yLmxpbmVfc3RhcnQnLFxuICAgICAgICAnbWV0YS1yaWdodGFycm93JyA6ICdjdXJzb3IubGluZV9lbmQnLFxuICAgICAgICAnc2hpZnQtbWV0YS1sZWZ0YXJyb3cnIDogJ2N1cnNvci5zZWxlY3RfbGluZV9zdGFydCcsXG4gICAgICAgICdzaGlmdC1tZXRhLXJpZ2h0YXJyb3cnIDogJ2N1cnNvci5zZWxlY3RfbGluZV9lbmQnLFxuICAgICAgICAnbWV0YS1hJyA6ICdjdXJzb3Iuc2VsZWN0X2FsbCcsXG4gICAgfTtcblxuLy8gTm9uIE9TWCBiaW5kaW5nc1xufSBlbHNlIHtcbiAgICBleHBvcnRzLm1hcCA9IHtcbiAgICAgICAgJ2N0cmwtbGVmdGFycm93JyA6ICdjdXJzb3Iud29yZF9sZWZ0JyxcbiAgICAgICAgJ2N0cmwtcmlnaHRhcnJvdycgOiAnY3Vyc29yLndvcmRfcmlnaHQnLFxuICAgICAgICAnc2hpZnQtY3RybC1sZWZ0YXJyb3cnIDogJ2N1cnNvci5zZWxlY3Rfd29yZF9sZWZ0JyxcbiAgICAgICAgJ3NoaWZ0LWN0cmwtcmlnaHRhcnJvdycgOiAnY3Vyc29yLnNlbGVjdF93b3JkX3JpZ2h0JyxcbiAgICAgICAgJ2hvbWUnIDogJ2N1cnNvci5saW5lX3N0YXJ0JyxcbiAgICAgICAgJ2VuZCcgOiAnY3Vyc29yLmxpbmVfZW5kJyxcbiAgICAgICAgJ3NoaWZ0LWhvbWUnIDogJ2N1cnNvci5zZWxlY3RfbGluZV9zdGFydCcsXG4gICAgICAgICdzaGlmdC1lbmQnIDogJ2N1cnNvci5zZWxlY3RfbGluZV9lbmQnLFxuICAgICAgICAnY3RybC1hJyA6ICdjdXJzb3Iuc2VsZWN0X2FsbCcsXG4gICAgfTtcblxufVxuXG4vLyBDb21tb24gYmluZGluZ3NcbmV4cG9ydHMubWFwWydrZXlwcmVzcyddID0gJ2N1cnNvci5rZXlwcmVzcyc7XG5leHBvcnRzLm1hcFsnZW50ZXInXSA9ICdjdXJzb3IubmV3bGluZSc7XG5leHBvcnRzLm1hcFsnZGVsZXRlJ10gPSAnY3Vyc29yLmRlbGV0ZV9mb3J3YXJkJztcbmV4cG9ydHMubWFwWydiYWNrc3BhY2UnXSA9ICdjdXJzb3IuZGVsZXRlX2JhY2t3YXJkJztcbmV4cG9ydHMubWFwWydsZWZ0YXJyb3cnXSA9ICdjdXJzb3IubGVmdCc7XG5leHBvcnRzLm1hcFsncmlnaHRhcnJvdyddID0gJ2N1cnNvci5yaWdodCc7XG5leHBvcnRzLm1hcFsndXBhcnJvdyddID0gJ2N1cnNvci51cCc7XG5leHBvcnRzLm1hcFsnZG93bmFycm93J10gPSAnY3Vyc29yLmRvd24nO1xuZXhwb3J0cy5tYXBbJ3NoaWZ0LWxlZnRhcnJvdyddID0gJ2N1cnNvci5zZWxlY3RfbGVmdCc7XG5leHBvcnRzLm1hcFsnc2hpZnQtcmlnaHRhcnJvdyddID0gJ2N1cnNvci5zZWxlY3RfcmlnaHQnO1xuZXhwb3J0cy5tYXBbJ3NoaWZ0LXVwYXJyb3cnXSA9ICdjdXJzb3Iuc2VsZWN0X3VwJztcbmV4cG9ydHMubWFwWydzaGlmdC1kb3duYXJyb3cnXSA9ICdjdXJzb3Iuc2VsZWN0X2Rvd24nO1xuZXhwb3J0cy5tYXBbJ21vdXNlMC1kYmxjbGljayddID0gJ2N1cnNvcnMuc2VsZWN0X3dvcmQnO1xuZXhwb3J0cy5tYXBbJ21vdXNlMC1kb3duJ10gPSAnY3Vyc29ycy5zdGFydF9zZWxlY3Rpb24nO1xuZXhwb3J0cy5tYXBbJ21vdXNlLW1vdmUnXSA9ICdjdXJzb3JzLnNldF9zZWxlY3Rpb24nO1xuZXhwb3J0cy5tYXBbJ21vdXNlMC11cCddID0gJ2N1cnNvcnMuZW5kX3NlbGVjdGlvbic7XG5leHBvcnRzLm1hcFsnc2hpZnQtbW91c2UwLXVwJ10gPSAnY3Vyc29ycy5lbmRfc2VsZWN0aW9uJztcbmV4cG9ydHMubWFwWydzaGlmdC1tb3VzZTAtZG93biddID0gJ2N1cnNvcnMuc3RhcnRfc2V0X3NlbGVjdGlvbic7XG5leHBvcnRzLm1hcFsnc2hpZnQtbW91c2UtbW92ZSddID0gJ2N1cnNvcnMuc2V0X3NlbGVjdGlvbic7XG5leHBvcnRzLm1hcFsndGFiJ10gPSAnY3Vyc29yLmluZGVudCc7XG5leHBvcnRzLm1hcFsnc2hpZnQtdGFiJ10gPSAnY3Vyc29yLnVuaW5kZW50JztcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpO1xuXG4vKipcbiAqIEV2ZW50IG5vcm1hbGl6ZXJcbiAqXG4gKiBMaXN0ZW5zIHRvIERPTSBldmVudHMgYW5kIGVtaXRzICdjbGVhbmVkJyB2ZXJzaW9ucyBvZiB0aG9zZSBldmVudHMuXG4gKi9cbnZhciBNYXAgPSBmdW5jdGlvbihub3JtYWxpemVyKSB7XG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzKTtcbiAgICB0aGlzLl9tYXAgPSB7fTtcblxuICAgIC8vIENyZWF0ZSBub3JtYWxpemVyIHByb3BlcnR5XG4gICAgdGhpcy5fbm9ybWFsaXplciA9IG51bGw7XG4gICAgdGhpcy5fcHJveHlfaGFuZGxlX2V2ZW50ID0gdXRpbHMucHJveHkodGhpcy5faGFuZGxlX2V2ZW50LCB0aGlzKTtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhpcy5wcm9wZXJ0eSgnbm9ybWFsaXplcicsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fbm9ybWFsaXplcjtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAvLyBSZW1vdmUgZXZlbnQgaGFuZGxlci5cbiAgICAgICAgaWYgKHRoYXQuX25vcm1hbGl6ZXIpIHRoYXQuX25vcm1hbGl6ZXIub2ZmX2FsbCh0aGF0Ll9wcm94eV9oYW5kbGVfZXZlbnQpO1xuICAgICAgICAvLyBTZXQsIGFuZCBhZGQgZXZlbnQgaGFuZGxlci5cbiAgICAgICAgdGhhdC5fbm9ybWFsaXplciA9IHZhbHVlO1xuICAgICAgICBpZiAodmFsdWUpIHZhbHVlLm9uX2FsbCh0aGF0Ll9wcm94eV9oYW5kbGVfZXZlbnQpO1xuICAgIH0pO1xuXG4gICAgLy8gSWYgZGVmaW5lZCwgc2V0IHRoZSBub3JtYWxpemVyLlxuICAgIGlmIChub3JtYWxpemVyKSB0aGlzLm5vcm1hbGl6ZXIgPSBub3JtYWxpemVyO1xufTtcbnV0aWxzLmluaGVyaXQoTWFwLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8qKlxuICogTWFwIG9mIEFQSSBtZXRob2RzIGJ5IG5hbWUuXG4gKiBAdHlwZSB7ZGljdGlvbmFyeX1cbiAqL1xuTWFwLnJlZ2lzdHJ5ID0ge307XG5NYXAuX3JlZ2lzdHJ5X3RhZ3MgPSB7fTtcblxuLyoqXG4gKiBSZWdpc3RlcnMgYW4gYWN0aW9uLlxuICogQHBhcmFtICB7c3RyaW5nfSBuYW1lIC0gbmFtZSBvZiB0aGUgYWN0aW9uXG4gKiBAcGFyYW0gIHtmdW5jdGlvbn0gZlxuICogQHBhcmFtICB7T2JqZWN0fSAob3B0aW9uYWwpIHRhZyAtIGFsbG93cyB5b3UgdG8gc3BlY2lmeSBhIHRhZ1xuICogICAgICAgICAgICAgICAgICB3aGljaCBjYW4gYmUgdXNlZCB3aXRoIHRoZSBgdW5yZWdpc3Rlcl9ieV90YWdgXG4gKiAgICAgICAgICAgICAgICAgIG1ldGhvZCB0byBxdWlja2x5IHVucmVnaXN0ZXIgYWN0aW9ucyB3aXRoXG4gKiAgICAgICAgICAgICAgICAgIHRoZSB0YWcgc3BlY2lmaWVkLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTWFwLnJlZ2lzdGVyID0gZnVuY3Rpb24obmFtZSwgZiwgdGFnKSB7XG4gICAgaWYgKHV0aWxzLmlzX2FycmF5KE1hcC5yZWdpc3RyeVtuYW1lXSkpIHtcbiAgICAgICAgTWFwLnJlZ2lzdHJ5W25hbWVdLnB1c2goZik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKE1hcC5yZWdpc3RyeVtuYW1lXT09PXVuZGVmaW5lZCkge1xuICAgICAgICAgICAgTWFwLnJlZ2lzdHJ5W25hbWVdID0gZjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIE1hcC5yZWdpc3RyeVtuYW1lXSA9IFtNYXAucmVnaXN0cnlbbmFtZV0sIGZdO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRhZykge1xuICAgICAgICBpZiAoTWFwLl9yZWdpc3RyeV90YWdzW3RhZ10gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgTWFwLl9yZWdpc3RyeV90YWdzW3RhZ10gPSBbXTtcbiAgICAgICAgfVxuICAgICAgICBNYXAuX3JlZ2lzdHJ5X3RhZ3NbdGFnXS5wdXNoKHtuYW1lOiBuYW1lLCBmOiBmfSk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBVbnJlZ2lzdGVyIGFuIGFjdGlvbi5cbiAqIEBwYXJhbSAge3N0cmluZ30gbmFtZSAtIG5hbWUgb2YgdGhlIGFjdGlvblxuICogQHBhcmFtICB7ZnVuY3Rpb259IGZcbiAqIEByZXR1cm4ge2Jvb2xlYW59IHRydWUgaWYgYWN0aW9uIHdhcyBmb3VuZCBhbmQgdW5yZWdpc3RlcmVkXG4gKi9cbk1hcC51bnJlZ2lzdGVyID0gZnVuY3Rpb24obmFtZSwgZikge1xuICAgIGlmICh1dGlscy5pc19hcnJheShNYXAucmVnaXN0cnlbbmFtZV0pKSB7XG4gICAgICAgIHZhciBpbmRleCA9IE1hcC5yZWdpc3RyeVtuYW1lXS5pbmRleE9mKGYpO1xuICAgICAgICBpZiAoaW5kZXggIT0gLTEpIHtcbiAgICAgICAgICAgIE1hcC5yZWdpc3RyeVtuYW1lXS5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKE1hcC5yZWdpc3RyeVtuYW1lXSA9PSBmKSB7XG4gICAgICAgIGRlbGV0ZSBNYXAucmVnaXN0cnlbbmFtZV07XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKipcbiAqIFVucmVnaXN0ZXJzIGFsbCBvZiB0aGUgYWN0aW9ucyByZWdpc3RlcmVkIHdpdGggYSBnaXZlbiB0YWcuXG4gKiBAcGFyYW0gIHtPYmplY3R9IHRhZyAtIHNwZWNpZmllZCBpbiBNYXAucmVnaXN0ZXIuXG4gKiBAcmV0dXJuIHtib29sZWFufSB0cnVlIGlmIHRoZSB0YWcgd2FzIGZvdW5kIGFuZCBkZWxldGVkLlxuICovXG5NYXAudW5yZWdpc3Rlcl9ieV90YWcgPSBmdW5jdGlvbih0YWcpIHtcbiAgICBpZiAoTWFwLl9yZWdpc3RyeV90YWdzW3RhZ10pIHtcbiAgICAgICAgTWFwLl9yZWdpc3RyeV90YWdzW3RhZ10uZm9yRWFjaChmdW5jdGlvbihyZWdpc3RyYXRpb24pIHtcbiAgICAgICAgICAgIE1hcC51bnJlZ2lzdGVyKHJlZ2lzdHJhdGlvbi5uYW1lLCByZWdpc3RyYXRpb24uZik7XG4gICAgICAgIH0pO1xuICAgICAgICBkZWxldGUgTWFwLl9yZWdpc3RyeV90YWdzW3RhZ107XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbn07XG5cbi8qKlxuICogQXBwZW5kIGV2ZW50IGFjdGlvbnMgdG8gdGhlIG1hcC5cbiAqXG4gKiBUaGlzIG1ldGhvZCBoYXMgdHdvIHNpZ25hdHVyZXMuICBJZiBhIHNpbmdsZSBhcmd1bWVudFxuICogaXMgcGFzc2VkIHRvIGl0LCB0aGF0IGFyZ3VtZW50IGlzIHRyZWF0ZWQgbGlrZSBhXG4gKiBkaWN0aW9uYXJ5LiAgSWYgbW9yZSB0aGFuIG9uZSBhcmd1bWVudCBpcyBwYXNzZWQgdG8gaXQsXG4gKiBlYWNoIGFyZ3VtZW50IGlzIHRyZWF0ZWQgYXMgYWx0ZXJuYXRpbmcga2V5LCB2YWx1ZVxuICogcGFpcnMgb2YgYSBkaWN0aW9uYXJ5LlxuICpcbiAqIFRoZSBtYXAgYWxsb3dzIHlvdSB0byByZWdpc3RlciBhY3Rpb25zIGZvciBrZXlzLlxuICogRXhhbXBsZTpcbiAqICAgICBtYXAuYXBwZW5kX21hcCh7XG4gKiAgICAgICAgICdjdHJsLWEnOiAnY3Vyc29ycy5zZWxlY3RfYWxsJyxcbiAqICAgICB9KVxuICpcbiAqIE11bHRpcGxlIGFjdGlvbnMgY2FuIGJlIHJlZ2lzdGVyZWQgZm9yIGEgc2luZ2xlIGV2ZW50LlxuICogVGhlIGFjdGlvbnMgYXJlIGV4ZWN1dGVkIHNlcXVlbnRpYWxseSwgdW50aWwgb25lIGFjdGlvblxuICogcmV0dXJucyBgdHJ1ZWAgaW4gd2hpY2ggY2FzZSB0aGUgZXhlY3V0aW9uIGhhdWx0cy4gIFRoaXNcbiAqIGFsbG93cyBhY3Rpb25zIHRvIHJ1biBjb25kaXRpb25hbGx5LlxuICogRXhhbXBsZTpcbiAqICAgICAvLyBJbXBsZW1lbnRpbmcgYSBkdWFsIG1vZGUgZWRpdG9yLCB5b3UgbWF5IGhhdmUgdHdvXG4gKiAgICAgLy8gZnVuY3Rpb25zIHRvIHJlZ2lzdGVyIGZvciBvbmUga2V5LiBpLmUuOlxuICogICAgIHZhciBkb19hID0gZnVuY3Rpb24oZSkge1xuICogICAgICAgICBpZiAobW9kZT09J2VkaXQnKSB7XG4gKiAgICAgICAgICAgICBjb25zb2xlLmxvZygnQScpO1xuICogICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gKiAgICAgICAgIH1cbiAqICAgICB9XG4gKiAgICAgdmFyIGRvX2IgPSBmdW5jdGlvbihlKSB7XG4gKiAgICAgICAgIGlmIChtb2RlPT0nY29tbWFuZCcpIHtcbiAqICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdCJyk7XG4gKiAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAqICAgICAgICAgfVxuICogICAgIH1cbiAqXG4gKiAgICAgLy8gVG8gcmVnaXN0ZXIgYm90aCBmb3Igb25lIGtleVxuICogICAgIE1hcC5yZWdpc3RlcignYWN0aW9uX2EnLCBkb19hKTtcbiAqICAgICBNYXAucmVnaXN0ZXIoJ2FjdGlvbl9iJywgZG9fYik7XG4gKiAgICAgbWFwLmFwcGVuZF9tYXAoe1xuICogICAgICAgICAnYWx0LXYnOiBbJ2FjdGlvbl9hJywgJ2FjdGlvbl9iJ10sXG4gKiAgICAgfSk7XG4gKiBcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbk1hcC5wcm90b3R5cGUuYXBwZW5kX21hcCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB2YXIgcGFyc2VkID0gdGhpcy5fcGFyc2VfbWFwX2FyZ3VtZW50cyhhcmd1bWVudHMpO1xuICAgIE9iamVjdC5rZXlzKHBhcnNlZCkuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgaWYgKHRoYXQuX21hcFtrZXldID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRoYXQuX21hcFtrZXldID0gcGFyc2VkW2tleV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGF0Ll9tYXBba2V5XSA9IHRoYXQuX21hcFtrZXldLmNvbmNhdChwYXJzZWRba2V5XSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbi8qKlxuICogQWxpYXMgZm9yIGBhcHBlbmRfbWFwYC5cbiAqIEB0eXBlIHtmdW5jdGlvbn1cbiAqL1xuTWFwLnByb3RvdHlwZS5tYXAgPSBNYXAucHJvdG90eXBlLmFwcGVuZF9tYXA7XG5cbi8qKlxuICogUHJlcGVuZCBldmVudCBhY3Rpb25zIHRvIHRoZSBtYXAuXG4gKlxuICogU2VlIHRoZSBkb2MgZm9yIGBhcHBlbmRfbWFwYCBmb3IgYSBkZXRhaWxlZCBkZXNjcmlwdGlvbiBvZlxuICogcG9zc2libGUgaW5wdXQgdmFsdWVzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTWFwLnByb3RvdHlwZS5wcmVwZW5kX21hcCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB2YXIgcGFyc2VkID0gdGhpcy5fcGFyc2VfbWFwX2FyZ3VtZW50cyhhcmd1bWVudHMpO1xuICAgIE9iamVjdC5rZXlzKHBhcnNlZCkuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgaWYgKHRoYXQuX21hcFtrZXldID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRoYXQuX21hcFtrZXldID0gcGFyc2VkW2tleV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGF0Ll9tYXBba2V5XSA9IHBhcnNlZFtrZXldLmNvbmNhdCh0aGF0Ll9tYXBba2V5XSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbi8qKlxuICogVW5tYXAgZXZlbnQgYWN0aW9ucyBpbiB0aGUgbWFwLlxuICpcbiAqIFNlZSB0aGUgZG9jIGZvciBgYXBwZW5kX21hcGAgZm9yIGEgZGV0YWlsZWQgZGVzY3JpcHRpb24gb2ZcbiAqIHBvc3NpYmxlIGlucHV0IHZhbHVlcy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbk1hcC5wcm90b3R5cGUudW5tYXAgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdmFyIHBhcnNlZCA9IHRoaXMuX3BhcnNlX21hcF9hcmd1bWVudHMoYXJndW1lbnRzKTtcbiAgICBPYmplY3Qua2V5cyhwYXJzZWQpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIGlmICh0aGF0Ll9tYXBba2V5XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBwYXJzZWRba2V5XS5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdmFyIGluZGV4ID0gdGhhdC5fbWFwW2tleV0uaW5kZXhPZih2YWx1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKGluZGV4ICE9IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQuX21hcFtrZXldLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbi8qKlxuICogR2V0IGEgbW9kaWZpYWJsZSBhcnJheSBvZiB0aGUgYWN0aW9ucyBmb3IgYSBwYXJ0aWN1bGFyIGV2ZW50LlxuICogQHBhcmFtICB7c3RyaW5nfSBldmVudFxuICogQHJldHVybiB7YXJyYXl9IGJ5IHJlZiBjb3B5IG9mIHRoZSBhY3Rpb25zIHJlZ2lzdGVyZWQgdG8gYW4gZXZlbnQuXG4gKi9cbk1hcC5wcm90b3R5cGUuZ2V0X21hcHBpbmcgPSBmdW5jdGlvbihldmVudCkge1xuICAgIHJldHVybiB0aGlzLl9tYXBbdGhpcy5fbm9ybWFsaXplX2V2ZW50X25hbWUoZXZlbnQpXTtcbn07XG5cbi8qKlxuICogUGFyc2UgdGhlIGFyZ3VtZW50cyB0byBhIG1hcCBmdW5jdGlvbi5cbiAqIEBwYXJhbSAge2FyZ3VtZW50cyBhcnJheX0gYXJnc1xuICogQHJldHVybiB7ZGljdGlvbmFyeX0gcGFyc2VkIHJlc3VsdHNcbiAqL1xuTWFwLnByb3RvdHlwZS5fcGFyc2VfbWFwX2FyZ3VtZW50cyA9IGZ1bmN0aW9uKGFyZ3MpIHtcbiAgICB2YXIgcGFyc2VkID0ge307XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuXG4gICAgLy8gT25lIGFydW1lbnQsIHRyZWF0IGl0IGFzIGEgZGljdGlvbmFyeSBvZiBldmVudCBuYW1lcyBhbmRcbiAgICAvLyBhY3Rpb25zLlxuICAgIGlmIChhcmdzLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgIE9iamVjdC5rZXlzKGFyZ3NbMF0pLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBhcmdzWzBdW2tleV07XG4gICAgICAgICAgICB2YXIgbm9ybWFsaXplZF9rZXkgPSB0aGF0Ll9ub3JtYWxpemVfZXZlbnRfbmFtZShrZXkpO1xuXG4gICAgICAgICAgICAvLyBJZiB0aGUgdmFsdWUgaXMgbm90IGFuIGFycmF5LCB3cmFwIGl0IGluIG9uZS5cbiAgICAgICAgICAgIGlmICghdXRpbHMuaXNfYXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBbdmFsdWVdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBJZiB0aGUga2V5IGlzIGFscmVhZHkgZGVmaW5lZCwgY29uY2F0IHRoZSB2YWx1ZXMgdG9cbiAgICAgICAgICAgIC8vIGl0LiAgT3RoZXJ3aXNlLCBzZXQgaXQuXG4gICAgICAgICAgICBpZiAocGFyc2VkW25vcm1hbGl6ZWRfa2V5XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgcGFyc2VkW25vcm1hbGl6ZWRfa2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwYXJzZWRbbm9ybWFsaXplZF9rZXldID0gcGFyc2VkW25vcm1hbGl6ZWRfa2V5XS5jb25jYXQodmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgIC8vIE1vcmUgdGhhbiBvbmUgYXJndW1lbnQuICBUcmVhdCBhcyB0aGUgZm9ybWF0OlxuICAgIC8vIGV2ZW50X25hbWUxLCBhY3Rpb24xLCBldmVudF9uYW1lMiwgYWN0aW9uMiwgLi4uLCBldmVudF9uYW1lTiwgYWN0aW9uTlxuICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAodmFyIGk9MDsgaTxNYXRoLmZsb29yKGFyZ3MubGVuZ3RoLzIpOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBrZXkgPSB0aGF0Ll9ub3JtYWxpemVfZXZlbnRfbmFtZShhcmdzWzIqaV0pO1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gYXJnc1syKmkgKyAxXTtcbiAgICAgICAgICAgIGlmIChwYXJzZWRba2V5XT09PXVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHBhcnNlZFtrZXldID0gW3ZhbHVlXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcGFyc2VkW2tleV0ucHVzaCh2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHBhcnNlZDtcbn07XG5cbi8qKlxuICogSGFuZGxlcyBhIG5vcm1hbGl6ZWQgZXZlbnQuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IG5hbWUgLSBuYW1lIG9mIHRoZSBldmVudFxuICogQHBhcmFtICB7RXZlbnR9IGUgLSBicm93c2VyIEV2ZW50IG9iamVjdFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTWFwLnByb3RvdHlwZS5faGFuZGxlX2V2ZW50ID0gZnVuY3Rpb24obmFtZSwgZSkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB2YXIgbm9ybWFsaXplZF9ldmVudCA9IHRoaXMuX25vcm1hbGl6ZV9ldmVudF9uYW1lKG5hbWUpO1xuICAgIHZhciBhY3Rpb25zID0gdGhpcy5fbWFwW25vcm1hbGl6ZWRfZXZlbnRdO1xuICAgIGlmIChhY3Rpb25zKSB7XG4gICAgICAgIGFjdGlvbnMuZm9yRWFjaChmdW5jdGlvbihhY3Rpb24pIHtcbiAgICAgICAgICAgIHZhciBhY3Rpb25fY2FsbGJhY2tzID0gTWFwLnJlZ2lzdHJ5W2FjdGlvbl07XG4gICAgICAgICAgICBpZiAoYWN0aW9uX2NhbGxiYWNrcykge1xuICAgICAgICAgICAgICAgIGlmICh1dGlscy5pc19hcnJheShhY3Rpb25fY2FsbGJhY2tzKSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmV0dXJucyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBhY3Rpb25fY2FsbGJhY2tzLmZvckVhY2goZnVuY3Rpb24oYWN0aW9uX2NhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm5zLmFwcGVuZChhY3Rpb25fY2FsbGJhY2suY2FsbCh1bmRlZmluZWQsIGUpPT09dHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIElmIG9uZSBvZiB0aGUgYWN0aW9uIGNhbGxiYWNrcyByZXR1cm5lZCB0cnVlLCBjYW5jZWwgYnViYmxpbmcuXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXR1cm5zLnNvbWUoZnVuY3Rpb24oeCkge3JldHVybiB4O30pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dGlscy5jYW5jZWxfYnViYmxlKGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYWN0aW9uX2NhbGxiYWNrcy5jYWxsKHVuZGVmaW5lZCwgZSk9PT10cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dGlscy5jYW5jZWxfYnViYmxlKGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKipcbiAqIEFscGhhYmV0aWNhbGx5IHNvcnRzIGtleXMgaW4gZXZlbnQgbmFtZSwgc29cbiAqIEBwYXJhbSAge3N0cmluZ30gbmFtZSAtIGV2ZW50IG5hbWVcbiAqIEByZXR1cm4ge3N0cmluZ30gbm9ybWFsaXplZCBldmVudCBuYW1lXG4gKi9cbk1hcC5wcm90b3R5cGUuX25vcm1hbGl6ZV9ldmVudF9uYW1lID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiBuYW1lLnRvTG93ZXJDYXNlKCkudHJpbSgpLnNwbGl0KCctJykuc29ydCgpLmpvaW4oJy0nKTtcbn07XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuTWFwID0gTWFwO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJyk7XG5cbi8qKlxuICogRXZlbnQgbm9ybWFsaXplclxuICpcbiAqIExpc3RlbnMgdG8gRE9NIGV2ZW50cyBhbmQgZW1pdHMgJ2NsZWFuZWQnIHZlcnNpb25zIG9mIHRob3NlIGV2ZW50cy5cbiAqL1xudmFyIE5vcm1hbGl6ZXIgPSBmdW5jdGlvbigpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX2VsX2hvb2tzID0ge307XG59O1xudXRpbHMuaW5oZXJpdChOb3JtYWxpemVyLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8qKlxuICogTGlzdGVuIHRvIHRoZSBldmVudHMgb2YgYW4gZWxlbWVudC5cbiAqIEBwYXJhbSAge0hUTUxFbGVtZW50fSBlbFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTm9ybWFsaXplci5wcm90b3R5cGUubGlzdGVuX3RvID0gZnVuY3Rpb24oZWwpIHtcbiAgICB2YXIgaG9va3MgPSBbXTtcbiAgICBob29rcy5wdXNoKHV0aWxzLmhvb2soZWwsICdvbmtleXByZXNzJywgdGhpcy5fcHJveHkoJ3ByZXNzJywgdGhpcy5faGFuZGxlX2tleXByZXNzX2V2ZW50LCBlbCkpKTtcbiAgICBob29rcy5wdXNoKHV0aWxzLmhvb2soZWwsICdvbmtleWRvd24nLCAgdGhpcy5fcHJveHkoJ2Rvd24nLCB0aGlzLl9oYW5kbGVfa2V5Ym9hcmRfZXZlbnQsIGVsKSkpO1xuICAgIGhvb2tzLnB1c2godXRpbHMuaG9vayhlbCwgJ29ua2V5dXAnLCAgdGhpcy5fcHJveHkoJ3VwJywgdGhpcy5faGFuZGxlX2tleWJvYXJkX2V2ZW50LCBlbCkpKTtcbiAgICBob29rcy5wdXNoKHV0aWxzLmhvb2soZWwsICdvbmRibGNsaWNrJywgIHRoaXMuX3Byb3h5KCdkYmxjbGljaycsIHRoaXMuX2hhbmRsZV9tb3VzZV9ldmVudCwgZWwpKSk7XG4gICAgaG9va3MucHVzaCh1dGlscy5ob29rKGVsLCAnb25jbGljaycsICB0aGlzLl9wcm94eSgnY2xpY2snLCB0aGlzLl9oYW5kbGVfbW91c2VfZXZlbnQsIGVsKSkpO1xuICAgIGhvb2tzLnB1c2godXRpbHMuaG9vayhlbCwgJ29ubW91c2Vkb3duJywgIHRoaXMuX3Byb3h5KCdkb3duJywgdGhpcy5faGFuZGxlX21vdXNlX2V2ZW50LCBlbCkpKTtcbiAgICBob29rcy5wdXNoKHV0aWxzLmhvb2soZWwsICdvbm1vdXNldXAnLCAgdGhpcy5fcHJveHkoJ3VwJywgdGhpcy5faGFuZGxlX21vdXNlX2V2ZW50LCBlbCkpKTtcbiAgICBob29rcy5wdXNoKHV0aWxzLmhvb2soZWwsICdvbm1vdXNlbW92ZScsICB0aGlzLl9wcm94eSgnbW92ZScsIHRoaXMuX2hhbmRsZV9tb3VzZW1vdmVfZXZlbnQsIGVsKSkpO1xuICAgIHRoaXMuX2VsX2hvb2tzW2VsXSA9IGhvb2tzO1xufTtcblxuLyoqXG4gKiBTdG9wcyBsaXN0ZW5pbmcgdG8gYW4gZWxlbWVudC5cbiAqIEBwYXJhbSAge0hUTUxFbGVtZW50fSBlbFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTm9ybWFsaXplci5wcm90b3R5cGUuc3RvcF9saXN0ZW5pbmdfdG8gPSBmdW5jdGlvbihlbCkge1xuICAgIGlmICh0aGlzLl9lbF9ob29rc1tlbF0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLl9lbF9ob29rc1tlbF0uZm9yRWFjaChmdW5jdGlvbihob29rKSB7XG4gICAgICAgICAgICBob29rLnVuaG9vaygpO1xuICAgICAgICB9KTtcbiAgICAgICAgZGVsZXRlIHRoaXMuX2VsX2hvb2tzW2VsXTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgd2hlbiBhIG1vdXNlIGV2ZW50IG9jY3Vyc1xuICogQHBhcmFtICB7SFRNTEVsZW1lbnR9IGVsXG4gKiBAcGFyYW0gIHtFdmVudH0gZVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTm9ybWFsaXplci5wcm90b3R5cGUuX2hhbmRsZV9tb3VzZV9ldmVudCA9IGZ1bmN0aW9uKGVsLCBldmVudF9uYW1lLCBlKSB7XG4gICAgZSA9IGUgfHwgd2luZG93LmV2ZW50O1xuICAgIHRoaXMudHJpZ2dlcih0aGlzLl9tb2RpZmllcl9zdHJpbmcoZSkgKyAnbW91c2UnICsgZS5idXR0b24gKyAnLScgKyBldmVudF9uYW1lLCBlKTtcbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIGEgbW91c2UgZXZlbnQgb2NjdXJzXG4gKiBAcGFyYW0gIHtIVE1MRWxlbWVudH0gZWxcbiAqIEBwYXJhbSAge0V2ZW50fSBlXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Ob3JtYWxpemVyLnByb3RvdHlwZS5faGFuZGxlX21vdXNlbW92ZV9ldmVudCA9IGZ1bmN0aW9uKGVsLCBldmVudF9uYW1lLCBlKSB7XG4gICAgZSA9IGUgfHwgd2luZG93LmV2ZW50O1xuICAgIHRoaXMudHJpZ2dlcih0aGlzLl9tb2RpZmllcl9zdHJpbmcoZSkgKyAnbW91c2UnICsgJy0nICsgZXZlbnRfbmFtZSwgZSk7XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgd2hlbiBhIGtleWJvYXJkIGV2ZW50IG9jY3Vyc1xuICogQHBhcmFtICB7SFRNTEVsZW1lbnR9IGVsXG4gKiBAcGFyYW0gIHtFdmVudH0gZVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTm9ybWFsaXplci5wcm90b3R5cGUuX2hhbmRsZV9rZXlib2FyZF9ldmVudCA9IGZ1bmN0aW9uKGVsLCBldmVudF9uYW1lLCBlKSB7XG4gICAgZSA9IGUgfHwgd2luZG93LmV2ZW50O1xuICAgIHZhciBrZXluYW1lID0gdGhpcy5fbG9va3VwX2tleWNvZGUoZS5rZXlDb2RlKTtcbiAgICBpZiAoa2V5bmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMudHJpZ2dlcih0aGlzLl9tb2RpZmllcl9zdHJpbmcoZSkgKyBrZXluYW1lICsgJy0nICsgZXZlbnRfbmFtZSwgZSk7XG5cbiAgICAgICAgaWYgKGV2ZW50X25hbWU9PSdkb3duJykgeyAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy50cmlnZ2VyKHRoaXMuX21vZGlmaWVyX3N0cmluZyhlKSArIGtleW5hbWUsIGUpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHRoaXMudHJpZ2dlcih0aGlzLl9tb2RpZmllcl9zdHJpbmcoZSkgKyBTdHJpbmcoZS5rZXlDb2RlKSArICctJyArIGV2ZW50X25hbWUsIGUpO1xuICAgIHRoaXMudHJpZ2dlcigna2V5JyArIGV2ZW50X25hbWUsIGUpO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gYSBrZXlwcmVzcyBldmVudCBvY2N1cnNcbiAqIEBwYXJhbSAge0hUTUxFbGVtZW50fSBlbFxuICogQHBhcmFtICB7RXZlbnR9IGVcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbk5vcm1hbGl6ZXIucHJvdG90eXBlLl9oYW5kbGVfa2V5cHJlc3NfZXZlbnQgPSBmdW5jdGlvbihlbCwgZXZlbnRfbmFtZSwgZSkge1xuICAgIHRoaXMudHJpZ2dlcigna2V5cHJlc3MnLCBlKTtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBlbGVtZW50IGV2ZW50IHByb3h5LlxuICogQHBhcmFtICB7ZnVuY3Rpb259IGZcbiAqIEBwYXJhbSAge3N0cmluZ30gZXZlbnRfbmFtZVxuICogQHBhcmFtICB7SFRNTEVsZW1lbnR9IGVsXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Ob3JtYWxpemVyLnByb3RvdHlwZS5fcHJveHkgPSBmdW5jdGlvbihldmVudF9uYW1lLCBmLCBlbCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBhcmdzID0gW2VsLCBldmVudF9uYW1lXS5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSk7XG4gICAgICAgIHJldHVybiBmLmFwcGx5KHRoYXQsIGFyZ3MpO1xuICAgIH07XG59O1xuXG4vKipcbiAqIENyZWF0ZSBhIG1vZGlmaWVycyBzdHJpbmcgZnJvbSBhbiBldmVudC5cbiAqIEBwYXJhbSAge0V2ZW50fSBlXG4gKiBAcmV0dXJuIHtzdHJpbmd9IGRhc2ggc2VwYXJhdGVkIG1vZGlmaWVyIHN0cmluZ1xuICovXG5Ob3JtYWxpemVyLnByb3RvdHlwZS5fbW9kaWZpZXJfc3RyaW5nID0gZnVuY3Rpb24oZSkge1xuICAgIHZhciBtb2RpZmllcnMgPSBbXTtcbiAgICBpZiAoZS5jdHJsS2V5KSBtb2RpZmllcnMucHVzaCgnY3RybCcpO1xuICAgIGlmIChlLmFsdEtleSkgbW9kaWZpZXJzLnB1c2goJ2FsdCcpO1xuICAgIGlmIChlLm1ldGFLZXkpIG1vZGlmaWVycy5wdXNoKCdtZXRhJyk7XG4gICAgaWYgKGUuc2hpZnRLZXkpIG1vZGlmaWVycy5wdXNoKCdzaGlmdCcpO1xuICAgIHZhciBzdHJpbmcgPSBtb2RpZmllcnMuc29ydCgpLmpvaW4oJy0nKTtcbiAgICBpZiAoc3RyaW5nLmxlbmd0aCA+IDApIHN0cmluZyA9IHN0cmluZyArICctJztcbiAgICByZXR1cm4gc3RyaW5nO1xufTtcblxuLyoqXG4gKiBMb29rdXAgdGhlIGh1bWFuIGZyaWVuZGx5IG5hbWUgZm9yIGEga2V5Y29kZS5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IGtleWNvZGVcbiAqIEByZXR1cm4ge3N0cmluZ30ga2V5IG5hbWVcbiAqL1xuTm9ybWFsaXplci5wcm90b3R5cGUuX2xvb2t1cF9rZXljb2RlID0gZnVuY3Rpb24oa2V5Y29kZSkge1xuICAgIGlmICgxMTIgPD0ga2V5Y29kZSAmJiBrZXljb2RlIDw9IDEyMykgeyAvLyBGMS1GMTJcbiAgICAgICAgcmV0dXJuICdmJyArIChrZXljb2RlLTExMSk7XG4gICAgfSBlbHNlIGlmICg0OCA8PSBrZXljb2RlICYmIGtleWNvZGUgPD0gNTcpIHsgLy8gMC05XG4gICAgICAgIHJldHVybiBTdHJpbmcoa2V5Y29kZS00OCk7XG4gICAgfSBlbHNlIGlmICg2NSA8PSBrZXljb2RlICYmIGtleWNvZGUgPD0gOTApIHsgLy8gQS1aXG4gICAgICAgIHJldHVybiAnYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXonLnN1YnN0cmluZyhTdHJpbmcoa2V5Y29kZS02NSksIFN0cmluZyhrZXljb2RlLTY0KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGNvZGVzID0ge1xuICAgICAgICAgICAgODogJ2JhY2tzcGFjZScsXG4gICAgICAgICAgICA5OiAndGFiJyxcbiAgICAgICAgICAgIDEzOiAnZW50ZXInLFxuICAgICAgICAgICAgMTY6ICdzaGlmdCcsXG4gICAgICAgICAgICAxNzogJ2N0cmwnLFxuICAgICAgICAgICAgMTg6ICdhbHQnLFxuICAgICAgICAgICAgMTk6ICdwYXVzZScsXG4gICAgICAgICAgICAyMDogJ2NhcHNsb2NrJyxcbiAgICAgICAgICAgIDI3OiAnZXNjJyxcbiAgICAgICAgICAgIDMyOiAnc3BhY2UnLFxuICAgICAgICAgICAgMzM6ICdwYWdldXAnLFxuICAgICAgICAgICAgMzQ6ICdwYWdlZG93bicsXG4gICAgICAgICAgICAzNTogJ2VuZCcsXG4gICAgICAgICAgICAzNjogJ2hvbWUnLFxuICAgICAgICAgICAgMzc6ICdsZWZ0YXJyb3cnLFxuICAgICAgICAgICAgMzg6ICd1cGFycm93JyxcbiAgICAgICAgICAgIDM5OiAncmlnaHRhcnJvdycsXG4gICAgICAgICAgICA0MDogJ2Rvd25hcnJvdycsXG4gICAgICAgICAgICA0NDogJ3ByaW50c2NyZWVuJyxcbiAgICAgICAgICAgIDQ1OiAnaW5zZXJ0JyxcbiAgICAgICAgICAgIDQ2OiAnZGVsZXRlJyxcbiAgICAgICAgICAgIDkxOiAnd2luZG93cycsXG4gICAgICAgICAgICA5MzogJ21lbnUnLFxuICAgICAgICAgICAgMTQ0OiAnbnVtbG9jaycsXG4gICAgICAgICAgICAxNDU6ICdzY3JvbGxsb2NrJyxcbiAgICAgICAgICAgIDE4ODogJ2NvbW1hJyxcbiAgICAgICAgICAgIDE5MDogJ3BlcmlvZCcsXG4gICAgICAgICAgICAxOTE6ICdmb3dhcmRzbGFzaCcsXG4gICAgICAgICAgICAxOTI6ICd0aWxkZScsXG4gICAgICAgICAgICAyMTk6ICdsZWZ0YnJhY2tldCcsXG4gICAgICAgICAgICAyMjA6ICdiYWNrc2xhc2gnLFxuICAgICAgICAgICAgMjIxOiAncmlnaHRicmFja2V0JyxcbiAgICAgICAgICAgIDIyMjogJ3F1b3RlJyxcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGNvZGVzW2tleWNvZGVdO1xuICAgIH0gXG4gICAgLy8gVE9ETzogdGhpcyBmdW5jdGlvbiBpcyBtaXNzaW5nIHNvbWUgYnJvd3NlciBzcGVjaWZpY1xuICAgIC8vIGtleWNvZGUgbWFwcGluZ3MuXG59O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLk5vcm1hbGl6ZXIgPSBOb3JtYWxpemVyO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMuanMnKTtcblxuLyoqXG4gKiBMaXN0ZW5zIHRvIGEgbW9kZWwgYW5kIGhpZ2xpZ2h0cyB0aGUgdGV4dCBhY2NvcmRpbmdseS5cbiAqIEBwYXJhbSB7RG9jdW1lbnRNb2RlbH0gbW9kZWxcbiAqL1xudmFyIEhpZ2hsaWdodGVyQmFzZSA9IGZ1bmN0aW9uKG1vZGVsLCByb3dfcmVuZGVyZXIpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX21vZGVsID0gbW9kZWw7XG4gICAgdGhpcy5fcm93X3JlbmRlcmVyID0gcm93X3JlbmRlcmVyO1xuICAgIHRoaXMuX3F1ZXVlZCA9IG51bGw7XG4gICAgdGhpcy5kZWxheSA9IDEwMDsgLy9tc1xuXG4gICAgLy8gQmluZCBldmVudHMuXG4gICAgdGhpcy5fcm93X3JlbmRlcmVyLm9uKCdyb3dzX2NoYW5nZWQnLCB1dGlscy5wcm94eSh0aGlzLl9oYW5kbGVfc2Nyb2xsLCB0aGlzKSk7XG4gICAgdGhpcy5fbW9kZWwub24oJ3RleHRfY2hhbmdlZCcsIHV0aWxzLnByb3h5KHRoaXMuX2hhbmRsZV90ZXh0X2NoYW5nZSwgdGhpcykpO1xuICAgIHRoaXMuX21vZGVsLm9uKCdyb3dfY2hhbmdlZCcsIHV0aWxzLnByb3h5KHRoaXMuX2hhbmRsZV90ZXh0X2NoYW5nZSwgdGhpcykpO1xufTtcbnV0aWxzLmluaGVyaXQoSGlnaGxpZ2h0ZXJCYXNlLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8qKlxuICogSGlnaGxpZ2h0IHRoZSBkb2N1bWVudFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuSGlnaGxpZ2h0ZXJCYXNlLnByb3RvdHlwZS5oaWdobGlnaHQgPSBmdW5jdGlvbihzdGFydF9yb3csIGVuZF9yb3cpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05vdCBpbXBsZW1lbnRlZCcpO1xufTtcblxuLyoqXG4gKiBRdWV1ZXMgYSBoaWdobGlnaHQgb3BlcmF0aW9uLlxuICpcbiAqIElmIGEgaGlnaGxpZ2h0IG9wZXJhdGlvbiBpcyBhbHJlYWR5IHF1ZXVlZCwgZG9uJ3QgcXVldWVcbiAqIGFub3RoZXIgb25lLiAgVGhpcyBlbnN1cmVzIHRoYXQgdGhlIGhpZ2hsaWdodGluZyBpc1xuICogZnJhbWUgcmF0ZSBsb2NrZWQuICBIaWdobGlnaHRpbmcgaXMgYW4gZXhwZW5zaXZlIG9wZXJhdGlvbi5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkhpZ2hsaWdodGVyQmFzZS5wcm90b3R5cGUuX3F1ZXVlX2hpZ2hsaWdodGVyID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX3F1ZXVlZCA9PT0gbnVsbCkge1xuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIHRoaXMuX3F1ZXVlZCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGF0Ll9tb2RlbC5hY3F1aXJlX3RhZ19ldmVudF9sb2NrKCk7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHZhciB2aXNpYmxlX3Jvd3MgPSB0aGF0Ll9yb3dfcmVuZGVyZXIuZ2V0X3Zpc2libGVfcm93cygpO1xuICAgICAgICAgICAgICAgIHZhciB0b3Bfcm93ID0gdmlzaWJsZV9yb3dzLnRvcF9yb3c7XG4gICAgICAgICAgICAgICAgdmFyIGJvdHRvbV9yb3cgPSB2aXNpYmxlX3Jvd3MuYm90dG9tX3JvdztcbiAgICAgICAgICAgICAgICB0aGF0LmhpZ2hsaWdodCh0b3Bfcm93LCBib3R0b21fcm93KTtcbiAgICAgICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICAgICAgdGhhdC5fbW9kZWwucmVsZWFzZV90YWdfZXZlbnRfbG9jaygpO1xuICAgICAgICAgICAgICAgIHRoYXQuX3F1ZXVlZCA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRoaXMuZGVsYXkpO1xuICAgIH1cbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIHRoZSB2aXNpYmxlIHJvdyBpbmRpY2llcyBhcmUgY2hhbmdlZC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkhpZ2hsaWdodGVyQmFzZS5wcm90b3R5cGUuX2hhbmRsZV9zY3JvbGwgPSBmdW5jdGlvbihzdGFydF9yb3csIGVuZF9yb3cpIHtcbiAgICB0aGlzLl9xdWV1ZV9oaWdobGlnaHRlcigpO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gdGhlIHRleHQgY2hhbmdlcy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkhpZ2hsaWdodGVyQmFzZS5wcm90b3R5cGUuX2hhbmRsZV90ZXh0X2NoYW5nZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3F1ZXVlX2hpZ2hsaWdodGVyKCk7XG59O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLkhpZ2hsaWdodGVyQmFzZSA9IEhpZ2hsaWdodGVyQmFzZTtcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpO1xudmFyIGhpZ2hsaWdodGVyID0gcmVxdWlyZSgnLi9oaWdobGlnaHRlci5qcycpO1xudmFyIHByaXNtID0gcmVxdWlyZSgnLi4vLi4vY29tcG9uZW50cy9wcmlzbS5qcycpO1xuXG4vKipcbiAqIExpc3RlbnMgdG8gYSBtb2RlbCBhbmQgaGlnaGxpZ2h0cyB0aGUgdGV4dCBhY2NvcmRpbmdseS5cbiAqIEBwYXJhbSB7RG9jdW1lbnRNb2RlbH0gbW9kZWxcbiAqL1xudmFyIFByaXNtSGlnaGxpZ2h0ZXIgPSBmdW5jdGlvbihtb2RlbCwgcm93X3JlbmRlcmVyKSB7XG4gICAgaGlnaGxpZ2h0ZXIuSGlnaGxpZ2h0ZXJCYXNlLmNhbGwodGhpcywgbW9kZWwsIHJvd19yZW5kZXJlcik7XG5cbiAgICAvLyBMb29rIGJhY2sgYW5kIGZvcndhcmQgdGhpcyBtYW55IHJvd3MgZm9yIGNvbnRleHR1YWxseSBcbiAgICAvLyBzZW5zaXRpdmUgaGlnaGxpZ2h0aW5nLlxuICAgIHRoaXMuX3Jvd19wYWRkaW5nID0gMTU7XG4gICAgdGhpcy5fbGFuZ3VhZ2UgPSBudWxsO1xuXG4gICAgLy8gUHJvcGVydGllc1xuICAgIHRoaXMucHJvcGVydHkoJ2xhbmd1YWdlcycsIGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgbGFuZ3VhZ2VzID0gW107XG4gICAgICAgIGZvciAodmFyIGwgaW4gcHJpc20ubGFuZ3VhZ2VzKSB7XG4gICAgICAgICAgICBpZiAocHJpc20ubGFuZ3VhZ2VzLmhhc093blByb3BlcnR5KGwpKSB7XG4gICAgICAgICAgICAgICAgaWYgKFtcImV4dGVuZFwiLCBcImluc2VydEJlZm9yZVwiLCBcIkRGU1wiXS5pbmRleE9mKGwpID09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIGxhbmd1YWdlcy5wdXNoKGwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbGFuZ3VhZ2VzO1xuICAgIH0pO1xufTtcbnV0aWxzLmluaGVyaXQoUHJpc21IaWdobGlnaHRlciwgaGlnaGxpZ2h0ZXIuSGlnaGxpZ2h0ZXJCYXNlKTtcblxuLyoqXG4gKiBIaWdobGlnaHQgdGhlIGRvY3VtZW50XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5QcmlzbUhpZ2hsaWdodGVyLnByb3RvdHlwZS5oaWdobGlnaHQgPSBmdW5jdGlvbihzdGFydF9yb3csIGVuZF9yb3cpIHtcbiAgICAvLyBHZXQgdGhlIGZpcnN0IGFuZCBsYXN0IHJvd3MgdGhhdCBzaG91bGQgYmUgaGlnaGxpZ2h0ZWQuXG4gICAgc3RhcnRfcm93ID0gTWF0aC5tYXgoMCwgc3RhcnRfcm93IC0gdGhpcy5fcm93X3BhZGRpbmcpO1xuICAgIGVuZF9yb3cgPSBNYXRoLm1pbih0aGlzLl9tb2RlbC5fcm93cy5sZW5ndGggLSAxLCBlbmRfcm93ICsgdGhpcy5fcm93X3BhZGRpbmcpO1xuXG4gICAgLy8gQ2xlYXIgdGhlIG9sZCBoaWdobGlnaHRpbmcuXG4gICAgdGhpcy5fbW9kZWwuY2xlYXJfdGFncyhzdGFydF9yb3csIGVuZF9yb3cpO1xuXG4gICAgLy8gQWJvcnQgaWYgbGFuZ3VhZ2UgaXNuJ3Qgc3BlY2lmaWVkLlxuICAgIGlmICghdGhpcy5fbGFuZ3VhZ2UpIHJldHVybjtcbiAgICBcbiAgICAvLyBHZXQgdGhlIHRleHQgb2YgdGhlIHJvd3MuXG4gICAgdmFyIHRleHQgPSB0aGlzLl9tb2RlbC5nZXRfdGV4dChzdGFydF9yb3csIDAsIGVuZF9yb3csIHRoaXMuX21vZGVsLl9yb3dzW2VuZF9yb3ddLmxlbmd0aCk7XG5cbiAgICAvLyBGaWd1cmUgb3V0IHdoZXJlIGVhY2ggdGFnIGJlbG9uZ3MuXG4gICAgdmFyIGhpZ2hsaWdodHMgPSB0aGlzLl9oaWdobGlnaHQodGV4dCk7IC8vIFtzdGFydF9pbmRleCwgZW5kX2luZGV4LCB0YWddXG4gICAgXG4gICAgLy8gQXBwbHkgdGFnc1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICBoaWdobGlnaHRzLmZvckVhY2goZnVuY3Rpb24oaGlnaGxpZ2h0KSB7XG5cbiAgICAgICAgLy8gVHJhbnNsYXRlIHRhZyBjaGFyYWN0ZXIgaW5kaWNpZXMgdG8gcm93LCBjaGFyIGNvb3JkaW5hdGVzLlxuICAgICAgICB2YXIgYmVmb3JlX3Jvd3MgPSB0ZXh0LnN1YnN0cmluZygwLCBoaWdobGlnaHRbMF0pLnNwbGl0KCdcXG4nKTtcbiAgICAgICAgdmFyIGdyb3VwX3N0YXJ0X3JvdyA9IHN0YXJ0X3JvdyArIGJlZm9yZV9yb3dzLmxlbmd0aCAtIDE7XG4gICAgICAgIHZhciBncm91cF9zdGFydF9jaGFyID0gYmVmb3JlX3Jvd3NbYmVmb3JlX3Jvd3MubGVuZ3RoIC0gMV0ubGVuZ3RoO1xuICAgICAgICB2YXIgYWZ0ZXJfcm93cyA9IHRleHQuc3Vic3RyaW5nKDAsIGhpZ2hsaWdodFsxXSAtIDEpLnNwbGl0KCdcXG4nKTtcbiAgICAgICAgdmFyIGdyb3VwX2VuZF9yb3cgPSBzdGFydF9yb3cgKyBhZnRlcl9yb3dzLmxlbmd0aCAtIDE7XG4gICAgICAgIHZhciBncm91cF9lbmRfY2hhciA9IGFmdGVyX3Jvd3NbYWZ0ZXJfcm93cy5sZW5ndGggLSAxXS5sZW5ndGg7XG5cbiAgICAgICAgLy8gQXBwbHkgdGFnLlxuICAgICAgICB2YXIgdGFnID0gaGlnaGxpZ2h0WzJdLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIHRoYXQuX21vZGVsLnNldF90YWcoZ3JvdXBfc3RhcnRfcm93LCBncm91cF9zdGFydF9jaGFyLCBncm91cF9lbmRfcm93LCBncm91cF9lbmRfY2hhciwgJ3N5bnRheCcsIHRhZyk7XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIEZpbmQgZWFjaCBwYXJ0IG9mIHRleHQgdGhhdCBuZWVkcyB0byBiZSBoaWdobGlnaHRlZC5cbiAqIEBwYXJhbSAge3N0cmluZ30gdGV4dFxuICogQHJldHVybiB7YXJyYXl9IGxpc3QgY29udGFpbmluZyBpdGVtcyBvZiB0aGUgZm9ybSBbc3RhcnRfaW5kZXgsIGVuZF9pbmRleCwgdGFnXVxuICovXG5QcmlzbUhpZ2hsaWdodGVyLnByb3RvdHlwZS5faGlnaGxpZ2h0ID0gZnVuY3Rpb24odGV4dCkge1xuXG4gICAgLy8gVG9rZW5pemUgdXNpbmcgcHJpc20uanNcbiAgICB2YXIgdG9rZW5zID0gcHJpc20udG9rZW5pemUodGV4dCwgdGhpcy5fbGFuZ3VhZ2UpO1xuXG4gICAgLy8gQ29udmVydCB0aGUgdG9rZW5zIGludG8gW3N0YXJ0X2luZGV4LCBlbmRfaW5kZXgsIHRhZ11cbiAgICB2YXIgbGVmdCA9IDA7XG4gICAgdmFyIGZsYXR0ZW4gPSBmdW5jdGlvbih0b2tlbnMsIHByZWZpeCkge1xuICAgICAgICBpZiAoIXByZWZpeCkgeyBwcmVmaXggPSBbXTsgfVxuICAgICAgICB2YXIgZmxhdCA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRva2Vucy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIHRva2VuID0gdG9rZW5zW2ldO1xuICAgICAgICAgICAgaWYgKHRva2VuLmNvbnRlbnQpIHtcbiAgICAgICAgICAgICAgICBmbGF0ID0gZmxhdC5jb25jYXQoZmxhdHRlbihbXS5jb25jYXQodG9rZW4uY29udGVudCksIHByZWZpeC5jb25jYXQodG9rZW4udHlwZSkpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKHByZWZpeC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGZsYXQucHVzaChbbGVmdCwgbGVmdCArIHRva2VuLmxlbmd0aCwgcHJlZml4LmpvaW4oJyAnKV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBsZWZ0ICs9IHRva2VuLmxlbmd0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmxhdDtcbiAgICB9O1xuICAgIHZhciB0YWdzID0gZmxhdHRlbih0b2tlbnMpO1xuICAgIHJldHVybiB0YWdzO1xufTtcblxuLyoqXG4gKiBMb2FkcyBhIHN5bnRheCBieSBsYW5ndWFnZSBuYW1lLlxuICogQHBhcmFtICB7c3RyaW5nIG9yIGRpY3Rpb25hcnl9IGxhbmd1YWdlXG4gKiBAcmV0dXJuIHtib29sZWFufSBzdWNjZXNzXG4gKi9cblByaXNtSGlnaGxpZ2h0ZXIucHJvdG90eXBlLmxvYWQgPSBmdW5jdGlvbihsYW5ndWFnZSkge1xuICAgIHRyeSB7XG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSBsYW5ndWFnZSBleGlzdHMuXG4gICAgICAgIGlmIChwcmlzbS5sYW5ndWFnZXNbbGFuZ3VhZ2VdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTGFuZ3VhZ2UgZG9lcyBub3QgZXhpc3QhJyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fbGFuZ3VhZ2UgPSBwcmlzbS5sYW5ndWFnZXNbbGFuZ3VhZ2VdO1xuICAgICAgICB0aGlzLl9xdWV1ZV9oaWdobGlnaHRlcigpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGxvYWRpbmcgbGFuZ3VhZ2UnLCBlKTtcbiAgICAgICAgdGhpcy5fbGFuZ3VhZ2UgPSBudWxsO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5QcmlzbUhpZ2hsaWdodGVyID0gUHJpc21IaWdobGlnaHRlcjtcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJyk7XG52YXIgcmVuZGVyZXIgPSByZXF1aXJlKCcuL3JlbmRlcmVyLmpzJyk7XG5cbi8qKlxuICogR3JvdXBzIG11bHRpcGxlIHJlbmRlcmVyc1xuICogQHBhcmFtIHthcnJheX0gcmVuZGVyZXJzIC0gYXJyYXkgb2YgcmVuZGVyZXJzXG4gKiBAcGFyYW0ge0NhbnZhc30gY2FudmFzXG4gKi9cbnZhciBCYXRjaFJlbmRlcmVyID0gZnVuY3Rpb24ocmVuZGVyZXJzLCBjYW52YXMpIHtcbiAgICByZW5kZXJlci5SZW5kZXJlckJhc2UuY2FsbCh0aGlzLCBjYW52YXMpO1xuICAgIHRoaXMuX3JlbmRlcmVycyA9IHJlbmRlcmVycztcblxuICAgIC8vIExpc3RlbiB0byB0aGUgbGF5ZXJzLCBpZiBvbmUgbGF5ZXIgY2hhbmdlcywgcmVjb21wb3NlXG4gICAgLy8gdGhlIGZ1bGwgaW1hZ2UgYnkgY29weWluZyB0aGVtIGFsbCBhZ2Fpbi5cbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhpcy5fcmVuZGVyZXJzLmZvckVhY2goZnVuY3Rpb24ocmVuZGVyZXIpIHtcbiAgICAgICAgcmVuZGVyZXIub24oJ2NoYW5nZWQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHRoYXQuX2NvcHlfcmVuZGVyZXJzKCk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIFxuICAgIC8vIENyZWF0ZSBwcm9wZXJ0aWVzLlxuICAgIHRoaXMucHJvcGVydHkoJ3dpZHRoJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMud2lkdGg7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC5fY2FudmFzLndpZHRoID0gdmFsdWU7XG4gICAgICAgIHRoYXQuX3JlbmRlcmVycy5mb3JFYWNoKGZ1bmN0aW9uKHJlbmRlcmVyKSB7XG4gICAgICAgICAgICByZW5kZXJlci53aWR0aCA9IHZhbHVlO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICB0aGlzLnByb3BlcnR5KCdoZWlnaHQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQuX2NhbnZhcy5oZWlnaHQ7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC5fY2FudmFzLmhlaWdodCA9IHZhbHVlO1xuICAgICAgICB0aGF0Ll9yZW5kZXJlcnMuZm9yRWFjaChmdW5jdGlvbihyZW5kZXJlcikge1xuICAgICAgICAgICAgcmVuZGVyZXIuaGVpZ2h0ID0gdmFsdWU7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufTtcbnV0aWxzLmluaGVyaXQoQmF0Y2hSZW5kZXJlciwgcmVuZGVyZXIuUmVuZGVyZXJCYXNlKTtcblxuLyoqXG4gKiBSZW5kZXIgdG8gdGhlIGNhbnZhc1xuICogQHBhcmFtIHtkaWN0aW9uYXJ5fSAob3B0aW9uYWwpIHNjcm9sbCAtIEhvdyBtdWNoIHRoZSBjYW52YXMgd2FzIHNjcm9sbGVkLiAgVGhpc1xuICogICAgICAgICAgICAgICAgICAgICBpcyBhIGRpY3Rpb25hcnkgb2YgdGhlIGZvcm0ge3g6IGZsb2F0LCB5OiBmbG9hdH1cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkJhdGNoUmVuZGVyZXIucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKHNjcm9sbCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLl9yZW5kZXJlcnMuZm9yRWFjaChmdW5jdGlvbihyZW5kZXJlcikge1xuXG4gICAgICAgIC8vIEFwcGx5IHRoZSByZW5kZXJpbmcgY29vcmRpbmF0ZSB0cmFuc2Zvcm1zIG9mIHRoZSBwYXJlbnQuXG4gICAgICAgIGlmICghcmVuZGVyZXIub3B0aW9ucy5wYXJlbnRfaW5kZXBlbmRlbnQpIHtcbiAgICAgICAgICAgIHJlbmRlcmVyLl9jYW52YXMuX3R4ID0gdXRpbHMucHJveHkodGhhdC5fY2FudmFzLl90eCwgdGhhdC5fY2FudmFzKTtcbiAgICAgICAgICAgIHJlbmRlcmVyLl9jYW52YXMuX3R5ID0gdXRpbHMucHJveHkodGhhdC5fY2FudmFzLl90eSwgdGhhdC5fY2FudmFzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRlbGwgdGhlIHJlbmRlcmVyIHRvIHJlbmRlciBpdHNlbGYuXG4gICAgICAgIHJlbmRlcmVyLnJlbmRlcihzY3JvbGwpO1xuICAgIH0pO1xuXG4gICAgLy8gQ29weSB0aGUgcmVzdWx0cyB0byBzZWxmLlxuICAgIHRoaXMuX2NvcHlfcmVuZGVyZXJzKCk7XG59O1xuXG4vKipcbiAqIENvcGllcyBhbGwgdGhlIHJlbmRlcmVyIGxheWVycyB0byB0aGUgY2FudmFzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQmF0Y2hSZW5kZXJlci5wcm90b3R5cGUuX2NvcHlfcmVuZGVyZXJzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMuX2NhbnZhcy5jbGVhcigpO1xuICAgIHRoaXMuX3JlbmRlcmVycy5mb3JFYWNoKGZ1bmN0aW9uKHJlbmRlcmVyKSB7XG4gICAgICAgIHRoYXQuX2NvcHlfcmVuZGVyZXIocmVuZGVyZXIpO1xuICAgIH0pO1xufTtcblxuLyoqXG4gKiBDb3B5IGEgcmVuZGVyZXIgdG8gdGhlIGNhbnZhcy5cbiAqIEBwYXJhbSAge1JlbmRlcmVyQmFzZX0gcmVuZGVyZXJcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkJhdGNoUmVuZGVyZXIucHJvdG90eXBlLl9jb3B5X3JlbmRlcmVyID0gZnVuY3Rpb24ocmVuZGVyZXIpIHtcbiAgICB0aGlzLl9jYW52YXMuZHJhd19pbWFnZShcbiAgICAgICAgcmVuZGVyZXIuX2NhbnZhcywgXG4gICAgICAgIC10aGlzLl9jYW52YXMuX3R4KDApLCBcbiAgICAgICAgLXRoaXMuX2NhbnZhcy5fdHkoMCksIFxuICAgICAgICB0aGlzLl9jYW52YXMud2lkdGgsIFxuICAgICAgICB0aGlzLl9jYW52YXMuaGVpZ2h0KTtcbn07XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuQmF0Y2hSZW5kZXJlciA9IEJhdGNoUmVuZGVyZXI7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpO1xudmFyIHJlbmRlcmVyID0gcmVxdWlyZSgnLi9yZW5kZXJlci5qcycpO1xuXG4vKipcbiAqIFJlbmRlcnMgdG8gYSBjYW52YXNcbiAqIEBwYXJhbSB7Q2FudmFzfSBkZWZhdWx0X2NhbnZhc1xuICovXG52YXIgQ29sb3JSZW5kZXJlciA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIENyZWF0ZSB3aXRoIHRoZSBvcHRpb24gJ3BhcmVudF9pbmRlcGVuZGVudCcgdG8gZGlzYWJsZVxuICAgIC8vIHBhcmVudCBjb29yZGluYXRlIHRyYW5zbGF0aW9ucyBmcm9tIGJlaW5nIGFwcGxpZWQgYnkgXG4gICAgLy8gYSBiYXRjaCByZW5kZXJlci5cbiAgICByZW5kZXJlci5SZW5kZXJlckJhc2UuY2FsbCh0aGlzLCB1bmRlZmluZWQsIHtwYXJlbnRfaW5kZXBlbmRlbnQ6IHRydWV9KTtcbiAgICB0aGlzLl9yZW5kZXJlZCA9IGZhbHNlO1xuICAgIFxuICAgIC8vIENyZWF0ZSBwcm9wZXJ0aWVzLlxuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLnByb3BlcnR5KCd3aWR0aCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fY2FudmFzLndpZHRoO1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy53aWR0aCA9IHZhbHVlO1xuICAgICAgICB0aGF0Ll9yZW5kZXIoKTtcblxuICAgICAgICAvLyBUZWxsIHBhcmVudCBsYXllciB0aGlzIG9uZSBoYXMgY2hhbmdlZC5cbiAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2VkJyk7XG4gICAgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgnaGVpZ2h0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMuaGVpZ2h0O1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy5oZWlnaHQgPSB2YWx1ZTtcbiAgICAgICAgdGhhdC5fcmVuZGVyKCk7XG5cbiAgICAgICAgLy8gVGVsbCBwYXJlbnQgbGF5ZXIgdGhpcyBvbmUgaGFzIGNoYW5nZWQuXG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgIH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ2NvbG9yJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9jb2xvcjtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Ll9jb2xvciA9IHZhbHVlO1xuICAgICAgICB0aGF0Ll9yZW5kZXIoKTtcblxuICAgICAgICAvLyBUZWxsIHBhcmVudCBsYXllciB0aGlzIG9uZSBoYXMgY2hhbmdlZC5cbiAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2VkJyk7XG4gICAgfSk7XG59O1xudXRpbHMuaW5oZXJpdChDb2xvclJlbmRlcmVyLCByZW5kZXJlci5SZW5kZXJlckJhc2UpO1xuXG4vKipcbiAqIFJlbmRlciB0byB0aGUgY2FudmFzXG4gKiBAcGFyYW0ge2RpY3Rpb25hcnl9IChvcHRpb25hbCkgc2Nyb2xsIC0gSG93IG11Y2ggdGhlIGNhbnZhcyB3YXMgc2Nyb2xsZWQuICBUaGlzXG4gKiAgICAgICAgICAgICAgICAgICAgIGlzIGEgZGljdGlvbmFyeSBvZiB0aGUgZm9ybSB7eDogZmxvYXQsIHk6IGZsb2F0fVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ29sb3JSZW5kZXJlci5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oc2Nyb2xsKSB7XG4gICAgaWYgKCF0aGlzLl9yZW5kZXJlZCkge1xuICAgICAgICB0aGlzLl9yZW5kZXIoKTtcbiAgICAgICAgdGhpcy5fcmVuZGVyZWQgPSB0cnVlO1xuICAgIH1cbn07XG5cbi8qKlxuICogUmVuZGVyIGEgZnJhbWUuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Db2xvclJlbmRlcmVyLnByb3RvdHlwZS5fcmVuZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fY2FudmFzLmNsZWFyKCk7XG4gICAgdGhpcy5fY2FudmFzLmRyYXdfcmVjdGFuZ2xlKDAsIDAsIHRoaXMuX2NhbnZhcy53aWR0aCwgdGhpcy5fY2FudmFzLmhlaWdodCwge2ZpbGxfY29sb3I6IHRoaXMuX2NvbG9yfSk7XG59O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLkNvbG9yUmVuZGVyZXIgPSBDb2xvclJlbmRlcmVyO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIGFuaW1hdG9yID0gcmVxdWlyZSgnLi4vYW5pbWF0b3IuanMnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJyk7XG52YXIgcmVuZGVyZXIgPSByZXF1aXJlKCcuL3JlbmRlcmVyLmpzJyk7XG5cbi8qKlxuICogUmVuZGVyIGRvY3VtZW50IGN1cnNvcnNcbiAqXG4gKiBUT0RPOiBPbmx5IHJlbmRlciB2aXNpYmxlLlxuICovXG52YXIgQ3Vyc29yc1JlbmRlcmVyID0gZnVuY3Rpb24oY3Vyc29ycywgc3R5bGUsIHJvd19yZW5kZXJlciwgaGFzX2ZvY3VzKSB7XG4gICAgcmVuZGVyZXIuUmVuZGVyZXJCYXNlLmNhbGwodGhpcyk7XG4gICAgdGhpcy5zdHlsZSA9IHN0eWxlO1xuICAgIHRoaXMuX2hhc19mb2N1cyA9IGhhc19mb2N1cztcbiAgICB0aGlzLl9jdXJzb3JzID0gY3Vyc29ycztcblxuICAgIHRoaXMuX3Jvd19yZW5kZXJlciA9IHJvd19yZW5kZXJlcjtcbiAgICAvLyBUT0RPOiBSZW1vdmUgdGhlIGZvbGxvd2luZyBibG9jay5cbiAgICB0aGlzLl9nZXRfdmlzaWJsZV9yb3dzID0gdXRpbHMucHJveHkocm93X3JlbmRlcmVyLmdldF92aXNpYmxlX3Jvd3MsIHJvd19yZW5kZXJlcik7XG4gICAgdGhpcy5fZ2V0X3Jvd19oZWlnaHQgPSB1dGlscy5wcm94eShyb3dfcmVuZGVyZXIuZ2V0X3Jvd19oZWlnaHQsIHJvd19yZW5kZXJlcik7XG4gICAgdGhpcy5fZ2V0X3Jvd190b3AgPSB1dGlscy5wcm94eShyb3dfcmVuZGVyZXIuZ2V0X3Jvd190b3AsIHJvd19yZW5kZXJlcik7XG4gICAgdGhpcy5fbWVhc3VyZV9wYXJ0aWFsX3JvdyA9IHV0aWxzLnByb3h5KHJvd19yZW5kZXJlci5tZWFzdXJlX3BhcnRpYWxfcm93X3dpZHRoLCByb3dfcmVuZGVyZXIpO1xuICAgIFxuICAgIHRoaXMuX2JsaW5rX2FuaW1hdG9yID0gbmV3IGFuaW1hdG9yLkFuaW1hdG9yKDEwMDApO1xuICAgIHRoaXMuX2ZwcyA9IDMwO1xuXG4gICAgLy8gU3RhcnQgdGhlIGN1cnNvciByZW5kZXJpbmcgY2xvY2suXG4gICAgdGhpcy5fcmVuZGVyX2Nsb2NrKCk7XG4gICAgdGhpcy5fbGFzdF9yZW5kZXJlZCA9IG51bGw7XG59O1xudXRpbHMuaW5oZXJpdChDdXJzb3JzUmVuZGVyZXIsIHJlbmRlcmVyLlJlbmRlcmVyQmFzZSk7XG5cbi8qKlxuICogUmVuZGVyIHRvIHRoZSBjYW52YXNcbiAqIE5vdGU6IFRoaXMgbWV0aG9kIGlzIGNhbGxlZCBvZnRlbiwgc28gaXQncyBpbXBvcnRhbnQgdGhhdCBpdCdzXG4gKiBvcHRpbWl6ZWQgZm9yIHNwZWVkLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yc1JlbmRlcmVyLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBGcmFtZSBsaW1pdCB0aGUgcmVuZGVyaW5nLlxuICAgIGlmIChEYXRlLm5vdygpIC0gdGhpcy5fbGFzdF9yZW5kZXJlZCA8IDEwMDAvdGhpcy5fZnBzKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5fY2FudmFzLmNsZWFyKCk7XG5cbiAgICAvLyBPbmx5IHJlbmRlciBpZiB0aGUgY2FudmFzIGhhcyBmb2N1cy5cbiAgICBpZiAodGhpcy5faGFzX2ZvY3VzKCkpIHtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB0aGlzLl9jdXJzb3JzLmN1cnNvcnMuZm9yRWFjaChmdW5jdGlvbihjdXJzb3IpIHtcbiAgICAgICAgICAgIC8vIEdldCB0aGUgdmlzaWJsZSByb3dzLlxuICAgICAgICAgICAgdmFyIHZpc2libGVfcm93cyA9IHRoYXQuX2dldF92aXNpYmxlX3Jvd3MoKTtcblxuICAgICAgICAgICAgLy8gSWYgYSBjdXJzb3IgZG9lc24ndCBoYXZlIGEgcG9zaXRpb24sIHJlbmRlciBpdCBhdCB0aGVcbiAgICAgICAgICAgIC8vIGJlZ2lubmluZyBvZiB0aGUgZG9jdW1lbnQuXG4gICAgICAgICAgICB2YXIgcm93X2luZGV4ID0gY3Vyc29yLnByaW1hcnlfcm93IHx8IDA7XG4gICAgICAgICAgICB2YXIgY2hhcl9pbmRleCA9IGN1cnNvci5wcmltYXJ5X2NoYXIgfHwgMDtcblxuICAgICAgICAgICAgLy8gQ2FsY3VsYXRlIG9wYWNpdHkgb2YgdGhlIGN1cnNvci4gIEJsaW5raW5nIGN1cnNvci5cbiAgICAgICAgICAgIHZhciBzaW4gPSBNYXRoLnNpbigyKk1hdGguUEkqdGhhdC5fYmxpbmtfYW5pbWF0b3IudGltZSgpKTtcbiAgICAgICAgICAgIHZhciBhbHBoYSA9IE1hdGgubWluKE1hdGgubWF4KHNpbiswLjUsIDApLCAxKTsgLy8gT2Zmc2V0LCB0cnVuY2F0ZWQgc2luZSB3YXZlLlxuXG4gICAgICAgICAgICAvLyBEcmF3IHRoZSBjdXJzb3IuXG4gICAgICAgICAgICBpZiAoYWxwaGEgPiAwKSB7XG4gICAgICAgICAgICAgICAgdmFyIGhlaWdodCA9IHRoYXQuX2dldF9yb3dfaGVpZ2h0KHJvd19pbmRleCk7XG4gICAgICAgICAgICAgICAgdmFyIG11bHRpcGxpZXIgPSB0aGF0LnN0eWxlLmN1cnNvcl9oZWlnaHQgfHwgMS4wO1xuICAgICAgICAgICAgICAgIHZhciBvZmZzZXQgPSAoaGVpZ2h0IC0gKG11bHRpcGxpZXIqaGVpZ2h0KSkgLyAyO1xuICAgICAgICAgICAgICAgIGhlaWdodCAqPSBtdWx0aXBsaWVyO1xuICAgICAgICAgICAgICAgIGlmICh2aXNpYmxlX3Jvd3MudG9wX3JvdyA8PSByb3dfaW5kZXggJiYgcm93X2luZGV4IDw9IHZpc2libGVfcm93cy5ib3R0b21fcm93KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQuX2NhbnZhcy5kcmF3X3JlY3RhbmdsZShcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoYXJfaW5kZXggPT09IDAgPyB0aGF0Ll9yb3dfcmVuZGVyZXIubWFyZ2luX2xlZnQgOiB0aGF0Ll9tZWFzdXJlX3BhcnRpYWxfcm93KHJvd19pbmRleCwgY2hhcl9pbmRleCkgKyB0aGF0Ll9yb3dfcmVuZGVyZXIubWFyZ2luX2xlZnQsIFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5fZ2V0X3Jvd190b3Aocm93X2luZGV4KSArIG9mZnNldCwgXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnN0eWxlLmN1cnNvcl93aWR0aD09PXVuZGVmaW5lZCA/IDEuMCA6IHRoYXQuc3R5bGUuY3Vyc29yX3dpZHRoLCBcbiAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodCwgXG4gICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsbF9jb2xvcjogdGhhdC5zdHlsZS5jdXJzb3IgfHwgJ2JhY2snLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFscGhhOiBhbHBoYSxcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9ICAgIFxuICAgICAgICAgICAgfSAgIFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgdGhpcy5fbGFzdF9yZW5kZXJlZCA9IERhdGUubm93KCk7XG59O1xuXG4vKipcbiAqIENsb2NrIGZvciByZW5kZXJpbmcgdGhlIGN1cnNvci5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvcnNSZW5kZXJlci5wcm90b3R5cGUuX3JlbmRlcl9jbG9jayA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIElmIHRoZSBjYW52YXMgaXMgZm9jdXNlZCwgcmVkcmF3LlxuICAgIGlmICh0aGlzLl9oYXNfZm9jdXMoKSkge1xuICAgICAgICB2YXIgZmlyc3RfcmVuZGVyID0gIXRoaXMuX3dhc19mb2N1c2VkO1xuICAgICAgICB0aGlzLl93YXNfZm9jdXNlZCA9IHRydWU7XG4gICAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgICAgIC8vIFRlbGwgcGFyZW50IGxheWVyIHRoaXMgb25lIGhhcyBjaGFuZ2VkLlxuICAgICAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZWQnKTtcbiAgICAgICAgaWYgKGZpcnN0X3JlbmRlcikgdGhpcy50cmlnZ2VyKCd0b2dnbGUnKTtcblxuICAgIC8vIFRoZSBjYW52YXMgaXNuJ3QgZm9jdXNlZC4gIElmIHRoaXMgaXMgdGhlIGZpcnN0IHRpbWVcbiAgICAvLyBpdCBoYXNuJ3QgYmVlbiBmb2N1c2VkLCByZW5kZXIgYWdhaW4gd2l0aG91dCB0aGUgXG4gICAgLy8gY3Vyc29ycy5cbiAgICB9IGVsc2UgaWYgKHRoaXMuX3dhc19mb2N1c2VkKSB7XG4gICAgICAgIHRoaXMuX3dhc19mb2N1c2VkID0gZmFsc2U7XG4gICAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgICAgIC8vIFRlbGwgcGFyZW50IGxheWVyIHRoaXMgb25lIGhhcyBjaGFuZ2VkLlxuICAgICAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZWQnKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCd0b2dnbGUnKTtcbiAgICB9XG5cbiAgICAvLyBUaW1lci5cbiAgICBzZXRUaW1lb3V0KHV0aWxzLnByb3h5KHRoaXMuX3JlbmRlcl9jbG9jaywgdGhpcyksIDEwMDAgLyB0aGlzLl9mcHMpO1xufTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5DdXJzb3JzUmVuZGVyZXIgPSBDdXJzb3JzUmVuZGVyZXI7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpO1xudmFyIHJvdyA9IHJlcXVpcmUoJy4vcm93LmpzJyk7XG52YXIgX2NvbmZpZyA9IHJlcXVpcmUoJy4uL2NvbmZpZy5qcycpO1xudmFyIGNvbmZpZyA9IF9jb25maWcuY29uZmlnO1xuXG4vKipcbiAqIFJlbmRlciB0aGUgdGV4dCByb3dzIG9mIGEgRG9jdW1lbnRNb2RlbC5cbiAqIEBwYXJhbSB7RG9jdW1lbnRNb2RlbH0gbW9kZWwgaW5zdGFuY2VcbiAqL1xudmFyIEhpZ2hsaWdodGVkUm93UmVuZGVyZXIgPSBmdW5jdGlvbihtb2RlbCwgc2Nyb2xsaW5nX2NhbnZhcywgc3R5bGUpIHtcbiAgICByb3cuUm93UmVuZGVyZXIuY2FsbCh0aGlzLCBtb2RlbCwgc2Nyb2xsaW5nX2NhbnZhcyk7XG4gICAgdGhpcy5zdHlsZSA9IHN0eWxlO1xufTtcbnV0aWxzLmluaGVyaXQoSGlnaGxpZ2h0ZWRSb3dSZW5kZXJlciwgcm93LlJvd1JlbmRlcmVyKTtcblxuLyoqXG4gKiBSZW5kZXIgYSBzaW5nbGUgcm93XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBpbmRleFxuICogQHBhcmFtICB7ZmxvYXR9IHhcbiAqIEBwYXJhbSAge2Zsb2F0fSB5XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5IaWdobGlnaHRlZFJvd1JlbmRlcmVyLnByb3RvdHlwZS5fcmVuZGVyX3JvdyA9IGZ1bmN0aW9uKGluZGV4LCB4ICx5KSB7XG4gICAgaWYgKGluZGV4IDwgMCB8fCB0aGlzLl9tb2RlbC5fcm93cy5sZW5ndGggPD0gaW5kZXgpIHJldHVybjtcbiAgICBcbiAgICB2YXIgZ3JvdXBzID0gdGhpcy5fZ2V0X2dyb3VwcyhpbmRleCk7XG4gICAgdmFyIGxlZnQgPSB4O1xuICAgIGZvciAodmFyIGk9MDsgaTxncm91cHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHdpZHRoID0gdGhpcy5fdGV4dF9jYW52YXMubWVhc3VyZV90ZXh0KGdyb3Vwc1tpXS50ZXh0LCBncm91cHNbaV0ub3B0aW9ucyk7XG4gICAgICAgIFxuICAgICAgICBpZiAoY29uZmlnLmhpZ2hsaWdodF9kcmF3KSB7XG4gICAgICAgICAgICB0aGlzLl90ZXh0X2NhbnZhcy5kcmF3X3JlY3RhbmdsZShsZWZ0LCB5LCB3aWR0aCwgdGhpcy5nZXRfcm93X2hlaWdodChpKSwge1xuICAgICAgICAgICAgICAgIGZpbGxfY29sb3I6IHV0aWxzLnJhbmRvbV9jb2xvcigpLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl90ZXh0X2NhbnZhcy5kcmF3X3RleHQobGVmdCwgeSwgZ3JvdXBzW2ldLnRleHQsIGdyb3Vwc1tpXS5vcHRpb25zKTtcbiAgICAgICAgbGVmdCArPSB3aWR0aDtcbiAgICB9XG59O1xuXG4vKipcbiAqIEdldCByZW5kZXIgZ3JvdXBzIGZvciBhIHJvdy5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IGluZGV4IG9mIHRoZSByb3dcbiAqIEByZXR1cm4ge2FycmF5fSBhcnJheSBvZiByZW5kZXJpbmdzLCBlYWNoIHJlbmRlcmluZyBpcyBhbiBhcnJheSBvZlxuICogICAgICAgICAgICAgICAgIHRoZSBmb3JtIHtvcHRpb25zLCB0ZXh0fS5cbiAqL1xuSGlnaGxpZ2h0ZWRSb3dSZW5kZXJlci5wcm90b3R5cGUuX2dldF9ncm91cHMgPSBmdW5jdGlvbihpbmRleCkge1xuICAgIGlmIChpbmRleCA8IDAgfHwgdGhpcy5fbW9kZWwuX3Jvd3MubGVuZ3RoIDw9IGluZGV4KSByZXR1cm47XG5cbiAgICB2YXIgcm93X3RleHQgPSB0aGlzLl9tb2RlbC5fcm93c1tpbmRleF07XG4gICAgdmFyIGdyb3VwcyA9IFtdO1xuICAgIHZhciBsYXN0X3N5bnRheCA9IG51bGw7XG4gICAgdmFyIGNoYXJfaW5kZXggPSAwO1xuICAgIHZhciBzdGFydCA9IDA7XG4gICAgZm9yIChjaGFyX2luZGV4OyBjaGFyX2luZGV4PHJvd190ZXh0Lmxlbmd0aDsgY2hhcl9pbmRleCsrKSB7XG4gICAgICAgIHZhciBzeW50YXggPSB0aGlzLl9tb2RlbC5nZXRfdGFncyhpbmRleCwgY2hhcl9pbmRleCkuc3ludGF4O1xuICAgICAgICBpZiAoIXRoaXMuX2NvbXBhcmVfc3ludGF4KGxhc3Rfc3ludGF4LHN5bnRheCkpIHtcbiAgICAgICAgICAgIGlmIChjaGFyX2luZGV4ICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgZ3JvdXBzLnB1c2goe29wdGlvbnM6IHRoaXMuX2dldF9vcHRpb25zKGxhc3Rfc3ludGF4KSwgdGV4dDogcm93X3RleHQuc3Vic3RyaW5nKHN0YXJ0LCBjaGFyX2luZGV4KX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGFzdF9zeW50YXggPSBzeW50YXg7XG4gICAgICAgICAgICBzdGFydCA9IGNoYXJfaW5kZXg7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZ3JvdXBzLnB1c2goe29wdGlvbnM6IHRoaXMuX2dldF9vcHRpb25zKGxhc3Rfc3ludGF4KSwgdGV4dDogcm93X3RleHQuc3Vic3RyaW5nKHN0YXJ0KX0pO1xuXG4gICAgcmV0dXJuIGdyb3Vwcztcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhIHN0eWxlIG9wdGlvbnMgZGljdGlvbmFyeSBmcm9tIGEgc3ludGF4IHRhZy5cbiAqIEBwYXJhbSAge3N0cmluZ30gc3ludGF4XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5IaWdobGlnaHRlZFJvd1JlbmRlcmVyLnByb3RvdHlwZS5fZ2V0X29wdGlvbnMgPSBmdW5jdGlvbihzeW50YXgpIHtcbiAgICB2YXIgcmVuZGVyX29wdGlvbnMgPSB1dGlscy5zaGFsbG93X2NvcHkodGhpcy5fYmFzZV9vcHRpb25zKTtcbiAgICBcbiAgICAvLyBIaWdobGlnaHQgaWYgYSBzeXRheCBpdGVtIGFuZCBzdHlsZSBhcmUgcHJvdmlkZWQuXG4gICAgaWYgKHRoaXMuc3R5bGUpIHtcblxuICAgICAgICAvLyBJZiB0aGlzIGlzIGEgbmVzdGVkIHN5bnRheCBpdGVtLCB1c2UgdGhlIG1vc3Qgc3BlY2lmaWMgcGFydFxuICAgICAgICAvLyB3aGljaCBpcyBkZWZpbmVkIGluIHRoZSBhY3RpdmUgc3R5bGUuXG4gICAgICAgIGlmIChzeW50YXggJiYgc3ludGF4LmluZGV4T2YoJyAnKSAhPSAtMSkge1xuICAgICAgICAgICAgdmFyIHBhcnRzID0gc3ludGF4LnNwbGl0KCcgJyk7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gcGFydHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5zdHlsZVtwYXJ0c1tpXV0pIHtcbiAgICAgICAgICAgICAgICAgICAgc3ludGF4ID0gcGFydHNbaV07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFN0eWxlIGlmIHRoZSBzeW50YXggaXRlbSBpcyBkZWZpbmVkIGluIHRoZSBzdHlsZS5cbiAgICAgICAgaWYgKHN5bnRheCAmJiB0aGlzLnN0eWxlW3N5bnRheF0pIHtcbiAgICAgICAgICAgIHJlbmRlcl9vcHRpb25zLmNvbG9yID0gdGhpcy5zdHlsZVtzeW50YXhdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVuZGVyX29wdGlvbnMuY29sb3IgPSB0aGlzLnN0eWxlLnRleHQgfHwgJ2JsYWNrJztcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICByZXR1cm4gcmVuZGVyX29wdGlvbnM7XG59O1xuXG4vKipcbiAqIENvbXBhcmUgdHdvIHN5bnRheHMuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGEgLSBzeW50YXhcbiAqIEBwYXJhbSAge3N0cmluZ30gYiAtIHN5bnRheFxuICogQHJldHVybiB7Ym9vbH0gdHJ1ZSBpZiBhIGFuZCBiIGFyZSBlcXVhbFxuICovXG5IaWdobGlnaHRlZFJvd1JlbmRlcmVyLnByb3RvdHlwZS5fY29tcGFyZV9zeW50YXggPSBmdW5jdGlvbihhLCBiKSB7XG4gICAgcmV0dXJuIGEgPT09IGI7XG59O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLkhpZ2hsaWdodGVkUm93UmVuZGVyZXIgPSBIaWdobGlnaHRlZFJvd1JlbmRlcmVyO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIGNhbnZhcyA9IHJlcXVpcmUoJy4uL2NhbnZhcy5qcycpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMuanMnKTtcblxuLyoqXG4gKiBSZW5kZXJzIHRvIGEgY2FudmFzXG4gKiBAcGFyYW0ge0NhbnZhc30gZGVmYXVsdF9jYW52YXNcbiAqL1xudmFyIFJlbmRlcmVyQmFzZSA9IGZ1bmN0aW9uKGRlZmF1bHRfY2FudmFzLCBvcHRpb25zKSB7XG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzKTtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHRoaXMuX2NhbnZhcyA9IGRlZmF1bHRfY2FudmFzID8gZGVmYXVsdF9jYW52YXMgOiBuZXcgY2FudmFzLkNhbnZhcygpO1xuICAgIFxuICAgIC8vIENyZWF0ZSBwcm9wZXJ0aWVzLlxuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLnByb3BlcnR5KCd3aWR0aCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fY2FudmFzLndpZHRoO1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy53aWR0aCA9IHZhbHVlO1xuICAgIH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ2hlaWdodCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fY2FudmFzLmhlaWdodDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Ll9jYW52YXMuaGVpZ2h0ID0gdmFsdWU7XG4gICAgfSk7XG59O1xudXRpbHMuaW5oZXJpdChSZW5kZXJlckJhc2UsIHV0aWxzLlBvc3RlckNsYXNzKTtcblxuLyoqXG4gKiBSZW5kZXIgdG8gdGhlIGNhbnZhc1xuICogQHBhcmFtIHtkaWN0aW9uYXJ5fSAob3B0aW9uYWwpIHNjcm9sbCAtIEhvdyBtdWNoIHRoZSBjYW52YXMgd2FzIHNjcm9sbGVkLiAgVGhpc1xuICogICAgICAgICAgICAgICAgICAgICBpcyBhIGRpY3Rpb25hcnkgb2YgdGhlIGZvcm0ge3g6IGZsb2F0LCB5OiBmbG9hdH1cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblJlbmRlcmVyQmFzZS5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oc2Nyb2xsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdOb3QgaW1wbGVtZW50ZWQnKTtcbn07XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuUmVuZGVyZXJCYXNlID0gUmVuZGVyZXJCYXNlO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIGNhbnZhcyA9IHJlcXVpcmUoJy4uL2NhbnZhcy5qcycpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMuanMnKTtcbnZhciByZW5kZXJlciA9IHJlcXVpcmUoJy4vcmVuZGVyZXIuanMnKTtcblxuLyoqXG4gKiBSZW5kZXIgdGhlIHRleHQgcm93cyBvZiBhIERvY3VtZW50TW9kZWwuXG4gKiBAcGFyYW0ge0RvY3VtZW50TW9kZWx9IG1vZGVsIGluc3RhbmNlXG4gKi9cbnZhciBSb3dSZW5kZXJlciA9IGZ1bmN0aW9uKG1vZGVsLCBzY3JvbGxpbmdfY2FudmFzKSB7XG4gICAgdGhpcy5fbW9kZWwgPSBtb2RlbDtcbiAgICB0aGlzLl92aXNpYmxlX3Jvd19jb3VudCA9IDA7XG5cbiAgICAvLyBTZXR1cCBjYW52YXNlc1xuICAgIHRoaXMuX3RleHRfY2FudmFzID0gbmV3IGNhbnZhcy5DYW52YXMoKTtcbiAgICB0aGlzLl90bXBfY2FudmFzID0gbmV3IGNhbnZhcy5DYW52YXMoKTtcbiAgICB0aGlzLl9zY3JvbGxpbmdfY2FudmFzID0gc2Nyb2xsaW5nX2NhbnZhcztcblxuICAgIC8vIEJhc2VcbiAgICByZW5kZXJlci5SZW5kZXJlckJhc2UuY2FsbCh0aGlzKTtcblxuICAgIC8vIFNldCBzb21lIGJhc2ljIHJlbmRlcmluZyBwcm9wZXJ0aWVzLlxuICAgIHRoaXMuX2Jhc2Vfb3B0aW9ucyA9IHtcbiAgICAgICAgZm9udF9mYW1pbHk6ICdtb25vc3BhY2UnLFxuICAgICAgICBmb250X3NpemU6IDE0LFxuICAgIH07XG4gICAgdGhpcy5fbGluZV9zcGFjaW5nID0gMjtcblxuICAgIC8vIENyZWF0ZSBwcm9wZXJ0aWVzLlxuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLnByb3BlcnR5KCd3aWR0aCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fY2FudmFzLndpZHRoO1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy53aWR0aCA9IHZhbHVlO1xuICAgICAgICB0aGF0Ll90ZXh0X2NhbnZhcy53aWR0aCA9IHZhbHVlO1xuICAgICAgICB0aGF0Ll90bXBfY2FudmFzLndpZHRoID0gdmFsdWU7XG4gICAgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgnaGVpZ2h0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMuaGVpZ2h0O1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy5oZWlnaHQgPSB2YWx1ZTtcblxuICAgICAgICAvLyBUaGUgdGV4dCBjYW52YXMgc2hvdWxkIGJlIHRoZSByaWdodCBoZWlnaHQgdG8gZml0IGFsbCBvZiB0aGUgbGluZXNcbiAgICAgICAgLy8gdGhhdCB3aWxsIGJlIHJlbmRlcmVkIGluIHRoZSBiYXNlIGNhbnZhcy4gIFRoaXMgaW5jbHVkZXMgdGhlIGxpbmVzXG4gICAgICAgIC8vIHRoYXQgYXJlIHBhcnRpYWxseSByZW5kZXJlZCBhdCB0aGUgdG9wIGFuZCBib3R0b20gb2YgdGhlIGJhc2UgY2FudmFzLlxuICAgICAgICB2YXIgcm93X2hlaWdodCA9IHRoYXQuZ2V0X3Jvd19oZWlnaHQoKTtcbiAgICAgICAgdGhhdC5fdmlzaWJsZV9yb3dfY291bnQgPSBNYXRoLmNlaWwodmFsdWUvcm93X2hlaWdodCkgKyAxO1xuICAgICAgICB0aGF0Ll90ZXh0X2NhbnZhcy5oZWlnaHQgPSB0aGF0Ll92aXNpYmxlX3Jvd19jb3VudCAqIHJvd19oZWlnaHQ7XG4gICAgICAgIHRoYXQuX3RtcF9jYW52YXMuaGVpZ2h0ID0gdGhhdC5fdGV4dF9jYW52YXMuaGVpZ2h0O1xuICAgIH0pO1xuICAgIHRoaXMuX21hcmdpbl9sZWZ0ID0gMDtcbiAgICB0aGlzLnByb3BlcnR5KCdtYXJnaW5fbGVmdCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fbWFyZ2luX2xlZnQ7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgLy8gVXBkYXRlIHRoZSBzY3JvbGxiYXJzLlxuICAgICAgICB0aGF0Ll9zY3JvbGxpbmdfY2FudmFzLnNjcm9sbF93aWR0aCArPSB2YWx1ZSAtIHRoYXQuX21hcmdpbl9sZWZ0O1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGludGVybmFsIHZhbHVlLlxuICAgICAgICB0aGF0Ll9tYXJnaW5fbGVmdCA9IHZhbHVlO1xuXG4gICAgICAgIC8vIFJlLXJlbmRlciB3aXRoIG5ldyBtYXJnaW4uXG4gICAgICAgIHRoYXQucmVuZGVyKCk7XG4gICAgICAgIC8vIFRlbGwgcGFyZW50IGxheWVyIHRoaXMgb25lIGhhcyBjaGFuZ2VkLlxuICAgICAgICB0aGF0LnRyaWdnZXIoJ2NoYW5nZWQnKTtcbiAgICB9KVxuICAgIHRoaXMuX21hcmdpbl90b3AgPSAwXG4gICAgdGhpcy5wcm9wZXJ0eSgnbWFyZ2luX3RvcCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fbWFyZ2luX3RvcDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAvLyBVcGRhdGUgdGhlIHNjcm9sbGJhcnMuXG4gICAgICAgIHRoYXQuX3Njcm9sbGluZ19jYW52YXMuc2Nyb2xsX2hlaWdodCArPSB2YWx1ZSAtIHRoYXQuX21hcmdpbl90b3A7XG5cbiAgICAgICAgLy8gVXBkYXRlIGludGVybmFsIHZhbHVlLlxuICAgICAgICB0aGF0Ll9tYXJnaW5fdG9wID0gdmFsdWU7XG5cbiAgICAgICAgLy8gUmUtcmVuZGVyIHdpdGggbmV3IG1hcmdpbi5cbiAgICAgICAgdGhhdC5yZW5kZXIoKTtcbiAgICAgICAgLy8gVGVsbCBwYXJlbnQgbGF5ZXIgdGhpcyBvbmUgaGFzIGNoYW5nZWQuXG4gICAgICAgIHRoYXQudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgIH0pXG5cbiAgICAvLyBTZXQgaW5pdGlhbCBjYW52YXMgc2l6ZXMuICBUaGVzZSBsaW5lcyBtYXkgbG9vayByZWR1bmRhbnQsIGJ1dCBiZXdhcmVcbiAgICAvLyBiZWNhdXNlIHRoZXkgYWN0dWFsbHkgY2F1c2UgYW4gYXBwcm9wcmlhdGUgd2lkdGggYW5kIGhlaWdodCB0byBiZSBzZXQgZm9yXG4gICAgLy8gdGhlIHRleHQgY2FudmFzIGJlY2F1c2Ugb2YgdGhlIHByb3BlcnRpZXMgZGVjbGFyZWQgYWJvdmUuXG4gICAgdGhpcy53aWR0aCA9IHRoaXMuX2NhbnZhcy53aWR0aDtcbiAgICB0aGlzLmhlaWdodCA9IHRoaXMuX2NhbnZhcy5oZWlnaHQ7XG5cbiAgICB0aGlzLl9tb2RlbC5vbigndGV4dF9jaGFuZ2VkJywgdXRpbHMucHJveHkodGhpcy5faGFuZGxlX3ZhbHVlX2NoYW5nZWQsIHRoaXMpKTtcbiAgICB0aGlzLl9tb2RlbC5vbigncm93c19hZGRlZCcsIHV0aWxzLnByb3h5KHRoaXMuX2hhbmRsZV9yb3dzX2FkZGVkLCB0aGlzKSk7XG4gICAgdGhpcy5fbW9kZWwub24oJ3Jvd19jaGFuZ2VkJywgdXRpbHMucHJveHkodGhpcy5faGFuZGxlX3Jvd19jaGFuZ2VkLCB0aGlzKSk7IC8vIFRPRE86IEltcGxlbWVudCBteSBldmVudC5cbn07XG51dGlscy5pbmhlcml0KFJvd1JlbmRlcmVyLCByZW5kZXJlci5SZW5kZXJlckJhc2UpO1xuXG4vKipcbiAqIFJlbmRlciB0byB0aGUgY2FudmFzXG4gKiBOb3RlOiBUaGlzIG1ldGhvZCBpcyBjYWxsZWQgb2Z0ZW4sIHNvIGl0J3MgaW1wb3J0YW50IHRoYXQgaXQnc1xuICogb3B0aW1pemVkIGZvciBzcGVlZC5cbiAqIEBwYXJhbSB7ZGljdGlvbmFyeX0gKG9wdGlvbmFsKSBzY3JvbGwgLSBIb3cgbXVjaCB0aGUgY2FudmFzIHdhcyBzY3JvbGxlZC4gIFRoaXNcbiAqICAgICAgICAgICAgICAgICAgICAgaXMgYSBkaWN0aW9uYXJ5IG9mIHRoZSBmb3JtIHt4OiBmbG9hdCwgeTogZmxvYXR9XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oc2Nyb2xsKSB7XG5cbiAgICAvLyBJZiBvbmx5IHRoZSB5IGF4aXMgd2FzIHNjcm9sbGVkLCBibGl0IHRoZSBnb29kIGNvbnRlbnRzIGFuZCBqdXN0IHJlbmRlclxuICAgIC8vIHdoYXQncyBtaXNzaW5nLlxuICAgIHZhciBwYXJ0aWFsX3JlZHJhdyA9IChzY3JvbGwgJiYgc2Nyb2xsLnggPT09IDAgJiYgTWF0aC5hYnMoc2Nyb2xsLnkpIDwgdGhpcy5fY2FudmFzLmhlaWdodCk7XG5cbiAgICAvLyBVcGRhdGUgdGhlIHRleHQgcmVuZGVyaW5nXG4gICAgdmFyIHZpc2libGVfcm93cyA9IHRoaXMuZ2V0X3Zpc2libGVfcm93cygpO1xuICAgIHRoaXMuX3JlbmRlcl90ZXh0X2NhbnZhcygtdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfbGVmdCt0aGlzLl9tYXJnaW5fbGVmdCwgdmlzaWJsZV9yb3dzLnRvcF9yb3csICFwYXJ0aWFsX3JlZHJhdyk7XG5cbiAgICAvLyBDb3B5IHRoZSB0ZXh0IGltYWdlIHRvIHRoaXMgY2FudmFzXG4gICAgdGhpcy5fY2FudmFzLmNsZWFyKCk7XG4gICAgdGhpcy5fY2FudmFzLmRyYXdfaW1hZ2UoXG4gICAgICAgIHRoaXMuX3RleHRfY2FudmFzLCBcbiAgICAgICAgdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfbGVmdCwgXG4gICAgICAgIHRoaXMuZ2V0X3Jvd190b3AodmlzaWJsZV9yb3dzLnRvcF9yb3cpKTtcbn07XG5cbi8qKlxuICogUmVuZGVyIHRleHQgdG8gdGhlIHRleHQgY2FudmFzLlxuICpcbiAqIExhdGVyLCB0aGUgbWFpbiByZW5kZXJpbmcgZnVuY3Rpb24gY2FuIHVzZSB0aGlzIHJlbmRlcmVkIHRleHQgdG8gZHJhdyB0aGVcbiAqIGJhc2UgY2FudmFzLlxuICogQHBhcmFtICB7ZmxvYXR9IHhfb2Zmc2V0IC0gaG9yaXpvbnRhbCBvZmZzZXQgb2YgdGhlIHRleHRcbiAqIEBwYXJhbSAge2ludGVnZXJ9IHRvcF9yb3dcbiAqIEBwYXJhbSAge2Jvb2xlYW59IGZvcmNlX3JlZHJhdyAtIHJlZHJhdyB0aGUgY29udGVudHMgZXZlbiBpZiB0aGV5IGFyZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoZSBzYW1lIGFzIHRoZSBjYWNoZWQgY29udGVudHMuXG4gKiBAcmV0dXJuIHtudWxsfSAgICAgICAgICBcbiAqL1xuUm93UmVuZGVyZXIucHJvdG90eXBlLl9yZW5kZXJfdGV4dF9jYW52YXMgPSBmdW5jdGlvbih4X29mZnNldCwgdG9wX3JvdywgZm9yY2VfcmVkcmF3KSB7XG5cbiAgICAvLyBUcnkgdG8gcmV1c2Ugc29tZSBvZiB0aGUgYWxyZWFkeSByZW5kZXJlZCB0ZXh0IGlmIHBvc3NpYmxlLlxuICAgIHZhciByZW5kZXJlZCA9IGZhbHNlO1xuICAgIHZhciByb3dfaGVpZ2h0ID0gdGhpcy5nZXRfcm93X2hlaWdodCgpO1xuICAgIGlmICghZm9yY2VfcmVkcmF3ICYmIHRoaXMuX2xhc3RfcmVuZGVyZWRfb2Zmc2V0ID09PSB4X29mZnNldCkge1xuICAgICAgICB2YXIgbGFzdF90b3AgPSB0aGlzLl9sYXN0X3JlbmRlcmVkX3JvdztcbiAgICAgICAgdmFyIHNjcm9sbCA9IHRvcF9yb3cgLSBsYXN0X3RvcDsgLy8gUG9zaXRpdmUgPSB1c2VyIHNjcm9sbGluZyBkb3dud2FyZC5cbiAgICAgICAgaWYgKHNjcm9sbCA8IHRoaXMuX2xhc3RfcmVuZGVyZWRfcm93X2NvdW50KSB7XG5cbiAgICAgICAgICAgIC8vIEdldCBhIHNuYXBzaG90IG9mIHRoZSB0ZXh0IGJlZm9yZSB0aGUgc2Nyb2xsLlxuICAgICAgICAgICAgdGhpcy5fdG1wX2NhbnZhcy5jbGVhcigpO1xuICAgICAgICAgICAgdGhpcy5fdG1wX2NhbnZhcy5kcmF3X2ltYWdlKHRoaXMuX3RleHRfY2FudmFzLCAwLCAwKTtcblxuICAgICAgICAgICAgLy8gUmVuZGVyIHRoZSBuZXcgdGV4dC5cbiAgICAgICAgICAgIHZhciBzYXZlZF9yb3dzID0gdGhpcy5fbGFzdF9yZW5kZXJlZF9yb3dfY291bnQgLSBNYXRoLmFicyhzY3JvbGwpO1xuICAgICAgICAgICAgdmFyIG5ld19yb3dzID0gdGhpcy5fdmlzaWJsZV9yb3dfY291bnQgLSBzYXZlZF9yb3dzO1xuICAgICAgICAgICAgaWYgKHNjcm9sbCA+IDApIHtcbiAgICAgICAgICAgICAgICAvLyBSZW5kZXIgdGhlIGJvdHRvbS5cbiAgICAgICAgICAgICAgICB0aGlzLl90ZXh0X2NhbnZhcy5jbGVhcigpO1xuICAgICAgICAgICAgICAgIGZvciAoaSA9IHRvcF9yb3crc2F2ZWRfcm93czsgaSA8IHRvcF9yb3crdGhpcy5fdmlzaWJsZV9yb3dfY291bnQ7IGkrKykgeyAgICAgXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlcl9yb3coaSwgeF9vZmZzZXQsIChpIC0gdG9wX3JvdykgKiByb3dfaGVpZ2h0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHNjcm9sbCA8IDApIHtcbiAgICAgICAgICAgICAgICAvLyBSZW5kZXIgdGhlIHRvcC5cbiAgICAgICAgICAgICAgICB0aGlzLl90ZXh0X2NhbnZhcy5jbGVhcigpO1xuICAgICAgICAgICAgICAgIGZvciAoaSA9IHRvcF9yb3c7IGkgPCB0b3Bfcm93K25ld19yb3dzOyBpKyspIHsgICBcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fcmVuZGVyX3JvdyhpLCB4X29mZnNldCwgKGkgLSB0b3Bfcm93KSAqIHJvd19oZWlnaHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gTm90aGluZyBoYXMgY2hhbmdlZC5cbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVzZSB0aGUgb2xkIGNvbnRlbnQgdG8gZmlsbCBpbiB0aGUgcmVzdC5cbiAgICAgICAgICAgIHRoaXMuX3RleHRfY2FudmFzLmRyYXdfaW1hZ2UodGhpcy5fdG1wX2NhbnZhcywgMCwgLXNjcm9sbCAqIHRoaXMuZ2V0X3Jvd19oZWlnaHQoKSk7XG4gICAgICAgICAgICB0aGlzLnRyaWdnZXIoJ3Jvd3NfY2hhbmdlZCcsIHRvcF9yb3csIHRvcF9yb3cgKyB0aGlzLl92aXNpYmxlX3Jvd19jb3VudCAtIDEpO1xuICAgICAgICAgICAgcmVuZGVyZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gRnVsbCByZW5kZXJpbmcuXG4gICAgaWYgKCFyZW5kZXJlZCkge1xuICAgICAgICB0aGlzLl90ZXh0X2NhbnZhcy5jbGVhcigpO1xuXG4gICAgICAgIC8vIFJlbmRlciB0aWxsIHRoZXJlIGFyZSBubyByb3dzIGxlZnQsIG9yIHRoZSB0b3Agb2YgdGhlIHJvdyBpc1xuICAgICAgICAvLyBiZWxvdyB0aGUgYm90dG9tIG9mIHRoZSB2aXNpYmxlIGFyZWEuXG4gICAgICAgIGZvciAoaSA9IHRvcF9yb3c7IGkgPCB0b3Bfcm93ICsgdGhpcy5fdmlzaWJsZV9yb3dfY291bnQ7IGkrKykgeyAgICAgICAgXG4gICAgICAgICAgICB0aGlzLl9yZW5kZXJfcm93KGksIHhfb2Zmc2V0LCAoaSAtIHRvcF9yb3cpICogcm93X2hlaWdodCk7XG4gICAgICAgIH0gICBcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdyb3dzX2NoYW5nZWQnLCB0b3Bfcm93LCB0b3Bfcm93ICsgdGhpcy5fdmlzaWJsZV9yb3dfY291bnQgLSAxKTtcbiAgICB9XG5cbiAgICAvLyBSZW1lbWJlciBmb3IgZGVsdGEgcmVuZGVyaW5nLlxuICAgIHRoaXMuX2xhc3RfcmVuZGVyZWRfcm93ID0gdG9wX3JvdztcbiAgICB0aGlzLl9sYXN0X3JlbmRlcmVkX3Jvd19jb3VudCA9IHRoaXMuX3Zpc2libGVfcm93X2NvdW50O1xuICAgIHRoaXMuX2xhc3RfcmVuZGVyZWRfb2Zmc2V0ID0geF9vZmZzZXQ7XG59O1xuXG4vKipcbiAqIEdldHMgdGhlIHJvdyBhbmQgY2hhcmFjdGVyIGluZGljaWVzIGNsb3Nlc3QgdG8gZ2l2ZW4gY29udHJvbCBzcGFjZSBjb29yZGluYXRlcy5cbiAqIEBwYXJhbSAge2Zsb2F0fSBjdXJzb3JfeCAtIHggdmFsdWUsIDAgaXMgdGhlIGxlZnQgb2YgdGhlIGNhbnZhcy5cbiAqIEBwYXJhbSAge2Zsb2F0fSBjdXJzb3JfeSAtIHkgdmFsdWUsIDAgaXMgdGhlIHRvcCBvZiB0aGUgY2FudmFzLlxuICogQHJldHVybiB7ZGljdGlvbmFyeX0gZGljdGlvbmFyeSBvZiB0aGUgZm9ybSB7cm93X2luZGV4LCBjaGFyX2luZGV4fVxuICovXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuZ2V0X3Jvd19jaGFyID0gZnVuY3Rpb24oY3Vyc29yX3gsIGN1cnNvcl95KSB7XG4gICAgdmFyIHJvd19pbmRleCA9IE1hdGguZmxvb3IoKGN1cnNvcl95IC0gdGhpcy5fbWFyZ2luX3RvcCkgLyB0aGlzLmdldF9yb3dfaGVpZ2h0KCkpO1xuXG4gICAgLy8gRmluZCB0aGUgY2hhcmFjdGVyIGluZGV4LlxuICAgIHZhciB3aWR0aHMgPSBbMF07XG4gICAgdHJ5IHtcbiAgICAgICAgZm9yICh2YXIgbGVuZ3RoPTE7IGxlbmd0aDw9dGhpcy5fbW9kZWwuX3Jvd3Nbcm93X2luZGV4XS5sZW5ndGg7IGxlbmd0aCsrKSB7XG4gICAgICAgICAgICB3aWR0aHMucHVzaCh0aGlzLm1lYXN1cmVfcGFydGlhbF9yb3dfd2lkdGgocm93X2luZGV4LCBsZW5ndGgpKTtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gTm9tIG5vbSBub20uLi5cbiAgICB9XG4gICAgdmFyIGNvb3JkcyA9IHRoaXMuX21vZGVsLnZhbGlkYXRlX2Nvb3Jkcyhyb3dfaW5kZXgsIHV0aWxzLmZpbmRfY2xvc2VzdCh3aWR0aHMsIGN1cnNvcl94IC0gdGhpcy5fbWFyZ2luX2xlZnQpKTtcbiAgICByZXR1cm4ge1xuICAgICAgICByb3dfaW5kZXg6IGNvb3Jkcy5zdGFydF9yb3csXG4gICAgICAgIGNoYXJfaW5kZXg6IGNvb3Jkcy5zdGFydF9jaGFyLFxuICAgIH07XG59O1xuXG4vKipcbiAqIE1lYXN1cmVzIHRoZSBwYXJ0aWFsIHdpZHRoIG9mIGEgdGV4dCByb3cuXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBpbmRleFxuICogQHBhcmFtICB7aW50ZWdlcn0gKG9wdGlvbmFsKSBsZW5ndGggLSBudW1iZXIgb2YgY2hhcmFjdGVyc1xuICogQHJldHVybiB7ZmxvYXR9IHdpZHRoXG4gKi9cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5tZWFzdXJlX3BhcnRpYWxfcm93X3dpZHRoID0gZnVuY3Rpb24oaW5kZXgsIGxlbmd0aCkge1xuICAgIGlmICgwID4gaW5kZXggfHwgaW5kZXggPj0gdGhpcy5fbW9kZWwuX3Jvd3MubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiAwOyBcbiAgICB9XG5cbiAgICB2YXIgdGV4dCA9IHRoaXMuX21vZGVsLl9yb3dzW2luZGV4XTtcbiAgICB0ZXh0ID0gKGxlbmd0aCA9PT0gdW5kZWZpbmVkKSA/IHRleHQgOiB0ZXh0LnN1YnN0cmluZygwLCBsZW5ndGgpO1xuXG4gICAgcmV0dXJuIHRoaXMuX2NhbnZhcy5tZWFzdXJlX3RleHQodGV4dCwgdGhpcy5fYmFzZV9vcHRpb25zKTtcbn07XG5cbi8qKlxuICogTWVhc3VyZXMgdGhlIGhlaWdodCBvZiBhIHRleHQgcm93IGFzIGlmIGl0IHdlcmUgcmVuZGVyZWQuXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSAob3B0aW9uYWwpIGluZGV4XG4gKiBAcmV0dXJuIHtmbG9hdH0gaGVpZ2h0XG4gKi9cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5nZXRfcm93X2hlaWdodCA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgcmV0dXJuIHRoaXMuX2Jhc2Vfb3B0aW9ucy5mb250X3NpemUgKyB0aGlzLl9saW5lX3NwYWNpbmc7XG59O1xuXG4vKipcbiAqIEdldHMgdGhlIHRvcCBvZiB0aGUgcm93IHdoZW4gcmVuZGVyZWRcbiAqIEBwYXJhbSAge2ludGVnZXJ9IGluZGV4XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuZ2V0X3Jvd190b3AgPSBmdW5jdGlvbihpbmRleCkge1xuICAgIHJldHVybiBpbmRleCAqIHRoaXMuZ2V0X3Jvd19oZWlnaHQoKSArIHRoaXMuX21hcmdpbl90b3A7XG59O1xuXG4vKipcbiAqIEdldHMgdGhlIHZpc2libGUgcm93cy5cbiAqIEByZXR1cm4ge2RpY3Rpb25hcnl9IGRpY3Rpb25hcnkgY29udGFpbmluZyBpbmZvcm1hdGlvbiBhYm91dCBcbiAqICAgICAgICAgICAgICAgICAgICAgIHRoZSB2aXNpYmxlIHJvd3MuICBGb3JtYXQge3RvcF9yb3csIFxuICogICAgICAgICAgICAgICAgICAgICAgYm90dG9tX3Jvdywgcm93X2NvdW50fS5cbiAqL1xuUm93UmVuZGVyZXIucHJvdG90eXBlLmdldF92aXNpYmxlX3Jvd3MgPSBmdW5jdGlvbigpIHtcblxuICAgIC8vIEZpbmQgdGhlIHJvdyBjbG9zZXN0IHRvIHRoZSBzY3JvbGwgdG9wLiAgSWYgdGhhdCByb3cgaXMgYmVsb3dcbiAgICAvLyB0aGUgc2Nyb2xsIHRvcCwgdXNlIHRoZSBwYXJ0aWFsbHkgZGlzcGxheWVkIHJvdyBhYm92ZSBpdC5cbiAgICB2YXIgdG9wX3JvdyA9IE1hdGgubWF4KDAsIE1hdGguZmxvb3IoKHRoaXMuX3Njcm9sbGluZ19jYW52YXMuc2Nyb2xsX3RvcCAtIHRoaXMuX21hcmdpbl90b3ApICAvIHRoaXMuZ2V0X3Jvd19oZWlnaHQoKSkpO1xuXG4gICAgLy8gRmluZCB0aGUgcm93IGNsb3Nlc3QgdG8gdGhlIHNjcm9sbCBib3R0b20uICBJZiB0aGF0IHJvdyBpcyBhYm92ZVxuICAgIC8vIHRoZSBzY3JvbGwgYm90dG9tLCB1c2UgdGhlIHBhcnRpYWxseSBkaXNwbGF5ZWQgcm93IGJlbG93IGl0LlxuICAgIHZhciByb3dfY291bnQgPSBNYXRoLmNlaWwodGhpcy5fY2FudmFzLmhlaWdodCAvIHRoaXMuZ2V0X3Jvd19oZWlnaHQoKSk7XG4gICAgdmFyIGJvdHRvbV9yb3cgPSB0b3Bfcm93ICsgcm93X2NvdW50O1xuXG4gICAgLy8gUm93IGNvdW50ICsgMSB0byBpbmNsdWRlIGZpcnN0IHJvdy5cbiAgICByZXR1cm4ge3RvcF9yb3c6IHRvcF9yb3csIGJvdHRvbV9yb3c6IGJvdHRvbV9yb3csIHJvd19jb3VudDogcm93X2NvdW50KzF9O1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gdGhlIG1vZGVsJ3MgdmFsdWUgY2hhbmdlc1xuICogQ29tcGxleGl0eTogTyhOKSBmb3IgTiByb3dzIG9mIHRleHQuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuX2hhbmRsZV92YWx1ZV9jaGFuZ2VkID0gZnVuY3Rpb24oKSB7XG5cbiAgICAvLyBDYWxjdWxhdGUgdGhlIGRvY3VtZW50IHdpZHRoLlxuICAgIHZhciBkb2N1bWVudF93aWR0aCA9IDA7XG4gICAgZm9yICh2YXIgaT0wOyBpPHRoaXMuX21vZGVsLl9yb3dzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGRvY3VtZW50X3dpZHRoID0gTWF0aC5tYXgodGhpcy5fbWVhc3VyZV9yb3dfd2lkdGgoaSkrdGhpcy5fbWFyZ2luX2xlZnQsIGRvY3VtZW50X3dpZHRoKTtcbiAgICB9XG4gICAgdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfd2lkdGggPSBkb2N1bWVudF93aWR0aDtcbiAgICB0aGlzLl9zY3JvbGxpbmdfY2FudmFzLnNjcm9sbF9oZWlnaHQgPSB0aGlzLl9tb2RlbC5fcm93cy5sZW5ndGggKiB0aGlzLmdldF9yb3dfaGVpZ2h0KCkgKyB0aGlzLl9tYXJnaW5fdG9wO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gb25lIG9mIHRoZSBtb2RlbCdzIHJvd3MgY2hhbmdlXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuX2hhbmRsZV9yb3dfY2hhbmdlZCA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfd2lkdGggPSBNYXRoLm1heCh0aGlzLl9tZWFzdXJlX3Jvd193aWR0aChpbmRleCkrdGhpcy5fbWFyZ2luX2xlZnQsIHRoaXMuX3Njcm9sbGluZ19jYW52YXMuc2Nyb2xsX3dpZHRoKTtcbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIG9uZSBvciBtb3JlIHJvd3MgYXJlIGFkZGVkIHRvIHRoZSBtb2RlbFxuICpcbiAqIEFzc3VtZXMgY29uc3RhbnQgcm93IGhlaWdodC5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IHN0YXJ0XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBlbmRcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5faGFuZGxlX3Jvd3NfYWRkZWQgPSBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gICAgdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfaGVpZ2h0ICs9IChlbmQgLSBzdGFydCArIDEpICogdGhpcy5nZXRfcm93X2hlaWdodCgpO1xuICAgIHZhciB3aWR0aCA9IHRoaXMuX3Njcm9sbGluZ19jYW52YXMuc2Nyb2xsX3dpZHRoO1xuICAgIGZvciAodmFyIGkgPSBzdGFydDsgaSA8PSBlbmQ7IGkrKykgeyBcbiAgICAgICAgd2lkdGggPSBNYXRoLm1heCh0aGlzLl9tZWFzdXJlX3Jvd193aWR0aChpKSt0aGlzLl9tYXJnaW5fbGVmdCwgd2lkdGgpO1xuICAgIH1cbiAgICB0aGlzLl9zY3JvbGxpbmdfY2FudmFzLnNjcm9sbF93aWR0aCA9IHdpZHRoO1xufTtcblxuLyoqXG4gKiBSZW5kZXIgYSBzaW5nbGUgcm93XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBpbmRleFxuICogQHBhcmFtICB7ZmxvYXR9IHhcbiAqIEBwYXJhbSAge2Zsb2F0fSB5XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuX3JlbmRlcl9yb3cgPSBmdW5jdGlvbihpbmRleCwgeCAseSkge1xuICAgIHRoaXMuX3RleHRfY2FudmFzLmRyYXdfdGV4dCh4LCB5LCB0aGlzLl9tb2RlbC5fcm93c1tpbmRleF0sIHRoaXMuX2Jhc2Vfb3B0aW9ucyk7XG59O1xuXG4vKipcbiAqIE1lYXN1cmVzIHRoZSB3aWR0aCBvZiBhIHRleHQgcm93IGFzIGlmIGl0IHdlcmUgcmVuZGVyZWQuXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBpbmRleFxuICogQHJldHVybiB7ZmxvYXR9IHdpZHRoXG4gKi9cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5fbWVhc3VyZV9yb3dfd2lkdGggPSBmdW5jdGlvbihpbmRleCkge1xuICAgIHJldHVybiB0aGlzLm1lYXN1cmVfcGFydGlhbF9yb3dfd2lkdGgoaW5kZXgsIHRoaXMuX21vZGVsLl9yb3dzW2luZGV4XS5sZW5ndGgpO1xufTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5Sb3dSZW5kZXJlciA9IFJvd1JlbmRlcmVyO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIGFuaW1hdG9yID0gcmVxdWlyZSgnLi4vYW5pbWF0b3IuanMnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJyk7XG52YXIgcmVuZGVyZXIgPSByZXF1aXJlKCcuL3JlbmRlcmVyLmpzJyk7XG52YXIgX2NvbmZpZyA9IHJlcXVpcmUoJy4uL2NvbmZpZy5qcycpO1xudmFyIGNvbmZpZyA9IF9jb25maWcuY29uZmlnO1xuXG4vKipcbiAqIFJlbmRlciBkb2N1bWVudCBzZWxlY3Rpb24gYm94ZXNcbiAqXG4gKiBUT0RPOiBPbmx5IHJlbmRlciB2aXNpYmxlLlxuICovXG52YXIgU2VsZWN0aW9uc1JlbmRlcmVyID0gZnVuY3Rpb24oY3Vyc29ycywgc3R5bGUsIHJvd19yZW5kZXJlciwgaGFzX2ZvY3VzLCBjdXJzb3JzX3JlbmRlcmVyKSB7XG4gICAgcmVuZGVyZXIuUmVuZGVyZXJCYXNlLmNhbGwodGhpcyk7XG4gICAgdGhpcy5zdHlsZSA9IHN0eWxlO1xuICAgIHRoaXMuX2hhc19mb2N1cyA9IGhhc19mb2N1cztcblxuICAgIC8vIFdoZW4gdGhlIGN1cnNvcnMgY2hhbmdlLCByZWRyYXcgdGhlIHNlbGVjdGlvbiBib3goZXMpLlxuICAgIHRoaXMuX2N1cnNvcnMgPSBjdXJzb3JzO1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB2YXIgcmVyZW5kZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhhdC5yZW5kZXIoKTtcbiAgICAgICAgLy8gVGVsbCBwYXJlbnQgbGF5ZXIgdGhpcyBvbmUgaGFzIGNoYW5nZWQuXG4gICAgICAgIHRoYXQudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgIH1cbiAgICB0aGlzLl9jdXJzb3JzLm9uKCdjaGFuZ2UnLCByZXJlbmRlcik7XG5cbiAgICAvLyBXaGVuIHRoZSBzdHlsZSBpcyBjaGFuZ2VkLCByZWRyYXcgdGhlIHNlbGVjdGlvbiBib3goZXMpLlxuICAgIHRoaXMuc3R5bGUub24oJ2NoYW5nZScsIHJlcmVuZGVyKTtcbiAgICBjb25maWcub24oJ2NoYW5nZScsIHJlcmVuZGVyKTtcblxuICAgIHRoaXMuX3Jvd19yZW5kZXJlciA9IHJvd19yZW5kZXJlcjtcbiAgICAvLyBUT0RPOiBSZW1vdmUgdGhlIGZvbGxvd2luZyBibG9jay5cbiAgICB0aGlzLl9nZXRfdmlzaWJsZV9yb3dzID0gdXRpbHMucHJveHkocm93X3JlbmRlcmVyLmdldF92aXNpYmxlX3Jvd3MsIHJvd19yZW5kZXJlcik7XG4gICAgdGhpcy5fZ2V0X3Jvd19oZWlnaHQgPSB1dGlscy5wcm94eShyb3dfcmVuZGVyZXIuZ2V0X3Jvd19oZWlnaHQsIHJvd19yZW5kZXJlcik7XG4gICAgdGhpcy5fZ2V0X3Jvd190b3AgPSB1dGlscy5wcm94eShyb3dfcmVuZGVyZXIuZ2V0X3Jvd190b3AsIHJvd19yZW5kZXJlcik7XG4gICAgdGhpcy5fbWVhc3VyZV9wYXJ0aWFsX3JvdyA9IHV0aWxzLnByb3h5KHJvd19yZW5kZXJlci5tZWFzdXJlX3BhcnRpYWxfcm93X3dpZHRoLCByb3dfcmVuZGVyZXIpO1xuXG4gICAgLy8gV2hlbiB0aGUgY3Vyc29yIGlzIGhpZGRlbi9zaG93biwgcmVkcmF3IHRoZSBzZWxlY3Rpb24uXG4gICAgY3Vyc29yc19yZW5kZXJlci5vbigndG9nZ2xlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoYXQucmVuZGVyKCk7XG4gICAgICAgIC8vIFRlbGwgcGFyZW50IGxheWVyIHRoaXMgb25lIGhhcyBjaGFuZ2VkLlxuICAgICAgICB0aGF0LnRyaWdnZXIoJ2NoYW5nZWQnKTtcbiAgICB9KTtcbn07XG51dGlscy5pbmhlcml0KFNlbGVjdGlvbnNSZW5kZXJlciwgcmVuZGVyZXIuUmVuZGVyZXJCYXNlKTtcblxuLyoqXG4gKiBSZW5kZXIgdG8gdGhlIGNhbnZhc1xuICogTm90ZTogVGhpcyBtZXRob2QgaXMgY2FsbGVkIG9mdGVuLCBzbyBpdCdzIGltcG9ydGFudCB0aGF0IGl0J3NcbiAqIG9wdGltaXplZCBmb3Igc3BlZWQuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5TZWxlY3Rpb25zUmVuZGVyZXIucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2NhbnZhcy5jbGVhcigpO1xuXG4gICAgLy8gR2V0IG5ld2xpbmUgd2lkdGguXG4gICAgdmFyIG5ld2xpbmVfd2lkdGggPSBjb25maWcubmV3bGluZV93aWR0aDtcbiAgICBpZiAobmV3bGluZV93aWR0aCA9PT0gdW5kZWZpbmVkIHx8IG5ld2xpbmVfd2lkdGggPT09IG51bGwpIHtcbiAgICAgICAgbmV3bGluZV93aWR0aCA9IDI7XG4gICAgfVxuXG4gICAgLy8gT25seSByZW5kZXIgaWYgdGhlIGNhbnZhcyBoYXMgZm9jdXMuXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMuX2N1cnNvcnMuY3Vyc29ycy5mb3JFYWNoKGZ1bmN0aW9uKGN1cnNvcikge1xuICAgICAgICAvLyBHZXQgdGhlIHZpc2libGUgcm93cy5cbiAgICAgICAgdmFyIHZpc2libGVfcm93cyA9IHRoYXQuX2dldF92aXNpYmxlX3Jvd3MoKTtcblxuICAgICAgICAvLyBEcmF3IHRoZSBzZWxlY3Rpb24gYm94LlxuICAgICAgICBpZiAoY3Vyc29yLnN0YXJ0X3JvdyAhPT0gbnVsbCAmJiBjdXJzb3Iuc3RhcnRfY2hhciAhPT0gbnVsbCAmJlxuICAgICAgICAgICAgY3Vyc29yLmVuZF9yb3cgIT09IG51bGwgJiYgY3Vyc29yLmVuZF9jaGFyICE9PSBudWxsKSB7XG4gICAgICAgICAgICBcblxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IE1hdGgubWF4KGN1cnNvci5zdGFydF9yb3csIHZpc2libGVfcm93cy50b3Bfcm93KTsgXG4gICAgICAgICAgICAgICAgaSA8PSBNYXRoLm1pbihjdXJzb3IuZW5kX3JvdywgdmlzaWJsZV9yb3dzLmJvdHRvbV9yb3cpOyBcbiAgICAgICAgICAgICAgICBpKyspIHtcblxuICAgICAgICAgICAgICAgIHZhciBsZWZ0ID0gdGhhdC5fcm93X3JlbmRlcmVyLm1hcmdpbl9sZWZ0O1xuICAgICAgICAgICAgICAgIGlmIChpID09IGN1cnNvci5zdGFydF9yb3cgJiYgY3Vyc29yLnN0YXJ0X2NoYXIgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGxlZnQgKz0gdGhhdC5fbWVhc3VyZV9wYXJ0aWFsX3JvdyhpLCBjdXJzb3Iuc3RhcnRfY2hhcik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIHNlbGVjdGlvbl9jb2xvcjtcbiAgICAgICAgICAgICAgICBpZiAodGhhdC5faGFzX2ZvY3VzKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0aW9uX2NvbG9yID0gdGhhdC5zdHlsZS5zZWxlY3Rpb24gfHwgJ3NreWJsdWUnO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGlvbl9jb2xvciA9IHRoYXQuc3R5bGUuc2VsZWN0aW9uX3VuZm9jdXNlZCB8fCAnZ3JheSc7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIHJpZ2h0O1xuICAgICAgICAgICAgICAgIGlmIChpICE9PSBjdXJzb3IuZW5kX3Jvdykge1xuICAgICAgICAgICAgICAgICAgICByaWdodCA9IHRoYXQuX21lYXN1cmVfcGFydGlhbF9yb3coaSkgLSBsZWZ0ICsgdGhhdC5fcm93X3JlbmRlcmVyLm1hcmdpbl9sZWZ0ICsgbmV3bGluZV93aWR0aDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByaWdodCA9IHRoYXQuX21lYXN1cmVfcGFydGlhbF9yb3coaSwgY3Vyc29yLmVuZF9jaGFyKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBJZiB0aGlzIGlzbid0IHRoZSBmaXJzdCBzZWxlY3RlZCByb3csIG1ha2Ugc3VyZSBhdGxlYXN0IHRoZSBuZXdsaW5lXG4gICAgICAgICAgICAgICAgICAgIC8vIGlzIHZpc2liaWx5IHNlbGVjdGVkIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIHJvdyBieSBtYWtpbmcgc3VyZSB0aGF0XG4gICAgICAgICAgICAgICAgICAgIC8vIHRoZSBzZWxlY3Rpb24gYm94IGlzIGF0bGVhc3QgdGhlIHNpemUgb2YgYSBuZXdsaW5lIGNoYXJhY3RlciAoYXNcbiAgICAgICAgICAgICAgICAgICAgLy8gZGVmaW5lZCBieSB0aGUgdXNlciBjb25maWcpLlxuICAgICAgICAgICAgICAgICAgICBpZiAoaSAhPT0gY3Vyc29yLnN0YXJ0X3Jvdykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmlnaHQgPSBNYXRoLm1heChuZXdsaW5lX3dpZHRoLCByaWdodCk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICByaWdodCA9IHJpZ2h0IC0gbGVmdCArIHRoYXQuX3Jvd19yZW5kZXJlci5tYXJnaW5fbGVmdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdGhhdC5fY2FudmFzLmRyYXdfcmVjdGFuZ2xlKFxuICAgICAgICAgICAgICAgICAgICBsZWZ0LCBcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5fZ2V0X3Jvd190b3AoaSksIFxuICAgICAgICAgICAgICAgICAgICByaWdodCwgXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuX2dldF9yb3dfaGVpZ2h0KGkpLCBcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlsbF9jb2xvcjogc2VsZWN0aW9uX2NvbG9yLFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5TZWxlY3Rpb25zUmVuZGVyZXIgPSBTZWxlY3Rpb25zUmVuZGVyZXI7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxudmFyIGNhbnZhcyA9IHJlcXVpcmUoJy4vY2FudmFzLmpzJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG5cbi8qKlxuICogSFRNTCBjYW52YXMgd2l0aCBkcmF3aW5nIGNvbnZpbmllbmNlIGZ1bmN0aW9ucy5cbiAqL1xudmFyIFNjcm9sbGluZ0NhbnZhcyA9IGZ1bmN0aW9uKCkge1xuICAgIGNhbnZhcy5DYW52YXMuY2FsbCh0aGlzKTtcbiAgICB0aGlzLl9iaW5kX2V2ZW50cygpO1xuICAgIHRoaXMuX29sZF9zY3JvbGxfbGVmdCA9IDA7XG4gICAgdGhpcy5fb2xkX3Njcm9sbF90b3AgPSAwO1xuXG4gICAgLy8gU2V0IGRlZmF1bHQgc2l6ZS5cbiAgICB0aGlzLndpZHRoID0gNDAwO1xuICAgIHRoaXMuaGVpZ2h0ID0gMzAwO1xufTtcbnV0aWxzLmluaGVyaXQoU2Nyb2xsaW5nQ2FudmFzLCBjYW52YXMuQ2FudmFzKTtcblxuLyoqXG4gKiBDYXVzZXMgdGhlIGNhbnZhcyBjb250ZW50cyB0byBiZSByZWRyYXduLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuU2Nyb2xsaW5nQ2FudmFzLnByb3RvdHlwZS5yZWRyYXcgPSBmdW5jdGlvbihzY3JvbGwpIHtcbiAgICB0aGlzLmNsZWFyKCk7XG4gICAgdGhpcy50cmlnZ2VyKCdyZWRyYXcnLCBzY3JvbGwpO1xufTtcblxuLyoqXG4gKiBMYXlvdXQgdGhlIGVsZW1lbnRzIGZvciB0aGUgY2FudmFzLlxuICogQ3JlYXRlcyBgdGhpcy5lbGBcbiAqIFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuU2Nyb2xsaW5nQ2FudmFzLnByb3RvdHlwZS5fbGF5b3V0ID0gZnVuY3Rpb24oKSB7XG4gICAgY2FudmFzLkNhbnZhcy5wcm90b3R5cGUuX2xheW91dC5jYWxsKHRoaXMpO1xuICAgIC8vIENoYW5nZSB0aGUgY2FudmFzIGNsYXNzIHNvIGl0J3Mgbm90IGhpZGRlbi5cbiAgICB0aGlzLl9jYW52YXMuc2V0QXR0cmlidXRlKCdjbGFzcycsICdjYW52YXMnKTtcblxuICAgIHRoaXMuZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB0aGlzLmVsLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAncG9zdGVyIHNjcm9sbC13aW5kb3cnKTtcbiAgICB0aGlzLmVsLnNldEF0dHJpYnV0ZSgndGFiaW5kZXgnLCAwKTtcbiAgICB0aGlzLl9zY3JvbGxfYmFycyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIHRoaXMuX3Njcm9sbF9iYXJzLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnc2Nyb2xsLWJhcnMnKTtcbiAgICB0aGlzLl90b3VjaF9wYW5lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgdGhpcy5fdG91Y2hfcGFuZS5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ3RvdWNoLXBhbmUnKTtcbiAgICB0aGlzLl9kdW1teSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIHRoaXMuX2R1bW15LnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnc2Nyb2xsLWR1bW15Jyk7XG5cbiAgICB0aGlzLmVsLmFwcGVuZENoaWxkKHRoaXMuX2NhbnZhcyk7XG4gICAgdGhpcy5lbC5hcHBlbmRDaGlsZCh0aGlzLl9zY3JvbGxfYmFycyk7XG4gICAgdGhpcy5fc2Nyb2xsX2JhcnMuYXBwZW5kQ2hpbGQodGhpcy5fZHVtbXkpO1xuICAgIHRoaXMuX3Njcm9sbF9iYXJzLmFwcGVuZENoaWxkKHRoaXMuX3RvdWNoX3BhbmUpO1xufTtcblxuLyoqXG4gKiBNYWtlIHRoZSBwcm9wZXJ0aWVzIG9mIHRoZSBjbGFzcy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblNjcm9sbGluZ0NhbnZhcy5wcm90b3R5cGUuX2luaXRfcHJvcGVydGllcyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcblxuICAgIC8qKlxuICAgICAqIFdpZHRoIG9mIHRoZSBzY3JvbGxhYmxlIGNhbnZhcyBhcmVhXG4gICAgICovXG4gICAgdGhpcy5wcm9wZXJ0eSgnc2Nyb2xsX3dpZHRoJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIEdldFxuICAgICAgICByZXR1cm4gdGhhdC5fc2Nyb2xsX3dpZHRoIHx8IDA7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgLy8gU2V0XG4gICAgICAgIHRoYXQuX3Njcm9sbF93aWR0aCA9IHZhbHVlO1xuICAgICAgICB0aGF0Ll9tb3ZlX2R1bW15KHRoYXQuX3Njcm9sbF93aWR0aCwgdGhhdC5fc2Nyb2xsX2hlaWdodCB8fCAwKTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIEhlaWdodCBvZiB0aGUgc2Nyb2xsYWJsZSBjYW52YXMgYXJlYS5cbiAgICAgKi9cbiAgICB0aGlzLnByb3BlcnR5KCdzY3JvbGxfaGVpZ2h0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIEdldFxuICAgICAgICByZXR1cm4gdGhhdC5fc2Nyb2xsX2hlaWdodCB8fCAwO1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIC8vIFNldFxuICAgICAgICB0aGF0Ll9zY3JvbGxfaGVpZ2h0ID0gdmFsdWU7XG4gICAgICAgIHRoYXQuX21vdmVfZHVtbXkodGhhdC5fc2Nyb2xsX3dpZHRoIHx8IDAsIHRoYXQuX3Njcm9sbF9oZWlnaHQpO1xuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogVG9wIG1vc3QgcGl4ZWwgaW4gdGhlIHNjcm9sbGVkIHdpbmRvdy5cbiAgICAgKi9cbiAgICB0aGlzLnByb3BlcnR5KCdzY3JvbGxfdG9wJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIEdldFxuICAgICAgICByZXR1cm4gdGhhdC5fc2Nyb2xsX2JhcnMuc2Nyb2xsVG9wO1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIC8vIFNldFxuICAgICAgICB0aGF0Ll9zY3JvbGxfYmFycy5zY3JvbGxUb3AgPSB2YWx1ZTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIExlZnQgbW9zdCBwaXhlbCBpbiB0aGUgc2Nyb2xsZWQgd2luZG93LlxuICAgICAqL1xuICAgIHRoaXMucHJvcGVydHkoJ3Njcm9sbF9sZWZ0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIEdldFxuICAgICAgICByZXR1cm4gdGhhdC5fc2Nyb2xsX2JhcnMuc2Nyb2xsTGVmdDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAvLyBTZXRcbiAgICAgICAgdGhhdC5fc2Nyb2xsX2JhcnMuc2Nyb2xsTGVmdCA9IHZhbHVlO1xuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogSGVpZ2h0IG9mIHRoZSBjYW52YXNcbiAgICAgKiBAcmV0dXJuIHtmbG9hdH1cbiAgICAgKi9cbiAgICB0aGlzLnByb3BlcnR5KCdoZWlnaHQnLCBmdW5jdGlvbigpIHsgXG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMuaGVpZ2h0IC8gMjsgXG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC5fY2FudmFzLnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgdmFsdWUgKiAyKTtcbiAgICAgICAgdGhhdC5lbC5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgJ3dpZHRoOiAnICsgdGhhdC53aWR0aCArICdweDsgaGVpZ2h0OiAnICsgdmFsdWUgKyAncHg7Jyk7XG5cbiAgICAgICAgdGhhdC50cmlnZ2VyKCdyZXNpemUnLCB7aGVpZ2h0OiB2YWx1ZX0pO1xuICAgICAgICB0aGF0Ll90cnlfcmVkcmF3KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTdHJldGNoIHRoZSBpbWFnZSBmb3IgcmV0aW5hIHN1cHBvcnQuXG4gICAgICAgIHRoaXMuc2NhbGUoMiwyKTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIFdpZHRoIG9mIHRoZSBjYW52YXNcbiAgICAgKiBAcmV0dXJuIHtmbG9hdH1cbiAgICAgKi9cbiAgICB0aGlzLnByb3BlcnR5KCd3aWR0aCcsIGZ1bmN0aW9uKCkgeyBcbiAgICAgICAgcmV0dXJuIHRoYXQuX2NhbnZhcy53aWR0aCAvIDI7IFxuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgdmFsdWUgKiAyKTtcbiAgICAgICAgdGhhdC5lbC5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgJ3dpZHRoOiAnICsgdmFsdWUgKyAncHg7IGhlaWdodDogJyArIHRoYXQuaGVpZ2h0ICsgJ3B4OycpO1xuXG4gICAgICAgIHRoYXQudHJpZ2dlcigncmVzaXplJywge3dpZHRoOiB2YWx1ZX0pO1xuICAgICAgICB0aGF0Ll90cnlfcmVkcmF3KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTdHJldGNoIHRoZSBpbWFnZSBmb3IgcmV0aW5hIHN1cHBvcnQuXG4gICAgICAgIHRoaXMuc2NhbGUoMiwyKTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIElzIHRoZSBjYW52YXMgb3IgcmVsYXRlZCBlbGVtZW50cyBmb2N1c2VkP1xuICAgICAqIEByZXR1cm4ge2Jvb2xlYW59XG4gICAgICovXG4gICAgdGhpcy5wcm9wZXJ0eSgnZm9jdXNlZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gZG9jdW1lbnQuYWN0aXZlRWxlbWVudCA9PT0gdGhhdC5lbCB8fFxuICAgICAgICAgICAgZG9jdW1lbnQuYWN0aXZlRWxlbWVudCA9PT0gdGhhdC5fc2Nyb2xsX2JhcnMgfHxcbiAgICAgICAgICAgIGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQgPT09IHRoYXQuX2R1bW15IHx8XG4gICAgICAgICAgICBkb2N1bWVudC5hY3RpdmVFbGVtZW50ID09PSB0aGF0Ll9jYW52YXM7XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIEJpbmQgdG8gdGhlIGV2ZW50cyBvZiB0aGUgY2FudmFzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuU2Nyb2xsaW5nQ2FudmFzLnByb3RvdHlwZS5fYmluZF9ldmVudHMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG5cbiAgICAvLyBUcmlnZ2VyIHNjcm9sbCBhbmQgcmVkcmF3IGV2ZW50cyBvbiBzY3JvbGwuXG4gICAgdGhpcy5fc2Nyb2xsX2JhcnMub25zY3JvbGwgPSBmdW5jdGlvbihlKSB7XG4gICAgICAgIHRoYXQudHJpZ2dlcignc2Nyb2xsJywgZSk7XG4gICAgICAgIGlmICh0aGF0Ll9vbGRfc2Nyb2xsX3RvcCAhPT0gdW5kZWZpbmVkICYmIHRoYXQuX29sZF9zY3JvbGxfbGVmdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB2YXIgc2Nyb2xsID0ge1xuICAgICAgICAgICAgICAgIHg6IHRoYXQuc2Nyb2xsX2xlZnQgLSB0aGF0Ll9vbGRfc2Nyb2xsX2xlZnQsXG4gICAgICAgICAgICAgICAgeTogdGhhdC5zY3JvbGxfdG9wIC0gdGhhdC5fb2xkX3Njcm9sbF90b3AsXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdGhhdC5fdHJ5X3JlZHJhdyhzY3JvbGwpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhhdC5fdHJ5X3JlZHJhdygpO1xuICAgICAgICB9XG4gICAgICAgIHRoYXQuX29sZF9zY3JvbGxfbGVmdCA9IHRoYXQuc2Nyb2xsX2xlZnQ7XG4gICAgICAgIHRoYXQuX29sZF9zY3JvbGxfdG9wID0gdGhhdC5zY3JvbGxfdG9wO1xuICAgIH07XG5cbiAgICAvLyBQcmV2ZW50IHNjcm9sbCBiYXIgaGFuZGxlZCBtb3VzZSBldmVudHMgZnJvbSBidWJibGluZy5cbiAgICB2YXIgc2Nyb2xsYmFyX2V2ZW50ID0gZnVuY3Rpb24oZSkge1xuICAgICAgICBpZiAoZS50YXJnZXQgIT09IHRoYXQuX3RvdWNoX3BhbmUpIHtcbiAgICAgICAgICAgIHV0aWxzLmNhbmNlbF9idWJibGUoZSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRoaXMuX3Njcm9sbF9iYXJzLm9ubW91c2Vkb3duID0gc2Nyb2xsYmFyX2V2ZW50O1xuICAgIHRoaXMuX3Njcm9sbF9iYXJzLm9ubW91c2V1cCA9IHNjcm9sbGJhcl9ldmVudDtcbiAgICB0aGlzLl9zY3JvbGxfYmFycy5vbmNsaWNrID0gc2Nyb2xsYmFyX2V2ZW50O1xuICAgIHRoaXMuX3Njcm9sbF9iYXJzLm9uZGJsY2xpY2sgPSBzY3JvbGxiYXJfZXZlbnQ7XG59O1xuXG4vKipcbiAqIFF1ZXJpZXMgdG8gc2VlIGlmIHJlZHJhdyBpcyBva2F5LCBhbmQgdGhlbiByZWRyYXdzIGlmIGl0IGlzLlxuICogQHJldHVybiB7Ym9vbGVhbn0gdHJ1ZSBpZiByZWRyYXcgaGFwcGVuZWQuXG4gKi9cblNjcm9sbGluZ0NhbnZhcy5wcm90b3R5cGUuX3RyeV9yZWRyYXcgPSBmdW5jdGlvbihzY3JvbGwpIHtcbiAgICBpZiAodGhpcy5fcXVlcnlfcmVkcmF3KCkpIHtcbiAgICAgICAgdGhpcy5yZWRyYXcoc2Nyb2xsKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn07XG5cbi8qKlxuICogVHJpZ2dlciB0aGUgJ3F1ZXJ5X3JlZHJhdycgZXZlbnQuXG4gKiBAcmV0dXJuIHtib29sZWFufSB0cnVlIGlmIGNvbnRyb2wgc2hvdWxkIHJlZHJhdyBpdHNlbGYuXG4gKi9cblNjcm9sbGluZ0NhbnZhcy5wcm90b3R5cGUuX3F1ZXJ5X3JlZHJhdyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnRyaWdnZXIoJ3F1ZXJ5X3JlZHJhdycpLmV2ZXJ5KGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHg7IH0pOyBcbn07XG5cbi8qKlxuICogTW92ZXMgdGhlIGR1bW15IGVsZW1lbnQgdGhhdCBjYXVzZXMgdGhlIHNjcm9sbGJhciB0byBhcHBlYXIuXG4gKiBAcGFyYW0gIHtmbG9hdH0geFxuICogQHBhcmFtICB7ZmxvYXR9IHlcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblNjcm9sbGluZ0NhbnZhcy5wcm90b3R5cGUuX21vdmVfZHVtbXkgPSBmdW5jdGlvbih4LCB5KSB7XG4gICAgdGhpcy5fZHVtbXkuc2V0QXR0cmlidXRlKCdzdHlsZScsICdsZWZ0OiAnICsgU3RyaW5nKHgpICsgJ3B4OyB0b3A6ICcgKyBTdHJpbmcoeSkgKyAncHg7Jyk7XG4gICAgdGhpcy5fdG91Y2hfcGFuZS5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgXG4gICAgICAgICd3aWR0aDogJyArIFN0cmluZyhNYXRoLm1heCh4LCB0aGlzLl9zY3JvbGxfYmFycy5jbGllbnRXaWR0aCkpICsgJ3B4OyAnICtcbiAgICAgICAgJ2hlaWdodDogJyArIFN0cmluZyhNYXRoLm1heCh5LCB0aGlzLl9zY3JvbGxfYmFycy5jbGllbnRIZWlnaHQpKSArICdweDsnKTtcbn07XG5cbi8qKlxuICogVHJhbnNmb3JtIGFuIHggdmFsdWUgYmFzZWQgb24gc2Nyb2xsIHBvc2l0aW9uLlxuICogQHBhcmFtICB7ZmxvYXR9IHhcbiAqIEBwYXJhbSAge2Jvb2xlYW59IGludmVyc2UgLSBwZXJmb3JtIGludmVyc2UgdHJhbnNmb3JtYXRpb25cbiAqIEByZXR1cm4ge2Zsb2F0fVxuICovXG5TY3JvbGxpbmdDYW52YXMucHJvdG90eXBlLl90eCA9IGZ1bmN0aW9uKHgsIGludmVyc2UpIHsgcmV0dXJuIHggLSAoaW52ZXJzZT8tMToxKSAqIHRoaXMuc2Nyb2xsX2xlZnQ7IH07XG5cbi8qKlxuICogVHJhbnNmb3JtIGEgeSB2YWx1ZSBiYXNlZCBvbiBzY3JvbGwgcG9zaXRpb24uXG4gKiBAcGFyYW0gIHtmbG9hdH0geVxuICogQHBhcmFtICB7Ym9vbGVhbn0gaW52ZXJzZSAtIHBlcmZvcm0gaW52ZXJzZSB0cmFuc2Zvcm1hdGlvblxuICogQHJldHVybiB7ZmxvYXR9XG4gKi9cblNjcm9sbGluZ0NhbnZhcy5wcm90b3R5cGUuX3R5ID0gZnVuY3Rpb24oeSwgaW52ZXJzZSkgeyByZXR1cm4geSAtIChpbnZlcnNlPy0xOjEpICogdGhpcy5zY3JvbGxfdG9wOyB9O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLlNjcm9sbGluZ0NhbnZhcyA9IFNjcm9sbGluZ0NhbnZhcztcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcbnZhciBzdHlsZXMgPSByZXF1aXJlKCcuL3N0eWxlcy9pbml0LmpzJyk7XG5cbi8qKlxuICogU3R5bGVcbiAqL1xudmFyIFN0eWxlID0gZnVuY3Rpb24oKSB7XG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzLCBbXG4gICAgICAgICdjb21tZW50JyxcbiAgICAgICAgJ3N0cmluZycsXG4gICAgICAgICdjbGFzcy1uYW1lJyxcbiAgICAgICAgJ2tleXdvcmQnLFxuICAgICAgICAnYm9vbGVhbicsXG4gICAgICAgICdmdW5jdGlvbicsXG4gICAgICAgICdvcGVyYXRvcicsXG4gICAgICAgICdudW1iZXInLFxuICAgICAgICAnaWdub3JlJyxcbiAgICAgICAgJ3B1bmN0dWF0aW9uJyxcblxuICAgICAgICAnY3Vyc29yJyxcbiAgICAgICAgJ2N1cnNvcl93aWR0aCcsXG4gICAgICAgICdjdXJzb3JfaGVpZ2h0JyxcbiAgICAgICAgJ3NlbGVjdGlvbicsXG4gICAgICAgICdzZWxlY3Rpb25fdW5mb2N1c2VkJyxcblxuICAgICAgICAndGV4dCcsXG4gICAgICAgICdiYWNrZ3JvdW5kJyxcbiAgICBdKTtcblxuICAgIC8vIExvYWQgdGhlIGRlZmF1bHQgc3R5bGUuXG4gICAgdGhpcy5sb2FkKCdwZWFjb2NrJyk7XG59O1xudXRpbHMuaW5oZXJpdChTdHlsZSwgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vKipcbiAqIExvYWQgYSByZW5kZXJpbmcgc3R5bGVcbiAqIEBwYXJhbSAge3N0cmluZyBvciBkaWN0aW9uYXJ5fSBzdHlsZSAtIG5hbWUgb2YgdGhlIGJ1aWx0LWluIHN0eWxlIFxuICogICAgICAgICBvciBzdHlsZSBkaWN0aW9uYXJ5IGl0c2VsZi5cbiAqIEByZXR1cm4ge2Jvb2xlYW59IHN1Y2Nlc3NcbiAqL1xuU3R5bGUucHJvdG90eXBlLmxvYWQgPSBmdW5jdGlvbihzdHlsZSkge1xuICAgIHRyeSB7XG4gICAgICAgIC8vIExvYWQgdGhlIHN0eWxlIGlmIGl0J3MgYnVpbHQtaW4uXG4gICAgICAgIGlmIChzdHlsZXMuc3R5bGVzW3N0eWxlXSkge1xuICAgICAgICAgICAgc3R5bGUgPSBzdHlsZXMuc3R5bGVzW3N0eWxlXS5zdHlsZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlYWQgZWFjaCBhdHRyaWJ1dGUgb2YgdGhlIHN0eWxlLlxuICAgICAgICBmb3IgKHZhciBrZXkgaW4gc3R5bGUpIHtcbiAgICAgICAgICAgIGlmIChzdHlsZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICAgICAgdGhpc1trZXldID0gc3R5bGVba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBsb2FkaW5nIHN0eWxlJywgZSk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59O1xuXG5leHBvcnRzLlN0eWxlID0gU3R5bGU7IiwiZXhwb3J0cy5zdHlsZXMgPSB7XG4gICAgXCJwZWFjb2NrXCI6IHJlcXVpcmUoXCIuL3BlYWNvY2suanNcIiksXG59O1xuIiwiZXhwb3J0cy5zdHlsZSA9IHtcbiAgICBjb21tZW50OiAnIzdhNzI2NycsXG4gICAgc3RyaW5nOiAnI2JjZDQyYScsXG4gICAgJ2NsYXNzLW5hbWUnOiAnI2VkZTBjZScsXG4gICAga2V5d29yZDogJyMyNkE2QTYnLFxuICAgIGJvb2xlYW46ICcjYmNkNDJhJyxcbiAgICBmdW5jdGlvbjogJyNmZjVkMzgnLFxuICAgIG9wZXJhdG9yOiAnIzI2QTZBNicsXG4gICAgbnVtYmVyOiAnI2JjZDQyYScsXG4gICAgaWdub3JlOiAnI2NjY2NjYycsXG4gICAgcHVuY3R1YXRpb246ICcjZWRlMGNlJyxcblxuICAgIGN1cnNvcjogJyNmOGY4ZjAnLFxuICAgIGN1cnNvcl93aWR0aDogMS4wLFxuICAgIGN1cnNvcl9oZWlnaHQ6IDEuMSxcbiAgICBzZWxlY3Rpb246ICcjZmY1ZDM4JyxcbiAgICBzZWxlY3Rpb25fdW5mb2N1c2VkOiAnI2VmNGQyOCcsXG5cbiAgICB0ZXh0OiAnI2VkZTBjZScsXG4gICAgYmFja2dyb3VuZDogJyMyYjJhMjcnLFxufTtcblxuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxuLyoqXG4gKiBCYXNlIGNsYXNzIHdpdGggaGVscGZ1bCB1dGlsaXRpZXNcbiAqIEBwYXJhbSB7YXJyYXl9IFtldmVudGZ1bF9wcm9wZXJ0aWVzXSBsaXN0IG9mIHByb3BlcnR5IG5hbWVzIChzdHJpbmdzKVxuICogICAgICAgICAgICAgICAgdG8gY3JlYXRlIGFuZCB3aXJlIGNoYW5nZSBldmVudHMgdG8uXG4gKi9cbnZhciBQb3N0ZXJDbGFzcyA9IGZ1bmN0aW9uKGV2ZW50ZnVsX3Byb3BlcnRpZXMpIHtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICB0aGlzLl9vbl9hbGwgPSBbXTtcblxuICAgIC8vIENvbnN0cnVjdCBldmVudGZ1bCBwcm9wZXJ0aWVzLlxuICAgIGlmIChldmVudGZ1bF9wcm9wZXJ0aWVzICYmIGV2ZW50ZnVsX3Byb3BlcnRpZXMubGVuZ3RoPjApIHtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICBmb3IgKHZhciBpPTA7IGk8ZXZlbnRmdWxfcHJvcGVydGllcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgICAgICAgICB0aGF0LnByb3BlcnR5KG5hbWUsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhhdFsnXycgKyBuYW1lXTtcbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICB0aGF0LnRyaWdnZXIoJ2NoYW5nZTonICsgbmFtZSwgdmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB0aGF0LnRyaWdnZXIoJ2NoYW5nZScsIG5hbWUsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgdGhhdFsnXycgKyBuYW1lXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICB0aGF0LnRyaWdnZXIoJ2NoYW5nZWQ6JyArIG5hbWUpO1xuICAgICAgICAgICAgICAgICAgICB0aGF0LnRyaWdnZXIoJ2NoYW5nZWQnLCBuYW1lKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pKGV2ZW50ZnVsX3Byb3BlcnRpZXNbaV0pO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuLyoqXG4gKiBEZWZpbmUgYSBwcm9wZXJ0eSBmb3IgdGhlIGNsYXNzXG4gKiBAcGFyYW0gIHtzdHJpbmd9IG5hbWVcbiAqIEBwYXJhbSAge2Z1bmN0aW9ufSBnZXR0ZXJcbiAqIEBwYXJhbSAge2Z1bmN0aW9ufSBzZXR0ZXJcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblBvc3RlckNsYXNzLnByb3RvdHlwZS5wcm9wZXJ0eSA9IGZ1bmN0aW9uKG5hbWUsIGdldHRlciwgc2V0dGVyKSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIG5hbWUsIHtcbiAgICAgICAgZ2V0OiBnZXR0ZXIsXG4gICAgICAgIHNldDogc2V0dGVyLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICB9KTtcbn07XG5cbi8qKlxuICogUmVnaXN0ZXIgYW4gZXZlbnQgbGlzdGVuZXJcbiAqIEBwYXJhbSAge3N0cmluZ30gZXZlbnRcbiAqIEBwYXJhbSAge2Z1bmN0aW9ufSBoYW5kbGVyXG4gKiBAcGFyYW0gIHtvYmplY3R9IGNvbnRleHRcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblBvc3RlckNsYXNzLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uKGV2ZW50LCBoYW5kbGVyLCBjb250ZXh0KSB7XG4gICAgZXZlbnQgPSBldmVudC50cmltKCkudG9Mb3dlckNhc2UoKTtcblxuICAgIC8vIE1ha2Ugc3VyZSBhIGxpc3QgZm9yIHRoZSBldmVudCBleGlzdHMuXG4gICAgaWYgKCF0aGlzLl9ldmVudHNbZXZlbnRdKSB7IHRoaXMuX2V2ZW50c1tldmVudF0gPSBbXTsgfVxuXG4gICAgLy8gUHVzaCB0aGUgaGFuZGxlciBhbmQgdGhlIGNvbnRleHQgdG8gdGhlIGV2ZW50J3MgY2FsbGJhY2sgbGlzdC5cbiAgICB0aGlzLl9ldmVudHNbZXZlbnRdLnB1c2goW2hhbmRsZXIsIGNvbnRleHRdKTtcbn07XG5cbi8qKlxuICogVW5yZWdpc3RlciBvbmUgb3IgYWxsIGV2ZW50IGxpc3RlbmVycyBmb3IgYSBzcGVjaWZpYyBldmVudFxuICogQHBhcmFtICB7c3RyaW5nfSBldmVudFxuICogQHBhcmFtICB7Y2FsbGJhY2t9IChvcHRpb25hbCkgaGFuZGxlclxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuUG9zdGVyQ2xhc3MucHJvdG90eXBlLm9mZiA9IGZ1bmN0aW9uKGV2ZW50LCBoYW5kbGVyKSB7XG4gICAgZXZlbnQgPSBldmVudC50cmltKCkudG9Mb3dlckNhc2UoKTtcbiAgICBcbiAgICAvLyBJZiBhIGhhbmRsZXIgaXMgc3BlY2lmaWVkLCByZW1vdmUgYWxsIHRoZSBjYWxsYmFja3NcbiAgICAvLyB3aXRoIHRoYXQgaGFuZGxlci4gIE90aGVyd2lzZSwganVzdCByZW1vdmUgYWxsIG9mXG4gICAgLy8gdGhlIHJlZ2lzdGVyZWQgY2FsbGJhY2tzLlxuICAgIGlmIChoYW5kbGVyKSB7XG4gICAgICAgIHRoaXMuX2V2ZW50c1tldmVudF0gPSB0aGlzLl9ldmVudHNbZXZlbnRdLmZpbHRlcihmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrWzBdICE9PSBoYW5kbGVyO1xuICAgICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9ldmVudHNbZXZlbnRdID0gW107XG4gICAgfVxufTtcblxuLyoqXG4gKiBSZWdpc3RlciBhIGdsb2JhbCBldmVudCBoYW5kbGVyLiBcbiAqIFxuICogQSBnbG9iYWwgZXZlbnQgaGFuZGxlciBmaXJlcyBmb3IgYW55IGV2ZW50IHRoYXQnc1xuICogdHJpZ2dlcmVkLlxuICogQHBhcmFtICB7c3RyaW5nfSBoYW5kbGVyIC0gZnVuY3Rpb24gdGhhdCBhY2NlcHRzIG9uZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJndW1lbnQsIHRoZSBuYW1lIG9mIHRoZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQsXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Qb3N0ZXJDbGFzcy5wcm90b3R5cGUub25fYWxsID0gZnVuY3Rpb24oaGFuZGxlcikge1xuICAgIHZhciBpbmRleCA9IHRoaXMuX29uX2FsbC5pbmRleE9mKGhhbmRsZXIpO1xuICAgIGlmIChpbmRleCA9PT0gLTEpIHtcbiAgICAgICAgdGhpcy5fb25fYWxsLnB1c2goaGFuZGxlcik7XG4gICAgfVxufTtcblxuLyoqXG4gKiBVbnJlZ2lzdGVyIGEgZ2xvYmFsIGV2ZW50IGhhbmRsZXIuXG4gKiBAcGFyYW0gIHtbdHlwZV19IGhhbmRsZXJcbiAqIEByZXR1cm4ge2Jvb2xlYW59IHRydWUgaWYgYSBoYW5kbGVyIHdhcyByZW1vdmVkXG4gKi9cblBvc3RlckNsYXNzLnByb3RvdHlwZS5vZmZfYWxsID0gZnVuY3Rpb24oaGFuZGxlcikge1xuICAgIHZhciBpbmRleCA9IHRoaXMuX29uX2FsbC5pbmRleE9mKGhhbmRsZXIpO1xuICAgIGlmIChpbmRleCAhPSAtMSkge1xuICAgICAgICB0aGlzLl9vbl9hbGwuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn07XG5cbi8qKlxuICogVHJpZ2dlcnMgdGhlIGNhbGxiYWNrcyBvZiBhbiBldmVudCB0byBmaXJlLlxuICogQHBhcmFtICB7c3RyaW5nfSBldmVudFxuICogQHJldHVybiB7YXJyYXl9IGFycmF5IG9mIHJldHVybiB2YWx1ZXNcbiAqL1xuUG9zdGVyQ2xhc3MucHJvdG90eXBlLnRyaWdnZXIgPSBmdW5jdGlvbihldmVudCkge1xuICAgIGV2ZW50ID0gZXZlbnQudHJpbSgpLnRvTG93ZXJDYXNlKCk7XG5cbiAgICAvLyBDb252ZXJ0IGFyZ3VtZW50cyB0byBhbiBhcnJheSBhbmQgY2FsbCBjYWxsYmFja3MuXG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgIGFyZ3Muc3BsaWNlKDAsMSk7XG5cbiAgICAvLyBUcmlnZ2VyIGdsb2JhbCBoYW5kbGVycyBmaXJzdC5cbiAgICB0aGlzLl9vbl9hbGwuZm9yRWFjaChmdW5jdGlvbihoYW5kbGVyKSB7XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgW2V2ZW50XS5jb25jYXQoYXJncykpO1xuICAgIH0pO1xuXG4gICAgLy8gVHJpZ2dlciBpbmRpdmlkdWFsIGhhbmRsZXJzIHNlY29uZC5cbiAgICB2YXIgZXZlbnRzID0gdGhpcy5fZXZlbnRzW2V2ZW50XTtcbiAgICBpZiAoZXZlbnRzKSB7XG4gICAgICAgIHZhciByZXR1cm5zID0gW107XG4gICAgICAgIGV2ZW50cy5mb3JFYWNoKGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICByZXR1cm5zLnB1c2goY2FsbGJhY2tbMF0uYXBwbHkoY2FsbGJhY2tbMV0sIGFyZ3MpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiByZXR1cm5zO1xuICAgIH1cbiAgICByZXR1cm4gW107XG59O1xuXG4vKipcbiAqIENhdXNlIG9uZSBjbGFzcyB0byBpbmhlcml0IGZyb20gYW5vdGhlclxuICogQHBhcmFtICB7dHlwZX0gY2hpbGRcbiAqIEBwYXJhbSAge3R5cGV9IHBhcmVudFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xudmFyIGluaGVyaXQgPSBmdW5jdGlvbihjaGlsZCwgcGFyZW50KSB7XG4gICAgY2hpbGQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShwYXJlbnQucHJvdG90eXBlLCB7fSk7XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiBhIHZhbHVlIGlzIGNhbGxhYmxlXG4gKiBAcGFyYW0gIHthbnl9IHZhbHVlXG4gKiBAcmV0dXJuIHtib29sZWFufVxuICovXG52YXIgY2FsbGFibGUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT0gJ2Z1bmN0aW9uJztcbn07XG5cbi8qKlxuICogQ2FsbHMgdGhlIHZhbHVlIGlmIGl0J3MgY2FsbGFibGUgYW5kIHJldHVybnMgaXQncyByZXR1cm4uXG4gKiBPdGhlcndpc2UgcmV0dXJucyB0aGUgdmFsdWUgYXMtaXMuXG4gKiBAcGFyYW0gIHthbnl9IHZhbHVlXG4gKiBAcmV0dXJuIHthbnl9XG4gKi9cbnZhciByZXNvbHZlX2NhbGxhYmxlID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICBpZiAoY2FsbGFibGUodmFsdWUpKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZS5jYWxsKHRoaXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYSBwcm94eSB0byBhIGZ1bmN0aW9uIHNvIGl0IGlzIGNhbGxlZCBpbiB0aGUgY29ycmVjdCBjb250ZXh0LlxuICogQHJldHVybiB7ZnVuY3Rpb259IHByb3hpZWQgZnVuY3Rpb24uXG4gKi9cbnZhciBwcm94eSA9IGZ1bmN0aW9uKGYsIGNvbnRleHQpIHtcbiAgICBpZiAoZj09PXVuZGVmaW5lZCkgeyB0aHJvdyBuZXcgRXJyb3IoJ2YgY2Fubm90IGJlIHVuZGVmaW5lZCcpOyB9XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkgeyByZXR1cm4gZi5hcHBseShjb250ZXh0LCBhcmd1bWVudHMpOyB9O1xufTtcblxuLyoqXG4gKiBDbGVhcnMgYW4gYXJyYXkgaW4gcGxhY2UuXG4gKlxuICogRGVzcGl0ZSBhbiBPKE4pIGNvbXBsZXhpdHksIHRoaXMgc2VlbXMgdG8gYmUgdGhlIGZhc3Rlc3Qgd2F5IHRvIGNsZWFyXG4gKiBhIGxpc3QgaW4gcGxhY2UgaW4gSmF2YXNjcmlwdC4gXG4gKiBCZW5jaG1hcms6IGh0dHA6Ly9qc3BlcmYuY29tL2VtcHR5LWphdmFzY3JpcHQtYXJyYXlcbiAqIENvbXBsZXhpdHk6IE8oTilcbiAqIEBwYXJhbSAge2FycmF5fSBhcnJheVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xudmFyIGNsZWFyX2FycmF5ID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgICB3aGlsZSAoYXJyYXkubGVuZ3RoID4gMCkge1xuICAgICAgICBhcnJheS5wb3AoKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiBhIHZhbHVlIGlzIGFuIGFycmF5XG4gKiBAcGFyYW0gIHthbnl9IHhcbiAqIEByZXR1cm4ge2Jvb2xlYW59IHRydWUgaWYgdmFsdWUgaXMgYW4gYXJyYXlcbiAqL1xudmFyIGlzX2FycmF5ID0gZnVuY3Rpb24oeCkge1xuICAgIHJldHVybiB4IGluc3RhbmNlb2YgQXJyYXk7XG59O1xuXG4vKipcbiAqIEZpbmQgdGhlIGNsb3Nlc3QgdmFsdWUgaW4gYSBsaXN0XG4gKiBcbiAqIEludGVycG9sYXRpb24gc2VhcmNoIGFsZ29yaXRobS4gIFxuICogQ29tcGxleGl0eTogTyhsZyhsZyhOKSkpXG4gKiBAcGFyYW0gIHthcnJheX0gc29ydGVkIC0gc29ydGVkIGFycmF5IG9mIG51bWJlcnNcbiAqIEBwYXJhbSAge2Zsb2F0fSB4IC0gbnVtYmVyIHRvIHRyeSB0byBmaW5kXG4gKiBAcmV0dXJuIHtpbnRlZ2VyfSBpbmRleCBvZiB0aGUgdmFsdWUgdGhhdCdzIGNsb3Nlc3QgdG8geFxuICovXG52YXIgZmluZF9jbG9zZXN0ID0gZnVuY3Rpb24oc29ydGVkLCB4KSB7XG4gICAgdmFyIG1pbiA9IHNvcnRlZFswXTtcbiAgICB2YXIgbWF4ID0gc29ydGVkW3NvcnRlZC5sZW5ndGgtMV07XG4gICAgaWYgKHggPCBtaW4pIHJldHVybiAwO1xuICAgIGlmICh4ID4gbWF4KSByZXR1cm4gc29ydGVkLmxlbmd0aC0xO1xuICAgIGlmIChzb3J0ZWQubGVuZ3RoID09IDIpIHtcbiAgICAgICAgaWYgKG1heCAtIHggPiB4IC0gbWluKSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9XG4gICAgfVxuICAgIHZhciByYXRlID0gKG1heCAtIG1pbikgLyBzb3J0ZWQubGVuZ3RoO1xuICAgIGlmIChyYXRlID09PSAwKSByZXR1cm4gMDtcbiAgICB2YXIgZ3Vlc3MgPSBNYXRoLmZsb29yKHggLyByYXRlKTtcbiAgICBpZiAoc29ydGVkW2d1ZXNzXSA9PSB4KSB7XG4gICAgICAgIHJldHVybiBndWVzcztcbiAgICB9IGVsc2UgaWYgKGd1ZXNzID4gMCAmJiBzb3J0ZWRbZ3Vlc3MtMV0gPCB4ICYmIHggPCBzb3J0ZWRbZ3Vlc3NdKSB7XG4gICAgICAgIHJldHVybiBmaW5kX2Nsb3Nlc3Qoc29ydGVkLnNsaWNlKGd1ZXNzLTEsIGd1ZXNzKzEpLCB4KSArIGd1ZXNzLTE7XG4gICAgfSBlbHNlIGlmIChndWVzcyA8IHNvcnRlZC5sZW5ndGgtMSAmJiBzb3J0ZWRbZ3Vlc3NdIDwgeCAmJiB4IDwgc29ydGVkW2d1ZXNzKzFdKSB7XG4gICAgICAgIHJldHVybiBmaW5kX2Nsb3Nlc3Qoc29ydGVkLnNsaWNlKGd1ZXNzLCBndWVzcysyKSwgeCkgKyBndWVzcztcbiAgICB9IGVsc2UgaWYgKHNvcnRlZFtndWVzc10gPiB4KSB7XG4gICAgICAgIHJldHVybiBmaW5kX2Nsb3Nlc3Qoc29ydGVkLnNsaWNlKDAsIGd1ZXNzKSwgeCk7XG4gICAgfSBlbHNlIGlmIChzb3J0ZWRbZ3Vlc3NdIDwgeCkge1xuICAgICAgICByZXR1cm4gZmluZF9jbG9zZXN0KHNvcnRlZC5zbGljZShndWVzcysxKSwgeCkgKyBndWVzcysxO1xuICAgIH1cbn07XG5cbi8qKlxuICogTWFrZSBhIHNoYWxsb3cgY29weSBvZiBhIGRpY3Rpb25hcnkuXG4gKiBAcGFyYW0gIHtkaWN0aW9uYXJ5fSB4XG4gKiBAcmV0dXJuIHtkaWN0aW9uYXJ5fVxuICovXG52YXIgc2hhbGxvd19jb3B5ID0gZnVuY3Rpb24oeCkge1xuICAgIHZhciB5ID0ge307XG4gICAgZm9yICh2YXIga2V5IGluIHgpIHtcbiAgICAgICAgaWYgKHguaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgeVtrZXldID0geFtrZXldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB5O1xufTtcblxuLyoqXG4gKiBIb29rcyBhIGZ1bmN0aW9uLlxuICogQHBhcmFtICB7b2JqZWN0fSBvYmogLSBvYmplY3QgdG8gaG9va1xuICogQHBhcmFtICB7c3RyaW5nfSBtZXRob2QgLSBuYW1lIG9mIHRoZSBmdW5jdGlvbiB0byBob29rXG4gKiBAcGFyYW0gIHtmdW5jdGlvbn0gaG9vayAtIGZ1bmN0aW9uIHRvIGNhbGwgYmVmb3JlIHRoZSBvcmlnaW5hbFxuICogQHJldHVybiB7b2JqZWN0fSBob29rIHJlZmVyZW5jZSwgb2JqZWN0IHdpdGggYW4gYHVuaG9va2AgbWV0aG9kXG4gKi9cbnZhciBob29rID0gZnVuY3Rpb24ob2JqLCBtZXRob2QsIGhvb2spIHtcblxuICAgIC8vIElmIHRoZSBvcmlnaW5hbCBoYXMgYWxyZWFkeSBiZWVuIGhvb2tlZCwgYWRkIHRoaXMgaG9vayB0byB0aGUgbGlzdCBcbiAgICAvLyBvZiBob29rcy5cbiAgICBpZiAob2JqW21ldGhvZF0gJiYgb2JqW21ldGhvZF0ub3JpZ2luYWwgJiYgb2JqW21ldGhvZF0uaG9va3MpIHtcbiAgICAgICAgb2JqW21ldGhvZF0uaG9va3MucHVzaChob29rKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBDcmVhdGUgdGhlIGhvb2tlZCBmdW5jdGlvblxuICAgICAgICB2YXIgaG9va3MgPSBbaG9va107XG4gICAgICAgIHZhciBvcmlnaW5hbCA9IG9ialttZXRob2RdO1xuICAgICAgICB2YXIgaG9va2VkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgICAgICAgIHZhciByZXQ7XG4gICAgICAgICAgICB2YXIgcmVzdWx0cztcbiAgICAgICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgICAgIGhvb2tzLmZvckVhY2goZnVuY3Rpb24oaG9vaykge1xuICAgICAgICAgICAgICAgIHJlc3VsdHMgPSBob29rLmFwcGx5KHRoYXQsIGFyZ3MpO1xuICAgICAgICAgICAgICAgIHJldCA9IHJldCAhPT0gdW5kZWZpbmVkID8gcmV0IDogcmVzdWx0cztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKG9yaWdpbmFsKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0cyA9IG9yaWdpbmFsLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJldCAhPT0gdW5kZWZpbmVkID8gcmV0IDogcmVzdWx0cztcbiAgICAgICAgfTtcbiAgICAgICAgaG9va2VkLm9yaWdpbmFsID0gb3JpZ2luYWw7XG4gICAgICAgIGhvb2tlZC5ob29rcyA9IGhvb2tzO1xuICAgICAgICBvYmpbbWV0aG9kXSA9IGhvb2tlZDtcbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gdW5ob29rIG1ldGhvZC5cbiAgICByZXR1cm4ge1xuICAgICAgICB1bmhvb2s6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGluZGV4ID0gb2JqW21ldGhvZF0uaG9va3MuaW5kZXhPZihob29rKTtcbiAgICAgICAgICAgIGlmIChpbmRleCAhPSAtMSkge1xuICAgICAgICAgICAgICAgIG9ialttZXRob2RdLmhvb2tzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChvYmpbbWV0aG9kXS5ob29rcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICBvYmpbbWV0aG9kXSA9IG9ialttZXRob2RdLm9yaWdpbmFsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgIH07XG4gICAgXG59O1xuXG4vKipcbiAqIENhbmNlbHMgZXZlbnQgYnViYmxpbmcuXG4gKiBAcGFyYW0gIHtldmVudH0gZVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xudmFyIGNhbmNlbF9idWJibGUgPSBmdW5jdGlvbihlKSB7XG4gICAgaWYgKGUuc3RvcFByb3BhZ2F0aW9uKSBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIGlmIChlLmNhbmNlbEJ1YmJsZSAhPT0gbnVsbCkgZS5jYW5jZWxCdWJibGUgPSB0cnVlO1xuICAgIGlmIChlLnByZXZlbnREZWZhdWx0KSBlLnByZXZlbnREZWZhdWx0KCk7XG59O1xuXG4vKipcbiAqIEdlbmVyYXRlcyBhIHJhbmRvbSBjb2xvciBzdHJpbmdcbiAqIEByZXR1cm4ge3N0cmluZ30gaGV4YWRlY2ltYWwgY29sb3Igc3RyaW5nXG4gKi9cbnZhciByYW5kb21fY29sb3IgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcmFuZG9tX2J5dGUgPSBmdW5jdGlvbigpIHsgXG4gICAgICAgIHZhciBiID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogMjU1KS50b1N0cmluZygxNik7XG4gICAgICAgIHJldHVybiBiLmxlbmd0aCA9PSAxID8gJzAnICsgYiA6IGI7XG4gICAgfTtcbiAgICByZXR1cm4gJyMnICsgcmFuZG9tX2J5dGUoKSArIHJhbmRvbV9ieXRlKCkgKyByYW5kb21fYnl0ZSgpO1xufTtcblxuLyoqXG4gKiBDb21wYXJlIHR3byBhcnJheXMgYnkgY29udGVudHMgZm9yIGVxdWFsaXR5LlxuICogQHBhcmFtICB7YXJyYXl9IHhcbiAqIEBwYXJhbSAge2FycmF5fSB5XG4gKiBAcmV0dXJuIHtib29sZWFufVxuICovXG52YXIgY29tcGFyZV9hcnJheXMgPSBmdW5jdGlvbih4LCB5KSB7XG4gICAgaWYgKHgubGVuZ3RoICE9IHkubGVuZ3RoKSByZXR1cm4gZmFsc2U7XG4gICAgZm9yIChpPTA7IGk8eC5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoeFtpXSE9PXlbaV0pIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIEZpbmQgYWxsIHRoZSBvY2N1cmFuY2VzIG9mIGEgcmVndWxhciBleHByZXNzaW9uIGluc2lkZSBhIHN0cmluZy5cbiAqIEBwYXJhbSAge3N0cmluZ30gdGV4dCAtIHN0cmluZyB0byBsb29rIGluXG4gKiBAcGFyYW0gIHtzdHJpbmd9IHJlIC0gcmVndWxhciBleHByZXNzaW9uIHRvIGZpbmRcbiAqIEByZXR1cm4ge2FycmF5fSBhcnJheSBvZiBbc3RhcnRfaW5kZXgsIGVuZF9pbmRleF0gcGFpcnNcbiAqL1xudmFyIGZpbmRhbGwgPSBmdW5jdGlvbih0ZXh0LCByZSwgZmxhZ3MpIHtcbiAgICByZSA9IG5ldyBSZWdFeHAocmUsIGZsYWdzIHx8ICdnbScpO1xuICAgIHZhciByZXN1bHRzO1xuICAgIHZhciBmb3VuZCA9IFtdO1xuICAgIHdoaWxlICgocmVzdWx0cyA9IHJlLmV4ZWModGV4dCkpICE9PSBudWxsKSB7XG4gICAgICAgIHZhciBlbmRfaW5kZXggPSByZXN1bHRzLmluZGV4ICsgKHJlc3VsdHNbMF0ubGVuZ3RoIHx8IDEpO1xuICAgICAgICBmb3VuZC5wdXNoKFtyZXN1bHRzLmluZGV4LCBlbmRfaW5kZXhdKTtcbiAgICAgICAgcmUubGFzdEluZGV4ID0gTWF0aC5tYXgoZW5kX2luZGV4LCByZS5sYXN0SW5kZXgpO1xuICAgIH1cbiAgICByZXR1cm4gZm91bmQ7XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiB0aGUgY2hhcmFjdGVyIGlzbid0IHRleHQuXG4gKiBAcGFyYW0gIHtjaGFyfSBjIC0gY2hhcmFjdGVyXG4gKiBAcmV0dXJuIHtib29sZWFufSB0cnVlIGlmIHRoZSBjaGFyYWN0ZXIgaXMgbm90IHRleHQuXG4gKi9cbnZhciBub3RfdGV4dCA9IGZ1bmN0aW9uKGMpIHtcbiAgICByZXR1cm4gJ2FiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MTIzNDU2Nzg5MF8nLmluZGV4T2YoYy50b0xvd2VyQ2FzZSgpKSA9PSAtMTtcbn07XG5cbi8vIEV4cG9ydCBuYW1lcy5cbmV4cG9ydHMuUG9zdGVyQ2xhc3MgPSBQb3N0ZXJDbGFzcztcbmV4cG9ydHMuaW5oZXJpdCA9IGluaGVyaXQ7XG5leHBvcnRzLmNhbGxhYmxlID0gY2FsbGFibGU7XG5leHBvcnRzLnJlc29sdmVfY2FsbGFibGUgPSByZXNvbHZlX2NhbGxhYmxlO1xuZXhwb3J0cy5wcm94eSA9IHByb3h5O1xuZXhwb3J0cy5jbGVhcl9hcnJheSA9IGNsZWFyX2FycmF5O1xuZXhwb3J0cy5pc19hcnJheSA9IGlzX2FycmF5O1xuZXhwb3J0cy5maW5kX2Nsb3Nlc3QgPSBmaW5kX2Nsb3Nlc3Q7XG5leHBvcnRzLnNoYWxsb3dfY29weSA9IHNoYWxsb3dfY29weTtcbmV4cG9ydHMuaG9vayA9IGhvb2s7XG5leHBvcnRzLmNhbmNlbF9idWJibGUgPSBjYW5jZWxfYnViYmxlO1xuZXhwb3J0cy5yYW5kb21fY29sb3IgPSByYW5kb21fY29sb3I7XG5leHBvcnRzLmNvbXBhcmVfYXJyYXlzID0gY29tcGFyZV9hcnJheXM7XG5leHBvcnRzLmZpbmRhbGwgPSBmaW5kYWxsO1xuZXhwb3J0cy5ub3RfdGV4dCA9IG5vdF90ZXh0O1xuIl19
