!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.poster=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var scrolling_canvas = require('./scrolling_canvas.js');
var document_controller = require('./document_controller.js');
var document_model = require('./document_model.js');
var document_view = require('./document_view.js');
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

},{"./config.js":6,"./utils.js":28}],5:[function(require,module,exports){
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
var config = new utils.PosterClass([
    'highlight_draw', // boolean - Whether or not to highlight re-renders
    'newline_width', // integer - Width of newline characters
    'tab_width', // integer - Tab character width measured in space characters
    'use_spaces', // boolean - Use spaces for indents instead of tabs
]);

// Set defaults
config.tab_width = 4;
config.use_spaces = true;

exports.config = config;

},{"./utils.js":28}],7:[function(require,module,exports){
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var keymap = require('./events/map.js');
var register = keymap.Map.register;

var utils = require('./utils.js');
var config = require('./config.js');
config = config.config;

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
    var indent = this._make_indents()[0];
    if (this.primary_row == this.secondary_row && this.primary_char == this.secondary_char) {
        this._model.add_text(this.primary_row, this.primary_char, indent);
    } else {
        for (var row = this.start_row; row <= this.end_row; row++) {
            this._model.add_text(row, 0, indent);
        }
    }

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
    if (this.primary_row == this.secondary_row && this.primary_char == this.secondary_char) {
        for (var i = 0; i < indents.length; i++) {
            var indent = indents[i];
            if (this.primary_char >= indent.length) {
                var before = this._model.get_text(this.primary_row, this.primary_char-indent.length, this.primary_row, this.primary_char);
                if (before == indent) {
                    this._model.remove_text(this.primary_row, this.primary_char-indent.length, this.primary_row, this.primary_char);
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
                        this._model.remove_text(row, 0, row, indent.length);
                        if (row == this.start_row) removed_start = indent.length;
                        if (row == this.end_row) removed_end = indent.length;
                        break;
                    }
                };
            }
        }
    }
    
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

    this._model.add_text(this.primary_row, this.primary_char, '\n' + indent);
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
 * Paste text
 * @param  {string} text
 * @return {null}
 */
Cursor.prototype.paste = function(text) {
    if (this._copied_row === text) {
        this._model.add_row(this.primary_row, text);
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
        this._model.remove_row(this.primary_row);
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
},{"./config.js":6,"./events/map.js":13,"./utils.js":28}],8:[function(require,module,exports){
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
    this._active_cursor = null;

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
    this._clipboard.on('copy', utils.proxy(this._handle_copy, this));
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
    that.trigger('change', new_cursor);

    return new_cursor;
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
},{"./highlighters/prism.js":16,"./renderers/batch.js":17,"./renderers/color.js":18,"./renderers/cursors.js":19,"./renderers/highlighted_row.js":20,"./renderers/selections.js":23,"./utils.js":28}],12:[function(require,module,exports){
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

},{"../canvas.js":4,"../utils.js":28,"./renderer.js":21}],23:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzb3VyY2UvanMvcG9zdGVyLmpzIiwic291cmNlL2NvbXBvbmVudHMvcHJpc20uanMiLCJzb3VyY2UvanMvYW5pbWF0b3IuanMiLCJzb3VyY2UvanMvY2FudmFzLmpzIiwic291cmNlL2pzL2NsaXBib2FyZC5qcyIsInNvdXJjZS9qcy9jb25maWcuanMiLCJzb3VyY2UvanMvY3Vyc29yLmpzIiwic291cmNlL2pzL2N1cnNvcnMuanMiLCJzb3VyY2UvanMvZG9jdW1lbnRfY29udHJvbGxlci5qcyIsInNvdXJjZS9qcy9kb2N1bWVudF9tb2RlbC5qcyIsInNvdXJjZS9qcy9kb2N1bWVudF92aWV3LmpzIiwic291cmNlL2pzL2V2ZW50cy9kZWZhdWx0LmpzIiwic291cmNlL2pzL2V2ZW50cy9tYXAuanMiLCJzb3VyY2UvanMvZXZlbnRzL25vcm1hbGl6ZXIuanMiLCJzb3VyY2UvanMvaGlnaGxpZ2h0ZXJzL2hpZ2hsaWdodGVyLmpzIiwic291cmNlL2pzL2hpZ2hsaWdodGVycy9wcmlzbS5qcyIsInNvdXJjZS9qcy9yZW5kZXJlcnMvYmF0Y2guanMiLCJzb3VyY2UvanMvcmVuZGVyZXJzL2NvbG9yLmpzIiwic291cmNlL2pzL3JlbmRlcmVycy9jdXJzb3JzLmpzIiwic291cmNlL2pzL3JlbmRlcmVycy9oaWdobGlnaHRlZF9yb3cuanMiLCJzb3VyY2UvanMvcmVuZGVyZXJzL3JlbmRlcmVyLmpzIiwic291cmNlL2pzL3JlbmRlcmVycy9yb3cuanMiLCJzb3VyY2UvanMvcmVuZGVyZXJzL3NlbGVjdGlvbnMuanMiLCJzb3VyY2UvanMvc2Nyb2xsaW5nX2NhbnZhcy5qcyIsInNvdXJjZS9qcy9zdHlsZS5qcyIsInNvdXJjZS9qcy9zdHlsZXMvaW5pdC5qcyIsInNvdXJjZS9qcy9zdHlsZXMvcGVhY29jay5qcyIsInNvdXJjZS9qcy91dGlscy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcGtEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDemZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1bUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25aQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgc2Nyb2xsaW5nX2NhbnZhcyA9IHJlcXVpcmUoJy4vc2Nyb2xsaW5nX2NhbnZhcy5qcycpO1xudmFyIGRvY3VtZW50X2NvbnRyb2xsZXIgPSByZXF1aXJlKCcuL2RvY3VtZW50X2NvbnRyb2xsZXIuanMnKTtcbnZhciBkb2N1bWVudF9tb2RlbCA9IHJlcXVpcmUoJy4vZG9jdW1lbnRfbW9kZWwuanMnKTtcbnZhciBkb2N1bWVudF92aWV3ID0gcmVxdWlyZSgnLi9kb2N1bWVudF92aWV3LmpzJyk7XG52YXIgc3R5bGUgPSByZXF1aXJlKCcuL3N0eWxlLmpzJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG52YXIgY29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcuanMnKTtcbmNvbmZpZyA9IGNvbmZpZy5jb25maWc7XG5cbi8qKlxuICogQ2FudmFzIGJhc2VkIHRleHQgZWRpdG9yXG4gKi9cbnZhciBQb3N0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuXG4gICAgLy8gQ3JlYXRlIGNhbnZhc1xuICAgIHRoaXMuY2FudmFzID0gbmV3IHNjcm9sbGluZ19jYW52YXMuU2Nyb2xsaW5nQ2FudmFzKCk7XG4gICAgdGhpcy5lbCA9IHRoaXMuY2FudmFzLmVsOyAvLyBDb252ZW5pZW5jZVxuICAgIHRoaXMuX3N0eWxlID0gbmV3IHN0eWxlLlN0eWxlKCk7XG5cbiAgICAvLyBDcmVhdGUgbW9kZWwsIGNvbnRyb2xsZXIsIGFuZCB2aWV3LlxuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLm1vZGVsID0gbmV3IGRvY3VtZW50X21vZGVsLkRvY3VtZW50TW9kZWwoKTtcbiAgICB0aGlzLmNvbnRyb2xsZXIgPSBuZXcgZG9jdW1lbnRfY29udHJvbGxlci5Eb2N1bWVudENvbnRyb2xsZXIodGhpcy5jYW52YXMuZWwsIHRoaXMubW9kZWwpO1xuICAgIHRoaXMudmlldyA9IG5ldyBkb2N1bWVudF92aWV3LkRvY3VtZW50VmlldyhcbiAgICAgICAgdGhpcy5jYW52YXMsIFxuICAgICAgICB0aGlzLm1vZGVsLCBcbiAgICAgICAgdGhpcy5jb250cm9sbGVyLmN1cnNvcnMsIFxuICAgICAgICB0aGlzLl9zdHlsZSxcbiAgICAgICAgZnVuY3Rpb24oKSB7IHJldHVybiB0aGF0LmNvbnRyb2xsZXIuY2xpcGJvYXJkLmhpZGRlbl9pbnB1dCA9PT0gZG9jdW1lbnQuYWN0aXZlRWxlbWVudCB8fCB0aGF0LmNhbnZhcy5mb2N1c2VkOyB9XG4gICAgKTtcblxuICAgIC8vIENyZWF0ZSBwcm9wZXJ0aWVzXG4gICAgdGhpcy5wcm9wZXJ0eSgnc3R5bGUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQuX3N0eWxlO1xuICAgIH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ2NvbmZpZycsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gY29uZmlnO1xuICAgIH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ3ZhbHVlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Lm1vZGVsLnRleHQ7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC5tb2RlbC50ZXh0ID0gdmFsdWU7XG4gICAgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgnd2lkdGgnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQudmlldy53aWR0aDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0LnZpZXcud2lkdGggPSB2YWx1ZTtcbiAgICB9KTtcbiAgICB0aGlzLnByb3BlcnR5KCdoZWlnaHQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQudmlldy5oZWlnaHQ7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC52aWV3LmhlaWdodCA9IHZhbHVlO1xuICAgIH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ2xhbmd1YWdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0LnZpZXcubGFuZ3VhZ2U7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC52aWV3Lmxhbmd1YWdlID0gdmFsdWU7XG4gICAgfSk7XG59O1xudXRpbHMuaW5oZXJpdChQb3N0ZXIsIHV0aWxzLlBvc3RlckNsYXNzKTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5Qb3N0ZXIgPSBQb3N0ZXI7XG4iLCJzZWxmID0gKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKVxuXHQ/IHdpbmRvdyAgIC8vIGlmIGluIGJyb3dzZXJcblx0OiAoXG5cdFx0KHR5cGVvZiBXb3JrZXJHbG9iYWxTY29wZSAhPT0gJ3VuZGVmaW5lZCcgJiYgc2VsZiBpbnN0YW5jZW9mIFdvcmtlckdsb2JhbFNjb3BlKVxuXHRcdD8gc2VsZiAvLyBpZiBpbiB3b3JrZXJcblx0XHQ6IHt9ICAgLy8gaWYgaW4gbm9kZSBqc1xuXHQpO1xuXG4vKipcbiAqIFByaXNtOiBMaWdodHdlaWdodCwgcm9idXN0LCBlbGVnYW50IHN5bnRheCBoaWdobGlnaHRpbmdcbiAqIE1JVCBsaWNlbnNlIGh0dHA6Ly93d3cub3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvbWl0LWxpY2Vuc2UucGhwL1xuICogQGF1dGhvciBMZWEgVmVyb3UgaHR0cDovL2xlYS52ZXJvdS5tZVxuICovXG5cbnZhciBQcmlzbSA9IChmdW5jdGlvbigpe1xuXG4vLyBQcml2YXRlIGhlbHBlciB2YXJzXG52YXIgbGFuZyA9IC9cXGJsYW5nKD86dWFnZSk/LSg/IVxcKikoXFx3KylcXGIvaTtcblxudmFyIF8gPSBzZWxmLlByaXNtID0ge1xuXHR1dGlsOiB7XG5cdFx0ZW5jb2RlOiBmdW5jdGlvbiAodG9rZW5zKSB7XG5cdFx0XHRpZiAodG9rZW5zIGluc3RhbmNlb2YgVG9rZW4pIHtcblx0XHRcdFx0cmV0dXJuIG5ldyBUb2tlbih0b2tlbnMudHlwZSwgXy51dGlsLmVuY29kZSh0b2tlbnMuY29udGVudCksIHRva2Vucy5hbGlhcyk7XG5cdFx0XHR9IGVsc2UgaWYgKF8udXRpbC50eXBlKHRva2VucykgPT09ICdBcnJheScpIHtcblx0XHRcdFx0cmV0dXJuIHRva2Vucy5tYXAoXy51dGlsLmVuY29kZSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gdG9rZW5zLnJlcGxhY2UoLyYvZywgJyZhbXA7JykucmVwbGFjZSgvPC9nLCAnJmx0OycpLnJlcGxhY2UoL1xcdTAwYTAvZywgJyAnKTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0dHlwZTogZnVuY3Rpb24gKG8pIHtcblx0XHRcdHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobykubWF0Y2goL1xcW29iamVjdCAoXFx3KylcXF0vKVsxXTtcblx0XHR9LFxuXG5cdFx0Ly8gRGVlcCBjbG9uZSBhIGxhbmd1YWdlIGRlZmluaXRpb24gKGUuZy4gdG8gZXh0ZW5kIGl0KVxuXHRcdGNsb25lOiBmdW5jdGlvbiAobykge1xuXHRcdFx0dmFyIHR5cGUgPSBfLnV0aWwudHlwZShvKTtcblxuXHRcdFx0c3dpdGNoICh0eXBlKSB7XG5cdFx0XHRcdGNhc2UgJ09iamVjdCc6XG5cdFx0XHRcdFx0dmFyIGNsb25lID0ge307XG5cblx0XHRcdFx0XHRmb3IgKHZhciBrZXkgaW4gbykge1xuXHRcdFx0XHRcdFx0aWYgKG8uaGFzT3duUHJvcGVydHkoa2V5KSkge1xuXHRcdFx0XHRcdFx0XHRjbG9uZVtrZXldID0gXy51dGlsLmNsb25lKG9ba2V5XSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0cmV0dXJuIGNsb25lO1xuXG5cdFx0XHRcdGNhc2UgJ0FycmF5Jzpcblx0XHRcdFx0XHRyZXR1cm4gby5zbGljZSgpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gbztcblx0XHR9XG5cdH0sXG5cblx0bGFuZ3VhZ2VzOiB7XG5cdFx0ZXh0ZW5kOiBmdW5jdGlvbiAoaWQsIHJlZGVmKSB7XG5cdFx0XHR2YXIgbGFuZyA9IF8udXRpbC5jbG9uZShfLmxhbmd1YWdlc1tpZF0pO1xuXG5cdFx0XHRmb3IgKHZhciBrZXkgaW4gcmVkZWYpIHtcblx0XHRcdFx0bGFuZ1trZXldID0gcmVkZWZba2V5XTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGxhbmc7XG5cdFx0fSxcblxuXHRcdC8qKlxuXHRcdCAqIEluc2VydCBhIHRva2VuIGJlZm9yZSBhbm90aGVyIHRva2VuIGluIGEgbGFuZ3VhZ2UgbGl0ZXJhbFxuXHRcdCAqIEFzIHRoaXMgbmVlZHMgdG8gcmVjcmVhdGUgdGhlIG9iamVjdCAod2UgY2Fubm90IGFjdHVhbGx5IGluc2VydCBiZWZvcmUga2V5cyBpbiBvYmplY3QgbGl0ZXJhbHMpLFxuXHRcdCAqIHdlIGNhbm5vdCBqdXN0IHByb3ZpZGUgYW4gb2JqZWN0LCB3ZSBuZWVkIGFub2JqZWN0IGFuZCBhIGtleS5cblx0XHQgKiBAcGFyYW0gaW5zaWRlIFRoZSBrZXkgKG9yIGxhbmd1YWdlIGlkKSBvZiB0aGUgcGFyZW50XG5cdFx0ICogQHBhcmFtIGJlZm9yZSBUaGUga2V5IHRvIGluc2VydCBiZWZvcmUuIElmIG5vdCBwcm92aWRlZCwgdGhlIGZ1bmN0aW9uIGFwcGVuZHMgaW5zdGVhZC5cblx0XHQgKiBAcGFyYW0gaW5zZXJ0IE9iamVjdCB3aXRoIHRoZSBrZXkvdmFsdWUgcGFpcnMgdG8gaW5zZXJ0XG5cdFx0ICogQHBhcmFtIHJvb3QgVGhlIG9iamVjdCB0aGF0IGNvbnRhaW5zIGBpbnNpZGVgLiBJZiBlcXVhbCB0byBQcmlzbS5sYW5ndWFnZXMsIGl0IGNhbiBiZSBvbWl0dGVkLlxuXHRcdCAqL1xuXHRcdGluc2VydEJlZm9yZTogZnVuY3Rpb24gKGluc2lkZSwgYmVmb3JlLCBpbnNlcnQsIHJvb3QpIHtcblx0XHRcdHJvb3QgPSByb290IHx8IF8ubGFuZ3VhZ2VzO1xuXHRcdFx0dmFyIGdyYW1tYXIgPSByb290W2luc2lkZV07XG5cdFx0XHRcblx0XHRcdGlmIChhcmd1bWVudHMubGVuZ3RoID09IDIpIHtcblx0XHRcdFx0aW5zZXJ0ID0gYXJndW1lbnRzWzFdO1xuXHRcdFx0XHRcblx0XHRcdFx0Zm9yICh2YXIgbmV3VG9rZW4gaW4gaW5zZXJ0KSB7XG5cdFx0XHRcdFx0aWYgKGluc2VydC5oYXNPd25Qcm9wZXJ0eShuZXdUb2tlbikpIHtcblx0XHRcdFx0XHRcdGdyYW1tYXJbbmV3VG9rZW5dID0gaW5zZXJ0W25ld1Rva2VuXTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdHJldHVybiBncmFtbWFyO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHR2YXIgcmV0ID0ge307XG5cblx0XHRcdGZvciAodmFyIHRva2VuIGluIGdyYW1tYXIpIHtcblxuXHRcdFx0XHRpZiAoZ3JhbW1hci5oYXNPd25Qcm9wZXJ0eSh0b2tlbikpIHtcblxuXHRcdFx0XHRcdGlmICh0b2tlbiA9PSBiZWZvcmUpIHtcblxuXHRcdFx0XHRcdFx0Zm9yICh2YXIgbmV3VG9rZW4gaW4gaW5zZXJ0KSB7XG5cblx0XHRcdFx0XHRcdFx0aWYgKGluc2VydC5oYXNPd25Qcm9wZXJ0eShuZXdUb2tlbikpIHtcblx0XHRcdFx0XHRcdFx0XHRyZXRbbmV3VG9rZW5dID0gaW5zZXJ0W25ld1Rva2VuXTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHJldFt0b2tlbl0gPSBncmFtbWFyW3Rva2VuXTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHQvLyBVcGRhdGUgcmVmZXJlbmNlcyBpbiBvdGhlciBsYW5ndWFnZSBkZWZpbml0aW9uc1xuXHRcdFx0Xy5sYW5ndWFnZXMuREZTKF8ubGFuZ3VhZ2VzLCBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG5cdFx0XHRcdGlmICh2YWx1ZSA9PT0gcm9vdFtpbnNpZGVdICYmIGtleSAhPSBpbnNpZGUpIHtcblx0XHRcdFx0XHR0aGlzW2tleV0gPSByZXQ7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0XHRyZXR1cm4gcm9vdFtpbnNpZGVdID0gcmV0O1xuXHRcdH0sXG5cblx0XHQvLyBUcmF2ZXJzZSBhIGxhbmd1YWdlIGRlZmluaXRpb24gd2l0aCBEZXB0aCBGaXJzdCBTZWFyY2hcblx0XHRERlM6IGZ1bmN0aW9uKG8sIGNhbGxiYWNrLCB0eXBlKSB7XG5cdFx0XHRmb3IgKHZhciBpIGluIG8pIHtcblx0XHRcdFx0aWYgKG8uaGFzT3duUHJvcGVydHkoaSkpIHtcblx0XHRcdFx0XHRjYWxsYmFjay5jYWxsKG8sIGksIG9baV0sIHR5cGUgfHwgaSk7XG5cblx0XHRcdFx0XHRpZiAoXy51dGlsLnR5cGUob1tpXSkgPT09ICdPYmplY3QnKSB7XG5cdFx0XHRcdFx0XHRfLmxhbmd1YWdlcy5ERlMob1tpXSwgY2FsbGJhY2spO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIGlmIChfLnV0aWwudHlwZShvW2ldKSA9PT0gJ0FycmF5Jykge1xuXHRcdFx0XHRcdFx0Xy5sYW5ndWFnZXMuREZTKG9baV0sIGNhbGxiYWNrLCBpKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cblx0aGlnaGxpZ2h0QWxsOiBmdW5jdGlvbihhc3luYywgY2FsbGJhY2spIHtcblx0XHR2YXIgZWxlbWVudHMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdjb2RlW2NsYXNzKj1cImxhbmd1YWdlLVwiXSwgW2NsYXNzKj1cImxhbmd1YWdlLVwiXSBjb2RlLCBjb2RlW2NsYXNzKj1cImxhbmctXCJdLCBbY2xhc3MqPVwibGFuZy1cIl0gY29kZScpO1xuXG5cdFx0Zm9yICh2YXIgaT0wLCBlbGVtZW50OyBlbGVtZW50ID0gZWxlbWVudHNbaSsrXTspIHtcblx0XHRcdF8uaGlnaGxpZ2h0RWxlbWVudChlbGVtZW50LCBhc3luYyA9PT0gdHJ1ZSwgY2FsbGJhY2spO1xuXHRcdH1cblx0fSxcblxuXHRoaWdobGlnaHRFbGVtZW50OiBmdW5jdGlvbihlbGVtZW50LCBhc3luYywgY2FsbGJhY2spIHtcblx0XHQvLyBGaW5kIGxhbmd1YWdlXG5cdFx0dmFyIGxhbmd1YWdlLCBncmFtbWFyLCBwYXJlbnQgPSBlbGVtZW50O1xuXG5cdFx0d2hpbGUgKHBhcmVudCAmJiAhbGFuZy50ZXN0KHBhcmVudC5jbGFzc05hbWUpKSB7XG5cdFx0XHRwYXJlbnQgPSBwYXJlbnQucGFyZW50Tm9kZTtcblx0XHR9XG5cblx0XHRpZiAocGFyZW50KSB7XG5cdFx0XHRsYW5ndWFnZSA9IChwYXJlbnQuY2xhc3NOYW1lLm1hdGNoKGxhbmcpIHx8IFssJyddKVsxXTtcblx0XHRcdGdyYW1tYXIgPSBfLmxhbmd1YWdlc1tsYW5ndWFnZV07XG5cdFx0fVxuXG5cdFx0aWYgKCFncmFtbWFyKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Ly8gU2V0IGxhbmd1YWdlIG9uIHRoZSBlbGVtZW50LCBpZiBub3QgcHJlc2VudFxuXHRcdGVsZW1lbnQuY2xhc3NOYW1lID0gZWxlbWVudC5jbGFzc05hbWUucmVwbGFjZShsYW5nLCAnJykucmVwbGFjZSgvXFxzKy9nLCAnICcpICsgJyBsYW5ndWFnZS0nICsgbGFuZ3VhZ2U7XG5cblx0XHQvLyBTZXQgbGFuZ3VhZ2Ugb24gdGhlIHBhcmVudCwgZm9yIHN0eWxpbmdcblx0XHRwYXJlbnQgPSBlbGVtZW50LnBhcmVudE5vZGU7XG5cblx0XHRpZiAoL3ByZS9pLnRlc3QocGFyZW50Lm5vZGVOYW1lKSkge1xuXHRcdFx0cGFyZW50LmNsYXNzTmFtZSA9IHBhcmVudC5jbGFzc05hbWUucmVwbGFjZShsYW5nLCAnJykucmVwbGFjZSgvXFxzKy9nLCAnICcpICsgJyBsYW5ndWFnZS0nICsgbGFuZ3VhZ2U7XG5cdFx0fVxuXG5cdFx0dmFyIGNvZGUgPSBlbGVtZW50LnRleHRDb250ZW50O1xuXG5cdFx0aWYoIWNvZGUpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHR2YXIgZW52ID0ge1xuXHRcdFx0ZWxlbWVudDogZWxlbWVudCxcblx0XHRcdGxhbmd1YWdlOiBsYW5ndWFnZSxcblx0XHRcdGdyYW1tYXI6IGdyYW1tYXIsXG5cdFx0XHRjb2RlOiBjb2RlXG5cdFx0fTtcblxuXHRcdF8uaG9va3MucnVuKCdiZWZvcmUtaGlnaGxpZ2h0JywgZW52KTtcblxuXHRcdGlmIChhc3luYyAmJiBzZWxmLldvcmtlcikge1xuXHRcdFx0dmFyIHdvcmtlciA9IG5ldyBXb3JrZXIoXy5maWxlbmFtZSk7XG5cblx0XHRcdHdvcmtlci5vbm1lc3NhZ2UgPSBmdW5jdGlvbihldnQpIHtcblx0XHRcdFx0ZW52LmhpZ2hsaWdodGVkQ29kZSA9IFRva2VuLnN0cmluZ2lmeShKU09OLnBhcnNlKGV2dC5kYXRhKSwgbGFuZ3VhZ2UpO1xuXG5cdFx0XHRcdF8uaG9va3MucnVuKCdiZWZvcmUtaW5zZXJ0JywgZW52KTtcblxuXHRcdFx0XHRlbnYuZWxlbWVudC5pbm5lckhUTUwgPSBlbnYuaGlnaGxpZ2h0ZWRDb2RlO1xuXG5cdFx0XHRcdGNhbGxiYWNrICYmIGNhbGxiYWNrLmNhbGwoZW52LmVsZW1lbnQpO1xuXHRcdFx0XHRfLmhvb2tzLnJ1bignYWZ0ZXItaGlnaGxpZ2h0JywgZW52KTtcblx0XHRcdH07XG5cblx0XHRcdHdvcmtlci5wb3N0TWVzc2FnZShKU09OLnN0cmluZ2lmeSh7XG5cdFx0XHRcdGxhbmd1YWdlOiBlbnYubGFuZ3VhZ2UsXG5cdFx0XHRcdGNvZGU6IGVudi5jb2RlXG5cdFx0XHR9KSk7XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0ZW52LmhpZ2hsaWdodGVkQ29kZSA9IF8uaGlnaGxpZ2h0KGVudi5jb2RlLCBlbnYuZ3JhbW1hciwgZW52Lmxhbmd1YWdlKVxuXG5cdFx0XHRfLmhvb2tzLnJ1bignYmVmb3JlLWluc2VydCcsIGVudik7XG5cblx0XHRcdGVudi5lbGVtZW50LmlubmVySFRNTCA9IGVudi5oaWdobGlnaHRlZENvZGU7XG5cblx0XHRcdGNhbGxiYWNrICYmIGNhbGxiYWNrLmNhbGwoZWxlbWVudCk7XG5cblx0XHRcdF8uaG9va3MucnVuKCdhZnRlci1oaWdobGlnaHQnLCBlbnYpO1xuXHRcdH1cblx0fSxcblxuXHRoaWdobGlnaHQ6IGZ1bmN0aW9uICh0ZXh0LCBncmFtbWFyLCBsYW5ndWFnZSkge1xuXHRcdHZhciB0b2tlbnMgPSBfLnRva2VuaXplKHRleHQsIGdyYW1tYXIpO1xuXHRcdHJldHVybiBUb2tlbi5zdHJpbmdpZnkoXy51dGlsLmVuY29kZSh0b2tlbnMpLCBsYW5ndWFnZSk7XG5cdH0sXG5cblx0dG9rZW5pemU6IGZ1bmN0aW9uKHRleHQsIGdyYW1tYXIsIGxhbmd1YWdlKSB7XG5cdFx0dmFyIFRva2VuID0gXy5Ub2tlbjtcblxuXHRcdHZhciBzdHJhcnIgPSBbdGV4dF07XG5cblx0XHR2YXIgcmVzdCA9IGdyYW1tYXIucmVzdDtcblxuXHRcdGlmIChyZXN0KSB7XG5cdFx0XHRmb3IgKHZhciB0b2tlbiBpbiByZXN0KSB7XG5cdFx0XHRcdGdyYW1tYXJbdG9rZW5dID0gcmVzdFt0b2tlbl07XG5cdFx0XHR9XG5cblx0XHRcdGRlbGV0ZSBncmFtbWFyLnJlc3Q7XG5cdFx0fVxuXG5cdFx0dG9rZW5sb29wOiBmb3IgKHZhciB0b2tlbiBpbiBncmFtbWFyKSB7XG5cdFx0XHRpZighZ3JhbW1hci5oYXNPd25Qcm9wZXJ0eSh0b2tlbikgfHwgIWdyYW1tYXJbdG9rZW5dKSB7XG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgcGF0dGVybnMgPSBncmFtbWFyW3Rva2VuXTtcblx0XHRcdHBhdHRlcm5zID0gKF8udXRpbC50eXBlKHBhdHRlcm5zKSA9PT0gXCJBcnJheVwiKSA/IHBhdHRlcm5zIDogW3BhdHRlcm5zXTtcblxuXHRcdFx0Zm9yICh2YXIgaiA9IDA7IGogPCBwYXR0ZXJucy5sZW5ndGg7ICsraikge1xuXHRcdFx0XHR2YXIgcGF0dGVybiA9IHBhdHRlcm5zW2pdLFxuXHRcdFx0XHRcdGluc2lkZSA9IHBhdHRlcm4uaW5zaWRlLFxuXHRcdFx0XHRcdGxvb2tiZWhpbmQgPSAhIXBhdHRlcm4ubG9va2JlaGluZCxcblx0XHRcdFx0XHRsb29rYmVoaW5kTGVuZ3RoID0gMCxcblx0XHRcdFx0XHRhbGlhcyA9IHBhdHRlcm4uYWxpYXM7XG5cblx0XHRcdFx0cGF0dGVybiA9IHBhdHRlcm4ucGF0dGVybiB8fCBwYXR0ZXJuO1xuXG5cdFx0XHRcdGZvciAodmFyIGk9MDsgaTxzdHJhcnIubGVuZ3RoOyBpKyspIHsgLy8gRG9u4oCZdCBjYWNoZSBsZW5ndGggYXMgaXQgY2hhbmdlcyBkdXJpbmcgdGhlIGxvb3BcblxuXHRcdFx0XHRcdHZhciBzdHIgPSBzdHJhcnJbaV07XG5cblx0XHRcdFx0XHRpZiAoc3RyYXJyLmxlbmd0aCA+IHRleHQubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHQvLyBTb21ldGhpbmcgd2VudCB0ZXJyaWJseSB3cm9uZywgQUJPUlQsIEFCT1JUIVxuXHRcdFx0XHRcdFx0YnJlYWsgdG9rZW5sb29wO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmIChzdHIgaW5zdGFuY2VvZiBUb2tlbikge1xuXHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0cGF0dGVybi5sYXN0SW5kZXggPSAwO1xuXG5cdFx0XHRcdFx0dmFyIG1hdGNoID0gcGF0dGVybi5leGVjKHN0cik7XG5cblx0XHRcdFx0XHRpZiAobWF0Y2gpIHtcblx0XHRcdFx0XHRcdGlmKGxvb2tiZWhpbmQpIHtcblx0XHRcdFx0XHRcdFx0bG9va2JlaGluZExlbmd0aCA9IG1hdGNoWzFdLmxlbmd0aDtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0dmFyIGZyb20gPSBtYXRjaC5pbmRleCAtIDEgKyBsb29rYmVoaW5kTGVuZ3RoLFxuXHRcdFx0XHRcdFx0XHRtYXRjaCA9IG1hdGNoWzBdLnNsaWNlKGxvb2tiZWhpbmRMZW5ndGgpLFxuXHRcdFx0XHRcdFx0XHRsZW4gPSBtYXRjaC5sZW5ndGgsXG5cdFx0XHRcdFx0XHRcdHRvID0gZnJvbSArIGxlbixcblx0XHRcdFx0XHRcdFx0YmVmb3JlID0gc3RyLnNsaWNlKDAsIGZyb20gKyAxKSxcblx0XHRcdFx0XHRcdFx0YWZ0ZXIgPSBzdHIuc2xpY2UodG8gKyAxKTtcblxuXHRcdFx0XHRcdFx0dmFyIGFyZ3MgPSBbaSwgMV07XG5cblx0XHRcdFx0XHRcdGlmIChiZWZvcmUpIHtcblx0XHRcdFx0XHRcdFx0YXJncy5wdXNoKGJlZm9yZSk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdHZhciB3cmFwcGVkID0gbmV3IFRva2VuKHRva2VuLCBpbnNpZGU/IF8udG9rZW5pemUobWF0Y2gsIGluc2lkZSkgOiBtYXRjaCwgYWxpYXMpO1xuXG5cdFx0XHRcdFx0XHRhcmdzLnB1c2god3JhcHBlZCk7XG5cblx0XHRcdFx0XHRcdGlmIChhZnRlcikge1xuXHRcdFx0XHRcdFx0XHRhcmdzLnB1c2goYWZ0ZXIpO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRBcnJheS5wcm90b3R5cGUuc3BsaWNlLmFwcGx5KHN0cmFyciwgYXJncyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHN0cmFycjtcblx0fSxcblxuXHRob29rczoge1xuXHRcdGFsbDoge30sXG5cblx0XHRhZGQ6IGZ1bmN0aW9uIChuYW1lLCBjYWxsYmFjaykge1xuXHRcdFx0dmFyIGhvb2tzID0gXy5ob29rcy5hbGw7XG5cblx0XHRcdGhvb2tzW25hbWVdID0gaG9va3NbbmFtZV0gfHwgW107XG5cblx0XHRcdGhvb2tzW25hbWVdLnB1c2goY2FsbGJhY2spO1xuXHRcdH0sXG5cblx0XHRydW46IGZ1bmN0aW9uIChuYW1lLCBlbnYpIHtcblx0XHRcdHZhciBjYWxsYmFja3MgPSBfLmhvb2tzLmFsbFtuYW1lXTtcblxuXHRcdFx0aWYgKCFjYWxsYmFja3MgfHwgIWNhbGxiYWNrcy5sZW5ndGgpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRmb3IgKHZhciBpPTAsIGNhbGxiYWNrOyBjYWxsYmFjayA9IGNhbGxiYWNrc1tpKytdOykge1xuXHRcdFx0XHRjYWxsYmFjayhlbnYpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufTtcblxudmFyIFRva2VuID0gXy5Ub2tlbiA9IGZ1bmN0aW9uKHR5cGUsIGNvbnRlbnQsIGFsaWFzKSB7XG5cdHRoaXMudHlwZSA9IHR5cGU7XG5cdHRoaXMuY29udGVudCA9IGNvbnRlbnQ7XG5cdHRoaXMuYWxpYXMgPSBhbGlhcztcbn07XG5cblRva2VuLnN0cmluZ2lmeSA9IGZ1bmN0aW9uKG8sIGxhbmd1YWdlLCBwYXJlbnQpIHtcblx0aWYgKHR5cGVvZiBvID09ICdzdHJpbmcnKSB7XG5cdFx0cmV0dXJuIG87XG5cdH1cblxuXHRpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pID09ICdbb2JqZWN0IEFycmF5XScpIHtcblx0XHRyZXR1cm4gby5tYXAoZnVuY3Rpb24oZWxlbWVudCkge1xuXHRcdFx0cmV0dXJuIFRva2VuLnN0cmluZ2lmeShlbGVtZW50LCBsYW5ndWFnZSwgbyk7XG5cdFx0fSkuam9pbignJyk7XG5cdH1cblxuXHR2YXIgZW52ID0ge1xuXHRcdHR5cGU6IG8udHlwZSxcblx0XHRjb250ZW50OiBUb2tlbi5zdHJpbmdpZnkoby5jb250ZW50LCBsYW5ndWFnZSwgcGFyZW50KSxcblx0XHR0YWc6ICdzcGFuJyxcblx0XHRjbGFzc2VzOiBbJ3Rva2VuJywgby50eXBlXSxcblx0XHRhdHRyaWJ1dGVzOiB7fSxcblx0XHRsYW5ndWFnZTogbGFuZ3VhZ2UsXG5cdFx0cGFyZW50OiBwYXJlbnRcblx0fTtcblxuXHRpZiAoZW52LnR5cGUgPT0gJ2NvbW1lbnQnKSB7XG5cdFx0ZW52LmF0dHJpYnV0ZXNbJ3NwZWxsY2hlY2snXSA9ICd0cnVlJztcblx0fVxuXG5cdGlmIChvLmFsaWFzKSB7XG5cdFx0dmFyIGFsaWFzZXMgPSBfLnV0aWwudHlwZShvLmFsaWFzKSA9PT0gJ0FycmF5JyA/IG8uYWxpYXMgOiBbby5hbGlhc107XG5cdFx0QXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkoZW52LmNsYXNzZXMsIGFsaWFzZXMpO1xuXHR9XG5cblx0Xy5ob29rcy5ydW4oJ3dyYXAnLCBlbnYpO1xuXG5cdHZhciBhdHRyaWJ1dGVzID0gJyc7XG5cblx0Zm9yICh2YXIgbmFtZSBpbiBlbnYuYXR0cmlidXRlcykge1xuXHRcdGF0dHJpYnV0ZXMgKz0gbmFtZSArICc9XCInICsgKGVudi5hdHRyaWJ1dGVzW25hbWVdIHx8ICcnKSArICdcIic7XG5cdH1cblxuXHRyZXR1cm4gJzwnICsgZW52LnRhZyArICcgY2xhc3M9XCInICsgZW52LmNsYXNzZXMuam9pbignICcpICsgJ1wiICcgKyBhdHRyaWJ1dGVzICsgJz4nICsgZW52LmNvbnRlbnQgKyAnPC8nICsgZW52LnRhZyArICc+JztcblxufTtcblxuaWYgKCFzZWxmLmRvY3VtZW50KSB7XG5cdGlmICghc2VsZi5hZGRFdmVudExpc3RlbmVyKSB7XG5cdFx0Ly8gaW4gTm9kZS5qc1xuXHRcdHJldHVybiBzZWxmLlByaXNtO1xuXHR9XG4gXHQvLyBJbiB3b3JrZXJcblx0c2VsZi5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24oZXZ0KSB7XG5cdFx0dmFyIG1lc3NhZ2UgPSBKU09OLnBhcnNlKGV2dC5kYXRhKSxcblx0XHQgICAgbGFuZyA9IG1lc3NhZ2UubGFuZ3VhZ2UsXG5cdFx0ICAgIGNvZGUgPSBtZXNzYWdlLmNvZGU7XG5cblx0XHRzZWxmLnBvc3RNZXNzYWdlKEpTT04uc3RyaW5naWZ5KF8udXRpbC5lbmNvZGUoXy50b2tlbml6ZShjb2RlLCBfLmxhbmd1YWdlc1tsYW5nXSkpKSk7XG5cdFx0c2VsZi5jbG9zZSgpO1xuXHR9LCBmYWxzZSk7XG5cblx0cmV0dXJuIHNlbGYuUHJpc207XG59XG5cbi8vIEdldCBjdXJyZW50IHNjcmlwdCBhbmQgaGlnaGxpZ2h0XG52YXIgc2NyaXB0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3NjcmlwdCcpO1xuXG5zY3JpcHQgPSBzY3JpcHRbc2NyaXB0Lmxlbmd0aCAtIDFdO1xuXG5pZiAoc2NyaXB0KSB7XG5cdF8uZmlsZW5hbWUgPSBzY3JpcHQuc3JjO1xuXG5cdGlmIChkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyICYmICFzY3JpcHQuaGFzQXR0cmlidXRlKCdkYXRhLW1hbnVhbCcpKSB7XG5cdFx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIF8uaGlnaGxpZ2h0QWxsKTtcblx0fVxufVxuXG5yZXR1cm4gc2VsZi5QcmlzbTtcblxufSkoKTtcblxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG5cdG1vZHVsZS5leHBvcnRzID0gUHJpc207XG59XG5cblByaXNtLmxhbmd1YWdlcy5tYXJrdXAgPSB7XG5cdCdjb21tZW50JzogLzwhLS1bXFx3XFxXXSo/LS0+L2csXG5cdCdwcm9sb2cnOiAvPFxcPy4rP1xcPz4vLFxuXHQnZG9jdHlwZSc6IC88IURPQ1RZUEUuKz8+Lyxcblx0J2NkYXRhJzogLzwhXFxbQ0RBVEFcXFtbXFx3XFxXXSo/XV0+L2ksXG5cdCd0YWcnOiB7XG5cdFx0cGF0dGVybjogLzxcXC8/W1xcdzotXStcXHMqKD86XFxzK1tcXHc6LV0rKD86PSg/OihcInwnKShcXFxcP1tcXHdcXFddKSo/XFwxfFteXFxzJ1wiPj1dKykpP1xccyopKlxcLz8+L2dpLFxuXHRcdGluc2lkZToge1xuXHRcdFx0J3RhZyc6IHtcblx0XHRcdFx0cGF0dGVybjogL148XFwvP1tcXHc6LV0rL2ksXG5cdFx0XHRcdGluc2lkZToge1xuXHRcdFx0XHRcdCdwdW5jdHVhdGlvbic6IC9ePFxcLz8vLFxuXHRcdFx0XHRcdCduYW1lc3BhY2UnOiAvXltcXHctXSs/Oi9cblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdCdhdHRyLXZhbHVlJzoge1xuXHRcdFx0XHRwYXR0ZXJuOiAvPSg/OignfFwiKVtcXHdcXFddKj8oXFwxKXxbXlxccz5dKykvZ2ksXG5cdFx0XHRcdGluc2lkZToge1xuXHRcdFx0XHRcdCdwdW5jdHVhdGlvbic6IC89fD58XCIvZ1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0J3B1bmN0dWF0aW9uJzogL1xcLz8+L2csXG5cdFx0XHQnYXR0ci1uYW1lJzoge1xuXHRcdFx0XHRwYXR0ZXJuOiAvW1xcdzotXSsvZyxcblx0XHRcdFx0aW5zaWRlOiB7XG5cdFx0XHRcdFx0J25hbWVzcGFjZSc6IC9eW1xcdy1dKz86L1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHR9XG5cdH0sXG5cdCdlbnRpdHknOiAvXFwmIz9bXFxkYS16XXsxLDh9Oy9naVxufTtcblxuLy8gUGx1Z2luIHRvIG1ha2UgZW50aXR5IHRpdGxlIHNob3cgdGhlIHJlYWwgZW50aXR5LCBpZGVhIGJ5IFJvbWFuIEtvbWFyb3ZcblByaXNtLmhvb2tzLmFkZCgnd3JhcCcsIGZ1bmN0aW9uKGVudikge1xuXG5cdGlmIChlbnYudHlwZSA9PT0gJ2VudGl0eScpIHtcblx0XHRlbnYuYXR0cmlidXRlc1sndGl0bGUnXSA9IGVudi5jb250ZW50LnJlcGxhY2UoLyZhbXA7LywgJyYnKTtcblx0fVxufSk7XG5cblByaXNtLmxhbmd1YWdlcy5jbGlrZSA9IHtcblx0J2NvbW1lbnQnOiBbXG5cdFx0e1xuXHRcdFx0cGF0dGVybjogLyhefFteXFxcXF0pXFwvXFwqW1xcd1xcV10qP1xcKlxcLy9nLFxuXHRcdFx0bG9va2JlaGluZDogdHJ1ZVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0cGF0dGVybjogLyhefFteXFxcXDpdKVxcL1xcLy4qPyhcXHI/XFxufCQpL2csXG5cdFx0XHRsb29rYmVoaW5kOiB0cnVlXG5cdFx0fVxuXHRdLFxuXHQnc3RyaW5nJzogLyhcInwnKShcXFxcPy4pKj9cXDEvZyxcblx0J2NsYXNzLW5hbWUnOiB7XG5cdFx0cGF0dGVybjogLygoPzooPzpjbGFzc3xpbnRlcmZhY2V8ZXh0ZW5kc3xpbXBsZW1lbnRzfHRyYWl0fGluc3RhbmNlb2Z8bmV3KVxccyspfCg/OmNhdGNoXFxzK1xcKCkpW2EtejAtOV9cXC5cXFxcXSsvaWcsXG5cdFx0bG9va2JlaGluZDogdHJ1ZSxcblx0XHRpbnNpZGU6IHtcblx0XHRcdHB1bmN0dWF0aW9uOiAvKFxcLnxcXFxcKS9cblx0XHR9XG5cdH0sXG5cdCdrZXl3b3JkJzogL1xcYihpZnxlbHNlfHdoaWxlfGRvfGZvcnxyZXR1cm58aW58aW5zdGFuY2VvZnxmdW5jdGlvbnxuZXd8dHJ5fHRocm93fGNhdGNofGZpbmFsbHl8bnVsbHxicmVha3xjb250aW51ZSlcXGIvZyxcblx0J2Jvb2xlYW4nOiAvXFxiKHRydWV8ZmFsc2UpXFxiL2csXG5cdCdmdW5jdGlvbic6IHtcblx0XHRwYXR0ZXJuOiAvW2EtejAtOV9dK1xcKC9pZyxcblx0XHRpbnNpZGU6IHtcblx0XHRcdHB1bmN0dWF0aW9uOiAvXFwoL1xuXHRcdH1cblx0fSxcblx0J251bWJlcic6IC9cXGItPygweFtcXGRBLUZhLWZdK3xcXGQqXFwuP1xcZCsoW0VlXS0/XFxkKyk/KVxcYi9nLFxuXHQnb3BlcmF0b3InOiAvWy0rXXsxLDJ9fCF8PD0/fD49P3w9ezEsM318JnsxLDJ9fFxcfD9cXHx8XFw/fFxcKnxcXC98XFx+fFxcXnxcXCUvZyxcblx0J2lnbm9yZSc6IC8mKGx0fGd0fGFtcCk7L2dpLFxuXHQncHVuY3R1YXRpb24nOiAvW3t9W1xcXTsoKSwuOl0vZ1xufTtcblxuUHJpc20ubGFuZ3VhZ2VzLmFwYWNoZWNvbmYgPSB7XG5cdCdjb21tZW50JzogL1xcIy4qL2csXG5cdCdkaXJlY3RpdmUtaW5saW5lJzoge1xuXHRcdHBhdHRlcm46IC9eXFxzKlxcYihBY2NlcHRGaWx0ZXJ8QWNjZXB0UGF0aEluZm98QWNjZXNzRmlsZU5hbWV8QWN0aW9ufEFkZEFsdHxBZGRBbHRCeUVuY29kaW5nfEFkZEFsdEJ5VHlwZXxBZGRDaGFyc2V0fEFkZERlZmF1bHRDaGFyc2V0fEFkZERlc2NyaXB0aW9ufEFkZEVuY29kaW5nfEFkZEhhbmRsZXJ8QWRkSWNvbnxBZGRJY29uQnlFbmNvZGluZ3xBZGRJY29uQnlUeXBlfEFkZElucHV0RmlsdGVyfEFkZExhbmd1YWdlfEFkZE1vZHVsZUluZm98QWRkT3V0cHV0RmlsdGVyfEFkZE91dHB1dEZpbHRlckJ5VHlwZXxBZGRUeXBlfEFsaWFzfEFsaWFzTWF0Y2h8QWxsb3d8QWxsb3dDT05ORUNUfEFsbG93RW5jb2RlZFNsYXNoZXN8QWxsb3dNZXRob2RzfEFsbG93T3ZlcnJpZGV8QWxsb3dPdmVycmlkZUxpc3R8QW5vbnltb3VzfEFub255bW91c19Mb2dFbWFpbHxBbm9ueW1vdXNfTXVzdEdpdmVFbWFpbHxBbm9ueW1vdXNfTm9Vc2VySUR8QW5vbnltb3VzX1ZlcmlmeUVtYWlsfEFzeW5jUmVxdWVzdFdvcmtlckZhY3RvcnxBdXRoQmFzaWNBdXRob3JpdGF0aXZlfEF1dGhCYXNpY0Zha2V8QXV0aEJhc2ljUHJvdmlkZXJ8QXV0aEJhc2ljVXNlRGlnZXN0QWxnb3JpdGhtfEF1dGhEQkRVc2VyUFdRdWVyeXxBdXRoREJEVXNlclJlYWxtUXVlcnl8QXV0aERCTUdyb3VwRmlsZXxBdXRoREJNVHlwZXxBdXRoREJNVXNlckZpbGV8QXV0aERpZ2VzdEFsZ29yaXRobXxBdXRoRGlnZXN0RG9tYWlufEF1dGhEaWdlc3ROb25jZUxpZmV0aW1lfEF1dGhEaWdlc3RQcm92aWRlcnxBdXRoRGlnZXN0UW9wfEF1dGhEaWdlc3RTaG1lbVNpemV8QXV0aEZvcm1BdXRob3JpdGF0aXZlfEF1dGhGb3JtQm9keXxBdXRoRm9ybURpc2FibGVOb1N0b3JlfEF1dGhGb3JtRmFrZUJhc2ljQXV0aHxBdXRoRm9ybUxvY2F0aW9ufEF1dGhGb3JtTG9naW5SZXF1aXJlZExvY2F0aW9ufEF1dGhGb3JtTG9naW5TdWNjZXNzTG9jYXRpb258QXV0aEZvcm1Mb2dvdXRMb2NhdGlvbnxBdXRoRm9ybU1ldGhvZHxBdXRoRm9ybU1pbWV0eXBlfEF1dGhGb3JtUGFzc3dvcmR8QXV0aEZvcm1Qcm92aWRlcnxBdXRoRm9ybVNpdGVQYXNzcGhyYXNlfEF1dGhGb3JtU2l6ZXxBdXRoRm9ybVVzZXJuYW1lfEF1dGhHcm91cEZpbGV8QXV0aExEQVBBdXRob3JpemVQcmVmaXh8QXV0aExEQVBCaW5kQXV0aG9yaXRhdGl2ZXxBdXRoTERBUEJpbmRETnxBdXRoTERBUEJpbmRQYXNzd29yZHxBdXRoTERBUENoYXJzZXRDb25maWd8QXV0aExEQVBDb21wYXJlQXNVc2VyfEF1dGhMREFQQ29tcGFyZUROT25TZXJ2ZXJ8QXV0aExEQVBEZXJlZmVyZW5jZUFsaWFzZXN8QXV0aExEQVBHcm91cEF0dHJpYnV0ZXxBdXRoTERBUEdyb3VwQXR0cmlidXRlSXNETnxBdXRoTERBUEluaXRpYWxCaW5kQXNVc2VyfEF1dGhMREFQSW5pdGlhbEJpbmRQYXR0ZXJufEF1dGhMREFQTWF4U3ViR3JvdXBEZXB0aHxBdXRoTERBUFJlbW90ZVVzZXJBdHRyaWJ1dGV8QXV0aExEQVBSZW1vdGVVc2VySXNETnxBdXRoTERBUFNlYXJjaEFzVXNlcnxBdXRoTERBUFN1Ykdyb3VwQXR0cmlidXRlfEF1dGhMREFQU3ViR3JvdXBDbGFzc3xBdXRoTERBUFVybHxBdXRoTWVyZ2luZ3xBdXRoTmFtZXxBdXRobkNhY2hlQ29udGV4dHxBdXRobkNhY2hlRW5hYmxlfEF1dGhuQ2FjaGVQcm92aWRlRm9yfEF1dGhuQ2FjaGVTT0NhY2hlfEF1dGhuQ2FjaGVUaW1lb3V0fEF1dGhuekZjZ2lDaGVja0F1dGhuUHJvdmlkZXJ8QXV0aG56RmNnaURlZmluZVByb3ZpZGVyfEF1dGhUeXBlfEF1dGhVc2VyRmlsZXxBdXRoekRCRExvZ2luVG9SZWZlcmVyfEF1dGh6REJEUXVlcnl8QXV0aHpEQkRSZWRpcmVjdFF1ZXJ5fEF1dGh6REJNVHlwZXxBdXRoelNlbmRGb3JiaWRkZW5PbkZhaWx1cmV8QmFsYW5jZXJHcm93dGh8QmFsYW5jZXJJbmhlcml0fEJhbGFuY2VyTWVtYmVyfEJhbGFuY2VyUGVyc2lzdHxCcm93c2VyTWF0Y2h8QnJvd3Nlck1hdGNoTm9DYXNlfEJ1ZmZlcmVkTG9nc3xCdWZmZXJTaXplfENhY2hlRGVmYXVsdEV4cGlyZXxDYWNoZURldGFpbEhlYWRlcnxDYWNoZURpckxlbmd0aHxDYWNoZURpckxldmVsc3xDYWNoZURpc2FibGV8Q2FjaGVFbmFibGV8Q2FjaGVGaWxlfENhY2hlSGVhZGVyfENhY2hlSWdub3JlQ2FjaGVDb250cm9sfENhY2hlSWdub3JlSGVhZGVyc3xDYWNoZUlnbm9yZU5vTGFzdE1vZHxDYWNoZUlnbm9yZVF1ZXJ5U3RyaW5nfENhY2hlSWdub3JlVVJMU2Vzc2lvbklkZW50aWZpZXJzfENhY2hlS2V5QmFzZVVSTHxDYWNoZUxhc3RNb2RpZmllZEZhY3RvcnxDYWNoZUxvY2t8Q2FjaGVMb2NrTWF4QWdlfENhY2hlTG9ja1BhdGh8Q2FjaGVNYXhFeHBpcmV8Q2FjaGVNYXhGaWxlU2l6ZXxDYWNoZU1pbkV4cGlyZXxDYWNoZU1pbkZpbGVTaXplfENhY2hlTmVnb3RpYXRlZERvY3N8Q2FjaGVRdWlja0hhbmRsZXJ8Q2FjaGVSZWFkU2l6ZXxDYWNoZVJlYWRUaW1lfENhY2hlUm9vdHxDYWNoZVNvY2FjaGV8Q2FjaGVTb2NhY2hlTWF4U2l6ZXxDYWNoZVNvY2FjaGVNYXhUaW1lfENhY2hlU29jYWNoZU1pblRpbWV8Q2FjaGVTb2NhY2hlUmVhZFNpemV8Q2FjaGVTb2NhY2hlUmVhZFRpbWV8Q2FjaGVTdGFsZU9uRXJyb3J8Q2FjaGVTdG9yZUV4cGlyZWR8Q2FjaGVTdG9yZU5vU3RvcmV8Q2FjaGVTdG9yZVByaXZhdGV8Q0dJRFNjcmlwdFRpbWVvdXR8Q0dJTWFwRXh0ZW5zaW9ufENoYXJzZXREZWZhdWx0fENoYXJzZXRPcHRpb25zfENoYXJzZXRTb3VyY2VFbmN8Q2hlY2tDYXNlT25seXxDaGVja1NwZWxsaW5nfENocm9vdERpcnxDb250ZW50RGlnZXN0fENvb2tpZURvbWFpbnxDb29raWVFeHBpcmVzfENvb2tpZU5hbWV8Q29va2llU3R5bGV8Q29va2llVHJhY2tpbmd8Q29yZUR1bXBEaXJlY3Rvcnl8Q3VzdG9tTG9nfERhdnxEYXZEZXB0aEluZmluaXR5fERhdkdlbmVyaWNMb2NrREJ8RGF2TG9ja0RCfERhdk1pblRpbWVvdXR8REJERXhwdGltZXxEQkRJbml0U1FMfERCREtlZXB8REJETWF4fERCRE1pbnxEQkRQYXJhbXN8REJEUGVyc2lzdHxEQkRQcmVwYXJlU1FMfERCRHJpdmVyfERlZmF1bHRJY29ufERlZmF1bHRMYW5ndWFnZXxEZWZhdWx0UnVudGltZURpcnxEZWZhdWx0VHlwZXxEZWZpbmV8RGVmbGF0ZUJ1ZmZlclNpemV8RGVmbGF0ZUNvbXByZXNzaW9uTGV2ZWx8RGVmbGF0ZUZpbHRlck5vdGV8RGVmbGF0ZUluZmxhdGVMaW1pdFJlcXVlc3RCb2R5fERlZmxhdGVJbmZsYXRlUmF0aW9CdXJzdHxEZWZsYXRlSW5mbGF0ZVJhdGlvTGltaXR8RGVmbGF0ZU1lbUxldmVsfERlZmxhdGVXaW5kb3dTaXplfERlbnl8RGlyZWN0b3J5Q2hlY2tIYW5kbGVyfERpcmVjdG9yeUluZGV4fERpcmVjdG9yeUluZGV4UmVkaXJlY3R8RGlyZWN0b3J5U2xhc2h8RG9jdW1lbnRSb290fERUcmFjZVByaXZpbGVnZXN8RHVtcElPSW5wdXR8RHVtcElPT3V0cHV0fEVuYWJsZUV4Y2VwdGlvbkhvb2t8RW5hYmxlTU1BUHxFbmFibGVTZW5kZmlsZXxFcnJvcnxFcnJvckRvY3VtZW50fEVycm9yTG9nfEVycm9yTG9nRm9ybWF0fEV4YW1wbGV8RXhwaXJlc0FjdGl2ZXxFeHBpcmVzQnlUeXBlfEV4cGlyZXNEZWZhdWx0fEV4dGVuZGVkU3RhdHVzfEV4dEZpbHRlckRlZmluZXxFeHRGaWx0ZXJPcHRpb25zfEZhbGxiYWNrUmVzb3VyY2V8RmlsZUVUYWd8RmlsdGVyQ2hhaW58RmlsdGVyRGVjbGFyZXxGaWx0ZXJQcm90b2NvbHxGaWx0ZXJQcm92aWRlcnxGaWx0ZXJUcmFjZXxGb3JjZUxhbmd1YWdlUHJpb3JpdHl8Rm9yY2VUeXBlfEZvcmVuc2ljTG9nfEdwcm9mRGlyfEdyYWNlZnVsU2h1dGRvd25UaW1lb3V0fEdyb3VwfEhlYWRlcnxIZWFkZXJOYW1lfEhlYXJ0YmVhdEFkZHJlc3N8SGVhcnRiZWF0TGlzdGVufEhlYXJ0YmVhdE1heFNlcnZlcnN8SGVhcnRiZWF0U3RvcmFnZXxIZWFydGJlYXRTdG9yYWdlfEhvc3RuYW1lTG9va3Vwc3xJZGVudGl0eUNoZWNrfElkZW50aXR5Q2hlY2tUaW1lb3V0fEltYXBCYXNlfEltYXBEZWZhdWx0fEltYXBNZW51fEluY2x1ZGV8SW5jbHVkZU9wdGlvbmFsfEluZGV4SGVhZEluc2VydHxJbmRleElnbm9yZXxJbmRleElnbm9yZVJlc2V0fEluZGV4T3B0aW9uc3xJbmRleE9yZGVyRGVmYXVsdHxJbmRleFN0eWxlU2hlZXR8SW5wdXRTZWR8SVNBUElBcHBlbmRMb2dUb0Vycm9yc3xJU0FQSUFwcGVuZExvZ1RvUXVlcnl8SVNBUElDYWNoZUZpbGV8SVNBUElGYWtlQXN5bmN8SVNBUElMb2dOb3RTdXBwb3J0ZWR8SVNBUElSZWFkQWhlYWRCdWZmZXJ8S2VlcEFsaXZlfEtlZXBBbGl2ZVRpbWVvdXR8S2VwdEJvZHlTaXplfExhbmd1YWdlUHJpb3JpdHl8TERBUENhY2hlRW50cmllc3xMREFQQ2FjaGVUVEx8TERBUENvbm5lY3Rpb25Qb29sVFRMfExEQVBDb25uZWN0aW9uVGltZW91dHxMREFQTGlicmFyeURlYnVnfExEQVBPcENhY2hlRW50cmllc3xMREFQT3BDYWNoZVRUTHxMREFQUmVmZXJyYWxIb3BMaW1pdHxMREFQUmVmZXJyYWxzfExEQVBSZXRyaWVzfExEQVBSZXRyeURlbGF5fExEQVBTaGFyZWRDYWNoZUZpbGV8TERBUFNoYXJlZENhY2hlU2l6ZXxMREFQVGltZW91dHxMREFQVHJ1c3RlZENsaWVudENlcnR8TERBUFRydXN0ZWRHbG9iYWxDZXJ0fExEQVBUcnVzdGVkTW9kZXxMREFQVmVyaWZ5U2VydmVyQ2VydHxMaW1pdEludGVybmFsUmVjdXJzaW9ufExpbWl0UmVxdWVzdEJvZHl8TGltaXRSZXF1ZXN0RmllbGRzfExpbWl0UmVxdWVzdEZpZWxkU2l6ZXxMaW1pdFJlcXVlc3RMaW5lfExpbWl0WE1MUmVxdWVzdEJvZHl8TGlzdGVufExpc3RlbkJhY2tMb2d8TG9hZEZpbGV8TG9hZE1vZHVsZXxMb2dGb3JtYXR8TG9nTGV2ZWx8TG9nTWVzc2FnZXxMdWFBdXRoelByb3ZpZGVyfEx1YUNvZGVDYWNoZXxMdWFIb29rQWNjZXNzQ2hlY2tlcnxMdWFIb29rQXV0aENoZWNrZXJ8THVhSG9va0NoZWNrVXNlcklEfEx1YUhvb2tGaXh1cHN8THVhSG9va0luc2VydEZpbHRlcnxMdWFIb29rTG9nfEx1YUhvb2tNYXBUb1N0b3JhZ2V8THVhSG9va1RyYW5zbGF0ZU5hbWV8THVhSG9va1R5cGVDaGVja2VyfEx1YUluaGVyaXR8THVhSW5wdXRGaWx0ZXJ8THVhTWFwSGFuZGxlcnxMdWFPdXRwdXRGaWx0ZXJ8THVhUGFja2FnZUNQYXRofEx1YVBhY2thZ2VQYXRofEx1YVF1aWNrSGFuZGxlcnxMdWFSb290fEx1YVNjb3BlfE1heENvbm5lY3Rpb25zUGVyQ2hpbGR8TWF4S2VlcEFsaXZlUmVxdWVzdHN8TWF4TWVtRnJlZXxNYXhSYW5nZU92ZXJsYXBzfE1heFJhbmdlUmV2ZXJzYWxzfE1heFJhbmdlc3xNYXhSZXF1ZXN0V29ya2Vyc3xNYXhTcGFyZVNlcnZlcnN8TWF4U3BhcmVUaHJlYWRzfE1heFRocmVhZHN8TWVyZ2VUcmFpbGVyc3xNZXRhRGlyfE1ldGFGaWxlc3xNZXRhU3VmZml4fE1pbWVNYWdpY0ZpbGV8TWluU3BhcmVTZXJ2ZXJzfE1pblNwYXJlVGhyZWFkc3xNTWFwRmlsZXxNb2RlbVN0YW5kYXJkfE1vZE1pbWVVc2VQYXRoSW5mb3xNdWx0aXZpZXdzTWF0Y2h8TXV0ZXh8TmFtZVZpcnR1YWxIb3N0fE5vUHJveHl8TldTU0xUcnVzdGVkQ2VydHN8TldTU0xVcGdyYWRlYWJsZXxPcHRpb25zfE9yZGVyfE91dHB1dFNlZHxQYXNzRW52fFBpZEZpbGV8UHJpdmlsZWdlc01vZGV8UHJvdG9jb2x8UHJvdG9jb2xFY2hvfFByb3h5QWRkSGVhZGVyc3xQcm94eUJhZEhlYWRlcnxQcm94eUJsb2NrfFByb3h5RG9tYWlufFByb3h5RXJyb3JPdmVycmlkZXxQcm94eUV4cHJlc3NEQk1GaWxlfFByb3h5RXhwcmVzc0RCTVR5cGV8UHJveHlFeHByZXNzRW5hYmxlfFByb3h5RnRwRGlyQ2hhcnNldHxQcm94eUZ0cEVzY2FwZVdpbGRjYXJkc3xQcm94eUZ0cExpc3RPbldpbGRjYXJkfFByb3h5SFRNTEJ1ZlNpemV8UHJveHlIVE1MQ2hhcnNldE91dHxQcm94eUhUTUxEb2NUeXBlfFByb3h5SFRNTEVuYWJsZXxQcm94eUhUTUxFdmVudHN8UHJveHlIVE1MRXh0ZW5kZWR8UHJveHlIVE1MRml4dXBzfFByb3h5SFRNTEludGVycHxQcm94eUhUTUxMaW5rc3xQcm94eUhUTUxNZXRhfFByb3h5SFRNTFN0cmlwQ29tbWVudHN8UHJveHlIVE1MVVJMTWFwfFByb3h5SU9CdWZmZXJTaXplfFByb3h5TWF4Rm9yd2FyZHN8UHJveHlQYXNzfFByb3h5UGFzc0luaGVyaXR8UHJveHlQYXNzSW50ZXJwb2xhdGVFbnZ8UHJveHlQYXNzTWF0Y2h8UHJveHlQYXNzUmV2ZXJzZXxQcm94eVBhc3NSZXZlcnNlQ29va2llRG9tYWlufFByb3h5UGFzc1JldmVyc2VDb29raWVQYXRofFByb3h5UHJlc2VydmVIb3N0fFByb3h5UmVjZWl2ZUJ1ZmZlclNpemV8UHJveHlSZW1vdGV8UHJveHlSZW1vdGVNYXRjaHxQcm94eVJlcXVlc3RzfFByb3h5U0NHSUludGVybmFsUmVkaXJlY3R8UHJveHlTQ0dJU2VuZGZpbGV8UHJveHlTZXR8UHJveHlTb3VyY2VBZGRyZXNzfFByb3h5U3RhdHVzfFByb3h5VGltZW91dHxQcm94eVZpYXxSZWFkbWVOYW1lfFJlY2VpdmVCdWZmZXJTaXplfFJlZGlyZWN0fFJlZGlyZWN0TWF0Y2h8UmVkaXJlY3RQZXJtYW5lbnR8UmVkaXJlY3RUZW1wfFJlZmxlY3RvckhlYWRlcnxSZW1vdGVJUEhlYWRlcnxSZW1vdGVJUEludGVybmFsUHJveHl8UmVtb3RlSVBJbnRlcm5hbFByb3h5TGlzdHxSZW1vdGVJUFByb3hpZXNIZWFkZXJ8UmVtb3RlSVBUcnVzdGVkUHJveHl8UmVtb3RlSVBUcnVzdGVkUHJveHlMaXN0fFJlbW92ZUNoYXJzZXR8UmVtb3ZlRW5jb2Rpbmd8UmVtb3ZlSGFuZGxlcnxSZW1vdmVJbnB1dEZpbHRlcnxSZW1vdmVMYW5ndWFnZXxSZW1vdmVPdXRwdXRGaWx0ZXJ8UmVtb3ZlVHlwZXxSZXF1ZXN0SGVhZGVyfFJlcXVlc3RSZWFkVGltZW91dHxSZXF1aXJlfFJld3JpdGVCYXNlfFJld3JpdGVDb25kfFJld3JpdGVFbmdpbmV8UmV3cml0ZU1hcHxSZXdyaXRlT3B0aW9uc3xSZXdyaXRlUnVsZXxSTGltaXRDUFV8UkxpbWl0TUVNfFJMaW1pdE5QUk9DfFNhdGlzZnl8U2NvcmVCb2FyZEZpbGV8U2NyaXB0fFNjcmlwdEFsaWFzfFNjcmlwdEFsaWFzTWF0Y2h8U2NyaXB0SW50ZXJwcmV0ZXJTb3VyY2V8U2NyaXB0TG9nfFNjcmlwdExvZ0J1ZmZlcnxTY3JpcHRMb2dMZW5ndGh8U2NyaXB0U29ja3xTZWN1cmVMaXN0ZW58U2VlUmVxdWVzdFRhaWx8U2VuZEJ1ZmZlclNpemV8U2VydmVyQWRtaW58U2VydmVyQWxpYXN8U2VydmVyTGltaXR8U2VydmVyTmFtZXxTZXJ2ZXJQYXRofFNlcnZlclJvb3R8U2VydmVyU2lnbmF0dXJlfFNlcnZlclRva2Vuc3xTZXNzaW9ufFNlc3Npb25Db29raWVOYW1lfFNlc3Npb25Db29raWVOYW1lMnxTZXNzaW9uQ29va2llUmVtb3ZlfFNlc3Npb25DcnlwdG9DaXBoZXJ8U2Vzc2lvbkNyeXB0b0RyaXZlcnxTZXNzaW9uQ3J5cHRvUGFzc3BocmFzZXxTZXNzaW9uQ3J5cHRvUGFzc3BocmFzZUZpbGV8U2Vzc2lvbkRCRENvb2tpZU5hbWV8U2Vzc2lvbkRCRENvb2tpZU5hbWUyfFNlc3Npb25EQkRDb29raWVSZW1vdmV8U2Vzc2lvbkRCRERlbGV0ZUxhYmVsfFNlc3Npb25EQkRJbnNlcnRMYWJlbHxTZXNzaW9uREJEUGVyVXNlcnxTZXNzaW9uREJEU2VsZWN0TGFiZWx8U2Vzc2lvbkRCRFVwZGF0ZUxhYmVsfFNlc3Npb25FbnZ8U2Vzc2lvbkV4Y2x1ZGV8U2Vzc2lvbkhlYWRlcnxTZXNzaW9uSW5jbHVkZXxTZXNzaW9uTWF4QWdlfFNldEVudnxTZXRFbnZJZnxTZXRFbnZJZkV4cHJ8U2V0RW52SWZOb0Nhc2V8U2V0SGFuZGxlcnxTZXRJbnB1dEZpbHRlcnxTZXRPdXRwdXRGaWx0ZXJ8U1NJRW5kVGFnfFNTSUVycm9yTXNnfFNTSUVUYWd8U1NJTGFzdE1vZGlmaWVkfFNTSUxlZ2FjeUV4cHJQYXJzZXJ8U1NJU3RhcnRUYWd8U1NJVGltZUZvcm1hdHxTU0lVbmRlZmluZWRFY2hvfFNTTENBQ2VydGlmaWNhdGVGaWxlfFNTTENBQ2VydGlmaWNhdGVQYXRofFNTTENBRE5SZXF1ZXN0RmlsZXxTU0xDQUROUmVxdWVzdFBhdGh8U1NMQ0FSZXZvY2F0aW9uQ2hlY2t8U1NMQ0FSZXZvY2F0aW9uRmlsZXxTU0xDQVJldm9jYXRpb25QYXRofFNTTENlcnRpZmljYXRlQ2hhaW5GaWxlfFNTTENlcnRpZmljYXRlRmlsZXxTU0xDZXJ0aWZpY2F0ZUtleUZpbGV8U1NMQ2lwaGVyU3VpdGV8U1NMQ29tcHJlc3Npb258U1NMQ3J5cHRvRGV2aWNlfFNTTEVuZ2luZXxTU0xGSVBTfFNTTEhvbm9yQ2lwaGVyT3JkZXJ8U1NMSW5zZWN1cmVSZW5lZ290aWF0aW9ufFNTTE9DU1BEZWZhdWx0UmVzcG9uZGVyfFNTTE9DU1BFbmFibGV8U1NMT0NTUE92ZXJyaWRlUmVzcG9uZGVyfFNTTE9DU1BSZXNwb25kZXJUaW1lb3V0fFNTTE9DU1BSZXNwb25zZU1heEFnZXxTU0xPQ1NQUmVzcG9uc2VUaW1lU2tld3xTU0xPQ1NQVXNlUmVxdWVzdE5vbmNlfFNTTE9wZW5TU0xDb25mQ21kfFNTTE9wdGlvbnN8U1NMUGFzc1BocmFzZURpYWxvZ3xTU0xQcm90b2NvbHxTU0xQcm94eUNBQ2VydGlmaWNhdGVGaWxlfFNTTFByb3h5Q0FDZXJ0aWZpY2F0ZVBhdGh8U1NMUHJveHlDQVJldm9jYXRpb25DaGVja3xTU0xQcm94eUNBUmV2b2NhdGlvbkZpbGV8U1NMUHJveHlDQVJldm9jYXRpb25QYXRofFNTTFByb3h5Q2hlY2tQZWVyQ058U1NMUHJveHlDaGVja1BlZXJFeHBpcmV8U1NMUHJveHlDaGVja1BlZXJOYW1lfFNTTFByb3h5Q2lwaGVyU3VpdGV8U1NMUHJveHlFbmdpbmV8U1NMUHJveHlNYWNoaW5lQ2VydGlmaWNhdGVDaGFpbkZpbGV8U1NMUHJveHlNYWNoaW5lQ2VydGlmaWNhdGVGaWxlfFNTTFByb3h5TWFjaGluZUNlcnRpZmljYXRlUGF0aHxTU0xQcm94eVByb3RvY29sfFNTTFByb3h5VmVyaWZ5fFNTTFByb3h5VmVyaWZ5RGVwdGh8U1NMUmFuZG9tU2VlZHxTU0xSZW5lZ0J1ZmZlclNpemV8U1NMUmVxdWlyZXxTU0xSZXF1aXJlU1NMfFNTTFNlc3Npb25DYWNoZXxTU0xTZXNzaW9uQ2FjaGVUaW1lb3V0fFNTTFNlc3Npb25UaWNrZXRLZXlGaWxlfFNTTFNSUFVua25vd25Vc2VyU2VlZHxTU0xTUlBWZXJpZmllckZpbGV8U1NMU3RhcGxpbmdDYWNoZXxTU0xTdGFwbGluZ0Vycm9yQ2FjaGVUaW1lb3V0fFNTTFN0YXBsaW5nRmFrZVRyeUxhdGVyfFNTTFN0YXBsaW5nRm9yY2VVUkx8U1NMU3RhcGxpbmdSZXNwb25kZXJUaW1lb3V0fFNTTFN0YXBsaW5nUmVzcG9uc2VNYXhBZ2V8U1NMU3RhcGxpbmdSZXNwb25zZVRpbWVTa2V3fFNTTFN0YXBsaW5nUmV0dXJuUmVzcG9uZGVyRXJyb3JzfFNTTFN0YXBsaW5nU3RhbmRhcmRDYWNoZVRpbWVvdXR8U1NMU3RyaWN0U05JVkhvc3RDaGVja3xTU0xVc2VyTmFtZXxTU0xVc2VTdGFwbGluZ3xTU0xWZXJpZnlDbGllbnR8U1NMVmVyaWZ5RGVwdGh8U3RhcnRTZXJ2ZXJzfFN0YXJ0VGhyZWFkc3xTdWJzdGl0dXRlfFN1ZXhlY3xTdWV4ZWNVc2VyR3JvdXB8VGhyZWFkTGltaXR8VGhyZWFkc1BlckNoaWxkfFRocmVhZFN0YWNrU2l6ZXxUaW1lT3V0fFRyYWNlRW5hYmxlfFRyYW5zZmVyTG9nfFR5cGVzQ29uZmlnfFVuRGVmaW5lfFVuZGVmTWFjcm98VW5zZXRFbnZ8VXNlfFVzZUNhbm9uaWNhbE5hbWV8VXNlQ2Fub25pY2FsUGh5c2ljYWxQb3J0fFVzZXJ8VXNlckRpcnxWSG9zdENHSU1vZGV8Vkhvc3RDR0lQcml2c3xWSG9zdEdyb3VwfFZIb3N0UHJpdnN8Vkhvc3RTZWN1cmV8Vkhvc3RVc2VyfFZpcnR1YWxEb2N1bWVudFJvb3R8VmlydHVhbERvY3VtZW50Um9vdElQfFZpcnR1YWxTY3JpcHRBbGlhc3xWaXJ0dWFsU2NyaXB0QWxpYXNJUHxXYXRjaGRvZ0ludGVydmFsfFhCaXRIYWNrfHhtbDJFbmNBbGlhc3x4bWwyRW5jRGVmYXVsdHx4bWwyU3RhcnRQYXJzZSlcXGIvZ21pLFxuXHRcdGFsaWFzOiAncHJvcGVydHknXG5cdH0sXG5cdCdkaXJlY3RpdmUtYmxvY2snOiB7XG5cdFx0cGF0dGVybjogLzxcXC8/XFxiKEF1dGhuUHJvdmlkZXJBbGlhc3xBdXRoelByb3ZpZGVyQWxpYXN8RGlyZWN0b3J5fERpcmVjdG9yeU1hdGNofEVsc2V8RWxzZUlmfEZpbGVzfEZpbGVzTWF0Y2h8SWZ8SWZEZWZpbmV8SWZNb2R1bGV8SWZWZXJzaW9ufExpbWl0fExpbWl0RXhjZXB0fExvY2F0aW9ufExvY2F0aW9uTWF0Y2h8TWFjcm98UHJveHl8UmVxdWlyZUFsbHxSZXF1aXJlQW55fFJlcXVpcmVOb25lfFZpcnR1YWxIb3N0KVxcYiAqLio+L2dpLFxuXHRcdGluc2lkZToge1xuXHRcdFx0J2RpcmVjdGl2ZS1ibG9jayc6IHtcblx0XHRcdFx0cGF0dGVybjogL148XFwvP1xcdysvLFxuXHRcdFx0XHRpbnNpZGU6IHtcblx0XHRcdFx0XHQncHVuY3R1YXRpb24nOiAvXjxcXC8/L1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRhbGlhczogJ3RhZydcblx0XHRcdH0sXG5cdFx0XHQnZGlyZWN0aXZlLWJsb2NrLXBhcmFtZXRlcic6IHtcblx0XHRcdFx0cGF0dGVybjogLy4qW14+XS8sXG5cdFx0XHRcdGluc2lkZToge1xuXHRcdFx0XHRcdCdwdW5jdHVhdGlvbic6IC86Lyxcblx0XHRcdFx0XHQnc3RyaW5nJzoge1xuXHRcdFx0XHRcdFx0cGF0dGVybjogLyhcInwnKS4qXFwxL2csXG5cdFx0XHRcdFx0XHRpbnNpZGU6IHtcblx0XHRcdFx0XHRcdFx0J3ZhcmlhYmxlJzogLyhcXCR8JSlcXHs/KFxcd1xcLj8oXFwrfFxcLXw6KT8pK1xcfT8vZ1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0YWxpYXM6ICdhdHRyLXZhbHVlJ1xuXHRcdFx0fSxcblx0XHRcdCdwdW5jdHVhdGlvbic6IC8+L1xuXHRcdH0sXG5cdFx0YWxpYXM6ICd0YWcnXG5cdH0sXG5cdCdkaXJlY3RpdmUtZmxhZ3MnOiB7XG5cdFx0cGF0dGVybjogL1xcWyhcXHcsPykrXFxdL2csXG5cdFx0YWxpYXM6ICdrZXl3b3JkJ1xuXHR9LFxuXHQnc3RyaW5nJzoge1xuXHRcdHBhdHRlcm46IC8oXCJ8JykuKlxcMS9nLFxuXHRcdGluc2lkZToge1xuXHRcdFx0J3ZhcmlhYmxlJzogLyhcXCR8JSlcXHs/KFxcd1xcLj8oXFwrfFxcLXw6KT8pK1xcfT8vZ1xuXHRcdH1cblx0fSxcblx0J3ZhcmlhYmxlJzogLyhcXCR8JSlcXHs/KFxcd1xcLj8oXFwrfFxcLXw6KT8pK1xcfT8vZyxcblx0J3JlZ2V4JzogL1xcXj8uKlxcJHxcXF4uKlxcJD8vZ1xufTtcblxuUHJpc20ubGFuZ3VhZ2VzLmphdmEgPSBQcmlzbS5sYW5ndWFnZXMuZXh0ZW5kKCdjbGlrZScsIHtcblx0J2tleXdvcmQnOiAvXFxiKGFic3RyYWN0fGNvbnRpbnVlfGZvcnxuZXd8c3dpdGNofGFzc2VydHxkZWZhdWx0fGdvdG98cGFja2FnZXxzeW5jaHJvbml6ZWR8Ym9vbGVhbnxkb3xpZnxwcml2YXRlfHRoaXN8YnJlYWt8ZG91YmxlfGltcGxlbWVudHN8cHJvdGVjdGVkfHRocm93fGJ5dGV8ZWxzZXxpbXBvcnR8cHVibGljfHRocm93c3xjYXNlfGVudW18aW5zdGFuY2VvZnxyZXR1cm58dHJhbnNpZW50fGNhdGNofGV4dGVuZHN8aW50fHNob3J0fHRyeXxjaGFyfGZpbmFsfGludGVyZmFjZXxzdGF0aWN8dm9pZHxjbGFzc3xmaW5hbGx5fGxvbmd8c3RyaWN0ZnB8dm9sYXRpbGV8Y29uc3R8ZmxvYXR8bmF0aXZlfHN1cGVyfHdoaWxlKVxcYi9nLFxuXHQnbnVtYmVyJzogL1xcYjBiWzAxXStcXGJ8XFxiMHhbXFxkYS1mXSpcXC4/W1xcZGEtZnBcXC1dK1xcYnxcXGJcXGQqXFwuP1xcZCtbZV0/W1xcZF0qW2RmXVxcYnxcXFdcXGQqXFwuP1xcZCtcXGIvZ2ksXG5cdCdvcGVyYXRvcic6IHtcblx0XHRwYXR0ZXJuOiAvKF58W15cXC5dKSg/OlxcKz18XFwrXFwrP3wtPXwtLT98IT0/fDx7MSwyfT0/fD57MSwzfT0/fD09P3wmPXwmJj98XFx8PXxcXHxcXHw/fFxcP3xcXCo9P3xcXC89P3wlPT98XFxePT98Onx+KS9nbSxcblx0XHRsb29rYmVoaW5kOiB0cnVlXG5cdH1cbn0pO1xuUHJpc20ubGFuZ3VhZ2VzLnB5dGhvbj0geyBcblx0J2NvbW1lbnQnOiB7XG5cdFx0cGF0dGVybjogLyhefFteXFxcXF0pIy4qPyhcXHI/XFxufCQpL2csXG5cdFx0bG9va2JlaGluZDogdHJ1ZVxuXHR9LFxuXHQnc3RyaW5nJzogL1wiXCJcIltcXHNcXFNdKz9cIlwiXCJ8KFwifCcpKFxcXFw/LikqP1xcMS9nLFxuXHQna2V5d29yZCcgOiAvXFxiKGFzfGFzc2VydHxicmVha3xjbGFzc3xjb250aW51ZXxkZWZ8ZGVsfGVsaWZ8ZWxzZXxleGNlcHR8ZXhlY3xmaW5hbGx5fGZvcnxmcm9tfGdsb2JhbHxpZnxpbXBvcnR8aW58aXN8bGFtYmRhfHBhc3N8cHJpbnR8cmFpc2V8cmV0dXJufHRyeXx3aGlsZXx3aXRofHlpZWxkKVxcYi9nLFxuXHQnYm9vbGVhbicgOiAvXFxiKFRydWV8RmFsc2UpXFxiL2csXG5cdCdudW1iZXInIDogL1xcYi0/KDB4KT9cXGQqXFwuP1tcXGRhLWZdK1xcYi9nLFxuXHQnb3BlcmF0b3InIDogL1stK117MSwyfXw9PyZsdDt8PT8mZ3Q7fCF8PXsxLDJ9fCgmKXsxLDJ9fCgmYW1wOyl7MSwyfXxcXHw/XFx8fFxcP3xcXCp8XFwvfH58XFxefCV8XFxiKG9yfGFuZHxub3QpXFxiL2csXG5cdCdpZ25vcmUnIDogLyYobHR8Z3R8YW1wKTsvZ2ksXG5cdCdwdW5jdHVhdGlvbicgOiAvW3t9W1xcXTsoKSwuOl0vZ1xufTtcblxuXG5QcmlzbS5sYW5ndWFnZXMuYXNwbmV0ID0gUHJpc20ubGFuZ3VhZ2VzLmV4dGVuZCgnbWFya3VwJywge1xuXHQncGFnZS1kaXJlY3RpdmUgdGFnJzoge1xuXHRcdHBhdHRlcm46IC88JVxccypALiolPi9naSxcblx0XHRpbnNpZGU6IHtcblx0XHRcdCdwYWdlLWRpcmVjdGl2ZSB0YWcnOiAvPCVcXHMqQFxccyooPzpBc3NlbWJseXxDb250cm9sfEltcGxlbWVudHN8SW1wb3J0fE1hc3RlcnxNYXN0ZXJUeXBlfE91dHB1dENhY2hlfFBhZ2V8UHJldmlvdXNQYWdlVHlwZXxSZWZlcmVuY2V8UmVnaXN0ZXIpP3wlPi9pZyxcblx0XHRcdHJlc3Q6IFByaXNtLmxhbmd1YWdlcy5tYXJrdXAudGFnLmluc2lkZVxuXHRcdH1cblx0fSxcblx0J2RpcmVjdGl2ZSB0YWcnOiB7XG5cdFx0cGF0dGVybjogLzwlLiolPi9naSxcblx0XHRpbnNpZGU6IHtcblx0XHRcdCdkaXJlY3RpdmUgdGFnJzogLzwlXFxzKj9bJD0lIzpdezAsMn18JT4vZ2ksXG5cdFx0XHRyZXN0OiBQcmlzbS5sYW5ndWFnZXMuY3NoYXJwXG5cdFx0fVxuXHR9XG59KTtcblxuLy8gbWF0Y2ggZGlyZWN0aXZlcyBvZiBhdHRyaWJ1dGUgdmFsdWUgZm9vPVwiPCUgQmFyICU+XCJcblByaXNtLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoJ2luc2lkZScsICdwdW5jdHVhdGlvbicsIHtcblx0J2RpcmVjdGl2ZSB0YWcnOiBQcmlzbS5sYW5ndWFnZXMuYXNwbmV0WydkaXJlY3RpdmUgdGFnJ11cbn0sIFByaXNtLmxhbmd1YWdlcy5hc3BuZXQudGFnLmluc2lkZVtcImF0dHItdmFsdWVcIl0pO1xuXG5QcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKCdhc3BuZXQnLCAnY29tbWVudCcsIHtcblx0J2FzcCBjb21tZW50JzogLzwlLS1bXFx3XFxXXSo/LS0lPi9nXG59KTtcblxuLy8gc2NyaXB0IHJ1bmF0PVwic2VydmVyXCIgY29udGFpbnMgY3NoYXJwLCBub3QgamF2YXNjcmlwdFxuUHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZSgnYXNwbmV0JywgUHJpc20ubGFuZ3VhZ2VzLmphdmFzY3JpcHQgPyAnc2NyaXB0JyA6ICd0YWcnLCB7XG5cdCdhc3Agc2NyaXB0Jzoge1xuXHRcdHBhdHRlcm46IC88c2NyaXB0KD89LipydW5hdD1bJ1wiXT9zZXJ2ZXJbJ1wiXT8pW1xcd1xcV10qPz5bXFx3XFxXXSo/PFxcL3NjcmlwdD4vaWcsXG5cdFx0aW5zaWRlOiB7XG5cdFx0XHR0YWc6IHtcblx0XHRcdFx0cGF0dGVybjogLzxcXC8/c2NyaXB0XFxzKig/OlxccytbXFx3Oi1dKyg/Oj0oPzooXCJ8JykoXFxcXD9bXFx3XFxXXSkqP1xcMXxcXHcrKSk/XFxzKikqXFwvPz4vZ2ksXG5cdFx0XHRcdGluc2lkZTogUHJpc20ubGFuZ3VhZ2VzLmFzcG5ldC50YWcuaW5zaWRlXG5cdFx0XHR9LFxuXHRcdFx0cmVzdDogUHJpc20ubGFuZ3VhZ2VzLmNzaGFycCB8fCB7fVxuXHRcdH1cblx0fVxufSk7XG5cbi8vIEhhY2tzIHRvIGZpeCBlYWdlciB0YWcgbWF0Y2hpbmcgZmluaXNoaW5nIHRvbyBlYXJseTogPHNjcmlwdCBzcmM9XCI8JSBGb28uQmFyICU+XCI+ID0+IDxzY3JpcHQgc3JjPVwiPCUgRm9vLkJhciAlPlxuaWYgKCBQcmlzbS5sYW5ndWFnZXMuYXNwbmV0LnN0eWxlICkge1xuXHRQcmlzbS5sYW5ndWFnZXMuYXNwbmV0LnN0eWxlLmluc2lkZS50YWcucGF0dGVybiA9IC88XFwvP3N0eWxlXFxzKig/OlxccytbXFx3Oi1dKyg/Oj0oPzooXCJ8JykoXFxcXD9bXFx3XFxXXSkqP1xcMXxcXHcrKSk/XFxzKikqXFwvPz4vZ2k7XG5cdFByaXNtLmxhbmd1YWdlcy5hc3BuZXQuc3R5bGUuaW5zaWRlLnRhZy5pbnNpZGUgPSBQcmlzbS5sYW5ndWFnZXMuYXNwbmV0LnRhZy5pbnNpZGU7XG59XG5pZiAoIFByaXNtLmxhbmd1YWdlcy5hc3BuZXQuc2NyaXB0ICkge1xuXHRQcmlzbS5sYW5ndWFnZXMuYXNwbmV0LnNjcmlwdC5pbnNpZGUudGFnLnBhdHRlcm4gPSBQcmlzbS5sYW5ndWFnZXMuYXNwbmV0Wydhc3Agc2NyaXB0J10uaW5zaWRlLnRhZy5wYXR0ZXJuXG5cdFByaXNtLmxhbmd1YWdlcy5hc3BuZXQuc2NyaXB0Lmluc2lkZS50YWcuaW5zaWRlID0gUHJpc20ubGFuZ3VhZ2VzLmFzcG5ldC50YWcuaW5zaWRlO1xufVxuUHJpc20ubGFuZ3VhZ2VzLmNzcyA9IHtcblx0J2NvbW1lbnQnOiAvXFwvXFwqW1xcd1xcV10qP1xcKlxcLy9nLFxuXHQnYXRydWxlJzoge1xuXHRcdHBhdHRlcm46IC9AW1xcdy1dKz8uKj8oO3woPz1cXHMqeykpL2dpLFxuXHRcdGluc2lkZToge1xuXHRcdFx0J3B1bmN0dWF0aW9uJzogL1s7Ol0vZ1xuXHRcdH1cblx0fSxcblx0J3VybCc6IC91cmxcXCgoW1wiJ10/KS4qP1xcMVxcKS9naSxcblx0J3NlbGVjdG9yJzogL1teXFx7XFx9XFxzXVteXFx7XFx9O10qKD89XFxzKlxceykvZyxcblx0J3Byb3BlcnR5JzogLyhcXGJ8XFxCKVtcXHctXSsoPz1cXHMqOikvaWcsXG5cdCdzdHJpbmcnOiAvKFwifCcpKFxcXFw/LikqP1xcMS9nLFxuXHQnaW1wb3J0YW50JzogL1xcQiFpbXBvcnRhbnRcXGIvZ2ksXG5cdCdwdW5jdHVhdGlvbic6IC9bXFx7XFx9OzpdL2csXG5cdCdmdW5jdGlvbic6IC9bLWEtejAtOV0rKD89XFwoKS9pZ1xufTtcblxuaWYgKFByaXNtLmxhbmd1YWdlcy5tYXJrdXApIHtcblx0UHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZSgnbWFya3VwJywgJ3RhZycsIHtcblx0XHQnc3R5bGUnOiB7XG5cdFx0XHRwYXR0ZXJuOiAvPHN0eWxlW1xcd1xcV10qPz5bXFx3XFxXXSo/PFxcL3N0eWxlPi9pZyxcblx0XHRcdGluc2lkZToge1xuXHRcdFx0XHQndGFnJzoge1xuXHRcdFx0XHRcdHBhdHRlcm46IC88c3R5bGVbXFx3XFxXXSo/Pnw8XFwvc3R5bGU+L2lnLFxuXHRcdFx0XHRcdGluc2lkZTogUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cC50YWcuaW5zaWRlXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHJlc3Q6IFByaXNtLmxhbmd1YWdlcy5jc3Ncblx0XHRcdH0sXG5cdFx0XHRhbGlhczogJ2xhbmd1YWdlLWNzcydcblx0XHR9XG5cdH0pO1xuXHRcblx0UHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZSgnaW5zaWRlJywgJ2F0dHItdmFsdWUnLCB7XG5cdFx0J3N0eWxlLWF0dHInOiB7XG5cdFx0XHRwYXR0ZXJuOiAvXFxzKnN0eWxlPShcInwnKS4rP1xcMS9pZyxcblx0XHRcdGluc2lkZToge1xuXHRcdFx0XHQnYXR0ci1uYW1lJzoge1xuXHRcdFx0XHRcdHBhdHRlcm46IC9eXFxzKnN0eWxlL2lnLFxuXHRcdFx0XHRcdGluc2lkZTogUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cC50YWcuaW5zaWRlXG5cdFx0XHRcdH0sXG5cdFx0XHRcdCdwdW5jdHVhdGlvbic6IC9eXFxzKj1cXHMqWydcIl18WydcIl1cXHMqJC8sXG5cdFx0XHRcdCdhdHRyLXZhbHVlJzoge1xuXHRcdFx0XHRcdHBhdHRlcm46IC8uKy9naSxcblx0XHRcdFx0XHRpbnNpZGU6IFByaXNtLmxhbmd1YWdlcy5jc3Ncblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGFsaWFzOiAnbGFuZ3VhZ2UtY3NzJ1xuXHRcdH1cblx0fSwgUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cC50YWcpO1xufVxuUHJpc20ubGFuZ3VhZ2VzLmphdmFzY3JpcHQgPSBQcmlzbS5sYW5ndWFnZXMuZXh0ZW5kKCdjbGlrZScsIHtcblx0J2tleXdvcmQnOiAvXFxiKGJyZWFrfGNhc2V8Y2F0Y2h8Y2xhc3N8Y29uc3R8Y29udGludWV8ZGVidWdnZXJ8ZGVmYXVsdHxkZWxldGV8ZG98ZWxzZXxlbnVtfGV4cG9ydHxleHRlbmRzfGZhbHNlfGZpbmFsbHl8Zm9yfGZ1bmN0aW9ufGdldHxpZnxpbXBsZW1lbnRzfGltcG9ydHxpbnxpbnN0YW5jZW9mfGludGVyZmFjZXxsZXR8bmV3fG51bGx8cGFja2FnZXxwcml2YXRlfHByb3RlY3RlZHxwdWJsaWN8cmV0dXJufHNldHxzdGF0aWN8c3VwZXJ8c3dpdGNofHRoaXN8dGhyb3d8dHJ1ZXx0cnl8dHlwZW9mfHZhcnx2b2lkfHdoaWxlfHdpdGh8eWllbGQpXFxiL2csXG5cdCdudW1iZXInOiAvXFxiLT8oMHhbXFxkQS1GYS1mXSt8XFxkKlxcLj9cXGQrKFtFZV0tP1xcZCspP3xOYU58LT9JbmZpbml0eSlcXGIvZ1xufSk7XG5cblByaXNtLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoJ2phdmFzY3JpcHQnLCAna2V5d29yZCcsIHtcblx0J3JlZ2V4Jzoge1xuXHRcdHBhdHRlcm46IC8oXnxbXi9dKVxcLyg/IVxcLykoXFxbLis/XXxcXFxcLnxbXi9cXHJcXG5dKStcXC9bZ2ltXXswLDN9KD89XFxzKigkfFtcXHJcXG4sLjt9KV0pKS9nLFxuXHRcdGxvb2tiZWhpbmQ6IHRydWVcblx0fVxufSk7XG5cbmlmIChQcmlzbS5sYW5ndWFnZXMubWFya3VwKSB7XG5cdFByaXNtLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoJ21hcmt1cCcsICd0YWcnLCB7XG5cdFx0J3NjcmlwdCc6IHtcblx0XHRcdHBhdHRlcm46IC88c2NyaXB0W1xcd1xcV10qPz5bXFx3XFxXXSo/PFxcL3NjcmlwdD4vaWcsXG5cdFx0XHRpbnNpZGU6IHtcblx0XHRcdFx0J3RhZyc6IHtcblx0XHRcdFx0XHRwYXR0ZXJuOiAvPHNjcmlwdFtcXHdcXFddKj8+fDxcXC9zY3JpcHQ+L2lnLFxuXHRcdFx0XHRcdGluc2lkZTogUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cC50YWcuaW5zaWRlXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHJlc3Q6IFByaXNtLmxhbmd1YWdlcy5qYXZhc2NyaXB0XG5cdFx0XHR9LFxuXHRcdFx0YWxpYXM6ICdsYW5ndWFnZS1qYXZhc2NyaXB0J1xuXHRcdH1cblx0fSk7XG59XG5cblByaXNtLmxhbmd1YWdlcy5yaXAgPSB7XG5cdCdjb21tZW50JzogLyNbXlxcclxcbl0qKFxccj9cXG58JCkvZyxcblxuXHQna2V5d29yZCc6IC8oPzo9PnwtPil8XFxiKD86Y2xhc3N8aWZ8ZWxzZXxzd2l0Y2h8Y2FzZXxyZXR1cm58ZXhpdHx0cnl8Y2F0Y2h8ZmluYWxseXxyYWlzZSlcXGIvZyxcblxuXHQnYnVpbHRpbic6IC9cXGIoQHxTeXN0ZW0pXFxiL2csXG5cblx0J2Jvb2xlYW4nOiAvXFxiKHRydWV8ZmFsc2UpXFxiL2csXG5cblx0J2RhdGUnOiAvXFxiXFxkezR9LVxcZHsyfS1cXGR7Mn1cXGIvZyxcblx0J3RpbWUnOiAvXFxiXFxkezJ9OlxcZHsyfTpcXGR7Mn1cXGIvZyxcblx0J2RhdGV0aW1lJzogL1xcYlxcZHs0fS1cXGR7Mn0tXFxkezJ9VFxcZHsyfTpcXGR7Mn06XFxkezJ9XFxiL2csXG5cblx0J251bWJlcic6IC9bKy1dPyg/Oig/OlxcZCtcXC5cXGQrKXwoPzpcXGQrKSkvZyxcblxuXHQnY2hhcmFjdGVyJzogL1xcQmBbXlxcc1xcYFxcJ1wiLC46OyNcXC9cXFxcKCk8PlxcW1xcXXt9XVxcYi9nLFxuXG5cdCdyZWdleCc6IHtcblx0XHRwYXR0ZXJuOiAvKF58W14vXSlcXC8oPyFcXC8pKFxcWy4rP118XFxcXC58W14vXFxyXFxuXSkrXFwvKD89XFxzKigkfFtcXHJcXG4sLjt9KV0pKS9nLFxuXHRcdGxvb2tiZWhpbmQ6IHRydWVcblx0fSxcblxuXHQnc3ltYm9sJzogLzpbXlxcZFxcc1xcYFxcJ1wiLC46OyNcXC9cXFxcKCk8PlxcW1xcXXt9XVteXFxzXFxgXFwnXCIsLjo7I1xcL1xcXFwoKTw+XFxbXFxde31dKi9nLFxuXHQnc3RyaW5nJzogLyhcInwnKShcXFxcPy4pKj9cXDEvZyxcblxuXHQncHVuY3R1YXRpb24nOiAvKD86XFwuezIsM30pfFtcXGAsLjo7PVxcL1xcXFwoKTw+XFxbXFxde31dLyxcblxuXHQncmVmZXJlbmNlJzogL1teXFxkXFxzXFxgXFwnXCIsLjo7I1xcL1xcXFwoKTw+XFxbXFxde31dW15cXHNcXGBcXCdcIiwuOjsjXFwvXFxcXCgpPD5cXFtcXF17fV0qL2dcbn07XG5cbi8vIE5PVEVTIC0gZm9sbG93cyBmaXJzdC1maXJzdCBoaWdobGlnaHQgbWV0aG9kLCBibG9jayBpcyBsb2NrZWQgYWZ0ZXIgaGlnaGxpZ2h0LCBkaWZmZXJlbnQgZnJvbSBTeW50YXhIbFxyXG5QcmlzbS5sYW5ndWFnZXMuYXV0b2hvdGtleT0ge1xyXG5cdCdjb21tZW50Jzoge1xyXG5cdFx0cGF0dGVybjogLyheW15cIjtcXG5dKihcIlteXCJcXG5dKj9cIlteXCJcXG5dKj8pKikoOy4qJHxeXFxzKlxcL1xcKltcXHNcXFNdKlxcblxcKlxcLykvZ20sXHJcblx0XHRsb29rYmVoaW5kOiB0cnVlXHJcblx0fSxcclxuXHQnc3RyaW5nJzogL1wiKChbXlwiXFxuXFxyXXxcIlwiKSopXCIvZ20sXHJcblx0J2Z1bmN0aW9uJzogL1teXFwoXFwpOyBcXHRcXCxcXG5cXCtcXCpcXC1cXD1cXD8+OlxcXFxcXC88XFwmJVxcW1xcXV0rPyg/PVxcKCkvZ20sICAvL2Z1bmN0aW9uIC0gZG9uJ3QgdXNlIC4qXFwpIGluIHRoZSBlbmQgYmNveiBzdHJpbmcgbG9ja3MgaXRcclxuXHQndGFnJzogL15bIFxcdF0qW15cXHM6XSs/KD89OlteOl0pL2dtLCAgLy9sYWJlbHNcclxuXHQndmFyaWFibGUnOiAvXFwlXFx3K1xcJS9nLFxyXG5cdCdudW1iZXInOiAvXFxiLT8oMHhbXFxkQS1GYS1mXSt8XFxkKlxcLj9cXGQrKFtFZV0tP1xcZCspPylcXGIvZyxcclxuXHQnb3BlcmF0b3InOiAvW1xcK1xcLVxcKlxcXFxcXC86PVxcP1xcJlxcfDw+XS9nLFxyXG5cdCdwdW5jdHVhdGlvbic6IC9bXFx7fVtcXF1cXChcXCk6XS9nLFxyXG5cdCdib29sZWFuJzogL1xcYih0cnVlfGZhbHNlKVxcYi9nLFxyXG5cclxuXHQnc2VsZWN0b3InOiAvXFxiKEF1dG9UcmltfEJsb2NrSW5wdXR8QnJlYWt8Q2xpY2t8Q2xpcFdhaXR8Q29udGludWV8Q29udHJvbHxDb250cm9sQ2xpY2t8Q29udHJvbEZvY3VzfENvbnRyb2xHZXR8Q29udHJvbEdldEZvY3VzfENvbnRyb2xHZXRQb3N8Q29udHJvbEdldFRleHR8Q29udHJvbE1vdmV8Q29udHJvbFNlbmR8Q29udHJvbFNlbmRSYXd8Q29udHJvbFNldFRleHR8Q29vcmRNb2RlfENyaXRpY2FsfERldGVjdEhpZGRlblRleHR8RGV0ZWN0SGlkZGVuV2luZG93c3xEcml2ZXxEcml2ZUdldHxEcml2ZVNwYWNlRnJlZXxFbnZBZGR8RW52RGl2fEVudkdldHxFbnZNdWx0fEVudlNldHxFbnZTdWJ8RW52VXBkYXRlfEV4aXR8RXhpdEFwcHxGaWxlQXBwZW5kfEZpbGVDb3B5fEZpbGVDb3B5RGlyfEZpbGVDcmVhdGVEaXJ8RmlsZUNyZWF0ZVNob3J0Y3V0fEZpbGVEZWxldGV8RmlsZUVuY29kaW5nfEZpbGVHZXRBdHRyaWJ8RmlsZUdldFNob3J0Y3V0fEZpbGVHZXRTaXplfEZpbGVHZXRUaW1lfEZpbGVHZXRWZXJzaW9ufEZpbGVJbnN0YWxsfEZpbGVNb3ZlfEZpbGVNb3ZlRGlyfEZpbGVSZWFkfEZpbGVSZWFkTGluZXxGaWxlUmVjeWNsZXxGaWxlUmVjeWNsZUVtcHR5fEZpbGVSZW1vdmVEaXJ8RmlsZVNlbGVjdEZpbGV8RmlsZVNlbGVjdEZvbGRlcnxGaWxlU2V0QXR0cmlifEZpbGVTZXRUaW1lfEZvcm1hdFRpbWV8R2V0S2V5U3RhdGV8R29zdWJ8R290b3xHcm91cEFjdGl2YXRlfEdyb3VwQWRkfEdyb3VwQ2xvc2V8R3JvdXBEZWFjdGl2YXRlfEd1aXxHdWlDb250cm9sfEd1aUNvbnRyb2xHZXR8SG90a2V5fEltYWdlU2VhcmNofEluaURlbGV0ZXxJbmlSZWFkfEluaVdyaXRlfElucHV0fElucHV0Qm94fEtleVdhaXR8TGlzdEhvdGtleXN8TGlzdExpbmVzfExpc3RWYXJzfExvb3B8TWVudXxNb3VzZUNsaWNrfE1vdXNlQ2xpY2tEcmFnfE1vdXNlR2V0UG9zfE1vdXNlTW92ZXxNc2dCb3h8T25FeGl0fE91dHB1dERlYnVnfFBhdXNlfFBpeGVsR2V0Q29sb3J8UGl4ZWxTZWFyY2h8UG9zdE1lc3NhZ2V8UHJvY2Vzc3xQcm9ncmVzc3xSYW5kb218UmVnRGVsZXRlfFJlZ1JlYWR8UmVnV3JpdGV8UmVsb2FkfFJlcGVhdHxSZXR1cm58UnVufFJ1bkFzfFJ1bldhaXR8U2VuZHxTZW5kRXZlbnR8U2VuZElucHV0fFNlbmRNZXNzYWdlfFNlbmRNb2RlfFNlbmRQbGF5fFNlbmRSYXd8U2V0QmF0Y2hMaW5lc3xTZXRDYXBzbG9ja1N0YXRlfFNldENvbnRyb2xEZWxheXxTZXREZWZhdWx0TW91c2VTcGVlZHxTZXRFbnZ8U2V0Rm9ybWF0fFNldEtleURlbGF5fFNldE1vdXNlRGVsYXl8U2V0TnVtbG9ja1N0YXRlfFNldFNjcm9sbExvY2tTdGF0ZXxTZXRTdG9yZUNhcHNsb2NrTW9kZXxTZXRUaW1lcnxTZXRUaXRsZU1hdGNoTW9kZXxTZXRXaW5EZWxheXxTZXRXb3JraW5nRGlyfFNodXRkb3dufFNsZWVwfFNvcnR8U291bmRCZWVwfFNvdW5kR2V0fFNvdW5kR2V0V2F2ZVZvbHVtZXxTb3VuZFBsYXl8U291bmRTZXR8U291bmRTZXRXYXZlVm9sdW1lfFNwbGFzaEltYWdlfFNwbGFzaFRleHRPZmZ8U3BsYXNoVGV4dE9ufFNwbGl0UGF0aHxTdGF0dXNCYXJHZXRUZXh0fFN0YXR1c0JhcldhaXR8U3RyaW5nQ2FzZVNlbnNlfFN0cmluZ0dldFBvc3xTdHJpbmdMZWZ0fFN0cmluZ0xlbnxTdHJpbmdMb3dlcnxTdHJpbmdNaWR8U3RyaW5nUmVwbGFjZXxTdHJpbmdSaWdodHxTdHJpbmdTcGxpdHxTdHJpbmdUcmltTGVmdHxTdHJpbmdUcmltUmlnaHR8U3RyaW5nVXBwZXJ8U3VzcGVuZHxTeXNHZXR8VGhyZWFkfFRvb2xUaXB8VHJhbnNmb3JtfFRyYXlUaXB8VVJMRG93bmxvYWRUb0ZpbGV8V2luQWN0aXZhdGV8V2luQWN0aXZhdGVCb3R0b218V2luQ2xvc2V8V2luR2V0fFdpbkdldEFjdGl2ZVN0YXRzfFdpbkdldEFjdGl2ZVRpdGxlfFdpbkdldENsYXNzfFdpbkdldFBvc3xXaW5HZXRUZXh0fFdpbkdldFRpdGxlfFdpbkhpZGV8V2luS2lsbHxXaW5NYXhpbWl6ZXxXaW5NZW51U2VsZWN0SXRlbXxXaW5NaW5pbWl6ZXxXaW5NaW5pbWl6ZUFsbHxXaW5NaW5pbWl6ZUFsbFVuZG98V2luTW92ZXxXaW5SZXN0b3JlfFdpblNldHxXaW5TZXRUaXRsZXxXaW5TaG93fFdpbldhaXR8V2luV2FpdEFjdGl2ZXxXaW5XYWl0Q2xvc2V8V2luV2FpdE5vdEFjdGl2ZSlcXGIvaSxcclxuXHJcblx0J2NvbnN0YW50JzogL1xcYihhX2Foa3BhdGh8YV9haGt2ZXJzaW9ufGFfYXBwZGF0YXxhX2FwcGRhdGFjb21tb258YV9hdXRvdHJpbXxhX2JhdGNobGluZXN8YV9jYXJldHh8YV9jYXJldHl8YV9jb21wdXRlcm5hbWV8YV9jb250cm9sZGVsYXl8YV9jdXJzb3J8YV9kZHxhX2RkZHxhX2RkZGR8YV9kZWZhdWx0bW91c2VzcGVlZHxhX2Rlc2t0b3B8YV9kZXNrdG9wY29tbW9ufGFfZGV0ZWN0aGlkZGVudGV4dHxhX2RldGVjdGhpZGRlbndpbmRvd3N8YV9lbmRjaGFyfGFfZXZlbnRpbmZvfGFfZXhpdHJlYXNvbnxhX2Zvcm1hdGZsb2F0fGFfZm9ybWF0aW50ZWdlcnxhX2d1aXxhX2d1aWV2ZW50fGFfZ3VpY29udHJvbHxhX2d1aWNvbnRyb2xldmVudHxhX2d1aWhlaWdodHxhX2d1aXdpZHRofGFfZ3VpeHxhX2d1aXl8YV9ob3VyfGFfaWNvbmZpbGV8YV9pY29uaGlkZGVufGFfaWNvbm51bWJlcnxhX2ljb250aXB8YV9pbmRleHxhX2lwYWRkcmVzczF8YV9pcGFkZHJlc3MyfGFfaXBhZGRyZXNzM3xhX2lwYWRkcmVzczR8YV9pc2FkbWlufGFfaXNjb21waWxlZHxhX2lzY3JpdGljYWx8YV9pc3BhdXNlZHxhX2lzc3VzcGVuZGVkfGFfaXN1bmljb2RlfGFfa2V5ZGVsYXl8YV9sYW5ndWFnZXxhX2xhc3RlcnJvcnxhX2xpbmVmaWxlfGFfbGluZW51bWJlcnxhX2xvb3BmaWVsZHxhX2xvb3BmaWxlYXR0cmlifGFfbG9vcGZpbGVkaXJ8YV9sb29wZmlsZWV4dHxhX2xvb3BmaWxlZnVsbHBhdGh8YV9sb29wZmlsZWxvbmdwYXRofGFfbG9vcGZpbGVuYW1lfGFfbG9vcGZpbGVzaG9ydG5hbWV8YV9sb29wZmlsZXNob3J0cGF0aHxhX2xvb3BmaWxlc2l6ZXxhX2xvb3BmaWxlc2l6ZWtifGFfbG9vcGZpbGVzaXplbWJ8YV9sb29wZmlsZXRpbWVhY2Nlc3NlZHxhX2xvb3BmaWxldGltZWNyZWF0ZWR8YV9sb29wZmlsZXRpbWVtb2RpZmllZHxhX2xvb3ByZWFkbGluZXxhX2xvb3ByZWdrZXl8YV9sb29wcmVnbmFtZXxhX2xvb3ByZWdzdWJrZXl8YV9sb29wcmVndGltZW1vZGlmaWVkfGFfbG9vcHJlZ3R5cGV8YV9tZGF5fGFfbWlufGFfbW18YV9tbW18YV9tbW1tfGFfbW9ufGFfbW91c2VkZWxheXxhX21zZWN8YV9teWRvY3VtZW50c3xhX25vd3xhX25vd3V0Y3xhX251bWJhdGNobGluZXN8YV9vc3R5cGV8YV9vc3ZlcnNpb258YV9wcmlvcmhvdGtleXxwcm9ncmFtZmlsZXN8YV9wcm9ncmFtZmlsZXN8YV9wcm9ncmFtc3xhX3Byb2dyYW1zY29tbW9ufGFfc2NyZWVuaGVpZ2h0fGFfc2NyZWVud2lkdGh8YV9zY3JpcHRkaXJ8YV9zY3JpcHRmdWxscGF0aHxhX3NjcmlwdG5hbWV8YV9zZWN8YV9zcGFjZXxhX3N0YXJ0bWVudXxhX3N0YXJ0bWVudWNvbW1vbnxhX3N0YXJ0dXB8YV9zdGFydHVwY29tbW9ufGFfc3RyaW5nY2FzZXNlbnNlfGFfdGFifGFfdGVtcHxhX3RoaXNmdW5jfGFfdGhpc2hvdGtleXxhX3RoaXNsYWJlbHxhX3RoaXNtZW51fGFfdGhpc21lbnVpdGVtfGFfdGhpc21lbnVpdGVtcG9zfGFfdGlja2NvdW50fGFfdGltZWlkbGV8YV90aW1laWRsZXBoeXNpY2FsfGFfdGltZXNpbmNlcHJpb3Job3RrZXl8YV90aW1lc2luY2V0aGlzaG90a2V5fGFfdGl0bGVtYXRjaG1vZGV8YV90aXRsZW1hdGNobW9kZXNwZWVkfGFfdXNlcm5hbWV8YV93ZGF5fGFfd2luZGVsYXl8YV93aW5kaXJ8YV93b3JraW5nZGlyfGFfeWRheXxhX3llYXJ8YV95d2Vla3xhX3l5eXl8Y2xpcGJvYXJkfGNsaXBib2FyZGFsbHxjb21zcGVjfGVycm9ybGV2ZWwpXFxiL2ksXHJcblxyXG5cdCdidWlsdGluJzogL1xcYihhYnN8YWNvc3xhc2N8YXNpbnxhdGFufGNlaWx8Y2hyfGNsYXNzfGNvc3xkbGxjYWxsfGV4cHxmaWxlZXhpc3R8RmlsZW9wZW58Zmxvb3J8Z2V0a2V5c3RhdGV8aWxfYWRkfGlsX2NyZWF0ZXxpbF9kZXN0cm95fGluc3RyfHN1YnN0cnxpc2Z1bmN8aXNsYWJlbHxJc09iamVjdHxsbnxsb2d8bHZfYWRkfGx2X2RlbGV0ZXxsdl9kZWxldGVjb2x8bHZfZ2V0Y291bnR8bHZfZ2V0bmV4dHxsdl9nZXR0ZXh0fGx2X2luc2VydHxsdl9pbnNlcnRjb2x8bHZfbW9kaWZ5fGx2X21vZGlmeWNvbHxsdl9zZXRpbWFnZWxpc3R8bW9kfG9ubWVzc2FnZXxudW1nZXR8bnVtcHV0fHJlZ2lzdGVyY2FsbGJhY2t8cmVnZXhtYXRjaHxyZWdleHJlcGxhY2V8cm91bmR8c2lufHRhbnxzcXJ0fHN0cmxlbnxzYl9zZXRpY29ufHNiX3NldHBhcnRzfHNiX3NldHRleHR8c3Ryc3BsaXR8dHZfYWRkfHR2X2RlbGV0ZXx0dl9nZXRjaGlsZHx0dl9nZXRjb3VudHx0dl9nZXRuZXh0fHR2X2dldHx0dl9nZXRwYXJlbnR8dHZfZ2V0cHJldnx0dl9nZXRzZWxlY3Rpb258dHZfZ2V0dGV4dHx0dl9tb2RpZnl8dmFyc2V0Y2FwYWNpdHl8d2luYWN0aXZlfHdpbmV4aXN0fF9fTmV3fF9fQ2FsbHxfX0dldHxfX1NldClcXGIvaSxcclxuXHJcblx0J3N5bWJvbCc6IC9cXGIoYWx0fGFsdGRvd258YWx0dXB8YXBwc2tleXxiYWNrc3BhY2V8YnJvd3Nlcl9iYWNrfGJyb3dzZXJfZmF2b3JpdGVzfGJyb3dzZXJfZm9yd2FyZHxicm93c2VyX2hvbWV8YnJvd3Nlcl9yZWZyZXNofGJyb3dzZXJfc2VhcmNofGJyb3dzZXJfc3RvcHxic3xjYXBzbG9ja3xjb250cm9sfGN0cmx8Y3RybGJyZWFrfGN0cmxkb3dufGN0cmx1cHxkZWx8ZGVsZXRlfGRvd258ZW5kfGVudGVyfGVzY3xlc2NhcGV8ZjF8ZjEwfGYxMXxmMTJ8ZjEzfGYxNHxmMTV8ZjE2fGYxN3xmMTh8ZjE5fGYyfGYyMHxmMjF8ZjIyfGYyM3xmMjR8ZjN8ZjR8ZjV8ZjZ8Zjd8Zjh8Zjl8aG9tZXxpbnN8aW5zZXJ0fGpveTF8am95MTB8am95MTF8am95MTJ8am95MTN8am95MTR8am95MTV8am95MTZ8am95MTd8am95MTh8am95MTl8am95Mnxqb3kyMHxqb3kyMXxqb3kyMnxqb3kyM3xqb3kyNHxqb3kyNXxqb3kyNnxqb3kyN3xqb3kyOHxqb3kyOXxqb3kzfGpveTMwfGpveTMxfGpveTMyfGpveTR8am95NXxqb3k2fGpveTd8am95OHxqb3k5fGpveWF4ZXN8am95YnV0dG9uc3xqb3lpbmZvfGpveW5hbWV8am95cG92fGpveXJ8am95dXxqb3l2fGpveXh8am95eXxqb3l6fGxhbHR8bGF1bmNoX2FwcDF8bGF1bmNoX2FwcDJ8bGF1bmNoX21haWx8bGF1bmNoX21lZGlhfGxidXR0b258bGNvbnRyb2x8bGN0cmx8bGVmdHxsc2hpZnR8bHdpbnxsd2luZG93bnxsd2ludXB8bWJ1dHRvbnxtZWRpYV9uZXh0fG1lZGlhX3BsYXlfcGF1c2V8bWVkaWFfcHJldnxtZWRpYV9zdG9wfG51bWxvY2t8bnVtcGFkMHxudW1wYWQxfG51bXBhZDJ8bnVtcGFkM3xudW1wYWQ0fG51bXBhZDV8bnVtcGFkNnxudW1wYWQ3fG51bXBhZDh8bnVtcGFkOXxudW1wYWRhZGR8bnVtcGFkY2xlYXJ8bnVtcGFkZGVsfG51bXBhZGRpdnxudW1wYWRkb3R8bnVtcGFkZG93bnxudW1wYWRlbmR8bnVtcGFkZW50ZXJ8bnVtcGFkaG9tZXxudW1wYWRpbnN8bnVtcGFkbGVmdHxudW1wYWRtdWx0fG51bXBhZHBnZG58bnVtcGFkcGd1cHxudW1wYWRyaWdodHxudW1wYWRzdWJ8bnVtcGFkdXB8cGF1c2V8cGdkbnxwZ3VwfHByaW50c2NyZWVufHJhbHR8cmJ1dHRvbnxyY29udHJvbHxyY3RybHxyaWdodHxyc2hpZnR8cndpbnxyd2luZG93bnxyd2ludXB8c2Nyb2xsbG9ja3xzaGlmdHxzaGlmdGRvd258c2hpZnR1cHxzcGFjZXx0YWJ8dXB8dm9sdW1lX2Rvd258dm9sdW1lX211dGV8dm9sdW1lX3VwfHdoZWVsZG93bnx3aGVlbGxlZnR8d2hlZWxyaWdodHx3aGVlbHVwfHhidXR0b24xfHhidXR0b24yKVxcYi9pLFxyXG5cclxuXHQnaW1wb3J0YW50JzogLyNcXGIoQWxsb3dTYW1lTGluZUNvbW1lbnRzfENsaXBib2FyZFRpbWVvdXR8Q29tbWVudEZsYWd8RXJyb3JTdGRPdXR8RXNjYXBlQ2hhcnxIb3RrZXlJbnRlcnZhbHxIb3RrZXlNb2RpZmllclRpbWVvdXR8SG90c3RyaW5nfElmV2luQWN0aXZlfElmV2luRXhpc3R8SWZXaW5Ob3RBY3RpdmV8SWZXaW5Ob3RFeGlzdHxJbmNsdWRlfEluY2x1ZGVBZ2FpbnxJbnN0YWxsS2V5YmRIb29rfEluc3RhbGxNb3VzZUhvb2t8S2V5SGlzdG9yeXxMVHJpbXxNYXhIb3RrZXlzUGVySW50ZXJ2YWx8TWF4TWVtfE1heFRocmVhZHN8TWF4VGhyZWFkc0J1ZmZlcnxNYXhUaHJlYWRzUGVySG90a2V5fE5vRW52fE5vVHJheUljb258UGVyc2lzdGVudHxTaW5nbGVJbnN0YW5jZXxVc2VIb29rfFdpbkFjdGl2YXRlRm9yY2UpXFxiL2ksXHJcblxyXG5cdCdrZXl3b3JkJzogL1xcYihBYm9ydHxBYm92ZU5vcm1hbHxBZGR8YWhrX2NsYXNzfGFoa19ncm91cHxhaGtfaWR8YWhrX3BpZHxBbGx8QWxudW18QWxwaGF8QWx0U3VibWl0fEFsdFRhYnxBbHRUYWJBbmRNZW51fEFsdFRhYk1lbnV8QWx0VGFiTWVudURpc21pc3N8QWx3YXlzT25Ub3B8QXV0b1NpemV8QmFja2dyb3VuZHxCYWNrZ3JvdW5kVHJhbnN8QmVsb3dOb3JtYWx8YmV0d2VlbnxCaXRBbmR8Qml0Tm90fEJpdE9yfEJpdFNoaWZ0TGVmdHxCaXRTaGlmdFJpZ2h0fEJpdFhPcnxCb2xkfEJvcmRlcnxCdXR0b258QnlSZWZ8Q2hlY2tib3h8Q2hlY2tlZHxDaGVja2VkR3JheXxDaG9vc2V8Q2hvb3NlU3RyaW5nfENsaWNrfENsb3NlfENvbG9yfENvbWJvQm94fENvbnRhaW5zfENvbnRyb2xMaXN0fENvdW50fERhdGV8RGF0ZVRpbWV8RGF5c3xEREx8RGVmYXVsdHxEZWxldGV8RGVsZXRlQWxsfERlbGltaXRlcnxEZXJlZnxEZXN0cm95fERpZ2l0fERpc2FibGV8RGlzYWJsZWR8RHJvcERvd25MaXN0fEVkaXR8RWplY3R8RWxzZXxFbmFibGV8RW5hYmxlZHxFcnJvcnxFeGlzdHxFeHB8RXhwYW5kfEV4U3R5bGV8RmlsZVN5c3RlbXxGaXJzdHxGbGFzaHxGbG9hdHxGbG9hdEZhc3R8Rm9jdXN8Rm9udHxmb3J8Z2xvYmFsfEdyaWR8R3JvdXB8R3JvdXBCb3h8R3VpQ2xvc2V8R3VpQ29udGV4dE1lbnV8R3VpRHJvcEZpbGVzfEd1aUVzY2FwZXxHdWlTaXplfEhkcnxIaWRkZW58SGlkZXxIaWdofEhLQ0N8SEtDUnxIS0NVfEhLRVlfQ0xBU1NFU19ST09UfEhLRVlfQ1VSUkVOVF9DT05GSUd8SEtFWV9DVVJSRU5UX1VTRVJ8SEtFWV9MT0NBTF9NQUNISU5FfEhLRVlfVVNFUlN8SEtMTXxIS1V8SG91cnN8SFNjcm9sbHxJY29ufEljb25TbWFsbHxJRHxJRExhc3R8SWZ8SWZFcXVhbHxJZkV4aXN0fElmR3JlYXRlcnxJZkdyZWF0ZXJPckVxdWFsfElmSW5TdHJpbmd8SWZMZXNzfElmTGVzc09yRXF1YWx8SWZNc2dCb3h8SWZOb3RFcXVhbHxJZk5vdEV4aXN0fElmTm90SW5TdHJpbmd8SWZXaW5BY3RpdmV8SWZXaW5FeGlzdHxJZldpbk5vdEFjdGl2ZXxJZldpbk5vdEV4aXN0fElnbm9yZXxJbWFnZUxpc3R8aW58SW50ZWdlcnxJbnRlZ2VyRmFzdHxJbnRlcnJ1cHR8aXN8aXRhbGljfEpvaW58TGFiZWx8TGFzdEZvdW5kfExhc3RGb3VuZEV4aXN0fExpbWl0fExpbmVzfExpc3R8TGlzdEJveHxMaXN0Vmlld3xMbnxsb2NhbHxMb2NrfExvZ29mZnxMb3d8TG93ZXJ8TG93ZXJjYXNlfE1haW5XaW5kb3d8TWFyZ2lufE1heGltaXplfE1heGltaXplQm94fE1heFNpemV8TWluaW1pemV8TWluaW1pemVCb3h8TWluTWF4fE1pblNpemV8TWludXRlc3xNb250aENhbHxNb3VzZXxNb3ZlfE11bHRpfE5BfE5vfE5vQWN0aXZhdGV8Tm9EZWZhdWx0fE5vSGlkZXxOb0ljb258Tm9NYWluV2luZG93fG5vcm18Tm9ybWFsfE5vU29ydHxOb1NvcnRIZHJ8Tm9TdGFuZGFyZHxOb3R8Tm9UYWJ8Tm9UaW1lcnN8TnVtYmVyfE9mZnxPa3xPbnxPd25EaWFsb2dzfE93bmVyfFBhcnNlfFBhc3N3b3JkfFBpY3R1cmV8UGl4ZWx8UG9zfFBvd3xQcmlvcml0eXxQcm9jZXNzTmFtZXxSYWRpb3xSYW5nZXxSZWFkfFJlYWRPbmx5fFJlYWx0aW1lfFJlZHJhd3xSRUdfQklOQVJZfFJFR19EV09SRHxSRUdfRVhQQU5EX1NafFJFR19NVUxUSV9TWnxSRUdfU1p8UmVnaW9ufFJlbGF0aXZlfFJlbmFtZXxSZXBvcnR8UmVzaXplfFJlc3RvcmV8UmV0cnl8UkdCfFJpZ2h0fFNjcmVlbnxTZWNvbmRzfFNlY3Rpb258U2VyaWFsfFNldExhYmVsfFNoaWZ0QWx0VGFifFNob3d8U2luZ2xlfFNsaWRlcnxTb3J0RGVzY3xTdGFuZGFyZHxzdGF0aWN8U3RhdHVzfFN0YXR1c0JhcnxTdGF0dXNDRHxzdHJpa2V8U3R5bGV8U3VibWl0fFN5c01lbnV8VGFifFRhYjJ8VGFiU3RvcHxUZXh0fFRoZW1lfFRpbGV8VG9nZ2xlQ2hlY2t8VG9nZ2xlRW5hYmxlfFRvb2xXaW5kb3d8VG9wfFRvcG1vc3R8VHJhbnNDb2xvcnxUcmFuc3BhcmVudHxUcmF5fFRyZWVWaWV3fFRyeUFnYWlufFR5cGV8VW5DaGVja3x1bmRlcmxpbmV8VW5pY29kZXxVbmxvY2t8VXBEb3dufFVwcGVyfFVwcGVyY2FzZXxVc2VFcnJvckxldmVsfFZpc3xWaXNGaXJzdHxWaXNpYmxlfFZTY3JvbGx8V2FpdHxXYWl0Q2xvc2V8V2FudEN0cmxBfFdhbnRGMnxXYW50UmV0dXJufFdoaWxlfFdyYXB8WGRpZ2l0fHhtfHhwfHhzfFllc3x5bXx5cHx5cylcXGIvaVxyXG59O1xuLy8gVE9ETzpcbi8vIFx0XHQtIFN1cHBvcnQgZm9yIG91dGxpbmUgcGFyYW1ldGVyc1xuLy8gXHRcdC0gU3VwcG9ydCBmb3IgdGFibGVzXG5cblByaXNtLmxhbmd1YWdlcy5naGVya2luID0ge1xuXHQnY29tbWVudCc6IHtcblx0XHRwYXR0ZXJuOiAvKF58W15cXFxcXSkoXFwvXFwqW1xcd1xcV10qP1xcKlxcL3woKCMpfChcXC9cXC8pKS4qPyhcXHI/XFxufCQpKS9nLFxuXHRcdGxvb2tiZWhpbmQ6IHRydWVcblx0fSxcblx0J3N0cmluZyc6IC8oXCJ8JykoXFxcXD8uKSo/XFwxL2csXG5cdCdhdHJ1bGUnOiAvXFxiKEFuZHxHaXZlbnxXaGVufFRoZW58SW4gb3JkZXIgdG98QXMgYW58SSB3YW50IHRvfEFzIGEpXFxiL2csXG5cdCdrZXl3b3JkJzogL1xcYihTY2VuYXJpbyBPdXRsaW5lfFNjZW5hcmlvfEZlYXR1cmV8QmFja2dyb3VuZHxTdG9yeSlcXGIvZyxcbn07XG5cblByaXNtLmxhbmd1YWdlcy5sYXRleCA9IHtcblx0J2NvbW1lbnQnOiAvJS4qPyhcXHI/XFxufCQpJC9tLFxuXHQnc3RyaW5nJzogLyhcXCQpKFxcXFw/LikqP1xcMS9nLFxuXHQncHVuY3R1YXRpb24nOiAvW3t9XS9nLFxuXHQnc2VsZWN0b3InOiAvXFxcXFthLXo7LDpcXC5dKi9pXG59XG4vKipcbiAqIE9yaWdpbmFsIGJ5IFNhbXVlbCBGbG9yZXNcbiAqXG4gKiBBZGRzIHRoZSBmb2xsb3dpbmcgbmV3IHRva2VuIGNsYXNzZXM6XG4gKiBcdFx0Y29uc3RhbnQsIGJ1aWx0aW4sIHZhcmlhYmxlLCBzeW1ib2wsIHJlZ2V4XG4gKi9cblByaXNtLmxhbmd1YWdlcy5ydWJ5ID0gUHJpc20ubGFuZ3VhZ2VzLmV4dGVuZCgnY2xpa2UnLCB7XG5cdCdjb21tZW50JzogLyNbXlxcclxcbl0qKFxccj9cXG58JCkvZyxcblx0J2tleXdvcmQnOiAvXFxiKGFsaWFzfGFuZHxCRUdJTnxiZWdpbnxicmVha3xjYXNlfGNsYXNzfGRlZnxkZWZpbmVfbWV0aG9kfGRlZmluZWR8ZG98ZWFjaHxlbHNlfGVsc2lmfEVORHxlbmR8ZW5zdXJlfGZhbHNlfGZvcnxpZnxpbnxtb2R1bGV8bmV3fG5leHR8bmlsfG5vdHxvcnxyYWlzZXxyZWRvfHJlcXVpcmV8cmVzY3VlfHJldHJ5fHJldHVybnxzZWxmfHN1cGVyfHRoZW58dGhyb3d8dHJ1ZXx1bmRlZnx1bmxlc3N8dW50aWx8d2hlbnx3aGlsZXx5aWVsZClcXGIvZyxcblx0J2J1aWx0aW4nOiAvXFxiKEFycmF5fEJpZ251bXxCaW5kaW5nfENsYXNzfENvbnRpbnVhdGlvbnxEaXJ8RXhjZXB0aW9ufEZhbHNlQ2xhc3N8RmlsZXxTdGF0fEZpbGV8Rml4bnVtfEZsb2FkfEhhc2h8SW50ZWdlcnxJT3xNYXRjaERhdGF8TWV0aG9kfE1vZHVsZXxOaWxDbGFzc3xOdW1lcmljfE9iamVjdHxQcm9jfFJhbmdlfFJlZ2V4cHxTdHJpbmd8U3RydWN0fFRNU3xTeW1ib2x8VGhyZWFkR3JvdXB8VGhyZWFkfFRpbWV8VHJ1ZUNsYXNzKVxcYi8sXG5cdCdjb25zdGFudCc6IC9cXGJbQS1aXVthLXpBLVpfMC05XSpbPyFdP1xcYi9nXG59KTtcblxuUHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZSgncnVieScsICdrZXl3b3JkJywge1xuXHQncmVnZXgnOiB7XG5cdFx0cGF0dGVybjogLyhefFteL10pXFwvKD8hXFwvKShcXFsuKz9dfFxcXFwufFteL1xcclxcbl0pK1xcL1tnaW1dezAsM30oPz1cXHMqKCR8W1xcclxcbiwuO30pXSkpL2csXG5cdFx0bG9va2JlaGluZDogdHJ1ZVxuXHR9LFxuXHQndmFyaWFibGUnOiAvW0AkXStcXGJbYS16QS1aX11bYS16QS1aXzAtOV0qWz8hXT9cXGIvZyxcblx0J3N5bWJvbCc6IC86XFxiW2EtekEtWl9dW2EtekEtWl8wLTldKls/IV0/XFxiL2dcbn0pO1xuXG5QcmlzbS5sYW5ndWFnZXMuYmFzaCA9IFByaXNtLmxhbmd1YWdlcy5leHRlbmQoJ2NsaWtlJywge1xuXHQnY29tbWVudCc6IHtcblx0XHRwYXR0ZXJuOiAvKF58W15cIntcXFxcXSkoIy4qPyhcXHI/XFxufCQpKS9nLFxuXHRcdGxvb2tiZWhpbmQ6IHRydWVcblx0fSxcblx0J3N0cmluZyc6IHtcblx0XHQvL2FsbG93IG11bHRpbGluZSBzdHJpbmdcblx0XHRwYXR0ZXJuOiAvKFwifCcpKFxcXFw/W1xcc1xcU10pKj9cXDEvZyxcblx0XHRpbnNpZGU6IHtcblx0XHRcdC8vJ3Byb3BlcnR5JyBjbGFzcyByZXVzZWQgZm9yIGJhc2ggdmFyaWFibGVzXG5cdFx0XHQncHJvcGVydHknOiAvXFwkKFthLXpBLVowLTlfI1xcP1xcLVxcKiFAXSt8XFx7W15cXH1dK1xcfSkvZ1xuXHRcdH1cblx0fSxcblx0J2tleXdvcmQnOiAvXFxiKGlmfHRoZW58ZWxzZXxlbGlmfGZpfGZvcnxicmVha3xjb250aW51ZXx3aGlsZXxpbnxjYXNlfGZ1bmN0aW9ufHNlbGVjdHxkb3xkb25lfHVudGlsfGVjaG98ZXhpdHxyZXR1cm58c2V0fGRlY2xhcmUpXFxiL2dcbn0pO1xuXG5QcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKCdiYXNoJywgJ2tleXdvcmQnLCB7XG5cdC8vJ3Byb3BlcnR5JyBjbGFzcyByZXVzZWQgZm9yIGJhc2ggdmFyaWFibGVzXG5cdCdwcm9wZXJ0eSc6IC9cXCQoW2EtekEtWjAtOV8jXFw/XFwtXFwqIUBdK3xcXHtbXn1dK1xcfSkvZ1xufSk7XG5QcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKCdiYXNoJywgJ2NvbW1lbnQnLCB7XG5cdC8vc2hlYmFuZyBtdXN0IGJlIGJlZm9yZSBjb21tZW50LCAnaW1wb3J0YW50JyBjbGFzcyBmcm9tIGNzcyByZXVzZWRcblx0J2ltcG9ydGFudCc6IC8oXiMhXFxzKlxcL2JpblxcL2Jhc2gpfCheIyFcXHMqXFwvYmluXFwvc2gpL2dcbn0pO1xuXG5QcmlzbS5sYW5ndWFnZXMuZ2l0ID0ge1xuXHQvKlxuXHQgKiBBIHNpbXBsZSBvbmUgbGluZSBjb21tZW50IGxpa2UgaW4gYSBnaXQgc3RhdHVzIGNvbW1hbmRcblx0ICogRm9yIGluc3RhbmNlOlxuXHQgKiAkIGdpdCBzdGF0dXNcblx0ICogIyBPbiBicmFuY2ggaW5maW5pdGUtc2Nyb2xsXG5cdCAqICMgWW91ciBicmFuY2ggYW5kICdvcmlnaW4vc2hhcmVkQnJhbmNoZXMvZnJvbnRlbmRUZWFtL2luZmluaXRlLXNjcm9sbCcgaGF2ZSBkaXZlcmdlZCxcblx0ICogIyBhbmQgaGF2ZSAxIGFuZCAyIGRpZmZlcmVudCBjb21taXRzIGVhY2gsIHJlc3BlY3RpdmVseS5cblx0ICogbm90aGluZyB0byBjb21taXQgKHdvcmtpbmcgZGlyZWN0b3J5IGNsZWFuKVxuXHQgKi9cblx0J2NvbW1lbnQnOiAvXiMuKiQvbSxcblxuXHQvKlxuXHQgKiBhIHN0cmluZyAoZG91YmxlIGFuZCBzaW1wbGUgcXVvdGUpXG5cdCAqL1xuXHQnc3RyaW5nJzogLyhcInwnKShcXFxcPy4pKj9cXDEvZ20sXG5cblx0Lypcblx0ICogYSBnaXQgY29tbWFuZC4gSXQgc3RhcnRzIHdpdGggYSByYW5kb20gcHJvbXB0IGZpbmlzaGluZyBieSBhICQsIHRoZW4gXCJnaXRcIiB0aGVuIHNvbWUgb3RoZXIgcGFyYW1ldGVyc1xuXHQgKiBGb3IgaW5zdGFuY2U6XG5cdCAqICQgZ2l0IGFkZCBmaWxlLnR4dFxuXHQgKi9cblx0J2NvbW1hbmQnOiB7XG5cdFx0cGF0dGVybjogL14uKlxcJCBnaXQgLiokL20sXG5cdFx0aW5zaWRlOiB7XG5cdFx0XHQvKlxuXHRcdFx0ICogQSBnaXQgY29tbWFuZCBjYW4gY29udGFpbiBhIHBhcmFtZXRlciBzdGFydGluZyBieSBhIHNpbmdsZSBvciBhIGRvdWJsZSBkYXNoIGZvbGxvd2VkIGJ5IGEgc3RyaW5nXG5cdFx0XHQgKiBGb3IgaW5zdGFuY2U6XG5cdFx0XHQgKiAkIGdpdCBkaWZmIC0tY2FjaGVkXG5cdFx0XHQgKiAkIGdpdCBsb2cgLXBcblx0XHRcdCAqL1xuXHRcdFx0J3BhcmFtZXRlcic6IC9cXHMoLS18LSlcXHcrL21cblx0XHR9XG5cdH0sXG5cblx0Lypcblx0ICogQ29vcmRpbmF0ZXMgZGlzcGxheWVkIGluIGEgZ2l0IGRpZmYgY29tbWFuZFxuXHQgKiBGb3IgaW5zdGFuY2U6XG5cdCAqICQgZ2l0IGRpZmZcblx0ICogZGlmZiAtLWdpdCBmaWxlLnR4dCBmaWxlLnR4dFxuXHQgKiBpbmRleCA2MjE0OTUzLi4xZDU0YTUyIDEwMDY0NFxuXHQgKiAtLS0gZmlsZS50eHRcblx0ICogKysrIGZpbGUudHh0XG5cdCAqIEBAIC0xICsxLDIgQEBcblx0ICogLUhlcmUncyBteSB0ZXR4IGZpbGVcblx0ICogK0hlcmUncyBteSB0ZXh0IGZpbGVcblx0ICogK0FuZCB0aGlzIGlzIHRoZSBzZWNvbmQgbGluZVxuXHQgKi9cblx0J2Nvb3JkJzogL15AQC4qQEAkL20sXG5cblx0Lypcblx0ICogUmVnZXhwIHRvIG1hdGNoIHRoZSBjaGFuZ2VkIGxpbmVzIGluIGEgZ2l0IGRpZmYgb3V0cHV0LiBDaGVjayB0aGUgZXhhbXBsZSBhYm92ZS5cblx0ICovXG5cdCdkZWxldGVkJzogL14tKD8hLSkuKyQvbSxcblx0J2luc2VydGVkJzogL15cXCsoPyFcXCspLiskL20sXG5cblx0Lypcblx0ICogTWF0Y2ggYSBcImNvbW1pdCBbU0hBMV1cIiBsaW5lIGluIGEgZ2l0IGxvZyBvdXRwdXQuXG5cdCAqIEZvciBpbnN0YW5jZTpcblx0ICogJCBnaXQgbG9nXG5cdCAqIGNvbW1pdCBhMTFhMTRlZjdlMjZmMmNhNjJkNGIzNWVhYzQ1NWNlNjM2ZDBkYzA5XG5cdCAqIEF1dGhvcjogbGdpcmF1ZGVsXG5cdCAqIERhdGU6ICAgTW9uIEZlYiAxNyAxMToxODozNCAyMDE0ICswMTAwXG5cdCAqXG5cdCAqICAgICBBZGQgb2YgYSBuZXcgbGluZVxuXHQgKi9cblx0J2NvbW1pdF9zaGExJzogL15jb21taXQgXFx3ezQwfSQvbVxufTtcblxuUHJpc20ubGFuZ3VhZ2VzLnNjYWxhID0gUHJpc20ubGFuZ3VhZ2VzLmV4dGVuZCgnamF2YScsIHtcblx0J2tleXdvcmQnOiAvKDwtfD0+KXxcXGIoYWJzdHJhY3R8Y2FzZXxjYXRjaHxjbGFzc3xkZWZ8ZG98ZWxzZXxleHRlbmRzfGZpbmFsfGZpbmFsbHl8Zm9yfGZvclNvbWV8aWZ8aW1wbGljaXR8aW1wb3J0fGxhenl8bWF0Y2h8bmV3fG51bGx8b2JqZWN0fG92ZXJyaWRlfHBhY2thZ2V8cHJpdmF0ZXxwcm90ZWN0ZWR8cmV0dXJufHNlYWxlZHxzZWxmfHN1cGVyfHRoaXN8dGhyb3d8dHJhaXR8dHJ5fHR5cGV8dmFsfHZhcnx3aGlsZXx3aXRofHlpZWxkKVxcYi9nLFxuXHQnYnVpbHRpbic6IC9cXGIoU3RyaW5nfEludHxMb25nfFNob3J0fEJ5dGV8Qm9vbGVhbnxEb3VibGV8RmxvYXR8Q2hhcnxBbnl8QW55UmVmfEFueVZhbHxVbml0fE5vdGhpbmcpXFxiL2csXG5cdCdudW1iZXInOiAvXFxiMHhbXFxkYS1mXSpcXC4/W1xcZGEtZlxcLV0rXFxifFxcYlxcZCpcXC4/XFxkK1tlXT9bXFxkXSpbZGZsXT9cXGIvZ2ksXG5cdCdzeW1ib2wnOiAvJyhbXlxcZFxcc11cXHcqKS9nLFxuXHQnc3RyaW5nJzogLyhcIlwiXCIpW1xcV1xcd10qP1xcMXwoXCJ8XFwvKVtcXFdcXHddKj9cXDJ8KCcuJykvZ1xufSk7XG5kZWxldGUgUHJpc20ubGFuZ3VhZ2VzLnNjYWxhWydjbGFzcy1uYW1lJywnZnVuY3Rpb24nXTtcblxuUHJpc20ubGFuZ3VhZ2VzLmMgPSBQcmlzbS5sYW5ndWFnZXMuZXh0ZW5kKCdjbGlrZScsIHtcblx0Ly8gYWxsb3cgZm9yIGMgbXVsdGlsaW5lIHN0cmluZ3Ncblx0J3N0cmluZyc6IC8oXCJ8JykoW15cXG5cXFxcXFwxXXxcXFxcLnxcXFxcXFxyKlxcbikqP1xcMS9nLFxuXHQna2V5d29yZCc6IC9cXGIoYXNtfHR5cGVvZnxpbmxpbmV8YXV0b3xicmVha3xjYXNlfGNoYXJ8Y29uc3R8Y29udGludWV8ZGVmYXVsdHxkb3xkb3VibGV8ZWxzZXxlbnVtfGV4dGVybnxmbG9hdHxmb3J8Z290b3xpZnxpbnR8bG9uZ3xyZWdpc3RlcnxyZXR1cm58c2hvcnR8c2lnbmVkfHNpemVvZnxzdGF0aWN8c3RydWN0fHN3aXRjaHx0eXBlZGVmfHVuaW9ufHVuc2lnbmVkfHZvaWR8dm9sYXRpbGV8d2hpbGUpXFxiL2csXG5cdCdvcGVyYXRvcic6IC9bLStdezEsMn18IT0/fDx7MSwyfT0/fD57MSwyfT0/fFxcLT58PXsxLDJ9fFxcXnx+fCV8JnsxLDJ9fFxcfD9cXHx8XFw/fFxcKnxcXC8vZ1xufSk7XG5cblByaXNtLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoJ2MnLCAnc3RyaW5nJywge1xuXHQvLyBwcm9wZXJ0eSBjbGFzcyByZXVzZWQgZm9yIG1hY3JvIHN0YXRlbWVudHNcblx0J3Byb3BlcnR5Jzoge1xuXHRcdC8vIGFsbG93IGZvciBtdWx0aWxpbmUgbWFjcm8gZGVmaW5pdGlvbnNcblx0XHQvLyBzcGFjZXMgYWZ0ZXIgdGhlICMgY2hhcmFjdGVyIGNvbXBpbGUgZmluZSB3aXRoIGdjY1xuXHRcdHBhdHRlcm46IC8oKF58XFxuKVxccyopI1xccypbYS16XSsoW15cXG5cXFxcXXxcXFxcLnxcXFxcXFxyKlxcbikqL2dpLFxuXHRcdGxvb2tiZWhpbmQ6IHRydWUsXG5cdFx0aW5zaWRlOiB7XG5cdFx0XHQvLyBoaWdobGlnaHQgdGhlIHBhdGggb2YgdGhlIGluY2x1ZGUgc3RhdGVtZW50IGFzIGEgc3RyaW5nXG5cdFx0XHQnc3RyaW5nJzoge1xuXHRcdFx0XHRwYXR0ZXJuOiAvKCNcXHMqaW5jbHVkZVxccyopKDwuKz8+fChcInwnKShcXFxcPy4pKz9cXDMpL2csXG5cdFx0XHRcdGxvb2tiZWhpbmQ6IHRydWUsXG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59KTtcblxuZGVsZXRlIFByaXNtLmxhbmd1YWdlcy5jWydjbGFzcy1uYW1lJ107XG5kZWxldGUgUHJpc20ubGFuZ3VhZ2VzLmNbJ2Jvb2xlYW4nXTtcblByaXNtLmxhbmd1YWdlcy5nbyA9IFByaXNtLmxhbmd1YWdlcy5leHRlbmQoJ2NsaWtlJywge1xuXHQna2V5d29yZCc6IC9cXGIoYnJlYWt8Y2FzZXxjaGFufGNvbnN0fGNvbnRpbnVlfGRlZmF1bHR8ZGVmZXJ8ZWxzZXxmYWxsdGhyb3VnaHxmb3J8ZnVuY3xnbyh0byk/fGlmfGltcG9ydHxpbnRlcmZhY2V8bWFwfHBhY2thZ2V8cmFuZ2V8cmV0dXJufHNlbGVjdHxzdHJ1Y3R8c3dpdGNofHR5cGV8dmFyKVxcYi9nLFxuXHQnYnVpbHRpbic6IC9cXGIoYm9vbHxieXRlfGNvbXBsZXgoNjR8MTI4KXxlcnJvcnxmbG9hdCgzMnw2NCl8cnVuZXxzdHJpbmd8dT9pbnQoOHwxNnwzMnw2NHwpfHVpbnRwdHJ8YXBwZW5kfGNhcHxjbG9zZXxjb21wbGV4fGNvcHl8ZGVsZXRlfGltYWd8bGVufG1ha2V8bmV3fHBhbmljfHByaW50KGxuKT98cmVhbHxyZWNvdmVyKVxcYi9nLFxuXHQnYm9vbGVhbic6IC9cXGIoX3xpb3RhfG5pbHx0cnVlfGZhbHNlKVxcYi9nLFxuXHQnb3BlcmF0b3InOiAvKFsoKXt9XFxbXFxdXXxbKlxcLyVeIV09P3xcXCtbPStdP3wtWz49LV0/fFxcfFs9fF0/fD5bPT5dP3w8KDx8Wz0tXSk/fD09P3wmKCZ8PXxePT8pP3xcXC4oXFwuXFwuKT98Wyw7XXw6PT8pL2csXG5cdCdudW1iZXInOiAvXFxiKC0/KDB4W2EtZlxcZF0rfChcXGQrXFwuP1xcZCp8XFwuXFxkKykoZVstK10/XFxkKyk/KWk/KVxcYi9pZyxcblx0J3N0cmluZyc6IC8oXCJ8J3xgKShcXFxcPy58XFxyfFxcbikqP1xcMS9nXG59KTtcbmRlbGV0ZSBQcmlzbS5sYW5ndWFnZXMuZ29bJ2NsYXNzLW5hbWUnXTtcblxuUHJpc20ubGFuZ3VhZ2VzLm5hc20gPSB7XG4gICAgJ2NvbW1lbnQnOiAvOy4qJC9tLFxuICAgICdzdHJpbmcnOiAvKFwifCd8YCkoXFxcXD8uKSo/XFwxL2dtLFxuICAgICdsYWJlbCc6IHtcbiAgICAgICAgcGF0dGVybjogL15cXHMqW0EtWmEtelxcLl9cXD9cXCRdW1xcd1xcLlxcP1xcJEB+I10qOi9tLFxuICAgICAgICBhbGlhczogJ2Z1bmN0aW9uJ1xuICAgIH0sXG4gICAgJ2tleXdvcmQnOiBbXG4gICAgICAgIC9cXFs/QklUUyAoMTZ8MzJ8NjQpXFxdPy9tLFxuICAgICAgICAvXlxccypzZWN0aW9uXFxzKlthLXpBLVpcXC5dKzo/L2ltLFxuICAgICAgICAvKD86ZXh0ZXJufGdsb2JhbClbXjtdKi9pbSxcbiAgICAgICAgLyg/OkNQVXxGTE9BVHxERUZBVUxUKS4qJC9tLFxuICAgIF0sXG4gICAgJ3JlZ2lzdGVyJzoge1xuICAgICAgICBwYXR0ZXJuOiAvXFxiKD86c3RcXGR8W3h5el1tbVxcZFxcZD98W2NkdF1yXFxkfHJcXGRcXGQ/W2J3ZF0/fFtlcl0/W2FiY2RdeHxbYWJjZF1baGxdfFtlcl0/KGJwfHNwfHNpfGRpKXxbY2RlZmdzXXMpXFxiL2dpLCBcbiAgICAgICAgYWxpYXM6ICd2YXJpYWJsZSdcbiAgICB9LFxuICAgICdudW1iZXInOiAvKFxcYnwtfCg/PVxcJCkpKDBbaEh4WF1bXFxkQS1GYS1mXSpcXC4/W1xcZEEtRmEtZl0rKFtwUF1bKy1dP1xcZCspP3xcXGRbXFxkQS1GYS1mXStbaEh4WF18XFwkXFxkW1xcZEEtRmEtZl0qfDBbb09xUV1bMC03XSt8WzAtN10rW29PcVFdfDBbYkJ5WV1bMDFdK3xbMDFdK1tiQnlZXXwwW2REdFRdXFxkK3xcXGQrW2REdFRdP3xcXGQqXFwuP1xcZCsoW0VlXVsrLV0/XFxkKyk/KVxcYi9nLFxuICAgICdvcGVyYXRvcic6IC9bXFxbXFxdXFwqK1xcLVxcLyU8Pj0mfFxcJCFdL2dtXG59O1xuXG5QcmlzbS5sYW5ndWFnZXMuc2NoZW1lID0ge1xuICAgICdib29sZWFuJyA6IC8jKHR8Zil7MX0vLFxuICAgICdjb21tZW50JyA6IC87LiovLFxuICAgICdrZXl3b3JkJyA6IHtcblx0cGF0dGVybiA6IC8oWyhdKShkZWZpbmUoLXN5bnRheHwtbGlicmFyeXwtdmFsdWVzKT98KGNhc2UtKT9sYW1iZGF8bGV0KC12YWx1ZXN8KHJlYyk/KFxcKik/KT98ZWxzZXxpZnxjb25kfGJlZ2lufGRlbGF5fGRlbGF5LWZvcmNlfHBhcmFtZXRlcml6ZXxndWFyZHxzZXQhfChxdWFzaS0pP3F1b3RlfHN5bnRheC1ydWxlcykvLFxuXHRsb29rYmVoaW5kIDogdHJ1ZVxuICAgIH0sXG4gICAgJ2J1aWx0aW4nIDoge1xuXHRwYXR0ZXJuIDogIC8oWyhdKShjb25zfGNhcnxjZHJ8bnVsbFxcP3xwYWlyXFw/fGJvb2xlYW5cXD98ZW9mLW9iamVjdFxcP3xjaGFyXFw/fHByb2NlZHVyZVxcP3xudW1iZXJcXD98cG9ydFxcP3xzdHJpbmdcXD98dmVjdG9yXFw/fHN5bWJvbFxcP3xieXRldmVjdG9yXFw/fGxpc3R8Y2FsbC13aXRoLWN1cnJlbnQtY29udGludWF0aW9ufGNhbGxcXC9jY3xhcHBlbmR8YWJzfGFwcGx5fGV2YWwpXFxiLyxcblx0bG9va2JlaGluZCA6IHRydWVcbiAgICB9LFxuICAgICdzdHJpbmcnIDogIC8oW1wiXSkoPzooPz0oXFxcXD8pKVxcMi4pKj9cXDF8J1teKCd8XFxzKV0rLywgLy90aGFua3MgaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xNzE0ODAvcmVnZXgtZ3JhYmJpbmctdmFsdWVzLWJldHdlZW4tcXVvdGF0aW9uLW1hcmtzXG4gICAgJ251bWJlcicgOiAvKFxcc3xcXCkpWy0rXT9bMC05XSpcXC4/WzAtOV0rKChcXHMqKVstK117MX0oXFxzKilbMC05XSpcXC4/WzAtOV0raSk/LyxcbiAgICAnb3BlcmF0b3InOiAvKFxcKnxcXCt8XFwtfFxcJXxcXC98PD18PT58Pj18PHw9fD4pLyxcbiAgICAnZnVuY3Rpb24nIDoge1xuXHRwYXR0ZXJuIDogLyhbKF0pW14oXFxzfFxcKSldKlxccy8sXG5cdGxvb2tiZWhpbmQgOiB0cnVlXG4gICAgfSxcbiAgICAncHVuY3R1YXRpb24nIDogL1soKV0vXG59O1xuXG4gICAgXG5cbiAgICBcblxuUHJpc20ubGFuZ3VhZ2VzLmdyb292eSA9IFByaXNtLmxhbmd1YWdlcy5leHRlbmQoJ2NsaWtlJywge1xuXHQna2V5d29yZCc6IC9cXGIoYXN8ZGVmfGlufGFic3RyYWN0fGFzc2VydHxib29sZWFufGJyZWFrfGJ5dGV8Y2FzZXxjYXRjaHxjaGFyfGNsYXNzfGNvbnN0fGNvbnRpbnVlfGRlZmF1bHR8ZG98ZG91YmxlfGVsc2V8ZW51bXxleHRlbmRzfGZpbmFsfGZpbmFsbHl8ZmxvYXR8Zm9yfGdvdG98aWZ8aW1wbGVtZW50c3xpbXBvcnR8aW5zdGFuY2VvZnxpbnR8aW50ZXJmYWNlfGxvbmd8bmF0aXZlfG5ld3xwYWNrYWdlfHByaXZhdGV8cHJvdGVjdGVkfHB1YmxpY3xyZXR1cm58c2hvcnR8c3RhdGljfHN0cmljdGZwfHN1cGVyfHN3aXRjaHxzeW5jaHJvbml6ZWR8dGhpc3x0aHJvd3x0aHJvd3N8dHJhaXR8dHJhbnNpZW50fHRyeXx2b2lkfHZvbGF0aWxlfHdoaWxlKVxcYi9nLFxuXHQnc3RyaW5nJzogLyhcIlwiXCJ8JycnKVtcXFdcXHddKj9cXDF8KFwifCd8XFwvKVtcXFdcXHddKj9cXDJ8KFxcJFxcLykoXFwkXFwvXFwkfFtcXFdcXHddKSo/XFwvXFwkL2csXG5cdCdudW1iZXInOiAvXFxiMGJbMDFfXStcXGJ8XFxiMHhbXFxkYS1mX10rKFxcLltcXGRhLWZfcFxcLV0rKT9cXGJ8XFxiW1xcZF9dKyhcXC5bXFxkX10rW2VdP1tcXGRdKik/W2dsaWRmXVxcYnxbXFxkX10rKFxcLltcXGRfXSspP1xcYi9naSxcblx0J29wZXJhdG9yJzoge1xuXHRcdHBhdHRlcm46IC8oXnxbXi5dKSg9ezAsMn1+fFxcP1xcLnxcXCo/XFwuQHxcXC4mfFxcLnsxLDJ9KD8hXFwuKXxcXC57Mn08Pyg/PVxcdyl8LT58XFw/OnxbLStdezEsMn18IXw8PT58PnsxLDN9fDx7MSwyfXw9ezEsMn18JnsxLDJ9fFxcfHsxLDJ9fFxcP3xcXCp7MSwyfXxcXC98XFxefCUpL2csXG5cdFx0bG9va2JlaGluZDogdHJ1ZVxuXHR9LFxuXHQncHVuY3R1YXRpb24nOiAvXFwuK3xbe31bXFxdOygpLDokXS9nXG59KTtcblxuUHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZSgnZ3Jvb3Z5JywgJ3B1bmN0dWF0aW9uJywge1xuXHQnc3BvY2stYmxvY2snOiAvXFxiKHNldHVwfGdpdmVufHdoZW58dGhlbnxhbmR8Y2xlYW51cHxleHBlY3R8d2hlcmUpOi9nXG59KTtcblxuUHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZSgnZ3Jvb3Z5JywgJ2Z1bmN0aW9uJywge1xuXHQnYW5ub3RhdGlvbic6IHtcblx0XHRwYXR0ZXJuOiAvKF58W14uXSlAXFx3Ky8sXG5cdFx0bG9va2JlaGluZDogdHJ1ZVxuXHR9XG59KTtcblxuUHJpc20uaG9va3MuYWRkKCd3cmFwJywgZnVuY3Rpb24oZW52KSB7XG5cdGlmIChlbnYubGFuZ3VhZ2UgPT09ICdncm9vdnknICYmIGVudi50eXBlID09PSAnc3RyaW5nJykge1xuXHRcdHZhciBkZWxpbWl0ZXIgPSBlbnYuY29udGVudFswXTtcblxuXHRcdGlmIChkZWxpbWl0ZXIgIT0gXCInXCIpIHtcblx0XHRcdHZhciBwYXR0ZXJuID0gLyhbXlxcXFxdKShcXCQoXFx7Lio/XFx9fFtcXHdcXC5dKykpLztcblx0XHRcdGlmIChkZWxpbWl0ZXIgPT09ICckJykge1xuXHRcdFx0XHRwYXR0ZXJuID0gLyhbXlxcJF0pKFxcJChcXHsuKj9cXH18W1xcd1xcLl0rKSkvO1xuXHRcdFx0fVxuXHRcdFx0ZW52LmNvbnRlbnQgPSBQcmlzbS5oaWdobGlnaHQoZW52LmNvbnRlbnQsIHtcblx0XHRcdFx0J2V4cHJlc3Npb24nOiB7XG5cdFx0XHRcdFx0cGF0dGVybjogcGF0dGVybixcblx0XHRcdFx0XHRsb29rYmVoaW5kOiB0cnVlLFxuXHRcdFx0XHRcdGluc2lkZTogUHJpc20ubGFuZ3VhZ2VzLmdyb292eVxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdFx0ZW52LmNsYXNzZXMucHVzaChkZWxpbWl0ZXIgPT09ICcvJyA/ICdyZWdleCcgOiAnZ3N0cmluZycpO1xuXHRcdH1cblx0fVxufSk7XG5cbi8qKlxuICogT3JpZ2luYWwgYnkgSmFuIFQuIFNvdHQgKGh0dHA6Ly9naXRodWIuY29tL2lkbGViZXJnKVxuICpcbiAqIEluY2x1ZGVzIGFsbCBjb21tYW5kcyBhbmQgcGx1Zy1pbnMgc2hpcHBlZCB3aXRoIE5TSVMgMy4wYTJcbiAqL1xuIFByaXNtLmxhbmd1YWdlcy5uc2lzID0ge1xuXHQnY29tbWVudCc6IHtcblx0XHRwYXR0ZXJuOiAvKF58W15cXFxcXSkoXFwvXFwqW1xcd1xcV10qP1xcKlxcL3woXnxbXjpdKSgjfDspLio/KFxccj9cXG58JCkpL2csXG5cdFx0bG9va2JlaGluZDogdHJ1ZVxuXHR9LFxuXHQnc3RyaW5nJzogLyhcInwnKShcXFxcPy4pKj9cXDEvZyxcblx0J2tleXdvcmQnOiAvXFxiKEFib3J0fEFkZChCcmFuZGluZ0ltYWdlfFNpemUpfEFkdlNwbGFzaHxBbGxvdyhSb290RGlySW5zdGFsbHxTa2lwRmlsZXMpfEF1dG9DbG9zZVdpbmRvd3xCYW5uZXJ8QkcoRm9udHxHcmFkaWVudHxJbWFnZSl8QnJhbmRpbmdUZXh0fEJyaW5nVG9Gcm9udHxDYWxsKFxcYnxJbnN0RExMKXxDYXB0aW9ufENoYW5nZVVJfENoZWNrQml0bWFwfENsZWFyRXJyb3JzfENvbXBsZXRlZFRleHR8Q29tcG9uZW50VGV4dHxDb3B5RmlsZXN8Q1JDQ2hlY2t8Q3JlYXRlKERpcmVjdG9yeXxGb250fFNob3J0Q3V0KXxEZWxldGUoXFxifElOSVNlY3xJTklTdHJ8UmVnS2V5fFJlZ1ZhbHVlKXxEZXRhaWwoUHJpbnR8c0J1dHRvblRleHQpfERpYWxlcnxEaXIoVGV4dHxWYXJ8VmVyaWZ5KXxFbmFibGVXaW5kb3d8RW51bShSZWdLZXl8UmVnVmFsdWUpfEV4Y2h8RXhlYyhcXGJ8U2hlbGx8V2FpdCl8RXhwYW5kRW52U3RyaW5nc3xGaWxlKFxcYnxCdWZTaXplfENsb3NlfEVycm9yVGV4dHxPcGVufFJlYWR8UmVhZEJ5dGV8UmVhZFVURjE2TEV8UmVhZFdvcmR8V3JpdGVVVEYxNkxFfFNlZWt8V3JpdGV8V3JpdGVCeXRlfFdyaXRlV29yZCl8RmluZChDbG9zZXxGaXJzdHxOZXh0fFdpbmRvdyl8Rmx1c2hJTkl8R2V0KEN1ckluc3RUeXBlfEN1cnJlbnRBZGRyZXNzfERsZ0l0ZW18RExMVmVyc2lvbnxETExWZXJzaW9uTG9jYWx8RXJyb3JMZXZlbHxGaWxlVGltZXxGaWxlVGltZUxvY2FsfEZ1bGxQYXRoTmFtZXxGdW5jdGlvbihcXGJ8QWRkcmVzc3xFbmQpfEluc3REaXJFcnJvcnxMYWJlbEFkZHJlc3N8VGVtcEZpbGVOYW1lKXxHb3RvfEhpZGVXaW5kb3d8SWNvbnxJZihBYm9ydHxFcnJvcnN8RmlsZUV4aXN0c3xSZWJvb3RGbGFnfFNpbGVudCl8SW5pdFBsdWdpbnNEaXJ8SW5zdGFsbChCdXR0b25UZXh0fENvbG9yc3xEaXJ8RGlyUmVnS2V5KXxJbnN0UHJvZ3Jlc3NGbGFnc3xJbnN0KFR5cGV8VHlwZUdldFRleHR8VHlwZVNldFRleHQpfEludChDbXB8Q21wVXxGbXR8T3ApfElzV2luZG93fExhbmcoRExMfFN0cmluZyl8TGljZW5zZShCa0NvbG9yfERhdGF8Rm9yY2VTZWxlY3Rpb258TGFuZ1N0cmluZ3xUZXh0KXxMb2FkTGFuZ3VhZ2VGaWxlfExvY2tXaW5kb3d8TG9nKFNldHxUZXh0KXxNYW5pZmVzdChEUElBd2FyZXxTdXBwb3J0ZWRPUyl8TWF0aHxNZXNzYWdlQm94fE1pc2NCdXR0b25UZXh0fE5hbWV8Tm9wfG5zKERpYWxvZ3N8RXhlYyl8TlNJU2RsfE91dEZpbGV8UGFnZShcXGJ8Q2FsbGJhY2tzKXxQb3B8UHVzaHxRdWl0fFJlYWQoRW52U3RyfElOSVN0cnxSZWdEV09SRHxSZWdTdHIpfFJlYm9vdHxSZWdETEx8UmVuYW1lfFJlcXVlc3RFeGVjdXRpb25MZXZlbHxSZXNlcnZlRmlsZXxSZXR1cm58Uk1EaXJ8U2VhcmNoUGF0aHxTZWN0aW9uKFxcYnxFbmR8R2V0RmxhZ3N8R2V0SW5zdFR5cGVzfEdldFNpemV8R2V0VGV4dHxHcm91cHxJbnxTZXRGbGFnc3xTZXRJbnN0VHlwZXN8U2V0U2l6ZXxTZXRUZXh0KXxTZW5kTWVzc2FnZXxTZXQoQXV0b0Nsb3NlfEJyYW5kaW5nSW1hZ2V8Q29tcHJlc3N8Q29tcHJlc3NvcnxDb21wcmVzc29yRGljdFNpemV8Q3RsQ29sb3JzfEN1ckluc3RUeXBlfERhdGFibG9ja09wdGltaXplfERhdGVTYXZlfERldGFpbHNQcmludHxEZXRhaWxzVmlld3xFcnJvckxldmVsfEVycm9yc3xGaWxlQXR0cmlidXRlc3xGb250fE91dFBhdGh8T3ZlcndyaXRlfFBsdWdpblVubG9hZHxSZWJvb3RGbGFnfFJlZ1ZpZXd8U2hlbGxWYXJDb250ZXh0fFNpbGVudCl8U2hvdyhJbnN0RGV0YWlsc3xVbmluc3REZXRhaWxzfFdpbmRvdyl8U2lsZW50KEluc3RhbGx8VW5JbnN0YWxsKXxTbGVlcHxTcGFjZVRleHRzfFNwbGFzaHxTdGFydE1lbnV8U3RyKENtcHxDbXBTfENweXxMZW4pfFN1YkNhcHRpb258U3lzdGVtfFVuaWNvZGV8VW5pbnN0YWxsKEJ1dHRvblRleHR8Q2FwdGlvbnxJY29ufFN1YkNhcHRpb258VGV4dCl8VW5pbnN0UGFnZXxVblJlZ0RMTHxVc2VySW5mb3xWYXJ8VkkoQWRkVmVyc2lvbktleXxGaWxlVmVyc2lvbnxQcm9kdWN0VmVyc2lvbil8VlBhdGNofFdpbmRvd0ljb258V3JpdGVJTklTdHJ8V3JpdGVSZWdCaW58V3JpdGVSZWdEV09SRHxXcml0ZVJlZ0V4cGFuZFN0cnxXcml0ZShSZWdTdHJ8VW5pbnN0YWxsZXIpfFhQU3R5bGUpXFxiL2csXG5cdCdwcm9wZXJ0eSc6IC9cXGIoYWRtaW58YWxsfGF1dG98Ym90aHxjb2xvcmVkfGZhbHNlfGZvcmNlfGhpZGV8aGlnaGVzdHxsYXN0dXNlZHxsZWF2ZXxsaXN0b25seXxub25lfG5vcm1hbHxub3RzZXR8b2ZmfG9ufG9wZW58cHJpbnR8c2hvd3xzaWxlbnR8c2lsZW50bG9nfHNtb290aHx0ZXh0b25seXx0cnVlfHVzZXJ8QVJDSElWRXxGSUxFXyhBVFRSSUJVVEVfQVJDSElWRXxBVFRSSUJVVEVfTk9STUFMfEFUVFJJQlVURV9PRkZMSU5FfEFUVFJJQlVURV9SRUFET05MWXxBVFRSSUJVVEVfU1lTVEVNfEFUVFJJQlVURV9URU1QT1JBUlkpfEhLKENSfENVfEREfExNfFBEfFUpfEhLRVlfKENMQVNTRVNfUk9PVHxDVVJSRU5UX0NPTkZJR3xDVVJSRU5UX1VTRVJ8RFlOX0RBVEF8TE9DQUxfTUFDSElORXxQRVJGT1JNQU5DRV9EQVRBfFVTRVJTKXxJRChBQk9SVHxDQU5DRUx8SUdOT1JFfE5PfE9LfFJFVFJZfFlFUyl8TUJfKEFCT1JUUkVUUllJR05PUkV8REVGQlVUVE9OMXxERUZCVVRUT04yfERFRkJVVFRPTjN8REVGQlVUVE9ONHxJQ09ORVhDTEFNQVRJT058SUNPTklORk9STUFUSU9OfElDT05RVUVTVElPTnxJQ09OU1RPUHxPS3xPS0NBTkNFTHxSRVRSWUNBTkNFTHxSSUdIVHxSVExSRUFESU5HfFNFVEZPUkVHUk9VTkR8VE9QTU9TVHxVU0VSSUNPTnxZRVNOTyl8Tk9STUFMfE9GRkxJTkV8UkVBRE9OTFl8U0hDVFh8U0hFTExfQ09OVEVYVHxTWVNURU18VEVNUE9SQVJZKVxcYi9nLFxuXHQndmFyaWFibGUnOiAvKFxcJChcXCh8XFx7KT9bLV9cXHddKykoXFwpfFxcfSk/L2ksXG5cdCdudW1iZXInOiAvXFxiLT8oMHhbXFxkQS1GYS1mXSt8XFxkKlxcLj9cXGQrKFtFZV0tP1xcZCspPylcXGIvZyxcblx0J29wZXJhdG9yJzogL1stK117MSwyfXwmbHQ7PT98Pj0/fD17MSwzfXwoJmFtcDspezEsMn18XFx8P1xcfHxcXD98XFwqfFxcL3xcXH58XFxefFxcJS9nLFxuXHQncHVuY3R1YXRpb24nOiAvW3t9W1xcXTsoKSwuOl0vZyxcblx0J2ltcG9ydGFudCc6IC9cXCEoYWRkaW5jbHVkZWRpcnxhZGRwbHVnaW5kaXJ8YXBwZW5kZmlsZXxjZHxkZWZpbmV8ZGVsZmlsZXxlY2hvfGVsc2V8ZW5kaWZ8ZXJyb3J8ZXhlY3V0ZXxmaW5hbGl6ZXxnZXRkbGx2ZXJzaW9uc3lzdGVtfGlmZGVmfGlmbWFjcm9kZWZ8aWZtYWNyb25kZWZ8aWZuZGVmfGlmfGluY2x1ZGV8aW5zZXJ0bWFjcm98bWFjcm9lbmR8bWFjcm98bWFrZW5zaXN8cGFja2hkcnxzZWFyY2hwYXJzZXxzZWFyY2hyZXBsYWNlfHRlbXBmaWxlfHVuZGVmfHZlcmJvc2V8d2FybmluZylcXGIvZ2ksXG59O1xuXG5QcmlzbS5sYW5ndWFnZXMuc2NzcyA9IFByaXNtLmxhbmd1YWdlcy5leHRlbmQoJ2NzcycsIHtcblx0J2NvbW1lbnQnOiB7XG5cdFx0cGF0dGVybjogLyhefFteXFxcXF0pKFxcL1xcKltcXHdcXFddKj9cXCpcXC98XFwvXFwvLio/KFxccj9cXG58JCkpL2csXG5cdFx0bG9va2JlaGluZDogdHJ1ZVxuXHR9LFxuXHQvLyBhdHVybGUgaXMganVzdCB0aGUgQCoqKiwgbm90IHRoZSBlbnRpcmUgcnVsZSAodG8gaGlnaGxpZ2h0IHZhciAmIHN0dWZmcylcblx0Ly8gKyBhZGQgYWJpbGl0eSB0byBoaWdobGlnaHQgbnVtYmVyICYgdW5pdCBmb3IgbWVkaWEgcXVlcmllc1xuXHQnYXRydWxlJzogL0BbXFx3LV0rKD89XFxzKyhcXCh8XFx7fDspKS9naSxcblx0Ly8gdXJsLCBjb21wYXNzaWZpZWRcblx0J3VybCc6IC8oWy1hLXpdKy0pKnVybCg/PVxcKCkvZ2ksXG5cdC8vIENTUyBzZWxlY3RvciByZWdleCBpcyBub3QgYXBwcm9wcmlhdGUgZm9yIFNhc3Ncblx0Ly8gc2luY2UgdGhlcmUgY2FuIGJlIGxvdCBtb3JlIHRoaW5ncyAodmFyLCBAIGRpcmVjdGl2ZSwgbmVzdGluZy4uKVxuXHQvLyBhIHNlbGVjdG9yIG11c3Qgc3RhcnQgYXQgdGhlIGVuZCBvZiBhIHByb3BlcnR5IG9yIGFmdGVyIGEgYnJhY2UgKGVuZCBvZiBvdGhlciBydWxlcyBvciBuZXN0aW5nKVxuXHQvLyBpdCBjYW4gY29udGFpbiBzb21lIGNhcmFjdGVycyB0aGF0IGFyZW4ndCB1c2VkIGZvciBkZWZpbmluZyBydWxlcyBvciBlbmQgb2Ygc2VsZWN0b3IsICYgKHBhcmVudCBzZWxlY3RvciksIG9yIGludGVycG9sYXRlZCB2YXJpYWJsZVxuXHQvLyB0aGUgZW5kIG9mIGEgc2VsZWN0b3IgaXMgZm91bmQgd2hlbiB0aGVyZSBpcyBubyBydWxlcyBpbiBpdCAoIHt9IG9yIHtcXHN9KSBvciBpZiB0aGVyZSBpcyBhIHByb3BlcnR5IChiZWNhdXNlIGFuIGludGVycG9sYXRlZCB2YXJcblx0Ly8gY2FuIFwicGFzc1wiIGFzIGEgc2VsZWN0b3ItIGUuZzogcHJvcGVyI3skZXJ0eX0pXG5cdC8vIHRoaXMgb25lIHdhcyBhcmQgdG8gZG8sIHNvIHBsZWFzZSBiZSBjYXJlZnVsIGlmIHlvdSBlZGl0IHRoaXMgb25lIDopXG5cdCdzZWxlY3Rvcic6IC8oW15AO1xce1xcfVxcKFxcKV0/KFteQDtcXHtcXH1cXChcXCldfCZ8XFwjXFx7XFwkWy1fXFx3XStcXH0pKykoPz1cXHMqXFx7KFxcfXxcXHN8W15cXH1dKyg6fFxceylbXlxcfV0rKSkvZ21cbn0pO1xuXG5QcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKCdzY3NzJywgJ2F0cnVsZScsIHtcblx0J2tleXdvcmQnOiAvQChpZnxlbHNlIGlmfGVsc2V8Zm9yfGVhY2h8d2hpbGV8aW1wb3J0fGV4dGVuZHxkZWJ1Z3x3YXJufG1peGlufGluY2x1ZGV8ZnVuY3Rpb258cmV0dXJufGNvbnRlbnQpfCg/PUBmb3JcXHMrXFwkWy1fXFx3XStcXHMpK2Zyb20vaVxufSk7XG5cblByaXNtLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoJ3Njc3MnLCAncHJvcGVydHknLCB7XG5cdC8vIHZhciBhbmQgaW50ZXJwb2xhdGVkIHZhcnNcblx0J3ZhcmlhYmxlJzogLygoXFwkWy1fXFx3XSspfCgjXFx7XFwkWy1fXFx3XStcXH0pKS9pXG59KTtcblxuUHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZSgnc2NzcycsICdpZ25vcmUnLCB7XG5cdCdwbGFjZWhvbGRlcic6IC8lWy1fXFx3XSsvaSxcblx0J3N0YXRlbWVudCc6IC9cXEIhKGRlZmF1bHR8b3B0aW9uYWwpXFxiL2dpLFxuXHQnYm9vbGVhbic6IC9cXGIodHJ1ZXxmYWxzZSlcXGIvZyxcblx0J251bGwnOiAvXFxiKG51bGwpXFxiL2csXG5cdCdvcGVyYXRvcic6IC9cXHMrKFstK117MSwyfXw9ezEsMn18IT18XFx8P1xcfHxcXD98XFwqfFxcL3xcXCUpXFxzKy9nXG59KTtcblxuUHJpc20ubGFuZ3VhZ2VzLmNvZmZlZXNjcmlwdCA9IFByaXNtLmxhbmd1YWdlcy5leHRlbmQoJ2phdmFzY3JpcHQnLCB7XG5cdCdjb21tZW50JzogW1xuXHRcdC8oWyNdezN9XFxzKlxccj9cXG4oLipcXHMqXFxyKlxcbiopXFxzKj9cXHI/XFxuWyNdezN9KS9nLFxuXHRcdC8oXFxzfF4pKFsjXXsxfVteI15cXHJeXFxuXXsyLH0/KFxccj9cXG58JCkpL2dcblx0XSxcblx0J2tleXdvcmQnOiAvXFxiKHRoaXN8d2luZG93fGRlbGV0ZXxjbGFzc3xleHRlbmRzfG5hbWVzcGFjZXxleHRlbmR8YXJ8bGV0fGlmfGVsc2V8d2hpbGV8ZG98Zm9yfGVhY2h8b2Z8cmV0dXJufGlufGluc3RhbmNlb2Z8bmV3fHdpdGh8dHlwZW9mfHRyeXxjYXRjaHxmaW5hbGx5fG51bGx8dW5kZWZpbmVkfGJyZWFrfGNvbnRpbnVlKVxcYi9nXG59KTtcblxuUHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZSgnY29mZmVlc2NyaXB0JywgJ2tleXdvcmQnLCB7XG5cdCdmdW5jdGlvbic6IHtcblx0XHRwYXR0ZXJuOiAvW2EtenxBLXpdK1xccypbOnw9XVxccyooXFwoWy58YS16XFxzfCx8Onx7fH18XFxcInxcXCd8PV0qXFwpKT9cXHMqLSZndDsvZ2ksXG5cdFx0aW5zaWRlOiB7XG5cdFx0XHQnZnVuY3Rpb24tbmFtZSc6IC9bXz9hLXotfEEtWi1dKyhcXHMqWzp8PV0pfCBAW18/JD9hLXotfEEtWi1dKyhcXHMqKXwgL2csXG5cdFx0XHQnb3BlcmF0b3InOiAvWy0rXXsxLDJ9fCF8PT8mbHQ7fD0/Jmd0O3w9ezEsMn18KCZhbXA7KXsxLDJ9fFxcfD9cXHx8XFw/fFxcKnxcXC8vZ1xuXHRcdH1cblx0fSxcblx0J2F0dHItbmFtZSc6IC9bXz9hLXotfEEtWi1dKyhcXHMqOil8IEBbXz8kP2Etei18QS1aLV0rKFxccyopfCAvZ1xufSk7XG5cblByaXNtLmxhbmd1YWdlcy5oYW5kbGViYXJzID0ge1xuXHQnZXhwcmVzc2lvbic6IHtcblx0XHRwYXR0ZXJuOiAvXFx7XFx7XFx7W1xcd1xcV10rP1xcfVxcfVxcfXxcXHtcXHtbXFx3XFxXXSs/XFx9XFx9L2csXG5cdFx0aW5zaWRlOiB7XG5cdFx0XHQnY29tbWVudCc6IHtcblx0XHRcdFx0cGF0dGVybjogLyhcXHtcXHspIVtcXHdcXFddKig/PVxcfVxcfSkvZyxcblx0XHRcdFx0bG9va2JlaGluZDogdHJ1ZVxuXHRcdFx0fSxcblx0XHRcdCdkZWxpbWl0ZXInOiB7XG5cdFx0XHRcdHBhdHRlcm46IC9eXFx7XFx7XFx7P3xcXH1cXH1cXH0/JC9pZyxcblx0XHRcdFx0YWxpYXM6ICdwdW5jdHVhdGlvbidcblx0XHRcdH0sXG5cdFx0XHQnc3RyaW5nJzogLyhbXCInXSkoXFxcXD8uKSs/XFwxL2csXG5cdFx0XHQnbnVtYmVyJzogL1xcYi0/KDB4W1xcZEEtRmEtZl0rfFxcZCpcXC4/XFxkKyhbRWVdLT9cXGQrKT8pXFxiL2csXG5cdFx0XHQnYm9vbGVhbic6IC9cXGIodHJ1ZXxmYWxzZSlcXGIvZyxcblx0XHRcdCdibG9jayc6IHtcblx0XHRcdFx0cGF0dGVybjogL14oXFxzKn4/XFxzKilbI1xcL11cXHcrL2lnLFxuXHRcdFx0XHRsb29rYmVoaW5kOiB0cnVlLFxuXHRcdFx0XHRhbGlhczogJ2tleXdvcmQnXG5cdFx0XHR9LFxuXHRcdFx0J2JyYWNrZXRzJzoge1xuXHRcdFx0XHRwYXR0ZXJuOiAvXFxbW15cXF1dK1xcXS8sXG5cdFx0XHRcdGluc2lkZToge1xuXHRcdFx0XHRcdHB1bmN0dWF0aW9uOiAvXFxbfFxcXS9nLFxuXHRcdFx0XHRcdHZhcmlhYmxlOiAvW1xcd1xcV10rL2dcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdCdwdW5jdHVhdGlvbic6IC9bIVwiIyUmJygpKissLlxcLzs8PT5AXFxbXFxcXFxcXV5ge3x9fl0vZyxcblx0XHRcdCd2YXJpYWJsZSc6IC9bXiFcIiMlJicoKSorLC5cXC87PD0+QFxcW1xcXFxcXF1eYHt8fX5dKy9nXG5cdFx0fVxuXHR9XG59O1xuXG5pZiAoUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cCkge1xuXG5cdC8vIFRva2VuaXplIGFsbCBpbmxpbmUgSGFuZGxlYmFycyBleHByZXNzaW9ucyB0aGF0IGFyZSB3cmFwcGVkIGluIHt7IH19IG9yIHt7eyB9fX1cblx0Ly8gVGhpcyBhbGxvd3MgZm9yIGVhc3kgSGFuZGxlYmFycyArIG1hcmt1cCBoaWdobGlnaHRpbmdcblx0UHJpc20uaG9va3MuYWRkKCdiZWZvcmUtaGlnaGxpZ2h0JywgZnVuY3Rpb24oZW52KSB7XG5cdFx0Y29uc29sZS5sb2coZW52Lmxhbmd1YWdlKTtcblx0XHRpZiAoZW52Lmxhbmd1YWdlICE9PSAnaGFuZGxlYmFycycpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRlbnYudG9rZW5TdGFjayA9IFtdO1xuXG5cdFx0ZW52LmJhY2t1cENvZGUgPSBlbnYuY29kZTtcblx0XHRlbnYuY29kZSA9IGVudi5jb2RlLnJlcGxhY2UoL1xce1xce1xce1tcXHdcXFddKz9cXH1cXH1cXH18XFx7XFx7W1xcd1xcV10rP1xcfVxcfS9pZywgZnVuY3Rpb24obWF0Y2gpIHtcblx0XHRcdGNvbnNvbGUubG9nKG1hdGNoKTtcblx0XHRcdGVudi50b2tlblN0YWNrLnB1c2gobWF0Y2gpO1xuXG5cdFx0XHRyZXR1cm4gJ19fX0hBTkRMRUJBUlMnICsgZW52LnRva2VuU3RhY2subGVuZ3RoICsgJ19fXyc7XG5cdFx0fSk7XG5cdH0pO1xuXG5cdC8vIFJlc3RvcmUgZW52LmNvZGUgZm9yIG90aGVyIHBsdWdpbnMgKGUuZy4gbGluZS1udW1iZXJzKVxuXHRQcmlzbS5ob29rcy5hZGQoJ2JlZm9yZS1pbnNlcnQnLCBmdW5jdGlvbihlbnYpIHtcblx0XHRpZiAoZW52Lmxhbmd1YWdlID09PSAnaGFuZGxlYmFycycpIHtcblx0XHRcdGVudi5jb2RlID0gZW52LmJhY2t1cENvZGU7XG5cdFx0XHRkZWxldGUgZW52LmJhY2t1cENvZGU7XG5cdFx0fVxuXHR9KTtcblxuXHQvLyBSZS1pbnNlcnQgdGhlIHRva2VucyBhZnRlciBoaWdobGlnaHRpbmdcblx0UHJpc20uaG9va3MuYWRkKCdhZnRlci1oaWdobGlnaHQnLCBmdW5jdGlvbihlbnYpIHtcblx0XHRpZiAoZW52Lmxhbmd1YWdlICE9PSAnaGFuZGxlYmFycycpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRmb3IgKHZhciBpID0gMCwgdDsgdCA9IGVudi50b2tlblN0YWNrW2ldOyBpKyspIHtcblx0XHRcdGVudi5oaWdobGlnaHRlZENvZGUgPSBlbnYuaGlnaGxpZ2h0ZWRDb2RlLnJlcGxhY2UoJ19fX0hBTkRMRUJBUlMnICsgKGkgKyAxKSArICdfX18nLCBQcmlzbS5oaWdobGlnaHQodCwgZW52LmdyYW1tYXIsICdoYW5kbGViYXJzJykpO1xuXHRcdH1cblxuXHRcdGVudi5lbGVtZW50LmlubmVySFRNTCA9IGVudi5oaWdobGlnaHRlZENvZGU7XG5cdH0pO1xuXG5cdC8vIFdyYXAgdG9rZW5zIGluIGNsYXNzZXMgdGhhdCBhcmUgbWlzc2luZyB0aGVtXG5cdFByaXNtLmhvb2tzLmFkZCgnd3JhcCcsIGZ1bmN0aW9uKGVudikge1xuXHRcdGlmIChlbnYubGFuZ3VhZ2UgPT09ICdoYW5kbGViYXJzJyAmJiBlbnYudHlwZSA9PT0gJ21hcmt1cCcpIHtcblx0XHRcdGVudi5jb250ZW50ID0gZW52LmNvbnRlbnQucmVwbGFjZSgvKF9fX0hBTkRMRUJBUlNbMC05XStfX18pL2csIFwiPHNwYW4gY2xhc3M9XFxcInRva2VuIGhhbmRsZWJhcnNcXFwiPiQxPC9zcGFuPlwiKTtcblx0XHR9XG5cdH0pO1xuXG5cdC8vIEFkZCB0aGUgcnVsZXMgYmVmb3JlIGFsbCBvdGhlcnNcblx0UHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZSgnaGFuZGxlYmFycycsICdleHByZXNzaW9uJywge1xuXHRcdCdtYXJrdXAnOiB7XG5cdFx0XHRwYXR0ZXJuOiAvPFteP11cXC8/KC4qPyk+L2csXG5cdFx0XHRpbnNpZGU6IFByaXNtLmxhbmd1YWdlcy5tYXJrdXBcblx0XHR9LFxuXHRcdCdoYW5kbGViYXJzJzogL19fX0hBTkRMRUJBUlNbMC05XStfX18vZ1xuXHR9KTtcbn1cblxuXG5QcmlzbS5sYW5ndWFnZXMub2JqZWN0aXZlYyA9IFByaXNtLmxhbmd1YWdlcy5leHRlbmQoJ2MnLCB7XG5cdCdrZXl3b3JkJzogLyhcXGIoYXNtfHR5cGVvZnxpbmxpbmV8YXV0b3xicmVha3xjYXNlfGNoYXJ8Y29uc3R8Y29udGludWV8ZGVmYXVsdHxkb3xkb3VibGV8ZWxzZXxlbnVtfGV4dGVybnxmbG9hdHxmb3J8Z290b3xpZnxpbnR8bG9uZ3xyZWdpc3RlcnxyZXR1cm58c2hvcnR8c2lnbmVkfHNpemVvZnxzdGF0aWN8c3RydWN0fHN3aXRjaHx0eXBlZGVmfHVuaW9ufHVuc2lnbmVkfHZvaWR8dm9sYXRpbGV8d2hpbGV8aW58c2VsZnxzdXBlcilcXGIpfCgoPz1bXFx3fEBdKShAaW50ZXJmYWNlfEBlbmR8QGltcGxlbWVudGF0aW9ufEBwcm90b2NvbHxAY2xhc3N8QHB1YmxpY3xAcHJvdGVjdGVkfEBwcml2YXRlfEBwcm9wZXJ0eXxAdHJ5fEBjYXRjaHxAZmluYWxseXxAdGhyb3d8QHN5bnRoZXNpemV8QGR5bmFtaWN8QHNlbGVjdG9yKVxcYikvZyxcblx0J3N0cmluZyc6IC8oPzooXCJ8JykoW15cXG5cXFxcXFwxXXxcXFxcLnxcXFxcXFxyKlxcbikqP1xcMSl8KEBcIihbXlxcblxcXFxcIl18XFxcXC58XFxcXFxccipcXG4pKj9cIikvZyxcblx0J29wZXJhdG9yJzogL1stK117MSwyfXwhPT98PHsxLDJ9PT98PnsxLDJ9PT98XFwtPnw9ezEsMn18XFxefH58JXwmezEsMn18XFx8P1xcfHxcXD98XFwqfFxcL3xAL2dcbn0pO1xuXG5QcmlzbS5sYW5ndWFnZXMuc3FsPSB7IFxuXHQnY29tbWVudCc6IHtcblx0XHRwYXR0ZXJuOiAvKF58W15cXFxcXSkoXFwvXFwqW1xcd1xcV10qP1xcKlxcL3woKC0tKXwoXFwvXFwvKXwjKS4qPyhcXHI/XFxufCQpKS9nLFxuXHRcdGxvb2tiZWhpbmQ6IHRydWVcblx0fSxcblx0J3N0cmluZycgOiB7XG5cdFx0cGF0dGVybjogLyhefFteQF0pKFwifCcpKFxcXFw/W1xcc1xcU10pKj9cXDIvZyxcblx0XHRsb29rYmVoaW5kOiB0cnVlXG5cdH0sXG5cdCd2YXJpYWJsZSc6IC9AW1xcdy4kXSt8QChcInwnfGApKFxcXFw/W1xcc1xcU10pKz9cXDEvZyxcblx0J2Z1bmN0aW9uJzogL1xcYig/OkNPVU5UfFNVTXxBVkd8TUlOfE1BWHxGSVJTVHxMQVNUfFVDQVNFfExDQVNFfE1JRHxMRU58Uk9VTkR8Tk9XfEZPUk1BVCkoPz1cXHMqXFwoKS9pZywgLy8gU2hvdWxkIHdlIGhpZ2hsaWdodCB1c2VyIGRlZmluZWQgZnVuY3Rpb25zIHRvbz9cblx0J2tleXdvcmQnOiAvXFxiKD86QUNUSU9OfEFERHxBRlRFUnxBTEdPUklUSE18QUxURVJ8QU5BTFlaRXxBUFBMWXxBU3xBU0N8QVVUSE9SSVpBVElPTnxCQUNLVVB8QkRCfEJFR0lOfEJFUktFTEVZREJ8QklHSU5UfEJJTkFSWXxCSVR8QkxPQnxCT09MfEJPT0xFQU58QlJFQUt8QlJPV1NFfEJUUkVFfEJVTEt8Qll8Q0FMTHxDQVNDQURFfENBU0NBREVEfENBU0V8Q0hBSU58Q0hBUiBWQVJZSU5HfENIQVJBQ1RFUiBWQVJZSU5HfENIRUNLfENIRUNLUE9JTlR8Q0xPU0V8Q0xVU1RFUkVEfENPQUxFU0NFfENPTFVNTnxDT0xVTU5TfENPTU1FTlR8Q09NTUlUfENPTU1JVFRFRHxDT01QVVRFfENPTk5FQ1R8Q09OU0lTVEVOVHxDT05TVFJBSU5UfENPTlRBSU5TfENPTlRBSU5TVEFCTEV8Q09OVElOVUV8Q09OVkVSVHxDUkVBVEV8Q1JPU1N8Q1VSUkVOVHxDVVJSRU5UX0RBVEV8Q1VSUkVOVF9USU1FfENVUlJFTlRfVElNRVNUQU1QfENVUlJFTlRfVVNFUnxDVVJTT1J8REFUQXxEQVRBQkFTRXxEQVRBQkFTRVN8REFURVRJTUV8REJDQ3xERUFMTE9DQVRFfERFQ3xERUNJTUFMfERFQ0xBUkV8REVGQVVMVHxERUZJTkVSfERFTEFZRUR8REVMRVRFfERFTll8REVTQ3xERVNDUklCRXxERVRFUk1JTklTVElDfERJU0FCTEV8RElTQ0FSRHxESVNLfERJU1RJTkNUfERJU1RJTkNUUk9XfERJU1RSSUJVVEVEfERPfERPVUJMRXxET1VCTEUgUFJFQ0lTSU9OfERST1B8RFVNTVl8RFVNUHxEVU1QRklMRXxEVVBMSUNBVEUgS0VZfEVMU0V8RU5BQkxFfEVOQ0xPU0VEIEJZfEVORHxFTkdJTkV8RU5VTXxFUlJMVkx8RVJST1JTfEVTQ0FQRXxFU0NBUEVEIEJZfEVYQ0VQVHxFWEVDfEVYRUNVVEV8RVhJVHxFWFBMQUlOfEVYVEVOREVEfEZFVENIfEZJRUxEU3xGSUxFfEZJTExGQUNUT1J8RklSU1R8RklYRUR8RkxPQVR8Rk9MTE9XSU5HfEZPUnxGT1IgRUFDSCBST1d8Rk9SQ0V8Rk9SRUlHTnxGUkVFVEVYVHxGUkVFVEVYVFRBQkxFfEZST018RlVMTHxGVU5DVElPTnxHRU9NRVRSWXxHRU9NRVRSWUNPTExFQ1RJT058R0xPQkFMfEdPVE98R1JBTlR8R1JPVVB8SEFORExFUnxIQVNIfEhBVklOR3xIT0xETE9DS3xJREVOVElUWXxJREVOVElUWV9JTlNFUlR8SURFTlRJVFlDT0x8SUZ8SUdOT1JFfElNUE9SVHxJTkRFWHxJTkZJTEV8SU5ORVJ8SU5OT0RCfElOT1VUfElOU0VSVHxJTlR8SU5URUdFUnxJTlRFUlNFQ1R8SU5UT3xJTlZPS0VSfElTT0xBVElPTiBMRVZFTHxKT0lOfEtFWXxLRVlTfEtJTEx8TEFOR1VBR0UgU1FMfExBU1R8TEVGVHxMSU1JVHxMSU5FTk98TElORVN8TElORVNUUklOR3xMT0FEfExPQ0FMfExPQ0t8TE9OR0JMT0J8TE9OR1RFWFR8TUFUQ0h8TUFUQ0hFRHxNRURJVU1CTE9CfE1FRElVTUlOVHxNRURJVU1URVhUfE1FUkdFfE1JRERMRUlOVHxNT0RJRklFUyBTUUwgREFUQXxNT0RJRll8TVVMVElMSU5FU1RSSU5HfE1VTFRJUE9JTlR8TVVMVElQT0xZR09OfE5BVElPTkFMfE5BVElPTkFMIENIQVIgVkFSWUlOR3xOQVRJT05BTCBDSEFSQUNURVJ8TkFUSU9OQUwgQ0hBUkFDVEVSIFZBUllJTkd8TkFUSU9OQUwgVkFSQ0hBUnxOQVRVUkFMfE5DSEFSfE5DSEFSIFZBUkNIQVJ8TkVYVHxOT3xOTyBTUUx8Tk9DSEVDS3xOT0NZQ0xFfE5PTkNMVVNURVJFRHxOVUxMSUZ8TlVNRVJJQ3xPRnxPRkZ8T0ZGU0VUU3xPTnxPUEVOfE9QRU5EQVRBU09VUkNFfE9QRU5RVUVSWXxPUEVOUk9XU0VUfE9QVElNSVpFfE9QVElPTnxPUFRJT05BTExZfE9SREVSfE9VVHxPVVRFUnxPVVRGSUxFfE9WRVJ8UEFSVElBTHxQQVJUSVRJT058UEVSQ0VOVHxQSVZPVHxQTEFOfFBPSU5UfFBPTFlHT058UFJFQ0VESU5HfFBSRUNJU0lPTnxQUkVWfFBSSU1BUll8UFJJTlR8UFJJVklMRUdFU3xQUk9DfFBST0NFRFVSRXxQVUJMSUN8UFVSR0V8UVVJQ0t8UkFJU0VSUk9SfFJFQUR8UkVBRFMgU1FMIERBVEF8UkVBRFRFWFR8UkVBTHxSRUNPTkZJR1VSRXxSRUZFUkVOQ0VTfFJFTEVBU0V8UkVOQU1FfFJFUEVBVEFCTEV8UkVQTElDQVRJT058UkVRVUlSRXxSRVNUT1JFfFJFU1RSSUNUfFJFVFVSTnxSRVRVUk5TfFJFVk9LRXxSSUdIVHxST0xMQkFDS3xST1VUSU5FfFJPV0NPVU5UfFJPV0dVSURDT0x8Uk9XUz98UlRSRUV8UlVMRXxTQVZFfFNBVkVQT0lOVHxTQ0hFTUF8U0VMRUNUfFNFUklBTHxTRVJJQUxJWkFCTEV8U0VTU0lPTnxTRVNTSU9OX1VTRVJ8U0VUfFNFVFVTRVJ8U0hBUkUgTU9ERXxTSE9XfFNIVVRET1dOfFNJTVBMRXxTTUFMTElOVHxTTkFQU0hPVHxTT01FfFNPTkFNRXxTVEFSVHxTVEFSVElORyBCWXxTVEFUSVNUSUNTfFNUQVRVU3xTVFJJUEVEfFNZU1RFTV9VU0VSfFRBQkxFfFRBQkxFU3xUQUJMRVNQQUNFfFRFTVAoPzpPUkFSWSk/fFRFTVBUQUJMRXxURVJNSU5BVEVEIEJZfFRFWFR8VEVYVFNJWkV8VEhFTnxUSU1FU1RBTVB8VElOWUJMT0J8VElOWUlOVHxUSU5ZVEVYVHxUT3xUT1B8VFJBTnxUUkFOU0FDVElPTnxUUkFOU0FDVElPTlN8VFJJR0dFUnxUUlVOQ0FURXxUU0VRVUFMfFRZUEV8VFlQRVN8VU5CT1VOREVEfFVOQ09NTUlUVEVEfFVOREVGSU5FRHxVTklPTnxVTlBJVk9UfFVQREFURXxVUERBVEVURVhUfFVTQUdFfFVTRXxVU0VSfFVTSU5HfFZBTFVFfFZBTFVFU3xWQVJCSU5BUll8VkFSQ0hBUnxWQVJDSEFSQUNURVJ8VkFSWUlOR3xWSUVXfFdBSVRGT1J8V0FSTklOR1N8V0hFTnxXSEVSRXxXSElMRXxXSVRIfFdJVEggUk9MTFVQfFdJVEhJTnxXT1JLfFdSSVRFfFdSSVRFVEVYVClcXGIvZ2ksXG5cdCdib29sZWFuJzogL1xcYig/OlRSVUV8RkFMU0V8TlVMTClcXGIvZ2ksXG5cdCdudW1iZXInOiAvXFxiLT8oMHgpP1xcZCpcXC4/W1xcZGEtZl0rXFxiL2csXG5cdCdvcGVyYXRvcic6IC9cXGIoPzpBTEx8QU5EfEFOWXxCRVRXRUVOfEVYSVNUU3xJTnxMSUtFfE5PVHxPUnxJU3xVTklRVUV8Q0hBUkFDVEVSIFNFVHxDT0xMQVRFfERJVnxPRkZTRVR8UkVHRVhQfFJMSUtFfFNPVU5EUyBMSUtFfFhPUilcXGJ8Wy0rXXsxfXwhfFs9PD5dezEsMn18KCYpezEsMn18XFx8P1xcfHxcXD98XFwqfFxcLy9naSxcblx0J3B1bmN0dWF0aW9uJzogL1s7W1xcXSgpYCwuXS9nXG59O1xuUHJpc20ubGFuZ3VhZ2VzLmhhc2tlbGw9IHtcblx0J2NvbW1lbnQnOiB7XG5cdFx0cGF0dGVybjogLyhefFteLSEjJCUqKz1cXD8mQHx+Ljo8Pl5cXFxcXSkoLS1bXi0hIyQlKis9XFw/JkB8fi46PD5eXFxcXF0uKihcXHI/XFxufCQpfHstW1xcd1xcV10qPy19KS9nbSxcblx0XHRsb29rYmVoaW5kOiB0cnVlXG5cdH0sXG5cdCdjaGFyJzogLycoW15cXFxcXCJdfFxcXFwoW2FiZm5ydHZcXFxcXCInJl18XFxeW0EtWkBbXFxdXFxeX118TlVMfFNPSHxTVFh8RVRYfEVPVHxFTlF8QUNLfEJFTHxCU3xIVHxMRnxWVHxGRnxDUnxTT3xTSXxETEV8REMxfERDMnxEQzN8REM0fE5BS3xTWU58RVRCfENBTnxFTXxTVUJ8RVNDfEZTfEdTfFJTfFVTfFNQfERFTHxcXGQrfG9bMC03XSt8eFswLTlhLWZBLUZdKykpJy9nLFxuXHQnc3RyaW5nJzogL1wiKFteXFxcXFwiXXxcXFxcKFthYmZucnR2XFxcXFwiJyZdfFxcXltBLVpAW1xcXVxcXl9dfE5VTHxTT0h8U1RYfEVUWHxFT1R8RU5RfEFDS3xCRUx8QlN8SFR8TEZ8VlR8RkZ8Q1J8U098U0l8RExFfERDMXxEQzJ8REMzfERDNHxOQUt8U1lOfEVUQnxDQU58RU18U1VCfEVTQ3xGU3xHU3xSU3xVU3xTUHxERUx8XFxkK3xvWzAtN10rfHhbMC05YS1mQS1GXSspfFxcXFxcXHMrXFxcXCkqXCIvZyxcblx0J2tleXdvcmQnIDogL1xcYihjYXNlfGNsYXNzfGRhdGF8ZGVyaXZpbmd8ZG98ZWxzZXxpZnxpbnxpbmZpeGx8aW5maXhyfGluc3RhbmNlfGxldHxtb2R1bGV8bmV3dHlwZXxvZnxwcmltaXRpdmV8dGhlbnx0eXBlfHdoZXJlKVxcYi9nLFxuXHQnaW1wb3J0X3N0YXRlbWVudCcgOiB7XG5cdFx0Ly8gVGhlIGltcG9ydGVkIG9yIGhpZGRlbiBuYW1lcyBhcmUgbm90IGluY2x1ZGVkIGluIHRoaXMgaW1wb3J0XG5cdFx0Ly8gc3RhdGVtZW50LiBUaGlzIGlzIGJlY2F1c2Ugd2Ugd2FudCB0byBoaWdobGlnaHQgdGhvc2UgZXhhY3RseSBsaWtlXG5cdFx0Ly8gd2UgZG8gZm9yIHRoZSBuYW1lcyBpbiB0aGUgcHJvZ3JhbS5cblx0XHRwYXR0ZXJuOiAvKFxcbnxeKVxccyooaW1wb3J0KVxccysocXVhbGlmaWVkXFxzKyk/KChbQS1aXVtfYS16QS1aMC05J10qKShcXC5bQS1aXVtfYS16QS1aMC05J10qKSopKFxccysoYXMpXFxzKygoW0EtWl1bX2EtekEtWjAtOSddKikoXFwuW0EtWl1bX2EtekEtWjAtOSddKikqKSk/KFxccytoaWRpbmdcXGIpPy9nbSxcblx0XHRpbnNpZGU6IHtcblx0XHRcdCdrZXl3b3JkJzogL1xcYihpbXBvcnR8cXVhbGlmaWVkfGFzfGhpZGluZylcXGIvZ1xuXHRcdH1cblx0fSxcblx0Ly8gVGhlc2UgYXJlIGJ1aWx0aW4gdmFyaWFibGVzIG9ubHkuIENvbnN0cnVjdG9ycyBhcmUgaGlnaGxpZ2h0ZWQgbGF0ZXIgYXMgYSBjb25zdGFudC5cblx0J2J1aWx0aW4nOiAvXFxiKGFic3xhY29zfGFjb3NofGFsbHxhbmR8YW55fGFwcGVuZEZpbGV8YXBwcm94UmF0aW9uYWx8YXNUeXBlT2Z8YXNpbnxhc2luaHxhdGFufGF0YW4yfGF0YW5ofGJhc2ljSU9SdW58YnJlYWt8Y2F0Y2h8Y2VpbGluZ3xjaHJ8Y29tcGFyZXxjb25jYXR8Y29uY2F0TWFwfGNvbnN0fGNvc3xjb3NofGN1cnJ5fGN5Y2xlfGRlY29kZUZsb2F0fGRlbm9taW5hdG9yfGRpZ2l0VG9JbnR8ZGl2fGRpdk1vZHxkcm9wfGRyb3BXaGlsZXxlaXRoZXJ8ZWxlbXxlbmNvZGVGbG9hdHxlbnVtRnJvbXxlbnVtRnJvbVRoZW58ZW51bUZyb21UaGVuVG98ZW51bUZyb21Ub3xlcnJvcnxldmVufGV4cHxleHBvbmVudHxmYWlsfGZpbHRlcnxmbGlwfGZsb2F0RGlnaXRzfGZsb2F0UmFkaXh8ZmxvYXRSYW5nZXxmbG9vcnxmbWFwfGZvbGRsfGZvbGRsMXxmb2xkcnxmb2xkcjF8ZnJvbURvdWJsZXxmcm9tRW51bXxmcm9tSW50fGZyb21JbnRlZ2VyfGZyb21JbnRlZ3JhbHxmcm9tUmF0aW9uYWx8ZnN0fGdjZHxnZXRDaGFyfGdldENvbnRlbnRzfGdldExpbmV8Z3JvdXB8aGVhZHxpZHxpblJhbmdlfGluZGV4fGluaXR8aW50VG9EaWdpdHxpbnRlcmFjdHxpb0Vycm9yfGlzQWxwaGF8aXNBbHBoYU51bXxpc0FzY2lpfGlzQ29udHJvbHxpc0Rlbm9ybWFsaXplZHxpc0RpZ2l0fGlzSGV4RGlnaXR8aXNJRUVFfGlzSW5maW5pdGV8aXNMb3dlcnxpc05hTnxpc05lZ2F0aXZlWmVyb3xpc09jdERpZ2l0fGlzUHJpbnR8aXNTcGFjZXxpc1VwcGVyfGl0ZXJhdGV8bGFzdHxsY218bGVuZ3RofGxleHxsZXhEaWdpdHN8bGV4TGl0Q2hhcnxsaW5lc3xsb2d8bG9nQmFzZXxsb29rdXB8bWFwfG1hcE18bWFwTV98bWF4fG1heEJvdW5kfG1heGltdW18bWF5YmV8bWlufG1pbkJvdW5kfG1pbmltdW18bW9kfG5lZ2F0ZXxub3R8bm90RWxlbXxudWxsfG51bWVyYXRvcnxvZGR8b3J8b3JkfG90aGVyd2lzZXxwYWNrfHBpfHByZWR8cHJpbUV4aXRXaXRofHByaW50fHByb2R1Y3R8cHJvcGVyRnJhY3Rpb258cHV0Q2hhcnxwdXRTdHJ8cHV0U3RyTG58cXVvdHxxdW90UmVtfHJhbmdlfHJhbmdlU2l6ZXxyZWFkfHJlYWREZWN8cmVhZEZpbGV8cmVhZEZsb2F0fHJlYWRIZXh8cmVhZElPfHJlYWRJbnR8cmVhZExpc3R8cmVhZExpdENoYXJ8cmVhZExufHJlYWRPY3R8cmVhZFBhcmVufHJlYWRTaWduZWR8cmVhZHN8cmVhZHNQcmVjfHJlYWxUb0ZyYWN8cmVjaXB8cmVtfHJlcGVhdHxyZXBsaWNhdGV8cmV0dXJufHJldmVyc2V8cm91bmR8c2NhbGVGbG9hdHxzY2FubHxzY2FubDF8c2NhbnJ8c2NhbnIxfHNlcXxzZXF1ZW5jZXxzZXF1ZW5jZV98c2hvd3xzaG93Q2hhcnxzaG93SW50fHNob3dMaXN0fHNob3dMaXRDaGFyfHNob3dQYXJlbnxzaG93U2lnbmVkfHNob3dTdHJpbmd8c2hvd3N8c2hvd3NQcmVjfHNpZ25pZmljYW5kfHNpZ251bXxzaW58c2luaHxzbmR8c29ydHxzcGFufHNwbGl0QXR8c3FydHxzdWJ0cmFjdHxzdWNjfHN1bXx0YWlsfHRha2V8dGFrZVdoaWxlfHRhbnx0YW5ofHRocmVhZFRvSU9SZXN1bHR8dG9FbnVtfHRvSW50fHRvSW50ZWdlcnx0b0xvd2VyfHRvUmF0aW9uYWx8dG9VcHBlcnx0cnVuY2F0ZXx1bmN1cnJ5fHVuZGVmaW5lZHx1bmxpbmVzfHVudGlsfHVud29yZHN8dW56aXB8dW56aXAzfHVzZXJFcnJvcnx3b3Jkc3x3cml0ZUZpbGV8emlwfHppcDN8emlwV2l0aHx6aXBXaXRoMylcXGIvZyxcblx0Ly8gZGVjaW1hbCBpbnRlZ2VycyBhbmQgZmxvYXRpbmcgcG9pbnQgbnVtYmVycyB8IG9jdGFsIGludGVnZXJzIHwgaGV4YWRlY2ltYWwgaW50ZWdlcnNcblx0J251bWJlcicgOiAvXFxiKFxcZCsoXFwuXFxkKyk/KFtlRV1bKy1dP1xcZCspP3wwW09vXVswLTddK3wwW1h4XVswLTlhLWZBLUZdKylcXGIvZyxcblx0Ly8gTW9zdCBvZiB0aGlzIGlzIG5lZWRlZCBiZWNhdXNlIG9mIHRoZSBtZWFuaW5nIG9mIGEgc2luZ2xlICcuJy5cblx0Ly8gSWYgaXQgc3RhbmRzIGFsb25lIGZyZWVseSwgaXQgaXMgdGhlIGZ1bmN0aW9uIGNvbXBvc2l0aW9uLlxuXHQvLyBJdCBtYXkgYWxzbyBiZSBhIHNlcGFyYXRvciBiZXR3ZWVuIGEgbW9kdWxlIG5hbWUgYW5kIGFuIGlkZW50aWZpZXIgPT4gbm9cblx0Ly8gb3BlcmF0b3IuIElmIGl0IGNvbWVzIHRvZ2V0aGVyIHdpdGggb3RoZXIgc3BlY2lhbCBjaGFyYWN0ZXJzIGl0IGlzIGFuXG5cdC8vIG9wZXJhdG9yIHRvby5cblx0J29wZXJhdG9yJyA6IC9cXHNcXC5cXHN8KFstISMkJSorPVxcPyZAfH46PD5eXFxcXF0qXFwuWy0hIyQlKis9XFw/JkB8fjo8Pl5cXFxcXSspfChbLSEjJCUqKz1cXD8mQHx+Ojw+XlxcXFxdK1xcLlstISMkJSorPVxcPyZAfH46PD5eXFxcXF0qKXxbLSEjJCUqKz1cXD8mQHx+Ojw+XlxcXFxdK3woYChbQS1aXVtfYS16QS1aMC05J10qXFwuKSpbX2Etel1bX2EtekEtWjAtOSddKmApL2csXG5cdC8vIEluIEhhc2tlbGwsIG5lYXJseSBldmVyeXRoaW5nIGlzIGEgdmFyaWFibGUsIGRvIG5vdCBoaWdobGlnaHQgdGhlc2UuXG5cdCdodmFyaWFibGUnOiAvXFxiKFtBLVpdW19hLXpBLVowLTknXSpcXC4pKltfYS16XVtfYS16QS1aMC05J10qXFxiL2csXG5cdCdjb25zdGFudCc6IC9cXGIoW0EtWl1bX2EtekEtWjAtOSddKlxcLikqW0EtWl1bX2EtekEtWjAtOSddKlxcYi9nLFxuXHQncHVuY3R1YXRpb24nIDogL1t7fVtcXF07KCksLjpdL2dcbn07XG5cblByaXNtLmxhbmd1YWdlcy5wZXJsID0ge1xuXHQnY29tbWVudCc6IFtcblx0XHR7XG5cdFx0XHQvLyBQT0Rcblx0XHRcdHBhdHRlcm46IC8oKD86XnxcXG4pXFxzKik9XFx3K1tcXHNcXFNdKj89Y3V0LisvZyxcblx0XHRcdGxvb2tiZWhpbmQ6IHRydWVcblx0XHR9LFxuXHRcdHtcblx0XHRcdHBhdHRlcm46IC8oXnxbXlxcXFwkXSkjLio/KFxccj9cXG58JCkvZyxcblx0XHRcdGxvb2tiZWhpbmQ6IHRydWVcblx0XHR9XG5cdF0sXG5cdC8vIFRPRE8gQ291bGQgYmUgbmljZSB0byBoYW5kbGUgSGVyZWRvYyB0b28uXG5cdCdzdHJpbmcnOiBbXG5cdFx0Ly8gcS8uLi4vXG5cdFx0L1xcYig/OnF8cXF8cXh8cXcpXFxzKihbXmEtekEtWjAtOVxcc1xce1xcKFxcWzxdKShcXFxcPy4pKj9cXHMqXFwxL2csXG5cdFxuXHRcdC8vIHEgYS4uLmFcblx0XHQvXFxiKD86cXxxcXxxeHxxdylcXHMrKFthLXpBLVowLTldKShcXFxcPy4pKj9cXHMqXFwxL2csXG5cdFxuXHRcdC8vIHEoLi4uKVxuXHRcdC9cXGIoPzpxfHFxfHF4fHF3KVxccypcXCgoW14oKV18XFxcXC4pKlxccypcXCkvZyxcblx0XG5cdFx0Ly8gcXsuLi59XG5cdFx0L1xcYig/OnF8cXF8cXh8cXcpXFxzKlxceyhbXnt9XXxcXFxcLikqXFxzKlxcfS9nLFxuXHRcblx0XHQvLyBxWy4uLl1cblx0XHQvXFxiKD86cXxxcXxxeHxxdylcXHMqXFxbKFteW1xcXV18XFxcXC4pKlxccypcXF0vZyxcblx0XG5cdFx0Ly8gcTwuLi4+XG5cdFx0L1xcYig/OnF8cXF8cXh8cXcpXFxzKjwoW148Pl18XFxcXC4pKlxccyo+L2csXG5cblx0XHQvLyBcIi4uLlwiLCAnLi4uJywgYC4uLmBcblx0XHQvKFwifCd8YCkoXFxcXD8uKSo/XFwxL2dcblx0XSxcblx0J3JlZ2V4JzogW1xuXHRcdC8vIG0vLi4uL1xuXHRcdC9cXGIoPzptfHFyKVxccyooW15hLXpBLVowLTlcXHNcXHtcXChcXFs8XSkoXFxcXD8uKSo/XFxzKlxcMVttc2l4cG9kdWFsZ2NdKi9nLFxuXHRcblx0XHQvLyBtIGEuLi5hXG5cdFx0L1xcYig/Om18cXIpXFxzKyhbYS16QS1aMC05XSkoXFxcXD8uKSo/XFxzKlxcMVttc2l4cG9kdWFsZ2NdKi9nLFxuXHRcblx0XHQvLyBtKC4uLilcblx0XHQvXFxiKD86bXxxcilcXHMqXFwoKFteKCldfFxcXFwuKSpcXHMqXFwpW21zaXhwb2R1YWxnY10qL2csXG5cdFxuXHRcdC8vIG17Li4ufVxuXHRcdC9cXGIoPzptfHFyKVxccypcXHsoW157fV18XFxcXC4pKlxccypcXH1bbXNpeHBvZHVhbGdjXSovZyxcblx0XG5cdFx0Ly8gbVsuLi5dXG5cdFx0L1xcYig/Om18cXIpXFxzKlxcWyhbXltcXF1dfFxcXFwuKSpcXHMqXFxdW21zaXhwb2R1YWxnY10qL2csXG5cdFxuXHRcdC8vIG08Li4uPlxuXHRcdC9cXGIoPzptfHFyKVxccyo8KFtePD5dfFxcXFwuKSpcXHMqPlttc2l4cG9kdWFsZ2NdKi9nLFxuXHRcblx0XHQvLyBzLy4uLi8uLi4vXG5cdFx0L1xcYig/OnN8dHJ8eSlcXHMqKFteYS16QS1aMC05XFxzXFx7XFwoXFxbPF0pKFxcXFw/LikqP1xccypcXDFcXHMqKCg/IVxcMSkufFxcXFwuKSpcXHMqXFwxW21zaXhwb2R1YWxnY2VyXSovZyxcblx0XG5cdFx0Ly8gcyBhLi4uYS4uLmFcblx0XHQvXFxiKD86c3x0cnx5KVxccysoW2EtekEtWjAtOV0pKFxcXFw/LikqP1xccypcXDFcXHMqKCg/IVxcMSkufFxcXFwuKSpcXHMqXFwxW21zaXhwb2R1YWxnY2VyXSovZyxcblx0XG5cdFx0Ly8gcyguLi4pKC4uLilcblx0XHQvXFxiKD86c3x0cnx5KVxccypcXCgoW14oKV18XFxcXC4pKlxccypcXClcXHMqXFwoXFxzKihbXigpXXxcXFxcLikqXFxzKlxcKVttc2l4cG9kdWFsZ2Nlcl0qL2csXG5cdFxuXHRcdC8vIHN7Li4ufXsuLi59XG5cdFx0L1xcYig/OnN8dHJ8eSlcXHMqXFx7KFtee31dfFxcXFwuKSpcXHMqXFx9XFxzKlxce1xccyooW157fV18XFxcXC4pKlxccypcXH1bbXNpeHBvZHVhbGdjZXJdKi9nLFxuXHRcblx0XHQvLyBzWy4uLl1bLi4uXVxuXHRcdC9cXGIoPzpzfHRyfHkpXFxzKlxcWyhbXltcXF1dfFxcXFwuKSpcXHMqXFxdXFxzKlxcW1xccyooW15bXFxdXXxcXFxcLikqXFxzKlxcXVttc2l4cG9kdWFsZ2Nlcl0qL2csXG5cdFxuXHRcdC8vIHM8Li4uPjwuLi4+XG5cdFx0L1xcYig/OnN8dHJ8eSlcXHMqPChbXjw+XXxcXFxcLikqXFxzKj5cXHMqPFxccyooW148Pl18XFxcXC4pKlxccyo+W21zaXhwb2R1YWxnY2VyXSovZyxcblx0XG5cdFx0Ly8gLy4uLi9cblx0XHQvXFwvKFxcWy4rP118XFxcXC58W15cXC9cXHJcXG5dKSpcXC9bbXNpeHBvZHVhbGdjXSooPz1cXHMqKCR8W1xcclxcbiwuO30pJnxcXC0rKj1+PD4hP15dfChsdHxndHxsZXxnZXxlcXxuZXxjbXB8bm90fGFuZHxvcnx4b3J8eClcXGIpKS9nXG5cdF0sXG5cblx0Ly8gRklYTUUgTm90IHN1cmUgYWJvdXQgdGhlIGhhbmRsaW5nIG9mIDo6LCAnLCBhbmQgI1xuXHQndmFyaWFibGUnOiBbXG5cdFx0Ly8gJHteUE9TVE1BVENIfVxuXHRcdC9bJipcXCRAJV1cXHtcXF5bQS1aXStcXH0vZyxcblx0XHQvLyAkXlZcblx0XHQvWyYqXFwkQCVdXFxeW0EtWl9dL2csXG5cdFx0Ly8gJHsuLi59XG5cdFx0L1smKlxcJEAlXSM/KD89XFx7KS8sXG5cdFx0Ly8gJGZvb1xuXHRcdC9bJipcXCRAJV0jPygoOjopKic/KD8hXFxkKVtcXHckXSspKyg6OikqL2lnLFxuXHRcdC8vICQxXG5cdFx0L1smKlxcJEAlXVxcZCsvZyxcblx0XHQvLyAkXywgQF8sICUhXG5cdFx0L1tcXCRAJV1bIVwiI1xcJCUmJygpKissXFwtLlxcLzo7PD0+P0BbXFxcXFxcXV5fYHt8fX5dL2dcblx0XSxcblx0J2ZpbGVoYW5kbGUnOiB7XG5cdFx0Ly8gPD4sIDxGT08+LCBfXG5cdFx0cGF0dGVybjogLzwoPyE9KS4qPnxcXGJfXFxiL2csXG5cdFx0YWxpYXM6ICdzeW1ib2wnXG5cdH0sXG5cdCd2c3RyaW5nJzoge1xuXHRcdC8vIHYxLjIsIDEuMi4zXG5cdFx0cGF0dGVybjogL3ZcXGQrKFxcLlxcZCspKnxcXGQrKFxcLlxcZCspezIsfS9nLFxuXHRcdGFsaWFzOiAnc3RyaW5nJ1xuXHR9LFxuXHQnZnVuY3Rpb24nOiB7XG5cdFx0cGF0dGVybjogL3N1YiBbYS16MC05X10rL2lnLFxuXHRcdGluc2lkZToge1xuXHRcdFx0a2V5d29yZDogL3N1Yi9cblx0XHR9XG5cdH0sXG5cdCdrZXl3b3JkJzogL1xcYihhbnl8YnJlYWt8Y29udGludWV8ZGVmYXVsdHxkZWxldGV8ZGllfGRvfGVsc2V8ZWxzaWZ8ZXZhbHxmb3J8Zm9yZWFjaHxnaXZlbnxnb3RvfGlmfGxhc3R8bG9jYWx8bXl8bmV4dHxvdXJ8cGFja2FnZXxwcmludHxyZWRvfHJlcXVpcmV8c2F5fHN0YXRlfHN1Ynxzd2l0Y2h8dW5kZWZ8dW5sZXNzfHVudGlsfHVzZXx3aGVufHdoaWxlKVxcYi9nLFxuXHQnbnVtYmVyJzogLyhcXG58XFxiKS0/KDB4W1xcZEEtRmEtZl0oXz9bXFxkQS1GYS1mXSkqfDBiWzAxXShfP1swMV0pKnwoXFxkKF8/XFxkKSopP1xcLj9cXGQoXz9cXGQpKihbRWVdLT9cXGQrKT8pXFxiL2csXG5cdCdvcGVyYXRvcic6IC8tW3J3eG9SV1hPZXpzZmRscFNiY3R1Z2tUQk1BQ11cXGJ8Wy0rKj1+XFwvfCZdezEsMn18PD0/fD49P3xcXC57MSwzfXxbIT9cXFxcXl18XFxiKGx0fGd0fGxlfGdlfGVxfG5lfGNtcHxub3R8YW5kfG9yfHhvcnx4KVxcYi9nLFxuXHQncHVuY3R1YXRpb24nOiAvW3t9W1xcXTsoKSw6XS9nXG59O1xuXG4vLyBpc3N1ZXM6IG5lc3RlZCBtdWx0aWxpbmUgY29tbWVudHMsIGhpZ2hsaWdodGluZyBpbnNpZGUgc3RyaW5nIGludGVycG9sYXRpb25zXG5QcmlzbS5sYW5ndWFnZXMuc3dpZnQgPSBQcmlzbS5sYW5ndWFnZXMuZXh0ZW5kKCdjbGlrZScsIHtcblx0J2tleXdvcmQnOiAvXFxiKGFzfGFzc29jaWF0aXZpdHl8YnJlYWt8Y2FzZXxjbGFzc3xjb250aW51ZXxjb252ZW5pZW5jZXxkZWZhdWx0fGRlaW5pdHxkaWRTZXR8ZG98ZHluYW1pY1R5cGV8ZWxzZXxlbnVtfGV4dGVuc2lvbnxmYWxsdGhyb3VnaHxmaW5hbHxmb3J8ZnVuY3xnZXR8aWZ8aW1wb3J0fGlufGluZml4fGluaXR8aW5vdXR8aW50ZXJuYWx8aXN8bGF6eXxsZWZ0fGxldHxtdXRhdGluZ3xuZXd8bm9uZXxub25tdXRhdGluZ3xvcGVyYXRvcnxvcHRpb25hbHxvdmVycmlkZXxwb3N0Zml4fHByZWNlZGVuY2V8cHJlZml4fHByaXZhdGV8cHJvdG9jb2x8cHVibGljfHJlcXVpcmVkfHJldHVybnxyaWdodHxzYWZlfHNlbGZ8U2VsZnxzZXR8c3RhdGljfHN0cnVjdHxzdWJzY3JpcHR8c3VwZXJ8c3dpdGNofFR5cGV8dHlwZWFsaWFzfHVub3duZWR8dW5vd25lZHx1bnNhZmV8dmFyfHdlYWt8d2hlcmV8d2hpbGV8d2lsbFNldHxfX0NPTFVNTl9ffF9fRklMRV9ffF9fRlVOQ1RJT05fX3xfX0xJTkVfXylcXGIvZyxcblx0J251bWJlcic6IC9cXGIoW1xcZF9dKyhcXC5bXFxkZV9dKyk/fDB4W2EtZjAtOV9dKyhcXC5bYS1mMC05cF9dKyk/fDBiWzAxX10rfDBvWzAtN19dKylcXGIvZ2ksXG5cdCdjb25zdGFudCc6IC9cXGIobmlsfFtBLVpfXXsyLH18a1tBLVpdW0EtWmEtel9dKylcXGIvZyxcblx0J2F0cnVsZSc6IC9cXEBcXGIoSUJPdXRsZXR8SUJEZXNpZ25hYmxlfElCQWN0aW9ufElCSW5zcGVjdGFibGV8Y2xhc3NfcHJvdG9jb2x8ZXhwb3J0ZWR8bm9yZXR1cm58TlNDb3B5aW5nfE5TTWFuYWdlZHxvYmpjfFVJQXBwbGljYXRpb25NYWlufGF1dG9fY2xvc3VyZSlcXGIvZyxcblx0J2J1aWx0aW4nOiAvXFxiKFtBLVpdXFxTK3xhYnN8YWR2YW5jZXxhbGlnbm9mfGFsaWdub2ZWYWx1ZXxhc3NlcnR8Y29udGFpbnN8Y291bnR8Y291bnRFbGVtZW50c3xkZWJ1Z1ByaW50fGRlYnVnUHJpbnRsbnxkaXN0YW5jZXxkcm9wRmlyc3R8ZHJvcExhc3R8ZHVtcHxlbnVtZXJhdGV8ZXF1YWx8ZmlsdGVyfGZpbmR8Zmlyc3R8Z2V0VmFMaXN0fGluZGljZXN8aXNFbXB0eXxqb2lufGxhc3R8bGF6eXxsZXhpY29ncmFwaGljYWxDb21wYXJlfG1hcHxtYXh8bWF4RWxlbWVudHxtaW58bWluRWxlbWVudHxudW1lcmljQ2FzdHxvdmVybGFwc3xwYXJ0aXRpb258cHJlZml4fHByaW50fHByaW50bG58cmVkdWNlfHJlZmxlY3R8cmV2ZXJzZXxzaXplb2Z8c2l6ZW9mVmFsdWV8c29ydHxzb3J0ZWR8c3BsaXR8c3RhcnRzV2l0aHxzdHJpZGV8c3RyaWRlb2Z8c3RyaWRlb2ZWYWx1ZXxzdWZmaXh8c3dhcHx0b0RlYnVnU3RyaW5nfHRvU3RyaW5nfHRyYW5zY29kZXx1bmRlcmVzdGltYXRlQ291bnR8dW5zYWZlQml0Q2FzdHx3aXRoRXh0ZW5kZWRMaWZldGltZXx3aXRoVW5zYWZlTXV0YWJsZVBvaW50ZXJ8d2l0aFVuc2FmZU11dGFibGVQb2ludGVyc3x3aXRoVW5zYWZlUG9pbnRlcnx3aXRoVW5zYWZlUG9pbnRlcnN8d2l0aFZhTGlzdClcXGIvZ1xufSk7XG5cblByaXNtLmxhbmd1YWdlcy5jcHAgPSBQcmlzbS5sYW5ndWFnZXMuZXh0ZW5kKCdjJywge1xuXHQna2V5d29yZCc6IC9cXGIoYWxpZ25hc3xhbGlnbm9mfGFzbXxhdXRvfGJvb2x8YnJlYWt8Y2FzZXxjYXRjaHxjaGFyfGNoYXIxNl90fGNoYXIzMl90fGNsYXNzfGNvbXBsfGNvbnN0fGNvbnN0ZXhwcnxjb25zdF9jYXN0fGNvbnRpbnVlfGRlY2x0eXBlfGRlZmF1bHR8ZGVsZXRlfGRlbGV0ZVxcW1xcXXxkb3xkb3VibGV8ZHluYW1pY19jYXN0fGVsc2V8ZW51bXxleHBsaWNpdHxleHBvcnR8ZXh0ZXJufGZsb2F0fGZvcnxmcmllbmR8Z290b3xpZnxpbmxpbmV8aW50fGxvbmd8bXV0YWJsZXxuYW1lc3BhY2V8bmV3fG5ld1xcW1xcXXxub2V4Y2VwdHxudWxscHRyfG9wZXJhdG9yfHByaXZhdGV8cHJvdGVjdGVkfHB1YmxpY3xyZWdpc3RlcnxyZWludGVycHJldF9jYXN0fHJldHVybnxzaG9ydHxzaWduZWR8c2l6ZW9mfHN0YXRpY3xzdGF0aWNfYXNzZXJ0fHN0YXRpY19jYXN0fHN0cnVjdHxzd2l0Y2h8dGVtcGxhdGV8dGhpc3x0aHJlYWRfbG9jYWx8dGhyb3d8dHJ5fHR5cGVkZWZ8dHlwZWlkfHR5cGVuYW1lfHVuaW9ufHVuc2lnbmVkfHVzaW5nfHZpcnR1YWx8dm9pZHx2b2xhdGlsZXx3Y2hhcl90fHdoaWxlKVxcYi9nLFxuXHQnYm9vbGVhbic6IC9cXGIodHJ1ZXxmYWxzZSlcXGIvZyxcblx0J29wZXJhdG9yJzogL1stK117MSwyfXwhPT98PHsxLDJ9PT98PnsxLDJ9PT98XFwtPnw6ezEsMn18PXsxLDJ9fFxcXnx+fCV8JnsxLDJ9fFxcfD9cXHx8XFw/fFxcKnxcXC98XFxiKGFuZHxhbmRfZXF8Yml0YW5kfGJpdG9yfG5vdHxub3RfZXF8b3J8b3JfZXF8eG9yfHhvcl9lcSlcXGIvZ1xufSk7XG5cblByaXNtLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoJ2NwcCcsICdrZXl3b3JkJywge1xuXHQnY2xhc3MtbmFtZSc6IHtcblx0XHRwYXR0ZXJuOiAvKGNsYXNzXFxzKylbYS16MC05X10rL2lnLFxuXHRcdGxvb2tiZWhpbmQ6IHRydWUsXG5cdH0sXG59KTtcblByaXNtLmxhbmd1YWdlcy5odHRwID0ge1xuICAgICdyZXF1ZXN0LWxpbmUnOiB7XG4gICAgICAgIHBhdHRlcm46IC9eKFBPU1R8R0VUfFBVVHxERUxFVEV8T1BUSU9OU3xQQVRDSHxUUkFDRXxDT05ORUNUKVxcYlxcc2h0dHBzPzpcXC9cXC9cXFMrXFxzSFRUUFxcL1swLTkuXSsvZyxcbiAgICAgICAgaW5zaWRlOiB7XG4gICAgICAgICAgICAvLyBIVFRQIFZlcmJcbiAgICAgICAgICAgIHByb3BlcnR5OiAvXlxcYihQT1NUfEdFVHxQVVR8REVMRVRFfE9QVElPTlN8UEFUQ0h8VFJBQ0V8Q09OTkVDVClcXGIvZyxcbiAgICAgICAgICAgIC8vIFBhdGggb3IgcXVlcnkgYXJndW1lbnRcbiAgICAgICAgICAgICdhdHRyLW5hbWUnOiAvOlxcdysvZ1xuICAgICAgICB9XG4gICAgfSxcbiAgICAncmVzcG9uc2Utc3RhdHVzJzoge1xuICAgICAgICBwYXR0ZXJuOiAvXkhUVFBcXC8xLlswMV0gWzAtOV0rLiovZyxcbiAgICAgICAgaW5zaWRlOiB7XG4gICAgICAgICAgICAvLyBTdGF0dXMsIGUuZy4gMjAwIE9LXG4gICAgICAgICAgICBwcm9wZXJ0eTogL1swLTldK1tBLVpcXHMtXSskL2lnXG4gICAgICAgIH1cbiAgICB9LFxuICAgIC8vIEhUVFAgaGVhZGVyIG5hbWVcbiAgICBrZXl3b3JkOiAvXltcXHctXSs6KD89LispL2dtXG59O1xuXG4vLyBDcmVhdGUgYSBtYXBwaW5nIG9mIENvbnRlbnQtVHlwZSBoZWFkZXJzIHRvIGxhbmd1YWdlIGRlZmluaXRpb25zXG52YXIgaHR0cExhbmd1YWdlcyA9IHtcbiAgICAnYXBwbGljYXRpb24vanNvbic6IFByaXNtLmxhbmd1YWdlcy5qYXZhc2NyaXB0LFxuICAgICdhcHBsaWNhdGlvbi94bWwnOiBQcmlzbS5sYW5ndWFnZXMubWFya3VwLFxuICAgICd0ZXh0L3htbCc6IFByaXNtLmxhbmd1YWdlcy5tYXJrdXAsXG4gICAgJ3RleHQvaHRtbCc6IFByaXNtLmxhbmd1YWdlcy5tYXJrdXBcbn07XG5cbi8vIEluc2VydCBlYWNoIGNvbnRlbnQgdHlwZSBwYXJzZXIgdGhhdCBoYXMgaXRzIGFzc29jaWF0ZWQgbGFuZ3VhZ2Vcbi8vIGN1cnJlbnRseSBsb2FkZWQuXG5mb3IgKHZhciBjb250ZW50VHlwZSBpbiBodHRwTGFuZ3VhZ2VzKSB7XG4gICAgaWYgKGh0dHBMYW5ndWFnZXNbY29udGVudFR5cGVdKSB7XG4gICAgICAgIHZhciBvcHRpb25zID0ge307XG4gICAgICAgIG9wdGlvbnNbY29udGVudFR5cGVdID0ge1xuICAgICAgICAgICAgcGF0dGVybjogbmV3IFJlZ0V4cCgnKGNvbnRlbnQtdHlwZTpcXFxccyonICsgY29udGVudFR5cGUgKyAnW1xcXFx3XFxcXFddKj8pXFxcXG5cXFxcbltcXFxcd1xcXFxXXSonLCAnZ2knKSxcbiAgICAgICAgICAgIGxvb2tiZWhpbmQ6IHRydWUsXG4gICAgICAgICAgICBpbnNpZGU6IHtcbiAgICAgICAgICAgICAgICByZXN0OiBodHRwTGFuZ3VhZ2VzW2NvbnRlbnRUeXBlXVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBQcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKCdodHRwJywgJ2tleXdvcmQnLCBvcHRpb25zKTtcbiAgICB9XG59XG5cblByaXNtLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoJ3BocCcsICd2YXJpYWJsZScsIHtcblx0J3RoaXMnOiAvXFwkdGhpcy9nLFxuXHQnZ2xvYmFsJzogL1xcJF8/KEdMT0JBTFN8U0VSVkVSfEdFVHxQT1NUfEZJTEVTfFJFUVVFU1R8U0VTU0lPTnxFTlZ8Q09PS0lFfEhUVFBfUkFXX1BPU1RfREFUQXxhcmdjfGFyZ3Z8cGhwX2Vycm9ybXNnfGh0dHBfcmVzcG9uc2VfaGVhZGVyKS9nLFxuXHQnc2NvcGUnOiB7XG5cdFx0cGF0dGVybjogL1xcYltcXHdcXFxcXSs6Oi9nLFxuXHRcdGluc2lkZToge1xuXHRcdFx0a2V5d29yZDogLyhzdGF0aWN8c2VsZnxwYXJlbnQpLyxcblx0XHRcdHB1bmN0dWF0aW9uOiAvKDo6fFxcXFwpL1xuXHRcdH1cblx0fVxufSk7XG5QcmlzbS5sYW5ndWFnZXMudHdpZyA9IHtcblx0J2NvbW1lbnQnOiAvXFx7XFwjW1xcc1xcU10qP1xcI1xcfS9nLFxuXHQndGFnJzoge1xuXHRcdHBhdHRlcm46IC8oXFx7XFx7W1xcc1xcU10qP1xcfVxcfXxcXHtcXCVbXFxzXFxTXSo/XFwlXFx9KS9nLFxuXHRcdGluc2lkZToge1xuXHRcdFx0J2xkJzoge1xuXHRcdFx0XHRwYXR0ZXJuOiAvXihcXHtcXHtcXC0/fFxce1xcJVxcLT9cXHMqXFx3KykvLFxuXHRcdFx0XHRpbnNpZGU6IHtcblx0XHRcdFx0XHQncHVuY3R1YXRpb24nOiAvXihcXHtcXHt8XFx7XFwlKVxcLT8vLFxuXHRcdFx0XHRcdCdrZXl3b3JkJzogL1xcdysvXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHQncmQnOiB7XG5cdFx0XHRcdHBhdHRlcm46IC9cXC0/KFxcJVxcfXxcXH1cXH0pJC8sXG5cdFx0XHRcdGluc2lkZToge1xuXHRcdFx0XHRcdCdwdW5jdHVhdGlvbic6IC8uKi9cblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdCdzdHJpbmcnOiB7XG5cdFx0XHRcdHBhdHRlcm46IC8oXCJ8JykoXFxcXD8uKSo/XFwxL2csXG5cdFx0XHRcdGluc2lkZToge1xuXHRcdFx0XHRcdCdwdW5jdHVhdGlvbic6IC9eKCd8XCIpfCgnfFwiKSQvZ1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0J2tleXdvcmQnOiAvXFxiKGlmKVxcYi9nLFxuXHRcdFx0J2Jvb2xlYW4nOiAvXFxiKHRydWV8ZmFsc2V8bnVsbClcXGIvZyxcblx0XHRcdCdudW1iZXInOiAvXFxiLT8oMHhbXFxkQS1GYS1mXSt8XFxkKlxcLj9cXGQrKFtFZV0tP1xcZCspPylcXGIvZyxcblx0XHRcdCdvcGVyYXRvcic6IC89PXw9fFxcIT18PHw+fD49fDw9fFxcK3xcXC18fnxcXCp8XFwvfFxcL1xcL3wlfFxcKlxcKnxcXHwvZyxcblx0XHRcdCdzcGFjZS1vcGVyYXRvcic6IHtcblx0XHRcdFx0cGF0dGVybjogLyhcXHMpKFxcYihub3R8YlxcLWFuZHxiXFwteG9yfGJcXC1vcnxhbmR8b3J8aW58bWF0Y2hlc3xzdGFydHMgd2l0aHxlbmRzIHdpdGh8aXMpXFxifFxcP3w6fFxcP1xcOikoPz1cXHMpL2csXG5cdFx0XHRcdGxvb2tiZWhpbmQ6IHRydWUsXG5cdFx0XHRcdGluc2lkZToge1xuXHRcdFx0XHRcdCdvcGVyYXRvcic6IC8uKi9cblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdCdwcm9wZXJ0eSc6IC9cXGJbYS16QS1aX11bYS16QS1aMC05X10qXFxiL2csXG5cdFx0XHQncHVuY3R1YXRpb24nOiAvXFwofFxcKXxcXFtcXF18XFxbfFxcXXxcXHt8XFx9fFxcOnxcXC58LC9nXG5cdFx0fVxuXHR9LFxuXG5cdC8vIFRoZSByZXN0IGNhbiBiZSBwYXJzZWQgYXMgSFRNTFxuXHQnb3RoZXInOiB7XG5cdFx0cGF0dGVybjogL1tcXHNcXFNdKi8sXG5cdFx0aW5zaWRlOiBQcmlzbS5sYW5ndWFnZXMubWFya3VwXG5cdH1cbn07XG5cblByaXNtLmxhbmd1YWdlcy5jc2hhcnAgPSBQcmlzbS5sYW5ndWFnZXMuZXh0ZW5kKCdjbGlrZScsIHtcblx0J2tleXdvcmQnOiAvXFxiKGFic3RyYWN0fGFzfGJhc2V8Ym9vbHxicmVha3xieXRlfGNhc2V8Y2F0Y2h8Y2hhcnxjaGVja2VkfGNsYXNzfGNvbnN0fGNvbnRpbnVlfGRlY2ltYWx8ZGVmYXVsdHxkZWxlZ2F0ZXxkb3xkb3VibGV8ZWxzZXxlbnVtfGV2ZW50fGV4cGxpY2l0fGV4dGVybnxmYWxzZXxmaW5hbGx5fGZpeGVkfGZsb2F0fGZvcnxmb3JlYWNofGdvdG98aWZ8aW1wbGljaXR8aW58aW50fGludGVyZmFjZXxpbnRlcm5hbHxpc3xsb2NrfGxvbmd8bmFtZXNwYWNlfG5ld3xudWxsfG9iamVjdHxvcGVyYXRvcnxvdXR8b3ZlcnJpZGV8cGFyYW1zfHByaXZhdGV8cHJvdGVjdGVkfHB1YmxpY3xyZWFkb25seXxyZWZ8cmV0dXJufHNieXRlfHNlYWxlZHxzaG9ydHxzaXplb2Z8c3RhY2thbGxvY3xzdGF0aWN8c3RyaW5nfHN0cnVjdHxzd2l0Y2h8dGhpc3x0aHJvd3x0cnVlfHRyeXx0eXBlb2Z8dWludHx1bG9uZ3x1bmNoZWNrZWR8dW5zYWZlfHVzaG9ydHx1c2luZ3x2aXJ0dWFsfHZvaWR8dm9sYXRpbGV8d2hpbGV8YWRkfGFsaWFzfGFzY2VuZGluZ3xhc3luY3xhd2FpdHxkZXNjZW5kaW5nfGR5bmFtaWN8ZnJvbXxnZXR8Z2xvYmFsfGdyb3VwfGludG98am9pbnxsZXR8b3JkZXJieXxwYXJ0aWFsfHJlbW92ZXxzZWxlY3R8c2V0fHZhbHVlfHZhcnx3aGVyZXx5aWVsZClcXGIvZyxcblx0J3N0cmluZyc6IC9APyhcInwnKShcXFxcPy4pKj9cXDEvZyxcblx0J3ByZXByb2Nlc3Nvcic6IC9eXFxzKiMuKi9nbSxcblx0J251bWJlcic6IC9cXGItPygweCk/XFxkKlxcLj9cXGQrXFxiL2dcbn0pO1xuXG5QcmlzbS5sYW5ndWFnZXMuaW5pPSB7XHJcblx0J2NvbW1lbnQnOiAvXlxccyo7LiokL2dtLFxyXG5cdCdpbXBvcnRhbnQnOiAvXFxbLio/XFxdL2dtLFxyXG5cdCdjb25zdGFudCc6IC9eXFxzKlteXFxzXFw9XSs/KD89WyBcXHRdKlxcPSkvZ20sXHJcblx0J2F0dHItdmFsdWUnOiB7XHJcblx0XHRwYXR0ZXJuOiAvXFw9LiovZ20sIFxyXG5cdFx0aW5zaWRlOiB7XHJcblx0XHRcdCdwdW5jdHVhdGlvbic6IC9eW1xcPV0vZ1xyXG5cdFx0fVxyXG5cdH1cclxufTtcbi8qKlxuICogT3JpZ2luYWwgYnkgQWFyb24gSGFydW46IGh0dHA6Ly9hYWhhY3JlYXRpdmUuY29tLzIwMTIvMDcvMzEvcGhwLXN5bnRheC1oaWdobGlnaHRpbmctcHJpc20vXG4gKiBNb2RpZmllZCBieSBNaWxlcyBKb2huc29uOiBodHRwOi8vbWlsZXNqLm1lXG4gKlxuICogU3VwcG9ydHMgdGhlIGZvbGxvd2luZzpcbiAqIFx0XHQtIEV4dGVuZHMgY2xpa2Ugc3ludGF4XG4gKiBcdFx0LSBTdXBwb3J0IGZvciBQSFAgNS4zKyAobmFtZXNwYWNlcywgdHJhaXRzLCBnZW5lcmF0b3JzLCBldGMpXG4gKiBcdFx0LSBTbWFydGVyIGNvbnN0YW50IGFuZCBmdW5jdGlvbiBtYXRjaGluZ1xuICpcbiAqIEFkZHMgdGhlIGZvbGxvd2luZyBuZXcgdG9rZW4gY2xhc3NlczpcbiAqIFx0XHRjb25zdGFudCwgZGVsaW1pdGVyLCB2YXJpYWJsZSwgZnVuY3Rpb24sIHBhY2thZ2VcbiAqL1xuXG5QcmlzbS5sYW5ndWFnZXMucGhwID0gUHJpc20ubGFuZ3VhZ2VzLmV4dGVuZCgnY2xpa2UnLCB7XG5cdCdrZXl3b3JkJzogL1xcYihhbmR8b3J8eG9yfGFycmF5fGFzfGJyZWFrfGNhc2V8Y2Z1bmN0aW9ufGNsYXNzfGNvbnN0fGNvbnRpbnVlfGRlY2xhcmV8ZGVmYXVsdHxkaWV8ZG98ZWxzZXxlbHNlaWZ8ZW5kZGVjbGFyZXxlbmRmb3J8ZW5kZm9yZWFjaHxlbmRpZnxlbmRzd2l0Y2h8ZW5kd2hpbGV8ZXh0ZW5kc3xmb3J8Zm9yZWFjaHxmdW5jdGlvbnxpbmNsdWRlfGluY2x1ZGVfb25jZXxnbG9iYWx8aWZ8bmV3fHJldHVybnxzdGF0aWN8c3dpdGNofHVzZXxyZXF1aXJlfHJlcXVpcmVfb25jZXx2YXJ8d2hpbGV8YWJzdHJhY3R8aW50ZXJmYWNlfHB1YmxpY3xpbXBsZW1lbnRzfHByaXZhdGV8cHJvdGVjdGVkfHBhcmVudHx0aHJvd3xudWxsfGVjaG98cHJpbnR8dHJhaXR8bmFtZXNwYWNlfGZpbmFsfHlpZWxkfGdvdG98aW5zdGFuY2VvZnxmaW5hbGx5fHRyeXxjYXRjaClcXGIvaWcsXG5cdCdjb25zdGFudCc6IC9cXGJbQS1aMC05X117Mix9XFxiL2csXG5cdCdjb21tZW50Jzoge1xuXHRcdHBhdHRlcm46IC8oXnxbXlxcXFxdKShcXC9cXCpbXFx3XFxXXSo/XFwqXFwvfChefFteOl0pKFxcL1xcL3wjKS4qPyhcXHI/XFxufCQpKS9nLFxuXHRcdGxvb2tiZWhpbmQ6IHRydWVcblx0fVxufSk7XG5cblByaXNtLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoJ3BocCcsICdrZXl3b3JkJywge1xuXHQnZGVsaW1pdGVyJzogLyhcXD8+fDxcXD9waHB8PFxcPykvaWcsXG5cdCd2YXJpYWJsZSc6IC8oXFwkXFx3KylcXGIvaWcsXG5cdCdwYWNrYWdlJzoge1xuXHRcdHBhdHRlcm46IC8oXFxcXHxuYW1lc3BhY2VcXHMrfHVzZVxccyspW1xcd1xcXFxdKy9nLFxuXHRcdGxvb2tiZWhpbmQ6IHRydWUsXG5cdFx0aW5zaWRlOiB7XG5cdFx0XHRwdW5jdHVhdGlvbjogL1xcXFwvXG5cdFx0fVxuXHR9XG59KTtcblxuLy8gTXVzdCBiZSBkZWZpbmVkIGFmdGVyIHRoZSBmdW5jdGlvbiBwYXR0ZXJuXG5QcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKCdwaHAnLCAnb3BlcmF0b3InLCB7XG5cdCdwcm9wZXJ0eSc6IHtcblx0XHRwYXR0ZXJuOiAvKC0+KVtcXHddKy9nLFxuXHRcdGxvb2tiZWhpbmQ6IHRydWVcblx0fVxufSk7XG5cbi8vIEFkZCBIVE1MIHN1cHBvcnQgb2YgdGhlIG1hcmt1cCBsYW5ndWFnZSBleGlzdHNcbmlmIChQcmlzbS5sYW5ndWFnZXMubWFya3VwKSB7XG5cblx0Ly8gVG9rZW5pemUgYWxsIGlubGluZSBQSFAgYmxvY2tzIHRoYXQgYXJlIHdyYXBwZWQgaW4gPD9waHAgPz5cblx0Ly8gVGhpcyBhbGxvd3MgZm9yIGVhc3kgUEhQICsgbWFya3VwIGhpZ2hsaWdodGluZ1xuXHRQcmlzbS5ob29rcy5hZGQoJ2JlZm9yZS1oaWdobGlnaHQnLCBmdW5jdGlvbihlbnYpIHtcblx0XHRpZiAoZW52Lmxhbmd1YWdlICE9PSAncGhwJykge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGVudi50b2tlblN0YWNrID0gW107XG5cblx0XHRlbnYuYmFja3VwQ29kZSA9IGVudi5jb2RlO1xuXHRcdGVudi5jb2RlID0gZW52LmNvZGUucmVwbGFjZSgvKD86PFxcP3BocHw8XFw/KVtcXHdcXFddKj8oPzpcXD8+KS9pZywgZnVuY3Rpb24obWF0Y2gpIHtcblx0XHRcdGVudi50b2tlblN0YWNrLnB1c2gobWF0Y2gpO1xuXG5cdFx0XHRyZXR1cm4gJ3t7e1BIUCcgKyBlbnYudG9rZW5TdGFjay5sZW5ndGggKyAnfX19Jztcblx0XHR9KTtcblx0fSk7XG5cblx0Ly8gUmVzdG9yZSBlbnYuY29kZSBmb3Igb3RoZXIgcGx1Z2lucyAoZS5nLiBsaW5lLW51bWJlcnMpXG5cdFByaXNtLmhvb2tzLmFkZCgnYmVmb3JlLWluc2VydCcsIGZ1bmN0aW9uKGVudikge1xuXHRcdGlmIChlbnYubGFuZ3VhZ2UgPT09ICdwaHAnKSB7XG5cdFx0XHRlbnYuY29kZSA9IGVudi5iYWNrdXBDb2RlO1xuXHRcdFx0ZGVsZXRlIGVudi5iYWNrdXBDb2RlO1xuXHRcdH1cblx0fSk7XG5cblx0Ly8gUmUtaW5zZXJ0IHRoZSB0b2tlbnMgYWZ0ZXIgaGlnaGxpZ2h0aW5nXG5cdFByaXNtLmhvb2tzLmFkZCgnYWZ0ZXItaGlnaGxpZ2h0JywgZnVuY3Rpb24oZW52KSB7XG5cdFx0aWYgKGVudi5sYW5ndWFnZSAhPT0gJ3BocCcpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRmb3IgKHZhciBpID0gMCwgdDsgdCA9IGVudi50b2tlblN0YWNrW2ldOyBpKyspIHtcblx0XHRcdGVudi5oaWdobGlnaHRlZENvZGUgPSBlbnYuaGlnaGxpZ2h0ZWRDb2RlLnJlcGxhY2UoJ3t7e1BIUCcgKyAoaSArIDEpICsgJ319fScsIFByaXNtLmhpZ2hsaWdodCh0LCBlbnYuZ3JhbW1hciwgJ3BocCcpKTtcblx0XHR9XG5cblx0XHRlbnYuZWxlbWVudC5pbm5lckhUTUwgPSBlbnYuaGlnaGxpZ2h0ZWRDb2RlO1xuXHR9KTtcblxuXHQvLyBXcmFwIHRva2VucyBpbiBjbGFzc2VzIHRoYXQgYXJlIG1pc3NpbmcgdGhlbVxuXHRQcmlzbS5ob29rcy5hZGQoJ3dyYXAnLCBmdW5jdGlvbihlbnYpIHtcblx0XHRpZiAoZW52Lmxhbmd1YWdlID09PSAncGhwJyAmJiBlbnYudHlwZSA9PT0gJ21hcmt1cCcpIHtcblx0XHRcdGVudi5jb250ZW50ID0gZW52LmNvbnRlbnQucmVwbGFjZSgvKFxce1xce1xce1BIUFswLTldK1xcfVxcfVxcfSkvZywgXCI8c3BhbiBjbGFzcz1cXFwidG9rZW4gcGhwXFxcIj4kMTwvc3Bhbj5cIik7XG5cdFx0fVxuXHR9KTtcblxuXHQvLyBBZGQgdGhlIHJ1bGVzIGJlZm9yZSBhbGwgb3RoZXJzXG5cdFByaXNtLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoJ3BocCcsICdjb21tZW50Jywge1xuXHRcdCdtYXJrdXAnOiB7XG5cdFx0XHRwYXR0ZXJuOiAvPFteP11cXC8/KC4qPyk+L2csXG5cdFx0XHRpbnNpZGU6IFByaXNtLmxhbmd1YWdlcy5tYXJrdXBcblx0XHR9LFxuXHRcdCdwaHAnOiAvXFx7XFx7XFx7UEhQWzAtOV0rXFx9XFx9XFx9L2dcblx0fSk7XG59XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG5cbi8qKlxuICogQW5pbWF0aW9uIGhlbHBlci5cbiAqL1xudmFyIEFuaW1hdG9yID0gZnVuY3Rpb24oZHVyYXRpb24pIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuZHVyYXRpb24gPSBkdXJhdGlvbjtcbiAgICB0aGlzLl9zdGFydCA9IERhdGUubm93KCk7XG59O1xudXRpbHMuaW5oZXJpdChBbmltYXRvciwgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vKipcbiAqIEdldCB0aGUgdGltZSBpbiB0aGUgYW5pbWF0aW9uXG4gKiBAcmV0dXJuIHtmbG9hdH0gYmV0d2VlbiAwIGFuZCAxXG4gKi9cbkFuaW1hdG9yLnByb3RvdHlwZS50aW1lID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGVsYXBzZWQgPSBEYXRlLm5vdygpIC0gdGhpcy5fc3RhcnQ7XG4gICAgcmV0dXJuIChlbGFwc2VkICUgdGhpcy5kdXJhdGlvbikgLyB0aGlzLmR1cmF0aW9uO1xufTtcblxuZXhwb3J0cy5BbmltYXRvciA9IEFuaW1hdG9yOyIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG52YXIgY29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcuanMnKTtcbmNvbmZpZyA9IGNvbmZpZy5jb25maWc7XG5cbi8qKlxuICogSFRNTCBjYW52YXMgd2l0aCBkcmF3aW5nIGNvbnZpbmllbmNlIGZ1bmN0aW9ucy5cbiAqL1xudmFyIENhbnZhcyA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3JlbmRlcmVkX3JlZ2lvbiA9IFtudWxsLCBudWxsLCBudWxsLCBudWxsXTsgLy8geDEseTEseDIseTJcblxuICAgIHV0aWxzLlBvc3RlckNsYXNzLmNhbGwodGhpcyk7XG4gICAgdGhpcy5fbGF5b3V0KCk7XG4gICAgdGhpcy5faW5pdF9wcm9wZXJ0aWVzKCk7XG4gICAgdGhpcy5fbGFzdF9zZXRfb3B0aW9ucyA9IHt9O1xuXG4gICAgdGhpcy5fdGV4dF9zaXplX2NhY2hlID0ge307XG4gICAgdGhpcy5fdGV4dF9zaXplX2FycmF5ID0gW107XG4gICAgdGhpcy5fdGV4dF9zaXplX2NhY2hlX3NpemUgPSAxMDAwO1xuXG4gICAgLy8gU2V0IGRlZmF1bHQgc2l6ZS5cbiAgICB0aGlzLndpZHRoID0gNDAwO1xuICAgIHRoaXMuaGVpZ2h0ID0gMzAwO1xufTtcbnV0aWxzLmluaGVyaXQoQ2FudmFzLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8qKlxuICogTGF5b3V0IHRoZSBlbGVtZW50cyBmb3IgdGhlIGNhbnZhcy5cbiAqIENyZWF0ZXMgYHRoaXMuZWxgXG4gKiBcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuX2xheW91dCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2NhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICAgIHRoaXMuX2NhbnZhcy5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ3Bvc3RlciBoaWRkZW4tY2FudmFzJyk7XG4gICAgdGhpcy5jb250ZXh0ID0gdGhpcy5fY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgICAgIFxuICAgIC8vIFN0cmV0Y2ggdGhlIGltYWdlIGZvciByZXRpbmEgc3VwcG9ydC5cbiAgICB0aGlzLnNjYWxlKDIsMik7XG59O1xuXG4vKipcbiAqIE1ha2UgdGhlIHByb3BlcnRpZXMgb2YgdGhlIGNsYXNzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5faW5pdF9wcm9wZXJ0aWVzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogSGVpZ2h0IG9mIHRoZSBjYW52YXNcbiAgICAgKiBAcmV0dXJuIHtmbG9hdH1cbiAgICAgKi9cbiAgICB0aGlzLnByb3BlcnR5KCdoZWlnaHQnLCBmdW5jdGlvbigpIHsgXG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMuaGVpZ2h0IC8gMjsgXG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC5fY2FudmFzLnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgdmFsdWUgKiAyKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFN0cmV0Y2ggdGhlIGltYWdlIGZvciByZXRpbmEgc3VwcG9ydC5cbiAgICAgICAgdGhpcy5zY2FsZSgyLDIpO1xuICAgICAgICB0aGlzLl90b3VjaCgpO1xuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogV2lkdGggb2YgdGhlIGNhbnZhc1xuICAgICAqIEByZXR1cm4ge2Zsb2F0fVxuICAgICAqL1xuICAgIHRoaXMucHJvcGVydHkoJ3dpZHRoJywgZnVuY3Rpb24oKSB7IFxuICAgICAgICByZXR1cm4gdGhhdC5fY2FudmFzLndpZHRoIC8gMjsgXG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC5fY2FudmFzLnNldEF0dHJpYnV0ZSgnd2lkdGgnLCB2YWx1ZSAqIDIpO1xuICAgICAgICBcbiAgICAgICAgLy8gU3RyZXRjaCB0aGUgaW1hZ2UgZm9yIHJldGluYSBzdXBwb3J0LlxuICAgICAgICB0aGlzLnNjYWxlKDIsMik7XG4gICAgICAgIHRoaXMuX3RvdWNoKCk7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBSZWdpb24gb2YgdGhlIGNhbnZhcyB0aGF0IGhhcyBiZWVuIHJlbmRlcmVkIHRvXG4gICAgICogQHJldHVybiB7ZGljdGlvbmFyeX0gZGljdGlvbmFyeSBkZXNjcmliaW5nIGEgcmVjdGFuZ2xlIHt4LHksd2lkdGgsaGVpZ2h0fVxuICAgICAqL1xuICAgIHRoaXMucHJvcGVydHkoJ3JlbmRlcmVkX3JlZ2lvbicsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgeDogdGhpcy5fdHgodGhpcy5fcmVuZGVyZWRfcmVnaW9uWzBdLCB0cnVlKSxcbiAgICAgICAgICAgIHk6IHRoaXMuX3R5KHRoaXMuX3JlbmRlcmVkX3JlZ2lvblsxXSwgdHJ1ZSksXG4gICAgICAgICAgICB3aWR0aDogdGhpcy5fcmVuZGVyZWRfcmVnaW9uWzJdIC0gdGhpcy5fcmVuZGVyZWRfcmVnaW9uWzBdLFxuICAgICAgICAgICAgaGVpZ2h0OiB0aGlzLl9yZW5kZXJlZF9yZWdpb25bM10gLSB0aGlzLl9yZW5kZXJlZF9yZWdpb25bMV0sXG4gICAgICAgIH07XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIERyYXdzIGEgcmVjdGFuZ2xlXG4gKiBAcGFyYW0gIHtmbG9hdH0geFxuICogQHBhcmFtICB7ZmxvYXR9IHlcbiAqIEBwYXJhbSAge2Zsb2F0fSB3aWR0aFxuICogQHBhcmFtICB7ZmxvYXR9IGhlaWdodFxuICogQHBhcmFtICB7ZGljdGlvbmFyeX0gb3B0aW9ucywgc2VlIF9hcHBseV9vcHRpb25zKCkgZm9yIGRldGFpbHNcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuZHJhd19yZWN0YW5nbGUgPSBmdW5jdGlvbih4LCB5LCB3aWR0aCwgaGVpZ2h0LCBvcHRpb25zKSB7XG4gICAgeCA9IHRoaXMuX3R4KHgpO1xuICAgIHkgPSB0aGlzLl90eSh5KTtcbiAgICB0aGlzLmNvbnRleHQuYmVnaW5QYXRoKCk7XG4gICAgdGhpcy5jb250ZXh0LnJlY3QoeCwgeSwgd2lkdGgsIGhlaWdodCk7XG4gICAgdGhpcy5fZG9fZHJhdyhvcHRpb25zKTtcbiAgICB0aGlzLl90b3VjaCh4LCB5LCB4K3dpZHRoLCB5K2hlaWdodCk7XG59O1xuXG4vKipcbiAqIERyYXdzIGEgY2lyY2xlXG4gKiBAcGFyYW0gIHtmbG9hdH0geFxuICogQHBhcmFtICB7ZmxvYXR9IHlcbiAqIEBwYXJhbSAge2Zsb2F0fSByXG4gKiBAcGFyYW0gIHtkaWN0aW9uYXJ5fSBvcHRpb25zLCBzZWUgX2FwcGx5X29wdGlvbnMoKSBmb3IgZGV0YWlsc1xuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5kcmF3X2NpcmNsZSA9IGZ1bmN0aW9uKHgsIHksIHIsIG9wdGlvbnMpIHtcbiAgICB4ID0gdGhpcy5fdHgoeCk7XG4gICAgeSA9IHRoaXMuX3R5KHkpO1xuICAgIHRoaXMuY29udGV4dC5iZWdpblBhdGgoKTtcbiAgICB0aGlzLmNvbnRleHQuYXJjKHgsIHksIHIsIDAsIDIgKiBNYXRoLlBJKTtcbiAgICB0aGlzLl9kb19kcmF3KG9wdGlvbnMpO1xuICAgIHRoaXMuX3RvdWNoKHgtciwgeS1yLCB4K3IsIHkrcik7XG59O1xuXG4vKipcbiAqIERyYXdzIGFuIGltYWdlXG4gKiBAcGFyYW0gIHtpbWcgZWxlbWVudH0gaW1nXG4gKiBAcGFyYW0gIHtmbG9hdH0geFxuICogQHBhcmFtICB7ZmxvYXR9IHlcbiAqIEBwYXJhbSAge2Zsb2F0fSAob3B0aW9uYWwpIHdpZHRoXG4gKiBAcGFyYW0gIHtmbG9hdH0gKG9wdGlvbmFsKSBoZWlnaHRcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuZHJhd19pbWFnZSA9IGZ1bmN0aW9uKGltZywgeCwgeSwgd2lkdGgsIGhlaWdodCkge1xuICAgIHggPSB0aGlzLl90eCh4KTtcbiAgICB5ID0gdGhpcy5fdHkoeSk7XG4gICAgd2lkdGggPSB3aWR0aCB8fCBpbWcud2lkdGg7XG4gICAgaGVpZ2h0ID0gaGVpZ2h0IHx8IGltZy5oZWlnaHQ7XG4gICAgaW1nID0gaW1nLl9jYW52YXMgPyBpbWcuX2NhbnZhcyA6IGltZztcbiAgICB0aGlzLmNvbnRleHQuZHJhd0ltYWdlKGltZywgeCwgeSwgd2lkdGgsIGhlaWdodCk7XG4gICAgdGhpcy5fdG91Y2goeCwgeSwgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQpO1xufTtcblxuLyoqXG4gKiBEcmF3cyBhIGxpbmVcbiAqIEBwYXJhbSAge2Zsb2F0fSB4MVxuICogQHBhcmFtICB7ZmxvYXR9IHkxXG4gKiBAcGFyYW0gIHtmbG9hdH0geDJcbiAqIEBwYXJhbSAge2Zsb2F0fSB5MlxuICogQHBhcmFtICB7ZGljdGlvbmFyeX0gb3B0aW9ucywgc2VlIF9hcHBseV9vcHRpb25zKCkgZm9yIGRldGFpbHNcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuZHJhd19saW5lID0gZnVuY3Rpb24oeDEsIHkxLCB4MiwgeTIsIG9wdGlvbnMpIHtcbiAgICB4MSA9IHRoaXMuX3R4KHgxKTtcbiAgICB5MSA9IHRoaXMuX3R5KHkxKTtcbiAgICB4MiA9IHRoaXMuX3R4KHgyKTtcbiAgICB5MiA9IHRoaXMuX3R5KHkyKTtcbiAgICB0aGlzLmNvbnRleHQuYmVnaW5QYXRoKCk7XG4gICAgdGhpcy5jb250ZXh0Lm1vdmVUbyh4MSwgeTEpO1xuICAgIHRoaXMuY29udGV4dC5saW5lVG8oeDIsIHkyKTtcbiAgICB0aGlzLl9kb19kcmF3KG9wdGlvbnMpO1xuICAgIHRoaXMuX3RvdWNoKHgxLCB5MSwgeDIsIHkyKTtcbn07XG5cbi8qKlxuICogRHJhd3MgYSBwb2x5IGxpbmVcbiAqIEBwYXJhbSAge2FycmF5fSBwb2ludHMgLSBhcnJheSBvZiBwb2ludHMuICBFYWNoIHBvaW50IGlzXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgYW4gYXJyYXkgaXRzZWxmLCBvZiB0aGUgZm9ybSBbeCwgeV0gXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgd2hlcmUgeCBhbmQgeSBhcmUgZmxvYXRpbmcgcG9pbnRcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZXMuXG4gKiBAcGFyYW0gIHtkaWN0aW9uYXJ5fSBvcHRpb25zLCBzZWUgX2FwcGx5X29wdGlvbnMoKSBmb3IgZGV0YWlsc1xuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5kcmF3X3BvbHlsaW5lID0gZnVuY3Rpb24ocG9pbnRzLCBvcHRpb25zKSB7XG4gICAgaWYgKHBvaW50cy5sZW5ndGggPCAyKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignUG9seSBsaW5lIG11c3QgaGF2ZSBhdGxlYXN0IHR3byBwb2ludHMuJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5jb250ZXh0LmJlZ2luUGF0aCgpO1xuICAgICAgICB2YXIgcG9pbnQgPSBwb2ludHNbMF07XG4gICAgICAgIHRoaXMuY29udGV4dC5tb3ZlVG8odGhpcy5fdHgocG9pbnRbMF0pLCB0aGlzLl90eShwb2ludFsxXSkpO1xuXG4gICAgICAgIHZhciBtaW54ID0gdGhpcy53aWR0aDtcbiAgICAgICAgdmFyIG1pbnkgPSB0aGlzLmhlaWdodDtcbiAgICAgICAgdmFyIG1heHggPSAwO1xuICAgICAgICB2YXIgbWF4eSA9IDA7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgcG9pbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBwb2ludCA9IHBvaW50c1tpXTtcbiAgICAgICAgICAgIHRoaXMuY29udGV4dC5saW5lVG8odGhpcy5fdHgocG9pbnRbMF0pLCB0aGlzLl90eShwb2ludFsxXSkpO1xuXG4gICAgICAgICAgICBtaW54ID0gTWF0aC5taW4odGhpcy5fdHgocG9pbnRbMF0pLCBtaW54KTtcbiAgICAgICAgICAgIG1pbnkgPSBNYXRoLm1pbih0aGlzLl90eShwb2ludFsxXSksIG1pbnkpO1xuICAgICAgICAgICAgbWF4eCA9IE1hdGgubWF4KHRoaXMuX3R4KHBvaW50WzBdKSwgbWF4eCk7XG4gICAgICAgICAgICBtYXh5ID0gTWF0aC5tYXgodGhpcy5fdHkocG9pbnRbMV0pLCBtYXh5KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9kb19kcmF3KG9wdGlvbnMpOyBcbiAgICAgICAgdGhpcy5fdG91Y2gobWlueCwgbWlueSwgbWF4eCwgbWF4eSk7ICAgXG4gICAgfVxufTtcblxuLyoqXG4gKiBEcmF3cyBhIHRleHQgc3RyaW5nXG4gKiBAcGFyYW0gIHtmbG9hdH0geFxuICogQHBhcmFtICB7ZmxvYXR9IHlcbiAqIEBwYXJhbSAge3N0cmluZ30gdGV4dCBzdHJpbmcgb3IgY2FsbGJhY2sgdGhhdCByZXNvbHZlcyB0byBhIHN0cmluZy5cbiAqIEBwYXJhbSAge2RpY3Rpb25hcnl9IG9wdGlvbnMsIHNlZSBfYXBwbHlfb3B0aW9ucygpIGZvciBkZXRhaWxzXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DYW52YXMucHJvdG90eXBlLmRyYXdfdGV4dCA9IGZ1bmN0aW9uKHgsIHksIHRleHQsIG9wdGlvbnMpIHtcbiAgICB4ID0gdGhpcy5fdHgoeCk7XG4gICAgeSA9IHRoaXMuX3R5KHkpO1xuICAgIHRleHQgPSB0aGlzLl9wcm9jZXNzX3RhYnModGV4dCk7XG4gICAgb3B0aW9ucyA9IHRoaXMuX2FwcGx5X29wdGlvbnMob3B0aW9ucyk7XG4gICAgLy8gJ2ZpbGwnIHRoZSB0ZXh0IGJ5IGRlZmF1bHQgd2hlbiBuZWl0aGVyIGEgc3Ryb2tlIG9yIGZpbGwgXG4gICAgLy8gaXMgZGVmaW5lZC4gIE90aGVyd2lzZSBvbmx5IGZpbGwgaWYgYSBmaWxsIGlzIGRlZmluZWQuXG4gICAgaWYgKG9wdGlvbnMuZmlsbCB8fCAhb3B0aW9ucy5zdHJva2UpIHtcbiAgICAgICAgdGhpcy5jb250ZXh0LmZpbGxUZXh0KHRleHQsIHgsIHkpO1xuICAgIH1cbiAgICAvLyBPbmx5IHN0cm9rZSBpZiBhIHN0cm9rZSBpcyBkZWZpbmVkLlxuICAgIGlmIChvcHRpb25zLnN0cm9rZSkge1xuICAgICAgICB0aGlzLmNvbnRleHQuc3Ryb2tlVGV4dCh0ZXh0LCB4LCB5KTsgICAgICAgXG4gICAgfVxuICAgIHRoaXMuX3RvdWNoKHgsIHksIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KTtcbn07XG5cbi8qKlxuICogR2V0J3MgYSBjaHVuayBvZiB0aGUgY2FudmFzIGFzIGEgcmF3IGltYWdlLlxuICogQHBhcmFtICB7ZmxvYXR9IChvcHRpb25hbCkgeFxuICogQHBhcmFtICB7ZmxvYXR9IChvcHRpb25hbCkgeVxuICogQHBhcmFtICB7ZmxvYXR9IChvcHRpb25hbCkgd2lkdGhcbiAqIEBwYXJhbSAge2Zsb2F0fSAob3B0aW9uYWwpIGhlaWdodFxuICogQHJldHVybiB7aW1hZ2V9IGNhbnZhcyBpbWFnZSBkYXRhXG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuZ2V0X3Jhd19pbWFnZSA9IGZ1bmN0aW9uKHgsIHksIHdpZHRoLCBoZWlnaHQpIHtcbiAgICBjb25zb2xlLndhcm4oJ2dldF9yYXdfaW1hZ2UgaW1hZ2UgaXMgc2xvdywgdXNlIGNhbnZhcyByZWZlcmVuY2VzIGluc3RlYWQgd2l0aCBkcmF3X2ltYWdlJyk7XG4gICAgaWYgKHg9PT11bmRlZmluZWQpIHtcbiAgICAgICAgeCA9IDA7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgeCA9IHRoaXMuX3R4KHgpO1xuICAgIH1cbiAgICBpZiAoeT09PXVuZGVmaW5lZCkge1xuICAgICAgICB5ID0gMDtcbiAgICB9IGVsc2Uge1xuICAgICAgICB5ID0gdGhpcy5fdHkoeSk7XG4gICAgfVxuICAgIGlmICh3aWR0aCA9PT0gdW5kZWZpbmVkKSB3aWR0aCA9IHRoaXMud2lkdGg7XG4gICAgaWYgKGhlaWdodCA9PT0gdW5kZWZpbmVkKSBoZWlnaHQgPSB0aGlzLmhlaWdodDtcblxuICAgIC8vIE11bHRpcGx5IGJ5IHR3byBmb3IgcGl4ZWwgZG91YmxpbmcuXG4gICAgeCA9IDIgKiB4O1xuICAgIHkgPSAyICogeTtcbiAgICB3aWR0aCA9IDIgKiB3aWR0aDtcbiAgICBoZWlnaHQgPSAyICogaGVpZ2h0O1xuICAgIFxuICAgIC8vIFVwZGF0ZSB0aGUgY2FjaGVkIGltYWdlIGlmIGl0J3Mgbm90IHRoZSByZXF1ZXN0ZWQgb25lLlxuICAgIHZhciByZWdpb24gPSBbeCwgeSwgd2lkdGgsIGhlaWdodF07XG4gICAgaWYgKCEodGhpcy5fY2FjaGVkX3RpbWVzdGFtcCA9PT0gdGhpcy5fbW9kaWZpZWQgJiYgdXRpbHMuY29tcGFyZV9hcnJheXMocmVnaW9uLCB0aGlzLl9jYWNoZWRfcmVnaW9uKSkpIHtcbiAgICAgICAgdGhpcy5fY2FjaGVkX2ltYWdlID0gdGhpcy5jb250ZXh0LmdldEltYWdlRGF0YSh4LCB5LCB3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgdGhpcy5fY2FjaGVkX3RpbWVzdGFtcCA9IHRoaXMuX21vZGlmaWVkO1xuICAgICAgICB0aGlzLl9jYWNoZWRfcmVnaW9uID0gcmVnaW9uO1xuICAgIH1cblxuICAgIC8vIFJldHVybiB0aGUgY2FjaGVkIGltYWdlLlxuICAgIHJldHVybiB0aGlzLl9jYWNoZWRfaW1hZ2U7XG59O1xuXG4vKipcbiAqIFB1dCdzIGEgcmF3IGltYWdlIG9uIHRoZSBjYW52YXMgc29tZXdoZXJlLlxuICogQHBhcmFtICB7ZmxvYXR9IHhcbiAqIEBwYXJhbSAge2Zsb2F0fSB5XG4gKiBAcmV0dXJuIHtpbWFnZX0gY2FudmFzIGltYWdlIGRhdGFcbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5wdXRfcmF3X2ltYWdlID0gZnVuY3Rpb24oaW1nLCB4LCB5KSB7XG4gICAgY29uc29sZS53YXJuKCdwdXRfcmF3X2ltYWdlIGltYWdlIGlzIHNsb3csIHVzZSBkcmF3X2ltYWdlIGluc3RlYWQnKTtcbiAgICB4ID0gdGhpcy5fdHgoeCk7XG4gICAgeSA9IHRoaXMuX3R5KHkpO1xuICAgIC8vIE11bHRpcGx5IGJ5IHR3byBmb3IgcGl4ZWwgZG91YmxpbmcuXG4gICAgcmV0ID0gdGhpcy5jb250ZXh0LnB1dEltYWdlRGF0YShpbWcsIHgqMiwgeSoyKTtcbiAgICB0aGlzLl90b3VjaCh4LCB5LCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCk7XG4gICAgcmV0dXJuIHJldDtcbn07XG5cbi8qKlxuICogTWVhc3VyZXMgdGhlIHdpZHRoIG9mIGEgdGV4dCBzdHJpbmcuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IHRleHRcbiAqIEBwYXJhbSAge2RpY3Rpb25hcnl9IG9wdGlvbnMsIHNlZSBfYXBwbHlfb3B0aW9ucygpIGZvciBkZXRhaWxzXG4gKiBAcmV0dXJuIHtmbG9hdH0gd2lkdGhcbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5tZWFzdXJlX3RleHQgPSBmdW5jdGlvbih0ZXh0LCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IHRoaXMuX2FwcGx5X29wdGlvbnMob3B0aW9ucyk7XG4gICAgdGV4dCA9IHRoaXMuX3Byb2Nlc3NfdGFicyh0ZXh0KTtcblxuICAgIC8vIENhY2hlIHRoZSBzaXplIGlmIGl0J3Mgbm90IGFscmVhZHkgY2FjaGVkLlxuICAgIGlmICh0aGlzLl90ZXh0X3NpemVfY2FjaGVbdGV4dF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLl90ZXh0X3NpemVfY2FjaGVbdGV4dF0gPSB0aGlzLmNvbnRleHQubWVhc3VyZVRleHQodGV4dCkud2lkdGg7XG4gICAgICAgIHRoaXMuX3RleHRfc2l6ZV9hcnJheS5wdXNoKHRleHQpO1xuXG4gICAgICAgIC8vIFJlbW92ZSB0aGUgb2xkZXN0IGl0ZW0gaW4gdGhlIGFycmF5IGlmIHRoZSBjYWNoZSBpcyB0b28gbGFyZ2UuXG4gICAgICAgIHdoaWxlICh0aGlzLl90ZXh0X3NpemVfYXJyYXkubGVuZ3RoID4gdGhpcy5fdGV4dF9zaXplX2NhY2hlX3NpemUpIHtcbiAgICAgICAgICAgIHZhciBvbGRlc3QgPSB0aGlzLl90ZXh0X3NpemVfYXJyYXkuc2hpZnQoKTtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl90ZXh0X3NpemVfY2FjaGVbb2xkZXN0XTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvLyBVc2UgdGhlIGNhY2hlZCBzaXplLlxuICAgIHJldHVybiB0aGlzLl90ZXh0X3NpemVfY2FjaGVbdGV4dF07XG59O1xuXG4vKipcbiAqIENsZWFyJ3MgdGhlIGNhbnZhcy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmNvbnRleHQuY2xlYXJSZWN0KDAsIDAsIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KTtcbiAgICB0aGlzLl90b3VjaCgpO1xufTtcblxuLyoqXG4gKiBTY2FsZSB0aGUgY3VycmVudCBkcmF3aW5nLlxuICogQHBhcmFtICB7ZmxvYXR9IHhcbiAqIEBwYXJhbSAge2Zsb2F0fSB5XG4gKiBAcmV0dXJuIHtudWxsfSAgXG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuc2NhbGUgPSBmdW5jdGlvbih4LCB5KSB7XG4gICAgdGhpcy5jb250ZXh0LnNjYWxlKHgsIHkpO1xuICAgIHRoaXMuX3RvdWNoKCk7XG59O1xuXG4vKipcbiAqIEZpbmlzaGVzIHRoZSBkcmF3aW5nIG9wZXJhdGlvbiB1c2luZyB0aGUgc2V0IG9mIHByb3ZpZGVkIG9wdGlvbnMuXG4gKiBAcGFyYW0gIHtkaWN0aW9uYXJ5fSAob3B0aW9uYWwpIGRpY3Rpb25hcnkgdGhhdCBcbiAqICByZXNvbHZlcyB0byBhIGRpY3Rpb25hcnkuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DYW52YXMucHJvdG90eXBlLl9kb19kcmF3ID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSB0aGlzLl9hcHBseV9vcHRpb25zKG9wdGlvbnMpO1xuXG4gICAgLy8gT25seSBmaWxsIGlmIGEgZmlsbCBpcyBkZWZpbmVkLlxuICAgIGlmIChvcHRpb25zLmZpbGwpIHtcbiAgICAgICAgdGhpcy5jb250ZXh0LmZpbGwoKTtcbiAgICB9XG4gICAgLy8gU3Ryb2tlIGJ5IGRlZmF1bHQsIGlmIG5vIHN0cm9rZSBvciBmaWxsIGlzIGRlZmluZWQuICBPdGhlcndpc2VcbiAgICAvLyBvbmx5IHN0cm9rZSBpZiBhIHN0cm9rZSBpcyBkZWZpbmVkLlxuICAgIGlmIChvcHRpb25zLnN0cm9rZSB8fCAhb3B0aW9ucy5maWxsKSB7XG4gICAgICAgIHRoaXMuY29udGV4dC5zdHJva2UoKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEFwcGxpZXMgYSBkaWN0aW9uYXJ5IG9mIGRyYXdpbmcgb3B0aW9ucyB0byB0aGUgcGVuLlxuICogQHBhcmFtICB7ZGljdGlvbmFyeX0gb3B0aW9uc1xuICogICAgICBhbHBoYSB7ZmxvYXR9IE9wYWNpdHkgKDAtMSlcbiAqICAgICAgY29tcG9zaXRlX29wZXJhdGlvbiB7c3RyaW5nfSBIb3cgbmV3IGltYWdlcyBhcmUgXG4gKiAgICAgICAgICBkcmF3biBvbnRvIGFuIGV4aXN0aW5nIGltYWdlLiAgUG9zc2libGUgdmFsdWVzXG4gKiAgICAgICAgICBhcmUgYHNvdXJjZS1vdmVyYCwgYHNvdXJjZS1hdG9wYCwgYHNvdXJjZS1pbmAsIFxuICogICAgICAgICAgYHNvdXJjZS1vdXRgLCBgZGVzdGluYXRpb24tb3ZlcmAsIFxuICogICAgICAgICAgYGRlc3RpbmF0aW9uLWF0b3BgLCBgZGVzdGluYXRpb24taW5gLCBcbiAqICAgICAgICAgIGBkZXN0aW5hdGlvbi1vdXRgLCBgbGlnaHRlcmAsIGBjb3B5YCwgb3IgYHhvcmAuXG4gKiAgICAgIGxpbmVfY2FwIHtzdHJpbmd9IEVuZCBjYXAgc3R5bGUgZm9yIGxpbmVzLlxuICogICAgICAgICAgUG9zc2libGUgdmFsdWVzIGFyZSAnYnV0dCcsICdyb3VuZCcsIG9yICdzcXVhcmUnLlxuICogICAgICBsaW5lX2pvaW4ge3N0cmluZ30gSG93IHRvIHJlbmRlciB3aGVyZSB0d28gbGluZXNcbiAqICAgICAgICAgIG1lZXQuICBQb3NzaWJsZSB2YWx1ZXMgYXJlICdiZXZlbCcsICdyb3VuZCcsIG9yXG4gKiAgICAgICAgICAnbWl0ZXInLlxuICogICAgICBsaW5lX3dpZHRoIHtmbG9hdH0gSG93IHRoaWNrIGxpbmVzIGFyZS5cbiAqICAgICAgbGluZV9taXRlcl9saW1pdCB7ZmxvYXR9IE1heCBsZW5ndGggb2YgbWl0ZXJzLlxuICogICAgICBsaW5lX2NvbG9yIHtzdHJpbmd9IENvbG9yIG9mIHRoZSBsaW5lLlxuICogICAgICBmaWxsX2NvbG9yIHtzdHJpbmd9IENvbG9yIHRvIGZpbGwgdGhlIHNoYXBlLlxuICogICAgICBjb2xvciB7c3RyaW5nfSBDb2xvciB0byBzdHJva2UgYW5kIGZpbGwgdGhlIHNoYXBlLlxuICogICAgICAgICAgTG93ZXIgcHJpb3JpdHkgdG8gbGluZV9jb2xvciBhbmQgZmlsbF9jb2xvci5cbiAqICAgICAgZm9udF9zdHlsZSB7c3RyaW5nfVxuICogICAgICBmb250X3ZhcmlhbnQge3N0cmluZ31cbiAqICAgICAgZm9udF93ZWlnaHQge3N0cmluZ31cbiAqICAgICAgZm9udF9zaXplIHtzdHJpbmd9XG4gKiAgICAgIGZvbnRfZmFtaWx5IHtzdHJpbmd9XG4gKiAgICAgIGZvbnQge3N0cmluZ30gT3ZlcnJpZGRlcyBhbGwgb3RoZXIgZm9udCBwcm9wZXJ0aWVzLlxuICogICAgICB0ZXh0X2FsaWduIHtzdHJpbmd9IEhvcml6b250YWwgYWxpZ25tZW50IG9mIHRleHQuICBcbiAqICAgICAgICAgIFBvc3NpYmxlIHZhbHVlcyBhcmUgYHN0YXJ0YCwgYGVuZGAsIGBjZW50ZXJgLFxuICogICAgICAgICAgYGxlZnRgLCBvciBgcmlnaHRgLlxuICogICAgICB0ZXh0X2Jhc2VsaW5lIHtzdHJpbmd9IFZlcnRpY2FsIGFsaWdubWVudCBvZiB0ZXh0LlxuICogICAgICAgICAgUG9zc2libGUgdmFsdWVzIGFyZSBgYWxwaGFiZXRpY2AsIGB0b3BgLCBcbiAqICAgICAgICAgIGBoYW5naW5nYCwgYG1pZGRsZWAsIGBpZGVvZ3JhcGhpY2AsIG9yIFxuICogICAgICAgICAgYGJvdHRvbWAuXG4gKiBAcmV0dXJuIHtkaWN0aW9uYXJ5fSBvcHRpb25zLCByZXNvbHZlZC5cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5fYXBwbHlfb3B0aW9ucyA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICBvcHRpb25zID0gdXRpbHMucmVzb2x2ZV9jYWxsYWJsZShvcHRpb25zKTtcblxuICAgIC8vIFNwZWNpYWwgb3B0aW9ucy5cbiAgICB2YXIgc2V0X29wdGlvbnMgPSB7fTtcbiAgICBzZXRfb3B0aW9ucy5nbG9iYWxBbHBoYSA9IG9wdGlvbnMuYWxwaGE9PT11bmRlZmluZWQgPyAxLjAgOiBvcHRpb25zLmFscGhhO1xuICAgIHNldF9vcHRpb25zLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbiA9IG9wdGlvbnMuY29tcG9zaXRlX29wZXJhdGlvbiB8fCAnc291cmNlLW92ZXInO1xuICAgIFxuICAgIC8vIExpbmUgc3R5bGUuXG4gICAgc2V0X29wdGlvbnMubGluZUNhcCA9IG9wdGlvbnMubGluZV9jYXAgfHwgJ2J1dHQnO1xuICAgIHNldF9vcHRpb25zLmxpbmVKb2luID0gb3B0aW9ucy5saW5lX2pvaW4gfHwgJ2JldmVsJztcbiAgICBzZXRfb3B0aW9ucy5saW5lV2lkdGggPSBvcHRpb25zLmxpbmVfd2lkdGg9PT11bmRlZmluZWQgPyAxLjAgOiBvcHRpb25zLmxpbmVfd2lkdGg7XG4gICAgc2V0X29wdGlvbnMubWl0ZXJMaW1pdCA9IG9wdGlvbnMubGluZV9taXRlcl9saW1pdD09PXVuZGVmaW5lZCA/IDEwIDogb3B0aW9ucy5saW5lX21pdGVyX2xpbWl0O1xuICAgIHRoaXMuY29udGV4dC5zdHJva2VTdHlsZSA9IG9wdGlvbnMubGluZV9jb2xvciB8fCBvcHRpb25zLmNvbG9yIHx8ICdibGFjayc7IC8vIFRPRE86IFN1cHBvcnQgZ3JhZGllbnRcbiAgICBvcHRpb25zLnN0cm9rZSA9IChvcHRpb25zLmxpbmVfY29sb3IgIT09IHVuZGVmaW5lZCB8fCBvcHRpb25zLmxpbmVfd2lkdGggIT09IHVuZGVmaW5lZCk7XG5cbiAgICAvLyBGaWxsIHN0eWxlLlxuICAgIHRoaXMuY29udGV4dC5maWxsU3R5bGUgPSBvcHRpb25zLmZpbGxfY29sb3IgfHwgb3B0aW9ucy5jb2xvciB8fCAncmVkJzsgLy8gVE9ETzogU3VwcG9ydCBncmFkaWVudFxuICAgIG9wdGlvbnMuZmlsbCA9IG9wdGlvbnMuZmlsbF9jb2xvciAhPT0gdW5kZWZpbmVkO1xuXG4gICAgLy8gRm9udCBzdHlsZS5cbiAgICB2YXIgcGl4ZWxzID0gZnVuY3Rpb24oeCkge1xuICAgICAgICBpZiAoeCAhPT0gdW5kZWZpbmVkICYmIHggIT09IG51bGwpIHtcbiAgICAgICAgICAgIGlmIChOdW1iZXIuaXNGaW5pdGUoeCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gU3RyaW5nKHgpICsgJ3B4JztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHg7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdmFyIGZvbnRfc3R5bGUgPSBvcHRpb25zLmZvbnRfc3R5bGUgfHwgJyc7XG4gICAgdmFyIGZvbnRfdmFyaWFudCA9IG9wdGlvbnMuZm9udF92YXJpYW50IHx8ICcnO1xuICAgIHZhciBmb250X3dlaWdodCA9IG9wdGlvbnMuZm9udF93ZWlnaHQgfHwgJyc7XG4gICAgdmFyIGZvbnRfc2l6ZSA9IHBpeGVscyhvcHRpb25zLmZvbnRfc2l6ZSkgfHwgJzEycHgnO1xuICAgIHZhciBmb250X2ZhbWlseSA9IG9wdGlvbnMuZm9udF9mYW1pbHkgfHwgJ0FyaWFsJztcbiAgICB2YXIgZm9udCA9IGZvbnRfc3R5bGUgKyAnICcgKyBmb250X3ZhcmlhbnQgKyAnICcgKyBmb250X3dlaWdodCArICcgJyArIGZvbnRfc2l6ZSArICcgJyArIGZvbnRfZmFtaWx5O1xuICAgIHNldF9vcHRpb25zLmZvbnQgPSBvcHRpb25zLmZvbnQgfHwgZm9udDtcblxuICAgIC8vIFRleHQgc3R5bGUuXG4gICAgc2V0X29wdGlvbnMudGV4dEFsaWduID0gb3B0aW9ucy50ZXh0X2FsaWduIHx8ICdsZWZ0JztcbiAgICBzZXRfb3B0aW9ucy50ZXh0QmFzZWxpbmUgPSBvcHRpb25zLnRleHRfYmFzZWxpbmUgfHwgJ3RvcCc7XG5cbiAgICAvLyBUT0RPOiBTdXBwb3J0IHNoYWRvd3MuXG4gICAgXG4gICAgLy8gRW1wdHkgdGhlIG1lYXN1cmUgdGV4dCBjYWNoZSBpZiB0aGUgZm9udCBpcyBjaGFuZ2VkLlxuICAgIGlmIChzZXRfb3B0aW9ucy5mb250ICE9PSB0aGlzLl9sYXN0X3NldF9vcHRpb25zLmZvbnQpIHtcbiAgICAgICAgdGhpcy5fdGV4dF9zaXplX2NhY2hlID0ge307XG4gICAgICAgIHRoaXMuX3RleHRfc2l6ZV9hcnJheSA9IFtdO1xuICAgIH1cbiAgICBcbiAgICAvLyBTZXQgdGhlIG9wdGlvbnMgb24gdGhlIGNvbnRleHQgb2JqZWN0LiAgT25seSBzZXQgb3B0aW9ucyB0aGF0XG4gICAgLy8gaGF2ZSBjaGFuZ2VkIHNpbmNlIHRoZSBsYXN0IGNhbGwuXG4gICAgZm9yICh2YXIga2V5IGluIHNldF9vcHRpb25zKSB7XG4gICAgICAgIGlmIChzZXRfb3B0aW9ucy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5fbGFzdF9zZXRfb3B0aW9uc1trZXldICE9PSBzZXRfb3B0aW9uc1trZXldKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fbGFzdF9zZXRfb3B0aW9uc1trZXldID0gc2V0X29wdGlvbnNba2V5XTtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbnRleHRba2V5XSA9IHNldF9vcHRpb25zW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gb3B0aW9ucztcbn07XG5cbi8qKlxuICogVXBkYXRlIHRoZSB0aW1lc3RhbXAgdGhhdCB0aGUgY2FudmFzIHdhcyBtb2RpZmllZCBhbmRcbiAqIHRoZSByZWdpb24gdGhhdCBoYXMgY29udGVudHMgcmVuZGVyZWQgdG8gaXQuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DYW52YXMucHJvdG90eXBlLl90b3VjaCA9IGZ1bmN0aW9uKHgxLCB5MSwgeDIsIHkyKSB7XG4gICAgdGhpcy5fbW9kaWZpZWQgPSBEYXRlLm5vdygpO1xuXG4gICAgLy8gU2V0IHRoZSByZW5kZXIgcmVnaW9uLlxuICAgIHZhciBjb21wYXJpdG9yID0gZnVuY3Rpb24ob2xkX3ZhbHVlLCBuZXdfdmFsdWUsIGNvbXBhcmlzb24pIHtcbiAgICAgICAgaWYgKG9sZF92YWx1ZSA9PT0gbnVsbCB8fCBvbGRfdmFsdWUgPT09IHVuZGVmaW5lZCB8fCBuZXdfdmFsdWUgPT09IG51bGwgfHwgbmV3X3ZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXdfdmFsdWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gY29tcGFyaXNvbi5jYWxsKHVuZGVmaW5lZCwgb2xkX3ZhbHVlLCBuZXdfdmFsdWUpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB0aGlzLl9yZW5kZXJlZF9yZWdpb25bMF0gPSBjb21wYXJpdG9yKHRoaXMuX3JlbmRlcmVkX3JlZ2lvblswXSwgeDEsIE1hdGgubWluKTtcbiAgICB0aGlzLl9yZW5kZXJlZF9yZWdpb25bMV0gPSBjb21wYXJpdG9yKHRoaXMuX3JlbmRlcmVkX3JlZ2lvblsxXSwgeTEsIE1hdGgubWluKTtcbiAgICB0aGlzLl9yZW5kZXJlZF9yZWdpb25bMl0gPSBjb21wYXJpdG9yKHRoaXMuX3JlbmRlcmVkX3JlZ2lvblsyXSwgeDIsIE1hdGgubWF4KTtcbiAgICB0aGlzLl9yZW5kZXJlZF9yZWdpb25bM10gPSBjb21wYXJpdG9yKHRoaXMuX3JlbmRlcmVkX3JlZ2lvblszXSwgeTIsIE1hdGgubWF4KTtcbn07XG5cbi8qKlxuICogVHJhbnNmb3JtIGFuIHggdmFsdWUgYmVmb3JlIHJlbmRlcmluZy5cbiAqIEBwYXJhbSAge2Zsb2F0fSB4XG4gKiBAcGFyYW0gIHtib29sZWFufSBpbnZlcnNlIC0gcGVyZm9ybSBpbnZlcnNlIHRyYW5zZm9ybWF0aW9uXG4gKiBAcmV0dXJuIHtmbG9hdH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5fdHggPSBmdW5jdGlvbih4LCBpbnZlcnNlKSB7IHJldHVybiB4OyB9O1xuXG4vKipcbiAqIFRyYW5zZm9ybSBhIHkgdmFsdWUgYmVmb3JlIHJlbmRlcmluZy5cbiAqIEBwYXJhbSAge2Zsb2F0fSB5XG4gKiBAcGFyYW0gIHtib29sZWFufSBpbnZlcnNlIC0gcGVyZm9ybSBpbnZlcnNlIHRyYW5zZm9ybWF0aW9uXG4gKiBAcmV0dXJuIHtmbG9hdH1cbiAqL1xuQ2FudmFzLnByb3RvdHlwZS5fdHkgPSBmdW5jdGlvbih5LCBpbnZlcnNlKSB7IHJldHVybiB5OyB9O1xuXG4vKipcbiAqIENvbnZlcnQgdGFiIGNoYXJhY3RlcnMgdG8gdGhlIGNvbmZpZyBkZWZpbmVkIG51bWJlciBvZiBzcGFjZSBcbiAqIGNoYXJhY3RlcnMgZm9yIHJlbmRlcmluZy5cbiAqIEBwYXJhbSAge3N0cmluZ30gcyAtIGlucHV0IHN0cmluZ1xuICogQHJldHVybiB7c3RyaW5nfSBvdXRwdXQgc3RyaW5nXG4gKi9cbkNhbnZhcy5wcm90b3R5cGUuX3Byb2Nlc3NfdGFicyA9IGZ1bmN0aW9uKHMpIHtcbiAgICB2YXIgc3BhY2VfdGFiID0gJyc7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCAoY29uZmlnLnRhYl93aWR0aCB8fCAxKTsgaSsrKSB7XG4gICAgICAgIHNwYWNlX3RhYiArPSAnICc7XG4gICAgfVxuICAgIHJldHVybiBzLnJlcGxhY2UoL1xcdC9nLCBzcGFjZV90YWIpO1xufTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5DYW52YXMgPSBDYW52YXM7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG5cbi8qKlxuICogRXZlbnRmdWwgY2xpcGJvYXJkIHN1cHBvcnRcbiAqXG4gKiBXQVJOSU5HOiAgVGhpcyBjbGFzcyBpcyBhIGh1ZGdlIGtsdWRnZSB0aGF0IHdvcmtzIGFyb3VuZCB0aGUgcHJlaGlzdG9yaWNcbiAqIGNsaXBib2FyZCBzdXBwb3J0IChsYWNrIHRoZXJlb2YpIGluIG1vZGVybiB3ZWJyb3dzZXJzLiAgSXQgY3JlYXRlcyBhIGhpZGRlblxuICogdGV4dGJveCB3aGljaCBpcyBmb2N1c2VkLiAgVGhlIHByb2dyYW1tZXIgbXVzdCBjYWxsIGBzZXRfY2xpcHBhYmxlYCB0byBjaGFuZ2VcbiAqIHdoYXQgd2lsbCBiZSBjb3BpZWQgd2hlbiB0aGUgdXNlciBoaXRzIGtleXMgY29ycmVzcG9uZGluZyB0byBhIGNvcHkgXG4gKiBvcGVyYXRpb24uICBFdmVudHMgYGNvcHlgLCBgY3V0YCwgYW5kIGBwYXN0ZWAgYXJlIHJhaXNlZCBieSB0aGlzIGNsYXNzLlxuICovXG52YXIgQ2xpcGJvYXJkID0gZnVuY3Rpb24oZWwpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX2VsID0gZWw7XG5cbiAgICAvLyBDcmVhdGUgYSB0ZXh0Ym94IHRoYXQncyBoaWRkZW4uXG4gICAgdGhpcy5oaWRkZW5faW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZXh0YXJlYScpO1xuICAgIHRoaXMuaGlkZGVuX2lucHV0LnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAncG9zdGVyIGhpZGRlbi1jbGlwYm9hcmQnKTtcbiAgICBlbC5hcHBlbmRDaGlsZCh0aGlzLmhpZGRlbl9pbnB1dCk7XG5cbiAgICB0aGlzLl9iaW5kX2V2ZW50cygpO1xufTtcbnV0aWxzLmluaGVyaXQoQ2xpcGJvYXJkLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8qKlxuICogU2V0IHdoYXQgd2lsbCBiZSBjb3BpZWQgd2hlbiB0aGUgdXNlciBjb3BpZXMuXG4gKiBAcGFyYW0ge3N0cmluZ30gdGV4dFxuICovXG5DbGlwYm9hcmQucHJvdG90eXBlLnNldF9jbGlwcGFibGUgPSBmdW5jdGlvbih0ZXh0KSB7XG4gICAgdGhpcy5fY2xpcHBhYmxlID0gdGV4dDtcbiAgICB0aGlzLmhpZGRlbl9pbnB1dC52YWx1ZSA9IHRoaXMuX2NsaXBwYWJsZTtcbiAgICB0aGlzLl9mb2N1cygpO1xufTsgXG5cbi8qKlxuICogRm9jdXMgdGhlIGhpZGRlbiB0ZXh0IGFyZWEuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DbGlwYm9hcmQucHJvdG90eXBlLl9mb2N1cyA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuaGlkZGVuX2lucHV0LmZvY3VzKCk7XG4gICAgdGhpcy5oaWRkZW5faW5wdXQuc2VsZWN0KCk7XG59O1xuXG4vKipcbiAqIEhhbmRsZSB3aGVuIHRoZSB1c2VyIHBhc3RlcyBpbnRvIHRoZSB0ZXh0Ym94LlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ2xpcGJvYXJkLnByb3RvdHlwZS5faGFuZGxlX3Bhc3RlID0gZnVuY3Rpb24oZSkge1xuICAgIHZhciBwYXN0ZWQgPSBlLmNsaXBib2FyZERhdGEuZ2V0RGF0YShlLmNsaXBib2FyZERhdGEudHlwZXNbMF0pO1xuICAgIHV0aWxzLmNhbmNlbF9idWJibGUoZSk7XG4gICAgdGhpcy50cmlnZ2VyKCdwYXN0ZScsIHBhc3RlZCk7XG59O1xuXG4vKipcbiAqIEJpbmQgZXZlbnRzIG9mIHRoZSBoaWRkZW4gdGV4dGJveC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkNsaXBib2FyZC5wcm90b3R5cGUuX2JpbmRfZXZlbnRzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuXG4gICAgLy8gTGlzdGVuIHRvIGVsJ3MgZm9jdXMgZXZlbnQuICBJZiBlbCBpcyBmb2N1c2VkLCBmb2N1cyB0aGUgaGlkZGVuIGlucHV0XG4gICAgLy8gaW5zdGVhZC5cbiAgICB1dGlscy5ob29rKHRoaXMuX2VsLCAnb25mb2N1cycsIHV0aWxzLnByb3h5KHRoaXMuX2ZvY3VzLCB0aGlzKSk7XG5cbiAgICB1dGlscy5ob29rKHRoaXMuaGlkZGVuX2lucHV0LCAnb25wYXN0ZScsIHV0aWxzLnByb3h5KHRoaXMuX2hhbmRsZV9wYXN0ZSwgdGhpcykpO1xuICAgIHV0aWxzLmhvb2sodGhpcy5oaWRkZW5faW5wdXQsICdvbmN1dCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgLy8gVHJpZ2dlciB0aGUgZXZlbnQgaW4gYSB0aW1lb3V0IHNvIGl0IGZpcmVzIGFmdGVyIHRoZSBzeXN0ZW0gZXZlbnQuXG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHRoYXQudHJpZ2dlcignY3V0JywgdGhhdC5fY2xpcHBhYmxlKTtcbiAgICAgICAgfSwgMCk7XG4gICAgfSk7XG4gICAgdXRpbHMuaG9vayh0aGlzLmhpZGRlbl9pbnB1dCwgJ29uY29weScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgdGhhdC50cmlnZ2VyKCdjb3B5JywgdGhhdC5fY2xpcHBhYmxlKTtcbiAgICB9KTtcbiAgICB1dGlscy5ob29rKHRoaXMuaGlkZGVuX2lucHV0LCAnb25rZXlwcmVzcycsIGZ1bmN0aW9uKCkge1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhhdC5oaWRkZW5faW5wdXQudmFsdWUgPSB0aGF0Ll9jbGlwcGFibGU7XG4gICAgICAgICAgICB0aGF0Ll9mb2N1cygpO1xuICAgICAgICB9LCAwKTtcbiAgICB9KTtcbiAgICB1dGlscy5ob29rKHRoaXMuaGlkZGVuX2lucHV0LCAnb25rZXl1cCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhhdC5oaWRkZW5faW5wdXQudmFsdWUgPSB0aGF0Ll9jbGlwcGFibGU7XG4gICAgICAgICAgICB0aGF0Ll9mb2N1cygpO1xuICAgICAgICB9LCAwKTtcbiAgICB9KTtcbn07XG5cbmV4cG9ydHMuQ2xpcGJvYXJkID0gQ2xpcGJvYXJkO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xudmFyIGNvbmZpZyA9IG5ldyB1dGlscy5Qb3N0ZXJDbGFzcyhbXG4gICAgJ2hpZ2hsaWdodF9kcmF3JywgLy8gYm9vbGVhbiAtIFdoZXRoZXIgb3Igbm90IHRvIGhpZ2hsaWdodCByZS1yZW5kZXJzXG4gICAgJ25ld2xpbmVfd2lkdGgnLCAvLyBpbnRlZ2VyIC0gV2lkdGggb2YgbmV3bGluZSBjaGFyYWN0ZXJzXG4gICAgJ3RhYl93aWR0aCcsIC8vIGludGVnZXIgLSBUYWIgY2hhcmFjdGVyIHdpZHRoIG1lYXN1cmVkIGluIHNwYWNlIGNoYXJhY3RlcnNcbiAgICAndXNlX3NwYWNlcycsIC8vIGJvb2xlYW4gLSBVc2Ugc3BhY2VzIGZvciBpbmRlbnRzIGluc3RlYWQgb2YgdGFic1xuXSk7XG5cbi8vIFNldCBkZWZhdWx0c1xuY29uZmlnLnRhYl93aWR0aCA9IDQ7XG5jb25maWcudXNlX3NwYWNlcyA9IHRydWU7XG5cbmV4cG9ydHMuY29uZmlnID0gY29uZmlnO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cbnZhciBrZXltYXAgPSByZXF1aXJlKCcuL2V2ZW50cy9tYXAuanMnKTtcbnZhciByZWdpc3RlciA9IGtleW1hcC5NYXAucmVnaXN0ZXI7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcbnZhciBjb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZy5qcycpO1xuY29uZmlnID0gY29uZmlnLmNvbmZpZztcblxuLyoqXG4gKiBJbnB1dCBjdXJzb3IuXG4gKi9cbnZhciBDdXJzb3IgPSBmdW5jdGlvbihtb2RlbCkge1xuICAgIHV0aWxzLlBvc3RlckNsYXNzLmNhbGwodGhpcyk7XG4gICAgdGhpcy5fbW9kZWwgPSBtb2RlbDtcblxuICAgIHRoaXMucHJpbWFyeV9yb3cgPSBudWxsO1xuICAgIHRoaXMucHJpbWFyeV9jaGFyID0gbnVsbDtcbiAgICB0aGlzLnNlY29uZGFyeV9yb3cgPSBudWxsO1xuICAgIHRoaXMuc2Vjb25kYXJ5X2NoYXIgPSBudWxsO1xuXG4gICAgdGhpcy5faW5pdF9wcm9wZXJ0aWVzKCk7XG4gICAgdGhpcy5fcmVnaXN0ZXJfYXBpKCk7XG59O1xudXRpbHMuaW5oZXJpdChDdXJzb3IsIHV0aWxzLlBvc3RlckNsYXNzKTtcblxuLyoqXG4gKiBNb3ZlcyB0aGUgcHJpbWFyeSBjdXJzb3IgYSBnaXZlbiBvZmZzZXQuXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSB4XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSB5XG4gKiBAcGFyYW0gIHtib29sZWFufSAob3B0aW9uYWwpIGhvcD1mYWxzZSAtIGhvcCB0byB0aGUgb3RoZXIgc2lkZSBvZiB0aGVcbiAqICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkIHJlZ2lvbiBpZiB0aGUgcHJpbWFyeSBpcyBvbiB0aGUgb3Bwb3NpdGUgb2YgdGhlXG4gKiAgICAgICAgICAgICAgICAgICBkaXJlY3Rpb24gb2YgbW90aW9uLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5tb3ZlX3ByaW1hcnkgPSBmdW5jdGlvbih4LCB5LCBob3ApIHtcbiAgICBpZiAoaG9wKSB7XG4gICAgICAgIGlmICh0aGlzLnByaW1hcnlfcm93ICE9IHRoaXMuc2Vjb25kYXJ5X3JvdyB8fCB0aGlzLnByaW1hcnlfY2hhciAhPSB0aGlzLnNlY29uZGFyeV9jaGFyKSB7XG4gICAgICAgICAgICB2YXIgc3RhcnRfcm93ID0gdGhpcy5zdGFydF9yb3c7XG4gICAgICAgICAgICB2YXIgc3RhcnRfY2hhciA9IHRoaXMuc3RhcnRfY2hhcjtcbiAgICAgICAgICAgIHZhciBlbmRfcm93ID0gdGhpcy5lbmRfcm93O1xuICAgICAgICAgICAgdmFyIGVuZF9jaGFyID0gdGhpcy5lbmRfY2hhcjtcbiAgICAgICAgICAgIGlmICh4PDAgfHwgeTwwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wcmltYXJ5X3JvdyA9IHN0YXJ0X3JvdztcbiAgICAgICAgICAgICAgICB0aGlzLnByaW1hcnlfY2hhciA9IHN0YXJ0X2NoYXI7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWNvbmRhcnlfcm93ID0gZW5kX3JvdztcbiAgICAgICAgICAgICAgICB0aGlzLnNlY29uZGFyeV9jaGFyID0gZW5kX2NoYXI7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMucHJpbWFyeV9yb3cgPSBlbmRfcm93O1xuICAgICAgICAgICAgICAgIHRoaXMucHJpbWFyeV9jaGFyID0gZW5kX2NoYXI7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWNvbmRhcnlfcm93ID0gc3RhcnRfcm93O1xuICAgICAgICAgICAgICAgIHRoaXMuc2Vjb25kYXJ5X2NoYXIgPSBzdGFydF9jaGFyO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHggPCAwKSB7XG4gICAgICAgIGlmICh0aGlzLnByaW1hcnlfY2hhciArIHggPCAwKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5wcmltYXJ5X3JvdyA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMucHJpbWFyeV9jaGFyID0gMDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wcmltYXJ5X3JvdyAtPSAxO1xuICAgICAgICAgICAgICAgIHRoaXMucHJpbWFyeV9jaGFyID0gdGhpcy5fbW9kZWwuX3Jvd3NbdGhpcy5wcmltYXJ5X3Jvd10ubGVuZ3RoO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgKz0geDtcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoeCA+IDApIHtcbiAgICAgICAgaWYgKHRoaXMucHJpbWFyeV9jaGFyICsgeCA+IHRoaXMuX21vZGVsLl9yb3dzW3RoaXMucHJpbWFyeV9yb3ddLmxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKHRoaXMucHJpbWFyeV9yb3cgPT09IHRoaXMuX21vZGVsLl9yb3dzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnByaW1hcnlfY2hhciA9IHRoaXMuX21vZGVsLl9yb3dzW3RoaXMucHJpbWFyeV9yb3ddLmxlbmd0aDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wcmltYXJ5X3JvdyArPSAxO1xuICAgICAgICAgICAgICAgIHRoaXMucHJpbWFyeV9jaGFyID0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMucHJpbWFyeV9jaGFyICs9IHg7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBSZW1lbWJlciB0aGUgY2hhcmFjdGVyIHBvc2l0aW9uLCB2ZXJ0aWNhbCBuYXZpZ2F0aW9uIGFjcm9zcyBlbXB0eSBsaW5lc1xuICAgIC8vIHNob3VsZG4ndCBjYXVzZSB0aGUgaG9yaXpvbnRhbCBwb3NpdGlvbiB0byBiZSBsb3N0LlxuICAgIGlmICh4ICE9PSAwKSB7XG4gICAgICAgIHRoaXMuX21lbW9yeV9jaGFyID0gdGhpcy5wcmltYXJ5X2NoYXI7XG4gICAgfVxuXG4gICAgaWYgKHkgIT09IDApIHtcbiAgICAgICAgdGhpcy5wcmltYXJ5X3JvdyArPSB5O1xuICAgICAgICB0aGlzLnByaW1hcnlfcm93ID0gTWF0aC5taW4oTWF0aC5tYXgodGhpcy5wcmltYXJ5X3JvdywgMCksIHRoaXMuX21vZGVsLl9yb3dzLmxlbmd0aC0xKTtcbiAgICAgICAgaWYgKHRoaXMuX21lbW9yeV9jaGFyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRoaXMucHJpbWFyeV9jaGFyID0gdGhpcy5fbWVtb3J5X2NoYXI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMucHJpbWFyeV9jaGFyID4gdGhpcy5fbW9kZWwuX3Jvd3NbdGhpcy5wcmltYXJ5X3Jvd10ubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLnByaW1hcnlfY2hhciA9IHRoaXMuX21vZGVsLl9yb3dzW3RoaXMucHJpbWFyeV9yb3ddLmxlbmd0aDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxufTtcblxuLyoqXG4gKiBXYWxrIHRoZSBwcmltYXJ5IGN1cnNvciBpbiBhIGRpcmVjdGlvbiB1bnRpbCBhIG5vdC10ZXh0IGNoYXJhY3RlciBpcyBmb3VuZC5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IGRpcmVjdGlvblxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS53b3JkX3ByaW1hcnkgPSBmdW5jdGlvbihkaXJlY3Rpb24pIHtcbiAgICAvLyBNYWtlIHN1cmUgZGlyZWN0aW9uIGlzIDEgb3IgLTEuXG4gICAgZGlyZWN0aW9uID0gZGlyZWN0aW9uIDwgMCA/IC0xIDogMTtcblxuICAgIC8vIElmIG1vdmluZyBsZWZ0IGFuZCBhdCBlbmQgb2Ygcm93LCBtb3ZlIHVwIGEgcm93IGlmIHBvc3NpYmxlLlxuICAgIGlmICh0aGlzLnByaW1hcnlfY2hhciA9PT0gMCAmJiBkaXJlY3Rpb24gPT0gLTEpIHtcbiAgICAgICAgaWYgKHRoaXMucHJpbWFyeV9yb3cgIT09IDApIHtcbiAgICAgICAgICAgIHRoaXMucHJpbWFyeV9yb3ctLTtcbiAgICAgICAgICAgIHRoaXMucHJpbWFyeV9jaGFyID0gdGhpcy5fbW9kZWwuX3Jvd3NbdGhpcy5wcmltYXJ5X3Jvd10ubGVuZ3RoO1xuICAgICAgICAgICAgdGhpcy5fbWVtb3J5X2NoYXIgPSB0aGlzLnByaW1hcnlfY2hhcjtcbiAgICAgICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBJZiBtb3ZpbmcgcmlnaHQgYW5kIGF0IGVuZCBvZiByb3csIG1vdmUgZG93biBhIHJvdyBpZiBwb3NzaWJsZS5cbiAgICBpZiAodGhpcy5wcmltYXJ5X2NoYXIgPj0gdGhpcy5fbW9kZWwuX3Jvd3NbdGhpcy5wcmltYXJ5X3Jvd10ubGVuZ3RoICYmIGRpcmVjdGlvbiA9PSAxKSB7XG4gICAgICAgIGlmICh0aGlzLnByaW1hcnlfcm93IDwgdGhpcy5fbW9kZWwuX3Jvd3MubGVuZ3RoLTEpIHtcbiAgICAgICAgICAgIHRoaXMucHJpbWFyeV9yb3crKztcbiAgICAgICAgICAgIHRoaXMucHJpbWFyeV9jaGFyID0gMDtcbiAgICAgICAgICAgIHRoaXMuX21lbW9yeV9jaGFyID0gdGhpcy5wcmltYXJ5X2NoYXI7XG4gICAgICAgICAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZScpOyBcbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGkgPSB0aGlzLnByaW1hcnlfY2hhcjtcbiAgICB2YXIgaGl0X3RleHQgPSBmYWxzZTtcbiAgICB2YXIgcm93X3RleHQgPSB0aGlzLl9tb2RlbC5fcm93c1t0aGlzLnByaW1hcnlfcm93XTtcbiAgICBpZiAoZGlyZWN0aW9uID09IC0xKSB7XG4gICAgICAgIHdoaWxlICgwIDwgaSAmJiAhKGhpdF90ZXh0ICYmIHV0aWxzLm5vdF90ZXh0KHJvd190ZXh0W2ktMV0pKSkge1xuICAgICAgICAgICAgaGl0X3RleHQgPSBoaXRfdGV4dCB8fCAhdXRpbHMubm90X3RleHQocm93X3RleHRbaS0xXSk7XG4gICAgICAgICAgICBpICs9IGRpcmVjdGlvbjtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHdoaWxlIChpIDwgcm93X3RleHQubGVuZ3RoICYmICEoaGl0X3RleHQgJiYgdXRpbHMubm90X3RleHQocm93X3RleHRbaV0pKSkge1xuICAgICAgICAgICAgaGl0X3RleHQgPSBoaXRfdGV4dCB8fCAhdXRpbHMubm90X3RleHQocm93X3RleHRbaV0pO1xuICAgICAgICAgICAgaSArPSBkaXJlY3Rpb247XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnByaW1hcnlfY2hhciA9IGk7XG4gICAgdGhpcy5fbWVtb3J5X2NoYXIgPSB0aGlzLnByaW1hcnlfY2hhcjtcbiAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZScpOyBcbn07XG5cbi8qKlxuICogU2VsZWN0IGFsbCBvZiB0aGUgdGV4dC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuc2VsZWN0X2FsbCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucHJpbWFyeV9yb3cgPSB0aGlzLl9tb2RlbC5fcm93cy5sZW5ndGgtMTtcbiAgICB0aGlzLnByaW1hcnlfY2hhciA9IHRoaXMuX21vZGVsLl9yb3dzW3RoaXMucHJpbWFyeV9yb3ddLmxlbmd0aDtcbiAgICB0aGlzLnNlY29uZGFyeV9yb3cgPSAwO1xuICAgIHRoaXMuc2Vjb25kYXJ5X2NoYXIgPSAwO1xuICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxufTtcblxuLyoqXG4gKiBNb3ZlIHRoZSBwcmltYXJ5IGN1cnNvciB0byB0aGUgbGluZSBlbmQuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3IucHJvdG90eXBlLnByaW1hcnlfZ290b19lbmQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnByaW1hcnlfY2hhciA9IHRoaXMuX21vZGVsLl9yb3dzW3RoaXMucHJpbWFyeV9yb3ddLmxlbmd0aDtcbiAgICB0aGlzLl9tZW1vcnlfY2hhciA9IHRoaXMucHJpbWFyeV9jaGFyO1xuICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxufTtcblxuLyoqXG4gKiBNb3ZlIHRoZSBwcmltYXJ5IGN1cnNvciB0byB0aGUgbGluZSBzdGFydC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUucHJpbWFyeV9nb3RvX3N0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5wcmltYXJ5X2NoYXIgPSAwO1xuICAgIHRoaXMuX21lbW9yeV9jaGFyID0gdGhpcy5wcmltYXJ5X2NoYXI7XG4gICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnKTsgXG59O1xuXG4vKipcbiAqIFNlbGVjdHMgYSB3b3JkIGF0IHRoZSBnaXZlbiBsb2NhdGlvbi5cbiAqIEBwYXJhbSB7aW50ZWdlcn0gcm93X2luZGV4XG4gKiBAcGFyYW0ge2ludGVnZXJ9IGNoYXJfaW5kZXhcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5zZWxlY3Rfd29yZCA9IGZ1bmN0aW9uKHJvd19pbmRleCwgY2hhcl9pbmRleCkge1xuICAgIHRoaXMuc2V0X2JvdGgocm93X2luZGV4LCBjaGFyX2luZGV4KTtcbiAgICB0aGlzLndvcmRfcHJpbWFyeSgtMSk7XG4gICAgdGhpcy5fcmVzZXRfc2Vjb25kYXJ5KCk7XG4gICAgdGhpcy53b3JkX3ByaW1hcnkoMSk7XG59O1xuXG4vKipcbiAqIFNldCB0aGUgcHJpbWFyeSBjdXJzb3IgcG9zaXRpb25cbiAqIEBwYXJhbSB7aW50ZWdlcn0gcm93X2luZGV4XG4gKiBAcGFyYW0ge2ludGVnZXJ9IGNoYXJfaW5kZXhcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5zZXRfcHJpbWFyeSA9IGZ1bmN0aW9uKHJvd19pbmRleCwgY2hhcl9pbmRleCkge1xuICAgIHRoaXMucHJpbWFyeV9yb3cgPSByb3dfaW5kZXg7XG4gICAgdGhpcy5wcmltYXJ5X2NoYXIgPSBjaGFyX2luZGV4O1xuXG4gICAgLy8gUmVtZW1iZXIgdGhlIGNoYXJhY3RlciBwb3NpdGlvbiwgdmVydGljYWwgbmF2aWdhdGlvbiBhY3Jvc3MgZW1wdHkgbGluZXNcbiAgICAvLyBzaG91bGRuJ3QgY2F1c2UgdGhlIGhvcml6b250YWwgcG9zaXRpb24gdG8gYmUgbG9zdC5cbiAgICB0aGlzLl9tZW1vcnlfY2hhciA9IHRoaXMucHJpbWFyeV9jaGFyO1xuXG4gICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnKTsgXG59O1xuXG4vKipcbiAqIFNldCB0aGUgc2Vjb25kYXJ5IGN1cnNvciBwb3NpdGlvblxuICogQHBhcmFtIHtpbnRlZ2VyfSByb3dfaW5kZXhcbiAqIEBwYXJhbSB7aW50ZWdlcn0gY2hhcl9pbmRleFxuICovXG5DdXJzb3IucHJvdG90eXBlLnNldF9zZWNvbmRhcnkgPSBmdW5jdGlvbihyb3dfaW5kZXgsIGNoYXJfaW5kZXgpIHtcbiAgICB0aGlzLnNlY29uZGFyeV9yb3cgPSByb3dfaW5kZXg7XG4gICAgdGhpcy5zZWNvbmRhcnlfY2hhciA9IGNoYXJfaW5kZXg7XG4gICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnKTsgXG59O1xuXG4vKipcbiAqIFNldHMgYm90aCB0aGUgcHJpbWFyeSBhbmQgc2Vjb25kYXJ5IGN1cnNvciBwb3NpdGlvbnNcbiAqIEBwYXJhbSB7aW50ZWdlcn0gcm93X2luZGV4XG4gKiBAcGFyYW0ge2ludGVnZXJ9IGNoYXJfaW5kZXhcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5zZXRfYm90aCA9IGZ1bmN0aW9uKHJvd19pbmRleCwgY2hhcl9pbmRleCkge1xuICAgIHRoaXMucHJpbWFyeV9yb3cgPSByb3dfaW5kZXg7XG4gICAgdGhpcy5wcmltYXJ5X2NoYXIgPSBjaGFyX2luZGV4O1xuICAgIHRoaXMuc2Vjb25kYXJ5X3JvdyA9IHJvd19pbmRleDtcbiAgICB0aGlzLnNlY29uZGFyeV9jaGFyID0gY2hhcl9pbmRleDtcblxuICAgIC8vIFJlbWVtYmVyIHRoZSBjaGFyYWN0ZXIgcG9zaXRpb24sIHZlcnRpY2FsIG5hdmlnYXRpb24gYWNyb3NzIGVtcHR5IGxpbmVzXG4gICAgLy8gc2hvdWxkbid0IGNhdXNlIHRoZSBob3Jpem9udGFsIHBvc2l0aW9uIHRvIGJlIGxvc3QuXG4gICAgdGhpcy5fbWVtb3J5X2NoYXIgPSB0aGlzLnByaW1hcnlfY2hhcjtcblxuICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxufTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gYSBrZXkgaXMgcHJlc3NlZC5cbiAqIEBwYXJhbSAge0V2ZW50fSBlIC0gb3JpZ2luYWwga2V5IHByZXNzIGV2ZW50LlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5rZXlwcmVzcyA9IGZ1bmN0aW9uKGUpIHtcbiAgICB2YXIgY2hhcl9jb2RlID0gZS53aGljaCB8fCBlLmtleUNvZGU7XG4gICAgdmFyIGNoYXJfdHlwZWQgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGNoYXJfY29kZSk7XG4gICAgdGhpcy5yZW1vdmVfc2VsZWN0ZWQoKTtcbiAgICB0aGlzLl9tb2RlbC5hZGRfdGV4dCh0aGlzLnByaW1hcnlfcm93LCB0aGlzLnByaW1hcnlfY2hhciwgY2hhcl90eXBlZCk7XG4gICAgdGhpcy5tb3ZlX3ByaW1hcnkoMSwgMCk7XG4gICAgdGhpcy5fcmVzZXRfc2Vjb25kYXJ5KCk7XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIEluZGVudFxuICogQHBhcmFtICB7RXZlbnR9IGUgLSBvcmlnaW5hbCBrZXkgcHJlc3MgZXZlbnQuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3IucHJvdG90eXBlLmluZGVudCA9IGZ1bmN0aW9uKGUpIHtcbiAgICB2YXIgaW5kZW50ID0gdGhpcy5fbWFrZV9pbmRlbnRzKClbMF07XG4gICAgaWYgKHRoaXMucHJpbWFyeV9yb3cgPT0gdGhpcy5zZWNvbmRhcnlfcm93ICYmIHRoaXMucHJpbWFyeV9jaGFyID09IHRoaXMuc2Vjb25kYXJ5X2NoYXIpIHtcbiAgICAgICAgdGhpcy5fbW9kZWwuYWRkX3RleHQodGhpcy5wcmltYXJ5X3JvdywgdGhpcy5wcmltYXJ5X2NoYXIsIGluZGVudCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZm9yICh2YXIgcm93ID0gdGhpcy5zdGFydF9yb3c7IHJvdyA8PSB0aGlzLmVuZF9yb3c7IHJvdysrKSB7XG4gICAgICAgICAgICB0aGlzLl9tb2RlbC5hZGRfdGV4dChyb3csIDAsIGluZGVudCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnByaW1hcnlfY2hhciArPSBpbmRlbnQubGVuZ3RoO1xuICAgIHRoaXMuX21lbW9yeV9jaGFyID0gdGhpcy5wcmltYXJ5X2NoYXI7XG4gICAgdGhpcy5zZWNvbmRhcnlfY2hhciArPSBpbmRlbnQubGVuZ3RoO1xuICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIFVuaW5kZW50XG4gKiBAcGFyYW0gIHtFdmVudH0gZSAtIG9yaWdpbmFsIGtleSBwcmVzcyBldmVudC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUudW5pbmRlbnQgPSBmdW5jdGlvbihlKSB7XG4gICAgdmFyIGluZGVudHMgPSB0aGlzLl9tYWtlX2luZGVudHMoKTtcbiAgICB2YXIgcmVtb3ZlZF9zdGFydCA9IDA7XG4gICAgdmFyIHJlbW92ZWRfZW5kID0gMDtcblxuICAgIC8vIElmIG5vIHRleHQgaXMgc2VsZWN0ZWQsIHJlbW92ZSB0aGUgaW5kZW50IHByZWNlZGluZyB0aGVcbiAgICAvLyBjdXJzb3IgaWYgaXQgZXhpc3RzLlxuICAgIGlmICh0aGlzLnByaW1hcnlfcm93ID09IHRoaXMuc2Vjb25kYXJ5X3JvdyAmJiB0aGlzLnByaW1hcnlfY2hhciA9PSB0aGlzLnNlY29uZGFyeV9jaGFyKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaW5kZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGluZGVudCA9IGluZGVudHNbaV07XG4gICAgICAgICAgICBpZiAodGhpcy5wcmltYXJ5X2NoYXIgPj0gaW5kZW50Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHZhciBiZWZvcmUgPSB0aGlzLl9tb2RlbC5nZXRfdGV4dCh0aGlzLnByaW1hcnlfcm93LCB0aGlzLnByaW1hcnlfY2hhci1pbmRlbnQubGVuZ3RoLCB0aGlzLnByaW1hcnlfcm93LCB0aGlzLnByaW1hcnlfY2hhcik7XG4gICAgICAgICAgICAgICAgaWYgKGJlZm9yZSA9PSBpbmRlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fbW9kZWwucmVtb3ZlX3RleHQodGhpcy5wcmltYXJ5X3JvdywgdGhpcy5wcmltYXJ5X2NoYXItaW5kZW50Lmxlbmd0aCwgdGhpcy5wcmltYXJ5X3JvdywgdGhpcy5wcmltYXJ5X2NoYXIpO1xuICAgICAgICAgICAgICAgICAgICByZW1vdmVkX3N0YXJ0ID0gaW5kZW50Lmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgcmVtb3ZlZF9lbmQgPSBpbmRlbnQubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgIC8vIFRleHQgaXMgc2VsZWN0ZWQuICBSZW1vdmUgdGhlIGFuIGluZGVudCBmcm9tIHRoZSBiZWdpbmluZ1xuICAgIC8vIG9mIGVhY2ggcm93IGlmIGl0IGV4aXN0cy5cbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKHZhciByb3cgPSB0aGlzLnN0YXJ0X3Jvdzsgcm93IDw9IHRoaXMuZW5kX3Jvdzsgcm93KyspIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaW5kZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBpbmRlbnQgPSBpbmRlbnRzW2ldO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9tb2RlbC5fcm93c1tyb3ddLmxlbmd0aCA+PSBpbmRlbnQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLl9tb2RlbC5fcm93c1tyb3ddLnN1YnN0cmluZygwLCBpbmRlbnQubGVuZ3RoKSA9PSBpbmRlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX21vZGVsLnJlbW92ZV90ZXh0KHJvdywgMCwgcm93LCBpbmRlbnQubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyb3cgPT0gdGhpcy5zdGFydF9yb3cpIHJlbW92ZWRfc3RhcnQgPSBpbmRlbnQubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJvdyA9PSB0aGlzLmVuZF9yb3cpIHJlbW92ZWRfZW5kID0gaW5kZW50Lmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvLyBNb3ZlIHRoZSBzZWxlY3RlZCBjaGFyYWN0ZXJzIGJhY2t3YXJkcyBpZiBpbmRlbnRzIHdlcmUgcmVtb3ZlZC5cbiAgICB2YXIgc3RhcnRfaXNfcHJpbWFyeSA9ICh0aGlzLnByaW1hcnlfcm93ID09IHRoaXMuc3RhcnRfcm93ICYmIHRoaXMucHJpbWFyeV9jaGFyID09IHRoaXMuc3RhcnRfY2hhcik7XG4gICAgaWYgKHN0YXJ0X2lzX3ByaW1hcnkpIHtcbiAgICAgICAgdGhpcy5wcmltYXJ5X2NoYXIgLT0gcmVtb3ZlZF9zdGFydDtcbiAgICAgICAgdGhpcy5zZWNvbmRhcnlfY2hhciAtPSByZW1vdmVkX2VuZDtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnByaW1hcnlfY2hhciAtPSByZW1vdmVkX2VuZDtcbiAgICAgICAgdGhpcy5zZWNvbmRhcnlfY2hhciAtPSByZW1vdmVkX3N0YXJ0O1xuICAgIH1cbiAgICB0aGlzLl9tZW1vcnlfY2hhciA9IHRoaXMucHJpbWFyeV9jaGFyO1xuICAgIGlmIChyZW1vdmVkX2VuZCB8fCByZW1vdmVkX3N0YXJ0KSB0aGlzLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBJbnNlcnQgYSBuZXdsaW5lXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3IucHJvdG90eXBlLm5ld2xpbmUgPSBmdW5jdGlvbihlKSB7XG4gICAgdGhpcy5yZW1vdmVfc2VsZWN0ZWQoKTtcblxuICAgIC8vIEdldCB0aGUgYmxhbmsgc3BhY2UgYXQgdGhlIGJlZ2luaW5nIG9mIHRoZSBsaW5lLlxuICAgIHZhciBsaW5lX3RleHQgPSB0aGlzLl9tb2RlbC5nZXRfdGV4dCh0aGlzLnByaW1hcnlfcm93LCAwLCB0aGlzLnByaW1hcnlfcm93LCB0aGlzLnByaW1hcnlfY2hhcik7XG4gICAgdmFyIHNwYWNlbGVzcyA9IGxpbmVfdGV4dC50cmltKCk7XG4gICAgdmFyIGxlZnQgPSBsaW5lX3RleHQubGVuZ3RoO1xuICAgIGlmIChzcGFjZWxlc3MubGVuZ3RoID4gMCkge1xuICAgICAgICBsZWZ0ID0gbGluZV90ZXh0LmluZGV4T2Yoc3BhY2VsZXNzKTtcbiAgICB9XG4gICAgdmFyIGluZGVudCA9IGxpbmVfdGV4dC5zdWJzdHJpbmcoMCwgbGVmdCk7XG5cbiAgICB0aGlzLl9tb2RlbC5hZGRfdGV4dCh0aGlzLnByaW1hcnlfcm93LCB0aGlzLnByaW1hcnlfY2hhciwgJ1xcbicgKyBpbmRlbnQpO1xuICAgIHRoaXMucHJpbWFyeV9yb3cgKz0gMTtcbiAgICB0aGlzLnByaW1hcnlfY2hhciA9IGluZGVudC5sZW5ndGg7XG4gICAgdGhpcy5fbWVtb3J5X2NoYXIgPSB0aGlzLnByaW1hcnlfY2hhcjtcbiAgICB0aGlzLl9yZXNldF9zZWNvbmRhcnkoKTtcbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogSW5zZXJ0IHRleHRcbiAqIEBwYXJhbSAge3N0cmluZ30gdGV4dFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5pbnNlcnRfdGV4dCA9IGZ1bmN0aW9uKHRleHQpIHtcbiAgICB0aGlzLnJlbW92ZV9zZWxlY3RlZCgpO1xuICAgIHRoaXMuX21vZGVsLmFkZF90ZXh0KHRoaXMucHJpbWFyeV9yb3csIHRoaXMucHJpbWFyeV9jaGFyLCB0ZXh0KTtcbiAgICBcbiAgICAvLyBNb3ZlIGN1cnNvciB0byB0aGUgZW5kLlxuICAgIGlmICh0ZXh0LmluZGV4T2YoJ1xcbicpPT0tMSkge1xuICAgICAgICB0aGlzLnByaW1hcnlfY2hhciA9IHRoaXMuc3RhcnRfY2hhciArIHRleHQubGVuZ3RoO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBsaW5lcyA9IHRleHQuc3BsaXQoJ1xcbicpO1xuICAgICAgICB0aGlzLnByaW1hcnlfcm93ICs9IGxpbmVzLmxlbmd0aCAtIDE7XG4gICAgICAgIHRoaXMucHJpbWFyeV9jaGFyID0gbGluZXNbbGluZXMubGVuZ3RoLTFdLmxlbmd0aDtcbiAgICB9XG4gICAgdGhpcy5fcmVzZXRfc2Vjb25kYXJ5KCk7XG5cbiAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZScpOyBcbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogUGFzdGUgdGV4dFxuICogQHBhcmFtICB7c3RyaW5nfSB0ZXh0XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3IucHJvdG90eXBlLnBhc3RlID0gZnVuY3Rpb24odGV4dCkge1xuICAgIGlmICh0aGlzLl9jb3BpZWRfcm93ID09PSB0ZXh0KSB7XG4gICAgICAgIHRoaXMuX21vZGVsLmFkZF9yb3codGhpcy5wcmltYXJ5X3JvdywgdGV4dCk7XG4gICAgICAgIHRoaXMucHJpbWFyeV9yb3crKztcbiAgICAgICAgdGhpcy5zZWNvbmRhcnlfcm93Kys7XG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuaW5zZXJ0X3RleHQodGV4dCk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBSZW1vdmUgdGhlIHNlbGVjdGVkIHRleHRcbiAqIEByZXR1cm4ge2Jvb2xlYW59IHRydWUgaWYgdGV4dCB3YXMgcmVtb3ZlZC5cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5yZW1vdmVfc2VsZWN0ZWQgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5wcmltYXJ5X3JvdyAhPT0gdGhpcy5zZWNvbmRhcnlfcm93IHx8IHRoaXMucHJpbWFyeV9jaGFyICE9PSB0aGlzLnNlY29uZGFyeV9jaGFyKSB7XG4gICAgICAgIHZhciByb3dfaW5kZXggPSB0aGlzLnN0YXJ0X3JvdztcbiAgICAgICAgdmFyIGNoYXJfaW5kZXggPSB0aGlzLnN0YXJ0X2NoYXI7XG4gICAgICAgIHRoaXMuX21vZGVsLnJlbW92ZV90ZXh0KHRoaXMuc3RhcnRfcm93LCB0aGlzLnN0YXJ0X2NoYXIsIHRoaXMuZW5kX3JvdywgdGhpcy5lbmRfY2hhcik7XG4gICAgICAgIHRoaXMucHJpbWFyeV9yb3cgPSByb3dfaW5kZXg7XG4gICAgICAgIHRoaXMucHJpbWFyeV9jaGFyID0gY2hhcl9pbmRleDtcbiAgICAgICAgdGhpcy5fcmVzZXRfc2Vjb25kYXJ5KCk7XG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlJyk7IFxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBHZXRzIHRoZSBzZWxlY3RlZCB0ZXh0LlxuICogQHJldHVybiB7c3RyaW5nfSBzZWxlY3RlZCB0ZXh0XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMucHJpbWFyeV9yb3cgPT0gdGhpcy5zZWNvbmRhcnlfcm93ICYmIHRoaXMucHJpbWFyeV9jaGFyID09IHRoaXMuc2Vjb25kYXJ5X2NoYXIpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX21vZGVsLl9yb3dzW3RoaXMucHJpbWFyeV9yb3ddO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9tb2RlbC5nZXRfdGV4dCh0aGlzLnN0YXJ0X3JvdywgdGhpcy5zdGFydF9jaGFyLCB0aGlzLmVuZF9yb3csIHRoaXMuZW5kX2NoYXIpO1xuICAgIH1cbn07XG5cbi8qKlxuICogQ3V0cyB0aGUgc2VsZWN0ZWQgdGV4dC5cbiAqIEByZXR1cm4ge3N0cmluZ30gc2VsZWN0ZWQgdGV4dFxuICovXG5DdXJzb3IucHJvdG90eXBlLmN1dCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0ZXh0ID0gdGhpcy5nZXQoKTtcbiAgICBpZiAodGhpcy5wcmltYXJ5X3JvdyA9PSB0aGlzLnNlY29uZGFyeV9yb3cgJiYgdGhpcy5wcmltYXJ5X2NoYXIgPT0gdGhpcy5zZWNvbmRhcnlfY2hhcikge1xuICAgICAgICB0aGlzLl9jb3BpZWRfcm93ID0gdGhpcy5fbW9kZWwuX3Jvd3NbdGhpcy5wcmltYXJ5X3Jvd107XG4gICAgICAgIHRoaXMuX21vZGVsLnJlbW92ZV9yb3codGhpcy5wcmltYXJ5X3Jvdyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fY29waWVkX3JvdyA9IG51bGw7XG4gICAgICAgIHRoaXMucmVtb3ZlX3NlbGVjdGVkKCk7XG4gICAgfVxuICAgIHJldHVybiB0ZXh0O1xufTtcblxuLyoqXG4gKiBDb3BpZXMgdGhlIHNlbGVjdGVkIHRleHQuXG4gKiBAcmV0dXJuIHtzdHJpbmd9IHNlbGVjdGVkIHRleHRcbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRleHQgPSB0aGlzLmdldCgpO1xuICAgIGlmICh0aGlzLnByaW1hcnlfcm93ID09IHRoaXMuc2Vjb25kYXJ5X3JvdyAmJiB0aGlzLnByaW1hcnlfY2hhciA9PSB0aGlzLnNlY29uZGFyeV9jaGFyKSB7XG4gICAgICAgIHRoaXMuX2NvcGllZF9yb3cgPSB0aGlzLl9tb2RlbC5fcm93c1t0aGlzLnByaW1hcnlfcm93XTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9jb3BpZWRfcm93ID0gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRleHQ7XG59O1xuXG4vKipcbiAqIERlbGV0ZSBmb3J3YXJkLCB0eXBpY2FsbHkgY2FsbGVkIGJ5IGBkZWxldGVgIGtleXByZXNzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5kZWxldGVfZm9yd2FyZCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICghdGhpcy5yZW1vdmVfc2VsZWN0ZWQoKSkge1xuICAgICAgICB0aGlzLm1vdmVfcHJpbWFyeSgxLCAwKTtcbiAgICAgICAgdGhpcy5yZW1vdmVfc2VsZWN0ZWQoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIERlbGV0ZSBiYWNrd2FyZCwgdHlwaWNhbGx5IGNhbGxlZCBieSBgYmFja3NwYWNlYCBrZXlwcmVzcy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuZGVsZXRlX2JhY2t3YXJkID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKCF0aGlzLnJlbW92ZV9zZWxlY3RlZCgpKSB7XG4gICAgICAgIHRoaXMubW92ZV9wcmltYXJ5KC0xLCAwKTtcbiAgICAgICAgdGhpcy5yZW1vdmVfc2VsZWN0ZWQoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIERlbGV0ZSBvbmUgd29yZCBiYWNrd2FyZHMuXG4gKiBAcmV0dXJuIHtib29sZWFufSBzdWNjZXNzXG4gKi9cbkN1cnNvci5wcm90b3R5cGUuZGVsZXRlX3dvcmRfbGVmdCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICghdGhpcy5yZW1vdmVfc2VsZWN0ZWQoKSkge1xuICAgICAgICBpZiAodGhpcy5wcmltYXJ5X2NoYXIgPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMud29yZF9wcmltYXJ5KC0xKTsgXG4gICAgICAgICAgICB0aGlzLnJlbW92ZV9zZWxlY3RlZCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gV2FsayBiYWNrd2FyZHMgdW50aWwgY2hhciBpbmRleCBpcyAwIG9yXG4gICAgICAgICAgICAvLyBhIGRpZmZlcmVudCB0eXBlIG9mIGNoYXJhY3RlciBpcyBoaXQuXG4gICAgICAgICAgICB2YXIgcm93ID0gdGhpcy5fbW9kZWwuX3Jvd3NbdGhpcy5wcmltYXJ5X3Jvd107XG4gICAgICAgICAgICB2YXIgaSA9IHRoaXMucHJpbWFyeV9jaGFyIC0gMTtcbiAgICAgICAgICAgIHZhciBzdGFydF9ub3RfdGV4dCA9IHV0aWxzLm5vdF90ZXh0KHJvd1tpXSk7XG4gICAgICAgICAgICB3aGlsZSAoaSA+PSAwICYmIHV0aWxzLm5vdF90ZXh0KHJvd1tpXSkgPT0gc3RhcnRfbm90X3RleHQpIHtcbiAgICAgICAgICAgICAgICBpLS07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnNlY29uZGFyeV9jaGFyID0gaSsxO1xuICAgICAgICAgICAgdGhpcy5yZW1vdmVfc2VsZWN0ZWQoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogRGVsZXRlIG9uZSB3b3JkIGZvcndhcmRzLlxuICogQHJldHVybiB7Ym9vbGVhbn0gc3VjY2Vzc1xuICovXG5DdXJzb3IucHJvdG90eXBlLmRlbGV0ZV93b3JkX3JpZ2h0ID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKCF0aGlzLnJlbW92ZV9zZWxlY3RlZCgpKSB7XG4gICAgICAgIHZhciByb3cgPSB0aGlzLl9tb2RlbC5fcm93c1t0aGlzLnByaW1hcnlfcm93XTtcbiAgICAgICAgaWYgKHRoaXMucHJpbWFyeV9jaGFyID09PSByb3cubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLndvcmRfcHJpbWFyeSgxKTsgXG4gICAgICAgICAgICB0aGlzLnJlbW92ZV9zZWxlY3RlZCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gV2FsayBmb3J3YXJkcyB1bnRpbCBjaGFyIGluZGV4IGlzIGF0IGVuZCBvclxuICAgICAgICAgICAgLy8gYSBkaWZmZXJlbnQgdHlwZSBvZiBjaGFyYWN0ZXIgaXMgaGl0LlxuICAgICAgICAgICAgdmFyIGkgPSB0aGlzLnByaW1hcnlfY2hhcjtcbiAgICAgICAgICAgIHZhciBzdGFydF9ub3RfdGV4dCA9IHV0aWxzLm5vdF90ZXh0KHJvd1tpXSk7XG4gICAgICAgICAgICB3aGlsZSAoaSA8IHJvdy5sZW5ndGggJiYgdXRpbHMubm90X3RleHQocm93W2ldKSA9PSBzdGFydF9ub3RfdGV4dCkge1xuICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc2Vjb25kYXJ5X2NoYXIgPSBpO1xuICAgICAgICAgICAgdGhpcy5yZW1vdmVfc2VsZWN0ZWQoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogUmVzZXQgdGhlIHNlY29uZGFyeSBjdXJzb3IgdG8gdGhlIHZhbHVlIG9mIHRoZSBwcmltYXJ5LlxuICogQHJldHVybiB7W3R5cGVdfSBbZGVzY3JpcHRpb25dXG4gKi9cbkN1cnNvci5wcm90b3R5cGUuX3Jlc2V0X3NlY29uZGFyeSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc2Vjb25kYXJ5X3JvdyA9IHRoaXMucHJpbWFyeV9yb3c7XG4gICAgdGhpcy5zZWNvbmRhcnlfY2hhciA9IHRoaXMucHJpbWFyeV9jaGFyO1xuXG4gICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2UnKTsgXG59O1xuXG4vKipcbiAqIENyZWF0ZSB0aGUgcHJvcGVydGllcyBvZiB0aGUgY3Vyc29yLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yLnByb3RvdHlwZS5faW5pdF9wcm9wZXJ0aWVzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMucHJvcGVydHkoJ3N0YXJ0X3JvdycsIGZ1bmN0aW9uKCkgeyByZXR1cm4gTWF0aC5taW4odGhhdC5wcmltYXJ5X3JvdywgdGhhdC5zZWNvbmRhcnlfcm93KTsgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgnZW5kX3JvdycsIGZ1bmN0aW9uKCkgeyByZXR1cm4gTWF0aC5tYXgodGhhdC5wcmltYXJ5X3JvdywgdGhhdC5zZWNvbmRhcnlfcm93KTsgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgnc3RhcnRfY2hhcicsIGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodGhhdC5wcmltYXJ5X3JvdyA8IHRoYXQuc2Vjb25kYXJ5X3JvdyB8fCAodGhhdC5wcmltYXJ5X3JvdyA9PSB0aGF0LnNlY29uZGFyeV9yb3cgJiYgdGhhdC5wcmltYXJ5X2NoYXIgPD0gdGhhdC5zZWNvbmRhcnlfY2hhcikpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGF0LnByaW1hcnlfY2hhcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGF0LnNlY29uZGFyeV9jaGFyO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgnZW5kX2NoYXInLCBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHRoYXQucHJpbWFyeV9yb3cgPCB0aGF0LnNlY29uZGFyeV9yb3cgfHwgKHRoYXQucHJpbWFyeV9yb3cgPT0gdGhhdC5zZWNvbmRhcnlfcm93ICYmIHRoYXQucHJpbWFyeV9jaGFyIDw9IHRoYXQuc2Vjb25kYXJ5X2NoYXIpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhhdC5zZWNvbmRhcnlfY2hhcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGF0LnByaW1hcnlfY2hhcjtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuLyoqXG4gKiBNYWtlcyBhIGxpc3Qgb2YgaW5kZW50YXRpb24gc3RyaW5ncyB1c2VkIHRvIGluZGVudCBvbmUgbGV2ZWwsXG4gKiBvcmRlcmVkIGJ5IHVzYWdlIHByZWZlcmVuY2UuXG4gKiBAcmV0dXJuIHtzdHJpbmd9XG4gKi9cbkN1cnNvci5wcm90b3R5cGUuX21ha2VfaW5kZW50cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpbmRlbnRzID0gW107XG4gICAgaWYgKGNvbmZpZy51c2Vfc3BhY2VzKSB7XG4gICAgICAgIHZhciBpbmRlbnQgPSAnJztcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb25maWcudGFiX3dpZHRoOyBpKyspIHtcbiAgICAgICAgICAgIGluZGVudCArPSAnICc7XG4gICAgICAgICAgICBpbmRlbnRzLnB1c2goaW5kZW50KTtcbiAgICAgICAgfVxuICAgICAgICBpbmRlbnRzLnJldmVyc2UoKTtcbiAgICB9XG4gICAgaW5kZW50cy5wdXNoKCdcXHQnKTtcbiAgICByZXR1cm4gaW5kZW50cztcbn07XG5cbi8qKlxuICogUmVnaXN0ZXJzIGFuIGFjdGlvbiBBUEkgd2l0aCB0aGUgbWFwXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3IucHJvdG90eXBlLl9yZWdpc3Rlcl9hcGkgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5yZW1vdmVfc2VsZWN0ZWQnLCB1dGlscy5wcm94eSh0aGlzLnJlbW92ZV9zZWxlY3RlZCwgdGhpcyksIHRoaXMpO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3Iua2V5cHJlc3MnLCB1dGlscy5wcm94eSh0aGlzLmtleXByZXNzLCB0aGlzKSwgdGhpcyk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5pbmRlbnQnLCB1dGlscy5wcm94eSh0aGlzLmluZGVudCwgdGhpcyksIHRoaXMpO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3IudW5pbmRlbnQnLCB1dGlscy5wcm94eSh0aGlzLnVuaW5kZW50LCB0aGlzKSwgdGhpcyk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5uZXdsaW5lJywgdXRpbHMucHJveHkodGhpcy5uZXdsaW5lLCB0aGlzKSwgdGhpcyk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5pbnNlcnRfdGV4dCcsIHV0aWxzLnByb3h5KHRoaXMuaW5zZXJ0X3RleHQsIHRoaXMpLCB0aGlzKTtcbiAgICByZWdpc3RlcignY3Vyc29yLmRlbGV0ZV9iYWNrd2FyZCcsIHV0aWxzLnByb3h5KHRoaXMuZGVsZXRlX2JhY2t3YXJkLCB0aGlzKSwgdGhpcyk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5kZWxldGVfZm9yd2FyZCcsIHV0aWxzLnByb3h5KHRoaXMuZGVsZXRlX2ZvcndhcmQsIHRoaXMpLCB0aGlzKTtcbiAgICByZWdpc3RlcignY3Vyc29yLmRlbGV0ZV93b3JkX2xlZnQnLCB1dGlscy5wcm94eSh0aGlzLmRlbGV0ZV93b3JkX2xlZnQsIHRoaXMpLCB0aGlzKTtcbiAgICByZWdpc3RlcignY3Vyc29yLmRlbGV0ZV93b3JkX3JpZ2h0JywgdXRpbHMucHJveHkodGhpcy5kZWxldGVfd29yZF9yaWdodCwgdGhpcyksIHRoaXMpO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3Iuc2VsZWN0X2FsbCcsIHV0aWxzLnByb3h5KHRoaXMuc2VsZWN0X2FsbCwgdGhpcyksIHRoaXMpO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3IubGVmdCcsIGZ1bmN0aW9uKCkgeyB0aGF0Lm1vdmVfcHJpbWFyeSgtMSwgMCwgdHJ1ZSk7IHRoYXQuX3Jlc2V0X3NlY29uZGFyeSgpOyByZXR1cm4gdHJ1ZTsgfSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5yaWdodCcsIGZ1bmN0aW9uKCkgeyB0aGF0Lm1vdmVfcHJpbWFyeSgxLCAwLCB0cnVlKTsgdGhhdC5fcmVzZXRfc2Vjb25kYXJ5KCk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLnVwJywgZnVuY3Rpb24oKSB7IHRoYXQubW92ZV9wcmltYXJ5KDAsIC0xLCB0cnVlKTsgdGhhdC5fcmVzZXRfc2Vjb25kYXJ5KCk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLmRvd24nLCBmdW5jdGlvbigpIHsgdGhhdC5tb3ZlX3ByaW1hcnkoMCwgMSwgdHJ1ZSk7IHRoYXQuX3Jlc2V0X3NlY29uZGFyeSgpOyByZXR1cm4gdHJ1ZTsgfSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5zZWxlY3RfbGVmdCcsIGZ1bmN0aW9uKCkgeyB0aGF0Lm1vdmVfcHJpbWFyeSgtMSwgMCk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLnNlbGVjdF9yaWdodCcsIGZ1bmN0aW9uKCkgeyB0aGF0Lm1vdmVfcHJpbWFyeSgxLCAwKTsgcmV0dXJuIHRydWU7IH0pO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3Iuc2VsZWN0X3VwJywgZnVuY3Rpb24oKSB7IHRoYXQubW92ZV9wcmltYXJ5KDAsIC0xKTsgcmV0dXJuIHRydWU7IH0pO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3Iuc2VsZWN0X2Rvd24nLCBmdW5jdGlvbigpIHsgdGhhdC5tb3ZlX3ByaW1hcnkoMCwgMSk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLndvcmRfbGVmdCcsIGZ1bmN0aW9uKCkgeyB0aGF0LndvcmRfcHJpbWFyeSgtMSk7IHRoYXQuX3Jlc2V0X3NlY29uZGFyeSgpOyByZXR1cm4gdHJ1ZTsgfSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci53b3JkX3JpZ2h0JywgZnVuY3Rpb24oKSB7IHRoYXQud29yZF9wcmltYXJ5KDEpOyB0aGF0Ll9yZXNldF9zZWNvbmRhcnkoKTsgcmV0dXJuIHRydWU7IH0pO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3Iuc2VsZWN0X3dvcmRfbGVmdCcsIGZ1bmN0aW9uKCkgeyB0aGF0LndvcmRfcHJpbWFyeSgtMSk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLnNlbGVjdF93b3JkX3JpZ2h0JywgZnVuY3Rpb24oKSB7IHRoYXQud29yZF9wcmltYXJ5KDEpOyByZXR1cm4gdHJ1ZTsgfSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5saW5lX3N0YXJ0JywgZnVuY3Rpb24oKSB7IHRoYXQucHJpbWFyeV9nb3RvX3N0YXJ0KCk7IHRoYXQuX3Jlc2V0X3NlY29uZGFyeSgpOyByZXR1cm4gdHJ1ZTsgfSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvci5saW5lX2VuZCcsIGZ1bmN0aW9uKCkgeyB0aGF0LnByaW1hcnlfZ290b19lbmQoKTsgdGhhdC5fcmVzZXRfc2Vjb25kYXJ5KCk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLnNlbGVjdF9saW5lX3N0YXJ0JywgZnVuY3Rpb24oKSB7IHRoYXQucHJpbWFyeV9nb3RvX3N0YXJ0KCk7IHJldHVybiB0cnVlOyB9KTtcbiAgICByZWdpc3RlcignY3Vyc29yLnNlbGVjdF9saW5lX2VuZCcsIGZ1bmN0aW9uKCkgeyB0aGF0LnByaW1hcnlfZ290b19lbmQoKTsgcmV0dXJuIHRydWU7IH0pO1xufTtcblxuZXhwb3J0cy5DdXJzb3IgPSBDdXJzb3I7IiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cbnZhciBrZXltYXAgPSByZXF1aXJlKCcuL2V2ZW50cy9tYXAuanMnKTtcbnZhciByZWdpc3RlciA9IGtleW1hcC5NYXAucmVnaXN0ZXI7XG5cbnZhciBjdXJzb3IgPSByZXF1aXJlKCcuL2N1cnNvci5qcycpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xuLyoqXG4gKiBNYW5hZ2VzIG9uZSBvciBtb3JlIGN1cnNvcnNcbiAqL1xudmFyIEN1cnNvcnMgPSBmdW5jdGlvbihtb2RlbCwgY2xpcGJvYXJkKSB7XG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzKTtcbiAgICB0aGlzLl9tb2RlbCA9IG1vZGVsO1xuICAgIHRoaXMuZ2V0X3Jvd19jaGFyID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuY3Vyc29ycyA9IFtdO1xuICAgIHRoaXMuX3NlbGVjdGluZ190ZXh0ID0gZmFsc2U7XG4gICAgdGhpcy5fY2xpcGJvYXJkID0gY2xpcGJvYXJkO1xuICAgIHRoaXMuX2FjdGl2ZV9jdXJzb3IgPSBudWxsO1xuXG4gICAgLy8gQ3JlYXRlIGluaXRpYWwgY3Vyc29yLlxuICAgIHRoaXMuY3JlYXRlKCk7XG5cbiAgICAvLyBSZWdpc3RlciBhY3Rpb25zLlxuICAgIHJlZ2lzdGVyKCdjdXJzb3JzLnN0YXJ0X3NlbGVjdGlvbicsIHV0aWxzLnByb3h5KHRoaXMuc3RhcnRfc2VsZWN0aW9uLCB0aGlzKSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvcnMuc2V0X3NlbGVjdGlvbicsIHV0aWxzLnByb3h5KHRoaXMuc2V0X3NlbGVjdGlvbiwgdGhpcykpO1xuICAgIHJlZ2lzdGVyKCdjdXJzb3JzLnN0YXJ0X3NldF9zZWxlY3Rpb24nLCB1dGlscy5wcm94eSh0aGlzLnN0YXJ0X3NldF9zZWxlY3Rpb24sIHRoaXMpKTtcbiAgICByZWdpc3RlcignY3Vyc29ycy5lbmRfc2VsZWN0aW9uJywgdXRpbHMucHJveHkodGhpcy5lbmRfc2VsZWN0aW9uLCB0aGlzKSk7XG4gICAgcmVnaXN0ZXIoJ2N1cnNvcnMuc2VsZWN0X3dvcmQnLCB1dGlscy5wcm94eSh0aGlzLnNlbGVjdF93b3JkLCB0aGlzKSk7XG5cbiAgICAvLyBCaW5kIGNsaXBib2FyZCBldmVudHMuXG4gICAgdGhpcy5fY2xpcGJvYXJkLm9uKCdjdXQnLCB1dGlscy5wcm94eSh0aGlzLl9oYW5kbGVfY3V0LCB0aGlzKSk7XG4gICAgdGhpcy5fY2xpcGJvYXJkLm9uKCdjb3B5JywgdXRpbHMucHJveHkodGhpcy5faGFuZGxlX2NvcHksIHRoaXMpKTtcbiAgICB0aGlzLl9jbGlwYm9hcmQub24oJ3Bhc3RlJywgdXRpbHMucHJveHkodGhpcy5faGFuZGxlX3Bhc3RlLCB0aGlzKSk7XG59O1xudXRpbHMuaW5oZXJpdChDdXJzb3JzLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8qKlxuICogQ3JlYXRlcyBhIGN1cnNvciBhbmQgbWFuYWdlcyBpdC5cbiAqIEByZXR1cm4ge0N1cnNvcn0gY3Vyc29yXG4gKi9cbkN1cnNvcnMucHJvdG90eXBlLmNyZWF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBuZXdfY3Vyc29yID0gbmV3IGN1cnNvci5DdXJzb3IodGhpcy5fbW9kZWwsIHRoaXMuX2lucHV0X2Rpc3BhdGNoZXIpO1xuICAgIHRoaXMuY3Vyc29ycy5wdXNoKG5ld19jdXJzb3IpO1xuXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIG5ld19jdXJzb3Iub24oJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGF0LnRyaWdnZXIoJ2NoYW5nZScsIG5ld19jdXJzb3IpO1xuICAgICAgICB0aGF0Ll91cGRhdGVfc2VsZWN0aW9uKCk7XG4gICAgfSk7XG4gICAgdGhhdC50cmlnZ2VyKCdjaGFuZ2UnLCBuZXdfY3Vyc29yKTtcblxuICAgIHJldHVybiBuZXdfY3Vyc29yO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gdGhlIHNlbGVjdGVkIHRleHQgaXMgY29waWVkIHRvIHRoZSBjbGlwYm9hcmQuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IHRleHQgLSBieSB2YWwgdGV4dCB0aGF0IHdhcyBjdXRcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvcnMucHJvdG90eXBlLl9oYW5kbGVfY29weSA9IGZ1bmN0aW9uKHRleHQpIHtcbiAgICB0aGlzLmN1cnNvcnMuZm9yRWFjaChmdW5jdGlvbihjdXJzb3IpIHtcbiAgICAgICAgY3Vyc29yLmNvcHkoKTtcbiAgICB9KTtcbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIHRoZSBzZWxlY3RlZCB0ZXh0IGlzIGN1dCB0byB0aGUgY2xpcGJvYXJkLlxuICogQHBhcmFtICB7c3RyaW5nfSB0ZXh0IC0gYnkgdmFsIHRleHQgdGhhdCB3YXMgY3V0XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3JzLnByb3RvdHlwZS5faGFuZGxlX2N1dCA9IGZ1bmN0aW9uKHRleHQpIHtcbiAgICB0aGlzLmN1cnNvcnMuZm9yRWFjaChmdW5jdGlvbihjdXJzb3IpIHtcbiAgICAgICAgY3Vyc29yLmN1dCgpO1xuICAgIH0pO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gdGV4dCBpcyBwYXN0ZWQgaW50byB0aGUgZG9jdW1lbnQuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IHRleHRcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvcnMucHJvdG90eXBlLl9oYW5kbGVfcGFzdGUgPSBmdW5jdGlvbih0ZXh0KSB7XG5cbiAgICAvLyBJZiB0aGUgbW9kdWx1cyBvZiB0aGUgbnVtYmVyIG9mIGN1cnNvcnMgYW5kIHRoZSBudW1iZXIgb2YgcGFzdGVkIGxpbmVzXG4gICAgLy8gb2YgdGV4dCBpcyB6ZXJvLCBzcGxpdCB0aGUgY3V0IGxpbmVzIGFtb25nIHRoZSBjdXJzb3JzLlxuICAgIHZhciBsaW5lcyA9IHRleHQuc3BsaXQoJ1xcbicpO1xuICAgIGlmICh0aGlzLmN1cnNvcnMubGVuZ3RoID4gMSAmJiBsaW5lcy5sZW5ndGggPiAxICYmIGxpbmVzLmxlbmd0aCAlIHRoaXMuY3Vyc29ycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdmFyIGxpbmVzX3Blcl9jdXJzb3IgPSBsaW5lcy5sZW5ndGggLyB0aGlzLmN1cnNvcnMubGVuZ3RoO1xuICAgICAgICB0aGlzLmN1cnNvcnMuZm9yRWFjaChmdW5jdGlvbihjdXJzb3IsIGluZGV4KSB7XG4gICAgICAgICAgICBjdXJzb3IuaW5zZXJ0X3RleHQobGluZXMuc2xpY2UoXG4gICAgICAgICAgICAgICAgaW5kZXggKiBsaW5lc19wZXJfY3Vyc29yLCBcbiAgICAgICAgICAgICAgICBpbmRleCAqIGxpbmVzX3Blcl9jdXJzb3IgKyBsaW5lc19wZXJfY3Vyc29yKS5qb2luKCdcXG4nKSk7XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuY3Vyc29ycy5mb3JFYWNoKGZ1bmN0aW9uKGN1cnNvcikge1xuICAgICAgICAgICAgY3Vyc29yLnBhc3RlKHRleHQpO1xuICAgICAgICB9KTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFVwZGF0ZSB0aGUgY2xpcHBhYmxlIHRleHQgYmFzZWQgb24gbmV3IHNlbGVjdGlvbi5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvcnMucHJvdG90eXBlLl91cGRhdGVfc2VsZWN0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgXG4gICAgLy8gQ29weSBhbGwgb2YgdGhlIHNlbGVjdGVkIHRleHQuXG4gICAgdmFyIHNlbGVjdGlvbnMgPSBbXTtcbiAgICB0aGlzLmN1cnNvcnMuZm9yRWFjaChmdW5jdGlvbihjdXJzb3IpIHtcbiAgICAgICAgc2VsZWN0aW9ucy5wdXNoKGN1cnNvci5nZXQoKSk7XG4gICAgfSk7XG5cbiAgICAvLyBNYWtlIHRoZSBjb3BpZWQgdGV4dCBjbGlwcGFibGUuXG4gICAgdGhpcy5fY2xpcGJvYXJkLnNldF9jbGlwcGFibGUoc2VsZWN0aW9ucy5qb2luKCdcXG4nKSk7XG59O1xuXG4vKipcbiAqIFN0YXJ0cyBzZWxlY3RpbmcgdGV4dCBmcm9tIG1vdXNlIGNvb3JkaW5hdGVzLlxuICogQHBhcmFtICB7TW91c2VFdmVudH0gZSAtIG1vdXNlIGV2ZW50IGNvbnRhaW5pbmcgdGhlIGNvb3JkaW5hdGVzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29ycy5wcm90b3R5cGUuc3RhcnRfc2VsZWN0aW9uID0gZnVuY3Rpb24oZSkge1xuICAgIHZhciB4ID0gZS5vZmZzZXRYO1xuICAgIHZhciB5ID0gZS5vZmZzZXRZO1xuXG4gICAgdGhpcy5fc2VsZWN0aW5nX3RleHQgPSB0cnVlO1xuICAgIGlmICh0aGlzLmdldF9yb3dfY2hhcikge1xuICAgICAgICB2YXIgbG9jYXRpb24gPSB0aGlzLmdldF9yb3dfY2hhcih4LCB5KTtcbiAgICAgICAgdGhpcy5jdXJzb3JzWzBdLnNldF9ib3RoKGxvY2F0aW9uLnJvd19pbmRleCwgbG9jYXRpb24uY2hhcl9pbmRleCk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBGaW5hbGl6ZXMgdGhlIHNlbGVjdGlvbiBvZiB0ZXh0LlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29ycy5wcm90b3R5cGUuZW5kX3NlbGVjdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3NlbGVjdGluZ190ZXh0ID0gZmFsc2U7XG59O1xuXG4vKipcbiAqIFNldHMgdGhlIGVuZHBvaW50IG9mIHRleHQgc2VsZWN0aW9uIGZyb20gbW91c2UgY29vcmRpbmF0ZXMuXG4gKiBAcGFyYW0gIHtNb3VzZUV2ZW50fSBlIC0gbW91c2UgZXZlbnQgY29udGFpbmluZyB0aGUgY29vcmRpbmF0ZXMuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3JzLnByb3RvdHlwZS5zZXRfc2VsZWN0aW9uID0gZnVuY3Rpb24oZSkge1xuICAgIHZhciB4ID0gZS5vZmZzZXRYO1xuICAgIHZhciB5ID0gZS5vZmZzZXRZO1xuICAgIGlmICh0aGlzLl9zZWxlY3RpbmdfdGV4dCAmJiB0aGlzLmdldF9yb3dfY2hhcikge1xuICAgICAgICB2YXIgbG9jYXRpb24gPSB0aGlzLmdldF9yb3dfY2hhcih4LCB5KTtcbiAgICAgICAgdGhpcy5jdXJzb3JzW3RoaXMuY3Vyc29ycy5sZW5ndGgtMV0uc2V0X3ByaW1hcnkobG9jYXRpb24ucm93X2luZGV4LCBsb2NhdGlvbi5jaGFyX2luZGV4KTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFNldHMgdGhlIGVuZHBvaW50IG9mIHRleHQgc2VsZWN0aW9uIGZyb20gbW91c2UgY29vcmRpbmF0ZXMuXG4gKiBEaWZmZXJlbnQgdGhhbiBzZXRfc2VsZWN0aW9uIGJlY2F1c2UgaXQgZG9lc24ndCBuZWVkIGEgY2FsbFxuICogdG8gc3RhcnRfc2VsZWN0aW9uIHRvIHdvcmsuXG4gKiBAcGFyYW0gIHtNb3VzZUV2ZW50fSBlIC0gbW91c2UgZXZlbnQgY29udGFpbmluZyB0aGUgY29vcmRpbmF0ZXMuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5DdXJzb3JzLnByb3RvdHlwZS5zdGFydF9zZXRfc2VsZWN0aW9uID0gZnVuY3Rpb24oZSkge1xuICAgIHRoaXMuX3NlbGVjdGluZ190ZXh0ID0gdHJ1ZTtcbiAgICB0aGlzLnNldF9zZWxlY3Rpb24oZSk7XG59O1xuXG4vKipcbiAqIFNlbGVjdHMgYSB3b3JkIGF0IHRoZSBnaXZlbiBtb3VzZSBjb29yZGluYXRlcy5cbiAqIEBwYXJhbSAge01vdXNlRXZlbnR9IGUgLSBtb3VzZSBldmVudCBjb250YWluaW5nIHRoZSBjb29yZGluYXRlcy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvcnMucHJvdG90eXBlLnNlbGVjdF93b3JkID0gZnVuY3Rpb24oZSkge1xuICAgIHZhciB4ID0gZS5vZmZzZXRYO1xuICAgIHZhciB5ID0gZS5vZmZzZXRZO1xuICAgIGlmICh0aGlzLmdldF9yb3dfY2hhcikge1xuICAgICAgICB2YXIgbG9jYXRpb24gPSB0aGlzLmdldF9yb3dfY2hhcih4LCB5KTtcbiAgICAgICAgdGhpcy5jdXJzb3JzW3RoaXMuY3Vyc29ycy5sZW5ndGgtMV0uc2VsZWN0X3dvcmQobG9jYXRpb24ucm93X2luZGV4LCBsb2NhdGlvbi5jaGFyX2luZGV4KTtcbiAgICB9XG59O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLkN1cnNvcnMgPSBDdXJzb3JzO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xudmFyIG5vcm1hbGl6ZXIgPSByZXF1aXJlKCcuL2V2ZW50cy9ub3JtYWxpemVyLmpzJyk7XG52YXIga2V5bWFwID0gcmVxdWlyZSgnLi9ldmVudHMvbWFwLmpzJyk7XG52YXIgZGVmYXVsdF9rZXltYXAgPSByZXF1aXJlKCcuL2V2ZW50cy9kZWZhdWx0LmpzJyk7XG52YXIgY3Vyc29ycyA9IHJlcXVpcmUoJy4vY3Vyc29ycy5qcycpO1xudmFyIGNsaXBib2FyZCA9IHJlcXVpcmUoJy4vY2xpcGJvYXJkLmpzJyk7XG5cbi8qKlxuICogQ29udHJvbGxlciBmb3IgYSBEb2N1bWVudE1vZGVsLlxuICovXG52YXIgRG9jdW1lbnRDb250cm9sbGVyID0gZnVuY3Rpb24oZWwsIG1vZGVsKSB7XG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzKTtcbiAgICB0aGlzLmNsaXBib2FyZCA9IG5ldyBjbGlwYm9hcmQuQ2xpcGJvYXJkKGVsKTtcbiAgICB0aGlzLm5vcm1hbGl6ZXIgPSBuZXcgbm9ybWFsaXplci5Ob3JtYWxpemVyKCk7XG4gICAgdGhpcy5ub3JtYWxpemVyLmxpc3Rlbl90byhlbCk7XG4gICAgdGhpcy5ub3JtYWxpemVyLmxpc3Rlbl90byh0aGlzLmNsaXBib2FyZC5oaWRkZW5faW5wdXQpO1xuICAgIHRoaXMubWFwID0gbmV3IGtleW1hcC5NYXAodGhpcy5ub3JtYWxpemVyKTtcbiAgICB0aGlzLm1hcC5tYXAoZGVmYXVsdF9rZXltYXAubWFwKTtcblxuICAgIHRoaXMuY3Vyc29ycyA9IG5ldyBjdXJzb3JzLkN1cnNvcnMobW9kZWwsIHRoaXMuY2xpcGJvYXJkKTtcbn07XG51dGlscy5pbmhlcml0KERvY3VtZW50Q29udHJvbGxlciwgdXRpbHMuUG9zdGVyQ2xhc3MpO1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLkRvY3VtZW50Q29udHJvbGxlciA9IERvY3VtZW50Q29udHJvbGxlcjtcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcblxuLyoqXG4gKiBNb2RlbCBjb250YWluaW5nIGFsbCBvZiB0aGUgZG9jdW1lbnQncyBkYXRhICh0ZXh0KS5cbiAqL1xudmFyIERvY3VtZW50TW9kZWwgPSBmdW5jdGlvbigpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX3Jvd3MgPSBbXTtcbiAgICB0aGlzLl9yb3dfdGFncyA9IFtdO1xuICAgIHRoaXMuX3RhZ19sb2NrID0gMDtcbiAgICB0aGlzLl9wZW5kaW5nX3RhZ19ldmVudHMgPSBmYWxzZTtcbiAgICB0aGlzLl9pbml0X3Byb3BlcnRpZXMoKTtcbn07XG51dGlscy5pbmhlcml0KERvY3VtZW50TW9kZWwsIHV0aWxzLlBvc3RlckNsYXNzKTtcblxuLyoqXG4gKiBBY3F1aXJlIGEgbG9jayBvbiB0YWcgZXZlbnRzXG4gKlxuICogUHJldmVudHMgdGFnIGV2ZW50cyBmcm9tIGZpcmluZy5cbiAqIEByZXR1cm4ge2ludGVnZXJ9IGxvY2sgY291bnRcbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUuYWNxdWlyZV90YWdfZXZlbnRfbG9jayA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl90YWdfbG9jaysrO1xufTtcblxuLyoqXG4gKiBSZWxlYXNlIGEgbG9jayBvbiB0YWcgZXZlbnRzXG4gKiBAcmV0dXJuIHtpbnRlZ2VyfSBsb2NrIGNvdW50XG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLnJlbGVhc2VfdGFnX2V2ZW50X2xvY2sgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl90YWdfbG9jay0tO1xuICAgIGlmICh0aGlzLl90YWdfbG9jayA8IDApIHtcbiAgICAgICAgdGhpcy5fdGFnX2xvY2sgPSAwO1xuICAgIH1cbiAgICBpZiAodGhpcy5fdGFnX2xvY2sgPT09IDAgJiYgdGhpcy5fcGVuZGluZ190YWdfZXZlbnRzKSB7XG4gICAgICAgIHRoaXMuX3BlbmRpbmdfdGFnX2V2ZW50cyA9IGZhbHNlO1xuICAgICAgICB0aGlzLnRyaWdnZXJfdGFnX2V2ZW50cygpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fdGFnX2xvY2s7XG59O1xuXG4vKipcbiAqIFRyaWdnZXJzIHRoZSB0YWcgY2hhbmdlIGV2ZW50cy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLnRyaWdnZXJfdGFnX2V2ZW50cyA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLl90YWdfbG9jayA9PT0gMCkge1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ3RhZ3NfY2hhbmdlZCcpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZWQnKTsgICAgXG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fcGVuZGluZ190YWdfZXZlbnRzID0gdHJ1ZTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFNldHMgYSAndGFnJyBvbiB0aGUgdGV4dCBzcGVjaWZpZWQuXG4gKiBAcGFyYW0ge2ludGVnZXJ9IHN0YXJ0X3JvdyAtIHJvdyB0aGUgdGFnIHN0YXJ0cyBvblxuICogQHBhcmFtIHtpbnRlZ2VyfSBzdGFydF9jaGFyIC0gaW5kZXgsIGluIHRoZSByb3csIG9mIHRoZSBmaXJzdCB0YWdnZWQgY2hhcmFjdGVyXG4gKiBAcGFyYW0ge2ludGVnZXJ9IGVuZF9yb3cgLSByb3cgdGhlIHRhZyBlbmRzIG9uXG4gKiBAcGFyYW0ge2ludGVnZXJ9IGVuZF9jaGFyIC0gaW5kZXgsIGluIHRoZSByb3csIG9mIHRoZSBsYXN0IHRhZ2dlZCBjaGFyYWN0ZXJcbiAqIEBwYXJhbSB7c3RyaW5nfSB0YWdfbmFtZVxuICogQHBhcmFtIHthbnl9IHRhZ192YWx1ZSAtIG92ZXJyaWRlcyBhbnkgcHJldmlvdXMgdGFnc1xuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5zZXRfdGFnID0gZnVuY3Rpb24oc3RhcnRfcm93LCBzdGFydF9jaGFyLCBlbmRfcm93LCBlbmRfY2hhciwgdGFnX25hbWUsIHRhZ192YWx1ZSkge1xuICAgIHZhciBjb29yZHMgPSB0aGlzLnZhbGlkYXRlX2Nvb3Jkcy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIGZvciAodmFyIHJvdyA9IGNvb3Jkcy5zdGFydF9yb3c7IHJvdyA8PSBjb29yZHMuZW5kX3Jvdzsgcm93KyspIHtcbiAgICAgICAgdmFyIHN0YXJ0ID0gY29vcmRzLnN0YXJ0X2NoYXI7XG4gICAgICAgIHZhciBlbmQgPSBjb29yZHMuZW5kX2NoYXI7XG4gICAgICAgIGlmIChyb3cgPiBjb29yZHMuc3RhcnRfcm93KSB7IHN0YXJ0ID0gLTE7IH1cbiAgICAgICAgaWYgKHJvdyA8IGNvb3Jkcy5lbmRfcm93KSB7IGVuZCA9IC0xOyB9XG5cbiAgICAgICAgLy8gUmVtb3ZlIG9yIG1vZGlmeSBjb25mbGljdGluZyB0YWdzLlxuICAgICAgICB2YXIgYWRkX3RhZ3MgPSBbXTtcbiAgICAgICAgdGhpcy5fcm93X3RhZ3Nbcm93XS5maWx0ZXIoZnVuY3Rpb24odGFnKSB7XG4gICAgICAgICAgICBpZiAodGFnLm5hbWUgPT0gdGFnX25hbWUpIHtcbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0YWcgaXMgd2l0aGluXG4gICAgICAgICAgICAgICAgaWYgKHN0YXJ0ID09IC0xICYmIGVuZCA9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh0YWcuc3RhcnQgPj0gc3RhcnQgJiYgKHRhZy5lbmQgPCBlbmQgfHwgZW5kID09IC0xKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRhZyBpcyBvdXRzaWRlXG4gICAgICAgICAgICAgICAgLy8gVG8gdGhlIHJpZ2h0P1xuICAgICAgICAgICAgICAgIGlmICh0YWcuc3RhcnQgPiBlbmQgJiYgZW5kICE9IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBUbyB0aGUgbGVmdD9cbiAgICAgICAgICAgICAgICBpZiAodGFnLmVuZCA8IHN0YXJ0ICYmIHRhZy5lbmQgIT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGFnIGVuY2Fwc3VsYXRlc1xuICAgICAgICAgICAgICAgIHZhciBsZWZ0X2ludGVyc2VjdGluZyA9IHRhZy5zdGFydCA8IHN0YXJ0O1xuICAgICAgICAgICAgICAgIHZhciByaWdodF9pbnRlcnNlY3RpbmcgPSBlbmQgIT0gLTEgJiYgKHRhZy5lbmQgPT0gLTEgfHwgdGFnLmVuZCA+IGVuZCk7XG5cbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0YWcgaXMgbGVmdCBpbnRlcnNlY3RpbmdcbiAgICAgICAgICAgICAgICBpZiAobGVmdF9pbnRlcnNlY3RpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgYWRkX3RhZ3MucHVzaCh7bmFtZTogdGFnX25hbWUsIHZhbHVlOiB0YWcudmFsdWUsIHN0YXJ0OiB0YWcuc3RhcnQsIGVuZDogc3RhcnQtMX0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRhZyBpcyByaWdodCBpbnRlcnNlY3RpbmdcbiAgICAgICAgICAgICAgICBpZiAocmlnaHRfaW50ZXJzZWN0aW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIGFkZF90YWdzLnB1c2goe25hbWU6IHRhZ19uYW1lLCB2YWx1ZTogdGFnLnZhbHVlLCBzdGFydDogZW5kKzEsIGVuZDogdGFnLmVuZH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHRhZ3MgYW5kIGNvcnJlY3RlZCB0YWdzLlxuICAgICAgICB0aGlzLl9yb3dfdGFnc1tyb3ddID0gdGhpcy5fcm93X3RhZ3Nbcm93XS5jb25jYXQoYWRkX3RhZ3MpO1xuICAgICAgICB0aGlzLl9yb3dfdGFnc1tyb3ddLnB1c2goe25hbWU6IHRhZ19uYW1lLCB2YWx1ZTogdGFnX3ZhbHVlLCBzdGFydDogc3RhcnQsIGVuZDogZW5kfSk7XG4gICAgfVxuICAgIHRoaXMudHJpZ2dlcl90YWdfZXZlbnRzKCk7XG59O1xuXG4vKipcbiAqIFJlbW92ZWQgYWxsIG9mIHRoZSB0YWdzIG9uIHRoZSBkb2N1bWVudC5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IHN0YXJ0X3Jvd1xuICogQHBhcmFtICB7aW50ZWdlcn0gZW5kX3Jvd1xuICogQHJldHVybiB7bnVsbH1cbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUuY2xlYXJfdGFncyA9IGZ1bmN0aW9uKHN0YXJ0X3JvdywgZW5kX3Jvdykge1xuICAgIHN0YXJ0X3JvdyA9IHN0YXJ0X3JvdyAhPT0gdW5kZWZpbmVkID8gc3RhcnRfcm93IDogMDtcbiAgICBlbmRfcm93ID0gZW5kX3JvdyAhPT0gdW5kZWZpbmVkID8gZW5kX3JvdyA6IHRoaXMuX3Jvd190YWdzLmxlbmd0aCAtIDE7XG4gICAgZm9yICh2YXIgaSA9IHN0YXJ0X3JvdzsgaSA8PSBlbmRfcm93OyBpKyspIHtcbiAgICAgICAgdGhpcy5fcm93X3RhZ3NbaV0gPSBbXTtcbiAgICB9XG4gICAgdGhpcy50cmlnZ2VyX3RhZ19ldmVudHMoKTtcbn07XG5cbi8qKlxuICogR2V0IHRoZSB0YWdzIGFwcGxpZWQgdG8gYSBjaGFyYWN0ZXIuXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSByb3dfaW5kZXhcbiAqIEBwYXJhbSAge2ludGVnZXJ9IGNoYXJfaW5kZXhcbiAqIEByZXR1cm4ge2RpY3Rpb25hcnl9XG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLmdldF90YWdzID0gZnVuY3Rpb24ocm93X2luZGV4LCBjaGFyX2luZGV4KSB7XG4gICAgdmFyIGNvb3JkcyA9IHRoaXMudmFsaWRhdGVfY29vcmRzLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgdmFyIHRhZ3MgPSB7fTtcbiAgICB0aGlzLl9yb3dfdGFnc1tjb29yZHMuc3RhcnRfcm93XS5mb3JFYWNoKGZ1bmN0aW9uKHRhZykge1xuICAgICAgICAvLyBUYWcgc3RhcnQgb2YgLTEgbWVhbnMgdGhlIHRhZyBjb250aW51ZXMgdG8gdGhlIHByZXZpb3VzIGxpbmUuXG4gICAgICAgIHZhciBhZnRlcl9zdGFydCA9IChjb29yZHMuc3RhcnRfY2hhciA+PSB0YWcuc3RhcnQgfHwgdGFnLnN0YXJ0ID09IC0xKTtcbiAgICAgICAgLy8gVGFnIGVuZCBvZiAtMSBtZWFucyB0aGUgdGFnIGNvbnRpbnVlcyB0byB0aGUgbmV4dCBsaW5lLlxuICAgICAgICB2YXIgYmVmb3JlX2VuZCA9IChjb29yZHMuc3RhcnRfY2hhciA8PSB0YWcuZW5kIHx8IHRhZy5lbmQgPT0gLTEpO1xuICAgICAgICBpZiAoYWZ0ZXJfc3RhcnQgJiYgYmVmb3JlX2VuZCkge1xuICAgICAgICAgICAgdGFnc1t0YWcubmFtZV0gPSB0YWcudmFsdWU7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gdGFncztcbn07XG5cbi8qKlxuICogQWRkcyB0ZXh0IGVmZmljaWVudGx5IHNvbWV3aGVyZSBpbiB0aGUgZG9jdW1lbnQuXG4gKiBAcGFyYW0ge2ludGVnZXJ9IHJvd19pbmRleCAgXG4gKiBAcGFyYW0ge2ludGVnZXJ9IGNoYXJfaW5kZXggXG4gKiBAcGFyYW0ge3N0cmluZ30gdGV4dFxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5hZGRfdGV4dCA9IGZ1bmN0aW9uKHJvd19pbmRleCwgY2hhcl9pbmRleCwgdGV4dCkge1xuICAgIHZhciBjb29yZHMgPSB0aGlzLnZhbGlkYXRlX2Nvb3Jkcy5hcHBseSh0aGlzLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDAsMikpO1xuICAgIHZhciBvbGRfdGV4dCA9IHRoaXMuX3Jvd3NbY29vcmRzLnN0YXJ0X3Jvd107XG4gICAgLy8gSWYgdGhlIHRleHQgaGFzIGEgbmV3IGxpbmUgaW4gaXQsIGp1c3QgcmUtc2V0XG4gICAgLy8gdGhlIHJvd3MgbGlzdC5cbiAgICBpZiAodGV4dC5pbmRleE9mKCdcXG4nKSAhPSAtMSkge1xuICAgICAgICB2YXIgbmV3X3Jvd3MgPSBbXTtcbiAgICAgICAgaWYgKGNvb3Jkcy5zdGFydF9yb3cgPiAwKSB7XG4gICAgICAgICAgICBuZXdfcm93cyA9IHRoaXMuX3Jvd3Muc2xpY2UoMCwgY29vcmRzLnN0YXJ0X3Jvdyk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgb2xkX3Jvd19zdGFydCA9IG9sZF90ZXh0LnN1YnN0cmluZygwLCBjb29yZHMuc3RhcnRfY2hhcik7XG4gICAgICAgIHZhciBvbGRfcm93X2VuZCA9IG9sZF90ZXh0LnN1YnN0cmluZyhjb29yZHMuc3RhcnRfY2hhcik7XG4gICAgICAgIHZhciBzcGxpdF90ZXh0ID0gdGV4dC5zcGxpdCgnXFxuJyk7XG4gICAgICAgIG5ld19yb3dzLnB1c2gob2xkX3Jvd19zdGFydCArIHNwbGl0X3RleHRbMF0pO1xuXG4gICAgICAgIGlmIChzcGxpdF90ZXh0Lmxlbmd0aCA+IDIpIHtcbiAgICAgICAgICAgIG5ld19yb3dzID0gbmV3X3Jvd3MuY29uY2F0KHNwbGl0X3RleHQuc2xpY2UoMSxzcGxpdF90ZXh0Lmxlbmd0aC0xKSk7XG4gICAgICAgIH1cblxuICAgICAgICBuZXdfcm93cy5wdXNoKHNwbGl0X3RleHRbc3BsaXRfdGV4dC5sZW5ndGgtMV0gKyBvbGRfcm93X2VuZCk7XG5cbiAgICAgICAgaWYgKGNvb3Jkcy5zdGFydF9yb3crMSA8IHRoaXMuX3Jvd3MubGVuZ3RoKSB7XG4gICAgICAgICAgICBuZXdfcm93cyA9IG5ld19yb3dzLmNvbmNhdCh0aGlzLl9yb3dzLnNsaWNlKGNvb3Jkcy5zdGFydF9yb3crMSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fcm93cyA9IG5ld19yb3dzO1xuICAgICAgICB0aGlzLl9yZXNpemVkX3Jvd3MoKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdyb3dfY2hhbmdlZCcsIG9sZF90ZXh0LCBjb29yZHMuc3RhcnRfcm93KTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdyb3dzX2FkZGVkJywgY29vcmRzLnN0YXJ0X3JvdyArIDEsIGNvb3Jkcy5zdGFydF9yb3cgKyBzcGxpdF90ZXh0Lmxlbmd0aCAtIDEpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZWQnKTtcblxuICAgIC8vIFRleHQgZG9lc24ndCBoYXZlIGFueSBuZXcgbGluZXMsIGp1c3QgbW9kaWZ5IHRoZVxuICAgIC8vIGxpbmUgYW5kIHRoZW4gdHJpZ2dlciB0aGUgcm93IGNoYW5nZWQgZXZlbnQuXG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fcm93c1tjb29yZHMuc3RhcnRfcm93XSA9IG9sZF90ZXh0LnN1YnN0cmluZygwLCBjb29yZHMuc3RhcnRfY2hhcikgKyB0ZXh0ICsgb2xkX3RleHQuc3Vic3RyaW5nKGNvb3Jkcy5zdGFydF9jaGFyKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdyb3dfY2hhbmdlZCcsIG9sZF90ZXh0LCBjb29yZHMuc3RhcnRfcm93KTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2VkJyk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBSZW1vdmVzIGEgYmxvY2sgb2YgdGV4dCBmcm9tIHRoZSBkb2N1bWVudFxuICogQHBhcmFtICB7aW50ZWdlcn0gc3RhcnRfcm93XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBzdGFydF9jaGFyXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBlbmRfcm93XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBlbmRfY2hhclxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUucmVtb3ZlX3RleHQgPSBmdW5jdGlvbihzdGFydF9yb3csIHN0YXJ0X2NoYXIsIGVuZF9yb3csIGVuZF9jaGFyKSB7XG4gICAgdmFyIGNvb3JkcyA9IHRoaXMudmFsaWRhdGVfY29vcmRzLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgdmFyIG9sZF90ZXh0ID0gdGhpcy5fcm93c1tjb29yZHMuc3RhcnRfcm93XTtcbiAgICBpZiAoY29vcmRzLnN0YXJ0X3JvdyA9PSBjb29yZHMuZW5kX3Jvdykge1xuICAgICAgICB0aGlzLl9yb3dzW2Nvb3Jkcy5zdGFydF9yb3ddID0gdGhpcy5fcm93c1tjb29yZHMuc3RhcnRfcm93XS5zdWJzdHJpbmcoMCwgY29vcmRzLnN0YXJ0X2NoYXIpICsgdGhpcy5fcm93c1tjb29yZHMuc3RhcnRfcm93XS5zdWJzdHJpbmcoY29vcmRzLmVuZF9jaGFyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9yb3dzW2Nvb3Jkcy5zdGFydF9yb3ddID0gdGhpcy5fcm93c1tjb29yZHMuc3RhcnRfcm93XS5zdWJzdHJpbmcoMCwgY29vcmRzLnN0YXJ0X2NoYXIpICsgdGhpcy5fcm93c1tjb29yZHMuZW5kX3Jvd10uc3Vic3RyaW5nKGNvb3Jkcy5lbmRfY2hhcik7XG4gICAgfVxuXG4gICAgaWYgKGNvb3Jkcy5lbmRfcm93IC0gY29vcmRzLnN0YXJ0X3JvdyA+IDApIHtcbiAgICAgICAgdmFyIHJvd3NfcmVtb3ZlZCA9IHRoaXMuX3Jvd3Muc3BsaWNlKGNvb3Jkcy5zdGFydF9yb3cgKyAxLCBjb29yZHMuZW5kX3JvdyAtIGNvb3Jkcy5zdGFydF9yb3cpO1xuICAgICAgICB0aGlzLl9yZXNpemVkX3Jvd3MoKTtcblxuICAgICAgICAvLyBJZiB0aGVyZSBhcmUgbW9yZSBkZWxldGVkIHJvd3MgdGhhbiByb3dzIHJlbWFpbmluZywgaXRcbiAgICAgICAgLy8gaXMgZmFzdGVyIHRvIHJ1biBhIGNhbGN1bGF0aW9uIG9uIHRoZSByZW1haW5pbmcgcm93cyB0aGFuXG4gICAgICAgIC8vIHRvIHJ1biBpdCBvbiB0aGUgcm93cyByZW1vdmVkLlxuICAgICAgICBpZiAocm93c19yZW1vdmVkLmxlbmd0aCA+IHRoaXMuX3Jvd3MubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLnRyaWdnZXIoJ3RleHRfY2hhbmdlZCcpO1xuICAgICAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2VkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnRyaWdnZXIoJ3Jvd19jaGFuZ2VkJywgb2xkX3RleHQsIGNvb3Jkcy5zdGFydF9yb3cpO1xuICAgICAgICAgICAgdGhpcy50cmlnZ2VyKCdyb3dzX3JlbW92ZWQnLCByb3dzX3JlbW92ZWQpO1xuICAgICAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2VkJyk7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGNvb3Jkcy5lbmRfcm93ID09IGNvb3Jkcy5zdGFydF9yb3cpIHtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdyb3dfY2hhbmdlZCcsIG9sZF90ZXh0LCBjb29yZHMuc3RhcnRfcm93KTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2VkJyk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBSZW1vdmUgYSByb3cgZnJvbSB0aGUgZG9jdW1lbnQuXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSByb3dfaW5kZXhcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLnJlbW92ZV9yb3cgPSBmdW5jdGlvbihyb3dfaW5kZXgpIHtcbiAgICBpZiAoMCA8IHJvd19pbmRleCAmJiByb3dfaW5kZXggPCB0aGlzLl9yb3dzLmxlbmd0aCkge1xuICAgICAgICB2YXIgcm93c19yZW1vdmVkID0gdGhpcy5fcm93cy5zcGxpY2Uocm93X2luZGV4LCAxKTtcbiAgICAgICAgdGhpcy5fcmVzaXplZF9yb3dzKCk7XG4gICAgICAgIHRoaXMudHJpZ2dlcigncm93c19yZW1vdmVkJywgcm93c19yZW1vdmVkKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2VkJyk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBHZXRzIGEgY2h1bmsgb2YgdGV4dC5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IHN0YXJ0X3Jvd1xuICogQHBhcmFtICB7aW50ZWdlcn0gc3RhcnRfY2hhclxuICogQHBhcmFtICB7aW50ZWdlcn0gZW5kX3Jvd1xuICogQHBhcmFtICB7aW50ZWdlcn0gZW5kX2NoYXJcbiAqIEByZXR1cm4ge3N0cmluZ31cbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUuZ2V0X3RleHQgPSBmdW5jdGlvbihzdGFydF9yb3csIHN0YXJ0X2NoYXIsIGVuZF9yb3csIGVuZF9jaGFyKSB7XG4gICAgdmFyIGNvb3JkcyA9IHRoaXMudmFsaWRhdGVfY29vcmRzLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgaWYgKGNvb3Jkcy5zdGFydF9yb3c9PWNvb3Jkcy5lbmRfcm93KSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9yb3dzW2Nvb3Jkcy5zdGFydF9yb3ddLnN1YnN0cmluZyhjb29yZHMuc3RhcnRfY2hhciwgY29vcmRzLmVuZF9jaGFyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgdGV4dCA9IFtdO1xuICAgICAgICB0ZXh0LnB1c2godGhpcy5fcm93c1tjb29yZHMuc3RhcnRfcm93XS5zdWJzdHJpbmcoY29vcmRzLnN0YXJ0X2NoYXIpKTtcbiAgICAgICAgaWYgKGNvb3Jkcy5lbmRfcm93IC0gY29vcmRzLnN0YXJ0X3JvdyA+IDEpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSBjb29yZHMuc3RhcnRfcm93ICsgMTsgaSA8IGNvb3Jkcy5lbmRfcm93OyBpKyspIHtcbiAgICAgICAgICAgICAgICB0ZXh0LnB1c2godGhpcy5fcm93c1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGV4dC5wdXNoKHRoaXMuX3Jvd3NbY29vcmRzLmVuZF9yb3ddLnN1YnN0cmluZygwLCBjb29yZHMuZW5kX2NoYXIpKTtcbiAgICAgICAgcmV0dXJuIHRleHQuam9pbignXFxuJyk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBBZGQgYSByb3cgdG8gdGhlIGRvY3VtZW50XG4gKiBAcGFyYW0ge2ludGVnZXJ9IHJvd19pbmRleFxuICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBuZXcgcm93J3MgdGV4dFxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5hZGRfcm93ID0gZnVuY3Rpb24ocm93X2luZGV4LCB0ZXh0KSB7XG4gICAgdmFyIG5ld19yb3dzID0gW107XG4gICAgaWYgKHJvd19pbmRleCA+IDApIHtcbiAgICAgICAgbmV3X3Jvd3MgPSB0aGlzLl9yb3dzLnNsaWNlKDAsIHJvd19pbmRleCk7XG4gICAgfVxuICAgIG5ld19yb3dzLnB1c2godGV4dCk7XG4gICAgaWYgKHJvd19pbmRleCA8IHRoaXMuX3Jvd3MubGVuZ3RoKSB7XG4gICAgICAgIG5ld19yb3dzID0gbmV3X3Jvd3MuY29uY2F0KHRoaXMuX3Jvd3Muc2xpY2Uocm93X2luZGV4KSk7XG4gICAgfVxuXG4gICAgdGhpcy5fcm93cyA9IG5ld19yb3dzO1xuICAgIHRoaXMuX3Jlc2l6ZWRfcm93cygpO1xuICAgIHRoaXMudHJpZ2dlcigncm93c19hZGRlZCcsIHJvd19pbmRleCwgcm93X2luZGV4KTtcbiAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZWQnKTtcbn07XG5cbi8qKlxuICogVmFsaWRhdGVzIHJvdywgY2hhcmFjdGVyIGNvb3JkaW5hdGVzIGluIHRoZSBkb2N1bWVudC5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IHN0YXJ0X3Jvd1xuICogQHBhcmFtICB7aW50ZWdlcn0gc3RhcnRfY2hhclxuICogQHBhcmFtICB7aW50ZWdlcn0gKG9wdGlvbmFsKSBlbmRfcm93XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSAob3B0aW9uYWwpIGVuZF9jaGFyXG4gKiBAcmV0dXJuIHtkaWN0aW9uYXJ5fSBkaWN0aW9uYXJ5IGNvbnRhaW5pbmcgdmFsaWRhdGVkIGNvb3JkaW5hdGVzIHtzdGFydF9yb3csIFxuICogICAgICAgICAgICAgICAgICAgICAgc3RhcnRfY2hhciwgZW5kX3JvdywgZW5kX2NoYXJ9XG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLnZhbGlkYXRlX2Nvb3JkcyA9IGZ1bmN0aW9uKHN0YXJ0X3Jvdywgc3RhcnRfY2hhciwgZW5kX3JvdywgZW5kX2NoYXIpIHtcblxuICAgIC8vIE1ha2Ugc3VyZSB0aGUgdmFsdWVzIGFyZW4ndCB1bmRlZmluZWQuXG4gICAgaWYgKHN0YXJ0X3JvdyA9PT0gdW5kZWZpbmVkKSBzdGFydF9yb3cgPSAwO1xuICAgIGlmIChzdGFydF9jaGFyID09PSB1bmRlZmluZWQpIHN0YXJ0X2NoYXIgPSAwO1xuICAgIGlmIChlbmRfcm93ID09PSB1bmRlZmluZWQpIGVuZF9yb3cgPSBzdGFydF9yb3c7XG4gICAgaWYgKGVuZF9jaGFyID09PSB1bmRlZmluZWQpIGVuZF9jaGFyID0gc3RhcnRfY2hhcjtcblxuICAgIC8vIE1ha2Ugc3VyZSB0aGUgdmFsdWVzIGFyZSB3aXRoaW4gdGhlIGJvdW5kcyBvZiB0aGUgY29udGVudHMuXG4gICAgaWYgKHRoaXMuX3Jvd3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHN0YXJ0X3JvdyA9IDA7XG4gICAgICAgIHN0YXJ0X2NoYXIgPSAwO1xuICAgICAgICBlbmRfcm93ID0gMDtcbiAgICAgICAgZW5kX2NoYXIgPSAwO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChzdGFydF9yb3cgPj0gdGhpcy5fcm93cy5sZW5ndGgpIHN0YXJ0X3JvdyA9IHRoaXMuX3Jvd3MubGVuZ3RoIC0gMTtcbiAgICAgICAgaWYgKHN0YXJ0X3JvdyA8IDApIHN0YXJ0X3JvdyA9IDA7XG4gICAgICAgIGlmIChlbmRfcm93ID49IHRoaXMuX3Jvd3MubGVuZ3RoKSBlbmRfcm93ID0gdGhpcy5fcm93cy5sZW5ndGggLSAxO1xuICAgICAgICBpZiAoZW5kX3JvdyA8IDApIGVuZF9yb3cgPSAwO1xuXG4gICAgICAgIGlmIChzdGFydF9jaGFyID4gdGhpcy5fcm93c1tzdGFydF9yb3ddLmxlbmd0aCkgc3RhcnRfY2hhciA9IHRoaXMuX3Jvd3Nbc3RhcnRfcm93XS5sZW5ndGg7XG4gICAgICAgIGlmIChzdGFydF9jaGFyIDwgMCkgc3RhcnRfY2hhciA9IDA7XG4gICAgICAgIGlmIChlbmRfY2hhciA+IHRoaXMuX3Jvd3NbZW5kX3Jvd10ubGVuZ3RoKSBlbmRfY2hhciA9IHRoaXMuX3Jvd3NbZW5kX3Jvd10ubGVuZ3RoO1xuICAgICAgICBpZiAoZW5kX2NoYXIgPCAwKSBlbmRfY2hhciA9IDA7XG4gICAgfVxuXG4gICAgLy8gTWFrZSBzdXJlIHRoZSBzdGFydCBpcyBiZWZvcmUgdGhlIGVuZC5cbiAgICBpZiAoc3RhcnRfcm93ID4gZW5kX3JvdyB8fCAoc3RhcnRfcm93ID09IGVuZF9yb3cgJiYgc3RhcnRfY2hhciA+IGVuZF9jaGFyKSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3RhcnRfcm93OiBlbmRfcm93LFxuICAgICAgICAgICAgc3RhcnRfY2hhcjogZW5kX2NoYXIsXG4gICAgICAgICAgICBlbmRfcm93OiBzdGFydF9yb3csXG4gICAgICAgICAgICBlbmRfY2hhcjogc3RhcnRfY2hhcixcbiAgICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3RhcnRfcm93OiBzdGFydF9yb3csXG4gICAgICAgICAgICBzdGFydF9jaGFyOiBzdGFydF9jaGFyLFxuICAgICAgICAgICAgZW5kX3JvdzogZW5kX3JvdyxcbiAgICAgICAgICAgIGVuZF9jaGFyOiBlbmRfY2hhcixcbiAgICAgICAgfTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEdldHMgdGhlIHRleHQgb2YgdGhlIGRvY3VtZW50LlxuICogQHJldHVybiB7c3RyaW5nfVxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5fZ2V0X3RleHQgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fcm93cy5qb2luKCdcXG4nKTtcbn07XG5cbi8qKlxuICogU2V0cyB0aGUgdGV4dCBvZiB0aGUgZG9jdW1lbnQuXG4gKiBDb21wbGV4aXR5IE8oTikgZm9yIE4gcm93c1xuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlXG4gKi9cbkRvY3VtZW50TW9kZWwucHJvdG90eXBlLl9zZXRfdGV4dCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgdGhpcy5fcm93cyA9IHZhbHVlLnNwbGl0KCdcXG4nKTtcbiAgICB0aGlzLl9yZXNpemVkX3Jvd3MoKTtcbiAgICB0aGlzLnRyaWdnZXIoJ3RleHRfY2hhbmdlZCcpO1xuICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xufTtcblxuLyoqXG4gKiBVcGRhdGVzIF9yb3cncyBwYXJ0bmVyIGFycmF5cy5cbiAqIEByZXR1cm4ge251bGx9IFxuICovXG5Eb2N1bWVudE1vZGVsLnByb3RvdHlwZS5fcmVzaXplZF9yb3dzID0gZnVuY3Rpb24oKSB7XG5cbiAgICAvLyBNYWtlIHN1cmUgdGhlcmUgYXJlIGFzIG1hbnkgdGFnIHJvd3MgYXMgdGhlcmUgYXJlIHRleHQgcm93cy5cbiAgICB3aGlsZSAodGhpcy5fcm93X3RhZ3MubGVuZ3RoIDwgdGhpcy5fcm93cy5sZW5ndGgpIHtcbiAgICAgICAgdGhpcy5fcm93X3RhZ3MucHVzaChbXSk7XG4gICAgfVxuICAgIGlmICh0aGlzLl9yb3dfdGFncy5sZW5ndGggPiB0aGlzLl9yb3dzLmxlbmd0aCkge1xuICAgICAgICB0aGlzLl9yb3dfdGFncy5zcGxpY2UodGhpcy5fcm93cy5sZW5ndGgsIHRoaXMuX3Jvd190YWdzLmxlbmd0aCAtIHRoaXMuX3Jvd3MubGVuZ3RoKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIENyZWF0ZSB0aGUgZG9jdW1lbnQncyBwcm9wZXJ0aWVzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuRG9jdW1lbnRNb2RlbC5wcm90b3R5cGUuX2luaXRfcHJvcGVydGllcyA9IGZ1bmN0aW9uKCkgeyAgICBcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhpcy5wcm9wZXJ0eSgncm93cycsIGZ1bmN0aW9uKCkgeyBcbiAgICAgICAgLy8gUmV0dXJuIGEgc2hhbGxvdyBjb3B5IG9mIHRoZSBhcnJheSBzbyBpdCBjYW5ub3QgYmUgbW9kaWZpZWQuXG4gICAgICAgIHJldHVybiBbXS5jb25jYXQodGhhdC5fcm93cyk7IFxuICAgIH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ3RleHQnLCBcbiAgICAgICAgdXRpbHMucHJveHkodGhpcy5fZ2V0X3RleHQsIHRoaXMpLCBcbiAgICAgICAgdXRpbHMucHJveHkodGhpcy5fc2V0X3RleHQsIHRoaXMpKTtcbn07XG5cbmV4cG9ydHMuRG9jdW1lbnRNb2RlbCA9IERvY3VtZW50TW9kZWw7IiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xuXG4vLyBSZW5kZXJlcnNcbnZhciBiYXRjaCA9IHJlcXVpcmUoJy4vcmVuZGVyZXJzL2JhdGNoLmpzJyk7XG52YXIgaGlnaGxpZ2h0ZWRfcm93ID0gcmVxdWlyZSgnLi9yZW5kZXJlcnMvaGlnaGxpZ2h0ZWRfcm93LmpzJyk7XG52YXIgY3Vyc29ycyA9IHJlcXVpcmUoJy4vcmVuZGVyZXJzL2N1cnNvcnMuanMnKTtcbnZhciBzZWxlY3Rpb25zID0gcmVxdWlyZSgnLi9yZW5kZXJlcnMvc2VsZWN0aW9ucy5qcycpO1xudmFyIGNvbG9yID0gcmVxdWlyZSgnLi9yZW5kZXJlcnMvY29sb3IuanMnKTtcbnZhciBoaWdobGlnaHRlciA9IHJlcXVpcmUoJy4vaGlnaGxpZ2h0ZXJzL3ByaXNtLmpzJyk7XG5cbi8qKlxuICogVmlzdWFsIHJlcHJlc2VudGF0aW9uIG9mIGEgRG9jdW1lbnRNb2RlbCBpbnN0YW5jZVxuICogQHBhcmFtIHtDYW52YXN9IGNhbnZhcyBpbnN0YW5jZVxuICogQHBhcmFtIHtEb2N1bWVudE1vZGVsfSBtb2RlbCBpbnN0YW5jZVxuICogQHBhcmFtIHtDdXJzb3JzfSBjdXJzb3JzX21vZGVsIGluc3RhbmNlXG4gKiBAcGFyYW0ge1N0eWxlfSBzdHlsZSAtIGRlc2NyaWJlcyByZW5kZXJpbmcgc3R5bGVcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGhhc19mb2N1cyAtIGZ1bmN0aW9uIHRoYXQgY2hlY2tzIGlmIHRoZSB0ZXh0IGFyZWEgaGFzIGZvY3VzXG4gKi9cbnZhciBEb2N1bWVudFZpZXcgPSBmdW5jdGlvbihjYW52YXMsIG1vZGVsLCBjdXJzb3JzX21vZGVsLCBzdHlsZSwgaGFzX2ZvY3VzKSB7XG4gICAgdGhpcy5fbW9kZWwgPSBtb2RlbDtcblxuICAgIC8vIENyZWF0ZSBjaGlsZCByZW5kZXJlcnMuXG4gICAgdmFyIHJvd19yZW5kZXJlciA9IG5ldyBoaWdobGlnaHRlZF9yb3cuSGlnaGxpZ2h0ZWRSb3dSZW5kZXJlcihtb2RlbCwgY2FudmFzLCBzdHlsZSk7XG4gICAgcm93X3JlbmRlcmVyLm1hcmdpbl9sZWZ0ID0gMjtcbiAgICByb3dfcmVuZGVyZXIubWFyZ2luX3RvcCA9IDI7XG4gICAgXG4gICAgLy8gTWFrZSBzdXJlIGNoYW5nZXMgbWFkZSB0byB0aGUgY3Vyc29yKHMpIGFyZSB3aXRoaW4gdGhlIHZpc2libGUgcmVnaW9uLlxuICAgIGN1cnNvcnNfbW9kZWwub24oJ2NoYW5nZScsIGZ1bmN0aW9uKGN1cnNvcikge1xuICAgICAgICB2YXIgcm93X2luZGV4ID0gY3Vyc29yLnByaW1hcnlfcm93O1xuICAgICAgICB2YXIgY2hhcl9pbmRleCA9IGN1cnNvci5wcmltYXJ5X2NoYXI7XG5cbiAgICAgICAgdmFyIHRvcCA9IHJvd19yZW5kZXJlci5nZXRfcm93X3RvcChyb3dfaW5kZXgpO1xuICAgICAgICB2YXIgaGVpZ2h0ID0gcm93X3JlbmRlcmVyLmdldF9yb3dfaGVpZ2h0KHJvd19pbmRleCk7XG4gICAgICAgIHZhciBsZWZ0ID0gcm93X3JlbmRlcmVyLm1lYXN1cmVfcGFydGlhbF9yb3dfd2lkdGgocm93X2luZGV4LCBjaGFyX2luZGV4KSArIHJvd19yZW5kZXJlci5tYXJnaW5fbGVmdDtcbiAgICAgICAgdmFyIGJvdHRvbSA9IHRvcCArIGhlaWdodDtcblxuICAgICAgICB2YXIgY2FudmFzX2hlaWdodCA9IGNhbnZhcy5oZWlnaHQgLSAyMDtcbiAgICAgICAgaWYgKGJvdHRvbSA+IGNhbnZhcy5zY3JvbGxfdG9wICsgY2FudmFzX2hlaWdodCkge1xuICAgICAgICAgICAgY2FudmFzLnNjcm9sbF90b3AgPSBib3R0b20gLSBjYW52YXNfaGVpZ2h0O1xuICAgICAgICB9IGVsc2UgaWYgKHRvcCA8IGNhbnZhcy5zY3JvbGxfdG9wKSB7XG4gICAgICAgICAgICBjYW52YXMuc2Nyb2xsX3RvcCA9IHRvcDtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjYW52YXNfd2lkdGggPSBjYW52YXMud2lkdGggLSAyMDtcbiAgICAgICAgaWYgKGxlZnQgPiBjYW52YXMuc2Nyb2xsX2xlZnQgKyBjYW52YXNfd2lkdGgpIHtcbiAgICAgICAgICAgIGNhbnZhcy5zY3JvbGxfbGVmdCA9IGxlZnQgLSBjYW52YXNfd2lkdGg7XG4gICAgICAgIH0gZWxzZSBpZiAobGVmdCA8IGNhbnZhcy5zY3JvbGxfbGVmdCkge1xuICAgICAgICAgICAgY2FudmFzLnNjcm9sbF9sZWZ0ID0gbGVmdDtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgdmFyIGN1cnNvcnNfcmVuZGVyZXIgPSBuZXcgY3Vyc29ycy5DdXJzb3JzUmVuZGVyZXIoXG4gICAgICAgIGN1cnNvcnNfbW9kZWwsIFxuICAgICAgICBzdHlsZSwgXG4gICAgICAgIHJvd19yZW5kZXJlcixcbiAgICAgICAgaGFzX2ZvY3VzKTtcbiAgICB2YXIgc2VsZWN0aW9uc19yZW5kZXJlciA9IG5ldyBzZWxlY3Rpb25zLlNlbGVjdGlvbnNSZW5kZXJlcihcbiAgICAgICAgY3Vyc29yc19tb2RlbCwgXG4gICAgICAgIHN0eWxlLCBcbiAgICAgICAgcm93X3JlbmRlcmVyLFxuICAgICAgICBoYXNfZm9jdXMsXG4gICAgICAgIGN1cnNvcnNfcmVuZGVyZXIpO1xuXG4gICAgLy8gQ3JlYXRlIHRoZSBiYWNrZ3JvdW5kIHJlbmRlcmVyXG4gICAgdmFyIGNvbG9yX3JlbmRlcmVyID0gbmV3IGNvbG9yLkNvbG9yUmVuZGVyZXIoKTtcbiAgICBjb2xvcl9yZW5kZXJlci5jb2xvciA9IHN0eWxlLmJhY2tncm91bmQgfHwgJ3doaXRlJztcbiAgICBzdHlsZS5vbignY2hhbmdlZDpzdHlsZScsIGZ1bmN0aW9uKCkgeyBjb2xvcl9yZW5kZXJlci5jb2xvciA9IHN0eWxlLmJhY2tncm91bmQ7IH0pO1xuXG4gICAgLy8gQ3JlYXRlIHRoZSBkb2N1bWVudCBoaWdobGlnaHRlciwgd2hpY2ggbmVlZHMgdG8ga25vdyBhYm91dCB0aGUgY3VycmVudGx5XG4gICAgLy8gcmVuZGVyZWQgcm93cyBpbiBvcmRlciB0byBrbm93IHdoZXJlIHRvIGhpZ2hsaWdodC5cbiAgICB0aGlzLmhpZ2hsaWdodGVyID0gbmV3IGhpZ2hsaWdodGVyLlByaXNtSGlnaGxpZ2h0ZXIobW9kZWwsIHJvd19yZW5kZXJlcik7XG5cbiAgICAvLyBQYXNzIGdldF9yb3dfY2hhciBpbnRvIGN1cnNvcnMuXG4gICAgY3Vyc29yc19tb2RlbC5nZXRfcm93X2NoYXIgPSB1dGlscy5wcm94eShyb3dfcmVuZGVyZXIuZ2V0X3Jvd19jaGFyLCByb3dfcmVuZGVyZXIpO1xuXG4gICAgLy8gQ2FsbCBiYXNlIGNvbnN0cnVjdG9yLlxuICAgIGJhdGNoLkJhdGNoUmVuZGVyZXIuY2FsbCh0aGlzLCBbXG4gICAgICAgIGNvbG9yX3JlbmRlcmVyLFxuICAgICAgICBzZWxlY3Rpb25zX3JlbmRlcmVyLFxuICAgICAgICByb3dfcmVuZGVyZXIsXG4gICAgICAgIGN1cnNvcnNfcmVuZGVyZXIsXG4gICAgXSwgY2FudmFzKTtcblxuICAgIC8vIEhvb2t1cCByZW5kZXIgZXZlbnRzLlxuICAgIHRoaXMuX2NhbnZhcy5vbigncmVkcmF3JywgdXRpbHMucHJveHkodGhpcy5yZW5kZXIsIHRoaXMpKTtcbiAgICB0aGlzLl9tb2RlbC5vbignY2hhbmdlZCcsIHV0aWxzLnByb3h5KGNhbnZhcy5yZWRyYXcsIGNhbnZhcykpO1xuXG4gICAgLy8gQ3JlYXRlIHByb3BlcnRpZXNcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhpcy5wcm9wZXJ0eSgnbGFuZ3VhZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQuX2xhbmd1YWdlO1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuaGlnaGxpZ2h0ZXIubG9hZCh2YWx1ZSk7XG4gICAgICAgIHRoYXQuX2xhbmd1YWdlID0gdmFsdWU7XG4gICAgfSk7XG59O1xudXRpbHMuaW5oZXJpdChEb2N1bWVudFZpZXcsIGJhdGNoLkJhdGNoUmVuZGVyZXIpO1xuXG5leHBvcnRzLkRvY3VtZW50VmlldyA9IERvY3VtZW50VmlldzsiLCIvLyBPU1ggYmluZGluZ3NcbmlmIChuYXZpZ2F0b3IuYXBwVmVyc2lvbi5pbmRleE9mKFwiTWFjXCIpICE9IC0xKSB7XG4gICAgZXhwb3J0cy5tYXAgPSB7XG4gICAgICAgICdhbHQtbGVmdGFycm93JyA6ICdjdXJzb3Iud29yZF9sZWZ0JyxcbiAgICAgICAgJ2FsdC1yaWdodGFycm93JyA6ICdjdXJzb3Iud29yZF9yaWdodCcsXG4gICAgICAgICdzaGlmdC1hbHQtbGVmdGFycm93JyA6ICdjdXJzb3Iuc2VsZWN0X3dvcmRfbGVmdCcsXG4gICAgICAgICdzaGlmdC1hbHQtcmlnaHRhcnJvdycgOiAnY3Vyc29yLnNlbGVjdF93b3JkX3JpZ2h0JyxcbiAgICAgICAgJ2FsdC1iYWNrc3BhY2UnIDogJ2N1cnNvci5kZWxldGVfd29yZF9sZWZ0JyxcbiAgICAgICAgJ2FsdC1kZWxldGUnIDogJ2N1cnNvci5kZWxldGVfd29yZF9yaWdodCcsXG4gICAgICAgICdtZXRhLWxlZnRhcnJvdycgOiAnY3Vyc29yLmxpbmVfc3RhcnQnLFxuICAgICAgICAnbWV0YS1yaWdodGFycm93JyA6ICdjdXJzb3IubGluZV9lbmQnLFxuICAgICAgICAnc2hpZnQtbWV0YS1sZWZ0YXJyb3cnIDogJ2N1cnNvci5zZWxlY3RfbGluZV9zdGFydCcsXG4gICAgICAgICdzaGlmdC1tZXRhLXJpZ2h0YXJyb3cnIDogJ2N1cnNvci5zZWxlY3RfbGluZV9lbmQnLFxuICAgICAgICAnbWV0YS1hJyA6ICdjdXJzb3Iuc2VsZWN0X2FsbCcsXG4gICAgfTtcblxuLy8gTm9uIE9TWCBiaW5kaW5nc1xufSBlbHNlIHtcbiAgICBleHBvcnRzLm1hcCA9IHtcbiAgICAgICAgJ2N0cmwtbGVmdGFycm93JyA6ICdjdXJzb3Iud29yZF9sZWZ0JyxcbiAgICAgICAgJ2N0cmwtcmlnaHRhcnJvdycgOiAnY3Vyc29yLndvcmRfcmlnaHQnLFxuICAgICAgICAnY3RybC1iYWNrc3BhY2UnIDogJ2N1cnNvci5kZWxldGVfd29yZF9sZWZ0JyxcbiAgICAgICAgJ2N0cmwtZGVsZXRlJyA6ICdjdXJzb3IuZGVsZXRlX3dvcmRfcmlnaHQnLFxuICAgICAgICAnc2hpZnQtY3RybC1sZWZ0YXJyb3cnIDogJ2N1cnNvci5zZWxlY3Rfd29yZF9sZWZ0JyxcbiAgICAgICAgJ3NoaWZ0LWN0cmwtcmlnaHRhcnJvdycgOiAnY3Vyc29yLnNlbGVjdF93b3JkX3JpZ2h0JyxcbiAgICAgICAgJ2hvbWUnIDogJ2N1cnNvci5saW5lX3N0YXJ0JyxcbiAgICAgICAgJ2VuZCcgOiAnY3Vyc29yLmxpbmVfZW5kJyxcbiAgICAgICAgJ3NoaWZ0LWhvbWUnIDogJ2N1cnNvci5zZWxlY3RfbGluZV9zdGFydCcsXG4gICAgICAgICdzaGlmdC1lbmQnIDogJ2N1cnNvci5zZWxlY3RfbGluZV9lbmQnLFxuICAgICAgICAnY3RybC1hJyA6ICdjdXJzb3Iuc2VsZWN0X2FsbCcsXG4gICAgfTtcblxufVxuXG4vLyBDb21tb24gYmluZGluZ3NcbmV4cG9ydHMubWFwWydrZXlwcmVzcyddID0gJ2N1cnNvci5rZXlwcmVzcyc7XG5leHBvcnRzLm1hcFsnZW50ZXInXSA9ICdjdXJzb3IubmV3bGluZSc7XG5leHBvcnRzLm1hcFsnZGVsZXRlJ10gPSAnY3Vyc29yLmRlbGV0ZV9mb3J3YXJkJztcbmV4cG9ydHMubWFwWydiYWNrc3BhY2UnXSA9ICdjdXJzb3IuZGVsZXRlX2JhY2t3YXJkJztcbmV4cG9ydHMubWFwWydsZWZ0YXJyb3cnXSA9ICdjdXJzb3IubGVmdCc7XG5leHBvcnRzLm1hcFsncmlnaHRhcnJvdyddID0gJ2N1cnNvci5yaWdodCc7XG5leHBvcnRzLm1hcFsndXBhcnJvdyddID0gJ2N1cnNvci51cCc7XG5leHBvcnRzLm1hcFsnZG93bmFycm93J10gPSAnY3Vyc29yLmRvd24nO1xuZXhwb3J0cy5tYXBbJ3NoaWZ0LWxlZnRhcnJvdyddID0gJ2N1cnNvci5zZWxlY3RfbGVmdCc7XG5leHBvcnRzLm1hcFsnc2hpZnQtcmlnaHRhcnJvdyddID0gJ2N1cnNvci5zZWxlY3RfcmlnaHQnO1xuZXhwb3J0cy5tYXBbJ3NoaWZ0LXVwYXJyb3cnXSA9ICdjdXJzb3Iuc2VsZWN0X3VwJztcbmV4cG9ydHMubWFwWydzaGlmdC1kb3duYXJyb3cnXSA9ICdjdXJzb3Iuc2VsZWN0X2Rvd24nO1xuZXhwb3J0cy5tYXBbJ21vdXNlMC1kYmxjbGljayddID0gJ2N1cnNvcnMuc2VsZWN0X3dvcmQnO1xuZXhwb3J0cy5tYXBbJ21vdXNlMC1kb3duJ10gPSAnY3Vyc29ycy5zdGFydF9zZWxlY3Rpb24nO1xuZXhwb3J0cy5tYXBbJ21vdXNlLW1vdmUnXSA9ICdjdXJzb3JzLnNldF9zZWxlY3Rpb24nO1xuZXhwb3J0cy5tYXBbJ21vdXNlMC11cCddID0gJ2N1cnNvcnMuZW5kX3NlbGVjdGlvbic7XG5leHBvcnRzLm1hcFsnc2hpZnQtbW91c2UwLXVwJ10gPSAnY3Vyc29ycy5lbmRfc2VsZWN0aW9uJztcbmV4cG9ydHMubWFwWydzaGlmdC1tb3VzZTAtZG93biddID0gJ2N1cnNvcnMuc3RhcnRfc2V0X3NlbGVjdGlvbic7XG5leHBvcnRzLm1hcFsnc2hpZnQtbW91c2UtbW92ZSddID0gJ2N1cnNvcnMuc2V0X3NlbGVjdGlvbic7XG5leHBvcnRzLm1hcFsndGFiJ10gPSAnY3Vyc29yLmluZGVudCc7XG5leHBvcnRzLm1hcFsnc2hpZnQtdGFiJ10gPSAnY3Vyc29yLnVuaW5kZW50JztcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpO1xuXG4vKipcbiAqIEV2ZW50IG5vcm1hbGl6ZXJcbiAqXG4gKiBMaXN0ZW5zIHRvIERPTSBldmVudHMgYW5kIGVtaXRzICdjbGVhbmVkJyB2ZXJzaW9ucyBvZiB0aG9zZSBldmVudHMuXG4gKi9cbnZhciBNYXAgPSBmdW5jdGlvbihub3JtYWxpemVyKSB7XG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzKTtcbiAgICB0aGlzLl9tYXAgPSB7fTtcblxuICAgIC8vIENyZWF0ZSBub3JtYWxpemVyIHByb3BlcnR5XG4gICAgdGhpcy5fbm9ybWFsaXplciA9IG51bGw7XG4gICAgdGhpcy5fcHJveHlfaGFuZGxlX2V2ZW50ID0gdXRpbHMucHJveHkodGhpcy5faGFuZGxlX2V2ZW50LCB0aGlzKTtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhpcy5wcm9wZXJ0eSgnbm9ybWFsaXplcicsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fbm9ybWFsaXplcjtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAvLyBSZW1vdmUgZXZlbnQgaGFuZGxlci5cbiAgICAgICAgaWYgKHRoYXQuX25vcm1hbGl6ZXIpIHRoYXQuX25vcm1hbGl6ZXIub2ZmX2FsbCh0aGF0Ll9wcm94eV9oYW5kbGVfZXZlbnQpO1xuICAgICAgICAvLyBTZXQsIGFuZCBhZGQgZXZlbnQgaGFuZGxlci5cbiAgICAgICAgdGhhdC5fbm9ybWFsaXplciA9IHZhbHVlO1xuICAgICAgICBpZiAodmFsdWUpIHZhbHVlLm9uX2FsbCh0aGF0Ll9wcm94eV9oYW5kbGVfZXZlbnQpO1xuICAgIH0pO1xuXG4gICAgLy8gSWYgZGVmaW5lZCwgc2V0IHRoZSBub3JtYWxpemVyLlxuICAgIGlmIChub3JtYWxpemVyKSB0aGlzLm5vcm1hbGl6ZXIgPSBub3JtYWxpemVyO1xufTtcbnV0aWxzLmluaGVyaXQoTWFwLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8qKlxuICogTWFwIG9mIEFQSSBtZXRob2RzIGJ5IG5hbWUuXG4gKiBAdHlwZSB7ZGljdGlvbmFyeX1cbiAqL1xuTWFwLnJlZ2lzdHJ5ID0ge307XG5NYXAuX3JlZ2lzdHJ5X3RhZ3MgPSB7fTtcblxuLyoqXG4gKiBSZWdpc3RlcnMgYW4gYWN0aW9uLlxuICogQHBhcmFtICB7c3RyaW5nfSBuYW1lIC0gbmFtZSBvZiB0aGUgYWN0aW9uXG4gKiBAcGFyYW0gIHtmdW5jdGlvbn0gZlxuICogQHBhcmFtICB7T2JqZWN0fSAob3B0aW9uYWwpIHRhZyAtIGFsbG93cyB5b3UgdG8gc3BlY2lmeSBhIHRhZ1xuICogICAgICAgICAgICAgICAgICB3aGljaCBjYW4gYmUgdXNlZCB3aXRoIHRoZSBgdW5yZWdpc3Rlcl9ieV90YWdgXG4gKiAgICAgICAgICAgICAgICAgIG1ldGhvZCB0byBxdWlja2x5IHVucmVnaXN0ZXIgYWN0aW9ucyB3aXRoXG4gKiAgICAgICAgICAgICAgICAgIHRoZSB0YWcgc3BlY2lmaWVkLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTWFwLnJlZ2lzdGVyID0gZnVuY3Rpb24obmFtZSwgZiwgdGFnKSB7XG4gICAgaWYgKHV0aWxzLmlzX2FycmF5KE1hcC5yZWdpc3RyeVtuYW1lXSkpIHtcbiAgICAgICAgTWFwLnJlZ2lzdHJ5W25hbWVdLnB1c2goZik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKE1hcC5yZWdpc3RyeVtuYW1lXT09PXVuZGVmaW5lZCkge1xuICAgICAgICAgICAgTWFwLnJlZ2lzdHJ5W25hbWVdID0gZjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIE1hcC5yZWdpc3RyeVtuYW1lXSA9IFtNYXAucmVnaXN0cnlbbmFtZV0sIGZdO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRhZykge1xuICAgICAgICBpZiAoTWFwLl9yZWdpc3RyeV90YWdzW3RhZ10gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgTWFwLl9yZWdpc3RyeV90YWdzW3RhZ10gPSBbXTtcbiAgICAgICAgfVxuICAgICAgICBNYXAuX3JlZ2lzdHJ5X3RhZ3NbdGFnXS5wdXNoKHtuYW1lOiBuYW1lLCBmOiBmfSk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBVbnJlZ2lzdGVyIGFuIGFjdGlvbi5cbiAqIEBwYXJhbSAge3N0cmluZ30gbmFtZSAtIG5hbWUgb2YgdGhlIGFjdGlvblxuICogQHBhcmFtICB7ZnVuY3Rpb259IGZcbiAqIEByZXR1cm4ge2Jvb2xlYW59IHRydWUgaWYgYWN0aW9uIHdhcyBmb3VuZCBhbmQgdW5yZWdpc3RlcmVkXG4gKi9cbk1hcC51bnJlZ2lzdGVyID0gZnVuY3Rpb24obmFtZSwgZikge1xuICAgIGlmICh1dGlscy5pc19hcnJheShNYXAucmVnaXN0cnlbbmFtZV0pKSB7XG4gICAgICAgIHZhciBpbmRleCA9IE1hcC5yZWdpc3RyeVtuYW1lXS5pbmRleE9mKGYpO1xuICAgICAgICBpZiAoaW5kZXggIT0gLTEpIHtcbiAgICAgICAgICAgIE1hcC5yZWdpc3RyeVtuYW1lXS5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKE1hcC5yZWdpc3RyeVtuYW1lXSA9PSBmKSB7XG4gICAgICAgIGRlbGV0ZSBNYXAucmVnaXN0cnlbbmFtZV07XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKipcbiAqIFVucmVnaXN0ZXJzIGFsbCBvZiB0aGUgYWN0aW9ucyByZWdpc3RlcmVkIHdpdGggYSBnaXZlbiB0YWcuXG4gKiBAcGFyYW0gIHtPYmplY3R9IHRhZyAtIHNwZWNpZmllZCBpbiBNYXAucmVnaXN0ZXIuXG4gKiBAcmV0dXJuIHtib29sZWFufSB0cnVlIGlmIHRoZSB0YWcgd2FzIGZvdW5kIGFuZCBkZWxldGVkLlxuICovXG5NYXAudW5yZWdpc3Rlcl9ieV90YWcgPSBmdW5jdGlvbih0YWcpIHtcbiAgICBpZiAoTWFwLl9yZWdpc3RyeV90YWdzW3RhZ10pIHtcbiAgICAgICAgTWFwLl9yZWdpc3RyeV90YWdzW3RhZ10uZm9yRWFjaChmdW5jdGlvbihyZWdpc3RyYXRpb24pIHtcbiAgICAgICAgICAgIE1hcC51bnJlZ2lzdGVyKHJlZ2lzdHJhdGlvbi5uYW1lLCByZWdpc3RyYXRpb24uZik7XG4gICAgICAgIH0pO1xuICAgICAgICBkZWxldGUgTWFwLl9yZWdpc3RyeV90YWdzW3RhZ107XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbn07XG5cbi8qKlxuICogQXBwZW5kIGV2ZW50IGFjdGlvbnMgdG8gdGhlIG1hcC5cbiAqXG4gKiBUaGlzIG1ldGhvZCBoYXMgdHdvIHNpZ25hdHVyZXMuICBJZiBhIHNpbmdsZSBhcmd1bWVudFxuICogaXMgcGFzc2VkIHRvIGl0LCB0aGF0IGFyZ3VtZW50IGlzIHRyZWF0ZWQgbGlrZSBhXG4gKiBkaWN0aW9uYXJ5LiAgSWYgbW9yZSB0aGFuIG9uZSBhcmd1bWVudCBpcyBwYXNzZWQgdG8gaXQsXG4gKiBlYWNoIGFyZ3VtZW50IGlzIHRyZWF0ZWQgYXMgYWx0ZXJuYXRpbmcga2V5LCB2YWx1ZVxuICogcGFpcnMgb2YgYSBkaWN0aW9uYXJ5LlxuICpcbiAqIFRoZSBtYXAgYWxsb3dzIHlvdSB0byByZWdpc3RlciBhY3Rpb25zIGZvciBrZXlzLlxuICogRXhhbXBsZTpcbiAqICAgICBtYXAuYXBwZW5kX21hcCh7XG4gKiAgICAgICAgICdjdHJsLWEnOiAnY3Vyc29ycy5zZWxlY3RfYWxsJyxcbiAqICAgICB9KVxuICpcbiAqIE11bHRpcGxlIGFjdGlvbnMgY2FuIGJlIHJlZ2lzdGVyZWQgZm9yIGEgc2luZ2xlIGV2ZW50LlxuICogVGhlIGFjdGlvbnMgYXJlIGV4ZWN1dGVkIHNlcXVlbnRpYWxseSwgdW50aWwgb25lIGFjdGlvblxuICogcmV0dXJucyBgdHJ1ZWAgaW4gd2hpY2ggY2FzZSB0aGUgZXhlY3V0aW9uIGhhdWx0cy4gIFRoaXNcbiAqIGFsbG93cyBhY3Rpb25zIHRvIHJ1biBjb25kaXRpb25hbGx5LlxuICogRXhhbXBsZTpcbiAqICAgICAvLyBJbXBsZW1lbnRpbmcgYSBkdWFsIG1vZGUgZWRpdG9yLCB5b3UgbWF5IGhhdmUgdHdvXG4gKiAgICAgLy8gZnVuY3Rpb25zIHRvIHJlZ2lzdGVyIGZvciBvbmUga2V5LiBpLmUuOlxuICogICAgIHZhciBkb19hID0gZnVuY3Rpb24oZSkge1xuICogICAgICAgICBpZiAobW9kZT09J2VkaXQnKSB7XG4gKiAgICAgICAgICAgICBjb25zb2xlLmxvZygnQScpO1xuICogICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gKiAgICAgICAgIH1cbiAqICAgICB9XG4gKiAgICAgdmFyIGRvX2IgPSBmdW5jdGlvbihlKSB7XG4gKiAgICAgICAgIGlmIChtb2RlPT0nY29tbWFuZCcpIHtcbiAqICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdCJyk7XG4gKiAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAqICAgICAgICAgfVxuICogICAgIH1cbiAqXG4gKiAgICAgLy8gVG8gcmVnaXN0ZXIgYm90aCBmb3Igb25lIGtleVxuICogICAgIE1hcC5yZWdpc3RlcignYWN0aW9uX2EnLCBkb19hKTtcbiAqICAgICBNYXAucmVnaXN0ZXIoJ2FjdGlvbl9iJywgZG9fYik7XG4gKiAgICAgbWFwLmFwcGVuZF9tYXAoe1xuICogICAgICAgICAnYWx0LXYnOiBbJ2FjdGlvbl9hJywgJ2FjdGlvbl9iJ10sXG4gKiAgICAgfSk7XG4gKiBcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbk1hcC5wcm90b3R5cGUuYXBwZW5kX21hcCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB2YXIgcGFyc2VkID0gdGhpcy5fcGFyc2VfbWFwX2FyZ3VtZW50cyhhcmd1bWVudHMpO1xuICAgIE9iamVjdC5rZXlzKHBhcnNlZCkuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgaWYgKHRoYXQuX21hcFtrZXldID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRoYXQuX21hcFtrZXldID0gcGFyc2VkW2tleV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGF0Ll9tYXBba2V5XSA9IHRoYXQuX21hcFtrZXldLmNvbmNhdChwYXJzZWRba2V5XSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbi8qKlxuICogQWxpYXMgZm9yIGBhcHBlbmRfbWFwYC5cbiAqIEB0eXBlIHtmdW5jdGlvbn1cbiAqL1xuTWFwLnByb3RvdHlwZS5tYXAgPSBNYXAucHJvdG90eXBlLmFwcGVuZF9tYXA7XG5cbi8qKlxuICogUHJlcGVuZCBldmVudCBhY3Rpb25zIHRvIHRoZSBtYXAuXG4gKlxuICogU2VlIHRoZSBkb2MgZm9yIGBhcHBlbmRfbWFwYCBmb3IgYSBkZXRhaWxlZCBkZXNjcmlwdGlvbiBvZlxuICogcG9zc2libGUgaW5wdXQgdmFsdWVzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTWFwLnByb3RvdHlwZS5wcmVwZW5kX21hcCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB2YXIgcGFyc2VkID0gdGhpcy5fcGFyc2VfbWFwX2FyZ3VtZW50cyhhcmd1bWVudHMpO1xuICAgIE9iamVjdC5rZXlzKHBhcnNlZCkuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgaWYgKHRoYXQuX21hcFtrZXldID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRoYXQuX21hcFtrZXldID0gcGFyc2VkW2tleV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGF0Ll9tYXBba2V5XSA9IHBhcnNlZFtrZXldLmNvbmNhdCh0aGF0Ll9tYXBba2V5XSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbi8qKlxuICogVW5tYXAgZXZlbnQgYWN0aW9ucyBpbiB0aGUgbWFwLlxuICpcbiAqIFNlZSB0aGUgZG9jIGZvciBgYXBwZW5kX21hcGAgZm9yIGEgZGV0YWlsZWQgZGVzY3JpcHRpb24gb2ZcbiAqIHBvc3NpYmxlIGlucHV0IHZhbHVlcy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbk1hcC5wcm90b3R5cGUudW5tYXAgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdmFyIHBhcnNlZCA9IHRoaXMuX3BhcnNlX21hcF9hcmd1bWVudHMoYXJndW1lbnRzKTtcbiAgICBPYmplY3Qua2V5cyhwYXJzZWQpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIGlmICh0aGF0Ll9tYXBba2V5XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBwYXJzZWRba2V5XS5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdmFyIGluZGV4ID0gdGhhdC5fbWFwW2tleV0uaW5kZXhPZih2YWx1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKGluZGV4ICE9IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQuX21hcFtrZXldLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbi8qKlxuICogR2V0IGEgbW9kaWZpYWJsZSBhcnJheSBvZiB0aGUgYWN0aW9ucyBmb3IgYSBwYXJ0aWN1bGFyIGV2ZW50LlxuICogQHBhcmFtICB7c3RyaW5nfSBldmVudFxuICogQHJldHVybiB7YXJyYXl9IGJ5IHJlZiBjb3B5IG9mIHRoZSBhY3Rpb25zIHJlZ2lzdGVyZWQgdG8gYW4gZXZlbnQuXG4gKi9cbk1hcC5wcm90b3R5cGUuZ2V0X21hcHBpbmcgPSBmdW5jdGlvbihldmVudCkge1xuICAgIHJldHVybiB0aGlzLl9tYXBbdGhpcy5fbm9ybWFsaXplX2V2ZW50X25hbWUoZXZlbnQpXTtcbn07XG5cbi8qKlxuICogUGFyc2UgdGhlIGFyZ3VtZW50cyB0byBhIG1hcCBmdW5jdGlvbi5cbiAqIEBwYXJhbSAge2FyZ3VtZW50cyBhcnJheX0gYXJnc1xuICogQHJldHVybiB7ZGljdGlvbmFyeX0gcGFyc2VkIHJlc3VsdHNcbiAqL1xuTWFwLnByb3RvdHlwZS5fcGFyc2VfbWFwX2FyZ3VtZW50cyA9IGZ1bmN0aW9uKGFyZ3MpIHtcbiAgICB2YXIgcGFyc2VkID0ge307XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuXG4gICAgLy8gT25lIGFydW1lbnQsIHRyZWF0IGl0IGFzIGEgZGljdGlvbmFyeSBvZiBldmVudCBuYW1lcyBhbmRcbiAgICAvLyBhY3Rpb25zLlxuICAgIGlmIChhcmdzLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgIE9iamVjdC5rZXlzKGFyZ3NbMF0pLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBhcmdzWzBdW2tleV07XG4gICAgICAgICAgICB2YXIgbm9ybWFsaXplZF9rZXkgPSB0aGF0Ll9ub3JtYWxpemVfZXZlbnRfbmFtZShrZXkpO1xuXG4gICAgICAgICAgICAvLyBJZiB0aGUgdmFsdWUgaXMgbm90IGFuIGFycmF5LCB3cmFwIGl0IGluIG9uZS5cbiAgICAgICAgICAgIGlmICghdXRpbHMuaXNfYXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBbdmFsdWVdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBJZiB0aGUga2V5IGlzIGFscmVhZHkgZGVmaW5lZCwgY29uY2F0IHRoZSB2YWx1ZXMgdG9cbiAgICAgICAgICAgIC8vIGl0LiAgT3RoZXJ3aXNlLCBzZXQgaXQuXG4gICAgICAgICAgICBpZiAocGFyc2VkW25vcm1hbGl6ZWRfa2V5XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgcGFyc2VkW25vcm1hbGl6ZWRfa2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwYXJzZWRbbm9ybWFsaXplZF9rZXldID0gcGFyc2VkW25vcm1hbGl6ZWRfa2V5XS5jb25jYXQodmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgIC8vIE1vcmUgdGhhbiBvbmUgYXJndW1lbnQuICBUcmVhdCBhcyB0aGUgZm9ybWF0OlxuICAgIC8vIGV2ZW50X25hbWUxLCBhY3Rpb24xLCBldmVudF9uYW1lMiwgYWN0aW9uMiwgLi4uLCBldmVudF9uYW1lTiwgYWN0aW9uTlxuICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAodmFyIGk9MDsgaTxNYXRoLmZsb29yKGFyZ3MubGVuZ3RoLzIpOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBrZXkgPSB0aGF0Ll9ub3JtYWxpemVfZXZlbnRfbmFtZShhcmdzWzIqaV0pO1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gYXJnc1syKmkgKyAxXTtcbiAgICAgICAgICAgIGlmIChwYXJzZWRba2V5XT09PXVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHBhcnNlZFtrZXldID0gW3ZhbHVlXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcGFyc2VkW2tleV0ucHVzaCh2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHBhcnNlZDtcbn07XG5cbi8qKlxuICogSGFuZGxlcyBhIG5vcm1hbGl6ZWQgZXZlbnQuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IG5hbWUgLSBuYW1lIG9mIHRoZSBldmVudFxuICogQHBhcmFtICB7RXZlbnR9IGUgLSBicm93c2VyIEV2ZW50IG9iamVjdFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTWFwLnByb3RvdHlwZS5faGFuZGxlX2V2ZW50ID0gZnVuY3Rpb24obmFtZSwgZSkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB2YXIgbm9ybWFsaXplZF9ldmVudCA9IHRoaXMuX25vcm1hbGl6ZV9ldmVudF9uYW1lKG5hbWUpO1xuICAgIHZhciBhY3Rpb25zID0gdGhpcy5fbWFwW25vcm1hbGl6ZWRfZXZlbnRdO1xuICAgIGlmIChhY3Rpb25zKSB7XG4gICAgICAgIGFjdGlvbnMuZm9yRWFjaChmdW5jdGlvbihhY3Rpb24pIHtcbiAgICAgICAgICAgIHZhciBhY3Rpb25fY2FsbGJhY2tzID0gTWFwLnJlZ2lzdHJ5W2FjdGlvbl07XG4gICAgICAgICAgICBpZiAoYWN0aW9uX2NhbGxiYWNrcykge1xuICAgICAgICAgICAgICAgIGlmICh1dGlscy5pc19hcnJheShhY3Rpb25fY2FsbGJhY2tzKSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmV0dXJucyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBhY3Rpb25fY2FsbGJhY2tzLmZvckVhY2goZnVuY3Rpb24oYWN0aW9uX2NhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm5zLmFwcGVuZChhY3Rpb25fY2FsbGJhY2suY2FsbCh1bmRlZmluZWQsIGUpPT09dHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIElmIG9uZSBvZiB0aGUgYWN0aW9uIGNhbGxiYWNrcyByZXR1cm5lZCB0cnVlLCBjYW5jZWwgYnViYmxpbmcuXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXR1cm5zLnNvbWUoZnVuY3Rpb24oeCkge3JldHVybiB4O30pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dGlscy5jYW5jZWxfYnViYmxlKGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYWN0aW9uX2NhbGxiYWNrcy5jYWxsKHVuZGVmaW5lZCwgZSk9PT10cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dGlscy5jYW5jZWxfYnViYmxlKGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKipcbiAqIEFscGhhYmV0aWNhbGx5IHNvcnRzIGtleXMgaW4gZXZlbnQgbmFtZSwgc29cbiAqIEBwYXJhbSAge3N0cmluZ30gbmFtZSAtIGV2ZW50IG5hbWVcbiAqIEByZXR1cm4ge3N0cmluZ30gbm9ybWFsaXplZCBldmVudCBuYW1lXG4gKi9cbk1hcC5wcm90b3R5cGUuX25vcm1hbGl6ZV9ldmVudF9uYW1lID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiBuYW1lLnRvTG93ZXJDYXNlKCkudHJpbSgpLnNwbGl0KCctJykuc29ydCgpLmpvaW4oJy0nKTtcbn07XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuTWFwID0gTWFwO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJyk7XG5cbi8qKlxuICogRXZlbnQgbm9ybWFsaXplclxuICpcbiAqIExpc3RlbnMgdG8gRE9NIGV2ZW50cyBhbmQgZW1pdHMgJ2NsZWFuZWQnIHZlcnNpb25zIG9mIHRob3NlIGV2ZW50cy5cbiAqL1xudmFyIE5vcm1hbGl6ZXIgPSBmdW5jdGlvbigpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX2VsX2hvb2tzID0ge307XG59O1xudXRpbHMuaW5oZXJpdChOb3JtYWxpemVyLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8qKlxuICogTGlzdGVuIHRvIHRoZSBldmVudHMgb2YgYW4gZWxlbWVudC5cbiAqIEBwYXJhbSAge0hUTUxFbGVtZW50fSBlbFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTm9ybWFsaXplci5wcm90b3R5cGUubGlzdGVuX3RvID0gZnVuY3Rpb24oZWwpIHtcbiAgICB2YXIgaG9va3MgPSBbXTtcbiAgICBob29rcy5wdXNoKHV0aWxzLmhvb2soZWwsICdvbmtleXByZXNzJywgdGhpcy5fcHJveHkoJ3ByZXNzJywgdGhpcy5faGFuZGxlX2tleXByZXNzX2V2ZW50LCBlbCkpKTtcbiAgICBob29rcy5wdXNoKHV0aWxzLmhvb2soZWwsICdvbmtleWRvd24nLCAgdGhpcy5fcHJveHkoJ2Rvd24nLCB0aGlzLl9oYW5kbGVfa2V5Ym9hcmRfZXZlbnQsIGVsKSkpO1xuICAgIGhvb2tzLnB1c2godXRpbHMuaG9vayhlbCwgJ29ua2V5dXAnLCAgdGhpcy5fcHJveHkoJ3VwJywgdGhpcy5faGFuZGxlX2tleWJvYXJkX2V2ZW50LCBlbCkpKTtcbiAgICBob29rcy5wdXNoKHV0aWxzLmhvb2soZWwsICdvbmRibGNsaWNrJywgIHRoaXMuX3Byb3h5KCdkYmxjbGljaycsIHRoaXMuX2hhbmRsZV9tb3VzZV9ldmVudCwgZWwpKSk7XG4gICAgaG9va3MucHVzaCh1dGlscy5ob29rKGVsLCAnb25jbGljaycsICB0aGlzLl9wcm94eSgnY2xpY2snLCB0aGlzLl9oYW5kbGVfbW91c2VfZXZlbnQsIGVsKSkpO1xuICAgIGhvb2tzLnB1c2godXRpbHMuaG9vayhlbCwgJ29ubW91c2Vkb3duJywgIHRoaXMuX3Byb3h5KCdkb3duJywgdGhpcy5faGFuZGxlX21vdXNlX2V2ZW50LCBlbCkpKTtcbiAgICBob29rcy5wdXNoKHV0aWxzLmhvb2soZWwsICdvbm1vdXNldXAnLCAgdGhpcy5fcHJveHkoJ3VwJywgdGhpcy5faGFuZGxlX21vdXNlX2V2ZW50LCBlbCkpKTtcbiAgICBob29rcy5wdXNoKHV0aWxzLmhvb2soZWwsICdvbm1vdXNlbW92ZScsICB0aGlzLl9wcm94eSgnbW92ZScsIHRoaXMuX2hhbmRsZV9tb3VzZW1vdmVfZXZlbnQsIGVsKSkpO1xuICAgIHRoaXMuX2VsX2hvb2tzW2VsXSA9IGhvb2tzO1xufTtcblxuLyoqXG4gKiBTdG9wcyBsaXN0ZW5pbmcgdG8gYW4gZWxlbWVudC5cbiAqIEBwYXJhbSAge0hUTUxFbGVtZW50fSBlbFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTm9ybWFsaXplci5wcm90b3R5cGUuc3RvcF9saXN0ZW5pbmdfdG8gPSBmdW5jdGlvbihlbCkge1xuICAgIGlmICh0aGlzLl9lbF9ob29rc1tlbF0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLl9lbF9ob29rc1tlbF0uZm9yRWFjaChmdW5jdGlvbihob29rKSB7XG4gICAgICAgICAgICBob29rLnVuaG9vaygpO1xuICAgICAgICB9KTtcbiAgICAgICAgZGVsZXRlIHRoaXMuX2VsX2hvb2tzW2VsXTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgd2hlbiBhIG1vdXNlIGV2ZW50IG9jY3Vyc1xuICogQHBhcmFtICB7SFRNTEVsZW1lbnR9IGVsXG4gKiBAcGFyYW0gIHtFdmVudH0gZVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTm9ybWFsaXplci5wcm90b3R5cGUuX2hhbmRsZV9tb3VzZV9ldmVudCA9IGZ1bmN0aW9uKGVsLCBldmVudF9uYW1lLCBlKSB7XG4gICAgZSA9IGUgfHwgd2luZG93LmV2ZW50O1xuICAgIHRoaXMudHJpZ2dlcih0aGlzLl9tb2RpZmllcl9zdHJpbmcoZSkgKyAnbW91c2UnICsgZS5idXR0b24gKyAnLScgKyBldmVudF9uYW1lLCBlKTtcbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIGEgbW91c2UgZXZlbnQgb2NjdXJzXG4gKiBAcGFyYW0gIHtIVE1MRWxlbWVudH0gZWxcbiAqIEBwYXJhbSAge0V2ZW50fSBlXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Ob3JtYWxpemVyLnByb3RvdHlwZS5faGFuZGxlX21vdXNlbW92ZV9ldmVudCA9IGZ1bmN0aW9uKGVsLCBldmVudF9uYW1lLCBlKSB7XG4gICAgZSA9IGUgfHwgd2luZG93LmV2ZW50O1xuICAgIHRoaXMudHJpZ2dlcih0aGlzLl9tb2RpZmllcl9zdHJpbmcoZSkgKyAnbW91c2UnICsgJy0nICsgZXZlbnRfbmFtZSwgZSk7XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgd2hlbiBhIGtleWJvYXJkIGV2ZW50IG9jY3Vyc1xuICogQHBhcmFtICB7SFRNTEVsZW1lbnR9IGVsXG4gKiBAcGFyYW0gIHtFdmVudH0gZVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuTm9ybWFsaXplci5wcm90b3R5cGUuX2hhbmRsZV9rZXlib2FyZF9ldmVudCA9IGZ1bmN0aW9uKGVsLCBldmVudF9uYW1lLCBlKSB7XG4gICAgZSA9IGUgfHwgd2luZG93LmV2ZW50O1xuICAgIHZhciBrZXluYW1lID0gdGhpcy5fbG9va3VwX2tleWNvZGUoZS5rZXlDb2RlKTtcbiAgICBpZiAoa2V5bmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMudHJpZ2dlcih0aGlzLl9tb2RpZmllcl9zdHJpbmcoZSkgKyBrZXluYW1lICsgJy0nICsgZXZlbnRfbmFtZSwgZSk7XG5cbiAgICAgICAgaWYgKGV2ZW50X25hbWU9PSdkb3duJykgeyAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy50cmlnZ2VyKHRoaXMuX21vZGlmaWVyX3N0cmluZyhlKSArIGtleW5hbWUsIGUpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHRoaXMudHJpZ2dlcih0aGlzLl9tb2RpZmllcl9zdHJpbmcoZSkgKyBTdHJpbmcoZS5rZXlDb2RlKSArICctJyArIGV2ZW50X25hbWUsIGUpO1xuICAgIHRoaXMudHJpZ2dlcigna2V5JyArIGV2ZW50X25hbWUsIGUpO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gYSBrZXlwcmVzcyBldmVudCBvY2N1cnNcbiAqIEBwYXJhbSAge0hUTUxFbGVtZW50fSBlbFxuICogQHBhcmFtICB7RXZlbnR9IGVcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbk5vcm1hbGl6ZXIucHJvdG90eXBlLl9oYW5kbGVfa2V5cHJlc3NfZXZlbnQgPSBmdW5jdGlvbihlbCwgZXZlbnRfbmFtZSwgZSkge1xuICAgIHRoaXMudHJpZ2dlcigna2V5cHJlc3MnLCBlKTtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBlbGVtZW50IGV2ZW50IHByb3h5LlxuICogQHBhcmFtICB7ZnVuY3Rpb259IGZcbiAqIEBwYXJhbSAge3N0cmluZ30gZXZlbnRfbmFtZVxuICogQHBhcmFtICB7SFRNTEVsZW1lbnR9IGVsXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Ob3JtYWxpemVyLnByb3RvdHlwZS5fcHJveHkgPSBmdW5jdGlvbihldmVudF9uYW1lLCBmLCBlbCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBhcmdzID0gW2VsLCBldmVudF9uYW1lXS5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSk7XG4gICAgICAgIHJldHVybiBmLmFwcGx5KHRoYXQsIGFyZ3MpO1xuICAgIH07XG59O1xuXG4vKipcbiAqIENyZWF0ZSBhIG1vZGlmaWVycyBzdHJpbmcgZnJvbSBhbiBldmVudC5cbiAqIEBwYXJhbSAge0V2ZW50fSBlXG4gKiBAcmV0dXJuIHtzdHJpbmd9IGRhc2ggc2VwYXJhdGVkIG1vZGlmaWVyIHN0cmluZ1xuICovXG5Ob3JtYWxpemVyLnByb3RvdHlwZS5fbW9kaWZpZXJfc3RyaW5nID0gZnVuY3Rpb24oZSkge1xuICAgIHZhciBtb2RpZmllcnMgPSBbXTtcbiAgICBpZiAoZS5jdHJsS2V5KSBtb2RpZmllcnMucHVzaCgnY3RybCcpO1xuICAgIGlmIChlLmFsdEtleSkgbW9kaWZpZXJzLnB1c2goJ2FsdCcpO1xuICAgIGlmIChlLm1ldGFLZXkpIG1vZGlmaWVycy5wdXNoKCdtZXRhJyk7XG4gICAgaWYgKGUuc2hpZnRLZXkpIG1vZGlmaWVycy5wdXNoKCdzaGlmdCcpO1xuICAgIHZhciBzdHJpbmcgPSBtb2RpZmllcnMuc29ydCgpLmpvaW4oJy0nKTtcbiAgICBpZiAoc3RyaW5nLmxlbmd0aCA+IDApIHN0cmluZyA9IHN0cmluZyArICctJztcbiAgICByZXR1cm4gc3RyaW5nO1xufTtcblxuLyoqXG4gKiBMb29rdXAgdGhlIGh1bWFuIGZyaWVuZGx5IG5hbWUgZm9yIGEga2V5Y29kZS5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IGtleWNvZGVcbiAqIEByZXR1cm4ge3N0cmluZ30ga2V5IG5hbWVcbiAqL1xuTm9ybWFsaXplci5wcm90b3R5cGUuX2xvb2t1cF9rZXljb2RlID0gZnVuY3Rpb24oa2V5Y29kZSkge1xuICAgIGlmICgxMTIgPD0ga2V5Y29kZSAmJiBrZXljb2RlIDw9IDEyMykgeyAvLyBGMS1GMTJcbiAgICAgICAgcmV0dXJuICdmJyArIChrZXljb2RlLTExMSk7XG4gICAgfSBlbHNlIGlmICg0OCA8PSBrZXljb2RlICYmIGtleWNvZGUgPD0gNTcpIHsgLy8gMC05XG4gICAgICAgIHJldHVybiBTdHJpbmcoa2V5Y29kZS00OCk7XG4gICAgfSBlbHNlIGlmICg2NSA8PSBrZXljb2RlICYmIGtleWNvZGUgPD0gOTApIHsgLy8gQS1aXG4gICAgICAgIHJldHVybiAnYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXonLnN1YnN0cmluZyhTdHJpbmcoa2V5Y29kZS02NSksIFN0cmluZyhrZXljb2RlLTY0KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGNvZGVzID0ge1xuICAgICAgICAgICAgODogJ2JhY2tzcGFjZScsXG4gICAgICAgICAgICA5OiAndGFiJyxcbiAgICAgICAgICAgIDEzOiAnZW50ZXInLFxuICAgICAgICAgICAgMTY6ICdzaGlmdCcsXG4gICAgICAgICAgICAxNzogJ2N0cmwnLFxuICAgICAgICAgICAgMTg6ICdhbHQnLFxuICAgICAgICAgICAgMTk6ICdwYXVzZScsXG4gICAgICAgICAgICAyMDogJ2NhcHNsb2NrJyxcbiAgICAgICAgICAgIDI3OiAnZXNjJyxcbiAgICAgICAgICAgIDMyOiAnc3BhY2UnLFxuICAgICAgICAgICAgMzM6ICdwYWdldXAnLFxuICAgICAgICAgICAgMzQ6ICdwYWdlZG93bicsXG4gICAgICAgICAgICAzNTogJ2VuZCcsXG4gICAgICAgICAgICAzNjogJ2hvbWUnLFxuICAgICAgICAgICAgMzc6ICdsZWZ0YXJyb3cnLFxuICAgICAgICAgICAgMzg6ICd1cGFycm93JyxcbiAgICAgICAgICAgIDM5OiAncmlnaHRhcnJvdycsXG4gICAgICAgICAgICA0MDogJ2Rvd25hcnJvdycsXG4gICAgICAgICAgICA0NDogJ3ByaW50c2NyZWVuJyxcbiAgICAgICAgICAgIDQ1OiAnaW5zZXJ0JyxcbiAgICAgICAgICAgIDQ2OiAnZGVsZXRlJyxcbiAgICAgICAgICAgIDkxOiAnd2luZG93cycsXG4gICAgICAgICAgICA5MzogJ21lbnUnLFxuICAgICAgICAgICAgMTQ0OiAnbnVtbG9jaycsXG4gICAgICAgICAgICAxNDU6ICdzY3JvbGxsb2NrJyxcbiAgICAgICAgICAgIDE4ODogJ2NvbW1hJyxcbiAgICAgICAgICAgIDE5MDogJ3BlcmlvZCcsXG4gICAgICAgICAgICAxOTE6ICdmb3dhcmRzbGFzaCcsXG4gICAgICAgICAgICAxOTI6ICd0aWxkZScsXG4gICAgICAgICAgICAyMTk6ICdsZWZ0YnJhY2tldCcsXG4gICAgICAgICAgICAyMjA6ICdiYWNrc2xhc2gnLFxuICAgICAgICAgICAgMjIxOiAncmlnaHRicmFja2V0JyxcbiAgICAgICAgICAgIDIyMjogJ3F1b3RlJyxcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGNvZGVzW2tleWNvZGVdO1xuICAgIH0gXG4gICAgLy8gVE9ETzogdGhpcyBmdW5jdGlvbiBpcyBtaXNzaW5nIHNvbWUgYnJvd3NlciBzcGVjaWZpY1xuICAgIC8vIGtleWNvZGUgbWFwcGluZ3MuXG59O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLk5vcm1hbGl6ZXIgPSBOb3JtYWxpemVyO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMuanMnKTtcblxuLyoqXG4gKiBMaXN0ZW5zIHRvIGEgbW9kZWwgYW5kIGhpZ2xpZ2h0cyB0aGUgdGV4dCBhY2NvcmRpbmdseS5cbiAqIEBwYXJhbSB7RG9jdW1lbnRNb2RlbH0gbW9kZWxcbiAqL1xudmFyIEhpZ2hsaWdodGVyQmFzZSA9IGZ1bmN0aW9uKG1vZGVsLCByb3dfcmVuZGVyZXIpIHtcbiAgICB1dGlscy5Qb3N0ZXJDbGFzcy5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX21vZGVsID0gbW9kZWw7XG4gICAgdGhpcy5fcm93X3JlbmRlcmVyID0gcm93X3JlbmRlcmVyO1xuICAgIHRoaXMuX3F1ZXVlZCA9IG51bGw7XG4gICAgdGhpcy5kZWxheSA9IDEwMDsgLy9tc1xuXG4gICAgLy8gQmluZCBldmVudHMuXG4gICAgdGhpcy5fcm93X3JlbmRlcmVyLm9uKCdyb3dzX2NoYW5nZWQnLCB1dGlscy5wcm94eSh0aGlzLl9oYW5kbGVfc2Nyb2xsLCB0aGlzKSk7XG4gICAgdGhpcy5fbW9kZWwub24oJ3RleHRfY2hhbmdlZCcsIHV0aWxzLnByb3h5KHRoaXMuX2hhbmRsZV90ZXh0X2NoYW5nZSwgdGhpcykpO1xuICAgIHRoaXMuX21vZGVsLm9uKCdyb3dfY2hhbmdlZCcsIHV0aWxzLnByb3h5KHRoaXMuX2hhbmRsZV90ZXh0X2NoYW5nZSwgdGhpcykpO1xufTtcbnV0aWxzLmluaGVyaXQoSGlnaGxpZ2h0ZXJCYXNlLCB1dGlscy5Qb3N0ZXJDbGFzcyk7XG5cbi8qKlxuICogSGlnaGxpZ2h0IHRoZSBkb2N1bWVudFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuSGlnaGxpZ2h0ZXJCYXNlLnByb3RvdHlwZS5oaWdobGlnaHQgPSBmdW5jdGlvbihzdGFydF9yb3csIGVuZF9yb3cpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05vdCBpbXBsZW1lbnRlZCcpO1xufTtcblxuLyoqXG4gKiBRdWV1ZXMgYSBoaWdobGlnaHQgb3BlcmF0aW9uLlxuICpcbiAqIElmIGEgaGlnaGxpZ2h0IG9wZXJhdGlvbiBpcyBhbHJlYWR5IHF1ZXVlZCwgZG9uJ3QgcXVldWVcbiAqIGFub3RoZXIgb25lLiAgVGhpcyBlbnN1cmVzIHRoYXQgdGhlIGhpZ2hsaWdodGluZyBpc1xuICogZnJhbWUgcmF0ZSBsb2NrZWQuICBIaWdobGlnaHRpbmcgaXMgYW4gZXhwZW5zaXZlIG9wZXJhdGlvbi5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkhpZ2hsaWdodGVyQmFzZS5wcm90b3R5cGUuX3F1ZXVlX2hpZ2hsaWdodGVyID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX3F1ZXVlZCA9PT0gbnVsbCkge1xuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIHRoaXMuX3F1ZXVlZCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGF0Ll9tb2RlbC5hY3F1aXJlX3RhZ19ldmVudF9sb2NrKCk7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHZhciB2aXNpYmxlX3Jvd3MgPSB0aGF0Ll9yb3dfcmVuZGVyZXIuZ2V0X3Zpc2libGVfcm93cygpO1xuICAgICAgICAgICAgICAgIHZhciB0b3Bfcm93ID0gdmlzaWJsZV9yb3dzLnRvcF9yb3c7XG4gICAgICAgICAgICAgICAgdmFyIGJvdHRvbV9yb3cgPSB2aXNpYmxlX3Jvd3MuYm90dG9tX3JvdztcbiAgICAgICAgICAgICAgICB0aGF0LmhpZ2hsaWdodCh0b3Bfcm93LCBib3R0b21fcm93KTtcbiAgICAgICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICAgICAgdGhhdC5fbW9kZWwucmVsZWFzZV90YWdfZXZlbnRfbG9jaygpO1xuICAgICAgICAgICAgICAgIHRoYXQuX3F1ZXVlZCA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRoaXMuZGVsYXkpO1xuICAgIH1cbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIHRoZSB2aXNpYmxlIHJvdyBpbmRpY2llcyBhcmUgY2hhbmdlZC5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkhpZ2hsaWdodGVyQmFzZS5wcm90b3R5cGUuX2hhbmRsZV9zY3JvbGwgPSBmdW5jdGlvbihzdGFydF9yb3csIGVuZF9yb3cpIHtcbiAgICB0aGlzLl9xdWV1ZV9oaWdobGlnaHRlcigpO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gdGhlIHRleHQgY2hhbmdlcy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkhpZ2hsaWdodGVyQmFzZS5wcm90b3R5cGUuX2hhbmRsZV90ZXh0X2NoYW5nZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3F1ZXVlX2hpZ2hsaWdodGVyKCk7XG59O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLkhpZ2hsaWdodGVyQmFzZSA9IEhpZ2hsaWdodGVyQmFzZTtcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpO1xudmFyIGhpZ2hsaWdodGVyID0gcmVxdWlyZSgnLi9oaWdobGlnaHRlci5qcycpO1xudmFyIHByaXNtID0gcmVxdWlyZSgnLi4vLi4vY29tcG9uZW50cy9wcmlzbS5qcycpO1xuXG4vKipcbiAqIExpc3RlbnMgdG8gYSBtb2RlbCBhbmQgaGlnaGxpZ2h0cyB0aGUgdGV4dCBhY2NvcmRpbmdseS5cbiAqIEBwYXJhbSB7RG9jdW1lbnRNb2RlbH0gbW9kZWxcbiAqL1xudmFyIFByaXNtSGlnaGxpZ2h0ZXIgPSBmdW5jdGlvbihtb2RlbCwgcm93X3JlbmRlcmVyKSB7XG4gICAgaGlnaGxpZ2h0ZXIuSGlnaGxpZ2h0ZXJCYXNlLmNhbGwodGhpcywgbW9kZWwsIHJvd19yZW5kZXJlcik7XG5cbiAgICAvLyBMb29rIGJhY2sgYW5kIGZvcndhcmQgdGhpcyBtYW55IHJvd3MgZm9yIGNvbnRleHR1YWxseSBcbiAgICAvLyBzZW5zaXRpdmUgaGlnaGxpZ2h0aW5nLlxuICAgIHRoaXMuX3Jvd19wYWRkaW5nID0gMTU7XG4gICAgdGhpcy5fbGFuZ3VhZ2UgPSBudWxsO1xuXG4gICAgLy8gUHJvcGVydGllc1xuICAgIHRoaXMucHJvcGVydHkoJ2xhbmd1YWdlcycsIGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgbGFuZ3VhZ2VzID0gW107XG4gICAgICAgIGZvciAodmFyIGwgaW4gcHJpc20ubGFuZ3VhZ2VzKSB7XG4gICAgICAgICAgICBpZiAocHJpc20ubGFuZ3VhZ2VzLmhhc093blByb3BlcnR5KGwpKSB7XG4gICAgICAgICAgICAgICAgaWYgKFtcImV4dGVuZFwiLCBcImluc2VydEJlZm9yZVwiLCBcIkRGU1wiXS5pbmRleE9mKGwpID09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIGxhbmd1YWdlcy5wdXNoKGwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbGFuZ3VhZ2VzO1xuICAgIH0pO1xufTtcbnV0aWxzLmluaGVyaXQoUHJpc21IaWdobGlnaHRlciwgaGlnaGxpZ2h0ZXIuSGlnaGxpZ2h0ZXJCYXNlKTtcblxuLyoqXG4gKiBIaWdobGlnaHQgdGhlIGRvY3VtZW50XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5QcmlzbUhpZ2hsaWdodGVyLnByb3RvdHlwZS5oaWdobGlnaHQgPSBmdW5jdGlvbihzdGFydF9yb3csIGVuZF9yb3cpIHtcbiAgICAvLyBHZXQgdGhlIGZpcnN0IGFuZCBsYXN0IHJvd3MgdGhhdCBzaG91bGQgYmUgaGlnaGxpZ2h0ZWQuXG4gICAgc3RhcnRfcm93ID0gTWF0aC5tYXgoMCwgc3RhcnRfcm93IC0gdGhpcy5fcm93X3BhZGRpbmcpO1xuICAgIGVuZF9yb3cgPSBNYXRoLm1pbih0aGlzLl9tb2RlbC5fcm93cy5sZW5ndGggLSAxLCBlbmRfcm93ICsgdGhpcy5fcm93X3BhZGRpbmcpO1xuXG4gICAgLy8gQ2xlYXIgdGhlIG9sZCBoaWdobGlnaHRpbmcuXG4gICAgdGhpcy5fbW9kZWwuY2xlYXJfdGFncyhzdGFydF9yb3csIGVuZF9yb3cpO1xuXG4gICAgLy8gQWJvcnQgaWYgbGFuZ3VhZ2UgaXNuJ3Qgc3BlY2lmaWVkLlxuICAgIGlmICghdGhpcy5fbGFuZ3VhZ2UpIHJldHVybjtcbiAgICBcbiAgICAvLyBHZXQgdGhlIHRleHQgb2YgdGhlIHJvd3MuXG4gICAgdmFyIHRleHQgPSB0aGlzLl9tb2RlbC5nZXRfdGV4dChzdGFydF9yb3csIDAsIGVuZF9yb3csIHRoaXMuX21vZGVsLl9yb3dzW2VuZF9yb3ddLmxlbmd0aCk7XG5cbiAgICAvLyBGaWd1cmUgb3V0IHdoZXJlIGVhY2ggdGFnIGJlbG9uZ3MuXG4gICAgdmFyIGhpZ2hsaWdodHMgPSB0aGlzLl9oaWdobGlnaHQodGV4dCk7IC8vIFtzdGFydF9pbmRleCwgZW5kX2luZGV4LCB0YWddXG4gICAgXG4gICAgLy8gQXBwbHkgdGFnc1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICBoaWdobGlnaHRzLmZvckVhY2goZnVuY3Rpb24oaGlnaGxpZ2h0KSB7XG5cbiAgICAgICAgLy8gVHJhbnNsYXRlIHRhZyBjaGFyYWN0ZXIgaW5kaWNpZXMgdG8gcm93LCBjaGFyIGNvb3JkaW5hdGVzLlxuICAgICAgICB2YXIgYmVmb3JlX3Jvd3MgPSB0ZXh0LnN1YnN0cmluZygwLCBoaWdobGlnaHRbMF0pLnNwbGl0KCdcXG4nKTtcbiAgICAgICAgdmFyIGdyb3VwX3N0YXJ0X3JvdyA9IHN0YXJ0X3JvdyArIGJlZm9yZV9yb3dzLmxlbmd0aCAtIDE7XG4gICAgICAgIHZhciBncm91cF9zdGFydF9jaGFyID0gYmVmb3JlX3Jvd3NbYmVmb3JlX3Jvd3MubGVuZ3RoIC0gMV0ubGVuZ3RoO1xuICAgICAgICB2YXIgYWZ0ZXJfcm93cyA9IHRleHQuc3Vic3RyaW5nKDAsIGhpZ2hsaWdodFsxXSAtIDEpLnNwbGl0KCdcXG4nKTtcbiAgICAgICAgdmFyIGdyb3VwX2VuZF9yb3cgPSBzdGFydF9yb3cgKyBhZnRlcl9yb3dzLmxlbmd0aCAtIDE7XG4gICAgICAgIHZhciBncm91cF9lbmRfY2hhciA9IGFmdGVyX3Jvd3NbYWZ0ZXJfcm93cy5sZW5ndGggLSAxXS5sZW5ndGg7XG5cbiAgICAgICAgLy8gQXBwbHkgdGFnLlxuICAgICAgICB2YXIgdGFnID0gaGlnaGxpZ2h0WzJdLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIHRoYXQuX21vZGVsLnNldF90YWcoZ3JvdXBfc3RhcnRfcm93LCBncm91cF9zdGFydF9jaGFyLCBncm91cF9lbmRfcm93LCBncm91cF9lbmRfY2hhciwgJ3N5bnRheCcsIHRhZyk7XG4gICAgfSk7XG59O1xuXG4vKipcbiAqIEZpbmQgZWFjaCBwYXJ0IG9mIHRleHQgdGhhdCBuZWVkcyB0byBiZSBoaWdobGlnaHRlZC5cbiAqIEBwYXJhbSAge3N0cmluZ30gdGV4dFxuICogQHJldHVybiB7YXJyYXl9IGxpc3QgY29udGFpbmluZyBpdGVtcyBvZiB0aGUgZm9ybSBbc3RhcnRfaW5kZXgsIGVuZF9pbmRleCwgdGFnXVxuICovXG5QcmlzbUhpZ2hsaWdodGVyLnByb3RvdHlwZS5faGlnaGxpZ2h0ID0gZnVuY3Rpb24odGV4dCkge1xuXG4gICAgLy8gVG9rZW5pemUgdXNpbmcgcHJpc20uanNcbiAgICB2YXIgdG9rZW5zID0gcHJpc20udG9rZW5pemUodGV4dCwgdGhpcy5fbGFuZ3VhZ2UpO1xuXG4gICAgLy8gQ29udmVydCB0aGUgdG9rZW5zIGludG8gW3N0YXJ0X2luZGV4LCBlbmRfaW5kZXgsIHRhZ11cbiAgICB2YXIgbGVmdCA9IDA7XG4gICAgdmFyIGZsYXR0ZW4gPSBmdW5jdGlvbih0b2tlbnMsIHByZWZpeCkge1xuICAgICAgICBpZiAoIXByZWZpeCkgeyBwcmVmaXggPSBbXTsgfVxuICAgICAgICB2YXIgZmxhdCA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRva2Vucy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIHRva2VuID0gdG9rZW5zW2ldO1xuICAgICAgICAgICAgaWYgKHRva2VuLmNvbnRlbnQpIHtcbiAgICAgICAgICAgICAgICBmbGF0ID0gZmxhdC5jb25jYXQoZmxhdHRlbihbXS5jb25jYXQodG9rZW4uY29udGVudCksIHByZWZpeC5jb25jYXQodG9rZW4udHlwZSkpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKHByZWZpeC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGZsYXQucHVzaChbbGVmdCwgbGVmdCArIHRva2VuLmxlbmd0aCwgcHJlZml4LmpvaW4oJyAnKV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBsZWZ0ICs9IHRva2VuLmxlbmd0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmxhdDtcbiAgICB9O1xuICAgIHZhciB0YWdzID0gZmxhdHRlbih0b2tlbnMpO1xuICAgIHJldHVybiB0YWdzO1xufTtcblxuLyoqXG4gKiBMb2FkcyBhIHN5bnRheCBieSBsYW5ndWFnZSBuYW1lLlxuICogQHBhcmFtICB7c3RyaW5nIG9yIGRpY3Rpb25hcnl9IGxhbmd1YWdlXG4gKiBAcmV0dXJuIHtib29sZWFufSBzdWNjZXNzXG4gKi9cblByaXNtSGlnaGxpZ2h0ZXIucHJvdG90eXBlLmxvYWQgPSBmdW5jdGlvbihsYW5ndWFnZSkge1xuICAgIHRyeSB7XG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSBsYW5ndWFnZSBleGlzdHMuXG4gICAgICAgIGlmIChwcmlzbS5sYW5ndWFnZXNbbGFuZ3VhZ2VdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTGFuZ3VhZ2UgZG9lcyBub3QgZXhpc3QhJyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fbGFuZ3VhZ2UgPSBwcmlzbS5sYW5ndWFnZXNbbGFuZ3VhZ2VdO1xuICAgICAgICB0aGlzLl9xdWV1ZV9oaWdobGlnaHRlcigpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGxvYWRpbmcgbGFuZ3VhZ2UnLCBlKTtcbiAgICAgICAgdGhpcy5fbGFuZ3VhZ2UgPSBudWxsO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5QcmlzbUhpZ2hsaWdodGVyID0gUHJpc21IaWdobGlnaHRlcjtcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJyk7XG52YXIgcmVuZGVyZXIgPSByZXF1aXJlKCcuL3JlbmRlcmVyLmpzJyk7XG5cbi8qKlxuICogR3JvdXBzIG11bHRpcGxlIHJlbmRlcmVyc1xuICogQHBhcmFtIHthcnJheX0gcmVuZGVyZXJzIC0gYXJyYXkgb2YgcmVuZGVyZXJzXG4gKiBAcGFyYW0ge0NhbnZhc30gY2FudmFzXG4gKi9cbnZhciBCYXRjaFJlbmRlcmVyID0gZnVuY3Rpb24ocmVuZGVyZXJzLCBjYW52YXMpIHtcbiAgICByZW5kZXJlci5SZW5kZXJlckJhc2UuY2FsbCh0aGlzLCBjYW52YXMpO1xuICAgIHRoaXMuX3JlbmRlcmVycyA9IHJlbmRlcmVycztcblxuICAgIC8vIExpc3RlbiB0byB0aGUgbGF5ZXJzLCBpZiBvbmUgbGF5ZXIgY2hhbmdlcywgcmVjb21wb3NlXG4gICAgLy8gdGhlIGZ1bGwgaW1hZ2UgYnkgY29weWluZyB0aGVtIGFsbCBhZ2Fpbi5cbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhpcy5fcmVuZGVyZXJzLmZvckVhY2goZnVuY3Rpb24ocmVuZGVyZXIpIHtcbiAgICAgICAgcmVuZGVyZXIub24oJ2NoYW5nZWQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHRoYXQuX2NvcHlfcmVuZGVyZXJzKCk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIFxuICAgIC8vIENyZWF0ZSBwcm9wZXJ0aWVzLlxuICAgIHRoaXMucHJvcGVydHkoJ3dpZHRoJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMud2lkdGg7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC5fY2FudmFzLndpZHRoID0gdmFsdWU7XG4gICAgICAgIHRoYXQuX3JlbmRlcmVycy5mb3JFYWNoKGZ1bmN0aW9uKHJlbmRlcmVyKSB7XG4gICAgICAgICAgICByZW5kZXJlci53aWR0aCA9IHZhbHVlO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICB0aGlzLnByb3BlcnR5KCdoZWlnaHQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQuX2NhbnZhcy5oZWlnaHQ7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhhdC5fY2FudmFzLmhlaWdodCA9IHZhbHVlO1xuICAgICAgICB0aGF0Ll9yZW5kZXJlcnMuZm9yRWFjaChmdW5jdGlvbihyZW5kZXJlcikge1xuICAgICAgICAgICAgcmVuZGVyZXIuaGVpZ2h0ID0gdmFsdWU7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufTtcbnV0aWxzLmluaGVyaXQoQmF0Y2hSZW5kZXJlciwgcmVuZGVyZXIuUmVuZGVyZXJCYXNlKTtcblxuLyoqXG4gKiBSZW5kZXIgdG8gdGhlIGNhbnZhc1xuICogQHBhcmFtIHtkaWN0aW9uYXJ5fSAob3B0aW9uYWwpIHNjcm9sbCAtIEhvdyBtdWNoIHRoZSBjYW52YXMgd2FzIHNjcm9sbGVkLiAgVGhpc1xuICogICAgICAgICAgICAgICAgICAgICBpcyBhIGRpY3Rpb25hcnkgb2YgdGhlIGZvcm0ge3g6IGZsb2F0LCB5OiBmbG9hdH1cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkJhdGNoUmVuZGVyZXIucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKHNjcm9sbCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLl9yZW5kZXJlcnMuZm9yRWFjaChmdW5jdGlvbihyZW5kZXJlcikge1xuXG4gICAgICAgIC8vIEFwcGx5IHRoZSByZW5kZXJpbmcgY29vcmRpbmF0ZSB0cmFuc2Zvcm1zIG9mIHRoZSBwYXJlbnQuXG4gICAgICAgIGlmICghcmVuZGVyZXIub3B0aW9ucy5wYXJlbnRfaW5kZXBlbmRlbnQpIHtcbiAgICAgICAgICAgIHJlbmRlcmVyLl9jYW52YXMuX3R4ID0gdXRpbHMucHJveHkodGhhdC5fY2FudmFzLl90eCwgdGhhdC5fY2FudmFzKTtcbiAgICAgICAgICAgIHJlbmRlcmVyLl9jYW52YXMuX3R5ID0gdXRpbHMucHJveHkodGhhdC5fY2FudmFzLl90eSwgdGhhdC5fY2FudmFzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRlbGwgdGhlIHJlbmRlcmVyIHRvIHJlbmRlciBpdHNlbGYuXG4gICAgICAgIHJlbmRlcmVyLnJlbmRlcihzY3JvbGwpO1xuICAgIH0pO1xuXG4gICAgLy8gQ29weSB0aGUgcmVzdWx0cyB0byBzZWxmLlxuICAgIHRoaXMuX2NvcHlfcmVuZGVyZXJzKCk7XG59O1xuXG4vKipcbiAqIENvcGllcyBhbGwgdGhlIHJlbmRlcmVyIGxheWVycyB0byB0aGUgY2FudmFzLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQmF0Y2hSZW5kZXJlci5wcm90b3R5cGUuX2NvcHlfcmVuZGVyZXJzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMuX2NhbnZhcy5jbGVhcigpO1xuICAgIHRoaXMuX3JlbmRlcmVycy5mb3JFYWNoKGZ1bmN0aW9uKHJlbmRlcmVyKSB7XG4gICAgICAgIHRoYXQuX2NvcHlfcmVuZGVyZXIocmVuZGVyZXIpO1xuICAgIH0pO1xufTtcblxuLyoqXG4gKiBDb3B5IGEgcmVuZGVyZXIgdG8gdGhlIGNhbnZhcy5cbiAqIEBwYXJhbSAge1JlbmRlcmVyQmFzZX0gcmVuZGVyZXJcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkJhdGNoUmVuZGVyZXIucHJvdG90eXBlLl9jb3B5X3JlbmRlcmVyID0gZnVuY3Rpb24ocmVuZGVyZXIpIHtcbiAgICB0aGlzLl9jYW52YXMuZHJhd19pbWFnZShcbiAgICAgICAgcmVuZGVyZXIuX2NhbnZhcywgXG4gICAgICAgIC10aGlzLl9jYW52YXMuX3R4KDApLCBcbiAgICAgICAgLXRoaXMuX2NhbnZhcy5fdHkoMCksIFxuICAgICAgICB0aGlzLl9jYW52YXMud2lkdGgsIFxuICAgICAgICB0aGlzLl9jYW52YXMuaGVpZ2h0KTtcbn07XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuQmF0Y2hSZW5kZXJlciA9IEJhdGNoUmVuZGVyZXI7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpO1xudmFyIHJlbmRlcmVyID0gcmVxdWlyZSgnLi9yZW5kZXJlci5qcycpO1xuXG4vKipcbiAqIFJlbmRlcnMgdG8gYSBjYW52YXNcbiAqIEBwYXJhbSB7Q2FudmFzfSBkZWZhdWx0X2NhbnZhc1xuICovXG52YXIgQ29sb3JSZW5kZXJlciA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIENyZWF0ZSB3aXRoIHRoZSBvcHRpb24gJ3BhcmVudF9pbmRlcGVuZGVudCcgdG8gZGlzYWJsZVxuICAgIC8vIHBhcmVudCBjb29yZGluYXRlIHRyYW5zbGF0aW9ucyBmcm9tIGJlaW5nIGFwcGxpZWQgYnkgXG4gICAgLy8gYSBiYXRjaCByZW5kZXJlci5cbiAgICByZW5kZXJlci5SZW5kZXJlckJhc2UuY2FsbCh0aGlzLCB1bmRlZmluZWQsIHtwYXJlbnRfaW5kZXBlbmRlbnQ6IHRydWV9KTtcbiAgICB0aGlzLl9yZW5kZXJlZCA9IGZhbHNlO1xuICAgIFxuICAgIC8vIENyZWF0ZSBwcm9wZXJ0aWVzLlxuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLnByb3BlcnR5KCd3aWR0aCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fY2FudmFzLndpZHRoO1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy53aWR0aCA9IHZhbHVlO1xuICAgICAgICB0aGF0Ll9yZW5kZXIoKTtcblxuICAgICAgICAvLyBUZWxsIHBhcmVudCBsYXllciB0aGlzIG9uZSBoYXMgY2hhbmdlZC5cbiAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2VkJyk7XG4gICAgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgnaGVpZ2h0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMuaGVpZ2h0O1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy5oZWlnaHQgPSB2YWx1ZTtcbiAgICAgICAgdGhhdC5fcmVuZGVyKCk7XG5cbiAgICAgICAgLy8gVGVsbCBwYXJlbnQgbGF5ZXIgdGhpcyBvbmUgaGFzIGNoYW5nZWQuXG4gICAgICAgIHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgIH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ2NvbG9yJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9jb2xvcjtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Ll9jb2xvciA9IHZhbHVlO1xuICAgICAgICB0aGF0Ll9yZW5kZXIoKTtcblxuICAgICAgICAvLyBUZWxsIHBhcmVudCBsYXllciB0aGlzIG9uZSBoYXMgY2hhbmdlZC5cbiAgICAgICAgdGhpcy50cmlnZ2VyKCdjaGFuZ2VkJyk7XG4gICAgfSk7XG59O1xudXRpbHMuaW5oZXJpdChDb2xvclJlbmRlcmVyLCByZW5kZXJlci5SZW5kZXJlckJhc2UpO1xuXG4vKipcbiAqIFJlbmRlciB0byB0aGUgY2FudmFzXG4gKiBAcGFyYW0ge2RpY3Rpb25hcnl9IChvcHRpb25hbCkgc2Nyb2xsIC0gSG93IG11Y2ggdGhlIGNhbnZhcyB3YXMgc2Nyb2xsZWQuICBUaGlzXG4gKiAgICAgICAgICAgICAgICAgICAgIGlzIGEgZGljdGlvbmFyeSBvZiB0aGUgZm9ybSB7eDogZmxvYXQsIHk6IGZsb2F0fVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ29sb3JSZW5kZXJlci5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oc2Nyb2xsKSB7XG4gICAgaWYgKCF0aGlzLl9yZW5kZXJlZCkge1xuICAgICAgICB0aGlzLl9yZW5kZXIoKTtcbiAgICAgICAgdGhpcy5fcmVuZGVyZWQgPSB0cnVlO1xuICAgIH1cbn07XG5cbi8qKlxuICogUmVuZGVyIGEgZnJhbWUuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Db2xvclJlbmRlcmVyLnByb3RvdHlwZS5fcmVuZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fY2FudmFzLmNsZWFyKCk7XG4gICAgdGhpcy5fY2FudmFzLmRyYXdfcmVjdGFuZ2xlKDAsIDAsIHRoaXMuX2NhbnZhcy53aWR0aCwgdGhpcy5fY2FudmFzLmhlaWdodCwge2ZpbGxfY29sb3I6IHRoaXMuX2NvbG9yfSk7XG59O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLkNvbG9yUmVuZGVyZXIgPSBDb2xvclJlbmRlcmVyO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIGFuaW1hdG9yID0gcmVxdWlyZSgnLi4vYW5pbWF0b3IuanMnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzLmpzJyk7XG52YXIgcmVuZGVyZXIgPSByZXF1aXJlKCcuL3JlbmRlcmVyLmpzJyk7XG5cbi8qKlxuICogUmVuZGVyIGRvY3VtZW50IGN1cnNvcnNcbiAqXG4gKiBUT0RPOiBPbmx5IHJlbmRlciB2aXNpYmxlLlxuICovXG52YXIgQ3Vyc29yc1JlbmRlcmVyID0gZnVuY3Rpb24oY3Vyc29ycywgc3R5bGUsIHJvd19yZW5kZXJlciwgaGFzX2ZvY3VzKSB7XG4gICAgcmVuZGVyZXIuUmVuZGVyZXJCYXNlLmNhbGwodGhpcyk7XG4gICAgdGhpcy5zdHlsZSA9IHN0eWxlO1xuICAgIHRoaXMuX2hhc19mb2N1cyA9IGhhc19mb2N1cztcbiAgICB0aGlzLl9jdXJzb3JzID0gY3Vyc29ycztcblxuICAgIHRoaXMuX3Jvd19yZW5kZXJlciA9IHJvd19yZW5kZXJlcjtcbiAgICAvLyBUT0RPOiBSZW1vdmUgdGhlIGZvbGxvd2luZyBibG9jay5cbiAgICB0aGlzLl9nZXRfdmlzaWJsZV9yb3dzID0gdXRpbHMucHJveHkocm93X3JlbmRlcmVyLmdldF92aXNpYmxlX3Jvd3MsIHJvd19yZW5kZXJlcik7XG4gICAgdGhpcy5fZ2V0X3Jvd19oZWlnaHQgPSB1dGlscy5wcm94eShyb3dfcmVuZGVyZXIuZ2V0X3Jvd19oZWlnaHQsIHJvd19yZW5kZXJlcik7XG4gICAgdGhpcy5fZ2V0X3Jvd190b3AgPSB1dGlscy5wcm94eShyb3dfcmVuZGVyZXIuZ2V0X3Jvd190b3AsIHJvd19yZW5kZXJlcik7XG4gICAgdGhpcy5fbWVhc3VyZV9wYXJ0aWFsX3JvdyA9IHV0aWxzLnByb3h5KHJvd19yZW5kZXJlci5tZWFzdXJlX3BhcnRpYWxfcm93X3dpZHRoLCByb3dfcmVuZGVyZXIpO1xuICAgIFxuICAgIHRoaXMuX2JsaW5rX2FuaW1hdG9yID0gbmV3IGFuaW1hdG9yLkFuaW1hdG9yKDEwMDApO1xuICAgIHRoaXMuX2ZwcyA9IDMwO1xuXG4gICAgLy8gU3RhcnQgdGhlIGN1cnNvciByZW5kZXJpbmcgY2xvY2suXG4gICAgdGhpcy5fcmVuZGVyX2Nsb2NrKCk7XG4gICAgdGhpcy5fbGFzdF9yZW5kZXJlZCA9IG51bGw7XG59O1xudXRpbHMuaW5oZXJpdChDdXJzb3JzUmVuZGVyZXIsIHJlbmRlcmVyLlJlbmRlcmVyQmFzZSk7XG5cbi8qKlxuICogUmVuZGVyIHRvIHRoZSBjYW52YXNcbiAqIE5vdGU6IFRoaXMgbWV0aG9kIGlzIGNhbGxlZCBvZnRlbiwgc28gaXQncyBpbXBvcnRhbnQgdGhhdCBpdCdzXG4gKiBvcHRpbWl6ZWQgZm9yIHNwZWVkLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuQ3Vyc29yc1JlbmRlcmVyLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBGcmFtZSBsaW1pdCB0aGUgcmVuZGVyaW5nLlxuICAgIGlmIChEYXRlLm5vdygpIC0gdGhpcy5fbGFzdF9yZW5kZXJlZCA8IDEwMDAvdGhpcy5fZnBzKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5fY2FudmFzLmNsZWFyKCk7XG5cbiAgICAvLyBPbmx5IHJlbmRlciBpZiB0aGUgY2FudmFzIGhhcyBmb2N1cy5cbiAgICBpZiAodGhpcy5faGFzX2ZvY3VzKCkpIHtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICB0aGlzLl9jdXJzb3JzLmN1cnNvcnMuZm9yRWFjaChmdW5jdGlvbihjdXJzb3IpIHtcbiAgICAgICAgICAgIC8vIEdldCB0aGUgdmlzaWJsZSByb3dzLlxuICAgICAgICAgICAgdmFyIHZpc2libGVfcm93cyA9IHRoYXQuX2dldF92aXNpYmxlX3Jvd3MoKTtcblxuICAgICAgICAgICAgLy8gSWYgYSBjdXJzb3IgZG9lc24ndCBoYXZlIGEgcG9zaXRpb24sIHJlbmRlciBpdCBhdCB0aGVcbiAgICAgICAgICAgIC8vIGJlZ2lubmluZyBvZiB0aGUgZG9jdW1lbnQuXG4gICAgICAgICAgICB2YXIgcm93X2luZGV4ID0gY3Vyc29yLnByaW1hcnlfcm93IHx8IDA7XG4gICAgICAgICAgICB2YXIgY2hhcl9pbmRleCA9IGN1cnNvci5wcmltYXJ5X2NoYXIgfHwgMDtcblxuICAgICAgICAgICAgLy8gQ2FsY3VsYXRlIG9wYWNpdHkgb2YgdGhlIGN1cnNvci4gIEJsaW5raW5nIGN1cnNvci5cbiAgICAgICAgICAgIHZhciBzaW4gPSBNYXRoLnNpbigyKk1hdGguUEkqdGhhdC5fYmxpbmtfYW5pbWF0b3IudGltZSgpKTtcbiAgICAgICAgICAgIHZhciBhbHBoYSA9IE1hdGgubWluKE1hdGgubWF4KHNpbiswLjUsIDApLCAxKTsgLy8gT2Zmc2V0LCB0cnVuY2F0ZWQgc2luZSB3YXZlLlxuXG4gICAgICAgICAgICAvLyBEcmF3IHRoZSBjdXJzb3IuXG4gICAgICAgICAgICBpZiAoYWxwaGEgPiAwKSB7XG4gICAgICAgICAgICAgICAgdmFyIGhlaWdodCA9IHRoYXQuX2dldF9yb3dfaGVpZ2h0KHJvd19pbmRleCk7XG4gICAgICAgICAgICAgICAgdmFyIG11bHRpcGxpZXIgPSB0aGF0LnN0eWxlLmN1cnNvcl9oZWlnaHQgfHwgMS4wO1xuICAgICAgICAgICAgICAgIHZhciBvZmZzZXQgPSAoaGVpZ2h0IC0gKG11bHRpcGxpZXIqaGVpZ2h0KSkgLyAyO1xuICAgICAgICAgICAgICAgIGhlaWdodCAqPSBtdWx0aXBsaWVyO1xuICAgICAgICAgICAgICAgIGlmICh2aXNpYmxlX3Jvd3MudG9wX3JvdyA8PSByb3dfaW5kZXggJiYgcm93X2luZGV4IDw9IHZpc2libGVfcm93cy5ib3R0b21fcm93KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQuX2NhbnZhcy5kcmF3X3JlY3RhbmdsZShcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoYXJfaW5kZXggPT09IDAgPyB0aGF0Ll9yb3dfcmVuZGVyZXIubWFyZ2luX2xlZnQgOiB0aGF0Ll9tZWFzdXJlX3BhcnRpYWxfcm93KHJvd19pbmRleCwgY2hhcl9pbmRleCkgKyB0aGF0Ll9yb3dfcmVuZGVyZXIubWFyZ2luX2xlZnQsIFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5fZ2V0X3Jvd190b3Aocm93X2luZGV4KSArIG9mZnNldCwgXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnN0eWxlLmN1cnNvcl93aWR0aD09PXVuZGVmaW5lZCA/IDEuMCA6IHRoYXQuc3R5bGUuY3Vyc29yX3dpZHRoLCBcbiAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodCwgXG4gICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsbF9jb2xvcjogdGhhdC5zdHlsZS5jdXJzb3IgfHwgJ2JhY2snLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFscGhhOiBhbHBoYSxcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9ICAgIFxuICAgICAgICAgICAgfSAgIFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgdGhpcy5fbGFzdF9yZW5kZXJlZCA9IERhdGUubm93KCk7XG59O1xuXG4vKipcbiAqIENsb2NrIGZvciByZW5kZXJpbmcgdGhlIGN1cnNvci5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbkN1cnNvcnNSZW5kZXJlci5wcm90b3R5cGUuX3JlbmRlcl9jbG9jayA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIElmIHRoZSBjYW52YXMgaXMgZm9jdXNlZCwgcmVkcmF3LlxuICAgIGlmICh0aGlzLl9oYXNfZm9jdXMoKSkge1xuICAgICAgICB2YXIgZmlyc3RfcmVuZGVyID0gIXRoaXMuX3dhc19mb2N1c2VkO1xuICAgICAgICB0aGlzLl93YXNfZm9jdXNlZCA9IHRydWU7XG4gICAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgICAgIC8vIFRlbGwgcGFyZW50IGxheWVyIHRoaXMgb25lIGhhcyBjaGFuZ2VkLlxuICAgICAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZWQnKTtcbiAgICAgICAgaWYgKGZpcnN0X3JlbmRlcikgdGhpcy50cmlnZ2VyKCd0b2dnbGUnKTtcblxuICAgIC8vIFRoZSBjYW52YXMgaXNuJ3QgZm9jdXNlZC4gIElmIHRoaXMgaXMgdGhlIGZpcnN0IHRpbWVcbiAgICAvLyBpdCBoYXNuJ3QgYmVlbiBmb2N1c2VkLCByZW5kZXIgYWdhaW4gd2l0aG91dCB0aGUgXG4gICAgLy8gY3Vyc29ycy5cbiAgICB9IGVsc2UgaWYgKHRoaXMuX3dhc19mb2N1c2VkKSB7XG4gICAgICAgIHRoaXMuX3dhc19mb2N1c2VkID0gZmFsc2U7XG4gICAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgICAgIC8vIFRlbGwgcGFyZW50IGxheWVyIHRoaXMgb25lIGhhcyBjaGFuZ2VkLlxuICAgICAgICB0aGlzLnRyaWdnZXIoJ2NoYW5nZWQnKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCd0b2dnbGUnKTtcbiAgICB9XG5cbiAgICAvLyBUaW1lci5cbiAgICBzZXRUaW1lb3V0KHV0aWxzLnByb3h5KHRoaXMuX3JlbmRlcl9jbG9jaywgdGhpcyksIDEwMDAgLyB0aGlzLl9mcHMpO1xufTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5DdXJzb3JzUmVuZGVyZXIgPSBDdXJzb3JzUmVuZGVyZXI7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpO1xudmFyIHJvdyA9IHJlcXVpcmUoJy4vcm93LmpzJyk7XG52YXIgY29uZmlnID0gcmVxdWlyZSgnLi4vY29uZmlnLmpzJyk7XG5jb25maWcgPSBjb25maWcuY29uZmlnO1xuXG4vKipcbiAqIFJlbmRlciB0aGUgdGV4dCByb3dzIG9mIGEgRG9jdW1lbnRNb2RlbC5cbiAqIEBwYXJhbSB7RG9jdW1lbnRNb2RlbH0gbW9kZWwgaW5zdGFuY2VcbiAqL1xudmFyIEhpZ2hsaWdodGVkUm93UmVuZGVyZXIgPSBmdW5jdGlvbihtb2RlbCwgc2Nyb2xsaW5nX2NhbnZhcywgc3R5bGUpIHtcbiAgICByb3cuUm93UmVuZGVyZXIuY2FsbCh0aGlzLCBtb2RlbCwgc2Nyb2xsaW5nX2NhbnZhcyk7XG4gICAgdGhpcy5zdHlsZSA9IHN0eWxlO1xufTtcbnV0aWxzLmluaGVyaXQoSGlnaGxpZ2h0ZWRSb3dSZW5kZXJlciwgcm93LlJvd1JlbmRlcmVyKTtcblxuLyoqXG4gKiBSZW5kZXIgYSBzaW5nbGUgcm93XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBpbmRleFxuICogQHBhcmFtICB7ZmxvYXR9IHhcbiAqIEBwYXJhbSAge2Zsb2F0fSB5XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5IaWdobGlnaHRlZFJvd1JlbmRlcmVyLnByb3RvdHlwZS5fcmVuZGVyX3JvdyA9IGZ1bmN0aW9uKGluZGV4LCB4ICx5KSB7XG4gICAgaWYgKGluZGV4IDwgMCB8fCB0aGlzLl9tb2RlbC5fcm93cy5sZW5ndGggPD0gaW5kZXgpIHJldHVybjtcbiAgICBcbiAgICB2YXIgZ3JvdXBzID0gdGhpcy5fZ2V0X2dyb3VwcyhpbmRleCk7XG4gICAgdmFyIGxlZnQgPSB4O1xuICAgIGZvciAodmFyIGk9MDsgaTxncm91cHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHdpZHRoID0gdGhpcy5fdGV4dF9jYW52YXMubWVhc3VyZV90ZXh0KGdyb3Vwc1tpXS50ZXh0LCBncm91cHNbaV0ub3B0aW9ucyk7XG4gICAgICAgIFxuICAgICAgICBpZiAoY29uZmlnLmhpZ2hsaWdodF9kcmF3KSB7XG4gICAgICAgICAgICB0aGlzLl90ZXh0X2NhbnZhcy5kcmF3X3JlY3RhbmdsZShsZWZ0LCB5LCB3aWR0aCwgdGhpcy5nZXRfcm93X2hlaWdodChpKSwge1xuICAgICAgICAgICAgICAgIGZpbGxfY29sb3I6IHV0aWxzLnJhbmRvbV9jb2xvcigpLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl90ZXh0X2NhbnZhcy5kcmF3X3RleHQobGVmdCwgeSwgZ3JvdXBzW2ldLnRleHQsIGdyb3Vwc1tpXS5vcHRpb25zKTtcbiAgICAgICAgbGVmdCArPSB3aWR0aDtcbiAgICB9XG59O1xuXG4vKipcbiAqIEdldCByZW5kZXIgZ3JvdXBzIGZvciBhIHJvdy5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IGluZGV4IG9mIHRoZSByb3dcbiAqIEByZXR1cm4ge2FycmF5fSBhcnJheSBvZiByZW5kZXJpbmdzLCBlYWNoIHJlbmRlcmluZyBpcyBhbiBhcnJheSBvZlxuICogICAgICAgICAgICAgICAgIHRoZSBmb3JtIHtvcHRpb25zLCB0ZXh0fS5cbiAqL1xuSGlnaGxpZ2h0ZWRSb3dSZW5kZXJlci5wcm90b3R5cGUuX2dldF9ncm91cHMgPSBmdW5jdGlvbihpbmRleCkge1xuICAgIGlmIChpbmRleCA8IDAgfHwgdGhpcy5fbW9kZWwuX3Jvd3MubGVuZ3RoIDw9IGluZGV4KSByZXR1cm47XG5cbiAgICB2YXIgcm93X3RleHQgPSB0aGlzLl9tb2RlbC5fcm93c1tpbmRleF07XG4gICAgdmFyIGdyb3VwcyA9IFtdO1xuICAgIHZhciBsYXN0X3N5bnRheCA9IG51bGw7XG4gICAgdmFyIGNoYXJfaW5kZXggPSAwO1xuICAgIHZhciBzdGFydCA9IDA7XG4gICAgZm9yIChjaGFyX2luZGV4OyBjaGFyX2luZGV4PHJvd190ZXh0Lmxlbmd0aDsgY2hhcl9pbmRleCsrKSB7XG4gICAgICAgIHZhciBzeW50YXggPSB0aGlzLl9tb2RlbC5nZXRfdGFncyhpbmRleCwgY2hhcl9pbmRleCkuc3ludGF4O1xuICAgICAgICBpZiAoIXRoaXMuX2NvbXBhcmVfc3ludGF4KGxhc3Rfc3ludGF4LHN5bnRheCkpIHtcbiAgICAgICAgICAgIGlmIChjaGFyX2luZGV4ICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgZ3JvdXBzLnB1c2goe29wdGlvbnM6IHRoaXMuX2dldF9vcHRpb25zKGxhc3Rfc3ludGF4KSwgdGV4dDogcm93X3RleHQuc3Vic3RyaW5nKHN0YXJ0LCBjaGFyX2luZGV4KX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGFzdF9zeW50YXggPSBzeW50YXg7XG4gICAgICAgICAgICBzdGFydCA9IGNoYXJfaW5kZXg7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZ3JvdXBzLnB1c2goe29wdGlvbnM6IHRoaXMuX2dldF9vcHRpb25zKGxhc3Rfc3ludGF4KSwgdGV4dDogcm93X3RleHQuc3Vic3RyaW5nKHN0YXJ0KX0pO1xuXG4gICAgcmV0dXJuIGdyb3Vwcztcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhIHN0eWxlIG9wdGlvbnMgZGljdGlvbmFyeSBmcm9tIGEgc3ludGF4IHRhZy5cbiAqIEBwYXJhbSAge3N0cmluZ30gc3ludGF4XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5IaWdobGlnaHRlZFJvd1JlbmRlcmVyLnByb3RvdHlwZS5fZ2V0X29wdGlvbnMgPSBmdW5jdGlvbihzeW50YXgpIHtcbiAgICB2YXIgcmVuZGVyX29wdGlvbnMgPSB1dGlscy5zaGFsbG93X2NvcHkodGhpcy5fYmFzZV9vcHRpb25zKTtcbiAgICBcbiAgICAvLyBIaWdobGlnaHQgaWYgYSBzeXRheCBpdGVtIGFuZCBzdHlsZSBhcmUgcHJvdmlkZWQuXG4gICAgaWYgKHRoaXMuc3R5bGUpIHtcblxuICAgICAgICAvLyBJZiB0aGlzIGlzIGEgbmVzdGVkIHN5bnRheCBpdGVtLCB1c2UgdGhlIG1vc3Qgc3BlY2lmaWMgcGFydFxuICAgICAgICAvLyB3aGljaCBpcyBkZWZpbmVkIGluIHRoZSBhY3RpdmUgc3R5bGUuXG4gICAgICAgIGlmIChzeW50YXggJiYgc3ludGF4LmluZGV4T2YoJyAnKSAhPSAtMSkge1xuICAgICAgICAgICAgdmFyIHBhcnRzID0gc3ludGF4LnNwbGl0KCcgJyk7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gcGFydHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5zdHlsZVtwYXJ0c1tpXV0pIHtcbiAgICAgICAgICAgICAgICAgICAgc3ludGF4ID0gcGFydHNbaV07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFN0eWxlIGlmIHRoZSBzeW50YXggaXRlbSBpcyBkZWZpbmVkIGluIHRoZSBzdHlsZS5cbiAgICAgICAgaWYgKHN5bnRheCAmJiB0aGlzLnN0eWxlW3N5bnRheF0pIHtcbiAgICAgICAgICAgIHJlbmRlcl9vcHRpb25zLmNvbG9yID0gdGhpcy5zdHlsZVtzeW50YXhdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVuZGVyX29wdGlvbnMuY29sb3IgPSB0aGlzLnN0eWxlLnRleHQgfHwgJ2JsYWNrJztcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICByZXR1cm4gcmVuZGVyX29wdGlvbnM7XG59O1xuXG4vKipcbiAqIENvbXBhcmUgdHdvIHN5bnRheHMuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGEgLSBzeW50YXhcbiAqIEBwYXJhbSAge3N0cmluZ30gYiAtIHN5bnRheFxuICogQHJldHVybiB7Ym9vbH0gdHJ1ZSBpZiBhIGFuZCBiIGFyZSBlcXVhbFxuICovXG5IaWdobGlnaHRlZFJvd1JlbmRlcmVyLnByb3RvdHlwZS5fY29tcGFyZV9zeW50YXggPSBmdW5jdGlvbihhLCBiKSB7XG4gICAgcmV0dXJuIGEgPT09IGI7XG59O1xuXG4vLyBFeHBvcnRzXG5leHBvcnRzLkhpZ2hsaWdodGVkUm93UmVuZGVyZXIgPSBIaWdobGlnaHRlZFJvd1JlbmRlcmVyO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIGNhbnZhcyA9IHJlcXVpcmUoJy4uL2NhbnZhcy5qcycpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMuanMnKTtcblxuLyoqXG4gKiBSZW5kZXJzIHRvIGEgY2FudmFzXG4gKiBAcGFyYW0ge0NhbnZhc30gZGVmYXVsdF9jYW52YXNcbiAqL1xudmFyIFJlbmRlcmVyQmFzZSA9IGZ1bmN0aW9uKGRlZmF1bHRfY2FudmFzLCBvcHRpb25zKSB7XG4gICAgdXRpbHMuUG9zdGVyQ2xhc3MuY2FsbCh0aGlzKTtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHRoaXMuX2NhbnZhcyA9IGRlZmF1bHRfY2FudmFzID8gZGVmYXVsdF9jYW52YXMgOiBuZXcgY2FudmFzLkNhbnZhcygpO1xuICAgIFxuICAgIC8vIENyZWF0ZSBwcm9wZXJ0aWVzLlxuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLnByb3BlcnR5KCd3aWR0aCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fY2FudmFzLndpZHRoO1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy53aWR0aCA9IHZhbHVlO1xuICAgIH0pO1xuICAgIHRoaXMucHJvcGVydHkoJ2hlaWdodCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fY2FudmFzLmhlaWdodDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Ll9jYW52YXMuaGVpZ2h0ID0gdmFsdWU7XG4gICAgfSk7XG59O1xudXRpbHMuaW5oZXJpdChSZW5kZXJlckJhc2UsIHV0aWxzLlBvc3RlckNsYXNzKTtcblxuLyoqXG4gKiBSZW5kZXIgdG8gdGhlIGNhbnZhc1xuICogQHBhcmFtIHtkaWN0aW9uYXJ5fSAob3B0aW9uYWwpIHNjcm9sbCAtIEhvdyBtdWNoIHRoZSBjYW52YXMgd2FzIHNjcm9sbGVkLiAgVGhpc1xuICogICAgICAgICAgICAgICAgICAgICBpcyBhIGRpY3Rpb25hcnkgb2YgdGhlIGZvcm0ge3g6IGZsb2F0LCB5OiBmbG9hdH1cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblJlbmRlcmVyQmFzZS5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oc2Nyb2xsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdOb3QgaW1wbGVtZW50ZWQnKTtcbn07XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuUmVuZGVyZXJCYXNlID0gUmVuZGVyZXJCYXNlO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cblxudmFyIGNhbnZhcyA9IHJlcXVpcmUoJy4uL2NhbnZhcy5qcycpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMuanMnKTtcbnZhciByZW5kZXJlciA9IHJlcXVpcmUoJy4vcmVuZGVyZXIuanMnKTtcblxuLyoqXG4gKiBSZW5kZXIgdGhlIHRleHQgcm93cyBvZiBhIERvY3VtZW50TW9kZWwuXG4gKiBAcGFyYW0ge0RvY3VtZW50TW9kZWx9IG1vZGVsIGluc3RhbmNlXG4gKi9cbnZhciBSb3dSZW5kZXJlciA9IGZ1bmN0aW9uKG1vZGVsLCBzY3JvbGxpbmdfY2FudmFzKSB7XG4gICAgdGhpcy5fbW9kZWwgPSBtb2RlbDtcbiAgICB0aGlzLl92aXNpYmxlX3Jvd19jb3VudCA9IDA7XG5cbiAgICAvLyBTZXR1cCBjYW52YXNlc1xuICAgIHRoaXMuX3RleHRfY2FudmFzID0gbmV3IGNhbnZhcy5DYW52YXMoKTtcbiAgICB0aGlzLl90bXBfY2FudmFzID0gbmV3IGNhbnZhcy5DYW52YXMoKTtcbiAgICB0aGlzLl9zY3JvbGxpbmdfY2FudmFzID0gc2Nyb2xsaW5nX2NhbnZhcztcbiAgICB0aGlzLl9yb3dfd2lkdGhfY291bnRzID0ge307IC8vIERpY3Rpb25hcnkgb2Ygd2lkdGhzIC0+IHJvdyBjb3VudCBcblxuICAgIC8vIEJhc2VcbiAgICByZW5kZXJlci5SZW5kZXJlckJhc2UuY2FsbCh0aGlzKTtcblxuICAgIC8vIFNldCBzb21lIGJhc2ljIHJlbmRlcmluZyBwcm9wZXJ0aWVzLlxuICAgIHRoaXMuX2Jhc2Vfb3B0aW9ucyA9IHtcbiAgICAgICAgZm9udF9mYW1pbHk6ICdtb25vc3BhY2UnLFxuICAgICAgICBmb250X3NpemU6IDE0LFxuICAgIH07XG4gICAgdGhpcy5fbGluZV9zcGFjaW5nID0gMjtcblxuICAgIC8vIENyZWF0ZSBwcm9wZXJ0aWVzLlxuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLnByb3BlcnR5KCd3aWR0aCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fY2FudmFzLndpZHRoO1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy53aWR0aCA9IHZhbHVlO1xuICAgICAgICB0aGF0Ll90ZXh0X2NhbnZhcy53aWR0aCA9IHZhbHVlO1xuICAgICAgICB0aGF0Ll90bXBfY2FudmFzLndpZHRoID0gdmFsdWU7XG4gICAgfSk7XG4gICAgdGhpcy5wcm9wZXJ0eSgnaGVpZ2h0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMuaGVpZ2h0O1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy5oZWlnaHQgPSB2YWx1ZTtcblxuICAgICAgICAvLyBUaGUgdGV4dCBjYW52YXMgc2hvdWxkIGJlIHRoZSByaWdodCBoZWlnaHQgdG8gZml0IGFsbCBvZiB0aGUgbGluZXNcbiAgICAgICAgLy8gdGhhdCB3aWxsIGJlIHJlbmRlcmVkIGluIHRoZSBiYXNlIGNhbnZhcy4gIFRoaXMgaW5jbHVkZXMgdGhlIGxpbmVzXG4gICAgICAgIC8vIHRoYXQgYXJlIHBhcnRpYWxseSByZW5kZXJlZCBhdCB0aGUgdG9wIGFuZCBib3R0b20gb2YgdGhlIGJhc2UgY2FudmFzLlxuICAgICAgICB2YXIgcm93X2hlaWdodCA9IHRoYXQuZ2V0X3Jvd19oZWlnaHQoKTtcbiAgICAgICAgdGhhdC5fdmlzaWJsZV9yb3dfY291bnQgPSBNYXRoLmNlaWwodmFsdWUvcm93X2hlaWdodCkgKyAxO1xuICAgICAgICB0aGF0Ll90ZXh0X2NhbnZhcy5oZWlnaHQgPSB0aGF0Ll92aXNpYmxlX3Jvd19jb3VudCAqIHJvd19oZWlnaHQ7XG4gICAgICAgIHRoYXQuX3RtcF9jYW52YXMuaGVpZ2h0ID0gdGhhdC5fdGV4dF9jYW52YXMuaGVpZ2h0O1xuICAgIH0pO1xuICAgIHRoaXMuX21hcmdpbl9sZWZ0ID0gMDtcbiAgICB0aGlzLnByb3BlcnR5KCdtYXJnaW5fbGVmdCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhhdC5fbWFyZ2luX2xlZnQ7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBpbnRlcm5hbCB2YWx1ZS5cbiAgICAgICAgdGhhdC5fbWFyZ2luX2xlZnQgPSB2YWx1ZTtcblxuICAgICAgICAvLyBGb3JjZSB0aGUgZG9jdW1lbnQgdG8gcmVjYWxjdWxhdGUgaXRzIHNpemUuXG4gICAgICAgIHRoYXQuX2hhbmRsZV92YWx1ZV9jaGFuZ2VkKCk7XG5cbiAgICAgICAgLy8gUmUtcmVuZGVyIHdpdGggbmV3IG1hcmdpbi5cbiAgICAgICAgdGhhdC5yZW5kZXIoKTtcbiAgICAgICAgLy8gVGVsbCBwYXJlbnQgbGF5ZXIgdGhpcyBvbmUgaGFzIGNoYW5nZWQuXG4gICAgICAgIHRoYXQudHJpZ2dlcignY2hhbmdlZCcpO1xuICAgIH0pO1xuICAgIHRoaXMuX21hcmdpbl90b3AgPSAwO1xuICAgIHRoaXMucHJvcGVydHkoJ21hcmdpbl90b3AnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoYXQuX21hcmdpbl90b3A7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgLy8gVXBkYXRlIHRoZSBzY3JvbGxiYXJzLlxuICAgICAgICB0aGF0Ll9zY3JvbGxpbmdfY2FudmFzLnNjcm9sbF9oZWlnaHQgKz0gdmFsdWUgLSB0aGF0Ll9tYXJnaW5fdG9wO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBpbnRlcm5hbCB2YWx1ZS5cbiAgICAgICAgdGhhdC5fbWFyZ2luX3RvcCA9IHZhbHVlO1xuXG4gICAgICAgIC8vIFJlLXJlbmRlciB3aXRoIG5ldyBtYXJnaW4uXG4gICAgICAgIHRoYXQucmVuZGVyKCk7XG4gICAgICAgIC8vIFRlbGwgcGFyZW50IGxheWVyIHRoaXMgb25lIGhhcyBjaGFuZ2VkLlxuICAgICAgICB0aGF0LnRyaWdnZXIoJ2NoYW5nZWQnKTtcbiAgICB9KTtcblxuICAgIC8vIFNldCBpbml0aWFsIGNhbnZhcyBzaXplcy4gIFRoZXNlIGxpbmVzIG1heSBsb29rIHJlZHVuZGFudCwgYnV0IGJld2FyZVxuICAgIC8vIGJlY2F1c2UgdGhleSBhY3R1YWxseSBjYXVzZSBhbiBhcHByb3ByaWF0ZSB3aWR0aCBhbmQgaGVpZ2h0IHRvIGJlIHNldCBmb3JcbiAgICAvLyB0aGUgdGV4dCBjYW52YXMgYmVjYXVzZSBvZiB0aGUgcHJvcGVydGllcyBkZWNsYXJlZCBhYm92ZS5cbiAgICB0aGlzLndpZHRoID0gdGhpcy5fY2FudmFzLndpZHRoO1xuICAgIHRoaXMuaGVpZ2h0ID0gdGhpcy5fY2FudmFzLmhlaWdodDtcblxuICAgIHRoaXMuX21vZGVsLm9uKCd0ZXh0X2NoYW5nZWQnLCB1dGlscy5wcm94eSh0aGlzLl9oYW5kbGVfdmFsdWVfY2hhbmdlZCwgdGhpcykpO1xuICAgIHRoaXMuX21vZGVsLm9uKCdyb3dzX2FkZGVkJywgdXRpbHMucHJveHkodGhpcy5faGFuZGxlX3Jvd3NfYWRkZWQsIHRoaXMpKTtcbiAgICB0aGlzLl9tb2RlbC5vbigncm93c19yZW1vdmVkJywgdXRpbHMucHJveHkodGhpcy5faGFuZGxlX3Jvd3NfcmVtb3ZlZCwgdGhpcykpO1xuICAgIHRoaXMuX21vZGVsLm9uKCdyb3dfY2hhbmdlZCcsIHV0aWxzLnByb3h5KHRoaXMuX2hhbmRsZV9yb3dfY2hhbmdlZCwgdGhpcykpOyAvLyBUT0RPOiBJbXBsZW1lbnQgbXkgZXZlbnQuXG59O1xudXRpbHMuaW5oZXJpdChSb3dSZW5kZXJlciwgcmVuZGVyZXIuUmVuZGVyZXJCYXNlKTtcblxuLyoqXG4gKiBSZW5kZXIgdG8gdGhlIGNhbnZhc1xuICogTm90ZTogVGhpcyBtZXRob2QgaXMgY2FsbGVkIG9mdGVuLCBzbyBpdCdzIGltcG9ydGFudCB0aGF0IGl0J3NcbiAqIG9wdGltaXplZCBmb3Igc3BlZWQuXG4gKiBAcGFyYW0ge2RpY3Rpb25hcnl9IChvcHRpb25hbCkgc2Nyb2xsIC0gSG93IG11Y2ggdGhlIGNhbnZhcyB3YXMgc2Nyb2xsZWQuICBUaGlzXG4gKiAgICAgICAgICAgICAgICAgICAgIGlzIGEgZGljdGlvbmFyeSBvZiB0aGUgZm9ybSB7eDogZmxvYXQsIHk6IGZsb2F0fVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuUm93UmVuZGVyZXIucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKHNjcm9sbCkge1xuXG4gICAgLy8gSWYgb25seSB0aGUgeSBheGlzIHdhcyBzY3JvbGxlZCwgYmxpdCB0aGUgZ29vZCBjb250ZW50cyBhbmQganVzdCByZW5kZXJcbiAgICAvLyB3aGF0J3MgbWlzc2luZy5cbiAgICB2YXIgcGFydGlhbF9yZWRyYXcgPSAoc2Nyb2xsICYmIHNjcm9sbC54ID09PSAwICYmIE1hdGguYWJzKHNjcm9sbC55KSA8IHRoaXMuX2NhbnZhcy5oZWlnaHQpO1xuXG4gICAgLy8gVXBkYXRlIHRoZSB0ZXh0IHJlbmRlcmluZ1xuICAgIHZhciB2aXNpYmxlX3Jvd3MgPSB0aGlzLmdldF92aXNpYmxlX3Jvd3MoKTtcbiAgICB0aGlzLl9yZW5kZXJfdGV4dF9jYW52YXMoLXRoaXMuX3Njcm9sbGluZ19jYW52YXMuc2Nyb2xsX2xlZnQrdGhpcy5fbWFyZ2luX2xlZnQsIHZpc2libGVfcm93cy50b3Bfcm93LCAhcGFydGlhbF9yZWRyYXcpO1xuXG4gICAgLy8gQ29weSB0aGUgdGV4dCBpbWFnZSB0byB0aGlzIGNhbnZhc1xuICAgIHRoaXMuX2NhbnZhcy5jbGVhcigpO1xuICAgIHRoaXMuX2NhbnZhcy5kcmF3X2ltYWdlKFxuICAgICAgICB0aGlzLl90ZXh0X2NhbnZhcywgXG4gICAgICAgIHRoaXMuX3Njcm9sbGluZ19jYW52YXMuc2Nyb2xsX2xlZnQsIFxuICAgICAgICB0aGlzLmdldF9yb3dfdG9wKHZpc2libGVfcm93cy50b3Bfcm93KSk7XG59O1xuXG4vKipcbiAqIFJlbmRlciB0ZXh0IHRvIHRoZSB0ZXh0IGNhbnZhcy5cbiAqXG4gKiBMYXRlciwgdGhlIG1haW4gcmVuZGVyaW5nIGZ1bmN0aW9uIGNhbiB1c2UgdGhpcyByZW5kZXJlZCB0ZXh0IHRvIGRyYXcgdGhlXG4gKiBiYXNlIGNhbnZhcy5cbiAqIEBwYXJhbSAge2Zsb2F0fSB4X29mZnNldCAtIGhvcml6b250YWwgb2Zmc2V0IG9mIHRoZSB0ZXh0XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSB0b3Bfcm93XG4gKiBAcGFyYW0gIHtib29sZWFufSBmb3JjZV9yZWRyYXcgLSByZWRyYXcgdGhlIGNvbnRlbnRzIGV2ZW4gaWYgdGhleSBhcmVcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGUgc2FtZSBhcyB0aGUgY2FjaGVkIGNvbnRlbnRzLlxuICogQHJldHVybiB7bnVsbH0gICAgICAgICAgXG4gKi9cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5fcmVuZGVyX3RleHRfY2FudmFzID0gZnVuY3Rpb24oeF9vZmZzZXQsIHRvcF9yb3csIGZvcmNlX3JlZHJhdykge1xuXG4gICAgLy8gVHJ5IHRvIHJldXNlIHNvbWUgb2YgdGhlIGFscmVhZHkgcmVuZGVyZWQgdGV4dCBpZiBwb3NzaWJsZS5cbiAgICB2YXIgcmVuZGVyZWQgPSBmYWxzZTtcbiAgICB2YXIgcm93X2hlaWdodCA9IHRoaXMuZ2V0X3Jvd19oZWlnaHQoKTtcbiAgICBpZiAoIWZvcmNlX3JlZHJhdyAmJiB0aGlzLl9sYXN0X3JlbmRlcmVkX29mZnNldCA9PT0geF9vZmZzZXQpIHtcbiAgICAgICAgdmFyIGxhc3RfdG9wID0gdGhpcy5fbGFzdF9yZW5kZXJlZF9yb3c7XG4gICAgICAgIHZhciBzY3JvbGwgPSB0b3Bfcm93IC0gbGFzdF90b3A7IC8vIFBvc2l0aXZlID0gdXNlciBzY3JvbGxpbmcgZG93bndhcmQuXG4gICAgICAgIGlmIChzY3JvbGwgPCB0aGlzLl9sYXN0X3JlbmRlcmVkX3Jvd19jb3VudCkge1xuXG4gICAgICAgICAgICAvLyBHZXQgYSBzbmFwc2hvdCBvZiB0aGUgdGV4dCBiZWZvcmUgdGhlIHNjcm9sbC5cbiAgICAgICAgICAgIHRoaXMuX3RtcF9jYW52YXMuY2xlYXIoKTtcbiAgICAgICAgICAgIHRoaXMuX3RtcF9jYW52YXMuZHJhd19pbWFnZSh0aGlzLl90ZXh0X2NhbnZhcywgMCwgMCk7XG5cbiAgICAgICAgICAgIC8vIFJlbmRlciB0aGUgbmV3IHRleHQuXG4gICAgICAgICAgICB2YXIgc2F2ZWRfcm93cyA9IHRoaXMuX2xhc3RfcmVuZGVyZWRfcm93X2NvdW50IC0gTWF0aC5hYnMoc2Nyb2xsKTtcbiAgICAgICAgICAgIHZhciBuZXdfcm93cyA9IHRoaXMuX3Zpc2libGVfcm93X2NvdW50IC0gc2F2ZWRfcm93cztcbiAgICAgICAgICAgIGlmIChzY3JvbGwgPiAwKSB7XG4gICAgICAgICAgICAgICAgLy8gUmVuZGVyIHRoZSBib3R0b20uXG4gICAgICAgICAgICAgICAgdGhpcy5fdGV4dF9jYW52YXMuY2xlYXIoKTtcbiAgICAgICAgICAgICAgICBmb3IgKGkgPSB0b3Bfcm93K3NhdmVkX3Jvd3M7IGkgPCB0b3Bfcm93K3RoaXMuX3Zpc2libGVfcm93X2NvdW50OyBpKyspIHsgICAgIFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9yZW5kZXJfcm93KGksIHhfb2Zmc2V0LCAoaSAtIHRvcF9yb3cpICogcm93X2hlaWdodCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChzY3JvbGwgPCAwKSB7XG4gICAgICAgICAgICAgICAgLy8gUmVuZGVyIHRoZSB0b3AuXG4gICAgICAgICAgICAgICAgdGhpcy5fdGV4dF9jYW52YXMuY2xlYXIoKTtcbiAgICAgICAgICAgICAgICBmb3IgKGkgPSB0b3Bfcm93OyBpIDwgdG9wX3JvdytuZXdfcm93czsgaSsrKSB7ICAgXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlcl9yb3coaSwgeF9vZmZzZXQsIChpIC0gdG9wX3JvdykgKiByb3dfaGVpZ2h0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIE5vdGhpbmcgaGFzIGNoYW5nZWQuXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVc2UgdGhlIG9sZCBjb250ZW50IHRvIGZpbGwgaW4gdGhlIHJlc3QuXG4gICAgICAgICAgICB0aGlzLl90ZXh0X2NhbnZhcy5kcmF3X2ltYWdlKHRoaXMuX3RtcF9jYW52YXMsIDAsIC1zY3JvbGwgKiB0aGlzLmdldF9yb3dfaGVpZ2h0KCkpO1xuICAgICAgICAgICAgdGhpcy50cmlnZ2VyKCdyb3dzX2NoYW5nZWQnLCB0b3Bfcm93LCB0b3Bfcm93ICsgdGhpcy5fdmlzaWJsZV9yb3dfY291bnQgLSAxKTtcbiAgICAgICAgICAgIHJlbmRlcmVkID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIEZ1bGwgcmVuZGVyaW5nLlxuICAgIGlmICghcmVuZGVyZWQpIHtcbiAgICAgICAgdGhpcy5fdGV4dF9jYW52YXMuY2xlYXIoKTtcblxuICAgICAgICAvLyBSZW5kZXIgdGlsbCB0aGVyZSBhcmUgbm8gcm93cyBsZWZ0LCBvciB0aGUgdG9wIG9mIHRoZSByb3cgaXNcbiAgICAgICAgLy8gYmVsb3cgdGhlIGJvdHRvbSBvZiB0aGUgdmlzaWJsZSBhcmVhLlxuICAgICAgICBmb3IgKGkgPSB0b3Bfcm93OyBpIDwgdG9wX3JvdyArIHRoaXMuX3Zpc2libGVfcm93X2NvdW50OyBpKyspIHsgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5fcmVuZGVyX3JvdyhpLCB4X29mZnNldCwgKGkgLSB0b3Bfcm93KSAqIHJvd19oZWlnaHQpO1xuICAgICAgICB9ICAgXG4gICAgICAgIHRoaXMudHJpZ2dlcigncm93c19jaGFuZ2VkJywgdG9wX3JvdywgdG9wX3JvdyArIHRoaXMuX3Zpc2libGVfcm93X2NvdW50IC0gMSk7XG4gICAgfVxuXG4gICAgLy8gUmVtZW1iZXIgZm9yIGRlbHRhIHJlbmRlcmluZy5cbiAgICB0aGlzLl9sYXN0X3JlbmRlcmVkX3JvdyA9IHRvcF9yb3c7XG4gICAgdGhpcy5fbGFzdF9yZW5kZXJlZF9yb3dfY291bnQgPSB0aGlzLl92aXNpYmxlX3Jvd19jb3VudDtcbiAgICB0aGlzLl9sYXN0X3JlbmRlcmVkX29mZnNldCA9IHhfb2Zmc2V0O1xufTtcblxuLyoqXG4gKiBHZXRzIHRoZSByb3cgYW5kIGNoYXJhY3RlciBpbmRpY2llcyBjbG9zZXN0IHRvIGdpdmVuIGNvbnRyb2wgc3BhY2UgY29vcmRpbmF0ZXMuXG4gKiBAcGFyYW0gIHtmbG9hdH0gY3Vyc29yX3ggLSB4IHZhbHVlLCAwIGlzIHRoZSBsZWZ0IG9mIHRoZSBjYW52YXMuXG4gKiBAcGFyYW0gIHtmbG9hdH0gY3Vyc29yX3kgLSB5IHZhbHVlLCAwIGlzIHRoZSB0b3Agb2YgdGhlIGNhbnZhcy5cbiAqIEByZXR1cm4ge2RpY3Rpb25hcnl9IGRpY3Rpb25hcnkgb2YgdGhlIGZvcm0ge3Jvd19pbmRleCwgY2hhcl9pbmRleH1cbiAqL1xuUm93UmVuZGVyZXIucHJvdG90eXBlLmdldF9yb3dfY2hhciA9IGZ1bmN0aW9uKGN1cnNvcl94LCBjdXJzb3JfeSkge1xuICAgIHZhciByb3dfaW5kZXggPSBNYXRoLmZsb29yKChjdXJzb3JfeSAtIHRoaXMuX21hcmdpbl90b3ApIC8gdGhpcy5nZXRfcm93X2hlaWdodCgpKTtcblxuICAgIC8vIEZpbmQgdGhlIGNoYXJhY3RlciBpbmRleC5cbiAgICB2YXIgd2lkdGhzID0gWzBdO1xuICAgIHRyeSB7XG4gICAgICAgIGZvciAodmFyIGxlbmd0aD0xOyBsZW5ndGg8PXRoaXMuX21vZGVsLl9yb3dzW3Jvd19pbmRleF0ubGVuZ3RoOyBsZW5ndGgrKykge1xuICAgICAgICAgICAgd2lkdGhzLnB1c2godGhpcy5tZWFzdXJlX3BhcnRpYWxfcm93X3dpZHRoKHJvd19pbmRleCwgbGVuZ3RoKSk7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vIE5vbSBub20gbm9tLi4uXG4gICAgfVxuICAgIHZhciBjb29yZHMgPSB0aGlzLl9tb2RlbC52YWxpZGF0ZV9jb29yZHMocm93X2luZGV4LCB1dGlscy5maW5kX2Nsb3Nlc3Qod2lkdGhzLCBjdXJzb3JfeCAtIHRoaXMuX21hcmdpbl9sZWZ0KSk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcm93X2luZGV4OiBjb29yZHMuc3RhcnRfcm93LFxuICAgICAgICBjaGFyX2luZGV4OiBjb29yZHMuc3RhcnRfY2hhcixcbiAgICB9O1xufTtcblxuLyoqXG4gKiBNZWFzdXJlcyB0aGUgcGFydGlhbCB3aWR0aCBvZiBhIHRleHQgcm93LlxuICogQHBhcmFtICB7aW50ZWdlcn0gaW5kZXhcbiAqIEBwYXJhbSAge2ludGVnZXJ9IChvcHRpb25hbCkgbGVuZ3RoIC0gbnVtYmVyIG9mIGNoYXJhY3RlcnNcbiAqIEByZXR1cm4ge2Zsb2F0fSB3aWR0aFxuICovXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUubWVhc3VyZV9wYXJ0aWFsX3Jvd193aWR0aCA9IGZ1bmN0aW9uKGluZGV4LCBsZW5ndGgpIHtcbiAgICBpZiAoMCA+IGluZGV4IHx8IGluZGV4ID49IHRoaXMuX21vZGVsLl9yb3dzLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gMDsgXG4gICAgfVxuXG4gICAgdmFyIHRleHQgPSB0aGlzLl9tb2RlbC5fcm93c1tpbmRleF07XG4gICAgdGV4dCA9IChsZW5ndGggPT09IHVuZGVmaW5lZCkgPyB0ZXh0IDogdGV4dC5zdWJzdHJpbmcoMCwgbGVuZ3RoKTtcblxuICAgIHJldHVybiB0aGlzLl9jYW52YXMubWVhc3VyZV90ZXh0KHRleHQsIHRoaXMuX2Jhc2Vfb3B0aW9ucyk7XG59O1xuXG4vKipcbiAqIE1lYXN1cmVzIGEgc3RyaW5ncyB3aWR0aC5cbiAqIEBwYXJhbSAge3N0cmluZ30gdGV4dCAtIHRleHQgdG8gbWVhc3VyZSB0aGUgd2lkdGggb2ZcbiAqIEBwYXJhbSAge2ludGVnZXJ9IFtpbmRleF0gLSByb3cgaW5kZXgsIGNhbiBiZSB1c2VkIHRvIGFwcGx5IHNpemUgc2Vuc2l0aXZlIFxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdHRpbmcgdG8gdGhlIHRleHQuXG4gKiBAcmV0dXJuIHtmbG9hdH0gd2lkdGhcbiAqL1xuUm93UmVuZGVyZXIucHJvdG90eXBlLl9tZWFzdXJlX3RleHRfd2lkdGggPSBmdW5jdGlvbih0ZXh0KSB7XG4gICAgcmV0dXJuIHRoaXMuX2NhbnZhcy5tZWFzdXJlX3RleHQodGV4dCwgdGhpcy5fYmFzZV9vcHRpb25zKTtcbn07XG5cbi8qKlxuICogTWVhc3VyZXMgdGhlIGhlaWdodCBvZiBhIHRleHQgcm93IGFzIGlmIGl0IHdlcmUgcmVuZGVyZWQuXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSAob3B0aW9uYWwpIGluZGV4XG4gKiBAcmV0dXJuIHtmbG9hdH0gaGVpZ2h0XG4gKi9cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5nZXRfcm93X2hlaWdodCA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgcmV0dXJuIHRoaXMuX2Jhc2Vfb3B0aW9ucy5mb250X3NpemUgKyB0aGlzLl9saW5lX3NwYWNpbmc7XG59O1xuXG4vKipcbiAqIEdldHMgdGhlIHRvcCBvZiB0aGUgcm93IHdoZW4gcmVuZGVyZWRcbiAqIEBwYXJhbSAge2ludGVnZXJ9IGluZGV4XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuZ2V0X3Jvd190b3AgPSBmdW5jdGlvbihpbmRleCkge1xuICAgIHJldHVybiBpbmRleCAqIHRoaXMuZ2V0X3Jvd19oZWlnaHQoKSArIHRoaXMuX21hcmdpbl90b3A7XG59O1xuXG4vKipcbiAqIEdldHMgdGhlIHZpc2libGUgcm93cy5cbiAqIEByZXR1cm4ge2RpY3Rpb25hcnl9IGRpY3Rpb25hcnkgY29udGFpbmluZyBpbmZvcm1hdGlvbiBhYm91dCBcbiAqICAgICAgICAgICAgICAgICAgICAgIHRoZSB2aXNpYmxlIHJvd3MuICBGb3JtYXQge3RvcF9yb3csIFxuICogICAgICAgICAgICAgICAgICAgICAgYm90dG9tX3Jvdywgcm93X2NvdW50fS5cbiAqL1xuUm93UmVuZGVyZXIucHJvdG90eXBlLmdldF92aXNpYmxlX3Jvd3MgPSBmdW5jdGlvbigpIHtcblxuICAgIC8vIEZpbmQgdGhlIHJvdyBjbG9zZXN0IHRvIHRoZSBzY3JvbGwgdG9wLiAgSWYgdGhhdCByb3cgaXMgYmVsb3dcbiAgICAvLyB0aGUgc2Nyb2xsIHRvcCwgdXNlIHRoZSBwYXJ0aWFsbHkgZGlzcGxheWVkIHJvdyBhYm92ZSBpdC5cbiAgICB2YXIgdG9wX3JvdyA9IE1hdGgubWF4KDAsIE1hdGguZmxvb3IoKHRoaXMuX3Njcm9sbGluZ19jYW52YXMuc2Nyb2xsX3RvcCAtIHRoaXMuX21hcmdpbl90b3ApICAvIHRoaXMuZ2V0X3Jvd19oZWlnaHQoKSkpO1xuXG4gICAgLy8gRmluZCB0aGUgcm93IGNsb3Nlc3QgdG8gdGhlIHNjcm9sbCBib3R0b20uICBJZiB0aGF0IHJvdyBpcyBhYm92ZVxuICAgIC8vIHRoZSBzY3JvbGwgYm90dG9tLCB1c2UgdGhlIHBhcnRpYWxseSBkaXNwbGF5ZWQgcm93IGJlbG93IGl0LlxuICAgIHZhciByb3dfY291bnQgPSBNYXRoLmNlaWwodGhpcy5fY2FudmFzLmhlaWdodCAvIHRoaXMuZ2V0X3Jvd19oZWlnaHQoKSk7XG4gICAgdmFyIGJvdHRvbV9yb3cgPSB0b3Bfcm93ICsgcm93X2NvdW50O1xuXG4gICAgLy8gUm93IGNvdW50ICsgMSB0byBpbmNsdWRlIGZpcnN0IHJvdy5cbiAgICByZXR1cm4ge3RvcF9yb3c6IHRvcF9yb3csIGJvdHRvbV9yb3c6IGJvdHRvbV9yb3csIHJvd19jb3VudDogcm93X2NvdW50KzF9O1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIHdoZW4gdGhlIG1vZGVsJ3MgdmFsdWUgY2hhbmdlc1xuICogQ29tcGxleGl0eTogTyhOKSBmb3IgTiByb3dzIG9mIHRleHQuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuX2hhbmRsZV92YWx1ZV9jaGFuZ2VkID0gZnVuY3Rpb24oKSB7XG5cbiAgICAvLyBDYWxjdWxhdGUgdGhlIGRvY3VtZW50IHdpZHRoLlxuICAgIHRoaXMuX3Jvd193aWR0aF9jb3VudHMgPSB7fTtcbiAgICB2YXIgZG9jdW1lbnRfd2lkdGggPSAwO1xuICAgIGZvciAodmFyIGk9MDsgaTx0aGlzLl9tb2RlbC5fcm93cy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgd2lkdGggPSB0aGlzLl9tZWFzdXJlX3Jvd193aWR0aChpKSArIHRoaXMuX21hcmdpbl9sZWZ0O1xuICAgICAgICBkb2N1bWVudF93aWR0aCA9IE1hdGgubWF4KHdpZHRoLCBkb2N1bWVudF93aWR0aCk7XG4gICAgICAgIGlmICh0aGlzLl9yb3dfd2lkdGhfY291bnRzW3dpZHRoXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGlzLl9yb3dfd2lkdGhfY291bnRzW3dpZHRoXSA9IDE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9yb3dfd2lkdGhfY291bnRzW3dpZHRoXSsrO1xuICAgICAgICB9XG4gICAgfVxuICAgIHRoaXMuX3Njcm9sbGluZ19jYW52YXMuc2Nyb2xsX3dpZHRoID0gZG9jdW1lbnRfd2lkdGg7XG4gICAgdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfaGVpZ2h0ID0gdGhpcy5fbW9kZWwuX3Jvd3MubGVuZ3RoICogdGhpcy5nZXRfcm93X2hlaWdodCgpICsgdGhpcy5fbWFyZ2luX3RvcDtcbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIG9uZSBvZiB0aGUgbW9kZWwncyByb3dzIGNoYW5nZVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuUm93UmVuZGVyZXIucHJvdG90eXBlLl9oYW5kbGVfcm93X2NoYW5nZWQgPSBmdW5jdGlvbih0ZXh0LCBpbmRleCkge1xuICAgIHZhciBuZXdfd2lkdGggPSB0aGlzLl9tZWFzdXJlX3Jvd193aWR0aChpbmRleCkgKyB0aGlzLl9tYXJnaW5fbGVmdDtcbiAgICB2YXIgb2xkX3dpZHRoID0gdGhpcy5fbWVhc3VyZV90ZXh0X3dpZHRoKHRleHQsIGluZGV4KSArIHRoaXMuX21hcmdpbl9sZWZ0O1xuICAgIGlmICh0aGlzLl9yb3dfd2lkdGhfY291bnRzW29sZF93aWR0aF0gPT0gMSkge1xuICAgICAgICBkZWxldGUgdGhpcy5fcm93X3dpZHRoX2NvdW50c1tvbGRfd2lkdGhdO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3Jvd193aWR0aF9jb3VudHNbb2xkX3dpZHRoXS0tOyAgICAgICAgXG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3Jvd193aWR0aF9jb3VudHNbbmV3X3dpZHRoXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuX3Jvd193aWR0aF9jb3VudHNbbmV3X3dpZHRoXSsrO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3Jvd193aWR0aF9jb3VudHNbbmV3X3dpZHRoXSA9IDE7XG4gICAgfVxuXG4gICAgdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfd2lkdGggPSB0aGlzLl9maW5kX2xhcmdlc3Rfd2lkdGgoKTtcbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIG9uZSBvciBtb3JlIHJvd3MgYXJlIGFkZGVkIHRvIHRoZSBtb2RlbFxuICpcbiAqIEFzc3VtZXMgY29uc3RhbnQgcm93IGhlaWdodC5cbiAqIEBwYXJhbSAge2ludGVnZXJ9IHN0YXJ0XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBlbmRcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5faGFuZGxlX3Jvd3NfYWRkZWQgPSBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gICAgdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfaGVpZ2h0ICs9IChlbmQgLSBzdGFydCArIDEpICogdGhpcy5nZXRfcm93X2hlaWdodCgpO1xuICAgIFxuICAgIGZvciAodmFyIGkgPSBzdGFydDsgaSA8PSBlbmQ7IGkrKykgeyBcbiAgICAgICAgdmFyIG5ld193aWR0aCA9IHRoaXMuX21lYXN1cmVfcm93X3dpZHRoKGkpICsgdGhpcy5fbWFyZ2luX2xlZnQ7XG4gICAgICAgIGlmICh0aGlzLl9yb3dfd2lkdGhfY291bnRzW25ld193aWR0aF0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhpcy5fcm93X3dpZHRoX2NvdW50c1tuZXdfd2lkdGhdKys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9yb3dfd2lkdGhfY291bnRzW25ld193aWR0aF0gPSAxO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5fc2Nyb2xsaW5nX2NhbnZhcy5zY3JvbGxfd2lkdGggPSB0aGlzLl9maW5kX2xhcmdlc3Rfd2lkdGgoKTtcbn07XG5cbi8qKlxuICogSGFuZGxlcyB3aGVuIG9uZSBvciBtb3JlIHJvd3MgYXJlIHJlbW92ZWQgZnJvbSB0aGUgbW9kZWxcbiAqXG4gKiBBc3N1bWVzIGNvbnN0YW50IHJvdyBoZWlnaHQuXG4gKiBAcGFyYW0gIHthcnJheX0gcm93c1xuICogQHBhcmFtICB7aW50ZWdlcn0gW2luZGV4XVxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuUm93UmVuZGVyZXIucHJvdG90eXBlLl9oYW5kbGVfcm93c19yZW1vdmVkID0gZnVuY3Rpb24ocm93cywgaW5kZXgpIHtcbiAgICAvLyBEZWNyZWFzZSB0aGUgc2Nyb2xsaW5nIGhlaWdodCBiYXNlZCBvbiB0aGUgbnVtYmVyIG9mIHJvd3MgcmVtb3ZlZC5cbiAgICB0aGlzLl9zY3JvbGxpbmdfY2FudmFzLnNjcm9sbF9oZWlnaHQgLT0gcm93cy5sZW5ndGggKiB0aGlzLmdldF9yb3dfaGVpZ2h0KCk7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJvd3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIG9sZF93aWR0aCA9IHRoaXMuX21lYXN1cmVfdGV4dF93aWR0aChyb3dzW2ldLCBpICsgaW5kZXgpICsgdGhpcy5fbWFyZ2luX2xlZnQ7XG4gICAgICAgIGlmICh0aGlzLl9yb3dfd2lkdGhfY291bnRzW29sZF93aWR0aF0gPT0gMSkge1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuX3Jvd193aWR0aF9jb3VudHNbb2xkX3dpZHRoXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX3Jvd193aWR0aF9jb3VudHNbb2xkX3dpZHRoXS0tOyAgICAgICAgXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLl9zY3JvbGxpbmdfY2FudmFzLnNjcm9sbF93aWR0aCA9IHRoaXMuX2ZpbmRfbGFyZ2VzdF93aWR0aCgpO1xufTtcblxuLyoqXG4gKiBSZW5kZXIgYSBzaW5nbGUgcm93XG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBpbmRleFxuICogQHBhcmFtICB7ZmxvYXR9IHhcbiAqIEBwYXJhbSAge2Zsb2F0fSB5XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuX3JlbmRlcl9yb3cgPSBmdW5jdGlvbihpbmRleCwgeCAseSkge1xuICAgIHRoaXMuX3RleHRfY2FudmFzLmRyYXdfdGV4dCh4LCB5LCB0aGlzLl9tb2RlbC5fcm93c1tpbmRleF0sIHRoaXMuX2Jhc2Vfb3B0aW9ucyk7XG59O1xuXG4vKipcbiAqIE1lYXN1cmVzIHRoZSB3aWR0aCBvZiBhIHRleHQgcm93IGFzIGlmIGl0IHdlcmUgcmVuZGVyZWQuXG4gKiBAcGFyYW0gIHtpbnRlZ2VyfSBpbmRleFxuICogQHJldHVybiB7ZmxvYXR9IHdpZHRoXG4gKi9cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5fbWVhc3VyZV9yb3dfd2lkdGggPSBmdW5jdGlvbihpbmRleCkge1xuICAgIHJldHVybiB0aGlzLm1lYXN1cmVfcGFydGlhbF9yb3dfd2lkdGgoaW5kZXgsIHRoaXMuX21vZGVsLl9yb3dzW2luZGV4XS5sZW5ndGgpO1xufTtcblxuLyoqXG4gKiBGaW5kIHRoZSBsYXJnZXN0IHdpZHRoIGluIHRoZSB3aWR0aCByb3cgY291bnQgZGljdGlvbmFyeS5cbiAqIEByZXR1cm4ge2Zsb2F0fSB3aWR0aFxuICovXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuX2ZpbmRfbGFyZ2VzdF93aWR0aCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB2YWx1ZXMgPSBPYmplY3Qua2V5cyh0aGlzLl9yb3dfd2lkdGhfY291bnRzKTtcbiAgICB2YWx1ZXMuc29ydChmdW5jdGlvbihhLCBiKXsgXG4gICAgICAgIHJldHVybiBwYXJzZUZsb2F0KGIpIC0gcGFyc2VGbG9hdChhKTsgXG4gICAgfSk7XG4gICAgcmV0dXJuIHBhcnNlRmxvYXQodmFsdWVzWzBdKTtcbn07XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuUm93UmVuZGVyZXIgPSBSb3dSZW5kZXJlcjtcbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbnZhciBhbmltYXRvciA9IHJlcXVpcmUoJy4uL2FuaW1hdG9yLmpzJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy5qcycpO1xudmFyIHJlbmRlcmVyID0gcmVxdWlyZSgnLi9yZW5kZXJlci5qcycpO1xudmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4uL2NvbmZpZy5qcycpO1xuY29uZmlnID0gY29uZmlnLmNvbmZpZztcblxuLyoqXG4gKiBSZW5kZXIgZG9jdW1lbnQgc2VsZWN0aW9uIGJveGVzXG4gKlxuICogVE9ETzogT25seSByZW5kZXIgdmlzaWJsZS5cbiAqL1xudmFyIFNlbGVjdGlvbnNSZW5kZXJlciA9IGZ1bmN0aW9uKGN1cnNvcnMsIHN0eWxlLCByb3dfcmVuZGVyZXIsIGhhc19mb2N1cywgY3Vyc29yc19yZW5kZXJlcikge1xuICAgIHJlbmRlcmVyLlJlbmRlcmVyQmFzZS5jYWxsKHRoaXMpO1xuICAgIHRoaXMuc3R5bGUgPSBzdHlsZTtcbiAgICB0aGlzLl9oYXNfZm9jdXMgPSBoYXNfZm9jdXM7XG5cbiAgICAvLyBXaGVuIHRoZSBjdXJzb3JzIGNoYW5nZSwgcmVkcmF3IHRoZSBzZWxlY3Rpb24gYm94KGVzKS5cbiAgICB0aGlzLl9jdXJzb3JzID0gY3Vyc29ycztcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdmFyIHJlcmVuZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoYXQucmVuZGVyKCk7XG4gICAgICAgIC8vIFRlbGwgcGFyZW50IGxheWVyIHRoaXMgb25lIGhhcyBjaGFuZ2VkLlxuICAgICAgICB0aGF0LnRyaWdnZXIoJ2NoYW5nZWQnKTtcbiAgICB9XG4gICAgdGhpcy5fY3Vyc29ycy5vbignY2hhbmdlJywgcmVyZW5kZXIpO1xuXG4gICAgLy8gV2hlbiB0aGUgc3R5bGUgaXMgY2hhbmdlZCwgcmVkcmF3IHRoZSBzZWxlY3Rpb24gYm94KGVzKS5cbiAgICB0aGlzLnN0eWxlLm9uKCdjaGFuZ2UnLCByZXJlbmRlcik7XG4gICAgY29uZmlnLm9uKCdjaGFuZ2UnLCByZXJlbmRlcik7XG5cbiAgICB0aGlzLl9yb3dfcmVuZGVyZXIgPSByb3dfcmVuZGVyZXI7XG4gICAgLy8gVE9ETzogUmVtb3ZlIHRoZSBmb2xsb3dpbmcgYmxvY2suXG4gICAgdGhpcy5fZ2V0X3Zpc2libGVfcm93cyA9IHV0aWxzLnByb3h5KHJvd19yZW5kZXJlci5nZXRfdmlzaWJsZV9yb3dzLCByb3dfcmVuZGVyZXIpO1xuICAgIHRoaXMuX2dldF9yb3dfaGVpZ2h0ID0gdXRpbHMucHJveHkocm93X3JlbmRlcmVyLmdldF9yb3dfaGVpZ2h0LCByb3dfcmVuZGVyZXIpO1xuICAgIHRoaXMuX2dldF9yb3dfdG9wID0gdXRpbHMucHJveHkocm93X3JlbmRlcmVyLmdldF9yb3dfdG9wLCByb3dfcmVuZGVyZXIpO1xuICAgIHRoaXMuX21lYXN1cmVfcGFydGlhbF9yb3cgPSB1dGlscy5wcm94eShyb3dfcmVuZGVyZXIubWVhc3VyZV9wYXJ0aWFsX3Jvd193aWR0aCwgcm93X3JlbmRlcmVyKTtcblxuICAgIC8vIFdoZW4gdGhlIGN1cnNvciBpcyBoaWRkZW4vc2hvd24sIHJlZHJhdyB0aGUgc2VsZWN0aW9uLlxuICAgIGN1cnNvcnNfcmVuZGVyZXIub24oJ3RvZ2dsZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGF0LnJlbmRlcigpO1xuICAgICAgICAvLyBUZWxsIHBhcmVudCBsYXllciB0aGlzIG9uZSBoYXMgY2hhbmdlZC5cbiAgICAgICAgdGhhdC50cmlnZ2VyKCdjaGFuZ2VkJyk7XG4gICAgfSk7XG59O1xudXRpbHMuaW5oZXJpdChTZWxlY3Rpb25zUmVuZGVyZXIsIHJlbmRlcmVyLlJlbmRlcmVyQmFzZSk7XG5cbi8qKlxuICogUmVuZGVyIHRvIHRoZSBjYW52YXNcbiAqIE5vdGU6IFRoaXMgbWV0aG9kIGlzIGNhbGxlZCBvZnRlbiwgc28gaXQncyBpbXBvcnRhbnQgdGhhdCBpdCdzXG4gKiBvcHRpbWl6ZWQgZm9yIHNwZWVkLlxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuU2VsZWN0aW9uc1JlbmRlcmVyLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9jYW52YXMuY2xlYXIoKTtcblxuICAgIC8vIEdldCBuZXdsaW5lIHdpZHRoLlxuICAgIHZhciBuZXdsaW5lX3dpZHRoID0gY29uZmlnLm5ld2xpbmVfd2lkdGg7XG4gICAgaWYgKG5ld2xpbmVfd2lkdGggPT09IHVuZGVmaW5lZCB8fCBuZXdsaW5lX3dpZHRoID09PSBudWxsKSB7XG4gICAgICAgIG5ld2xpbmVfd2lkdGggPSAyO1xuICAgIH1cblxuICAgIC8vIE9ubHkgcmVuZGVyIGlmIHRoZSBjYW52YXMgaGFzIGZvY3VzLlxuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLl9jdXJzb3JzLmN1cnNvcnMuZm9yRWFjaChmdW5jdGlvbihjdXJzb3IpIHtcbiAgICAgICAgLy8gR2V0IHRoZSB2aXNpYmxlIHJvd3MuXG4gICAgICAgIHZhciB2aXNpYmxlX3Jvd3MgPSB0aGF0Ll9nZXRfdmlzaWJsZV9yb3dzKCk7XG5cbiAgICAgICAgLy8gRHJhdyB0aGUgc2VsZWN0aW9uIGJveC5cbiAgICAgICAgaWYgKGN1cnNvci5zdGFydF9yb3cgIT09IG51bGwgJiYgY3Vyc29yLnN0YXJ0X2NoYXIgIT09IG51bGwgJiZcbiAgICAgICAgICAgIGN1cnNvci5lbmRfcm93ICE9PSBudWxsICYmIGN1cnNvci5lbmRfY2hhciAhPT0gbnVsbCkge1xuICAgICAgICAgICAgXG5cbiAgICAgICAgICAgIGZvciAodmFyIGkgPSBNYXRoLm1heChjdXJzb3Iuc3RhcnRfcm93LCB2aXNpYmxlX3Jvd3MudG9wX3Jvdyk7IFxuICAgICAgICAgICAgICAgIGkgPD0gTWF0aC5taW4oY3Vyc29yLmVuZF9yb3csIHZpc2libGVfcm93cy5ib3R0b21fcm93KTsgXG4gICAgICAgICAgICAgICAgaSsrKSB7XG5cbiAgICAgICAgICAgICAgICB2YXIgbGVmdCA9IHRoYXQuX3Jvd19yZW5kZXJlci5tYXJnaW5fbGVmdDtcbiAgICAgICAgICAgICAgICBpZiAoaSA9PSBjdXJzb3Iuc3RhcnRfcm93ICYmIGN1cnNvci5zdGFydF9jaGFyID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBsZWZ0ICs9IHRoYXQuX21lYXN1cmVfcGFydGlhbF9yb3coaSwgY3Vyc29yLnN0YXJ0X2NoYXIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciBzZWxlY3Rpb25fY29sb3I7XG4gICAgICAgICAgICAgICAgaWYgKHRoYXQuX2hhc19mb2N1cygpKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGlvbl9jb2xvciA9IHRoYXQuc3R5bGUuc2VsZWN0aW9uIHx8ICdza3libHVlJztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzZWxlY3Rpb25fY29sb3IgPSB0aGF0LnN0eWxlLnNlbGVjdGlvbl91bmZvY3VzZWQgfHwgJ2dyYXknO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciByaWdodDtcbiAgICAgICAgICAgICAgICBpZiAoaSAhPT0gY3Vyc29yLmVuZF9yb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgcmlnaHQgPSB0aGF0Ll9tZWFzdXJlX3BhcnRpYWxfcm93KGkpIC0gbGVmdCArIHRoYXQuX3Jvd19yZW5kZXJlci5tYXJnaW5fbGVmdCArIG5ld2xpbmVfd2lkdGg7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmlnaHQgPSB0aGF0Ll9tZWFzdXJlX3BhcnRpYWxfcm93KGksIGN1cnNvci5lbmRfY2hhcik7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgdGhpcyBpc24ndCB0aGUgZmlyc3Qgc2VsZWN0ZWQgcm93LCBtYWtlIHN1cmUgYXRsZWFzdCB0aGUgbmV3bGluZVxuICAgICAgICAgICAgICAgICAgICAvLyBpcyB2aXNpYmlseSBzZWxlY3RlZCBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSByb3cgYnkgbWFraW5nIHN1cmUgdGhhdFxuICAgICAgICAgICAgICAgICAgICAvLyB0aGUgc2VsZWN0aW9uIGJveCBpcyBhdGxlYXN0IHRoZSBzaXplIG9mIGEgbmV3bGluZSBjaGFyYWN0ZXIgKGFzXG4gICAgICAgICAgICAgICAgICAgIC8vIGRlZmluZWQgYnkgdGhlIHVzZXIgY29uZmlnKS5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGkgIT09IGN1cnNvci5zdGFydF9yb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJpZ2h0ID0gTWF0aC5tYXgobmV3bGluZV93aWR0aCwgcmlnaHQpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgcmlnaHQgPSByaWdodCAtIGxlZnQgKyB0aGF0Ll9yb3dfcmVuZGVyZXIubWFyZ2luX2xlZnQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHRoYXQuX2NhbnZhcy5kcmF3X3JlY3RhbmdsZShcbiAgICAgICAgICAgICAgICAgICAgbGVmdCwgXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuX2dldF9yb3dfdG9wKGkpLCBcbiAgICAgICAgICAgICAgICAgICAgcmlnaHQsIFxuICAgICAgICAgICAgICAgICAgICB0aGF0Ll9nZXRfcm93X2hlaWdodChpKSwgXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbGxfY29sb3I6IHNlbGVjdGlvbl9jb2xvcixcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbi8vIEV4cG9ydHNcbmV4cG9ydHMuU2VsZWN0aW9uc1JlbmRlcmVyID0gU2VsZWN0aW9uc1JlbmRlcmVyO1xuIiwiLy8gQ29weXJpZ2h0IChjKSBKb25hdGhhbiBGcmVkZXJpYywgc2VlIHRoZSBMSUNFTlNFIGZpbGUgZm9yIG1vcmUgaW5mby5cbnZhciBjYW52YXMgPSByZXF1aXJlKCcuL2NhbnZhcy5qcycpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xuXG4vKipcbiAqIEhUTUwgY2FudmFzIHdpdGggZHJhd2luZyBjb252aW5pZW5jZSBmdW5jdGlvbnMuXG4gKi9cbnZhciBTY3JvbGxpbmdDYW52YXMgPSBmdW5jdGlvbigpIHtcbiAgICBjYW52YXMuQ2FudmFzLmNhbGwodGhpcyk7XG4gICAgdGhpcy5fYmluZF9ldmVudHMoKTtcbiAgICB0aGlzLl9vbGRfc2Nyb2xsX2xlZnQgPSAwO1xuICAgIHRoaXMuX29sZF9zY3JvbGxfdG9wID0gMDtcblxuICAgIC8vIFNldCBkZWZhdWx0IHNpemUuXG4gICAgdGhpcy53aWR0aCA9IDQwMDtcbiAgICB0aGlzLmhlaWdodCA9IDMwMDtcbn07XG51dGlscy5pbmhlcml0KFNjcm9sbGluZ0NhbnZhcywgY2FudmFzLkNhbnZhcyk7XG5cbi8qKlxuICogQ2F1c2VzIHRoZSBjYW52YXMgY29udGVudHMgdG8gYmUgcmVkcmF3bi5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblNjcm9sbGluZ0NhbnZhcy5wcm90b3R5cGUucmVkcmF3ID0gZnVuY3Rpb24oc2Nyb2xsKSB7XG4gICAgdGhpcy5jbGVhcigpO1xuICAgIHRoaXMudHJpZ2dlcigncmVkcmF3Jywgc2Nyb2xsKTtcbn07XG5cbi8qKlxuICogTGF5b3V0IHRoZSBlbGVtZW50cyBmb3IgdGhlIGNhbnZhcy5cbiAqIENyZWF0ZXMgYHRoaXMuZWxgXG4gKiBcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblNjcm9sbGluZ0NhbnZhcy5wcm90b3R5cGUuX2xheW91dCA9IGZ1bmN0aW9uKCkge1xuICAgIGNhbnZhcy5DYW52YXMucHJvdG90eXBlLl9sYXlvdXQuY2FsbCh0aGlzKTtcbiAgICAvLyBDaGFuZ2UgdGhlIGNhbnZhcyBjbGFzcyBzbyBpdCdzIG5vdCBoaWRkZW4uXG4gICAgdGhpcy5fY2FudmFzLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnY2FudmFzJyk7XG5cbiAgICB0aGlzLmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgdGhpcy5lbC5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ3Bvc3RlciBzY3JvbGwtd2luZG93Jyk7XG4gICAgdGhpcy5lbC5zZXRBdHRyaWJ1dGUoJ3RhYmluZGV4JywgMCk7XG4gICAgdGhpcy5fc2Nyb2xsX2JhcnMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB0aGlzLl9zY3JvbGxfYmFycy5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ3Njcm9sbC1iYXJzJyk7XG4gICAgdGhpcy5fdG91Y2hfcGFuZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIHRoaXMuX3RvdWNoX3BhbmUuc2V0QXR0cmlidXRlKCdjbGFzcycsICd0b3VjaC1wYW5lJyk7XG4gICAgdGhpcy5fZHVtbXkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB0aGlzLl9kdW1teS5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ3Njcm9sbC1kdW1teScpO1xuXG4gICAgdGhpcy5lbC5hcHBlbmRDaGlsZCh0aGlzLl9jYW52YXMpO1xuICAgIHRoaXMuZWwuYXBwZW5kQ2hpbGQodGhpcy5fc2Nyb2xsX2JhcnMpO1xuICAgIHRoaXMuX3Njcm9sbF9iYXJzLmFwcGVuZENoaWxkKHRoaXMuX2R1bW15KTtcbiAgICB0aGlzLl9zY3JvbGxfYmFycy5hcHBlbmRDaGlsZCh0aGlzLl90b3VjaF9wYW5lKTtcbn07XG5cbi8qKlxuICogTWFrZSB0aGUgcHJvcGVydGllcyBvZiB0aGUgY2xhc3MuXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5TY3JvbGxpbmdDYW52YXMucHJvdG90eXBlLl9pbml0X3Byb3BlcnRpZXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBXaWR0aCBvZiB0aGUgc2Nyb2xsYWJsZSBjYW52YXMgYXJlYVxuICAgICAqL1xuICAgIHRoaXMucHJvcGVydHkoJ3Njcm9sbF93aWR0aCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBHZXRcbiAgICAgICAgcmV0dXJuIHRoYXQuX3Njcm9sbF93aWR0aCB8fCAwO1xuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIC8vIFNldFxuICAgICAgICB0aGF0Ll9zY3JvbGxfd2lkdGggPSB2YWx1ZTtcbiAgICAgICAgdGhhdC5fbW92ZV9kdW1teSh0aGF0Ll9zY3JvbGxfd2lkdGgsIHRoYXQuX3Njcm9sbF9oZWlnaHQgfHwgMCk7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBIZWlnaHQgb2YgdGhlIHNjcm9sbGFibGUgY2FudmFzIGFyZWEuXG4gICAgICovXG4gICAgdGhpcy5wcm9wZXJ0eSgnc2Nyb2xsX2hlaWdodCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBHZXRcbiAgICAgICAgcmV0dXJuIHRoYXQuX3Njcm9sbF9oZWlnaHQgfHwgMDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAvLyBTZXRcbiAgICAgICAgdGhhdC5fc2Nyb2xsX2hlaWdodCA9IHZhbHVlO1xuICAgICAgICB0aGF0Ll9tb3ZlX2R1bW15KHRoYXQuX3Njcm9sbF93aWR0aCB8fCAwLCB0aGF0Ll9zY3JvbGxfaGVpZ2h0KTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIFRvcCBtb3N0IHBpeGVsIGluIHRoZSBzY3JvbGxlZCB3aW5kb3cuXG4gICAgICovXG4gICAgdGhpcy5wcm9wZXJ0eSgnc2Nyb2xsX3RvcCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBHZXRcbiAgICAgICAgcmV0dXJuIHRoYXQuX3Njcm9sbF9iYXJzLnNjcm9sbFRvcDtcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAvLyBTZXRcbiAgICAgICAgdGhhdC5fc2Nyb2xsX2JhcnMuc2Nyb2xsVG9wID0gdmFsdWU7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBMZWZ0IG1vc3QgcGl4ZWwgaW4gdGhlIHNjcm9sbGVkIHdpbmRvdy5cbiAgICAgKi9cbiAgICB0aGlzLnByb3BlcnR5KCdzY3JvbGxfbGVmdCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBHZXRcbiAgICAgICAgcmV0dXJuIHRoYXQuX3Njcm9sbF9iYXJzLnNjcm9sbExlZnQ7XG4gICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgLy8gU2V0XG4gICAgICAgIHRoYXQuX3Njcm9sbF9iYXJzLnNjcm9sbExlZnQgPSB2YWx1ZTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIEhlaWdodCBvZiB0aGUgY2FudmFzXG4gICAgICogQHJldHVybiB7ZmxvYXR9XG4gICAgICovXG4gICAgdGhpcy5wcm9wZXJ0eSgnaGVpZ2h0JywgZnVuY3Rpb24oKSB7IFxuICAgICAgICByZXR1cm4gdGhhdC5fY2FudmFzLmhlaWdodCAvIDI7IFxuICAgIH0sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoYXQuX2NhbnZhcy5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsIHZhbHVlICogMik7XG4gICAgICAgIHRoYXQuZWwuc2V0QXR0cmlidXRlKCdzdHlsZScsICd3aWR0aDogJyArIHRoYXQud2lkdGggKyAncHg7IGhlaWdodDogJyArIHZhbHVlICsgJ3B4OycpO1xuXG4gICAgICAgIHRoYXQudHJpZ2dlcigncmVzaXplJywge2hlaWdodDogdmFsdWV9KTtcbiAgICAgICAgdGhhdC5fdHJ5X3JlZHJhdygpO1xuICAgICAgICBcbiAgICAgICAgLy8gU3RyZXRjaCB0aGUgaW1hZ2UgZm9yIHJldGluYSBzdXBwb3J0LlxuICAgICAgICB0aGlzLnNjYWxlKDIsMik7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBXaWR0aCBvZiB0aGUgY2FudmFzXG4gICAgICogQHJldHVybiB7ZmxvYXR9XG4gICAgICovXG4gICAgdGhpcy5wcm9wZXJ0eSgnd2lkdGgnLCBmdW5jdGlvbigpIHsgXG4gICAgICAgIHJldHVybiB0aGF0Ll9jYW52YXMud2lkdGggLyAyOyBcbiAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGF0Ll9jYW52YXMuc2V0QXR0cmlidXRlKCd3aWR0aCcsIHZhbHVlICogMik7XG4gICAgICAgIHRoYXQuZWwuc2V0QXR0cmlidXRlKCdzdHlsZScsICd3aWR0aDogJyArIHZhbHVlICsgJ3B4OyBoZWlnaHQ6ICcgKyB0aGF0LmhlaWdodCArICdweDsnKTtcblxuICAgICAgICB0aGF0LnRyaWdnZXIoJ3Jlc2l6ZScsIHt3aWR0aDogdmFsdWV9KTtcbiAgICAgICAgdGhhdC5fdHJ5X3JlZHJhdygpO1xuICAgICAgICBcbiAgICAgICAgLy8gU3RyZXRjaCB0aGUgaW1hZ2UgZm9yIHJldGluYSBzdXBwb3J0LlxuICAgICAgICB0aGlzLnNjYWxlKDIsMik7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBJcyB0aGUgY2FudmFzIG9yIHJlbGF0ZWQgZWxlbWVudHMgZm9jdXNlZD9cbiAgICAgKiBAcmV0dXJuIHtib29sZWFufVxuICAgICAqL1xuICAgIHRoaXMucHJvcGVydHkoJ2ZvY3VzZWQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQgPT09IHRoYXQuZWwgfHxcbiAgICAgICAgICAgIGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQgPT09IHRoYXQuX3Njcm9sbF9iYXJzIHx8XG4gICAgICAgICAgICBkb2N1bWVudC5hY3RpdmVFbGVtZW50ID09PSB0aGF0Ll9kdW1teSB8fFxuICAgICAgICAgICAgZG9jdW1lbnQuYWN0aXZlRWxlbWVudCA9PT0gdGhhdC5fY2FudmFzO1xuICAgIH0pO1xufTtcblxuLyoqXG4gKiBCaW5kIHRvIHRoZSBldmVudHMgb2YgdGhlIGNhbnZhcy5cbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblNjcm9sbGluZ0NhbnZhcy5wcm90b3R5cGUuX2JpbmRfZXZlbnRzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuXG4gICAgLy8gVHJpZ2dlciBzY3JvbGwgYW5kIHJlZHJhdyBldmVudHMgb24gc2Nyb2xsLlxuICAgIHRoaXMuX3Njcm9sbF9iYXJzLm9uc2Nyb2xsID0gZnVuY3Rpb24oZSkge1xuICAgICAgICB0aGF0LnRyaWdnZXIoJ3Njcm9sbCcsIGUpO1xuICAgICAgICBpZiAodGhhdC5fb2xkX3Njcm9sbF90b3AgIT09IHVuZGVmaW5lZCAmJiB0aGF0Ll9vbGRfc2Nyb2xsX2xlZnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdmFyIHNjcm9sbCA9IHtcbiAgICAgICAgICAgICAgICB4OiB0aGF0LnNjcm9sbF9sZWZ0IC0gdGhhdC5fb2xkX3Njcm9sbF9sZWZ0LFxuICAgICAgICAgICAgICAgIHk6IHRoYXQuc2Nyb2xsX3RvcCAtIHRoYXQuX29sZF9zY3JvbGxfdG9wLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRoYXQuX3RyeV9yZWRyYXcoc2Nyb2xsKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoYXQuX3RyeV9yZWRyYXcoKTtcbiAgICAgICAgfVxuICAgICAgICB0aGF0Ll9vbGRfc2Nyb2xsX2xlZnQgPSB0aGF0LnNjcm9sbF9sZWZ0O1xuICAgICAgICB0aGF0Ll9vbGRfc2Nyb2xsX3RvcCA9IHRoYXQuc2Nyb2xsX3RvcDtcbiAgICB9O1xuXG4gICAgLy8gUHJldmVudCBzY3JvbGwgYmFyIGhhbmRsZWQgbW91c2UgZXZlbnRzIGZyb20gYnViYmxpbmcuXG4gICAgdmFyIHNjcm9sbGJhcl9ldmVudCA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgaWYgKGUudGFyZ2V0ICE9PSB0aGF0Ll90b3VjaF9wYW5lKSB7XG4gICAgICAgICAgICB1dGlscy5jYW5jZWxfYnViYmxlKGUpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB0aGlzLl9zY3JvbGxfYmFycy5vbm1vdXNlZG93biA9IHNjcm9sbGJhcl9ldmVudDtcbiAgICB0aGlzLl9zY3JvbGxfYmFycy5vbm1vdXNldXAgPSBzY3JvbGxiYXJfZXZlbnQ7XG4gICAgdGhpcy5fc2Nyb2xsX2JhcnMub25jbGljayA9IHNjcm9sbGJhcl9ldmVudDtcbiAgICB0aGlzLl9zY3JvbGxfYmFycy5vbmRibGNsaWNrID0gc2Nyb2xsYmFyX2V2ZW50O1xufTtcblxuLyoqXG4gKiBRdWVyaWVzIHRvIHNlZSBpZiByZWRyYXcgaXMgb2theSwgYW5kIHRoZW4gcmVkcmF3cyBpZiBpdCBpcy5cbiAqIEByZXR1cm4ge2Jvb2xlYW59IHRydWUgaWYgcmVkcmF3IGhhcHBlbmVkLlxuICovXG5TY3JvbGxpbmdDYW52YXMucHJvdG90eXBlLl90cnlfcmVkcmF3ID0gZnVuY3Rpb24oc2Nyb2xsKSB7XG4gICAgaWYgKHRoaXMuX3F1ZXJ5X3JlZHJhdygpKSB7XG4gICAgICAgIHRoaXMucmVkcmF3KHNjcm9sbCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKipcbiAqIFRyaWdnZXIgdGhlICdxdWVyeV9yZWRyYXcnIGV2ZW50LlxuICogQHJldHVybiB7Ym9vbGVhbn0gdHJ1ZSBpZiBjb250cm9sIHNob3VsZCByZWRyYXcgaXRzZWxmLlxuICovXG5TY3JvbGxpbmdDYW52YXMucHJvdG90eXBlLl9xdWVyeV9yZWRyYXcgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy50cmlnZ2VyKCdxdWVyeV9yZWRyYXcnKS5ldmVyeShmdW5jdGlvbih4KSB7IHJldHVybiB4OyB9KTsgXG59O1xuXG4vKipcbiAqIE1vdmVzIHRoZSBkdW1teSBlbGVtZW50IHRoYXQgY2F1c2VzIHRoZSBzY3JvbGxiYXIgdG8gYXBwZWFyLlxuICogQHBhcmFtICB7ZmxvYXR9IHhcbiAqIEBwYXJhbSAge2Zsb2F0fSB5XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5TY3JvbGxpbmdDYW52YXMucHJvdG90eXBlLl9tb3ZlX2R1bW15ID0gZnVuY3Rpb24oeCwgeSkge1xuICAgIHRoaXMuX2R1bW15LnNldEF0dHJpYnV0ZSgnc3R5bGUnLCAnbGVmdDogJyArIFN0cmluZyh4KSArICdweDsgdG9wOiAnICsgU3RyaW5nKHkpICsgJ3B4OycpO1xuICAgIHRoaXMuX3RvdWNoX3BhbmUuc2V0QXR0cmlidXRlKCdzdHlsZScsIFxuICAgICAgICAnd2lkdGg6ICcgKyBTdHJpbmcoTWF0aC5tYXgoeCwgdGhpcy5fc2Nyb2xsX2JhcnMuY2xpZW50V2lkdGgpKSArICdweDsgJyArXG4gICAgICAgICdoZWlnaHQ6ICcgKyBTdHJpbmcoTWF0aC5tYXgoeSwgdGhpcy5fc2Nyb2xsX2JhcnMuY2xpZW50SGVpZ2h0KSkgKyAncHg7Jyk7XG59O1xuXG4vKipcbiAqIFRyYW5zZm9ybSBhbiB4IHZhbHVlIGJhc2VkIG9uIHNjcm9sbCBwb3NpdGlvbi5cbiAqIEBwYXJhbSAge2Zsb2F0fSB4XG4gKiBAcGFyYW0gIHtib29sZWFufSBpbnZlcnNlIC0gcGVyZm9ybSBpbnZlcnNlIHRyYW5zZm9ybWF0aW9uXG4gKiBAcmV0dXJuIHtmbG9hdH1cbiAqL1xuU2Nyb2xsaW5nQ2FudmFzLnByb3RvdHlwZS5fdHggPSBmdW5jdGlvbih4LCBpbnZlcnNlKSB7IHJldHVybiB4IC0gKGludmVyc2U/LTE6MSkgKiB0aGlzLnNjcm9sbF9sZWZ0OyB9O1xuXG4vKipcbiAqIFRyYW5zZm9ybSBhIHkgdmFsdWUgYmFzZWQgb24gc2Nyb2xsIHBvc2l0aW9uLlxuICogQHBhcmFtICB7ZmxvYXR9IHlcbiAqIEBwYXJhbSAge2Jvb2xlYW59IGludmVyc2UgLSBwZXJmb3JtIGludmVyc2UgdHJhbnNmb3JtYXRpb25cbiAqIEByZXR1cm4ge2Zsb2F0fVxuICovXG5TY3JvbGxpbmdDYW52YXMucHJvdG90eXBlLl90eSA9IGZ1bmN0aW9uKHksIGludmVyc2UpIHsgcmV0dXJuIHkgLSAoaW52ZXJzZT8tMToxKSAqIHRoaXMuc2Nyb2xsX3RvcDsgfTtcblxuLy8gRXhwb3J0c1xuZXhwb3J0cy5TY3JvbGxpbmdDYW52YXMgPSBTY3JvbGxpbmdDYW52YXM7XG4iLCIvLyBDb3B5cmlnaHQgKGMpIEpvbmF0aGFuIEZyZWRlcmljLCBzZWUgdGhlIExJQ0VOU0UgZmlsZSBmb3IgbW9yZSBpbmZvLlxuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG52YXIgc3R5bGVzID0gcmVxdWlyZSgnLi9zdHlsZXMvaW5pdC5qcycpO1xuXG4vKipcbiAqIFN0eWxlXG4gKi9cbnZhciBTdHlsZSA9IGZ1bmN0aW9uKCkge1xuICAgIHV0aWxzLlBvc3RlckNsYXNzLmNhbGwodGhpcywgW1xuICAgICAgICAnY29tbWVudCcsXG4gICAgICAgICdzdHJpbmcnLFxuICAgICAgICAnY2xhc3MtbmFtZScsXG4gICAgICAgICdrZXl3b3JkJyxcbiAgICAgICAgJ2Jvb2xlYW4nLFxuICAgICAgICAnZnVuY3Rpb24nLFxuICAgICAgICAnb3BlcmF0b3InLFxuICAgICAgICAnbnVtYmVyJyxcbiAgICAgICAgJ2lnbm9yZScsXG4gICAgICAgICdwdW5jdHVhdGlvbicsXG5cbiAgICAgICAgJ2N1cnNvcicsXG4gICAgICAgICdjdXJzb3Jfd2lkdGgnLFxuICAgICAgICAnY3Vyc29yX2hlaWdodCcsXG4gICAgICAgICdzZWxlY3Rpb24nLFxuICAgICAgICAnc2VsZWN0aW9uX3VuZm9jdXNlZCcsXG5cbiAgICAgICAgJ3RleHQnLFxuICAgICAgICAnYmFja2dyb3VuZCcsXG4gICAgXSk7XG5cbiAgICAvLyBMb2FkIHRoZSBkZWZhdWx0IHN0eWxlLlxuICAgIHRoaXMubG9hZCgncGVhY29jaycpO1xufTtcbnV0aWxzLmluaGVyaXQoU3R5bGUsIHV0aWxzLlBvc3RlckNsYXNzKTtcblxuLyoqXG4gKiBMb2FkIGEgcmVuZGVyaW5nIHN0eWxlXG4gKiBAcGFyYW0gIHtzdHJpbmcgb3IgZGljdGlvbmFyeX0gc3R5bGUgLSBuYW1lIG9mIHRoZSBidWlsdC1pbiBzdHlsZSBcbiAqICAgICAgICAgb3Igc3R5bGUgZGljdGlvbmFyeSBpdHNlbGYuXG4gKiBAcmV0dXJuIHtib29sZWFufSBzdWNjZXNzXG4gKi9cblN0eWxlLnByb3RvdHlwZS5sb2FkID0gZnVuY3Rpb24oc3R5bGUpIHtcbiAgICB0cnkge1xuICAgICAgICAvLyBMb2FkIHRoZSBzdHlsZSBpZiBpdCdzIGJ1aWx0LWluLlxuICAgICAgICBpZiAoc3R5bGVzLnN0eWxlc1tzdHlsZV0pIHtcbiAgICAgICAgICAgIHN0eWxlID0gc3R5bGVzLnN0eWxlc1tzdHlsZV0uc3R5bGU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZWFkIGVhY2ggYXR0cmlidXRlIG9mIHRoZSBzdHlsZS5cbiAgICAgICAgZm9yICh2YXIga2V5IGluIHN0eWxlKSB7XG4gICAgICAgICAgICBpZiAoc3R5bGUuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgIHRoaXNba2V5XSA9IHN0eWxlW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgbG9hZGluZyBzdHlsZScsIGUpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufTtcblxuZXhwb3J0cy5TdHlsZSA9IFN0eWxlOyIsImV4cG9ydHMuc3R5bGVzID0ge1xuICAgIFwicGVhY29ja1wiOiByZXF1aXJlKFwiLi9wZWFjb2NrLmpzXCIpLFxufTtcbiIsImV4cG9ydHMuc3R5bGUgPSB7XG4gICAgY29tbWVudDogJyM3YTcyNjcnLFxuICAgIHN0cmluZzogJyNiY2Q0MmEnLFxuICAgICdjbGFzcy1uYW1lJzogJyNlZGUwY2UnLFxuICAgIGtleXdvcmQ6ICcjMjZBNkE2JyxcbiAgICBib29sZWFuOiAnI2JjZDQyYScsXG4gICAgZnVuY3Rpb246ICcjZmY1ZDM4JyxcbiAgICBvcGVyYXRvcjogJyMyNkE2QTYnLFxuICAgIG51bWJlcjogJyNiY2Q0MmEnLFxuICAgIGlnbm9yZTogJyNjY2NjY2MnLFxuICAgIHB1bmN0dWF0aW9uOiAnI2VkZTBjZScsXG5cbiAgICBjdXJzb3I6ICcjZjhmOGYwJyxcbiAgICBjdXJzb3Jfd2lkdGg6IDEuMCxcbiAgICBjdXJzb3JfaGVpZ2h0OiAxLjEsXG4gICAgc2VsZWN0aW9uOiAnI2ZmNWQzOCcsXG4gICAgc2VsZWN0aW9uX3VuZm9jdXNlZDogJyNlZjRkMjgnLFxuXG4gICAgdGV4dDogJyNlZGUwY2UnLFxuICAgIGJhY2tncm91bmQ6ICcjMmIyYTI3Jyxcbn07XG5cbiIsIi8vIENvcHlyaWdodCAoYykgSm9uYXRoYW4gRnJlZGVyaWMsIHNlZSB0aGUgTElDRU5TRSBmaWxlIGZvciBtb3JlIGluZm8uXG5cbi8qKlxuICogQmFzZSBjbGFzcyB3aXRoIGhlbHBmdWwgdXRpbGl0aWVzXG4gKiBAcGFyYW0ge2FycmF5fSBbZXZlbnRmdWxfcHJvcGVydGllc10gbGlzdCBvZiBwcm9wZXJ0eSBuYW1lcyAoc3RyaW5ncylcbiAqICAgICAgICAgICAgICAgIHRvIGNyZWF0ZSBhbmQgd2lyZSBjaGFuZ2UgZXZlbnRzIHRvLlxuICovXG52YXIgUG9zdGVyQ2xhc3MgPSBmdW5jdGlvbihldmVudGZ1bF9wcm9wZXJ0aWVzKSB7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgdGhpcy5fb25fYWxsID0gW107XG5cbiAgICAvLyBDb25zdHJ1Y3QgZXZlbnRmdWwgcHJvcGVydGllcy5cbiAgICBpZiAoZXZlbnRmdWxfcHJvcGVydGllcyAmJiBldmVudGZ1bF9wcm9wZXJ0aWVzLmxlbmd0aD4wKSB7XG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgZm9yICh2YXIgaT0wOyBpPGV2ZW50ZnVsX3Byb3BlcnRpZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIChmdW5jdGlvbihuYW1lKSB7XG4gICAgICAgICAgICAgICAgdGhhdC5wcm9wZXJ0eShuYW1lLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoYXRbJ18nICsgbmFtZV07XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC50cmlnZ2VyKCdjaGFuZ2U6JyArIG5hbWUsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC50cmlnZ2VyKCdjaGFuZ2UnLCBuYW1lLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHRoYXRbJ18nICsgbmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC50cmlnZ2VyKCdjaGFuZ2VkOicgKyBuYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC50cmlnZ2VyKCdjaGFuZ2VkJywgbmFtZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KShldmVudGZ1bF9wcm9wZXJ0aWVzW2ldKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbi8qKlxuICogRGVmaW5lIGEgcHJvcGVydHkgZm9yIHRoZSBjbGFzc1xuICogQHBhcmFtICB7c3RyaW5nfSBuYW1lXG4gKiBAcGFyYW0gIHtmdW5jdGlvbn0gZ2V0dGVyXG4gKiBAcGFyYW0gIHtmdW5jdGlvbn0gc2V0dGVyXG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Qb3N0ZXJDbGFzcy5wcm90b3R5cGUucHJvcGVydHkgPSBmdW5jdGlvbihuYW1lLCBnZXR0ZXIsIHNldHRlcikge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBuYW1lLCB7XG4gICAgICAgIGdldDogZ2V0dGVyLFxuICAgICAgICBzZXQ6IHNldHRlcixcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgfSk7XG59O1xuXG4vKipcbiAqIFJlZ2lzdGVyIGFuIGV2ZW50IGxpc3RlbmVyXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGV2ZW50XG4gKiBAcGFyYW0gIHtmdW5jdGlvbn0gaGFuZGxlclxuICogQHBhcmFtICB7b2JqZWN0fSBjb250ZXh0XG4gKiBAcmV0dXJuIHtudWxsfVxuICovXG5Qb3N0ZXJDbGFzcy5wcm90b3R5cGUub24gPSBmdW5jdGlvbihldmVudCwgaGFuZGxlciwgY29udGV4dCkge1xuICAgIGV2ZW50ID0gZXZlbnQudHJpbSgpLnRvTG93ZXJDYXNlKCk7XG5cbiAgICAvLyBNYWtlIHN1cmUgYSBsaXN0IGZvciB0aGUgZXZlbnQgZXhpc3RzLlxuICAgIGlmICghdGhpcy5fZXZlbnRzW2V2ZW50XSkgeyB0aGlzLl9ldmVudHNbZXZlbnRdID0gW107IH1cblxuICAgIC8vIFB1c2ggdGhlIGhhbmRsZXIgYW5kIHRoZSBjb250ZXh0IHRvIHRoZSBldmVudCdzIGNhbGxiYWNrIGxpc3QuXG4gICAgdGhpcy5fZXZlbnRzW2V2ZW50XS5wdXNoKFtoYW5kbGVyLCBjb250ZXh0XSk7XG59O1xuXG4vKipcbiAqIFVucmVnaXN0ZXIgb25lIG9yIGFsbCBldmVudCBsaXN0ZW5lcnMgZm9yIGEgc3BlY2lmaWMgZXZlbnRcbiAqIEBwYXJhbSAge3N0cmluZ30gZXZlbnRcbiAqIEBwYXJhbSAge2NhbGxiYWNrfSAob3B0aW9uYWwpIGhhbmRsZXJcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cblBvc3RlckNsYXNzLnByb3RvdHlwZS5vZmYgPSBmdW5jdGlvbihldmVudCwgaGFuZGxlcikge1xuICAgIGV2ZW50ID0gZXZlbnQudHJpbSgpLnRvTG93ZXJDYXNlKCk7XG4gICAgXG4gICAgLy8gSWYgYSBoYW5kbGVyIGlzIHNwZWNpZmllZCwgcmVtb3ZlIGFsbCB0aGUgY2FsbGJhY2tzXG4gICAgLy8gd2l0aCB0aGF0IGhhbmRsZXIuICBPdGhlcndpc2UsIGp1c3QgcmVtb3ZlIGFsbCBvZlxuICAgIC8vIHRoZSByZWdpc3RlcmVkIGNhbGxiYWNrcy5cbiAgICBpZiAoaGFuZGxlcikge1xuICAgICAgICB0aGlzLl9ldmVudHNbZXZlbnRdID0gdGhpcy5fZXZlbnRzW2V2ZW50XS5maWx0ZXIoZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFja1swXSAhPT0gaGFuZGxlcjtcbiAgICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fZXZlbnRzW2V2ZW50XSA9IFtdO1xuICAgIH1cbn07XG5cbi8qKlxuICogUmVnaXN0ZXIgYSBnbG9iYWwgZXZlbnQgaGFuZGxlci4gXG4gKiBcbiAqIEEgZ2xvYmFsIGV2ZW50IGhhbmRsZXIgZmlyZXMgZm9yIGFueSBldmVudCB0aGF0J3NcbiAqIHRyaWdnZXJlZC5cbiAqIEBwYXJhbSAge3N0cmluZ30gaGFuZGxlciAtIGZ1bmN0aW9uIHRoYXQgYWNjZXB0cyBvbmVcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3VtZW50LCB0aGUgbmFtZSBvZiB0aGVcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50LFxuICogQHJldHVybiB7bnVsbH1cbiAqL1xuUG9zdGVyQ2xhc3MucHJvdG90eXBlLm9uX2FsbCA9IGZ1bmN0aW9uKGhhbmRsZXIpIHtcbiAgICB2YXIgaW5kZXggPSB0aGlzLl9vbl9hbGwuaW5kZXhPZihoYW5kbGVyKTtcbiAgICBpZiAoaW5kZXggPT09IC0xKSB7XG4gICAgICAgIHRoaXMuX29uX2FsbC5wdXNoKGhhbmRsZXIpO1xuICAgIH1cbn07XG5cbi8qKlxuICogVW5yZWdpc3RlciBhIGdsb2JhbCBldmVudCBoYW5kbGVyLlxuICogQHBhcmFtICB7W3R5cGVdfSBoYW5kbGVyXG4gKiBAcmV0dXJuIHtib29sZWFufSB0cnVlIGlmIGEgaGFuZGxlciB3YXMgcmVtb3ZlZFxuICovXG5Qb3N0ZXJDbGFzcy5wcm90b3R5cGUub2ZmX2FsbCA9IGZ1bmN0aW9uKGhhbmRsZXIpIHtcbiAgICB2YXIgaW5kZXggPSB0aGlzLl9vbl9hbGwuaW5kZXhPZihoYW5kbGVyKTtcbiAgICBpZiAoaW5kZXggIT0gLTEpIHtcbiAgICAgICAgdGhpcy5fb25fYWxsLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKipcbiAqIFRyaWdnZXJzIHRoZSBjYWxsYmFja3Mgb2YgYW4gZXZlbnQgdG8gZmlyZS5cbiAqIEBwYXJhbSAge3N0cmluZ30gZXZlbnRcbiAqIEByZXR1cm4ge2FycmF5fSBhcnJheSBvZiByZXR1cm4gdmFsdWVzXG4gKi9cblBvc3RlckNsYXNzLnByb3RvdHlwZS50cmlnZ2VyID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICBldmVudCA9IGV2ZW50LnRyaW0oKS50b0xvd2VyQ2FzZSgpO1xuXG4gICAgLy8gQ29udmVydCBhcmd1bWVudHMgdG8gYW4gYXJyYXkgYW5kIGNhbGwgY2FsbGJhY2tzLlxuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICBhcmdzLnNwbGljZSgwLDEpO1xuXG4gICAgLy8gVHJpZ2dlciBnbG9iYWwgaGFuZGxlcnMgZmlyc3QuXG4gICAgdGhpcy5fb25fYWxsLmZvckVhY2goZnVuY3Rpb24oaGFuZGxlcikge1xuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIFtldmVudF0uY29uY2F0KGFyZ3MpKTtcbiAgICB9KTtcblxuICAgIC8vIFRyaWdnZXIgaW5kaXZpZHVhbCBoYW5kbGVycyBzZWNvbmQuXG4gICAgdmFyIGV2ZW50cyA9IHRoaXMuX2V2ZW50c1tldmVudF07XG4gICAgaWYgKGV2ZW50cykge1xuICAgICAgICB2YXIgcmV0dXJucyA9IFtdO1xuICAgICAgICBldmVudHMuZm9yRWFjaChmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAgICAgICAgcmV0dXJucy5wdXNoKGNhbGxiYWNrWzBdLmFwcGx5KGNhbGxiYWNrWzFdLCBhcmdzKSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcmV0dXJucztcbiAgICB9XG4gICAgcmV0dXJuIFtdO1xufTtcblxuLyoqXG4gKiBDYXVzZSBvbmUgY2xhc3MgdG8gaW5oZXJpdCBmcm9tIGFub3RoZXJcbiAqIEBwYXJhbSAge3R5cGV9IGNoaWxkXG4gKiBAcGFyYW0gIHt0eXBlfSBwYXJlbnRcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbnZhciBpbmhlcml0ID0gZnVuY3Rpb24oY2hpbGQsIHBhcmVudCkge1xuICAgIGNoaWxkLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUocGFyZW50LnByb3RvdHlwZSwge30pO1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgYSB2YWx1ZSBpcyBjYWxsYWJsZVxuICogQHBhcmFtICB7YW55fSB2YWx1ZVxuICogQHJldHVybiB7Ym9vbGVhbn1cbiAqL1xudmFyIGNhbGxhYmxlID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09ICdmdW5jdGlvbic7XG59O1xuXG4vKipcbiAqIENhbGxzIHRoZSB2YWx1ZSBpZiBpdCdzIGNhbGxhYmxlIGFuZCByZXR1cm5zIGl0J3MgcmV0dXJuLlxuICogT3RoZXJ3aXNlIHJldHVybnMgdGhlIHZhbHVlIGFzLWlzLlxuICogQHBhcmFtICB7YW55fSB2YWx1ZVxuICogQHJldHVybiB7YW55fVxuICovXG52YXIgcmVzb2x2ZV9jYWxsYWJsZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgaWYgKGNhbGxhYmxlKHZhbHVlKSkge1xuICAgICAgICByZXR1cm4gdmFsdWUuY2FsbCh0aGlzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxufTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgcHJveHkgdG8gYSBmdW5jdGlvbiBzbyBpdCBpcyBjYWxsZWQgaW4gdGhlIGNvcnJlY3QgY29udGV4dC5cbiAqIEByZXR1cm4ge2Z1bmN0aW9ufSBwcm94aWVkIGZ1bmN0aW9uLlxuICovXG52YXIgcHJveHkgPSBmdW5jdGlvbihmLCBjb250ZXh0KSB7XG4gICAgaWYgKGY9PT11bmRlZmluZWQpIHsgdGhyb3cgbmV3IEVycm9yKCdmIGNhbm5vdCBiZSB1bmRlZmluZWQnKTsgfVxuICAgIHJldHVybiBmdW5jdGlvbigpIHsgcmV0dXJuIGYuYXBwbHkoY29udGV4dCwgYXJndW1lbnRzKTsgfTtcbn07XG5cbi8qKlxuICogQ2xlYXJzIGFuIGFycmF5IGluIHBsYWNlLlxuICpcbiAqIERlc3BpdGUgYW4gTyhOKSBjb21wbGV4aXR5LCB0aGlzIHNlZW1zIHRvIGJlIHRoZSBmYXN0ZXN0IHdheSB0byBjbGVhclxuICogYSBsaXN0IGluIHBsYWNlIGluIEphdmFzY3JpcHQuIFxuICogQmVuY2htYXJrOiBodHRwOi8vanNwZXJmLmNvbS9lbXB0eS1qYXZhc2NyaXB0LWFycmF5XG4gKiBDb21wbGV4aXR5OiBPKE4pXG4gKiBAcGFyYW0gIHthcnJheX0gYXJyYXlcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbnZhciBjbGVhcl9hcnJheSA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgd2hpbGUgKGFycmF5Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgYXJyYXkucG9wKCk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgYSB2YWx1ZSBpcyBhbiBhcnJheVxuICogQHBhcmFtICB7YW55fSB4XG4gKiBAcmV0dXJuIHtib29sZWFufSB0cnVlIGlmIHZhbHVlIGlzIGFuIGFycmF5XG4gKi9cbnZhciBpc19hcnJheSA9IGZ1bmN0aW9uKHgpIHtcbiAgICByZXR1cm4geCBpbnN0YW5jZW9mIEFycmF5O1xufTtcblxuLyoqXG4gKiBGaW5kIHRoZSBjbG9zZXN0IHZhbHVlIGluIGEgbGlzdFxuICogXG4gKiBJbnRlcnBvbGF0aW9uIHNlYXJjaCBhbGdvcml0aG0uICBcbiAqIENvbXBsZXhpdHk6IE8obGcobGcoTikpKVxuICogQHBhcmFtICB7YXJyYXl9IHNvcnRlZCAtIHNvcnRlZCBhcnJheSBvZiBudW1iZXJzXG4gKiBAcGFyYW0gIHtmbG9hdH0geCAtIG51bWJlciB0byB0cnkgdG8gZmluZFxuICogQHJldHVybiB7aW50ZWdlcn0gaW5kZXggb2YgdGhlIHZhbHVlIHRoYXQncyBjbG9zZXN0IHRvIHhcbiAqL1xudmFyIGZpbmRfY2xvc2VzdCA9IGZ1bmN0aW9uKHNvcnRlZCwgeCkge1xuICAgIHZhciBtaW4gPSBzb3J0ZWRbMF07XG4gICAgdmFyIG1heCA9IHNvcnRlZFtzb3J0ZWQubGVuZ3RoLTFdO1xuICAgIGlmICh4IDwgbWluKSByZXR1cm4gMDtcbiAgICBpZiAoeCA+IG1heCkgcmV0dXJuIHNvcnRlZC5sZW5ndGgtMTtcbiAgICBpZiAoc29ydGVkLmxlbmd0aCA9PSAyKSB7XG4gICAgICAgIGlmIChtYXggLSB4ID4geCAtIG1pbikge1xuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB2YXIgcmF0ZSA9IChtYXggLSBtaW4pIC8gc29ydGVkLmxlbmd0aDtcbiAgICBpZiAocmF0ZSA9PT0gMCkgcmV0dXJuIDA7XG4gICAgdmFyIGd1ZXNzID0gTWF0aC5mbG9vcih4IC8gcmF0ZSk7XG4gICAgaWYgKHNvcnRlZFtndWVzc10gPT0geCkge1xuICAgICAgICByZXR1cm4gZ3Vlc3M7XG4gICAgfSBlbHNlIGlmIChndWVzcyA+IDAgJiYgc29ydGVkW2d1ZXNzLTFdIDwgeCAmJiB4IDwgc29ydGVkW2d1ZXNzXSkge1xuICAgICAgICByZXR1cm4gZmluZF9jbG9zZXN0KHNvcnRlZC5zbGljZShndWVzcy0xLCBndWVzcysxKSwgeCkgKyBndWVzcy0xO1xuICAgIH0gZWxzZSBpZiAoZ3Vlc3MgPCBzb3J0ZWQubGVuZ3RoLTEgJiYgc29ydGVkW2d1ZXNzXSA8IHggJiYgeCA8IHNvcnRlZFtndWVzcysxXSkge1xuICAgICAgICByZXR1cm4gZmluZF9jbG9zZXN0KHNvcnRlZC5zbGljZShndWVzcywgZ3Vlc3MrMiksIHgpICsgZ3Vlc3M7XG4gICAgfSBlbHNlIGlmIChzb3J0ZWRbZ3Vlc3NdID4geCkge1xuICAgICAgICByZXR1cm4gZmluZF9jbG9zZXN0KHNvcnRlZC5zbGljZSgwLCBndWVzcyksIHgpO1xuICAgIH0gZWxzZSBpZiAoc29ydGVkW2d1ZXNzXSA8IHgpIHtcbiAgICAgICAgcmV0dXJuIGZpbmRfY2xvc2VzdChzb3J0ZWQuc2xpY2UoZ3Vlc3MrMSksIHgpICsgZ3Vlc3MrMTtcbiAgICB9XG59O1xuXG4vKipcbiAqIE1ha2UgYSBzaGFsbG93IGNvcHkgb2YgYSBkaWN0aW9uYXJ5LlxuICogQHBhcmFtICB7ZGljdGlvbmFyeX0geFxuICogQHJldHVybiB7ZGljdGlvbmFyeX1cbiAqL1xudmFyIHNoYWxsb3dfY29weSA9IGZ1bmN0aW9uKHgpIHtcbiAgICB2YXIgeSA9IHt9O1xuICAgIGZvciAodmFyIGtleSBpbiB4KSB7XG4gICAgICAgIGlmICh4Lmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgIHlba2V5XSA9IHhba2V5XTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4geTtcbn07XG5cbi8qKlxuICogSG9va3MgYSBmdW5jdGlvbi5cbiAqIEBwYXJhbSAge29iamVjdH0gb2JqIC0gb2JqZWN0IHRvIGhvb2tcbiAqIEBwYXJhbSAge3N0cmluZ30gbWV0aG9kIC0gbmFtZSBvZiB0aGUgZnVuY3Rpb24gdG8gaG9va1xuICogQHBhcmFtICB7ZnVuY3Rpb259IGhvb2sgLSBmdW5jdGlvbiB0byBjYWxsIGJlZm9yZSB0aGUgb3JpZ2luYWxcbiAqIEByZXR1cm4ge29iamVjdH0gaG9vayByZWZlcmVuY2UsIG9iamVjdCB3aXRoIGFuIGB1bmhvb2tgIG1ldGhvZFxuICovXG52YXIgaG9vayA9IGZ1bmN0aW9uKG9iaiwgbWV0aG9kLCBob29rKSB7XG5cbiAgICAvLyBJZiB0aGUgb3JpZ2luYWwgaGFzIGFscmVhZHkgYmVlbiBob29rZWQsIGFkZCB0aGlzIGhvb2sgdG8gdGhlIGxpc3QgXG4gICAgLy8gb2YgaG9va3MuXG4gICAgaWYgKG9ialttZXRob2RdICYmIG9ialttZXRob2RdLm9yaWdpbmFsICYmIG9ialttZXRob2RdLmhvb2tzKSB7XG4gICAgICAgIG9ialttZXRob2RdLmhvb2tzLnB1c2goaG9vayk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gQ3JlYXRlIHRoZSBob29rZWQgZnVuY3Rpb25cbiAgICAgICAgdmFyIGhvb2tzID0gW2hvb2tdO1xuICAgICAgICB2YXIgb3JpZ2luYWwgPSBvYmpbbWV0aG9kXTtcbiAgICAgICAgdmFyIGhvb2tlZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgICAgICAgICB2YXIgcmV0O1xuICAgICAgICAgICAgdmFyIHJlc3VsdHM7XG4gICAgICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgICAgICBob29rcy5mb3JFYWNoKGZ1bmN0aW9uKGhvb2spIHtcbiAgICAgICAgICAgICAgICByZXN1bHRzID0gaG9vay5hcHBseSh0aGF0LCBhcmdzKTtcbiAgICAgICAgICAgICAgICByZXQgPSByZXQgIT09IHVuZGVmaW5lZCA/IHJldCA6IHJlc3VsdHM7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChvcmlnaW5hbCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdHMgPSBvcmlnaW5hbC5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZXQgIT09IHVuZGVmaW5lZCA/IHJldCA6IHJlc3VsdHM7XG4gICAgICAgIH07XG4gICAgICAgIGhvb2tlZC5vcmlnaW5hbCA9IG9yaWdpbmFsO1xuICAgICAgICBob29rZWQuaG9va3MgPSBob29rcztcbiAgICAgICAgb2JqW21ldGhvZF0gPSBob29rZWQ7XG4gICAgfVxuXG4gICAgLy8gUmV0dXJuIHVuaG9vayBtZXRob2QuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgdW5ob29rOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBpbmRleCA9IG9ialttZXRob2RdLmhvb2tzLmluZGV4T2YoaG9vayk7XG4gICAgICAgICAgICBpZiAoaW5kZXggIT0gLTEpIHtcbiAgICAgICAgICAgICAgICBvYmpbbWV0aG9kXS5ob29rcy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAob2JqW21ldGhvZF0uaG9va3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgb2JqW21ldGhvZF0gPSBvYmpbbWV0aG9kXS5vcmlnaW5hbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICB9O1xuICAgIFxufTtcblxuLyoqXG4gKiBDYW5jZWxzIGV2ZW50IGJ1YmJsaW5nLlxuICogQHBhcmFtICB7ZXZlbnR9IGVcbiAqIEByZXR1cm4ge251bGx9XG4gKi9cbnZhciBjYW5jZWxfYnViYmxlID0gZnVuY3Rpb24oZSkge1xuICAgIGlmIChlLnN0b3BQcm9wYWdhdGlvbikgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICBpZiAoZS5jYW5jZWxCdWJibGUgIT09IG51bGwpIGUuY2FuY2VsQnViYmxlID0gdHJ1ZTtcbiAgICBpZiAoZS5wcmV2ZW50RGVmYXVsdCkgZS5wcmV2ZW50RGVmYXVsdCgpO1xufTtcblxuLyoqXG4gKiBHZW5lcmF0ZXMgYSByYW5kb20gY29sb3Igc3RyaW5nXG4gKiBAcmV0dXJuIHtzdHJpbmd9IGhleGFkZWNpbWFsIGNvbG9yIHN0cmluZ1xuICovXG52YXIgcmFuZG9tX2NvbG9yID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHJhbmRvbV9ieXRlID0gZnVuY3Rpb24oKSB7IFxuICAgICAgICB2YXIgYiA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIDI1NSkudG9TdHJpbmcoMTYpO1xuICAgICAgICByZXR1cm4gYi5sZW5ndGggPT0gMSA/ICcwJyArIGIgOiBiO1xuICAgIH07XG4gICAgcmV0dXJuICcjJyArIHJhbmRvbV9ieXRlKCkgKyByYW5kb21fYnl0ZSgpICsgcmFuZG9tX2J5dGUoKTtcbn07XG5cbi8qKlxuICogQ29tcGFyZSB0d28gYXJyYXlzIGJ5IGNvbnRlbnRzIGZvciBlcXVhbGl0eS5cbiAqIEBwYXJhbSAge2FycmF5fSB4XG4gKiBAcGFyYW0gIHthcnJheX0geVxuICogQHJldHVybiB7Ym9vbGVhbn1cbiAqL1xudmFyIGNvbXBhcmVfYXJyYXlzID0gZnVuY3Rpb24oeCwgeSkge1xuICAgIGlmICh4Lmxlbmd0aCAhPSB5Lmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuICAgIGZvciAoaT0wOyBpPHgubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKHhbaV0hPT15W2ldKSByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBGaW5kIGFsbCB0aGUgb2NjdXJhbmNlcyBvZiBhIHJlZ3VsYXIgZXhwcmVzc2lvbiBpbnNpZGUgYSBzdHJpbmcuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IHRleHQgLSBzdHJpbmcgdG8gbG9vayBpblxuICogQHBhcmFtICB7c3RyaW5nfSByZSAtIHJlZ3VsYXIgZXhwcmVzc2lvbiB0byBmaW5kXG4gKiBAcmV0dXJuIHthcnJheX0gYXJyYXkgb2YgW3N0YXJ0X2luZGV4LCBlbmRfaW5kZXhdIHBhaXJzXG4gKi9cbnZhciBmaW5kYWxsID0gZnVuY3Rpb24odGV4dCwgcmUsIGZsYWdzKSB7XG4gICAgcmUgPSBuZXcgUmVnRXhwKHJlLCBmbGFncyB8fCAnZ20nKTtcbiAgICB2YXIgcmVzdWx0cztcbiAgICB2YXIgZm91bmQgPSBbXTtcbiAgICB3aGlsZSAoKHJlc3VsdHMgPSByZS5leGVjKHRleHQpKSAhPT0gbnVsbCkge1xuICAgICAgICB2YXIgZW5kX2luZGV4ID0gcmVzdWx0cy5pbmRleCArIChyZXN1bHRzWzBdLmxlbmd0aCB8fCAxKTtcbiAgICAgICAgZm91bmQucHVzaChbcmVzdWx0cy5pbmRleCwgZW5kX2luZGV4XSk7XG4gICAgICAgIHJlLmxhc3RJbmRleCA9IE1hdGgubWF4KGVuZF9pbmRleCwgcmUubGFzdEluZGV4KTtcbiAgICB9XG4gICAgcmV0dXJuIGZvdW5kO1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgdGhlIGNoYXJhY3RlciBpc24ndCB0ZXh0LlxuICogQHBhcmFtICB7Y2hhcn0gYyAtIGNoYXJhY3RlclxuICogQHJldHVybiB7Ym9vbGVhbn0gdHJ1ZSBpZiB0aGUgY2hhcmFjdGVyIGlzIG5vdCB0ZXh0LlxuICovXG52YXIgbm90X3RleHQgPSBmdW5jdGlvbihjKSB7XG4gICAgcmV0dXJuICdhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejEyMzQ1Njc4OTBfJy5pbmRleE9mKGMudG9Mb3dlckNhc2UoKSkgPT0gLTE7XG59O1xuXG4vLyBFeHBvcnQgbmFtZXMuXG5leHBvcnRzLlBvc3RlckNsYXNzID0gUG9zdGVyQ2xhc3M7XG5leHBvcnRzLmluaGVyaXQgPSBpbmhlcml0O1xuZXhwb3J0cy5jYWxsYWJsZSA9IGNhbGxhYmxlO1xuZXhwb3J0cy5yZXNvbHZlX2NhbGxhYmxlID0gcmVzb2x2ZV9jYWxsYWJsZTtcbmV4cG9ydHMucHJveHkgPSBwcm94eTtcbmV4cG9ydHMuY2xlYXJfYXJyYXkgPSBjbGVhcl9hcnJheTtcbmV4cG9ydHMuaXNfYXJyYXkgPSBpc19hcnJheTtcbmV4cG9ydHMuZmluZF9jbG9zZXN0ID0gZmluZF9jbG9zZXN0O1xuZXhwb3J0cy5zaGFsbG93X2NvcHkgPSBzaGFsbG93X2NvcHk7XG5leHBvcnRzLmhvb2sgPSBob29rO1xuZXhwb3J0cy5jYW5jZWxfYnViYmxlID0gY2FuY2VsX2J1YmJsZTtcbmV4cG9ydHMucmFuZG9tX2NvbG9yID0gcmFuZG9tX2NvbG9yO1xuZXhwb3J0cy5jb21wYXJlX2FycmF5cyA9IGNvbXBhcmVfYXJyYXlzO1xuZXhwb3J0cy5maW5kYWxsID0gZmluZGFsbDtcbmV4cG9ydHMubm90X3RleHQgPSBub3RfdGV4dDtcbiJdfQ==
