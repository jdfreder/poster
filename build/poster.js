(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

self = typeof window !== "undefined" ? window // if in browser
: typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope ? self // if in worker
: {} // if in node js
;

/**
 * Prism: Lightweight, robust, elegant syntax highlighting
 * MIT license http://www.opensource.org/licenses/mit-license.php/
 * @author Lea Verou http://lea.verou.me
 */

var Prism = (function () {

	// Private helper vars
	var lang = /\blang(?:uage)?-(?!\*)(\w+)\b/i;

	var _ = self.Prism = {
		util: {
			encode: function encode(tokens) {
				if (tokens instanceof Token) {
					return new Token(tokens.type, _.util.encode(tokens.content), tokens.alias);
				} else if (_.util.type(tokens) === "Array") {
					return tokens.map(_.util.encode);
				} else {
					return tokens.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\u00a0/g, " ");
				}
			},

			type: function type(o) {
				return Object.prototype.toString.call(o).match(/\[object (\w+)\]/)[1];
			},

			// Deep clone a language definition (e.g. to extend it)
			clone: (function (_clone) {
				var _cloneWrapper = function clone(_x) {
					return _clone.apply(this, arguments);
				};

				_cloneWrapper.toString = function () {
					return _clone.toString();
				};

				return _cloneWrapper;
			})(function (o) {
				var type = _.util.type(o);

				switch (type) {
					case "Object":
						var clone = {};

						for (var key in o) {
							if (o.hasOwnProperty(key)) {
								clone[key] = _.util.clone(o[key]);
							}
						}

						return clone;

					case "Array":
						return o.slice();
				}

				return o;
			})
		},

		languages: {
			extend: function extend(id, redef) {
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
			insertBefore: function insertBefore(inside, before, insert, root) {
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
				_.languages.DFS(_.languages, function (key, value) {
					if (value === root[inside] && key != inside) {
						this[key] = ret;
					}
				});

				return root[inside] = ret;
			},

			// Traverse a language definition with Depth First Search
			DFS: function DFS(o, callback, type) {
				for (var i in o) {
					if (o.hasOwnProperty(i)) {
						callback.call(o, i, o[i], type || i);

						if (_.util.type(o[i]) === "Object") {
							_.languages.DFS(o[i], callback);
						} else if (_.util.type(o[i]) === "Array") {
							_.languages.DFS(o[i], callback, i);
						}
					}
				}
			}
		},

		highlightAll: function highlightAll(async, callback) {
			var elements = document.querySelectorAll("code[class*=\"language-\"], [class*=\"language-\"] code, code[class*=\"lang-\"], [class*=\"lang-\"] code");

			for (var i = 0, element; element = elements[i++];) {
				_.highlightElement(element, async === true, callback);
			}
		},

		highlightElement: function highlightElement(element, async, callback) {
			// Find language
			var language,
			    grammar,
			    parent = element;

			while (parent && !lang.test(parent.className)) {
				parent = parent.parentNode;
			}

			if (parent) {
				language = (parent.className.match(lang) || [, ""])[1];
				grammar = _.languages[language];
			}

			if (!grammar) {
				return;
			}

			// Set language on the element, if not present
			element.className = element.className.replace(lang, "").replace(/\s+/g, " ") + " language-" + language;

			// Set language on the parent, for styling
			parent = element.parentNode;

			if (/pre/i.test(parent.nodeName)) {
				parent.className = parent.className.replace(lang, "").replace(/\s+/g, " ") + " language-" + language;
			}

			var code = element.textContent;

			if (!code) {
				return;
			}

			var env = {
				element: element,
				language: language,
				grammar: grammar,
				code: code
			};

			_.hooks.run("before-highlight", env);

			if (async && self.Worker) {
				var worker = new Worker(_.filename);

				worker.onmessage = function (evt) {
					env.highlightedCode = Token.stringify(JSON.parse(evt.data), language);

					_.hooks.run("before-insert", env);

					env.element.innerHTML = env.highlightedCode;

					callback && callback.call(env.element);
					_.hooks.run("after-highlight", env);
				};

				worker.postMessage(JSON.stringify({
					language: env.language,
					code: env.code
				}));
			} else {
				env.highlightedCode = _.highlight(env.code, env.grammar, env.language);

				_.hooks.run("before-insert", env);

				env.element.innerHTML = env.highlightedCode;

				callback && callback.call(element);

				_.hooks.run("after-highlight", env);
			}
		},

		highlight: function highlight(text, grammar, language) {
			var tokens = _.tokenize(text, grammar);
			return Token.stringify(_.util.encode(tokens), language);
		},

		tokenize: function tokenize(text, grammar, language) {
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
				if (!grammar.hasOwnProperty(token) || !grammar[token]) {
					continue;
				}

				var patterns = grammar[token];
				patterns = _.util.type(patterns) === "Array" ? patterns : [patterns];

				for (var j = 0; j < patterns.length; ++j) {
					var pattern = patterns[j],
					    inside = pattern.inside,
					    lookbehind = !!pattern.lookbehind,
					    lookbehindLength = 0,
					    alias = pattern.alias;

					pattern = pattern.pattern || pattern;

					for (var i = 0; i < strarr.length; i++) {
						// Don’t cache length as it changes during the loop

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
							if (lookbehind) {
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

							var wrapped = new Token(token, inside ? _.tokenize(match, inside) : match, alias);

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

			add: function add(name, callback) {
				var hooks = _.hooks.all;

				hooks[name] = hooks[name] || [];

				hooks[name].push(callback);
			},

			run: function run(name, env) {
				var callbacks = _.hooks.all[name];

				if (!callbacks || !callbacks.length) {
					return;
				}

				for (var i = 0, callback; callback = callbacks[i++];) {
					callback(env);
				}
			}
		}
	};

	var Token = _.Token = function (type, content, alias) {
		this.type = type;
		this.content = content;
		this.alias = alias;
	};

	Token.stringify = function (o, language, parent) {
		if (typeof o == "string") {
			return o;
		}

		if (Object.prototype.toString.call(o) == "[object Array]") {
			return o.map(function (element) {
				return Token.stringify(element, language, o);
			}).join("");
		}

		var env = {
			type: o.type,
			content: Token.stringify(o.content, language, parent),
			tag: "span",
			classes: ["token", o.type],
			attributes: {},
			language: language,
			parent: parent
		};

		if (env.type == "comment") {
			env.attributes.spellcheck = "true";
		}

		if (o.alias) {
			var aliases = _.util.type(o.alias) === "Array" ? o.alias : [o.alias];
			Array.prototype.push.apply(env.classes, aliases);
		}

		_.hooks.run("wrap", env);

		var attributes = "";

		for (var name in env.attributes) {
			attributes += name + "=\"" + (env.attributes[name] || "") + "\"";
		}

		return "<" + env.tag + " class=\"" + env.classes.join(" ") + "\" " + attributes + ">" + env.content + "</" + env.tag + ">";
	};

	if (!self.document) {
		if (!self.addEventListener) {
			// in Node.js
			return self.Prism;
		}
		// In worker
		self.addEventListener("message", function (evt) {
			var message = JSON.parse(evt.data),
			    lang = message.language,
			    code = message.code;

			self.postMessage(JSON.stringify(_.util.encode(_.tokenize(code, _.languages[lang]))));
			self.close();
		}, false);

		return self.Prism;
	}

	// Get current script and highlight
	var script = document.getElementsByTagName("script");

	script = script[script.length - 1];

	if (script) {
		_.filename = script.src;

		if (document.addEventListener && !script.hasAttribute("data-manual")) {
			document.addEventListener("DOMContentLoaded", _.highlightAll);
		}
	}

	return self.Prism;
})();

if (typeof module !== "undefined" && module.exports) {
	module.exports = Prism;
}

Prism.languages.markup = {
	comment: /<!--[\w\W]*?-->/g,
	prolog: /<\?.+?\?>/,
	doctype: /<!DOCTYPE.+?>/,
	cdata: /<!\[CDATA\[[\w\W]*?]]>/i,
	tag: {
		pattern: /<\/?[\w:-]+\s*(?:\s+[\w:-]+(?:=(?:("|')(\\?[\w\W])*?\1|[^\s'">=]+))?\s*)*\/?>/gi,
		inside: {
			tag: {
				pattern: /^<\/?[\w:-]+/i,
				inside: {
					punctuation: /^<\/?/,
					namespace: /^[\w-]+?:/
				}
			},
			"attr-value": {
				pattern: /=(?:('|")[\w\W]*?(\1)|[^\s>]+)/gi,
				inside: {
					punctuation: /=|>|"/g
				}
			},
			punctuation: /\/?>/g,
			"attr-name": {
				pattern: /[\w:-]+/g,
				inside: {
					namespace: /^[\w-]+?:/
				}
			}

		}
	},
	entity: /\&#?[\da-z]{1,8};/gi
};

// Plugin to make entity title show the real entity, idea by Roman Komarov
Prism.hooks.add("wrap", function (env) {

	if (env.type === "entity") {
		env.attributes.title = env.content.replace(/&amp;/, "&");
	}
});

Prism.languages.css = {
	comment: /\/\*[\w\W]*?\*\//g,
	atrule: {
		pattern: /@[\w-]+?.*?(;|(?=\s*{))/gi,
		inside: {
			punctuation: /[;:]/g
		}
	},
	url: /url\((["']?).*?\1\)/gi,
	selector: /[^\{\}\s][^\{\};]*(?=\s*\{)/g,
	property: /(\b|\B)[\w-]+(?=\s*:)/ig,
	string: /("|')(\\?.)*?\1/g,
	important: /\B!important\b/gi,
	punctuation: /[\{\};:]/g,
	"function": /[-a-z0-9]+(?=\()/ig
};

if (Prism.languages.markup) {
	Prism.languages.insertBefore("markup", "tag", {
		style: {
			pattern: /<style[\w\W]*?>[\w\W]*?<\/style>/ig,
			inside: {
				tag: {
					pattern: /<style[\w\W]*?>|<\/style>/ig,
					inside: Prism.languages.markup.tag.inside
				},
				rest: Prism.languages.css
			},
			alias: "language-css"
		}
	});

	Prism.languages.insertBefore("inside", "attr-value", {
		"style-attr": {
			pattern: /\s*style=("|').+?\1/ig,
			inside: {
				"attr-name": {
					pattern: /^\s*style/ig,
					inside: Prism.languages.markup.tag.inside
				},
				punctuation: /^\s*=\s*['"]|['"]\s*$/,
				"attr-value": {
					pattern: /.+/gi,
					inside: Prism.languages.css
				}
			},
			alias: "language-css"
		}
	}, Prism.languages.markup.tag);
}
Prism.languages.clike = {
	comment: [{
		pattern: /(^|[^\\])\/\*[\w\W]*?\*\//g,
		lookbehind: true
	}, {
		pattern: /(^|[^\\:])\/\/.*?(\r?\n|$)/g,
		lookbehind: true
	}],
	string: /("|')(\\?.)*?\1/g,
	"class-name": {
		pattern: /((?:(?:class|interface|extends|implements|trait|instanceof|new)\s+)|(?:catch\s+\())[a-z0-9_\.\\]+/ig,
		lookbehind: true,
		inside: {
			punctuation: /(\.|\\)/
		}
	},
	keyword: /\b(if|else|while|do|for|return|in|instanceof|function|new|try|throw|catch|finally|null|break|continue)\b/g,
	boolean: /\b(true|false)\b/g,
	"function": {
		pattern: /[a-z0-9_]+\(/ig,
		inside: {
			punctuation: /\(/
		}
	},
	number: /\b-?(0x[\dA-Fa-f]+|\d*\.?\d+([Ee]-?\d+)?)\b/g,
	operator: /[-+]{1,2}|!|<=?|>=?|={1,3}|&{1,2}|\|?\||\?|\*|\/|\~|\^|\%/g,
	ignore: /&(lt|gt|amp);/gi,
	punctuation: /[{}[\];(),.:]/g
};

Prism.languages.javascript = Prism.languages.extend("clike", {
	keyword: /\b(break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|finally|for|function|get|if|implements|import|in|instanceof|interface|let|new|null|package|private|protected|public|return|set|static|super|switch|this|throw|true|try|typeof|var|void|while|with|yield)\b/g,
	number: /\b-?(0x[\dA-Fa-f]+|\d*\.?\d+([Ee]-?\d+)?|NaN|-?Infinity)\b/g
});

Prism.languages.insertBefore("javascript", "keyword", {
	regex: {
		pattern: /(^|[^/])\/(?!\/)(\[.+?]|\\.|[^/\r\n])+\/[gim]{0,3}(?=\s*($|[\r\n,.;})]))/g,
		lookbehind: true
	}
});

if (Prism.languages.markup) {
	Prism.languages.insertBefore("markup", "tag", {
		script: {
			pattern: /<script[\w\W]*?>[\w\W]*?<\/script>/ig,
			inside: {
				tag: {
					pattern: /<script[\w\W]*?>|<\/script>/ig,
					inside: Prism.languages.markup.tag.inside
				},
				rest: Prism.languages.javascript
			},
			alias: "language-javascript"
		}
	});
}

Prism.languages.apacheconf = {
	comment: /\#.*/g,
	"directive-inline": {
		pattern: /^\s*\b(AcceptFilter|AcceptPathInfo|AccessFileName|Action|AddAlt|AddAltByEncoding|AddAltByType|AddCharset|AddDefaultCharset|AddDescription|AddEncoding|AddHandler|AddIcon|AddIconByEncoding|AddIconByType|AddInputFilter|AddLanguage|AddModuleInfo|AddOutputFilter|AddOutputFilterByType|AddType|Alias|AliasMatch|Allow|AllowCONNECT|AllowEncodedSlashes|AllowMethods|AllowOverride|AllowOverrideList|Anonymous|Anonymous_LogEmail|Anonymous_MustGiveEmail|Anonymous_NoUserID|Anonymous_VerifyEmail|AsyncRequestWorkerFactor|AuthBasicAuthoritative|AuthBasicFake|AuthBasicProvider|AuthBasicUseDigestAlgorithm|AuthDBDUserPWQuery|AuthDBDUserRealmQuery|AuthDBMGroupFile|AuthDBMType|AuthDBMUserFile|AuthDigestAlgorithm|AuthDigestDomain|AuthDigestNonceLifetime|AuthDigestProvider|AuthDigestQop|AuthDigestShmemSize|AuthFormAuthoritative|AuthFormBody|AuthFormDisableNoStore|AuthFormFakeBasicAuth|AuthFormLocation|AuthFormLoginRequiredLocation|AuthFormLoginSuccessLocation|AuthFormLogoutLocation|AuthFormMethod|AuthFormMimetype|AuthFormPassword|AuthFormProvider|AuthFormSitePassphrase|AuthFormSize|AuthFormUsername|AuthGroupFile|AuthLDAPAuthorizePrefix|AuthLDAPBindAuthoritative|AuthLDAPBindDN|AuthLDAPBindPassword|AuthLDAPCharsetConfig|AuthLDAPCompareAsUser|AuthLDAPCompareDNOnServer|AuthLDAPDereferenceAliases|AuthLDAPGroupAttribute|AuthLDAPGroupAttributeIsDN|AuthLDAPInitialBindAsUser|AuthLDAPInitialBindPattern|AuthLDAPMaxSubGroupDepth|AuthLDAPRemoteUserAttribute|AuthLDAPRemoteUserIsDN|AuthLDAPSearchAsUser|AuthLDAPSubGroupAttribute|AuthLDAPSubGroupClass|AuthLDAPUrl|AuthMerging|AuthName|AuthnCacheContext|AuthnCacheEnable|AuthnCacheProvideFor|AuthnCacheSOCache|AuthnCacheTimeout|AuthnzFcgiCheckAuthnProvider|AuthnzFcgiDefineProvider|AuthType|AuthUserFile|AuthzDBDLoginToReferer|AuthzDBDQuery|AuthzDBDRedirectQuery|AuthzDBMType|AuthzSendForbiddenOnFailure|BalancerGrowth|BalancerInherit|BalancerMember|BalancerPersist|BrowserMatch|BrowserMatchNoCase|BufferedLogs|BufferSize|CacheDefaultExpire|CacheDetailHeader|CacheDirLength|CacheDirLevels|CacheDisable|CacheEnable|CacheFile|CacheHeader|CacheIgnoreCacheControl|CacheIgnoreHeaders|CacheIgnoreNoLastMod|CacheIgnoreQueryString|CacheIgnoreURLSessionIdentifiers|CacheKeyBaseURL|CacheLastModifiedFactor|CacheLock|CacheLockMaxAge|CacheLockPath|CacheMaxExpire|CacheMaxFileSize|CacheMinExpire|CacheMinFileSize|CacheNegotiatedDocs|CacheQuickHandler|CacheReadSize|CacheReadTime|CacheRoot|CacheSocache|CacheSocacheMaxSize|CacheSocacheMaxTime|CacheSocacheMinTime|CacheSocacheReadSize|CacheSocacheReadTime|CacheStaleOnError|CacheStoreExpired|CacheStoreNoStore|CacheStorePrivate|CGIDScriptTimeout|CGIMapExtension|CharsetDefault|CharsetOptions|CharsetSourceEnc|CheckCaseOnly|CheckSpelling|ChrootDir|ContentDigest|CookieDomain|CookieExpires|CookieName|CookieStyle|CookieTracking|CoreDumpDirectory|CustomLog|Dav|DavDepthInfinity|DavGenericLockDB|DavLockDB|DavMinTimeout|DBDExptime|DBDInitSQL|DBDKeep|DBDMax|DBDMin|DBDParams|DBDPersist|DBDPrepareSQL|DBDriver|DefaultIcon|DefaultLanguage|DefaultRuntimeDir|DefaultType|Define|DeflateBufferSize|DeflateCompressionLevel|DeflateFilterNote|DeflateInflateLimitRequestBody|DeflateInflateRatioBurst|DeflateInflateRatioLimit|DeflateMemLevel|DeflateWindowSize|Deny|DirectoryCheckHandler|DirectoryIndex|DirectoryIndexRedirect|DirectorySlash|DocumentRoot|DTracePrivileges|DumpIOInput|DumpIOOutput|EnableExceptionHook|EnableMMAP|EnableSendfile|Error|ErrorDocument|ErrorLog|ErrorLogFormat|Example|ExpiresActive|ExpiresByType|ExpiresDefault|ExtendedStatus|ExtFilterDefine|ExtFilterOptions|FallbackResource|FileETag|FilterChain|FilterDeclare|FilterProtocol|FilterProvider|FilterTrace|ForceLanguagePriority|ForceType|ForensicLog|GprofDir|GracefulShutdownTimeout|Group|Header|HeaderName|HeartbeatAddress|HeartbeatListen|HeartbeatMaxServers|HeartbeatStorage|HeartbeatStorage|HostnameLookups|IdentityCheck|IdentityCheckTimeout|ImapBase|ImapDefault|ImapMenu|Include|IncludeOptional|IndexHeadInsert|IndexIgnore|IndexIgnoreReset|IndexOptions|IndexOrderDefault|IndexStyleSheet|InputSed|ISAPIAppendLogToErrors|ISAPIAppendLogToQuery|ISAPICacheFile|ISAPIFakeAsync|ISAPILogNotSupported|ISAPIReadAheadBuffer|KeepAlive|KeepAliveTimeout|KeptBodySize|LanguagePriority|LDAPCacheEntries|LDAPCacheTTL|LDAPConnectionPoolTTL|LDAPConnectionTimeout|LDAPLibraryDebug|LDAPOpCacheEntries|LDAPOpCacheTTL|LDAPReferralHopLimit|LDAPReferrals|LDAPRetries|LDAPRetryDelay|LDAPSharedCacheFile|LDAPSharedCacheSize|LDAPTimeout|LDAPTrustedClientCert|LDAPTrustedGlobalCert|LDAPTrustedMode|LDAPVerifyServerCert|LimitInternalRecursion|LimitRequestBody|LimitRequestFields|LimitRequestFieldSize|LimitRequestLine|LimitXMLRequestBody|Listen|ListenBackLog|LoadFile|LoadModule|LogFormat|LogLevel|LogMessage|LuaAuthzProvider|LuaCodeCache|LuaHookAccessChecker|LuaHookAuthChecker|LuaHookCheckUserID|LuaHookFixups|LuaHookInsertFilter|LuaHookLog|LuaHookMapToStorage|LuaHookTranslateName|LuaHookTypeChecker|LuaInherit|LuaInputFilter|LuaMapHandler|LuaOutputFilter|LuaPackageCPath|LuaPackagePath|LuaQuickHandler|LuaRoot|LuaScope|MaxConnectionsPerChild|MaxKeepAliveRequests|MaxMemFree|MaxRangeOverlaps|MaxRangeReversals|MaxRanges|MaxRequestWorkers|MaxSpareServers|MaxSpareThreads|MaxThreads|MergeTrailers|MetaDir|MetaFiles|MetaSuffix|MimeMagicFile|MinSpareServers|MinSpareThreads|MMapFile|ModemStandard|ModMimeUsePathInfo|MultiviewsMatch|Mutex|NameVirtualHost|NoProxy|NWSSLTrustedCerts|NWSSLUpgradeable|Options|Order|OutputSed|PassEnv|PidFile|PrivilegesMode|Protocol|ProtocolEcho|ProxyAddHeaders|ProxyBadHeader|ProxyBlock|ProxyDomain|ProxyErrorOverride|ProxyExpressDBMFile|ProxyExpressDBMType|ProxyExpressEnable|ProxyFtpDirCharset|ProxyFtpEscapeWildcards|ProxyFtpListOnWildcard|ProxyHTMLBufSize|ProxyHTMLCharsetOut|ProxyHTMLDocType|ProxyHTMLEnable|ProxyHTMLEvents|ProxyHTMLExtended|ProxyHTMLFixups|ProxyHTMLInterp|ProxyHTMLLinks|ProxyHTMLMeta|ProxyHTMLStripComments|ProxyHTMLURLMap|ProxyIOBufferSize|ProxyMaxForwards|ProxyPass|ProxyPassInherit|ProxyPassInterpolateEnv|ProxyPassMatch|ProxyPassReverse|ProxyPassReverseCookieDomain|ProxyPassReverseCookiePath|ProxyPreserveHost|ProxyReceiveBufferSize|ProxyRemote|ProxyRemoteMatch|ProxyRequests|ProxySCGIInternalRedirect|ProxySCGISendfile|ProxySet|ProxySourceAddress|ProxyStatus|ProxyTimeout|ProxyVia|ReadmeName|ReceiveBufferSize|Redirect|RedirectMatch|RedirectPermanent|RedirectTemp|ReflectorHeader|RemoteIPHeader|RemoteIPInternalProxy|RemoteIPInternalProxyList|RemoteIPProxiesHeader|RemoteIPTrustedProxy|RemoteIPTrustedProxyList|RemoveCharset|RemoveEncoding|RemoveHandler|RemoveInputFilter|RemoveLanguage|RemoveOutputFilter|RemoveType|RequestHeader|RequestReadTimeout|Require|RewriteBase|RewriteCond|RewriteEngine|RewriteMap|RewriteOptions|RewriteRule|RLimitCPU|RLimitMEM|RLimitNPROC|Satisfy|ScoreBoardFile|Script|ScriptAlias|ScriptAliasMatch|ScriptInterpreterSource|ScriptLog|ScriptLogBuffer|ScriptLogLength|ScriptSock|SecureListen|SeeRequestTail|SendBufferSize|ServerAdmin|ServerAlias|ServerLimit|ServerName|ServerPath|ServerRoot|ServerSignature|ServerTokens|Session|SessionCookieName|SessionCookieName2|SessionCookieRemove|SessionCryptoCipher|SessionCryptoDriver|SessionCryptoPassphrase|SessionCryptoPassphraseFile|SessionDBDCookieName|SessionDBDCookieName2|SessionDBDCookieRemove|SessionDBDDeleteLabel|SessionDBDInsertLabel|SessionDBDPerUser|SessionDBDSelectLabel|SessionDBDUpdateLabel|SessionEnv|SessionExclude|SessionHeader|SessionInclude|SessionMaxAge|SetEnv|SetEnvIf|SetEnvIfExpr|SetEnvIfNoCase|SetHandler|SetInputFilter|SetOutputFilter|SSIEndTag|SSIErrorMsg|SSIETag|SSILastModified|SSILegacyExprParser|SSIStartTag|SSITimeFormat|SSIUndefinedEcho|SSLCACertificateFile|SSLCACertificatePath|SSLCADNRequestFile|SSLCADNRequestPath|SSLCARevocationCheck|SSLCARevocationFile|SSLCARevocationPath|SSLCertificateChainFile|SSLCertificateFile|SSLCertificateKeyFile|SSLCipherSuite|SSLCompression|SSLCryptoDevice|SSLEngine|SSLFIPS|SSLHonorCipherOrder|SSLInsecureRenegotiation|SSLOCSPDefaultResponder|SSLOCSPEnable|SSLOCSPOverrideResponder|SSLOCSPResponderTimeout|SSLOCSPResponseMaxAge|SSLOCSPResponseTimeSkew|SSLOCSPUseRequestNonce|SSLOpenSSLConfCmd|SSLOptions|SSLPassPhraseDialog|SSLProtocol|SSLProxyCACertificateFile|SSLProxyCACertificatePath|SSLProxyCARevocationCheck|SSLProxyCARevocationFile|SSLProxyCARevocationPath|SSLProxyCheckPeerCN|SSLProxyCheckPeerExpire|SSLProxyCheckPeerName|SSLProxyCipherSuite|SSLProxyEngine|SSLProxyMachineCertificateChainFile|SSLProxyMachineCertificateFile|SSLProxyMachineCertificatePath|SSLProxyProtocol|SSLProxyVerify|SSLProxyVerifyDepth|SSLRandomSeed|SSLRenegBufferSize|SSLRequire|SSLRequireSSL|SSLSessionCache|SSLSessionCacheTimeout|SSLSessionTicketKeyFile|SSLSRPUnknownUserSeed|SSLSRPVerifierFile|SSLStaplingCache|SSLStaplingErrorCacheTimeout|SSLStaplingFakeTryLater|SSLStaplingForceURL|SSLStaplingResponderTimeout|SSLStaplingResponseMaxAge|SSLStaplingResponseTimeSkew|SSLStaplingReturnResponderErrors|SSLStaplingStandardCacheTimeout|SSLStrictSNIVHostCheck|SSLUserName|SSLUseStapling|SSLVerifyClient|SSLVerifyDepth|StartServers|StartThreads|Substitute|Suexec|SuexecUserGroup|ThreadLimit|ThreadsPerChild|ThreadStackSize|TimeOut|TraceEnable|TransferLog|TypesConfig|UnDefine|UndefMacro|UnsetEnv|Use|UseCanonicalName|UseCanonicalPhysicalPort|User|UserDir|VHostCGIMode|VHostCGIPrivs|VHostGroup|VHostPrivs|VHostSecure|VHostUser|VirtualDocumentRoot|VirtualDocumentRootIP|VirtualScriptAlias|VirtualScriptAliasIP|WatchdogInterval|XBitHack|xml2EncAlias|xml2EncDefault|xml2StartParse)\b/gmi,
		alias: "property"
	},
	"directive-block": {
		pattern: /<\/?\b(AuthnProviderAlias|AuthzProviderAlias|Directory|DirectoryMatch|Else|ElseIf|Files|FilesMatch|If|IfDefine|IfModule|IfVersion|Limit|LimitExcept|Location|LocationMatch|Macro|Proxy|RequireAll|RequireAny|RequireNone|VirtualHost)\b *.*>/gi,
		inside: {
			"directive-block": {
				pattern: /^<\/?\w+/,
				inside: {
					punctuation: /^<\/?/
				},
				alias: "tag"
			},
			"directive-block-parameter": {
				pattern: /.*[^>]/,
				inside: {
					punctuation: /:/,
					string: {
						pattern: /("|').*\1/g,
						inside: {
							variable: /(\$|%)\{?(\w\.?(\+|\-|:)?)+\}?/g
						}
					}
				},
				alias: "attr-value"
			},
			punctuation: />/
		},
		alias: "tag"
	},
	"directive-flags": {
		pattern: /\[(\w,?)+\]/g,
		alias: "keyword"
	},
	string: {
		pattern: /("|').*\1/g,
		inside: {
			variable: /(\$|%)\{?(\w\.?(\+|\-|:)?)+\}?/g
		}
	},
	variable: /(\$|%)\{?(\w\.?(\+|\-|:)?)+\}?/g,
	regex: /\^?.*\$|\^.*\$?/g
};

Prism.languages.aspnet = Prism.languages.extend("markup", {
	"page-directive tag": {
		pattern: /<%\s*@.*%>/gi,
		inside: {
			"page-directive tag": /<%\s*@\s*(?:Assembly|Control|Implements|Import|Master|MasterType|OutputCache|Page|PreviousPageType|Reference|Register)?|%>/ig,
			rest: Prism.languages.markup.tag.inside
		}
	},
	"directive tag": {
		pattern: /<%.*%>/gi,
		inside: {
			"directive tag": /<%\s*?[$=%#:]{0,2}|%>/gi,
			rest: Prism.languages.csharp
		}
	}
});

// match directives of attribute value foo="<% Bar %>"
Prism.languages.insertBefore("inside", "punctuation", {
	"directive tag": Prism.languages.aspnet["directive tag"]
}, Prism.languages.aspnet.tag.inside["attr-value"]);

Prism.languages.insertBefore("aspnet", "comment", {
	"asp comment": /<%--[\w\W]*?--%>/g
});

// script runat="server" contains csharp, not javascript
Prism.languages.insertBefore("aspnet", Prism.languages.javascript ? "script" : "tag", {
	"asp script": {
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
if (Prism.languages.aspnet.style) {
	Prism.languages.aspnet.style.inside.tag.pattern = /<\/?style\s*(?:\s+[\w:-]+(?:=(?:("|')(\\?[\w\W])*?\1|\w+))?\s*)*\/?>/gi;
	Prism.languages.aspnet.style.inside.tag.inside = Prism.languages.aspnet.tag.inside;
}
if (Prism.languages.aspnet.script) {
	Prism.languages.aspnet.script.inside.tag.pattern = Prism.languages.aspnet["asp script"].inside.tag.pattern;
	Prism.languages.aspnet.script.inside.tag.inside = Prism.languages.aspnet.tag.inside;
}
// NOTES - follows first-first highlight method, block is locked after highlight, different from SyntaxHl
Prism.languages.autohotkey = {
	comment: {
		pattern: /(^[^";\n]*("[^"\n]*?"[^"\n]*?)*)(;.*$|^\s*\/\*[\s\S]*\n\*\/)/gm,
		lookbehind: true
	},
	string: /"(([^"\n\r]|"")*)"/gm,
	"function": /[^\(\); \t\,\n\+\*\-\=\?>:\\\/<\&%\[\]]+?(?=\()/gm, //function - don't use .*\) in the end bcoz string locks it
	tag: /^[ \t]*[^\s:]+?(?=:[^:])/gm, //labels
	variable: /\%\w+\%/g,
	number: /\b-?(0x[\dA-Fa-f]+|\d*\.?\d+([Ee]-?\d+)?)\b/g,
	operator: /[\+\-\*\\\/:=\?\&\|<>]/g,
	punctuation: /[\{}[\]\(\):]/g,
	boolean: /\b(true|false)\b/g,

	selector: /\b(AutoTrim|BlockInput|Break|Click|ClipWait|Continue|Control|ControlClick|ControlFocus|ControlGet|ControlGetFocus|ControlGetPos|ControlGetText|ControlMove|ControlSend|ControlSendRaw|ControlSetText|CoordMode|Critical|DetectHiddenText|DetectHiddenWindows|Drive|DriveGet|DriveSpaceFree|EnvAdd|EnvDiv|EnvGet|EnvMult|EnvSet|EnvSub|EnvUpdate|Exit|ExitApp|FileAppend|FileCopy|FileCopyDir|FileCreateDir|FileCreateShortcut|FileDelete|FileEncoding|FileGetAttrib|FileGetShortcut|FileGetSize|FileGetTime|FileGetVersion|FileInstall|FileMove|FileMoveDir|FileRead|FileReadLine|FileRecycle|FileRecycleEmpty|FileRemoveDir|FileSelectFile|FileSelectFolder|FileSetAttrib|FileSetTime|FormatTime|GetKeyState|Gosub|Goto|GroupActivate|GroupAdd|GroupClose|GroupDeactivate|Gui|GuiControl|GuiControlGet|Hotkey|ImageSearch|IniDelete|IniRead|IniWrite|Input|InputBox|KeyWait|ListHotkeys|ListLines|ListVars|Loop|Menu|MouseClick|MouseClickDrag|MouseGetPos|MouseMove|MsgBox|OnExit|OutputDebug|Pause|PixelGetColor|PixelSearch|PostMessage|Process|Progress|Random|RegDelete|RegRead|RegWrite|Reload|Repeat|Return|Run|RunAs|RunWait|Send|SendEvent|SendInput|SendMessage|SendMode|SendPlay|SendRaw|SetBatchLines|SetCapslockState|SetControlDelay|SetDefaultMouseSpeed|SetEnv|SetFormat|SetKeyDelay|SetMouseDelay|SetNumlockState|SetScrollLockState|SetStoreCapslockMode|SetTimer|SetTitleMatchMode|SetWinDelay|SetWorkingDir|Shutdown|Sleep|Sort|SoundBeep|SoundGet|SoundGetWaveVolume|SoundPlay|SoundSet|SoundSetWaveVolume|SplashImage|SplashTextOff|SplashTextOn|SplitPath|StatusBarGetText|StatusBarWait|StringCaseSense|StringGetPos|StringLeft|StringLen|StringLower|StringMid|StringReplace|StringRight|StringSplit|StringTrimLeft|StringTrimRight|StringUpper|Suspend|SysGet|Thread|ToolTip|Transform|TrayTip|URLDownloadToFile|WinActivate|WinActivateBottom|WinClose|WinGet|WinGetActiveStats|WinGetActiveTitle|WinGetClass|WinGetPos|WinGetText|WinGetTitle|WinHide|WinKill|WinMaximize|WinMenuSelectItem|WinMinimize|WinMinimizeAll|WinMinimizeAllUndo|WinMove|WinRestore|WinSet|WinSetTitle|WinShow|WinWait|WinWaitActive|WinWaitClose|WinWaitNotActive)\b/i,

	constant: /\b(a_ahkpath|a_ahkversion|a_appdata|a_appdatacommon|a_autotrim|a_batchlines|a_caretx|a_carety|a_computername|a_controldelay|a_cursor|a_dd|a_ddd|a_dddd|a_defaultmousespeed|a_desktop|a_desktopcommon|a_detecthiddentext|a_detecthiddenwindows|a_endchar|a_eventinfo|a_exitreason|a_formatfloat|a_formatinteger|a_gui|a_guievent|a_guicontrol|a_guicontrolevent|a_guiheight|a_guiwidth|a_guix|a_guiy|a_hour|a_iconfile|a_iconhidden|a_iconnumber|a_icontip|a_index|a_ipaddress1|a_ipaddress2|a_ipaddress3|a_ipaddress4|a_isadmin|a_iscompiled|a_iscritical|a_ispaused|a_issuspended|a_isunicode|a_keydelay|a_language|a_lasterror|a_linefile|a_linenumber|a_loopfield|a_loopfileattrib|a_loopfiledir|a_loopfileext|a_loopfilefullpath|a_loopfilelongpath|a_loopfilename|a_loopfileshortname|a_loopfileshortpath|a_loopfilesize|a_loopfilesizekb|a_loopfilesizemb|a_loopfiletimeaccessed|a_loopfiletimecreated|a_loopfiletimemodified|a_loopreadline|a_loopregkey|a_loopregname|a_loopregsubkey|a_loopregtimemodified|a_loopregtype|a_mday|a_min|a_mm|a_mmm|a_mmmm|a_mon|a_mousedelay|a_msec|a_mydocuments|a_now|a_nowutc|a_numbatchlines|a_ostype|a_osversion|a_priorhotkey|programfiles|a_programfiles|a_programs|a_programscommon|a_screenheight|a_screenwidth|a_scriptdir|a_scriptfullpath|a_scriptname|a_sec|a_space|a_startmenu|a_startmenucommon|a_startup|a_startupcommon|a_stringcasesense|a_tab|a_temp|a_thisfunc|a_thishotkey|a_thislabel|a_thismenu|a_thismenuitem|a_thismenuitempos|a_tickcount|a_timeidle|a_timeidlephysical|a_timesincepriorhotkey|a_timesincethishotkey|a_titlematchmode|a_titlematchmodespeed|a_username|a_wday|a_windelay|a_windir|a_workingdir|a_yday|a_year|a_yweek|a_yyyy|clipboard|clipboardall|comspec|errorlevel)\b/i,

	builtin: /\b(abs|acos|asc|asin|atan|ceil|chr|class|cos|dllcall|exp|fileexist|Fileopen|floor|getkeystate|il_add|il_create|il_destroy|instr|substr|isfunc|islabel|IsObject|ln|log|lv_add|lv_delete|lv_deletecol|lv_getcount|lv_getnext|lv_gettext|lv_insert|lv_insertcol|lv_modify|lv_modifycol|lv_setimagelist|mod|onmessage|numget|numput|registercallback|regexmatch|regexreplace|round|sin|tan|sqrt|strlen|sb_seticon|sb_setparts|sb_settext|strsplit|tv_add|tv_delete|tv_getchild|tv_getcount|tv_getnext|tv_get|tv_getparent|tv_getprev|tv_getselection|tv_gettext|tv_modify|varsetcapacity|winactive|winexist|__New|__Call|__Get|__Set)\b/i,

	symbol: /\b(alt|altdown|altup|appskey|backspace|browser_back|browser_favorites|browser_forward|browser_home|browser_refresh|browser_search|browser_stop|bs|capslock|control|ctrl|ctrlbreak|ctrldown|ctrlup|del|delete|down|end|enter|esc|escape|f1|f10|f11|f12|f13|f14|f15|f16|f17|f18|f19|f2|f20|f21|f22|f23|f24|f3|f4|f5|f6|f7|f8|f9|home|ins|insert|joy1|joy10|joy11|joy12|joy13|joy14|joy15|joy16|joy17|joy18|joy19|joy2|joy20|joy21|joy22|joy23|joy24|joy25|joy26|joy27|joy28|joy29|joy3|joy30|joy31|joy32|joy4|joy5|joy6|joy7|joy8|joy9|joyaxes|joybuttons|joyinfo|joyname|joypov|joyr|joyu|joyv|joyx|joyy|joyz|lalt|launch_app1|launch_app2|launch_mail|launch_media|lbutton|lcontrol|lctrl|left|lshift|lwin|lwindown|lwinup|mbutton|media_next|media_play_pause|media_prev|media_stop|numlock|numpad0|numpad1|numpad2|numpad3|numpad4|numpad5|numpad6|numpad7|numpad8|numpad9|numpadadd|numpadclear|numpaddel|numpaddiv|numpaddot|numpaddown|numpadend|numpadenter|numpadhome|numpadins|numpadleft|numpadmult|numpadpgdn|numpadpgup|numpadright|numpadsub|numpadup|pause|pgdn|pgup|printscreen|ralt|rbutton|rcontrol|rctrl|right|rshift|rwin|rwindown|rwinup|scrolllock|shift|shiftdown|shiftup|space|tab|up|volume_down|volume_mute|volume_up|wheeldown|wheelleft|wheelright|wheelup|xbutton1|xbutton2)\b/i,

	important: /#\b(AllowSameLineComments|ClipboardTimeout|CommentFlag|ErrorStdOut|EscapeChar|HotkeyInterval|HotkeyModifierTimeout|Hotstring|IfWinActive|IfWinExist|IfWinNotActive|IfWinNotExist|Include|IncludeAgain|InstallKeybdHook|InstallMouseHook|KeyHistory|LTrim|MaxHotkeysPerInterval|MaxMem|MaxThreads|MaxThreadsBuffer|MaxThreadsPerHotkey|NoEnv|NoTrayIcon|Persistent|SingleInstance|UseHook|WinActivateForce)\b/i,

	keyword: /\b(Abort|AboveNormal|Add|ahk_class|ahk_group|ahk_id|ahk_pid|All|Alnum|Alpha|AltSubmit|AltTab|AltTabAndMenu|AltTabMenu|AltTabMenuDismiss|AlwaysOnTop|AutoSize|Background|BackgroundTrans|BelowNormal|between|BitAnd|BitNot|BitOr|BitShiftLeft|BitShiftRight|BitXOr|Bold|Border|Button|ByRef|Checkbox|Checked|CheckedGray|Choose|ChooseString|Click|Close|Color|ComboBox|Contains|ControlList|Count|Date|DateTime|Days|DDL|Default|Delete|DeleteAll|Delimiter|Deref|Destroy|Digit|Disable|Disabled|DropDownList|Edit|Eject|Else|Enable|Enabled|Error|Exist|Exp|Expand|ExStyle|FileSystem|First|Flash|Float|FloatFast|Focus|Font|for|global|Grid|Group|GroupBox|GuiClose|GuiContextMenu|GuiDropFiles|GuiEscape|GuiSize|Hdr|Hidden|Hide|High|HKCC|HKCR|HKCU|HKEY_CLASSES_ROOT|HKEY_CURRENT_CONFIG|HKEY_CURRENT_USER|HKEY_LOCAL_MACHINE|HKEY_USERS|HKLM|HKU|Hours|HScroll|Icon|IconSmall|ID|IDLast|If|IfEqual|IfExist|IfGreater|IfGreaterOrEqual|IfInString|IfLess|IfLessOrEqual|IfMsgBox|IfNotEqual|IfNotExist|IfNotInString|IfWinActive|IfWinExist|IfWinNotActive|IfWinNotExist|Ignore|ImageList|in|Integer|IntegerFast|Interrupt|is|italic|Join|Label|LastFound|LastFoundExist|Limit|Lines|List|ListBox|ListView|Ln|local|Lock|Logoff|Low|Lower|Lowercase|MainWindow|Margin|Maximize|MaximizeBox|MaxSize|Minimize|MinimizeBox|MinMax|MinSize|Minutes|MonthCal|Mouse|Move|Multi|NA|No|NoActivate|NoDefault|NoHide|NoIcon|NoMainWindow|norm|Normal|NoSort|NoSortHdr|NoStandard|Not|NoTab|NoTimers|Number|Off|Ok|On|OwnDialogs|Owner|Parse|Password|Picture|Pixel|Pos|Pow|Priority|ProcessName|Radio|Range|Read|ReadOnly|Realtime|Redraw|REG_BINARY|REG_DWORD|REG_EXPAND_SZ|REG_MULTI_SZ|REG_SZ|Region|Relative|Rename|Report|Resize|Restore|Retry|RGB|Right|Screen|Seconds|Section|Serial|SetLabel|ShiftAltTab|Show|Single|Slider|SortDesc|Standard|static|Status|StatusBar|StatusCD|strike|Style|Submit|SysMenu|Tab|Tab2|TabStop|Text|Theme|Tile|ToggleCheck|ToggleEnable|ToolWindow|Top|Topmost|TransColor|Transparent|Tray|TreeView|TryAgain|Type|UnCheck|underline|Unicode|Unlock|UpDown|Upper|Uppercase|UseErrorLevel|Vis|VisFirst|Visible|VScroll|Wait|WaitClose|WantCtrlA|WantF2|WantReturn|While|Wrap|Xdigit|xm|xp|xs|Yes|ym|yp|ys)\b/i
};
Prism.languages.bash = Prism.languages.extend("clike", {
	comment: {
		pattern: /(^|[^"{\\])(#.*?(\r?\n|$))/g,
		lookbehind: true
	},
	string: {
		//allow multiline string
		pattern: /("|')(\\?[\s\S])*?\1/g,
		inside: {
			//'property' class reused for bash variables
			property: /\$([a-zA-Z0-9_#\?\-\*!@]+|\{[^\}]+\})/g
		}
	},
	keyword: /\b(if|then|else|elif|fi|for|break|continue|while|in|case|function|select|do|done|until|echo|exit|return|set|declare)\b/g
});

Prism.languages.insertBefore("bash", "keyword", {
	//'property' class reused for bash variables
	property: /\$([a-zA-Z0-9_#\?\-\*!@]+|\{[^}]+\})/g
});
Prism.languages.insertBefore("bash", "comment", {
	//shebang must be before comment, 'important' class from css reused
	important: /(^#!\s*\/bin\/bash)|(^#!\s*\/bin\/sh)/g
});

Prism.languages.c = Prism.languages.extend("clike", {
	// allow for c multiline strings
	string: /("|')([^\n\\\1]|\\.|\\\r*\n)*?\1/g,
	keyword: /\b(asm|typeof|inline|auto|break|case|char|const|continue|default|do|double|else|enum|extern|float|for|goto|if|int|long|register|return|short|signed|sizeof|static|struct|switch|typedef|union|unsigned|void|volatile|while)\b/g,
	operator: /[-+]{1,2}|!=?|<{1,2}=?|>{1,2}=?|\->|={1,2}|\^|~|%|&{1,2}|\|?\||\?|\*|\//g
});

Prism.languages.insertBefore("c", "string", {
	// property class reused for macro statements
	property: {
		// allow for multiline macro definitions
		// spaces after the # character compile fine with gcc
		pattern: /((^|\n)\s*)#\s*[a-z]+([^\n\\]|\\.|\\\r*\n)*/gi,
		lookbehind: true,
		inside: {
			// highlight the path of the include statement as a string
			string: {
				pattern: /(#\s*include\s*)(<.+?>|("|')(\\?.)+?\3)/g,
				lookbehind: true }
		}
	}
});

delete Prism.languages.c["class-name"];
delete Prism.languages.c.boolean;
Prism.languages.coffeescript = Prism.languages.extend("javascript", {
	comment: [/([#]{3}\s*\r?\n(.*\s*\r*\n*)\s*?\r?\n[#]{3})/g, /(\s|^)([#]{1}[^#^\r^\n]{2,}?(\r?\n|$))/g],
	keyword: /\b(this|window|delete|class|extends|namespace|extend|ar|let|if|else|while|do|for|each|of|return|in|instanceof|new|with|typeof|try|catch|finally|null|undefined|break|continue)\b/g
});

Prism.languages.insertBefore("coffeescript", "keyword", {
	"function": {
		pattern: /[a-z|A-z]+\s*[:|=]\s*(\([.|a-z\s|,|:|{|}|\"|\'|=]*\))?\s*-&gt;/gi,
		inside: {
			"function-name": /[_?a-z-|A-Z-]+(\s*[:|=])| @[_?$?a-z-|A-Z-]+(\s*)| /g,
			operator: /[-+]{1,2}|!|=?&lt;|=?&gt;|={1,2}|(&amp;){1,2}|\|?\||\?|\*|\//g
		}
	},
	"attr-name": /[_?a-z-|A-Z-]+(\s*:)| @[_?$?a-z-|A-Z-]+(\s*)| /g
});

Prism.languages.cpp = Prism.languages.extend("c", {
	keyword: /\b(alignas|alignof|asm|auto|bool|break|case|catch|char|char16_t|char32_t|class|compl|const|constexpr|const_cast|continue|decltype|default|delete|delete\[\]|do|double|dynamic_cast|else|enum|explicit|export|extern|float|for|friend|goto|if|inline|int|long|mutable|namespace|new|new\[\]|noexcept|nullptr|operator|private|protected|public|register|reinterpret_cast|return|short|signed|sizeof|static|static_assert|static_cast|struct|switch|template|this|thread_local|throw|try|typedef|typeid|typename|union|unsigned|using|virtual|void|volatile|wchar_t|while)\b/g,
	boolean: /\b(true|false)\b/g,
	operator: /[-+]{1,2}|!=?|<{1,2}=?|>{1,2}=?|\->|:{1,2}|={1,2}|\^|~|%|&{1,2}|\|?\||\?|\*|\/|\b(and|and_eq|bitand|bitor|not|not_eq|or|or_eq|xor|xor_eq)\b/g
});

Prism.languages.insertBefore("cpp", "keyword", {
	"class-name": {
		pattern: /(class\s+)[a-z0-9_]+/ig,
		lookbehind: true } });
Prism.languages.csharp = Prism.languages.extend("clike", {
	keyword: /\b(abstract|as|base|bool|break|byte|case|catch|char|checked|class|const|continue|decimal|default|delegate|do|double|else|enum|event|explicit|extern|false|finally|fixed|float|for|foreach|goto|if|implicit|in|int|interface|internal|is|lock|long|namespace|new|null|object|operator|out|override|params|private|protected|public|readonly|ref|return|sbyte|sealed|short|sizeof|stackalloc|static|string|struct|switch|this|throw|true|try|typeof|uint|ulong|unchecked|unsafe|ushort|using|virtual|void|volatile|while|add|alias|ascending|async|await|descending|dynamic|from|get|global|group|into|join|let|orderby|partial|remove|select|set|value|var|where|yield)\b/g,
	string: /@?("|')(\\?.)*?\1/g,
	preprocessor: /^\s*#.*/gm,
	number: /\b-?(0x)?\d*\.?\d+\b/g
});

Prism.languages.css.selector = {
	pattern: /[^\{\}\s][^\{\}]*(?=\s*\{)/g,
	inside: {
		"pseudo-element": /:(?:after|before|first-letter|first-line|selection)|::[-\w]+/g,
		"pseudo-class": /:[-\w]+(?:\(.*\))?/g,
		"class": /\.[-:\.\w]+/g,
		id: /#[-:\.\w]+/g
	}
};

Prism.languages.insertBefore("css", "ignore", {
	hexcode: /#[\da-f]{3,6}/gi,
	entity: /\\[\da-f]{1,8}/gi,
	number: /[\d%\.]+/g
});
// TODO:
// 		- Support for outline parameters
// 		- Support for tables

Prism.languages.gherkin = {
	comment: {
		pattern: /(^|[^\\])(\/\*[\w\W]*?\*\/|((#)|(\/\/)).*?(\r?\n|$))/g,
		lookbehind: true
	},
	string: /("|')(\\?.)*?\1/g,
	atrule: /\b(And|Given|When|Then|In order to|As an|I want to|As a)\b/g,
	keyword: /\b(Scenario Outline|Scenario|Feature|Background|Story)\b/g };

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
	comment: /^#.*$/m,

	/*
  * a string (double and simple quote)
  */
	string: /("|')(\\?.)*?\1/gm,

	/*
  * a git command. It starts with a random prompt finishing by a $, then "git" then some other parameters
  * For instance:
  * $ git add file.txt
  */
	command: {
		pattern: /^.*\$ git .*$/m,
		inside: {
			/*
    * A git command can contain a parameter starting by a single or a double dash followed by a string
    * For instance:
    * $ git diff --cached
    * $ git log -p
    */
			parameter: /\s(--|-)\w+/m
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
	coord: /^@@.*@@$/m,

	/*
  * Regexp to match the changed lines in a git diff output. Check the example above.
  */
	deleted: /^-(?!-).+$/m,
	inserted: /^\+(?!\+).+$/m,

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
	commit_sha1: /^commit \w{40}$/m
};

Prism.languages.go = Prism.languages.extend("clike", {
	keyword: /\b(break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go(to)?|if|import|interface|map|package|range|return|select|struct|switch|type|var)\b/g,
	builtin: /\b(bool|byte|complex(64|128)|error|float(32|64)|rune|string|u?int(8|16|32|64|)|uintptr|append|cap|close|complex|copy|delete|imag|len|make|new|panic|print(ln)?|real|recover)\b/g,
	boolean: /\b(_|iota|nil|true|false)\b/g,
	operator: /([(){}\[\]]|[*\/%^!]=?|\+[=+]?|-[>=-]?|\|[=|]?|>[=>]?|<(<|[=-])?|==?|&(&|=|^=?)?|\.(\.\.)?|[,;]|:=?)/g,
	number: /\b(-?(0x[a-f\d]+|(\d+\.?\d*|\.\d+)(e[-+]?\d+)?)i?)\b/ig,
	string: /("|'|`)(\\?.|\r|\n)*?\1/g
});
delete Prism.languages.go["class-name"];

Prism.languages.groovy = Prism.languages.extend("clike", {
	keyword: /\b(as|def|in|abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|extends|final|finally|float|for|goto|if|implements|import|instanceof|int|interface|long|native|new|package|private|protected|public|return|short|static|strictfp|super|switch|synchronized|this|throw|throws|trait|transient|try|void|volatile|while)\b/g,
	string: /("""|''')[\W\w]*?\1|("|'|\/)[\W\w]*?\2|(\$\/)(\$\/\$|[\W\w])*?\/\$/g,
	number: /\b0b[01_]+\b|\b0x[\da-f_]+(\.[\da-f_p\-]+)?\b|\b[\d_]+(\.[\d_]+[e]?[\d]*)?[glidf]\b|[\d_]+(\.[\d_]+)?\b/gi,
	operator: {
		pattern: /(^|[^.])(={0,2}~|\?\.|\*?\.@|\.&|\.{1,2}(?!\.)|\.{2}<?(?=\w)|->|\?:|[-+]{1,2}|!|<=>|>{1,3}|<{1,2}|={1,2}|&{1,2}|\|{1,2}|\?|\*{1,2}|\/|\^|%)/g,
		lookbehind: true
	},
	punctuation: /\.+|[{}[\];(),:$]/g
});

Prism.languages.insertBefore("groovy", "punctuation", {
	"spock-block": /\b(setup|given|when|then|and|cleanup|expect|where):/g
});

Prism.languages.insertBefore("groovy", "function", {
	annotation: {
		pattern: /(^|[^.])@\w+/,
		lookbehind: true
	}
});

Prism.hooks.add("wrap", function (env) {
	if (env.language === "groovy" && env.type === "string") {
		var delimiter = env.content[0];

		if (delimiter != "'") {
			var pattern = /([^\\])(\$(\{.*?\}|[\w\.]+))/;
			if (delimiter === "$") {
				pattern = /([^\$])(\$(\{.*?\}|[\w\.]+))/;
			}
			env.content = Prism.highlight(env.content, {
				expression: {
					pattern: pattern,
					lookbehind: true,
					inside: Prism.languages.groovy
				}
			});

			env.classes.push(delimiter === "/" ? "regex" : "gstring");
		}
	}
});

Prism.languages.handlebars = {
	expression: {
		pattern: /\{\{\{[\w\W]+?\}\}\}|\{\{[\w\W]+?\}\}/g,
		inside: {
			comment: {
				pattern: /(\{\{)![\w\W]*(?=\}\})/g,
				lookbehind: true
			},
			delimiter: {
				pattern: /^\{\{\{?|\}\}\}?$/ig,
				alias: "punctuation"
			},
			string: /(["'])(\\?.)+?\1/g,
			number: /\b-?(0x[\dA-Fa-f]+|\d*\.?\d+([Ee]-?\d+)?)\b/g,
			boolean: /\b(true|false)\b/g,
			block: {
				pattern: /^(\s*~?\s*)[#\/]\w+/ig,
				lookbehind: true,
				alias: "keyword"
			},
			brackets: {
				pattern: /\[[^\]]+\]/,
				inside: {
					punctuation: /\[|\]/g,
					variable: /[\w\W]+/g
				}
			},
			punctuation: /[!"#%&'()*+,.\/;<=>@\[\\\]^`{|}~]/g,
			variable: /[^!"#%&'()*+,.\/;<=>@\[\\\]^`{|}~]+/g
		}
	}
};

if (Prism.languages.markup) {

	// Tokenize all inline Handlebars expressions that are wrapped in {{ }} or {{{ }}}
	// This allows for easy Handlebars + markup highlighting
	Prism.hooks.add("before-highlight", function (env) {
		console.log(env.language);
		if (env.language !== "handlebars") {
			return;
		}

		env.tokenStack = [];

		env.backupCode = env.code;
		env.code = env.code.replace(/\{\{\{[\w\W]+?\}\}\}|\{\{[\w\W]+?\}\}/ig, function (match) {
			console.log(match);
			env.tokenStack.push(match);

			return "___HANDLEBARS" + env.tokenStack.length + "___";
		});
	});

	// Restore env.code for other plugins (e.g. line-numbers)
	Prism.hooks.add("before-insert", function (env) {
		if (env.language === "handlebars") {
			env.code = env.backupCode;
			delete env.backupCode;
		}
	});

	// Re-insert the tokens after highlighting
	Prism.hooks.add("after-highlight", function (env) {
		if (env.language !== "handlebars") {
			return;
		}

		for (var i = 0, t; t = env.tokenStack[i]; i++) {
			env.highlightedCode = env.highlightedCode.replace("___HANDLEBARS" + (i + 1) + "___", Prism.highlight(t, env.grammar, "handlebars"));
		}

		env.element.innerHTML = env.highlightedCode;
	});

	// Wrap tokens in classes that are missing them
	Prism.hooks.add("wrap", function (env) {
		if (env.language === "handlebars" && env.type === "markup") {
			env.content = env.content.replace(/(___HANDLEBARS[0-9]+___)/g, "<span class=\"token handlebars\">$1</span>");
		}
	});

	// Add the rules before all others
	Prism.languages.insertBefore("handlebars", "expression", {
		markup: {
			pattern: /<[^?]\/?(.*?)>/g,
			inside: Prism.languages.markup
		},
		handlebars: /___HANDLEBARS[0-9]+___/g
	});
}

Prism.languages.haskell = {
	comment: {
		pattern: /(^|[^-!#$%*+=\?&@|~.:<>^\\])(--[^-!#$%*+=\?&@|~.:<>^\\].*(\r?\n|$)|{-[\w\W]*?-})/gm,
		lookbehind: true
	},
	char: /'([^\\"]|\\([abfnrtv\\"'&]|\^[A-Z@[\]\^_]|NUL|SOH|STX|ETX|EOT|ENQ|ACK|BEL|BS|HT|LF|VT|FF|CR|SO|SI|DLE|DC1|DC2|DC3|DC4|NAK|SYN|ETB|CAN|EM|SUB|ESC|FS|GS|RS|US|SP|DEL|\d+|o[0-7]+|x[0-9a-fA-F]+))'/g,
	string: /"([^\\"]|\\([abfnrtv\\"'&]|\^[A-Z@[\]\^_]|NUL|SOH|STX|ETX|EOT|ENQ|ACK|BEL|BS|HT|LF|VT|FF|CR|SO|SI|DLE|DC1|DC2|DC3|DC4|NAK|SYN|ETB|CAN|EM|SUB|ESC|FS|GS|RS|US|SP|DEL|\d+|o[0-7]+|x[0-9a-fA-F]+)|\\\s+\\)*"/g,
	keyword: /\b(case|class|data|deriving|do|else|if|in|infixl|infixr|instance|let|module|newtype|of|primitive|then|type|where)\b/g,
	import_statement: {
		// The imported or hidden names are not included in this import
		// statement. This is because we want to highlight those exactly like
		// we do for the names in the program.
		pattern: /(\n|^)\s*(import)\s+(qualified\s+)?(([A-Z][_a-zA-Z0-9']*)(\.[A-Z][_a-zA-Z0-9']*)*)(\s+(as)\s+(([A-Z][_a-zA-Z0-9']*)(\.[A-Z][_a-zA-Z0-9']*)*))?(\s+hiding\b)?/gm,
		inside: {
			keyword: /\b(import|qualified|as|hiding)\b/g
		}
	},
	// These are builtin variables only. Constructors are highlighted later as a constant.
	builtin: /\b(abs|acos|acosh|all|and|any|appendFile|approxRational|asTypeOf|asin|asinh|atan|atan2|atanh|basicIORun|break|catch|ceiling|chr|compare|concat|concatMap|const|cos|cosh|curry|cycle|decodeFloat|denominator|digitToInt|div|divMod|drop|dropWhile|either|elem|encodeFloat|enumFrom|enumFromThen|enumFromThenTo|enumFromTo|error|even|exp|exponent|fail|filter|flip|floatDigits|floatRadix|floatRange|floor|fmap|foldl|foldl1|foldr|foldr1|fromDouble|fromEnum|fromInt|fromInteger|fromIntegral|fromRational|fst|gcd|getChar|getContents|getLine|group|head|id|inRange|index|init|intToDigit|interact|ioError|isAlpha|isAlphaNum|isAscii|isControl|isDenormalized|isDigit|isHexDigit|isIEEE|isInfinite|isLower|isNaN|isNegativeZero|isOctDigit|isPrint|isSpace|isUpper|iterate|last|lcm|length|lex|lexDigits|lexLitChar|lines|log|logBase|lookup|map|mapM|mapM_|max|maxBound|maximum|maybe|min|minBound|minimum|mod|negate|not|notElem|null|numerator|odd|or|ord|otherwise|pack|pi|pred|primExitWith|print|product|properFraction|putChar|putStr|putStrLn|quot|quotRem|range|rangeSize|read|readDec|readFile|readFloat|readHex|readIO|readInt|readList|readLitChar|readLn|readOct|readParen|readSigned|reads|readsPrec|realToFrac|recip|rem|repeat|replicate|return|reverse|round|scaleFloat|scanl|scanl1|scanr|scanr1|seq|sequence|sequence_|show|showChar|showInt|showList|showLitChar|showParen|showSigned|showString|shows|showsPrec|significand|signum|sin|sinh|snd|sort|span|splitAt|sqrt|subtract|succ|sum|tail|take|takeWhile|tan|tanh|threadToIOResult|toEnum|toInt|toInteger|toLower|toRational|toUpper|truncate|uncurry|undefined|unlines|until|unwords|unzip|unzip3|userError|words|writeFile|zip|zip3|zipWith|zipWith3)\b/g,
	// decimal integers and floating point numbers | octal integers | hexadecimal integers
	number: /\b(\d+(\.\d+)?([eE][+-]?\d+)?|0[Oo][0-7]+|0[Xx][0-9a-fA-F]+)\b/g,
	// Most of this is needed because of the meaning of a single '.'.
	// If it stands alone freely, it is the function composition.
	// It may also be a separator between a module name and an identifier => no
	// operator. If it comes together with other special characters it is an
	// operator too.
	operator: /\s\.\s|([-!#$%*+=\?&@|~:<>^\\]*\.[-!#$%*+=\?&@|~:<>^\\]+)|([-!#$%*+=\?&@|~:<>^\\]+\.[-!#$%*+=\?&@|~:<>^\\]*)|[-!#$%*+=\?&@|~:<>^\\]+|(`([A-Z][_a-zA-Z0-9']*\.)*[_a-z][_a-zA-Z0-9']*`)/g,
	// In Haskell, nearly everything is a variable, do not highlight these.
	hvariable: /\b([A-Z][_a-zA-Z0-9']*\.)*[_a-z][_a-zA-Z0-9']*\b/g,
	constant: /\b([A-Z][_a-zA-Z0-9']*\.)*[A-Z][_a-zA-Z0-9']*\b/g,
	punctuation: /[{}[\];(),.:]/g
};

Prism.languages.http = {
	"request-line": {
		pattern: /^(POST|GET|PUT|DELETE|OPTIONS|PATCH|TRACE|CONNECT)\b\shttps?:\/\/\S+\sHTTP\/[0-9.]+/g,
		inside: {
			// HTTP Verb
			property: /^\b(POST|GET|PUT|DELETE|OPTIONS|PATCH|TRACE|CONNECT)\b/g,
			// Path or query argument
			"attr-name": /:\w+/g
		}
	},
	"response-status": {
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
	"application/json": Prism.languages.javascript,
	"application/xml": Prism.languages.markup,
	"text/xml": Prism.languages.markup,
	"text/html": Prism.languages.markup
};

// Insert each content type parser that has its associated language
// currently loaded.
for (var contentType in httpLanguages) {
	if (httpLanguages[contentType]) {
		var options = {};
		options[contentType] = {
			pattern: new RegExp("(content-type:\\s*" + contentType + "[\\w\\W]*?)\\n\\n[\\w\\W]*", "gi"),
			lookbehind: true,
			inside: {
				rest: httpLanguages[contentType]
			}
		};
		Prism.languages.insertBefore("http", "keyword", options);
	}
}

Prism.languages.ini = {
	comment: /^\s*;.*$/gm,
	important: /\[.*?\]/gm,
	constant: /^\s*[^\s\=]+?(?=[ \t]*\=)/gm,
	"attr-value": {
		pattern: /\=.*/gm,
		inside: {
			punctuation: /^[\=]/g
		}
	}
};
Prism.languages.java = Prism.languages.extend("clike", {
	keyword: /\b(abstract|continue|for|new|switch|assert|default|goto|package|synchronized|boolean|do|if|private|this|break|double|implements|protected|throw|byte|else|import|public|throws|case|enum|instanceof|return|transient|catch|extends|int|short|try|char|final|interface|static|void|class|finally|long|strictfp|volatile|const|float|native|super|while)\b/g,
	number: /\b0b[01]+\b|\b0x[\da-f]*\.?[\da-fp\-]+\b|\b\d*\.?\d+[e]?[\d]*[df]\b|\W\d*\.?\d+\b/gi,
	operator: {
		pattern: /(^|[^\.])(?:\+=|\+\+?|-=|--?|!=?|<{1,2}=?|>{1,3}=?|==?|&=|&&?|\|=|\|\|?|\?|\*=?|\/=?|%=?|\^=?|:|~)/gm,
		lookbehind: true
	}
});
Prism.languages.latex = {
	comment: /%.*?(\r?\n|$)$/m,
	string: /(\$)(\\?.)*?\1/g,
	punctuation: /[{}]/g,
	selector: /\\[a-z;,:\.]*/i
};
Prism.languages.nasm = {
	comment: /;.*$/m,
	string: /("|'|`)(\\?.)*?\1/gm,
	label: {
		pattern: /^\s*[A-Za-z\._\?\$][\w\.\?\$@~#]*:/m,
		alias: "function"
	},
	keyword: [/\[?BITS (16|32|64)\]?/m, /^\s*section\s*[a-zA-Z\.]+:?/im, /(?:extern|global)[^;]*/im, /(?:CPU|FLOAT|DEFAULT).*$/m],
	register: {
		pattern: /\b(?:st\d|[xyz]mm\d\d?|[cdt]r\d|r\d\d?[bwd]?|[er]?[abcd]x|[abcd][hl]|[er]?(bp|sp|si|di)|[cdefgs]s)\b/gi,
		alias: "variable"
	},
	number: /(\b|-|(?=\$))(0[hHxX][\dA-Fa-f]*\.?[\dA-Fa-f]+([pP][+-]?\d+)?|\d[\dA-Fa-f]+[hHxX]|\$\d[\dA-Fa-f]*|0[oOqQ][0-7]+|[0-7]+[oOqQ]|0[bByY][01]+|[01]+[bByY]|0[dDtT]\d+|\d+[dDtT]?|\d*\.?\d+([Ee][+-]?\d+)?)\b/g,
	operator: /[\[\]\*+\-\/%<>=&|\$!]/gm
};

/**
 * Original by Jan T. Sott (http://github.com/idleberg)
 *
 * Includes all commands and plug-ins shipped with NSIS 3.0a2
 */
Prism.languages.nsis = {
	comment: {
		pattern: /(^|[^\\])(\/\*[\w\W]*?\*\/|(^|[^:])(#|;).*?(\r?\n|$))/g,
		lookbehind: true
	},
	string: /("|')(\\?.)*?\1/g,
	keyword: /\b(Abort|Add(BrandingImage|Size)|AdvSplash|Allow(RootDirInstall|SkipFiles)|AutoCloseWindow|Banner|BG(Font|Gradient|Image)|BrandingText|BringToFront|Call(\b|InstDLL)|Caption|ChangeUI|CheckBitmap|ClearErrors|CompletedText|ComponentText|CopyFiles|CRCCheck|Create(Directory|Font|ShortCut)|Delete(\b|INISec|INIStr|RegKey|RegValue)|Detail(Print|sButtonText)|Dialer|Dir(Text|Var|Verify)|EnableWindow|Enum(RegKey|RegValue)|Exch|Exec(\b|Shell|Wait)|ExpandEnvStrings|File(\b|BufSize|Close|ErrorText|Open|Read|ReadByte|ReadUTF16LE|ReadWord|WriteUTF16LE|Seek|Write|WriteByte|WriteWord)|Find(Close|First|Next|Window)|FlushINI|Get(CurInstType|CurrentAddress|DlgItem|DLLVersion|DLLVersionLocal|ErrorLevel|FileTime|FileTimeLocal|FullPathName|Function(\b|Address|End)|InstDirError|LabelAddress|TempFileName)|Goto|HideWindow|Icon|If(Abort|Errors|FileExists|RebootFlag|Silent)|InitPluginsDir|Install(ButtonText|Colors|Dir|DirRegKey)|InstProgressFlags|Inst(Type|TypeGetText|TypeSetText)|Int(Cmp|CmpU|Fmt|Op)|IsWindow|Lang(DLL|String)|License(BkColor|Data|ForceSelection|LangString|Text)|LoadLanguageFile|LockWindow|Log(Set|Text)|Manifest(DPIAware|SupportedOS)|Math|MessageBox|MiscButtonText|Name|Nop|ns(Dialogs|Exec)|NSISdl|OutFile|Page(\b|Callbacks)|Pop|Push|Quit|Read(EnvStr|INIStr|RegDWORD|RegStr)|Reboot|RegDLL|Rename|RequestExecutionLevel|ReserveFile|Return|RMDir|SearchPath|Section(\b|End|GetFlags|GetInstTypes|GetSize|GetText|Group|In|SetFlags|SetInstTypes|SetSize|SetText)|SendMessage|Set(AutoClose|BrandingImage|Compress|Compressor|CompressorDictSize|CtlColors|CurInstType|DatablockOptimize|DateSave|DetailsPrint|DetailsView|ErrorLevel|Errors|FileAttributes|Font|OutPath|Overwrite|PluginUnload|RebootFlag|RegView|ShellVarContext|Silent)|Show(InstDetails|UninstDetails|Window)|Silent(Install|UnInstall)|Sleep|SpaceTexts|Splash|StartMenu|Str(Cmp|CmpS|Cpy|Len)|SubCaption|System|Unicode|Uninstall(ButtonText|Caption|Icon|SubCaption|Text)|UninstPage|UnRegDLL|UserInfo|Var|VI(AddVersionKey|FileVersion|ProductVersion)|VPatch|WindowIcon|WriteINIStr|WriteRegBin|WriteRegDWORD|WriteRegExpandStr|Write(RegStr|Uninstaller)|XPStyle)\b/g,
	property: /\b(admin|all|auto|both|colored|false|force|hide|highest|lastused|leave|listonly|none|normal|notset|off|on|open|print|show|silent|silentlog|smooth|textonly|true|user|ARCHIVE|FILE_(ATTRIBUTE_ARCHIVE|ATTRIBUTE_NORMAL|ATTRIBUTE_OFFLINE|ATTRIBUTE_READONLY|ATTRIBUTE_SYSTEM|ATTRIBUTE_TEMPORARY)|HK(CR|CU|DD|LM|PD|U)|HKEY_(CLASSES_ROOT|CURRENT_CONFIG|CURRENT_USER|DYN_DATA|LOCAL_MACHINE|PERFORMANCE_DATA|USERS)|ID(ABORT|CANCEL|IGNORE|NO|OK|RETRY|YES)|MB_(ABORTRETRYIGNORE|DEFBUTTON1|DEFBUTTON2|DEFBUTTON3|DEFBUTTON4|ICONEXCLAMATION|ICONINFORMATION|ICONQUESTION|ICONSTOP|OK|OKCANCEL|RETRYCANCEL|RIGHT|RTLREADING|SETFOREGROUND|TOPMOST|USERICON|YESNO)|NORMAL|OFFLINE|READONLY|SHCTX|SHELL_CONTEXT|SYSTEM|TEMPORARY)\b/g,
	variable: /(\$(\(|\{)?[-_\w]+)(\)|\})?/i,
	number: /\b-?(0x[\dA-Fa-f]+|\d*\.?\d+([Ee]-?\d+)?)\b/g,
	operator: /[-+]{1,2}|&lt;=?|>=?|={1,3}|(&amp;){1,2}|\|?\||\?|\*|\/|\~|\^|\%/g,
	punctuation: /[{}[\];(),.:]/g,
	important: /\!(addincludedir|addplugindir|appendfile|cd|define|delfile|echo|else|endif|error|execute|finalize|getdllversionsystem|ifdef|ifmacrodef|ifmacrondef|ifndef|if|include|insertmacro|macroend|macro|makensis|packhdr|searchparse|searchreplace|tempfile|undef|verbose|warning)\b/gi };

Prism.languages.objectivec = Prism.languages.extend("c", {
	keyword: /(\b(asm|typeof|inline|auto|break|case|char|const|continue|default|do|double|else|enum|extern|float|for|goto|if|int|long|register|return|short|signed|sizeof|static|struct|switch|typedef|union|unsigned|void|volatile|while|in|self|super)\b)|((?=[\w|@])(@interface|@end|@implementation|@protocol|@class|@public|@protected|@private|@property|@try|@catch|@finally|@throw|@synthesize|@dynamic|@selector)\b)/g,
	string: /(?:("|')([^\n\\\1]|\\.|\\\r*\n)*?\1)|(@"([^\n\\"]|\\.|\\\r*\n)*?")/g,
	operator: /[-+]{1,2}|!=?|<{1,2}=?|>{1,2}=?|\->|={1,2}|\^|~|%|&{1,2}|\|?\||\?|\*|\/|@/g
});

Prism.languages.perl = {
	comment: [{
		// POD
		pattern: /((?:^|\n)\s*)=\w+[\s\S]*?=cut.+/g,
		lookbehind: true
	}, {
		pattern: /(^|[^\\$])#.*?(\r?\n|$)/g,
		lookbehind: true
	}],
	// TODO Could be nice to handle Heredoc too.
	string: [
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
	/("|'|`)(\\?.)*?\1/g],
	regex: [
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
	/\/(\[.+?]|\\.|[^\/\r\n])*\/[msixpodualgc]*(?=\s*($|[\r\n,.;})&|\-+*=~<>!?^]|(lt|gt|le|ge|eq|ne|cmp|not|and|or|xor|x)\b))/g],

	// FIXME Not sure about the handling of ::, ', and #
	variable: [
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
	/[\$@%][!"#\$%&'()*+,\-.\/:;<=>?@[\\\]^_`{|}~]/g],
	filehandle: {
		// <>, <FOO>, _
		pattern: /<(?!=).*>|\b_\b/g,
		alias: "symbol"
	},
	vstring: {
		// v1.2, 1.2.3
		pattern: /v\d+(\.\d+)*|\d+(\.\d+){2,}/g,
		alias: "string"
	},
	"function": {
		pattern: /sub [a-z0-9_]+/ig,
		inside: {
			keyword: /sub/
		}
	},
	keyword: /\b(any|break|continue|default|delete|die|do|else|elsif|eval|for|foreach|given|goto|if|last|local|my|next|our|package|print|redo|require|say|state|sub|switch|undef|unless|until|use|when|while)\b/g,
	number: /(\n|\b)-?(0x[\dA-Fa-f](_?[\dA-Fa-f])*|0b[01](_?[01])*|(\d(_?\d)*)?\.?\d(_?\d)*([Ee]-?\d+)?)\b/g,
	operator: /-[rwxoRWXOezsfdlpSbctugkTBMAC]\b|[-+*=~\/|&]{1,2}|<=?|>=?|\.{1,3}|[!?\\^]|\b(lt|gt|le|ge|eq|ne|cmp|not|and|or|xor|x)\b/g,
	punctuation: /[{}[\];(),:]/g
};

Prism.languages.insertBefore("php", "variable", {
	"this": /\$this/g,
	global: /\$_?(GLOBALS|SERVER|GET|POST|FILES|REQUEST|SESSION|ENV|COOKIE|HTTP_RAW_POST_DATA|argc|argv|php_errormsg|http_response_header)/g,
	scope: {
		pattern: /\b[\w\\]+::/g,
		inside: {
			keyword: /(static|self|parent)/,
			punctuation: /(::|\\)/
		}
	}
});
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

Prism.languages.php = Prism.languages.extend("clike", {
	keyword: /\b(and|or|xor|array|as|break|case|cfunction|class|const|continue|declare|default|die|do|else|elseif|enddeclare|endfor|endforeach|endif|endswitch|endwhile|extends|for|foreach|function|include|include_once|global|if|new|return|static|switch|use|require|require_once|var|while|abstract|interface|public|implements|private|protected|parent|throw|null|echo|print|trait|namespace|final|yield|goto|instanceof|finally|try|catch)\b/ig,
	constant: /\b[A-Z0-9_]{2,}\b/g,
	comment: {
		pattern: /(^|[^\\])(\/\*[\w\W]*?\*\/|(^|[^:])(\/\/|#).*?(\r?\n|$))/g,
		lookbehind: true
	}
});

Prism.languages.insertBefore("php", "keyword", {
	delimiter: /(\?>|<\?php|<\?)/ig,
	variable: /(\$\w+)\b/ig,
	"package": {
		pattern: /(\\|namespace\s+|use\s+)[\w\\]+/g,
		lookbehind: true,
		inside: {
			punctuation: /\\/
		}
	}
});

// Must be defined after the function pattern
Prism.languages.insertBefore("php", "operator", {
	property: {
		pattern: /(->)[\w]+/g,
		lookbehind: true
	}
});

// Add HTML support of the markup language exists
if (Prism.languages.markup) {

	// Tokenize all inline PHP blocks that are wrapped in <?php ?>
	// This allows for easy PHP + markup highlighting
	Prism.hooks.add("before-highlight", function (env) {
		if (env.language !== "php") {
			return;
		}

		env.tokenStack = [];

		env.backupCode = env.code;
		env.code = env.code.replace(/(?:<\?php|<\?)[\w\W]*?(?:\?>)/ig, function (match) {
			env.tokenStack.push(match);

			return "{{{PHP" + env.tokenStack.length + "}}}";
		});
	});

	// Restore env.code for other plugins (e.g. line-numbers)
	Prism.hooks.add("before-insert", function (env) {
		if (env.language === "php") {
			env.code = env.backupCode;
			delete env.backupCode;
		}
	});

	// Re-insert the tokens after highlighting
	Prism.hooks.add("after-highlight", function (env) {
		if (env.language !== "php") {
			return;
		}

		for (var i = 0, t; t = env.tokenStack[i]; i++) {
			env.highlightedCode = env.highlightedCode.replace("{{{PHP" + (i + 1) + "}}}", Prism.highlight(t, env.grammar, "php"));
		}

		env.element.innerHTML = env.highlightedCode;
	});

	// Wrap tokens in classes that are missing them
	Prism.hooks.add("wrap", function (env) {
		if (env.language === "php" && env.type === "markup") {
			env.content = env.content.replace(/(\{\{\{PHP[0-9]+\}\}\})/g, "<span class=\"token php\">$1</span>");
		}
	});

	// Add the rules before all others
	Prism.languages.insertBefore("php", "comment", {
		markup: {
			pattern: /<[^?]\/?(.*?)>/g,
			inside: Prism.languages.markup
		},
		php: /\{\{\{PHP[0-9]+\}\}\}/g
	});
}

Prism.languages.python = {
	comment: {
		pattern: /(^|[^\\])#.*?(\r?\n|$)/g,
		lookbehind: true
	},
	string: /"""[\s\S]+?"""|("|')(\\?.)*?\1/g,
	keyword: /\b(as|assert|break|class|continue|def|del|elif|else|except|exec|finally|for|from|global|if|import|in|is|lambda|pass|print|raise|return|try|while|with|yield)\b/g,
	boolean: /\b(True|False)\b/g,
	number: /\b-?(0x)?\d*\.?[\da-f]+\b/g,
	operator: /[-+]{1,2}|=?&lt;|=?&gt;|!|={1,2}|(&){1,2}|(&amp;){1,2}|\|?\||\?|\*|\/|~|\^|%|\b(or|and|not)\b/g,
	ignore: /&(lt|gt|amp);/gi,
	punctuation: /[{}[\];(),.:]/g
};

Prism.languages.rip = {
	comment: /#[^\r\n]*(\r?\n|$)/g,

	keyword: /(?:=>|->)|\b(?:class|if|else|switch|case|return|exit|try|catch|finally|raise)\b/g,

	builtin: /\b(@|System)\b/g,

	boolean: /\b(true|false)\b/g,

	date: /\b\d{4}-\d{2}-\d{2}\b/g,
	time: /\b\d{2}:\d{2}:\d{2}\b/g,
	datetime: /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\b/g,

	number: /[+-]?(?:(?:\d+\.\d+)|(?:\d+))/g,

	character: /\B`[^\s\`\'",.:;#\/\\()<>\[\]{}]\b/g,

	regex: {
		pattern: /(^|[^/])\/(?!\/)(\[.+?]|\\.|[^/\r\n])+\/(?=\s*($|[\r\n,.;})]))/g,
		lookbehind: true
	},

	symbol: /:[^\d\s\`\'",.:;#\/\\()<>\[\]{}][^\s\`\'",.:;#\/\\()<>\[\]{}]*/g,
	string: /("|')(\\?.)*?\1/g,

	punctuation: /(?:\.{2,3})|[\`,.:;=\/\\()<>\[\]{}]/,

	reference: /[^\d\s\`\'",.:;#\/\\()<>\[\]{}][^\s\`\'",.:;#\/\\()<>\[\]{}]*/g
};

/**
 * Original by Samuel Flores
 *
 * Adds the following new token classes:
 * 		constant, builtin, variable, symbol, regex
 */
Prism.languages.ruby = Prism.languages.extend("clike", {
	comment: /#[^\r\n]*(\r?\n|$)/g,
	keyword: /\b(alias|and|BEGIN|begin|break|case|class|def|define_method|defined|do|each|else|elsif|END|end|ensure|false|for|if|in|module|new|next|nil|not|or|raise|redo|require|rescue|retry|return|self|super|then|throw|true|undef|unless|until|when|while|yield)\b/g,
	builtin: /\b(Array|Bignum|Binding|Class|Continuation|Dir|Exception|FalseClass|File|Stat|File|Fixnum|Fload|Hash|Integer|IO|MatchData|Method|Module|NilClass|Numeric|Object|Proc|Range|Regexp|String|Struct|TMS|Symbol|ThreadGroup|Thread|Time|TrueClass)\b/,
	constant: /\b[A-Z][a-zA-Z_0-9]*[?!]?\b/g
});

Prism.languages.insertBefore("ruby", "keyword", {
	regex: {
		pattern: /(^|[^/])\/(?!\/)(\[.+?]|\\.|[^/\r\n])+\/[gim]{0,3}(?=\s*($|[\r\n,.;})]))/g,
		lookbehind: true
	},
	variable: /[@$]+\b[a-zA-Z_][a-zA-Z_0-9]*[?!]?\b/g,
	symbol: /:\b[a-zA-Z_][a-zA-Z_0-9]*[?!]?\b/g
});

Prism.languages.scala = Prism.languages.extend("java", {
	keyword: /(<-|=>)|\b(abstract|case|catch|class|def|do|else|extends|final|finally|for|forSome|if|implicit|import|lazy|match|new|null|object|override|package|private|protected|return|sealed|self|super|this|throw|trait|try|type|val|var|while|with|yield)\b/g,
	builtin: /\b(String|Int|Long|Short|Byte|Boolean|Double|Float|Char|Any|AnyRef|AnyVal|Unit|Nothing)\b/g,
	number: /\b0x[\da-f]*\.?[\da-f\-]+\b|\b\d*\.?\d+[e]?[\d]*[dfl]?\b/gi,
	symbol: /'([^\d\s]\w*)/g,
	string: /(""")[\W\w]*?\1|("|\/)[\W\w]*?\2|('.')/g
});
delete Prism.languages.scala[("class-name", "function")];

Prism.languages.scheme = { boolean: /#(t|f){1}/, comment: /;.*/, keyword: { pattern: /([(])(define(-syntax|-library|-values)?|(case-)?lambda|let(-values|(rec)?(\*)?)?|else|if|cond|begin|delay|delay-force|parameterize|guard|set!|(quasi-)?quote|syntax-rules)/, lookbehind: true }, builtin: { pattern: /([(])(cons|car|cdr|null\?|pair\?|boolean\?|eof-object\?|char\?|procedure\?|number\?|port\?|string\?|vector\?|symbol\?|bytevector\?|list|call-with-current-continuation|call\/cc|append|abs|apply|eval)\b/, lookbehind: true }, string: /(["])(?:(?=(\\?))\2.)*?\1|'[^('|\s)]+/, number: /(\s|\))[-+]?[0-9]*\.?[0-9]+((\s*)[-+]{1}(\s*)[0-9]*\.?[0-9]+i)?/, operator: /(\*|\+|\-|\%|\/|<=|=>|>=|<|=|>)/, "function": { pattern: /([(])[^(\s|\))]*\s/, lookbehind: true }, punctuation: /[()]/ };

Prism.languages.scheme = {
	boolean: /#(t|f){1}/,
	comment: /;.*/,
	keyword: {
		pattern: /([(])(define(-syntax|-library|-values)?|(case-)?lambda|let(-values|(rec)?(\*)?)?|else|if|cond|begin|delay|delay-force|parameterize|guard|set!|(quasi-)?quote|syntax-rules)/,
		lookbehind: true
	},
	builtin: {
		pattern: /([(])(cons|car|cdr|null\?|pair\?|boolean\?|eof-object\?|char\?|procedure\?|number\?|port\?|string\?|vector\?|symbol\?|bytevector\?|list|call-with-current-continuation|call\/cc|append|abs|apply|eval)\b/,
		lookbehind: true
	},
	string: /(["])(?:(?=(\\?))\2.)*?\1|'[^('|\s)]+/, //thanks http://stackoverflow.com/questions/171480/regex-grabbing-values-between-quotation-marks
	number: /(\s|\))[-+]?[0-9]*\.?[0-9]+((\s*)[-+]{1}(\s*)[0-9]*\.?[0-9]+i)?/,
	operator: /(\*|\+|\-|\%|\/|<=|=>|>=|<|=|>)/,
	"function": {
		pattern: /([(])[^(\s|\))]*\s/,
		lookbehind: true
	},
	punctuation: /[()]/
};

Prism.languages.scss = Prism.languages.extend("css", {
	comment: {
		pattern: /(^|[^\\])(\/\*[\w\W]*?\*\/|\/\/.*?(\r?\n|$))/g,
		lookbehind: true
	},
	// aturle is just the @***, not the entire rule (to highlight var & stuffs)
	// + add ability to highlight number & unit for media queries
	atrule: /@[\w-]+(?=\s+(\(|\{|;))/gi,
	// url, compassified
	url: /([-a-z]+-)*url(?=\()/gi,
	// CSS selector regex is not appropriate for Sass
	// since there can be lot more things (var, @ directive, nesting..)
	// a selector must start at the end of a property or after a brace (end of other rules or nesting)
	// it can contain some caracters that aren't used for defining rules or end of selector, & (parent selector), or interpolated variable
	// the end of a selector is found when there is no rules in it ( {} or {\s}) or if there is a property (because an interpolated var
	// can "pass" as a selector- e.g: proper#{$erty})
	// this one was ard to do, so please be careful if you edit this one :)
	selector: /([^@;\{\}\(\)]?([^@;\{\}\(\)]|&|\#\{\$[-_\w]+\})+)(?=\s*\{(\}|\s|[^\}]+(:|\{)[^\}]+))/gm
});

Prism.languages.insertBefore("scss", "atrule", {
	keyword: /@(if|else if|else|for|each|while|import|extend|debug|warn|mixin|include|function|return|content)|(?=@for\s+\$[-_\w]+\s)+from/i
});

Prism.languages.insertBefore("scss", "property", {
	// var and interpolated vars
	variable: /((\$[-_\w]+)|(#\{\$[-_\w]+\}))/i
});

Prism.languages.insertBefore("scss", "ignore", {
	placeholder: /%[-_\w]+/i,
	statement: /\B!(default|optional)\b/gi,
	boolean: /\b(true|false)\b/g,
	"null": /\b(null)\b/g,
	operator: /\s+([-+]{1,2}|={1,2}|!=|\|?\||\?|\*|\/|\%)\s+/g
});

Prism.languages.sql = {
	comment: {
		pattern: /(^|[^\\])(\/\*[\w\W]*?\*\/|((--)|(\/\/)|#).*?(\r?\n|$))/g,
		lookbehind: true
	},
	string: {
		pattern: /(^|[^@])("|')(\\?[\s\S])*?\2/g,
		lookbehind: true
	},
	variable: /@[\w.$]+|@("|'|`)(\\?[\s\S])+?\1/g,
	"function": /\b(?:COUNT|SUM|AVG|MIN|MAX|FIRST|LAST|UCASE|LCASE|MID|LEN|ROUND|NOW|FORMAT)(?=\s*\()/ig, // Should we highlight user defined functions too?
	keyword: /\b(?:ACTION|ADD|AFTER|ALGORITHM|ALTER|ANALYZE|APPLY|AS|ASC|AUTHORIZATION|BACKUP|BDB|BEGIN|BERKELEYDB|BIGINT|BINARY|BIT|BLOB|BOOL|BOOLEAN|BREAK|BROWSE|BTREE|BULK|BY|CALL|CASCADE|CASCADED|CASE|CHAIN|CHAR VARYING|CHARACTER VARYING|CHECK|CHECKPOINT|CLOSE|CLUSTERED|COALESCE|COLUMN|COLUMNS|COMMENT|COMMIT|COMMITTED|COMPUTE|CONNECT|CONSISTENT|CONSTRAINT|CONTAINS|CONTAINSTABLE|CONTINUE|CONVERT|CREATE|CROSS|CURRENT|CURRENT_DATE|CURRENT_TIME|CURRENT_TIMESTAMP|CURRENT_USER|CURSOR|DATA|DATABASE|DATABASES|DATETIME|DBCC|DEALLOCATE|DEC|DECIMAL|DECLARE|DEFAULT|DEFINER|DELAYED|DELETE|DENY|DESC|DESCRIBE|DETERMINISTIC|DISABLE|DISCARD|DISK|DISTINCT|DISTINCTROW|DISTRIBUTED|DO|DOUBLE|DOUBLE PRECISION|DROP|DUMMY|DUMP|DUMPFILE|DUPLICATE KEY|ELSE|ENABLE|ENCLOSED BY|END|ENGINE|ENUM|ERRLVL|ERRORS|ESCAPE|ESCAPED BY|EXCEPT|EXEC|EXECUTE|EXIT|EXPLAIN|EXTENDED|FETCH|FIELDS|FILE|FILLFACTOR|FIRST|FIXED|FLOAT|FOLLOWING|FOR|FOR EACH ROW|FORCE|FOREIGN|FREETEXT|FREETEXTTABLE|FROM|FULL|FUNCTION|GEOMETRY|GEOMETRYCOLLECTION|GLOBAL|GOTO|GRANT|GROUP|HANDLER|HASH|HAVING|HOLDLOCK|IDENTITY|IDENTITY_INSERT|IDENTITYCOL|IF|IGNORE|IMPORT|INDEX|INFILE|INNER|INNODB|INOUT|INSERT|INT|INTEGER|INTERSECT|INTO|INVOKER|ISOLATION LEVEL|JOIN|KEY|KEYS|KILL|LANGUAGE SQL|LAST|LEFT|LIMIT|LINENO|LINES|LINESTRING|LOAD|LOCAL|LOCK|LONGBLOB|LONGTEXT|MATCH|MATCHED|MEDIUMBLOB|MEDIUMINT|MEDIUMTEXT|MERGE|MIDDLEINT|MODIFIES SQL DATA|MODIFY|MULTILINESTRING|MULTIPOINT|MULTIPOLYGON|NATIONAL|NATIONAL CHAR VARYING|NATIONAL CHARACTER|NATIONAL CHARACTER VARYING|NATIONAL VARCHAR|NATURAL|NCHAR|NCHAR VARCHAR|NEXT|NO|NO SQL|NOCHECK|NOCYCLE|NONCLUSTERED|NULLIF|NUMERIC|OF|OFF|OFFSETS|ON|OPEN|OPENDATASOURCE|OPENQUERY|OPENROWSET|OPTIMIZE|OPTION|OPTIONALLY|ORDER|OUT|OUTER|OUTFILE|OVER|PARTIAL|PARTITION|PERCENT|PIVOT|PLAN|POINT|POLYGON|PRECEDING|PRECISION|PREV|PRIMARY|PRINT|PRIVILEGES|PROC|PROCEDURE|PUBLIC|PURGE|QUICK|RAISERROR|READ|READS SQL DATA|READTEXT|REAL|RECONFIGURE|REFERENCES|RELEASE|RENAME|REPEATABLE|REPLICATION|REQUIRE|RESTORE|RESTRICT|RETURN|RETURNS|REVOKE|RIGHT|ROLLBACK|ROUTINE|ROWCOUNT|ROWGUIDCOL|ROWS?|RTREE|RULE|SAVE|SAVEPOINT|SCHEMA|SELECT|SERIAL|SERIALIZABLE|SESSION|SESSION_USER|SET|SETUSER|SHARE MODE|SHOW|SHUTDOWN|SIMPLE|SMALLINT|SNAPSHOT|SOME|SONAME|START|STARTING BY|STATISTICS|STATUS|STRIPED|SYSTEM_USER|TABLE|TABLES|TABLESPACE|TEMP(?:ORARY)?|TEMPTABLE|TERMINATED BY|TEXT|TEXTSIZE|THEN|TIMESTAMP|TINYBLOB|TINYINT|TINYTEXT|TO|TOP|TRAN|TRANSACTION|TRANSACTIONS|TRIGGER|TRUNCATE|TSEQUAL|TYPE|TYPES|UNBOUNDED|UNCOMMITTED|UNDEFINED|UNION|UNPIVOT|UPDATE|UPDATETEXT|USAGE|USE|USER|USING|VALUE|VALUES|VARBINARY|VARCHAR|VARCHARACTER|VARYING|VIEW|WAITFOR|WARNINGS|WHEN|WHERE|WHILE|WITH|WITH ROLLUP|WITHIN|WORK|WRITE|WRITETEXT)\b/gi,
	boolean: /\b(?:TRUE|FALSE|NULL)\b/gi,
	number: /\b-?(0x)?\d*\.?[\da-f]+\b/g,
	operator: /\b(?:ALL|AND|ANY|BETWEEN|EXISTS|IN|LIKE|NOT|OR|IS|UNIQUE|CHARACTER SET|COLLATE|DIV|OFFSET|REGEXP|RLIKE|SOUNDS LIKE|XOR)\b|[-+]{1}|!|[=<>]{1,2}|(&){1,2}|\|?\||\?|\*|\//gi,
	punctuation: /[;[\]()`,.]/g
};
// issues: nested multiline comments, highlighting inside string interpolations
Prism.languages.swift = Prism.languages.extend("clike", {
	keyword: /\b(as|associativity|break|case|class|continue|convenience|default|deinit|didSet|do|dynamicType|else|enum|extension|fallthrough|final|for|func|get|if|import|in|infix|init|inout|internal|is|lazy|left|let|mutating|new|none|nonmutating|operator|optional|override|postfix|precedence|prefix|private|protocol|public|required|return|right|safe|self|Self|set|static|struct|subscript|super|switch|Type|typealias|unowned|unowned|unsafe|var|weak|where|while|willSet|__COLUMN__|__FILE__|__FUNCTION__|__LINE__)\b/g,
	number: /\b([\d_]+(\.[\de_]+)?|0x[a-f0-9_]+(\.[a-f0-9p_]+)?|0b[01_]+|0o[0-7_]+)\b/gi,
	constant: /\b(nil|[A-Z_]{2,}|k[A-Z][A-Za-z_]+)\b/g,
	atrule: /\@\b(IBOutlet|IBDesignable|IBAction|IBInspectable|class_protocol|exported|noreturn|NSCopying|NSManaged|objc|UIApplicationMain|auto_closure)\b/g,
	builtin: /\b([A-Z]\S+|abs|advance|alignof|alignofValue|assert|contains|count|countElements|debugPrint|debugPrintln|distance|dropFirst|dropLast|dump|enumerate|equal|filter|find|first|getVaList|indices|isEmpty|join|last|lazy|lexicographicalCompare|map|max|maxElement|min|minElement|numericCast|overlaps|partition|prefix|print|println|reduce|reflect|reverse|sizeof|sizeofValue|sort|sorted|split|startsWith|stride|strideof|strideofValue|suffix|swap|toDebugString|toString|transcode|underestimateCount|unsafeBitCast|withExtendedLifetime|withUnsafeMutablePointer|withUnsafeMutablePointers|withUnsafePointer|withUnsafePointers|withVaList)\b/g
});

Prism.languages.twig = {
	comment: /\{\#[\s\S]*?\#\}/g,
	tag: {
		pattern: /(\{\{[\s\S]*?\}\}|\{\%[\s\S]*?\%\})/g,
		inside: {
			ld: {
				pattern: /^(\{\{\-?|\{\%\-?\s*\w+)/,
				inside: {
					punctuation: /^(\{\{|\{\%)\-?/,
					keyword: /\w+/
				}
			},
			rd: {
				pattern: /\-?(\%\}|\}\})$/,
				inside: {
					punctuation: /.*/
				}
			},
			string: {
				pattern: /("|')(\\?.)*?\1/g,
				inside: {
					punctuation: /^('|")|('|")$/g
				}
			},
			keyword: /\b(if)\b/g,
			boolean: /\b(true|false|null)\b/g,
			number: /\b-?(0x[\dA-Fa-f]+|\d*\.?\d+([Ee]-?\d+)?)\b/g,
			operator: /==|=|\!=|<|>|>=|<=|\+|\-|~|\*|\/|\/\/|%|\*\*|\|/g,
			"space-operator": {
				pattern: /(\s)(\b(not|b\-and|b\-xor|b\-or|and|or|in|matches|starts with|ends with|is)\b|\?|:|\?\:)(?=\s)/g,
				lookbehind: true,
				inside: {
					operator: /.*/
				}
			},
			property: /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g,
			punctuation: /\(|\)|\[\]|\[|\]|\{|\}|\:|\.|,/g
		}
	},

	// The rest can be parsed as HTML
	other: {
		pattern: /[\s\S]*/,
		inside: Prism.languages.markup
	}
};

},{}],2:[function(require,module,exports){
"use strict";

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

Object.defineProperty(exports, "__esModule", {
    value: true
});
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = _interopRequireWildcard(require("./utils.js"));

/**
 * Animation helper.
 */

var Animator = exports.Animator = (function (_utils$PosterClass) {
    function Animator(duration) {
        _classCallCheck(this, Animator);

        _get(Object.getPrototypeOf(Animator.prototype), "constructor", this).call(this);
        this.duration = duration;
        this._start = Date.now();
    }

    _inherits(Animator, _utils$PosterClass);

    _createClass(Animator, {
        time: {

            /**
             * Get the time in the animation
             * @return {float} between 0 and 1
             */

            value: function time() {
                var elapsed = Date.now() - this._start;
                return elapsed % this.duration / this.duration;
            }
        },
        reset: {

            /**
             * Reset the animation progress to 0.
             */

            value: function reset() {
                this._start = Date.now();
            }
        }
    });

    return Animator;
})(utils.PosterClass);

},{"./utils.js":36}],3:[function(require,module,exports){
"use strict";

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

Object.defineProperty(exports, "__esModule", {
    value: true
});
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = _interopRequireWildcard(require("./utils.js"));

var config = _interopRequireWildcard(require("./config.js"));

config = config.config;

/**
 * HTML canvas with drawing convinience functions.
 */

var Canvas = exports.Canvas = (function (_utils$PosterClass) {
    function Canvas() {
        _classCallCheck(this, Canvas);

        this._rendered_region = [null, null, null, null]; // x1,y1,x2,y2

        _get(Object.getPrototypeOf(Canvas.prototype), "constructor", this).call(this);
        this._layout();
        this._last_set_options = {};

        this._text_size_cache = {};
        this._text_size_array = [];
        this._text_size_cache_size = 1000;

        // Set default size.
        this.width = 400;
        this.height = 300;
    }

    _inherits(Canvas, _utils$PosterClass);

    _createClass(Canvas, {
        height: {

            /**
             * Height of the canvas
             * @return {float}
             */

            get: function () {
                return this._canvas.height / 2;
            },
            set: function (value) {
                this._canvas.setAttribute("height", value * 2);

                // Stretch the image for retina support.
                this.scale(2, 2);
                this._touch();
            }
        },
        width: {

            /**
             * Width of the canvas
             * @return {float}
             */

            get: function () {
                return this._canvas.width / 2;
            },
            set: function (value) {
                this._canvas.setAttribute("width", value * 2);

                // Stretch the image for retina support.
                this.scale(2, 2);
                this._touch();
            }
        },
        rendered_region: {

            /**
             * Region of the canvas that has been rendered to
             * @return {dictionary} dictionary describing a rectangle {x,y,width,height}
             *                      null if canvas has changed since last check
             */

            get: function () {
                return this.get_rendered_region(true);
            }
        },
        _layout: {

            /**
             * Layout the elements for the canvas.
             * Creates `this.el`
             */

            value: function _layout() {
                this._canvas = document.createElement("canvas");
                this._canvas.setAttribute("class", "poster hidden-canvas");
                this.context = this._canvas.getContext("2d");

                // Stretch the image for retina support.
                this.scale(2, 2);
            }
        },
        get_rendered_region: {

            /**
             * Gets the region of the canvas that has been rendered to.
             * @param  {boolean} (optional) reset - resets the region.
             */

            value: function get_rendered_region(reset) {
                var rendered_region = this._rendered_region;
                if (rendered_region[0] === null) {
                    return null;
                }if (reset) this._rendered_region = [null, null, null, null];
                return {
                    x: this._tx(rendered_region[0], true),
                    y: this._ty(rendered_region[1], true),
                    width: this._tx(rendered_region[2]) - this._tx(rendered_region[0]),
                    height: this._ty(rendered_region[3]) - this._ty(rendered_region[1]) };
            }
        },
        erase_options_cache: {

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

            value: function erase_options_cache() {
                this._last_set_options = {};
            }
        },
        draw_rectangle: {

            /**
             * Draws a rectangle
             * @param  {float} x
             * @param  {float} y
             * @param  {float} width
             * @param  {float} height
             * @param  {dictionary} options, see _apply_options() for details
             */

            value: function draw_rectangle(x, y, width, height, options) {
                var tx = this._tx(x);
                var ty = this._ty(y);
                this.context.beginPath();
                this.context.rect(tx, ty, width, height);
                this._do_draw(options);
                this._touch(tx, ty, tx + width, ty + height);
            }
        },
        draw_circle: {

            /**
             * Draws a circle
             * @param  {float} x
             * @param  {float} y
             * @param  {float} r
             * @param  {dictionary} options, see _apply_options() for details
             */

            value: function draw_circle(x, y, r, options) {
                var tx = this._tx(x);
                var ty = this._ty(y);
                this.context.beginPath();
                this.context.arc(tx, ty, r, 0, 2 * Math.PI);
                this._do_draw(options);
                this._touch(tx - r, ty - r, tx + r, ty + r);
            }
        },
        draw_image: {

            /**
             * Draws an image
             * @param  {img element} img
             * @param  {float} x
             * @param  {float} y
             * @param  {float} (optional) width
             * @param  {float} (optional) height
             * @param  {object} (optional) clip_bounds - Where to clip from the source.
             */

            value: function draw_image(img, x, y, width, height, clip_bounds) {
                var tx = this._tx(x);
                var ty = this._ty(y);
                width = width || img.width;
                height = height || img.height;
                img = img._canvas ? img._canvas : img;
                if (clip_bounds) {
                    // Horizontally offset the image operation by one pixel along each
                    // border to eliminate the strange white l&r border artifacts.
                    var hoffset = 1;
                    this.context.drawImage(img, (this._tx(clip_bounds.x) - hoffset) * 2, // Retina support
                    this._ty(clip_bounds.y) * 2, // Retina support
                    (clip_bounds.width + 2 * hoffset) * 2, // Retina support
                    clip_bounds.height * 2, // Retina support
                    tx - hoffset, ty, width + 2 * hoffset, height);
                } else {
                    this.context.drawImage(img, tx, ty, width, height);
                }
                this._touch(tx, ty, tx + width, ty + height);
            }
        },
        draw_line: {

            /**
             * Draws a line
             * @param  {float} x1
             * @param  {float} y1
             * @param  {float} x2
             * @param  {float} y2
             * @param  {dictionary} options, see _apply_options() for details
             */

            value: function draw_line(x1, y1, x2, y2, options) {
                var tx1 = this._tx(x1);
                var ty1 = this._ty(y1);
                var tx2 = this._tx(x2);
                var ty2 = this._ty(y2);
                this.context.beginPath();
                this.context.moveTo(tx1, ty1);
                this.context.lineTo(tx2, ty2);
                this._do_draw(options);
                this._touch(tx1, ty1, tx2, ty2);
            }
        },
        draw_polyline: {

            /**
             * Draws a poly line
             * @param  {array} points - array of points.  Each point is
             *                          an array itself, of the form [x, y] 
             *                          where x and y are floating point
             *                          values.
             * @param  {dictionary} options, see _apply_options() for details
             */

            value: function draw_polyline(points, options) {
                if (points.length < 2) {
                    throw new Error("Poly line must have atleast two points.");
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
            }
        },
        draw_text: {

            /**
             * Draws a text string
             * @param  {float} x
             * @param  {float} y
             * @param  {string} text string or callback that resolves to a string.
             * @param  {dictionary} options, see _apply_options() for details
             */

            value: function draw_text(x, y, text, options) {
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
            }
        },
        get_raw_image: {

            /**
             * Get's a chunk of the canvas as a raw image.
             * @param  {float} (optional) x
             * @param  {float} (optional) y
             * @param  {float} (optional) width
             * @param  {float} (optional) height
             * @return {image} canvas image data
             */

            value: function get_raw_image(x, y, width, height) {
                console.warn("get_raw_image image is slow, use canvas references instead with draw_image");
                if (x === undefined) {
                    x = 0;
                } else {
                    x = this._tx(x);
                }
                if (y === undefined) {
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
            }
        },
        put_raw_image: {

            /**
             * Put's a raw image on the canvas somewhere.
             * @param  {float} x
             * @param  {float} y
             * @return {image} canvas image data
             */

            value: function put_raw_image(img, x, y) {
                console.warn("put_raw_image image is slow, use draw_image instead");
                var tx = this._tx(x);
                var ty = this._ty(y);
                // Multiply by two for pixel doubling.
                ret = this.context.putImageData(img, tx * 2, ty * 2);
                this._touch(tx, ty, this.width, this.height); // Don't know size of image
                return ret;
            }
        },
        measure_text: {

            /**
             * Measures the width of a text string.
             * @param  {string} text
             * @param  {dictionary} options, see _apply_options() for details
             * @return {float} width
             */

            value: function measure_text(text, options) {
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
            }
        },
        gradient: {

            /**
             * Create a linear gradient
             * @param  {float} x1
             * @param  {float} y1
             * @param  {float} x2
             * @param  {float} y2
             * @param  {array} color_stops - array of [float, color] pairs
             */

            value: (function (_gradient) {
                var _gradientWrapper = function gradient(_x, _x2, _x3, _x4, _x5) {
                    return _gradient.apply(this, arguments);
                };

                _gradientWrapper.toString = function () {
                    return _gradient.toString();
                };

                return _gradientWrapper;
            })(function (x1, y1, x2, y2, color_stops) {
                var gradient = this.context.createLinearGradient(x1, y1, x2, y2);
                for (var i = 0; i < color_stops.length; i++) {
                    gradient.addColorStop(color_stops[i][0], color_stops[i][1]);
                }
                return gradient;
            })
        },
        clear: {

            /**
             * Clear's the canvas.
             * @param  {object} (optional) region, {x,y,width,height}
             */

            value: function clear(region) {
                if (region) {
                    var tx = this._tx(region.x);
                    var ty = this._ty(region.y);
                    this.context.clearRect(tx, ty, region.width, region.height);
                    this._touch(tx, ty, tx + region.width, ty + region.height);
                } else {
                    this.context.clearRect(0, 0, this.width, this.height);
                    this._touch();
                }
            }
        },
        scale: {

            /**
             * Scale the current drawing.
             * @param  {float} x
             * @param  {float} y  
             */

            value: function scale(x, y) {
                this.context.scale(x, y);
                this._touch();
            }
        },
        _do_draw: {

            /**
             * Finishes the drawing operation using the set of provided options.
             * @param  {dictionary} (optional) dictionary that 
             *  resolves to a dictionary.
             */

            value: function _do_draw(options) {
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
            }
        },
        _apply_options: {

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

            value: function _apply_options(options) {
                options = options || {};
                options = utils.resolve_callable(options);

                // Special options.
                var set_options = {};
                set_options.globalAlpha = options.alpha === undefined ? 1 : options.alpha;
                set_options.globalCompositeOperation = options.composite_operation || "source-over";

                // Line style.
                set_options.lineCap = options.line_cap || "butt";
                set_options.lineJoin = options.line_join || "bevel";
                set_options.lineWidth = options.line_width === undefined ? 1 : options.line_width;
                set_options.miterLimit = options.line_miter_limit === undefined ? 10 : options.line_miter_limit;
                this.context.strokeStyle = options.line_color || options.color || "black"; // TODO: Support gradient
                options.stroke = options.line_color !== undefined || options.line_width !== undefined;

                // Fill style.
                this.context.fillStyle = options.fill_color || options.color || "red"; // TODO: Support gradient
                options.fill = options.fill_color !== undefined;

                // Font style.
                var pixels = function (x) {
                    if (x !== undefined && x !== null) {
                        if (Number.isFinite(x)) {
                            return String(x) + "px";
                        } else {
                            return x;
                        }
                    } else {
                        return null;
                    }
                };
                var font_style = options.font_style || "";
                var font_variant = options.font_variant || "";
                var font_weight = options.font_weight || "";
                this._font_height = options.font_size || 12;
                var font_size = pixels(this._font_height);
                var font_family = options.font_family || "Arial";
                var font = font_style + " " + font_variant + " " + font_weight + " " + font_size + " " + font_family;
                set_options.font = font;

                // Text style.
                set_options.textAlign = options.text_align || "left";
                set_options.textBaseline = options.text_baseline || "top";

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
            }
        },
        _touch: {

            /**
             * Update the timestamp that the canvas was modified and
             * the region that has contents rendered to it.
             */

            value: function _touch(x1, y1, x2, y2) {
                this._modified = Date.now();

                var all_undefined = x1 === undefined && y1 === undefined && x2 === undefined && y2 === undefined;
                var one_nan = isNaN(x1 * x2 * y1 * y2);
                if (one_nan || all_undefined) {
                    this._rendered_region = [0, 0, this.width, this.height];
                    return;
                }

                // Set the render region.
                var comparitor = function (old_value, new_value, comparison) {
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
            }
        },
        _tx: {

            /**
             * Transform an x value before rendering.
             * @param  {float} x
             * @param  {boolean} inverse - perform inverse transformation
             * @return {float}
             */

            value: function _tx(x, inverse) {
                return x;
            }
        },
        _ty: {

            /**
             * Transform a y value before rendering.
             * @param  {float} y
             * @param  {boolean} inverse - perform inverse transformation
             * @return {float}
             */

            value: function _ty(y, inverse) {
                return y;
            }
        },
        _process_tabs: {

            /**
             * Convert tab characters to the config defined number of space 
             * characters for rendering.
             * @param  {string} s - input string
             * @return {string} output string
             */

            value: function _process_tabs(s) {
                var space_tab = "";
                for (var i = 0; i < (config.tab_width || 1); i++) {
                    space_tab += " ";
                }
                return s.replace(/\t/g, space_tab);
            }
        }
    });

    return Canvas;
})(utils.PosterClass);

},{"./config.js":5,"./utils.js":36}],4:[function(require,module,exports){
"use strict";

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

Object.defineProperty(exports, "__esModule", {
    value: true
});
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = _interopRequireWildcard(require("./utils.js"));

/**
 * Eventful clipboard support
 *
 * WARNING:  This class is a hudge kludge that works around the prehistoric
 * clipboard support (lack thereof) in modern webrowsers.  It creates a hidden
 * textbox which is focused.  The programmer must call `set_clippable` to change
 * what will be copied when the user hits keys corresponding to a copy 
 * operation.  Events `copy`, `cut`, and `paste` are raised by this class.
 */

var Clipboard = exports.Clipboard = (function (_utils$PosterClass) {
    function Clipboard(el) {
        _classCallCheck(this, Clipboard);

        _get(Object.getPrototypeOf(Clipboard.prototype), "constructor", this).call(this);
        this._el = el;

        // Create a textbox that's hidden.
        this.hidden_input = document.createElement("textarea");
        this.hidden_input.setAttribute("class", "poster hidden-clipboard");
        el.appendChild(this.hidden_input);

        this._bind_events();
    }

    _inherits(Clipboard, _utils$PosterClass);

    _createClass(Clipboard, {
        set_clippable: {

            /**
             * Set what will be copied when the user copies.
             * @param {string} text
             */

            value: function set_clippable(text) {
                this._clippable = text;
                this.hidden_input.value = this._clippable;
                this._focus();
            }
        },
        _focus: {

            /**
             * Focus the hidden text area.
             * @return {null}
             */

            value: function _focus() {
                this.hidden_input.focus();
                this.hidden_input.select();
            }
        },
        _handle_paste: {

            /**
             * Handle when the user pastes into the textbox.
             * @return {null}
             */

            value: function _handle_paste(e) {
                var pasted = e.clipboardData.getData(e.clipboardData.types[0]);
                utils.cancel_bubble(e);
                this.trigger("paste", pasted);
            }
        },
        _bind_events: {

            /**
             * Bind events of the hidden textbox.
             * @return {null}
             */

            value: function _bind_events() {
                var _this = this;

                // Listen to el's focus event.  If el is focused, focus the hidden input
                // instead.
                utils.hook(this._el, "onfocus", utils.proxy(this._focus, this));

                utils.hook(this.hidden_input, "onpaste", utils.proxy(this._handle_paste, this));
                utils.hook(this.hidden_input, "oncut", function () {
                    // Trigger the event in a timeout so it fires after the system event.
                    setTimeout(function () {
                        _this.trigger("cut", _this._clippable);
                    }, 0);
                });
                utils.hook(this.hidden_input, "oncopy", function () {
                    _this.trigger("copy", _this._clippable);
                });
                utils.hook(this.hidden_input, "onkeypress", function () {
                    setTimeout(function () {
                        _this.hidden_input.value = _this._clippable;
                        _this._focus();
                    }, 0);
                });
                utils.hook(this.hidden_input, "onkeyup", function () {
                    setTimeout(function () {
                        _this.hidden_input.value = _this._clippable;
                        _this._focus();
                    }, 0);
                });
            }
        }
    });

    return Clipboard;
})(utils.PosterClass);

},{"./utils.js":36}],5:[function(require,module,exports){
"use strict";

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

Object.defineProperty(exports, "__esModule", {
    value: true
});
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = _interopRequireWildcard(require("./utils.js"));

var config = new utils.PosterClass(["highlight_draw", // boolean - Whether or not to highlight re-renders
"highlight_blit", // boolean - Whether or not to highlight blit regions
"newline_width", // integer - Width of newline characters
"tab_width", // integer - Tab character width measured in space characters
"use_spaces", // boolean - Use spaces for indents instead of tabs
"history_group_delay"]);

exports.config = config;
// Set defaults
config.tab_width = 4;
config.use_spaces = true;
config.history_group_delay = 100;
// integer - Time (ms) to wait for another historical event
// before automatically grouping them (related to undo and redo
// actions)

},{"./utils.js":36}],6:[function(require,module,exports){
"use strict";

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

Object.defineProperty(exports, "__esModule", {
    value: true
});
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var keymap = _interopRequireWildcard(require("./events/map.js"));

var register = keymap.Map.register;

var utils = _interopRequireWildcard(require("./utils.js"));

var config = _interopRequireWildcard(require("./config.js"));

config = config.config;

/**
 * Input cursor.
 */

var Cursor = exports.Cursor = (function (_utils$PosterClass) {
    function Cursor(model, push_history) {
        _classCallCheck(this, Cursor);

        _get(Object.getPrototypeOf(Cursor.prototype), "constructor", this).call(this);
        this._model = model;
        this._push_history = push_history;

        this.primary_row = 0;
        this.primary_char = 0;
        this.secondary_row = 0;
        this.secondary_char = 0;

        this._register_api();
    }

    _inherits(Cursor, _utils$PosterClass);

    _createClass(Cursor, {
        start_row: {
            get: function () {
                return Math.min(this.primary_row, this.secondary_row);
            }
        },
        end_row: {
            get: function () {
                return Math.max(this.primary_row, this.secondary_row);
            }
        },
        start_char: {
            get: function () {
                if (this.primary_row < this.secondary_row || this.primary_row == this.secondary_row && this.primary_char <= this.secondary_char) {
                    return this.primary_char;
                } else {
                    return this.secondary_char;
                }
            }
        },
        end_char: {
            get: function () {
                if (this.primary_row < this.secondary_row || this.primary_row == this.secondary_row && this.primary_char <= this.secondary_char) {
                    return this.secondary_char;
                } else {
                    return this.primary_char;
                }
            }
        },
        unregister: {

            /**
             * Unregister the actions and event listeners of this cursor.
             */

            value: function unregister() {
                keymap.unregister_by_tag(this);
            }
        },
        get_state: {

            /**
             * Gets the state of the cursor.
             * @return {object} state
             */

            value: function get_state() {
                return {
                    primary_row: this.primary_row,
                    primary_char: this.primary_char,
                    secondary_row: this.secondary_row,
                    secondary_char: this.secondary_char,
                    _memory_char: this._memory_char
                };
            }
        },
        set_state: {

            /**
             * Sets the state of the cursor.
             * @param {object} state
             * @param {boolean} [historical] - Defaults to true.  Whether this should be recorded in history.
             */

            value: function set_state(state, historical) {
                if (state) {
                    var old_state = {};
                    for (var key in state) {
                        if (state.hasOwnProperty(key)) {
                            old_state[key] = this[key];
                            this[key] = state[key];
                        }
                    }

                    if (historical === undefined || historical === true) {
                        this._push_history("set_state", [state], "set_state", [old_state]);
                    }
                    this.trigger("change");
                }
            }
        },
        move_primary: {

            /**
             * Moves the primary cursor a given offset.
             * @param  {integer} x
             * @param  {integer} y
             * @param  {boolean} (optional) hop=false - hop to the other side of the
             *                   selected region if the primary is on the opposite of the
             *                   direction of motion.
             * @return {null}
             */

            value: function move_primary(x, y, hop) {
                if (hop) {
                    if (this.primary_row != this.secondary_row || this.primary_char != this.secondary_char) {
                        var start_row = this.start_row;
                        var start_char = this.start_char;
                        var end_row = this.end_row;
                        var end_char = this.end_char;
                        if (x < 0 || y < 0) {
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
                    this.primary_row = Math.min(Math.max(this.primary_row, 0), this._model._rows.length - 1);
                    if (this._memory_char !== undefined) {
                        this.primary_char = this._memory_char;
                    }
                    if (this.primary_char > this._model._rows[this.primary_row].length) {
                        this.primary_char = this._model._rows[this.primary_row].length;
                    }
                }

                this.trigger("change");
            }
        },
        word_primary: {

            /**
             * Walk the primary cursor in a direction until a not-text character is found.
             * @param  {integer} direction
             * @return {null}
             */

            value: function word_primary(direction) {
                // Make sure direction is 1 or -1.
                direction = direction < 0 ? -1 : 1;

                // If moving left and at end of row, move up a row if possible.
                if (this.primary_char === 0 && direction == -1) {
                    if (this.primary_row !== 0) {
                        this.primary_row--;
                        this.primary_char = this._model._rows[this.primary_row].length;
                        this._memory_char = this.primary_char;
                        this.trigger("change");
                    }
                    return;
                }

                // If moving right and at end of row, move down a row if possible.
                if (this.primary_char >= this._model._rows[this.primary_row].length && direction == 1) {
                    if (this.primary_row < this._model._rows.length - 1) {
                        this.primary_row++;
                        this.primary_char = 0;
                        this._memory_char = this.primary_char;
                        this.trigger("change");
                    }
                    return;
                }

                var i = this.primary_char;
                var hit_text = false;
                var row_text = this._model._rows[this.primary_row];
                if (direction == -1) {
                    while (0 < i && !(hit_text && utils.not_text(row_text[i - 1]))) {
                        hit_text = hit_text || !utils.not_text(row_text[i - 1]);
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
                this.trigger("change");
            }
        },
        select_all: {

            /**
             * Select all of the text.
             * @return {null}
             */

            value: function select_all() {
                this.primary_row = this._model._rows.length - 1;
                this.primary_char = this._model._rows[this.primary_row].length;
                this.secondary_row = 0;
                this.secondary_char = 0;
                this.trigger("change");
            }
        },
        primary_goto_end: {

            /**
             * Move the primary cursor to the line end.
             * @return {null}
             */

            value: function primary_goto_end() {
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
                this.trigger("change");
            }
        },
        primary_goto_start: {

            /**
             * Move the primary cursor to the line start.
             * @return {null}
             */

            value: function primary_goto_start() {
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
                this.trigger("change");
            }
        },
        select_word: {

            /**
             * Selects a word at the given location.
             * @param {integer} row_index
             * @param {integer} char_index
             */

            value: function select_word(row_index, char_index) {
                this.set_both(row_index, char_index);
                this.word_primary(-1);
                this._reset_secondary();
                this.word_primary(1);
            }
        },
        set_primary: {

            /**
             * Set the primary cursor position
             * @param {integer} row_index
             * @param {integer} char_index
             */

            value: function set_primary(row_index, char_index) {
                this.primary_row = row_index;
                this.primary_char = char_index;

                // Remember the character position, vertical navigation across empty lines
                // shouldn't cause the horizontal position to be lost.
                this._memory_char = this.primary_char;

                this.trigger("change");
            }
        },
        set_secondary: {

            /**
             * Set the secondary cursor position
             * @param {integer} row_index
             * @param {integer} char_index
             */

            value: function set_secondary(row_index, char_index) {
                this.secondary_row = row_index;
                this.secondary_char = char_index;
                this.trigger("change");
            }
        },
        set_both: {

            /**
             * Sets both the primary and secondary cursor positions
             * @param {integer} row_index
             * @param {integer} char_index
             */

            value: function set_both(row_index, char_index) {
                this.primary_row = row_index;
                this.primary_char = char_index;
                this.secondary_row = row_index;
                this.secondary_char = char_index;

                // Remember the character position, vertical navigation across empty lines
                // shouldn't cause the horizontal position to be lost.
                this._memory_char = this.primary_char;

                this.trigger("change");
            }
        },
        keypress: {

            /**
             * Handles when a key is pressed.
             * @param  {Event} e - original key press event.
             * @return {null}
             */

            value: function keypress(e) {
                var char_code = e.which || e.keyCode;
                var char_typed = String.fromCharCode(char_code);
                this.remove_selected();
                this._historical(function () {
                    this._model_add_text(this.primary_row, this.primary_char, char_typed);
                });
                this.move_primary(1, 0);
                this._reset_secondary();
                return true;
            }
        },
        indent: {

            /**
             * Indent
             * @param  {Event} e - original key press event.
             * @return {null}
             */

            value: (function (_indent) {
                var _indentWrapper = function indent(_x) {
                    return _indent.apply(this, arguments);
                };

                _indentWrapper.toString = function () {
                    return _indent.toString();
                };

                return _indentWrapper;
            })(function (e) {
                var indent = this._make_indents()[0];
                this._historical(function () {
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
                this.trigger("change");
                return true;
            })
        },
        unindent: {

            /**
             * Unindent
             * @param  {Event} e - original key press event.
             * @return {null}
             */

            value: function unindent(e) {
                var indents = this._make_indents();
                var removed_start = 0;
                var removed_end = 0;

                // If no text is selected, remove the indent preceding the
                // cursor if it exists.
                this._historical(function () {
                    if (this.primary_row == this.secondary_row && this.primary_char == this.secondary_char) {
                        for (var i = 0; i < indents.length; i++) {
                            var indent = indents[i];
                            if (this.primary_char >= indent.length) {
                                var before = this._model.get_text(this.primary_row, this.primary_char - indent.length, this.primary_row, this.primary_char);
                                if (before == indent) {
                                    this._model_remove_text(this.primary_row, this.primary_char - indent.length, this.primary_row, this.primary_char);
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
                var start_is_primary = this.primary_row == this.start_row && this.primary_char == this.start_char;
                if (start_is_primary) {
                    this.primary_char -= removed_start;
                    this.secondary_char -= removed_end;
                } else {
                    this.primary_char -= removed_end;
                    this.secondary_char -= removed_start;
                }
                this._memory_char = this.primary_char;
                if (removed_end || removed_start) this.trigger("change");
                return true;
            }
        },
        newline: {

            /**
             * Insert a newline
             * @return {null}
             */

            value: function newline(e) {
                this.remove_selected();

                // Get the blank space at the begining of the line.
                var line_text = this._model.get_text(this.primary_row, 0, this.primary_row, this.primary_char);
                var spaceless = line_text.trim();
                var left = line_text.length;
                if (spaceless.length > 0) {
                    left = line_text.indexOf(spaceless);
                }
                var indent = line_text.substring(0, left);

                this._historical(function () {
                    this._model_add_text(this.primary_row, this.primary_char, "\n" + indent);
                });
                this.primary_row += 1;
                this.primary_char = indent.length;
                this._memory_char = this.primary_char;
                this._reset_secondary();
                return true;
            }
        },
        insert_text: {

            /**
             * Insert text
             * @param  {string} text
             * @return {null}
             */

            value: function insert_text(text) {
                this.remove_selected();
                this._historical(function () {
                    this._model_add_text(this.primary_row, this.primary_char, text);
                });

                // Move cursor to the end.
                if (text.indexOf("\n") == -1) {
                    this.primary_char = this.start_char + text.length;
                } else {
                    var lines = text.split("\n");
                    this.primary_row += lines.length - 1;
                    this.primary_char = lines[lines.length - 1].length;
                }
                this._reset_secondary();

                this.trigger("change");
                return true;
            }
        },
        paste: {

            /**
             * Paste text
             * @param  {string} text
             * @return {null}
             */

            value: function paste(text) {
                if (this._copied_row === text) {
                    this._historical(function () {
                        this._model_add_row(this.primary_row, text);
                    });
                    this.primary_row++;
                    this.secondary_row++;
                    this.trigger("change");
                } else {
                    this.insert_text(text);
                }
            }
        },
        remove_selected: {

            /**
             * Remove the selected text
             * @return {boolean} true if text was removed.
             */

            value: function remove_selected() {
                if (this.primary_row !== this.secondary_row || this.primary_char !== this.secondary_char) {
                    var row_index = this.start_row;
                    var char_index = this.start_char;
                    this._historical(function () {
                        this._model_remove_text(this.start_row, this.start_char, this.end_row, this.end_char);
                    });
                    this.primary_row = row_index;
                    this.primary_char = char_index;
                    this._reset_secondary();
                    this.trigger("change");
                    return true;
                }
                return false;
            }
        },
        get: {

            /**
             * Gets the selected text.
             * @return {string} selected text
             */

            value: function get() {
                if (this.primary_row == this.secondary_row && this.primary_char == this.secondary_char) {
                    return this._model._rows[this.primary_row];
                } else {
                    return this._model.get_text(this.start_row, this.start_char, this.end_row, this.end_char);
                }
            }
        },
        cut: {

            /**
             * Cuts the selected text.
             * @return {string} selected text
             */

            value: function cut() {
                var text = this.get();
                if (this.primary_row == this.secondary_row && this.primary_char == this.secondary_char) {
                    this._copied_row = this._model._rows[this.primary_row];
                    this._historical(function () {
                        this._model_remove_row(this.primary_row);
                    });
                } else {
                    this._copied_row = null;
                    this.remove_selected();
                }
                return text;
            }
        },
        copy: {

            /**
             * Copies the selected text.
             * @return {string} selected text
             */

            value: function copy() {
                var text = this.get();
                if (this.primary_row == this.secondary_row && this.primary_char == this.secondary_char) {
                    this._copied_row = this._model._rows[this.primary_row];
                } else {
                    this._copied_row = null;
                }
                return text;
            }
        },
        delete_forward: {

            /**
             * Delete forward, typically called by `delete` keypress.
             * @return {null}
             */

            value: function delete_forward() {
                if (!this.remove_selected()) {
                    this.move_primary(1, 0);
                    this.remove_selected();
                }
                return true;
            }
        },
        delete_backward: {

            /**
             * Delete backward, typically called by `backspace` keypress.
             * @return {null}
             */

            value: function delete_backward() {
                if (!this.remove_selected()) {
                    this.move_primary(-1, 0);
                    this.remove_selected();
                }
                return true;
            }
        },
        delete_word_left: {

            /**
             * Delete one word backwards.
             * @return {boolean} success
             */

            value: function delete_word_left() {
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
                        this.secondary_char = i + 1;
                        this.remove_selected();
                    }
                }
                return true;
            }
        },
        delete_word_right: {

            /**
             * Delete one word forwards.
             * @return {boolean} success
             */

            value: function delete_word_right() {
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
            }
        },
        _reset_secondary: {

            /**
             * Reset the secondary cursor to the value of the primary.
             * @return {[type]} [description]
             */

            value: function _reset_secondary() {
                this.secondary_row = this.primary_row;
                this.secondary_char = this.primary_char;

                this.trigger("change");
            }
        },
        _model_add_text: {

            /**
             * Adds text to the model while keeping track of the history.
             * @param  {integer} row_index
             * @param  {integer} char_index
             * @param  {string} text
             */

            value: function _model_add_text(row_index, char_index, text) {
                var lines = text.split("\n");
                this._push_history("_model_add_text", [row_index, char_index, text], "_model_remove_text", [row_index, char_index, row_index + lines.length - 1, lines.length > 1 ? lines[lines.length - 1].length : char_index + text.length], config.history_group_delay || 100);
                this._model.add_text(row_index, char_index, text);
            }
        },
        _model_remove_text: {

            /**
             * Removes text from the model while keeping track of the history.
             * @param  {integer} start_row
             * @param  {integer} start_char
             * @param  {integer} end_row
             * @param  {integer} end_char
             */

            value: function _model_remove_text(start_row, start_char, end_row, end_char) {
                var text = this._model.get_text(start_row, start_char, end_row, end_char);
                this._push_history("_model_remove_text", [start_row, start_char, end_row, end_char], "_model_add_text", [start_row, start_char, text], config.history_group_delay || 100);
                this._model.remove_text(start_row, start_char, end_row, end_char);
            }
        },
        _model_add_row: {

            /**
             * Adds a row of text while keeping track of the history.
             * @param  {integer} row_index
             * @param  {string} text
             */

            value: function _model_add_row(row_index, text) {
                this._push_history("_model_add_row", [row_index, text], "_model_remove_row", [row_index], config.history_group_delay || 100);
                this._model.add_row(row_index, text);
            }
        },
        _model_remove_row: {

            /**
             * Removes a row of text while keeping track of the history.
             * @param  {integer} row_index
             */

            value: function _model_remove_row(row_index) {
                this._push_history("_model_remove_row", [row_index], "_model_add_row", [row_index, this._model._rows[row_index]], config.history_group_delay || 100);
                this._model.remove_row(row_index);
            }
        },
        _historical: {

            /**
             * Record the before and after positions of the cursor for history.
             * @param  {function} f - executes with `this` context
             */

            value: function _historical(f) {
                this._start_historical_move();
                var ret = f.apply(this);
                this._end_historical_move();
                return ret;
            }
        },
        _start_historical_move: {

            /**
             * Record the starting state of the cursor for the history buffer.
             */

            value: function _start_historical_move() {
                if (!this._historical_start) {
                    this._historical_start = this.get_state();
                }
            }
        },
        _end_historical_move: {

            /**
             * Record the ending state of the cursor for the history buffer, then
             * push a reversable action describing the change of the cursor.
             */

            value: function _end_historical_move() {
                this._push_history("set_state", [this.get_state()], "set_state", [this._historical_start], config.history_group_delay || 100);
                this._historical_start = null;
            }
        },
        _make_indents: {

            /**
             * Makes a list of indentation strings used to indent one level,
             * ordered by usage preference.
             * @return {string}
             */

            value: function _make_indents() {
                var indents = [];
                if (config.use_spaces) {
                    var indent = "";
                    for (var i = 0; i < config.tab_width; i++) {
                        indent += " ";
                        indents.push(indent);
                    }
                    indents.reverse();
                }
                indents.push("\t");
                return indents;
            }
        },
        _register_api: {

            /**
             * Registers an action API with the map
             * @return {null}
             */

            value: function _register_api() {
                var _this = this;

                register("cursor.set_state", utils.proxy(this.set_state, this), this);
                register("cursor.remove_selected", utils.proxy(this.remove_selected, this), this);
                register("cursor.keypress", utils.proxy(this.keypress, this), this);
                register("cursor.indent", utils.proxy(this.indent, this), this);
                register("cursor.unindent", utils.proxy(this.unindent, this), this);
                register("cursor.newline", utils.proxy(this.newline, this), this);
                register("cursor.insert_text", utils.proxy(this.insert_text, this), this);
                register("cursor.delete_backward", utils.proxy(this.delete_backward, this), this);
                register("cursor.delete_forward", utils.proxy(this.delete_forward, this), this);
                register("cursor.delete_word_left", utils.proxy(this.delete_word_left, this), this);
                register("cursor.delete_word_right", utils.proxy(this.delete_word_right, this), this);
                register("cursor.select_all", utils.proxy(this.select_all, this), this);
                register("cursor.left", function () {
                    _this.move_primary(-1, 0, true);_this._reset_secondary();return true;
                });
                register("cursor.right", function () {
                    _this.move_primary(1, 0, true);_this._reset_secondary();return true;
                });
                register("cursor.up", function () {
                    _this.move_primary(0, -1, true);_this._reset_secondary();return true;
                });
                register("cursor.down", function () {
                    _this.move_primary(0, 1, true);_this._reset_secondary();return true;
                });
                register("cursor.select_left", function () {
                    _this.move_primary(-1, 0);return true;
                });
                register("cursor.select_right", function () {
                    _this.move_primary(1, 0);return true;
                });
                register("cursor.select_up", function () {
                    _this.move_primary(0, -1);return true;
                });
                register("cursor.select_down", function () {
                    _this.move_primary(0, 1);return true;
                });
                register("cursor.word_left", function () {
                    _this.word_primary(-1);_this._reset_secondary();return true;
                });
                register("cursor.word_right", function () {
                    _this.word_primary(1);_this._reset_secondary();return true;
                });
                register("cursor.select_word_left", function () {
                    _this.word_primary(-1);return true;
                });
                register("cursor.select_word_right", function () {
                    _this.word_primary(1);return true;
                });
                register("cursor.line_start", function () {
                    _this.primary_goto_start();_this._reset_secondary();return true;
                });
                register("cursor.line_end", function () {
                    _this.primary_goto_end();_this._reset_secondary();return true;
                });
                register("cursor.select_line_start", function () {
                    _this.primary_goto_start();return true;
                });
                register("cursor.select_line_end", function () {
                    _this.primary_goto_end();return true;
                });
            }
        }
    });

    return Cursor;
})(utils.PosterClass);

},{"./config.js":5,"./events/map.js":12,"./utils.js":36}],7:[function(require,module,exports){
"use strict";

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

Object.defineProperty(exports, "__esModule", {
    value: true
});
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var keymap = _interopRequireWildcard(require("./events/map.js"));

var register = keymap.Map.register;

var cursor = _interopRequireWildcard(require("./cursor.js"));

var utils = _interopRequireWildcard(require("./utils.js"));

/**
 * Manages one or more cursors
 */

var Cursors = exports.Cursors = (function (_utils$PosterClass) {
    function Cursors(model, clipboard, history) {
        _classCallCheck(this, Cursors);

        _get(Object.getPrototypeOf(Cursors.prototype), "constructor", this).call(this);
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
        register("cursors._cursor_proxy", utils.proxy(this._cursor_proxy, this));
        register("cursors.create", utils.proxy(this.create, this));
        register("cursors.single", utils.proxy(this.single, this));
        register("cursors.pop", utils.proxy(this.pop, this));
        register("cursors.start_selection", utils.proxy(this.start_selection, this));
        register("cursors.set_selection", utils.proxy(this.set_selection, this));
        register("cursors.start_set_selection", utils.proxy(this.start_set_selection, this));
        register("cursors.end_selection", utils.proxy(this.end_selection, this));
        register("cursors.select_word", utils.proxy(this.select_word, this));

        // Bind clipboard events.
        this._clipboard.on("cut", utils.proxy(this._handle_cut, this));
        this._clipboard.on("copy", utils.proxy(this._handle_copy, this));
        this._clipboard.on("paste", utils.proxy(this._handle_paste, this));
    }

    _inherits(Cursors, _utils$PosterClass);

    _createClass(Cursors, {
        _cursor_proxy: {

            /**
             * Handles history proxy events for individual cursors.
             * @param  {integer} cursor_index
             * @param  {string} function_name
             * @param  {array} function_params
             */

            value: function _cursor_proxy(cursor_index, function_name, function_params) {
                if (cursor_index < this.cursors.length) {
                    var cursor = this.cursors[cursor_index];
                    cursor[function_name].apply(cursor, function_params);
                }
            }
        },
        create: {

            /**
             * Creates a cursor and manages it.
             * @param {object} [state] state to apply to the new cursor.
             * @param {boolean} [reversable] - defaults to true, is action reversable.
             * @return {Cursor} cursor
             */

            value: function create(state, reversable) {
                var _this = this;

                // Record this action in history.
                if (reversable === undefined || reversable === true) {
                    this._history.push_action("cursors.create", arguments, "cursors.pop", []);
                }

                // Create a proxying history method for the cursor itself.
                var index = this.cursors.length;
                var history_proxy = function (forward_name, forward_params, backward_name, backward_params, autogroup_delay) {
                    _this._history.push_action("cursors._cursor_proxy", [index, forward_name, forward_params], "cursors._cursor_proxy", [index, backward_name, backward_params], autogroup_delay);
                };

                // Create the cursor.
                var new_cursor = new cursor.Cursor(this._model, history_proxy);
                this.cursors.push(new_cursor);

                // Set the initial properties of the cursor.
                new_cursor.set_state(state, false);

                // Listen for cursor change events.
                new_cursor.on("change", function () {
                    _this.trigger("change", new_cursor);
                    _this._update_selection();
                });
                this.trigger("change", new_cursor);

                return new_cursor;
            }
        },
        single: {

            /**
             * Remove every cursor except for the first one.
             */

            value: function single() {
                while (this.cursors.length > 1) {
                    this.pop();
                }
            }
        },
        pop: {

            /**
             * Remove the last cursor.
             * @returns {Cursor} last cursor or null
             */

            value: function pop() {
                if (this.cursors.length > 1) {

                    // Remove the last cursor and unregister it.
                    var cursor = this.cursors.pop();
                    cursor.unregister();
                    cursor.off("change");

                    // Record this action in history.
                    this._history.push_action("cursors.pop", [], "cursors.create", [cursor.get_state()]);

                    // Alert listeners of changes.
                    this.trigger("change");
                    return cursor;
                }
                return null;
            }
        },
        _handle_copy: {

            /**
             * Handles when the selected text is copied to the clipboard.
             * @param  {string} text - by val text that was cut
             * @return {null}
             */

            value: function _handle_copy(text) {
                this.cursors.forEach(function (cursor) {
                    return cursor.copy();
                });
            }
        },
        _handle_cut: {

            /**
             * Handles when the selected text is cut to the clipboard.
             * @param  {string} text - by val text that was cut
             * @return {null}
             */

            value: function _handle_cut(text) {
                this.cursors.forEach(function (cursor) {
                    return cursor.cut();
                });
            }
        },
        _handle_paste: {

            /**
             * Handles when text is pasted into the document.
             * @param  {string} text
             * @return {null}
             */

            value: function _handle_paste(text) {

                // If the modulus of the number of cursors and the number of pasted lines
                // of text is zero, split the cut lines among the cursors.
                var lines = text.split("\n");
                if (this.cursors.length > 1 && lines.length > 1 && lines.length % this.cursors.length === 0) {
                    var lines_per_cursor = lines.length / this.cursors.length;
                    this.cursors.forEach(function (cursor, index) {
                        cursor.insert_text(lines.slice(index * lines_per_cursor, index * lines_per_cursor + lines_per_cursor).join("\n"));
                    });
                } else {
                    this.cursors.forEach(function (cursor) {
                        return cursor.paste(text);
                    });
                }
            }
        },
        _update_selection: {

            /**
             * Update the clippable text based on new selection.
             * @return {null}
             */

            value: function _update_selection() {

                // Copy all of the selected text.
                var selections = [];
                this.cursors.forEach(function (cursor) {
                    return selections.push(cursor.get());
                });

                // Make the copied text clippable.
                this._clipboard.set_clippable(selections.join("\n"));
            }
        },
        start_selection: {

            /**
             * Starts selecting text from mouse coordinates.
             * @param  {MouseEvent} e - mouse event containing the coordinates.
             * @return {null}
             */

            value: function start_selection(e) {
                var x = e.offsetX;
                var y = e.offsetY;

                this._selecting_text = true;
                if (this.get_row_char) {
                    var location = this.get_row_char(x, y);
                    this.cursors[0].set_both(location.row_index, location.char_index);
                }
            }
        },
        end_selection: {

            /**
             * Finalizes the selection of text.
             * @return {null}
             */

            value: function end_selection() {
                this._selecting_text = false;
            }
        },
        set_selection: {

            /**
             * Sets the endpoint of text selection from mouse coordinates.
             * @param  {MouseEvent} e - mouse event containing the coordinates.
             * @return {null}
             */

            value: function set_selection(e) {
                var x = e.offsetX;
                var y = e.offsetY;
                if (this._selecting_text && this.get_row_char) {
                    var location = this.get_row_char(x, y);
                    this.cursors[this.cursors.length - 1].set_primary(location.row_index, location.char_index);
                }
            }
        },
        start_set_selection: {

            /**
             * Sets the endpoint of text selection from mouse coordinates.
             * Different than set_selection because it doesn't need a call
             * to start_selection to work.
             * @param  {MouseEvent} e - mouse event containing the coordinates.
             * @return {null}
             */

            value: function start_set_selection(e) {
                this._selecting_text = true;
                this.set_selection(e);
            }
        },
        select_word: {

            /**
             * Selects a word at the given mouse coordinates.
             * @param  {MouseEvent} e - mouse event containing the coordinates.
             * @return {null}
             */

            value: function select_word(e) {
                var x = e.offsetX;
                var y = e.offsetY;
                if (this.get_row_char) {
                    var location = this.get_row_char(x, y);
                    this.cursors[this.cursors.length - 1].select_word(location.row_index, location.char_index);
                }
            }
        }
    });

    return Cursors;
})(utils.PosterClass);

},{"./cursor.js":6,"./events/map.js":12,"./utils.js":36}],8:[function(require,module,exports){
"use strict";

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

Object.defineProperty(exports, "__esModule", {
    value: true
});
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = _interopRequireWildcard(require("./utils.js"));

var normalizer = _interopRequireWildcard(require("./events/normalizer.js"));

var keymap = _interopRequireWildcard(require("./events/map.js"));

var default_keymap = _interopRequireWildcard(require("./events/default.js"));

var cursors = _interopRequireWildcard(require("./cursors.js"));

var clipboard = _interopRequireWildcard(require("./clipboard.js"));

var history = _interopRequireWildcard(require("./history.js"));

/**
 * Controller for a DocumentModel.
 */

var DocumentController = exports.DocumentController = (function (_utils$PosterClass) {
    function DocumentController(el, model) {
        _classCallCheck(this, DocumentController);

        _get(Object.getPrototypeOf(DocumentController.prototype), "constructor", this).call(this);
        this.clipboard = new clipboard.Clipboard(el);
        this.normalizer = new normalizer.Normalizer();
        this.normalizer.listen_to(el);
        this.normalizer.listen_to(this.clipboard.hidden_input);
        this.map = new keymap.Map(this.normalizer);
        this.map.map(default_keymap.map);
        this.history = new history.History(this.map);
        this.cursors = new cursors.Cursors(model, this.clipboard, this.history);
    }

    _inherits(DocumentController, _utils$PosterClass);

    return DocumentController;
})(utils.PosterClass);

},{"./clipboard.js":4,"./cursors.js":7,"./events/default.js":11,"./events/map.js":12,"./events/normalizer.js":13,"./history.js":16,"./utils.js":36}],9:[function(require,module,exports){
"use strict";

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

Object.defineProperty(exports, "__esModule", {
    value: true
});
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = _interopRequireWildcard(require("./utils.js"));

var superset = _interopRequireWildcard(require("./superset.js"));

/**
 * Model containing all of the document's data (text).
 */

var DocumentModel = exports.DocumentModel = (function (_utils$PosterClass) {
    function DocumentModel() {
        _classCallCheck(this, DocumentModel);

        _get(Object.getPrototypeOf(DocumentModel.prototype), "constructor", this).call(this);
        this._rows = [];
        this._row_tags = [];
        this._tag_lock = 0;
        this._pending_tag_events = false;
    }

    _inherits(DocumentModel, _utils$PosterClass);

    _createClass(DocumentModel, {
        rows: {
            get: function () {
                // Return a shallow copy of the array so it cannot be modified.
                return [].concat(this._rows);
            }
        },
        text: {
            get: function () {
                return this._get_text();
            },
            set: function (value) {
                return this._set_text(value);
            }
        },
        acquire_tag_event_lock: {

            /**
             * Acquire a lock on tag events
             *
             * Prevents tag events from firing.
             * @return {integer} lock count
             */

            value: function acquire_tag_event_lock() {
                return this._tag_lock++;
            }
        },
        release_tag_event_lock: {

            /**
             * Release a lock on tag events
             * @return {integer} lock count
             */

            value: function release_tag_event_lock() {
                this._tag_lock--;
                if (this._tag_lock < 0) {
                    this._tag_lock = 0;
                }
                if (this._tag_lock === 0 && this._pending_tag_events) {
                    this._pending_tag_events = false;
                    this.trigger_tag_events();
                }
                return this._tag_lock;
            }
        },
        trigger_tag_events: {

            /**
             * Triggers the tag change events.
             * @return {null}
             */

            value: function trigger_tag_events(rows) {
                if (this._tag_lock === 0) {
                    this.trigger("tags_changed", this._pending_tag_events_rows);
                    this._pending_tag_events_rows = undefined;
                } else {
                    this._pending_tag_events = true;
                    if (this._pending_tag_events_rows) {
                        this._pending_tag_events_rows = this._pending_tag_events_rows.concat(rows);
                    } else {
                        this._pending_tag_events_rows = rows;
                    }
                }
            }
        },
        set_tag: {

            /**
             * Sets a 'tag' on the text specified.
             * @param {integer} start_row - row the tag starts on
             * @param {integer} start_char - index, in the row, of the first tagged character
             * @param {integer} end_row - row the tag ends on
             * @param {integer} end_char - index, in the row, of the last tagged character
             * @param {string} tag_name
             * @param {any} tag_value - overrides any previous tags
             */

            value: function set_tag(start_row, start_char, end_row, end_char, tag_name, tag_value) {
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
            }
        },
        clear_tags: {

            /**
             * Removed all of the tags on the document.
             * @param  {integer} start_row
             * @param  {integer} end_row
             * @return {null}
             */

            value: function clear_tags(start_row, end_row) {
                start_row = start_row !== undefined ? start_row : 0;
                end_row = end_row !== undefined ? end_row : this._row_tags.length - 1;
                var rows = [];
                for (var i = start_row; i <= end_row; i++) {
                    this._row_tags[i] = {};
                    rows.push(i);
                }
                this.trigger_tag_events(rows);
            }
        },
        get_tag_value: {

            /**
             * Get the tag value applied to the character.
             * @param  {string} tag_name
             * @param  {integer} row_index
             * @param  {integer} char_index
             * @return {object} value or undefined
             */

            value: function get_tag_value(tag_name, row_index, char_index) {

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
            }
        },
        get_tags: {

            /**
             * Get the tag value ranges applied to the specific range.
             * @param  {string} tag_name
             * @param  {integer} start_row
             * @param  {integer} start_char
             * @param  {integer} end_row
             * @param  {integer} end_char
             * @return {array} array of tag value ranges ([row_index, start_char, end_char, tag_value])
             */

            value: function get_tags(tag_name, start_row, start_char, end_row, end_char) {
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
                                values.push([row, ns, ne, tag_array[i][2]]);
                            }
                        }
                    }
                }
                return values;
            }
        },
        add_text: {

            /**
             * Adds text efficiently somewhere in the document.
             * @param {integer} row_index  
             * @param {integer} char_index 
             * @param {string} text
             */

            value: function add_text(row_index, char_index, text) {
                var coords = this.validate_coords.apply(this, Array.prototype.slice.call(arguments, 0, 2));
                var old_text = this._rows[coords.start_row];
                // If the text has a new line in it, just re-set
                // the rows list.
                if (text.indexOf("\n") != -1) {
                    var new_rows = [];
                    if (coords.start_row > 0) {
                        new_rows = this._rows.slice(0, coords.start_row);
                    }

                    var old_row_start = old_text.substring(0, coords.start_char);
                    var old_row_end = old_text.substring(coords.start_char);
                    var split_text = text.split("\n");
                    new_rows.push(old_row_start + split_text[0]);

                    if (split_text.length > 2) {
                        new_rows = new_rows.concat(split_text.slice(1, split_text.length - 1));
                    }

                    new_rows.push(split_text[split_text.length - 1] + old_row_end);

                    if (coords.start_row + 1 < this._rows.length) {
                        new_rows = new_rows.concat(this._rows.slice(coords.start_row + 1));
                    }

                    this._rows = new_rows;
                    this._resized_rows();
                    this.trigger("row_changed", old_text, coords.start_row);
                    this.trigger("rows_added", coords.start_row + 1, coords.start_row + split_text.length - 1);
                    this.trigger("changed");

                    // Text doesn't have any new lines, just modify the
                    // line and then trigger the row changed event.
                } else {
                    this._rows[coords.start_row] = old_text.substring(0, coords.start_char) + text + old_text.substring(coords.start_char);
                    this.trigger("row_changed", old_text, coords.start_row);
                    this.trigger("changed");
                }
            }
        },
        remove_text: {

            /**
             * Removes a block of text from the document
             * @param  {integer} start_row
             * @param  {integer} start_char
             * @param  {integer} end_row
             * @param  {integer} end_char
             * @return {null}
             */

            value: function remove_text(start_row, start_char, end_row, end_char) {
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
                        this.trigger("text_changed");
                        this.trigger("changed");
                    } else {
                        this.trigger("row_changed", old_text, coords.start_row);
                        this.trigger("rows_removed", rows_removed);
                        this.trigger("changed");
                    }
                } else if (coords.end_row == coords.start_row) {
                    this.trigger("row_changed", old_text, coords.start_row);
                    this.trigger("changed");
                }
            }
        },
        remove_row: {

            /**
             * Remove a row from the document.
             * @param  {integer} row_index
             * @return {null}
             */

            value: function remove_row(row_index) {
                if (0 < row_index && row_index < this._rows.length) {
                    var rows_removed = this._rows.splice(row_index, 1);
                    this._resized_rows();
                    this.trigger("rows_removed", rows_removed);
                    this.trigger("changed");
                }
            }
        },
        get_text: {

            /**
             * Gets a chunk of text.
             * @param  {integer} start_row
             * @param  {integer} start_char
             * @param  {integer} end_row
             * @param  {integer} end_char
             * @return {string}
             */

            value: function get_text(start_row, start_char, end_row, end_char) {
                var coords = this.validate_coords.apply(this, arguments);
                if (coords.start_row == coords.end_row) {
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
                    return text.join("\n");
                }
            }
        },
        add_row: {

            /**
             * Add a row to the document
             * @param {integer} row_index
             * @param {string} text - new row's text
             */

            value: function add_row(row_index, text) {
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
                this.trigger("rows_added", row_index, row_index);
                this.trigger("changed");
            }
        },
        validate_coords: {

            /**
             * Validates row, character coordinates in the document.
             * @param  {integer} start_row
             * @param  {integer} start_char
             * @param  {integer} (optional) end_row
             * @param  {integer} (optional) end_char
             * @return {dictionary} dictionary containing validated coordinates {start_row, 
             *                      start_char, end_row, end_char}
             */

            value: function validate_coords(start_row, start_char, end_row, end_char) {

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
                if (start_row > end_row || start_row == end_row && start_char > end_char) {
                    return {
                        start_row: end_row,
                        start_char: end_char,
                        end_row: start_row,
                        end_char: start_char };
                } else {
                    return {
                        start_row: start_row,
                        start_char: start_char,
                        end_row: end_row,
                        end_char: end_char };
                }
            }
        },
        _get_text: {

            /**
             * Gets the text of the document.
             * @return {string}
             */

            value: function _get_text() {
                return this._rows.join("\n");
            }
        },
        _set_text: {

            /**
             * Sets the text of the document.
             * Complexity O(N) for N rows
             * @param {string} value
             */

            value: function _set_text(value) {
                this._rows = value.split("\n");
                this._resized_rows();
                this.trigger("text_changed");
                this.trigger("changed");
            }
        },
        _resized_rows: {

            /**
             * Updates _row's partner arrays.
             * @return {null} 
             */

            value: function _resized_rows() {

                // Make sure there are as many tag rows as there are text rows.
                while (this._row_tags.length < this._rows.length) {
                    this._row_tags.push({});
                }
                if (this._row_tags.length > this._rows.length) {
                    this._row_tags.splice(this._rows.length, this._row_tags.length - this._rows.length);
                }
            }
        }
    });

    return DocumentModel;
})(utils.PosterClass);

},{"./superset.js":35,"./utils.js":36}],10:[function(require,module,exports){
"use strict";

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

Object.defineProperty(exports, "__esModule", {
    value: true
});
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = _interopRequireWildcard(require("./utils.js"));

// Renderers

var batch = _interopRequireWildcard(require("./renderers/batch.js"));

var highlighted_row = _interopRequireWildcard(require("./renderers/highlighted_row.js"));

var cursors = _interopRequireWildcard(require("./renderers/cursors.js"));

var selections = _interopRequireWildcard(require("./renderers/selections.js"));

var color = _interopRequireWildcard(require("./renderers/color.js"));

var highlighter = _interopRequireWildcard(require("./highlighters/prism.js"));

/**
 * Visual representation of a DocumentModel instance
 * @param {Canvas} canvas instance
 * @param {DocumentModel} model instance
 * @param {Cursors} cursors_model instance
 * @param {Style} style - describes rendering style
 * @param {function} has_focus - function that checks if the text area has focus
 */

var DocumentView = exports.DocumentView = (function (_batch$BatchRenderer) {
    function DocumentView(canvas, model, cursors_model, style, has_focus) {
        _classCallCheck(this, DocumentView);

        this._model = model;

        // Create child renderers.
        var row_renderer = new highlighted_row.HighlightedRowRenderer(model, canvas, style);
        row_renderer.margin_left = 2;
        row_renderer.margin_top = 2;
        this.row_renderer = row_renderer;

        // Make sure changes made to the cursor(s) are within the visible region.
        cursors_model.on("change", function (cursor) {
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
            } else if (left - row_renderer.margin_left < canvas.scroll_left) {
                canvas.scroll_left = Math.max(0, left - row_renderer.margin_left);
            }
        });

        var cursors_renderer = new cursors.CursorsRenderer(cursors_model, style, row_renderer, has_focus);
        var selections_renderer = new selections.SelectionsRenderer(cursors_model, style, row_renderer, has_focus, cursors_renderer);

        // Create the background renderer
        var color_renderer = new color.ColorRenderer();
        color_renderer.color = style.background || "white";
        style.on("changed:style", function () {
            color_renderer.color = style.background;
        });

        // Create the document highlighter, which needs to know about the currently
        // rendered rows in order to know where to highlight.
        this.highlighter = new highlighter.PrismHighlighter(model, row_renderer);

        // Pass get_row_char into cursors.
        cursors_model.get_row_char = utils.proxy(row_renderer.get_row_char, row_renderer);

        // Call base constructor.
        _get(Object.getPrototypeOf(DocumentView.prototype), "constructor", this).call(this, [color_renderer, selections_renderer, row_renderer, cursors_renderer], canvas);

        // Hookup render events.
        this._canvas.on("redraw", utils.proxy(this.render, this));
        this._model.on("changed", utils.proxy(canvas.redraw, canvas));
    }

    _inherits(DocumentView, _batch$BatchRenderer);

    _createClass(DocumentView, {
        language: {
            get: function () {
                return this._language;
            },
            set: function (value) {
                this.highlighter.load(value);
                this._language = value;
            }
        }
    });

    return DocumentView;
})(batch.BatchRenderer);

},{"./highlighters/prism.js":15,"./renderers/batch.js":24,"./renderers/color.js":25,"./renderers/cursors.js":26,"./renderers/highlighted_row.js":27,"./renderers/selections.js":30,"./utils.js":36}],11:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
// OSX bindings
var _map;
if (navigator.appVersion.indexOf("Mac") != -1) {
    _map = {
        "alt-leftarrow": "cursor.word_left",
        "alt-rightarrow": "cursor.word_right",
        "shift-alt-leftarrow": "cursor.select_word_left",
        "shift-alt-rightarrow": "cursor.select_word_right",
        "alt-backspace": "cursor.delete_word_left",
        "alt-delete": "cursor.delete_word_right",
        "meta-leftarrow": "cursor.line_start",
        "meta-rightarrow": "cursor.line_end",
        "shift-meta-leftarrow": "cursor.select_line_start",
        "shift-meta-rightarrow": "cursor.select_line_end",
        "meta-a": "cursor.select_all",
        "meta-z": "history.undo",
        "meta-y": "history.redo" };

    // Non OSX bindings
} else {
    _map = {
        "ctrl-leftarrow": "cursor.word_left",
        "ctrl-rightarrow": "cursor.word_right",
        "ctrl-backspace": "cursor.delete_word_left",
        "ctrl-delete": "cursor.delete_word_right",
        "shift-ctrl-leftarrow": "cursor.select_word_left",
        "shift-ctrl-rightarrow": "cursor.select_word_right",
        home: "cursor.line_start",
        end: "cursor.line_end",
        "shift-home": "cursor.select_line_start",
        "shift-end": "cursor.select_line_end",
        "ctrl-a": "cursor.select_all",
        "ctrl-z": "history.undo",
        "ctrl-y": "history.redo" };
}

// Common bindings
_map.keypress = "cursor.keypress";
_map.enter = "cursor.newline";
_map["delete"] = "cursor.delete_forward";
_map.backspace = "cursor.delete_backward";
_map.leftarrow = "cursor.left";
_map.rightarrow = "cursor.right";
_map.uparrow = "cursor.up";
_map.downarrow = "cursor.down";
_map["shift-leftarrow"] = "cursor.select_left";
_map["shift-rightarrow"] = "cursor.select_right";
_map["shift-uparrow"] = "cursor.select_up";
_map["shift-downarrow"] = "cursor.select_down";
_map["mouse0-dblclick"] = "cursors.select_word";
_map["mouse0-down"] = "cursors.start_selection";
_map["mouse-move"] = "cursors.set_selection";
_map["mouse0-up"] = "cursors.end_selection";
_map["shift-mouse0-up"] = "cursors.end_selection";
_map["shift-mouse0-down"] = "cursors.start_set_selection";
_map["shift-mouse-move"] = "cursors.set_selection";
_map.tab = "cursor.indent";
_map["shift-tab"] = "cursor.unindent";
_map.escape = "cursors.single";
var map = _map;
exports.map = map;

},{}],12:[function(require,module,exports){
"use strict";

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

Object.defineProperty(exports, "__esModule", {
    value: true
});
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = _interopRequireWildcard(require("../utils.js"));

/**
 * Event normalizer
 *
 * Listens to DOM events and emits 'cleaned' versions of those events.
 */

var Map = exports.Map = (function (_utils$PosterClass) {
    function Map(normalizer) {
        _classCallCheck(this, Map);

        _get(Object.getPrototypeOf(Map.prototype), "constructor", this).call(this);
        this._map = {};

        // Create normalizer property
        this._normalizer = null;
        this._proxy_handle_event = utils.proxy(this._handle_event, this);

        // If defined, set the normalizer.
        if (normalizer) this.normalizer = normalizer;
    }

    _inherits(Map, _utils$PosterClass);

    _createClass(Map, {
        normalizer: {
            get: function () {
                return this._normalizer;
            },
            set: function (value) {
                // Remove event handler.
                if (this._normalizer) this._normalizer.off_all(this._proxy_handle_event);
                // Set, and add event handler.
                this._normalizer = value;
                if (value) value.on_all(this._proxy_handle_event);
            }
        },
        append_map: {

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

            value: function append_map() {
                var _this = this;

                var parsed = this._parse_map_arguments(arguments);
                Object.keys(parsed).forEach(function (key) {
                    if (_this._map[key] === undefined) {
                        _this._map[key] = parsed[key];
                    } else {
                        _this._map[key] = _this._map[key].concat(parsed[key]);
                    }
                });
            }
        },
        prepend_map: {

            /**
             * Prepend event actions to the map.
             *
             * See the doc for `append_map` for a detailed description of
             * possible input values.
             * @return {null}
             */

            value: function prepend_map() {
                var _this = this;

                var parsed = this._parse_map_arguments(arguments);
                Object.keys(parsed).forEach(function (key) {
                    if (_this._map[key] === undefined) {
                        _this._map[key] = parsed[key];
                    } else {
                        _this._map[key] = parsed[key].concat(_this._map[key]);
                    }
                });
            }
        },
        unmap: {

            /**
             * Unmap event actions in the map.
             *
             * See the doc for `append_map` for a detailed description of
             * possible input values.
             * @return {null}
             */

            value: function unmap() {
                var _this = this;

                var parsed = this._parse_map_arguments(arguments);
                Object.keys(parsed).forEach(function (key) {
                    if (_this._map[key] !== undefined) {
                        parsed[key].forEach(function (value) {
                            var index = this._map[key].indexOf(value);
                            if (index != -1) {
                                this._map[key].splice(index, 1);
                            }
                        });
                    }
                });
            }
        },
        get_mapping: {

            /**
             * Get a modifiable array of the actions for a particular event.
             * @param  {string} event
             * @return {array} by ref copy of the actions registered to an event.
             */

            value: function get_mapping(event) {
                return this._map[this._normalize_event_name(event)];
            }
        },
        invoke: {

            /**
             * Invokes the callbacks of an action by name.
             * @param  {string} name
             * @param  {array} [args] - arguments to pass to the action callback[s]
             * @return {boolean} true if one or more of the actions returned true
             */

            value: function invoke(name, args) {
                var action_callbacks = Map.registry[name];
                if (action_callbacks) {
                    if (utils.is_array(action_callbacks)) {
                        var returns = [];
                        action_callbacks.forEach(function (action_callback) {
                            returns.append(action_callback.apply(undefined, args) === true);
                        });

                        // If one of the action callbacks returned true, cancel bubbling.
                        if (returns.some(function (x) {
                            return x;
                        })) {
                            return true;
                        }
                    } else {
                        if (action_callbacks.apply(undefined, args) === true) {
                            return true;
                        }
                    }
                }
                return false;
            }
        },
        _parse_map_arguments: {

            /**
             * Parse the arguments to a map function.
             * @param  {arguments array} args
             * @return {dictionary} parsed results
             */

            value: function _parse_map_arguments(args) {
                var _this = this;

                var parsed = {};

                // One arument, treat it as a dictionary of event names and
                // actions.
                if (args.length == 1) {
                    Object.keys(args[0]).forEach(function (key) {
                        var value = args[0][key];
                        var normalized_key = _this._normalize_event_name(key);

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
                    for (var i = 0; i < Math.floor(args.length / 2); i++) {
                        var key = this._normalize_event_name(args[2 * i]);
                        var value = args[2 * i + 1];
                        if (parsed[key] === undefined) {
                            parsed[key] = [value];
                        } else {
                            parsed[key].push(value);
                        }
                    }
                }
                return parsed;
            }
        },
        _handle_event: {

            /**
             * Handles a normalized event.
             * @param  {string} name - name of the event
             * @param  {Event} e - browser Event object
             * @return {null}
             */

            value: function _handle_event(name, e) {
                var _this = this;

                var normalized_event = this._normalize_event_name(name);
                var actions = this._map[normalized_event];
                if (actions) {
                    actions.forEach(function (action) {
                        if (_this.invoke(action, [e])) {
                            utils.cancel_bubble(e);
                        }
                    });
                }
                return false;
            }
        },
        _normalize_event_name: {

            /**
             * Alphabetically sorts keys in event name, so
             * @param  {string} name - event name
             * @return {string} normalized event name
             */

            value: function _normalize_event_name(name) {
                return name.toLowerCase().trim().split("-").sort().join("-");
            }
        }
    });

    return Map;
})(utils.PosterClass);

/**
 * Alias for `append_map`.
 * @type {function}
 */
Map.prototype.map = Map.prototype.append_map;

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
Map.register = function (name, f, tag) {
    if (utils.is_array(Map.registry[name])) {
        Map.registry[name].push(f);
    } else {
        if (Map.registry[name] === undefined) {
            Map.registry[name] = f;
        } else {
            Map.registry[name] = [Map.registry[name], f];
        }
    }

    if (tag) {
        if (Map._registry_tags[tag] === undefined) {
            Map._registry_tags[tag] = [];
        }
        Map._registry_tags[tag].push({ name: name, f: f });
    }
};

/**
 * Unregister an action.
 * @param  {string} name - name of the action
 * @param  {function} f
 * @return {boolean} true if action was found and unregistered
 */
Map.unregister = function (name, f) {
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
Map.unregister_by_tag = function (tag) {
    if (Map._registry_tags[tag]) {
        Map._registry_tags[tag].forEach(function (registration) {
            Map.unregister(registration.name, registration.f);
        });
        delete Map._registry_tags[tag];
        return true;
    }
};

},{"../utils.js":36}],13:[function(require,module,exports){
"use strict";

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

Object.defineProperty(exports, "__esModule", {
    value: true
});
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = _interopRequireWildcard(require("../utils.js"));

/**
 * Event normalizer
 *
 * Listens to DOM events and emits 'cleaned' versions of those events.
 */

var Normalizer = exports.Normalizer = (function (_utils$PosterClass) {
    function Normalizer() {
        _classCallCheck(this, Normalizer);

        _get(Object.getPrototypeOf(Normalizer.prototype), "constructor", this).call(this);
        this._el_hooks = {};
    }

    _inherits(Normalizer, _utils$PosterClass);

    _createClass(Normalizer, {
        listen_to: {

            /**
             * Listen to the events of an element.
             * @param  {HTMLElement} el
             * @return {null}
             */

            value: function listen_to(el) {
                var hooks = [];
                hooks.push(utils.hook(el, "onkeypress", this._proxy("press", this._handle_keypress_event, el)));
                hooks.push(utils.hook(el, "onkeydown", this._proxy("down", this._handle_keyboard_event, el)));
                hooks.push(utils.hook(el, "onkeyup", this._proxy("up", this._handle_keyboard_event, el)));
                hooks.push(utils.hook(el, "ondblclick", this._proxy("dblclick", this._handle_mouse_event, el)));
                hooks.push(utils.hook(el, "onclick", this._proxy("click", this._handle_mouse_event, el)));
                hooks.push(utils.hook(el, "onmousedown", this._proxy("down", this._handle_mouse_event, el)));
                hooks.push(utils.hook(el, "onmouseup", this._proxy("up", this._handle_mouse_event, el)));
                hooks.push(utils.hook(el, "onmousemove", this._proxy("move", this._handle_mousemove_event, el)));
                this._el_hooks[el] = hooks;
            }
        },
        stop_listening_to: {

            /**
             * Stops listening to an element.
             * @param  {HTMLElement} el
             * @return {null}
             */

            value: function stop_listening_to(el) {
                if (this._el_hooks[el] !== undefined) {
                    this._el_hooks[el].forEach(function (hook) {
                        return hook.unhook();
                    });
                    delete this._el_hooks[el];
                }
            }
        },
        _handle_mouse_event: {

            /**
             * Handles when a mouse event occurs
             * @param  {HTMLElement} el
             * @param  {Event} e
             * @return {null}
             */

            value: function _handle_mouse_event(el, event_name, e) {
                e = e || window.event;
                this.trigger(this._modifier_string(e) + "mouse" + e.button + "-" + event_name, e);
            }
        },
        _handle_mousemove_event: {

            /**
             * Handles when a mouse event occurs
             * @param  {HTMLElement} el
             * @param  {Event} e
             * @return {null}
             */

            value: function _handle_mousemove_event(el, event_name, e) {
                e = e || window.event;
                this.trigger(this._modifier_string(e) + "mouse" + "-" + event_name, e);
            }
        },
        _handle_keyboard_event: {

            /**
             * Handles when a keyboard event occurs
             * @param  {HTMLElement} el
             * @param  {Event} e
             * @return {null}
             */

            value: function _handle_keyboard_event(el, event_name, e) {
                e = e || window.event;
                var keyname = this._lookup_keycode(e.keyCode);
                if (keyname !== undefined) {
                    this.trigger(this._modifier_string(e) + keyname + "-" + event_name, e);

                    if (event_name == "down") {
                        this.trigger(this._modifier_string(e) + keyname, e);
                    }
                }
                this.trigger(this._modifier_string(e) + String(e.keyCode) + "-" + event_name, e);
                this.trigger("key" + event_name, e);
            }
        },
        _handle_keypress_event: {

            /**
             * Handles when a keypress event occurs
             * @param  {HTMLElement} el
             * @param  {Event} e
             * @return {null}
             */

            value: function _handle_keypress_event(el, event_name, e) {
                this.trigger("keypress", e);
            }
        },
        _proxy: {

            /**
             * Creates an element event proxy.
             * @param  {function} f
             * @param  {string} event_name
             * @param  {HTMLElement} el
             * @return {null}
             */

            value: function _proxy(event_name, f, el) {
                var that = this;
                return function () {
                    var args = [el, event_name].concat(Array.prototype.slice.call(arguments, 0));
                    return f.apply(that, args);
                };
            }
        },
        _modifier_string: {

            /**
             * Create a modifiers string from an event.
             * @param  {Event} e
             * @return {string} dash separated modifier string
             */

            value: function _modifier_string(e) {
                var modifiers = [];
                if (e.ctrlKey) modifiers.push("ctrl");
                if (e.altKey) modifiers.push("alt");
                if (e.metaKey) modifiers.push("meta");
                if (e.shiftKey) modifiers.push("shift");
                var string = modifiers.sort().join("-");
                if (string.length > 0) string = string + "-";
                return string;
            }
        },
        _lookup_keycode: {

            /**
             * Lookup the human friendly name for a keycode.
             * @param  {integer} keycode
             * @return {string} key name
             */

            value: function _lookup_keycode(keycode) {
                if (112 <= keycode && keycode <= 123) {
                    // F1-F12
                    return "f" + (keycode - 111);
                } else if (48 <= keycode && keycode <= 57) {
                    // 0-9
                    return String(keycode - 48);
                } else if (65 <= keycode && keycode <= 90) {
                    // A-Z
                    return "abcdefghijklmnopqrstuvwxyz".substring(String(keycode - 65), String(keycode - 64));
                } else {
                    var codes = {
                        8: "backspace",
                        9: "tab",
                        13: "enter",
                        16: "shift",
                        17: "ctrl",
                        18: "alt",
                        19: "pause",
                        20: "capslock",
                        27: "esc",
                        32: "space",
                        33: "pageup",
                        34: "pagedown",
                        35: "end",
                        36: "home",
                        37: "leftarrow",
                        38: "uparrow",
                        39: "rightarrow",
                        40: "downarrow",
                        44: "printscreen",
                        45: "insert",
                        46: "delete",
                        91: "windows",
                        93: "menu",
                        144: "numlock",
                        145: "scrolllock",
                        188: "comma",
                        190: "period",
                        191: "fowardslash",
                        192: "tilde",
                        219: "leftbracket",
                        220: "backslash",
                        221: "rightbracket",
                        222: "quote" };
                    return codes[keycode];
                }
                // TODO: this function is missing some browser specific
                // keycode mappings.
            }
        }
    });

    return Normalizer;
})(utils.PosterClass);

},{"../utils.js":36}],14:[function(require,module,exports){
"use strict";

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

Object.defineProperty(exports, "__esModule", {
    value: true
});
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = _interopRequireWildcard(require("../utils.js"));

/**
 * Listens to a model and higlights the text accordingly.
 * @param {DocumentModel} model
 */

var HighlighterBase = exports.HighlighterBase = (function (_utils$PosterClass) {
    function HighlighterBase(model, row_renderer) {
        _classCallCheck(this, HighlighterBase);

        _get(Object.getPrototypeOf(HighlighterBase.prototype), "constructor", this).call(this);
        this._model = model;
        this._row_renderer = row_renderer;
        this._queued = null;
        this.delay = 15; //ms

        // Bind events.
        this._row_renderer.on("rows_changed", utils.proxy(this._handle_scroll, this));
        this._model.on("text_changed", utils.proxy(this._handle_text_change, this));
        this._model.on("row_changed", utils.proxy(this._handle_text_change, this));
    }

    _inherits(HighlighterBase, _utils$PosterClass);

    _createClass(HighlighterBase, {
        highlight: {

            /**
             * Highlight the document
             * @return {null}
             */

            value: function highlight(start_row, end_row) {
                throw new Error("Not implemented");
            }
        },
        _queue_highlighter: {

            /**
             * Queues a highlight operation.
             *
             * If a highlight operation is already queued, don't queue
             * another one.  This ensures that the highlighting is
             * frame rate locked.  Highlighting is an expensive operation.
             * @return {null}
             */

            value: function _queue_highlighter() {
                var _this = this;

                if (this._queued === null) {
                    this._queued = setTimeout(function () {
                        _this._model.acquire_tag_event_lock();
                        try {
                            var visible_rows = _this._row_renderer.get_visible_rows();
                            var top_row = visible_rows.top_row;
                            var bottom_row = visible_rows.bottom_row;
                            _this.highlight(top_row, bottom_row);
                        } finally {
                            _this._model.release_tag_event_lock();
                            _this._queued = null;
                        }
                    }, this.delay);
                }
            }
        },
        _handle_scroll: {

            /**
             * Handles when the visible row indicies are changed.
             * @return {null}
             */

            value: function _handle_scroll(start_row, end_row) {
                this._queue_highlighter();
            }
        },
        _handle_text_change: {

            /**
             * Handles when the text changes.
             * @return {null}
             */

            value: function _handle_text_change() {
                this._queue_highlighter();
            }
        }
    });

    return HighlighterBase;
})(utils.PosterClass);

},{"../utils.js":36}],15:[function(require,module,exports){
"use strict";

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

Object.defineProperty(exports, "__esModule", {
    value: true
});
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = _interopRequireWildcard(require("../utils.js"));

var superset = _interopRequireWildcard(require("../superset.js"));

var highlighter = _interopRequireWildcard(require("./highlighter.js"));

var prism = require("../../components/prism.js");

/**
 * Listens to a model and highlights the text accordingly.
 * @param {DocumentModel} model
 */

var PrismHighlighter = exports.PrismHighlighter = (function (_highlighter$HighlighterBase) {
    function PrismHighlighter(model, row_renderer) {
        _classCallCheck(this, PrismHighlighter);

        _get(Object.getPrototypeOf(PrismHighlighter.prototype), "constructor", this).call(this, model, row_renderer);

        // Look back and forward this many rows for contextually
        // sensitive highlighting.
        this._row_padding = 30;
        this._language = null;
    }

    _inherits(PrismHighlighter, _highlighter$HighlighterBase);

    _createClass(PrismHighlighter, {
        languages: {
            get: function () {
                var languages = [];
                for (var l in prism.languages) {
                    if (["extend", "insertBefore", "DFS"].indexOf(l) == -1) {
                        languages.push(l);
                    }
                }
                return languages;
            }
        },
        highlight: {

            /**
             * Highlight the document
             * @return {null}
             */

            value: function highlight(start_row, end_row) {
                var _this = this;

                // Get the first and last rows that should be highlighted.
                start_row = Math.max(0, start_row - this._row_padding);
                end_row = Math.min(this._model._rows.length - 1, end_row + this._row_padding);

                // Abort if language isn't specified.
                if (!this._language) {
                    return;
                } // Get the text of the rows.
                var text = this._model.get_text(start_row, 0, end_row, this._model._rows[end_row].length);

                // Figure out where each tag belongs.
                var highlights = this._highlight(text); // [start_index, end_index, tag]

                // Calculate Poster tags
                highlights.forEach(function (highlight) {

                    // Translate tag character indicies to row, char coordinates.
                    var before_rows = text.substring(0, highlight[0]).split("\n");
                    var group_start_row = start_row + before_rows.length - 1;
                    var group_start_char = before_rows[before_rows.length - 1].length;
                    var after_rows = text.substring(0, highlight[1]).split("\n");
                    var group_end_row = start_row + after_rows.length - 1;
                    var group_end_char = after_rows[after_rows.length - 1].length;

                    // New lines can't be highlighted.
                    while (group_start_char === _this._model._rows[group_start_row].length) {
                        if (group_start_row < group_end_row) {
                            group_start_row++;
                            group_start_char = 0;
                        } else {
                            return;
                        }
                    }
                    while (group_end_char === 0) {
                        if (group_end_row > group_start_row) {
                            group_end_row--;
                            group_end_char = _this._model._rows[group_end_row].length;
                        } else {
                            return;
                        }
                    }

                    // Apply tag if it's not already applied.
                    var tag = highlight[2].toLowerCase();
                    var existing_tags = _this._model.get_tags("syntax", group_start_row, group_start_char, group_end_row, group_end_char);

                    // Make sure the number of tags = number of rows.
                    var correct_count = existing_tags.length === group_end_row - group_start_row + 1;

                    // Make sure every tag value equals the new value.
                    var correct_values = true;
                    var i;
                    if (correct_count) {
                        for (i = 0; i < existing_tags.length; i++) {
                            if (existing_tags[i][3] !== tag) {
                                correct_values = false;
                                break;
                            }
                        }
                    }

                    // Check that the start and ends of tags are correct.
                    var correct_ranges = true;
                    if (correct_count && correct_values) {
                        if (existing_tags.length == 1) {
                            correct_ranges = existing_tags[0][1] === group_start_char && existing_tags[0][2] === group_end_char;
                        } else {
                            correct_ranges = existing_tags[0][1] <= group_start_char && existing_tags[0][2] >= _this._model._rows[group_start_row].length - 1;
                            correct_ranges = correct_ranges && existing_tags[existing_tags.length - 1][1] === 0 && existing_tags[existing_tags.length - 1][2] >= group_end_char;
                            for (i = 1; i < existing_tags.length - 1; i++) {
                                correct_ranges = correct_ranges && existing_tags[i][1] === 0 && existing_tags[i][2] >= _this._model._rows[existing_tags[i][0]].length - 1;
                                if (!correct_ranges) break;
                            }
                        }
                    }

                    if (!(correct_count && correct_values && correct_ranges)) {
                        _this._model.set_tag(group_start_row, group_start_char, group_end_row, group_end_char, "syntax", tag);
                    }
                });
            }
        },
        _highlight: {

            /**
             * Find each part of text that needs to be highlighted.
             * @param  {string} text
             * @return {array} list containing items of the form [start_index, end_index, tag]
             */

            value: function _highlight(text) {

                // Tokenize using prism.js
                var tokens = prism.tokenize(text, this._language);

                // Convert the tokens into [start_index, end_index, tag]
                var left = 0;
                var flatten = (function (_flatten) {
                    var _flattenWrapper = function flatten(_x, _x2) {
                        return _flatten.apply(this, arguments);
                    };

                    _flattenWrapper.toString = function () {
                        return _flatten.toString();
                    };

                    return _flattenWrapper;
                })(function (tokens, prefix) {
                    if (!prefix) {
                        prefix = [];
                    }
                    var flat = [];
                    for (var i = 0; i < tokens.length; i++) {
                        var token = tokens[i];
                        if (token.content) {
                            flat = flat.concat(flatten([].concat(token.content), prefix.concat(token.type)));
                        } else {
                            if (prefix.length > 0) {
                                flat.push([left, left + token.length, prefix.join(" ")]);
                            }
                            left += token.length;
                        }
                    }
                    return flat;
                });
                var tags = flatten(tokens);

                // Use a superset to reduce overlapping tags.
                var set = new superset.Superset();
                set.set(0, text.length - 1, "");
                tags.forEach(function (tag) {
                    return set.set(tag[0], tag[1] - 1, tag[2]);
                });
                return set.array;
            }
        },
        load: {

            /**
             * Loads a syntax by language name.
             * @param  {string or dictionary} language
             * @return {boolean} success
             */

            value: function load(language) {
                try {
                    // Check if the language exists.
                    if (prism.languages[language] === undefined) {
                        throw new Error("Language does not exist!");
                    }
                    this._language = prism.languages[language];
                    this._queue_highlighter();
                    return true;
                } catch (e) {
                    console.error("Error loading language", e);
                    this._language = null;
                    return false;
                }
            }
        }
    });

    return PrismHighlighter;
})(highlighter.HighlighterBase);

},{"../../components/prism.js":1,"../superset.js":35,"../utils.js":36,"./highlighter.js":14}],16:[function(require,module,exports){
"use strict";

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

Object.defineProperty(exports, "__esModule", {
    value: true
});
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = _interopRequireWildcard(require("./utils.js"));

var keymap = _interopRequireWildcard(require("./events/map.js"));

/**
 * Reversible action history.
 */

var History = exports.History = (function (_utils$PosterClass) {
    function History(map) {
        _classCallCheck(this, History);

        _get(Object.getPrototypeOf(History.prototype), "constructor", this).call(this);
        this._map = map;
        this._actions = [];
        this._action_groups = [];
        this._undone = [];
        this._autogroup = null;
        this._action_lock = false;

        keymap.Map.register("history.undo", utils.proxy(this.undo, this));
        keymap.Map.register("history.redo", utils.proxy(this.redo, this));
    }

    _inherits(History, _utils$PosterClass);

    _createClass(History, {
        push_action: {

            /**
             * Push a reversible action to the history.
             * @param  {string} forward_name - name of the forward action
             * @param  {array} forward_params - parameters to use when invoking the forward action
             * @param  {string} backward_name - name of the backward action
             * @param  {array} backward_params - parameters to use when invoking the backward action
             * @param  {float} [autogroup_delay] - time to wait to automatically group the actions.
             *                                     If this is undefined, autogrouping will not occur.
             */

            value: function push_action(forward_name, forward_params, backward_name, backward_params, autogroup_delay) {
                if (this._action_lock) {
                    return;
                }this._actions.push({
                    forward: {
                        name: forward_name,
                        parameters: forward_params },
                    backward: {
                        name: backward_name,
                        parameters: backward_params }
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
                    this._autogroup = setTimeout(function () {
                        that.group_actions();
                    }, autogroup_delay);
                }
            }
        },
        group_actions: {

            /**
             * Commit the pushed actions to one group.
             */

            value: function group_actions() {
                this._autogroup = null;
                if (this._action_lock) {
                    return;
                }this._action_groups.push(this._actions);
                this._actions = [];
                this._undone = [];
            }
        },
        undo: {

            /**
             * Undo one set of actions.
             */

            value: (function (_undo) {
                var _undoWrapper = function undo() {
                    return _undo.apply(this, arguments);
                };

                _undoWrapper.toString = function () {
                    return _undo.toString();
                };

                return _undoWrapper;
            })(function () {
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
                        undo.forEach(function (action) {
                            that._map.invoke(action.backward.name, action.backward.parameters);
                        });
                    } finally {
                        this._action_lock = false;
                    }
                }

                // Allow the action to be redone.
                this._undone.push(undo);
                return true;
            })
        },
        redo: {

            /**
             * Redo one set of actions.
             */

            value: (function (_redo) {
                var _redoWrapper = function redo() {
                    return _redo.apply(this, arguments);
                };

                _redoWrapper.toString = function () {
                    return _redo.toString();
                };

                return _redoWrapper;
            })(function () {
                if (this._undone.length > 0) {
                    var redo = this._undone.pop();

                    // Redo the actions.
                    if (!this._action_lock) {
                        this._action_lock = true;
                        try {
                            var that = this;
                            redo.forEach(function (action) {
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
            })
        }
    });

    return History;
})(utils.PosterClass);

},{"./events/map.js":12,"./utils.js":36}],17:[function(require,module,exports){
"use strict";

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

Object.defineProperty(exports, "__esModule", {
    value: true
});
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var plugin = _interopRequireWildcard(require("../plugin.js"));

var utils = _interopRequireWildcard(require("../../utils.js"));

var renderer = _interopRequireWildcard(require("./renderer.js"));

/**
 * Gutter plugin.
 */

var Gutter = exports.Gutter = (function (_plugin$PluginBase) {
    function Gutter() {
        _classCallCheck(this, Gutter);

        _get(Object.getPrototypeOf(Gutter.prototype), "constructor", this).call(this);
        this.on("load", this._handle_load, this);
        this.on("unload", this._handle_unload, this);

        this._gutter_width = 50;
    }

    _inherits(Gutter, _plugin$PluginBase);

    _createClass(Gutter, {
        gutter_width: {

            // Create a gutter_width property that is adjustable.

            get: function () {
                return this._gutter_width;
            },
            set: function (value) {
                return this._set_width(value);
            }
        },
        renderer: {
            get: function () {
                return this._renderer;
            }
        },
        _set_width: {

            /**
             * Sets the gutter's width.
             * @param {integer} value - width in pixels
             */

            value: function _set_width(value) {
                if (this._gutter_width !== value) {
                    if (this.loaded) {
                        this.poster.view.row_renderer.margin_left += value - this._gutter_width;
                    }
                    this._gutter_width = value;
                    this.trigger("changed");
                }
            }
        },
        _handle_load: {

            /**
             * Handles when the plugin is loaded.
             */

            value: function _handle_load() {
                this.poster.view.row_renderer.margin_left += this._gutter_width;
                this._renderer = new renderer.GutterRenderer(this);
                this.register_renderer(this._renderer);
            }
        },
        _handle_unload: {

            /**
             * Handles when the plugin is unloaded.
             */

            value: function _handle_unload() {
                // Remove all listeners to this plugin's changed event.
                this._renderer.unregister();
                this.poster.view.row_renderer.margin_left -= this._gutter_width;
            }
        }
    });

    return Gutter;
})(plugin.PluginBase);

},{"../../utils.js":36,"../plugin.js":22,"./renderer.js":18}],18:[function(require,module,exports){
"use strict";

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

Object.defineProperty(exports, "__esModule", {
    value: true
});
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var renderer = _interopRequireWildcard(require("../../renderers/renderer.js"));

var utils = _interopRequireWildcard(require("../../utils.js"));

/**
 * Renderers the gutter.
 */

var GutterRenderer = exports.GutterRenderer = (function (_renderer$RendererBase) {
    function GutterRenderer(gutter) {
        var _this = this;

        _classCallCheck(this, GutterRenderer);

        _get(Object.getPrototypeOf(GutterRenderer.prototype), "constructor", this).call(this, undefined, { parent_independent: true });
        this._gutter = gutter;
        this._gutter.on("changed", function () {
            _this._render();
            _this.trigger("changed");
        });
        this._hovering = false;
    }

    _inherits(GutterRenderer, _renderer$RendererBase);

    _createClass(GutterRenderer, {
        render: {

            /**
             * Handles rendering
             * Only re-render when scrolled horizontally.
             */

            value: function render(scroll) {
                // Scrolled right xor hovering
                var left = this._gutter.poster.canvas.scroll_left;
                if (left > 0 ^ this._hovering) {
                    this._hovering = left > 0;
                    this._render();
                }
            }
        },
        _render: {

            /**
             * Renders the gutter
             */

            value: function _render() {
                this._canvas.clear();
                var width = this._gutter.gutter_width;
                this._canvas.draw_rectangle(0, 0, width, this.height, {
                    fill_color: this._gutter.poster.style.gutter });

                // If the gutter is hovering over content, draw a drop shadow.
                if (this._hovering) {
                    var shadow_width = 15;
                    var gradient = this._canvas.gradient(width, 0, width + shadow_width, 0, this._gutter.poster.style.gutter_shadow || [[0, "black"], [1, "transparent"]]);
                    this._canvas.draw_rectangle(width, 0, shadow_width, this.height, {
                        fill_color: gradient,
                        alpha: 0.35 });
                }
            }
        },
        unregister: {

            /**
             * Unregister the event listeners
             * @param  {Poster} poster
             * @param  {Gutter} gutter
             */

            value: function unregister() {
                this._gutter.off("changed", this._render);
            }
        }
    });

    return GutterRenderer;
})(renderer.RendererBase);

},{"../../renderers/renderer.js":28,"../../utils.js":36}],19:[function(require,module,exports){
"use strict";

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

Object.defineProperty(exports, "__esModule", {
    value: true
});
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var plugin = _interopRequireWildcard(require("../plugin.js"));

var utils = _interopRequireWildcard(require("../../utils.js"));

var renderer = _interopRequireWildcard(require("./renderer.js"));

/**
 * Line numbers plugin.
 */

var LineNumbers = exports.LineNumbers = (function (_plugin$PluginBase) {
    function LineNumbers() {
        _classCallCheck(this, LineNumbers);

        _get(Object.getPrototypeOf(LineNumbers.prototype), "constructor", this).call(this);
        this.on("load", this._handle_load, this);
        this.on("unload", this._handle_unload, this);
    }

    _inherits(LineNumbers, _plugin$PluginBase);

    _createClass(LineNumbers, {
        _handle_load: {

            /**
             * Handles when the plugin is loaded.
             */

            value: function _handle_load() {
                this._renderer = new renderer.LineNumbersRenderer(this);
                this.register_renderer(this._renderer);
            }
        },
        _handle_unload: {

            /**
             * Handles when the plugin is unloaded.
             */

            value: function _handle_unload() {
                // Remove all listeners to this plugin's changed event.
                this._renderer.unregister();
            }
        }
    });

    return LineNumbers;
})(plugin.PluginBase);

},{"../../utils.js":36,"../plugin.js":22,"./renderer.js":20}],20:[function(require,module,exports){
"use strict";

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

Object.defineProperty(exports, "__esModule", {
    value: true
});
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var renderer = _interopRequireWildcard(require("../../renderers/renderer.js"));

var utils = _interopRequireWildcard(require("../../utils.js"));

var canvas = _interopRequireWildcard(require("../../canvas.js"));

/**
 * Renderers the line numbers.
 */

var LineNumbersRenderer = exports.LineNumbersRenderer = (function (_renderer$RendererBase) {
    function LineNumbersRenderer(plugin) {
        _classCallCheck(this, LineNumbersRenderer);

        _get(Object.getPrototypeOf(LineNumbersRenderer.prototype), "constructor", this).call(this, undefined, { parent_independent: true });
        this._plugin = plugin;
        this._top = null;
        this._top_row = null;
        this._character_width = null;
        this._last_row_count = null;

        // Find gutter plugin, listen to its change event.
        var manager = this._plugin.poster.plugins;
        this._gutter = manager.find("gutter")[0];
        this._gutter.renderer.on("changed", this._gutter_resize, this);

        // Get row renderer.
        this._row_renderer = this._plugin.poster.view.row_renderer;

        // Double buffer.
        this._text_canvas = new canvas.Canvas();
        this._tmp_canvas = new canvas.Canvas();
        this._text_canvas.width = this._gutter.gutter_width;
        this._tmp_canvas.width = this._gutter.gutter_width;

        this.height = this.height;

        // Adjust the gutter size when the number of lines in the document changes.
        this._plugin.poster.model.on("text_changed", utils.proxy(this._handle_text_change, this));
        this._plugin.poster.model.on("rows_added", utils.proxy(this._handle_text_change, this));
        this._plugin.poster.model.on("rows_removed", utils.proxy(this._handle_text_change, this));
        this._handle_text_change();
    }

    _inherits(LineNumbersRenderer, _renderer$RendererBase);

    _createClass(LineNumbersRenderer, {
        height: {
            get: function () {
                return this._canvas.height;
            },
            set: function (value) {
                // Adjust every buffer's size when the height changes.
                this._canvas.height = value;

                // The text canvas should be the right height to fit all of the lines
                // that will be rendered in the base canvas.  This includes the lines
                // that are partially rendered at the top and bottom of the base canvas.
                var row_height = this._row_renderer.get_row_height();
                this._row_height = row_height;
                this._visible_row_count = Math.ceil(value / row_height) + 1;
                this._text_canvas.height = this._visible_row_count * row_height;
                this._tmp_canvas.height = this._text_canvas.height;
                this.rerender();
                this.trigger("changed");
            }
        },
        render: {

            /**
             * Handles rendering
             * Only re-render when scrolled vertically.
             */

            value: function render(scroll) {
                var top = this._gutter.poster.canvas.scroll_top;
                if (this._top === null || this._top !== top) {
                    this._top = top;
                    this._render();
                }
            }
        },
        _render: {

            /**
             * Renders the line numbers
             */

            value: function _render() {
                // Measure the width of numerical characters if not done yet.
                if (this._character_width === null) {
                    this._character_width = this._text_canvas.measure_text("0123456789", {
                        font_family: "monospace",
                        font_size: 14 }) / 10;
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
                this._canvas.draw_image(this._text_canvas, 0, this._row_renderer.get_row_top(this._top_row) - this._row_renderer.top);
            }
        },
        rerender: {
            value: function rerender() {
                // Draw everything.
                this._character_width = null;
                this._text_canvas.erase_options_cache();
                this._text_canvas.clear();
                this._render_rows(this._top_row, this._visible_row_count);

                // Render the buffer at the correct offset.
                this._canvas.clear();
                this._canvas.draw_image(this._text_canvas, 0, this._row_renderer.get_row_top(this._top_row) - this._row_renderer.top);
            }
        },
        _render_rows: {

            /**
             * Renders a set of line numbers.
             * @param  {integer} start_row
             * @param  {integer} num_rows
             */

            value: function _render_rows(start_row, num_rows) {
                var lines = this._plugin.poster.model._rows.length;
                for (var i = start_row; i < start_row + num_rows; i++) {
                    if (i < lines) {
                        var y = (i - this._top_row) * this._row_height;
                        if (this._plugin.poster.config.highlight_draw) {
                            this._text_canvas.draw_rectangle(0, y, this._text_canvas.width, this._row_height, {
                                fill_color: utils.random_color() });
                        }

                        this._text_canvas.draw_text(10, y, String(i + 1), {
                            font_family: "monospace",
                            font_size: 14,
                            color: this._plugin.poster.style.gutter_text || "black" });
                    }
                }
            }
        },
        _handle_text_change: {

            /**
             * Handles when the number of lines in the editor changes.
             */

            value: function _handle_text_change() {
                var lines = this._plugin.poster.model._rows.length;
                var digit_width = Math.max(2, Math.ceil(Math.log10(lines + 1)) + 1);
                var char_width = this._character_width || 10;
                this._gutter.gutter_width = digit_width * char_width + 8;

                if (lines !== this._last_row_count) {
                    this.rerender();
                    this.trigger("changed");
                }
            }
        },
        _gutter_resize: {

            /**
             * Handles when the gutter is resized
             */

            value: function _gutter_resize() {
                this._text_canvas.width = this._gutter.gutter_width;
                this._tmp_canvas.width = this._gutter.gutter_width;
                this.rerender();
                this.trigger("changed");
            }
        },
        unregister: {

            /**
             * Unregister the event listeners
             * @param  {Poster} poster
             * @param  {Gutter} gutter
             */

            value: function unregister() {
                this._gutter.off("changed", this._render);
            }
        }
    });

    return LineNumbersRenderer;
})(renderer.RendererBase);

},{"../../canvas.js":3,"../../renderers/renderer.js":28,"../../utils.js":36}],21:[function(require,module,exports){
"use strict";

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

Object.defineProperty(exports, "__esModule", {
    value: true
});
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = _interopRequireWildcard(require("../utils.js"));

var pluginbase = _interopRequireWildcard(require("./plugin.js"));

var gutter = _interopRequireWildcard(require("./gutter/gutter.js"));

var linenumbers = _interopRequireWildcard(require("./linenumbers/linenumbers.js"));

/**
 * Plugin manager class
 */

var PluginManager = exports.PluginManager = (function (_utils$PosterClass) {
    function PluginManager(poster) {
        _classCallCheck(this, PluginManager);

        _get(Object.getPrototypeOf(PluginManager.prototype), "constructor", this).call(this);
        this._poster = poster;

        // Populate built-in plugin list.
        this._internal_plugins = {};
        this._internal_plugins.gutter = gutter.Gutter;
        this._internal_plugins.linenumbers = linenumbers.LineNumbers;

        // Properties
        this._plugins = [];
    }

    _inherits(PluginManager, _utils$PosterClass);

    _createClass(PluginManager, {
        plugins: {
            get: function () {
                return [].concat(that._plugins);
            }
        },
        load: {

            /**
             * Loads a plugin
             * @param  {string or PluginBase} plugin
             * @returns {boolean} success
             */

            value: function load(plugin) {
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
            }
        },
        unload: {

            /**
             * Unloads a plugin
             * @param  {PluginBase} plugin
             * @returns {boolean} success
             */

            value: function unload(plugin) {
                var index = this._plugins.indexOf(plugin);
                if (index != -1) {
                    this._plugins.splice(index, 1);
                    plugin._unload();
                    return true;
                }
                return false;
            }
        },
        find: {

            /**
             * Finds the instance of a plugin.
             * @param  {string or type} plugin_class - name of internal plugin or plugin class
             * @return {array} of plugin instances
             */

            value: function find(plugin_class) {
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
            }
        }
    });

    return PluginManager;
})(utils.PosterClass);

},{"../utils.js":36,"./gutter/gutter.js":17,"./linenumbers/linenumbers.js":19,"./plugin.js":22}],22:[function(require,module,exports){
"use strict";

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

Object.defineProperty(exports, "__esModule", {
    value: true
});
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = _interopRequireWildcard(require("../utils.js"));

/**
 * Plugin base class
 */

var PluginBase = exports.PluginBase = (function (_utils$PosterClass) {
    function PluginBase() {
        var _this = this;

        _classCallCheck(this, PluginBase);

        _get(Object.getPrototypeOf(PluginBase.prototype), "constructor", this).call(this);
        this._renderers = [];
        this.loaded = false;

        // Properties
        this._poster = null;
        this.property("poster", function () {
            return _this._poster;
        });
    }

    _inherits(PluginBase, _utils$PosterClass);

    _createClass(PluginBase, {
        _load: {

            /**
             * Loads the plugin
             */

            value: function _load(manager, poster) {
                this._poster = poster;
                this._manager = manager;
                this.loaded = true;

                this.trigger("load");
            }
        },
        unload: {

            /**
             * Unloads this plugin
             */

            value: function unload() {
                this._manager.unload(this);
            }
        },
        _unload: {

            /**
             * Trigger unload event
             */

            value: function _unload() {
                // Unregister all renderers.
                for (var i = 0; i < this._renderers.length; i++) {
                    this._unregister_renderer(this._renderers[i]);
                }
                this.loaded = false;
                this.trigger("unload");
            }
        },
        register_renderer: {

            /**
             * Registers a renderer
             * @param  {RendererBase} renderer
             */

            value: function register_renderer(renderer) {
                this._renderers.push(renderer);
                this.poster.view.add_renderer(renderer);
            }
        },
        unregister_renderer: {

            /**
             * Unregisters a renderer and removes it from the internal list.
             * @param  {RendererBase} renderer
             */

            value: function unregister_renderer(renderer) {
                var index = this._renderers.indexOf(renderer);
                if (index !== -1) {
                    this._renderers.splice(index, 1);
                }

                this._unregister_renderer(renderer);
            }
        },
        _unregister_renderer: {

            /**
             * Unregisters a renderer
             * @param  {RendererBase} renderer
             */

            value: function _unregister_renderer(renderer) {
                this.poster.view.remove_renderer(renderer);
            }
        }
    });

    return PluginBase;
})(utils.PosterClass);

},{"../utils.js":36}],23:[function(require,module,exports){
"use strict";

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var scrolling_canvas = _interopRequireWildcard(require("./scrolling_canvas.js"));

var canvas = _interopRequireWildcard(require("./canvas.js"));

var document_controller = _interopRequireWildcard(require("./document_controller.js"));

var document_model = _interopRequireWildcard(require("./document_model.js"));

var document_view = _interopRequireWildcard(require("./document_view.js"));

var pluginmanager = _interopRequireWildcard(require("./plugins/manager.js"));

var plugin = _interopRequireWildcard(require("./plugins/plugin.js"));

var renderer = _interopRequireWildcard(require("./renderers/renderer.js"));

var style = _interopRequireWildcard(require("./style.js"));

var utils = _interopRequireWildcard(require("./utils.js"));

var config = _interopRequireWildcard(require("./config.js"));

config = config.config;

/**
 * Canvas based text editor
 */

var Poster = (function (_utils$PosterClass) {
    function Poster() {
        var _this = this;

        _classCallCheck(this, Poster);

        _get(Object.getPrototypeOf(Poster.prototype), "constructor", this).call(this);

        // Create canvas
        this.canvas = new scrolling_canvas.ScrollingCanvas();
        this.el = this.canvas.el; // Convenience
        this._style = new style.Style();

        // Create model, controller, and view.
        this.model = new document_model.DocumentModel();
        this.controller = new document_controller.DocumentController(this.canvas.el, this.model);
        this.view = new document_view.DocumentView(this.canvas, this.model, this.controller.cursors, this._style, function () {
            return _this.controller.clipboard.hidden_input === document.activeElement || _this.canvas.focused;
        });

        // Load plugins.
        this.plugins = new pluginmanager.PluginManager(this);
        this.plugins.load("gutter");
        this.plugins.load("linenumbers");
    }

    _inherits(Poster, _utils$PosterClass);

    _createClass(Poster, {
        style: {
            get: function () {
                return this._style;
            }
        },
        config: {
            get: function () {
                return config;
            }
        },
        value: {
            get: function () {
                return this.model.text;
            },
            set: function (value) {
                this.model.text = value;
            }
        },
        width: {
            get: function () {
                return this.view.width;
            },
            set: function (value) {
                this.view.width = value;
                this.trigger("resized");
            }
        },
        height: {
            get: function () {
                return this.view.height;
            },
            set: function (value) {
                this.view.height = value;
                this.trigger("resized");
            }
        },
        language: {
            get: function () {
                return this.view.language;
            },
            set: function (value) {
                this.view.language = value;
            }
        }
    });

    return Poster;
})(utils.PosterClass);

// Exports
window.poster = {
    Poster: Poster,
    Canvas: plugin.PluginBase,
    PluginBase: plugin.PluginBase,
    RendererBase: renderer.RendererBase,
    utils: utils
};

},{"./canvas.js":3,"./config.js":5,"./document_controller.js":8,"./document_model.js":9,"./document_view.js":10,"./plugins/manager.js":21,"./plugins/plugin.js":22,"./renderers/renderer.js":28,"./scrolling_canvas.js":31,"./style.js":32,"./utils.js":36}],24:[function(require,module,exports){
"use strict";

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

Object.defineProperty(exports, "__esModule", {
    value: true
});
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = _interopRequireWildcard(require("../utils.js"));

var renderer = _interopRequireWildcard(require("./renderer.js"));

var config = _interopRequireWildcard(require("../config.js"));

config = config.config;

/**
 * Groups multiple renderers
 * @param {array} renderers - array of renderers
 * @param {Canvas} canvas
 */

var BatchRenderer = exports.BatchRenderer = (function (_renderer$RendererBase) {
    function BatchRenderer(renderers, canvas) {
        var _this = this;

        _classCallCheck(this, BatchRenderer);

        _get(Object.getPrototypeOf(BatchRenderer.prototype), "constructor", this).call(this, canvas);
        this._render_lock = false;
        this._renderers = renderers;

        // Listen to the layers, if one layer changes, recompose
        // the full image by copying them all again.
        this._renderers.forEach(function (renderer) {
            renderer.on("changed", function () {
                var rendered_region = renderer._canvas.rendered_region;
                _this._copy_renderers(rendered_region);
            });
        });
    }

    _inherits(BatchRenderer, _renderer$RendererBase);

    _createClass(BatchRenderer, {
        width: {
            get: function () {
                return this._canvas.width;
            },
            set: function (value) {
                this._canvas.width = value;
                this._renderers.forEach(function (renderer) {
                    renderer.width = value;
                });
            }
        },
        height: {
            get: function () {
                return this._canvas.height;
            },
            set: function (value) {
                this._canvas.height = value;
                this._renderers.forEach(function (renderer) {
                    renderer.height = value;
                });
            }
        },
        add_renderer: {

            /**
             * Adds a renderer
             */

            value: function add_renderer(renderer) {
                var _this = this;

                this._renderers.push(renderer);
                renderer.on("changed", function () {
                    var rendered_region = renderer._canvas.rendered_region;
                    _this._copy_renderers(rendered_region);
                });
            }
        },
        remove_renderer: {

            /**
             * Removes a renderer
             */

            value: function remove_renderer(renderer) {
                var index = this._renderers.indexOf(renderer);
                if (index !== -1) {
                    this._renderers.splice(index, 1);
                    renderer.off("changed");
                }
            }
        },
        render: {

            /**
             * Render to the canvas
             * @param {dictionary} (optional) scroll - How much the canvas was scrolled.  This
             *                     is a dictionary of the form {x: float, y: float}
             * @return {null}
             */

            value: function render(scroll) {
                var _this = this;

                if (!this._render_lock) {
                    try {
                        this._render_lock = true;

                        this._renderers.forEach(function (renderer) {

                            // Apply the rendering coordinate transforms of the parent.
                            if (!renderer.options.parent_independent) {
                                renderer._canvas._tx = utils.proxy(_this._canvas._tx, _this._canvas);
                                renderer._canvas._ty = utils.proxy(_this._canvas._ty, _this._canvas);
                            }
                        });

                        // Tell each renderer to render and keep track of the region
                        // that has freshly rendered contents.
                        var rendered_region = null;
                        this._renderers.forEach(function (renderer) {
                            // Tell the renderer to render itself.
                            renderer.render(scroll);

                            var new_region = renderer._canvas.rendered_region;
                            if (rendered_region === null) {
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
            }
        },
        _copy_renderers: {

            /**
             * Copies all the renderer layers to the canvas.
             * @return {null}
             */

            value: function _copy_renderers(region) {
                var _this = this;

                this._canvas.clear(region);
                this._renderers.forEach(function (renderer) {
                    return _this._copy_renderer(renderer, region);
                });

                // Debug, higlight blit region.
                if (region && config.highlight_blit) {
                    this._canvas.draw_rectangle(region.x, region.y, region.width, region.height, { color: utils.random_color() });
                }
            }
        },
        _copy_renderer: {

            /**
             * Copy a renderer to the canvas.
             * @param  {RendererBase} renderer
             * @param  {object} (optional) region 
             */

            value: function _copy_renderer(renderer, region) {
                if (region) {

                    // Copy a region.
                    this._canvas.draw_image(renderer._canvas, region.x, region.y, region.width, region.height, region);
                } else {

                    // Copy the entire image.
                    this._canvas.draw_image(renderer._canvas, this.left, this.top, this._canvas.width, this._canvas.height);
                }
            }
        }
    });

    return BatchRenderer;
})(renderer.RendererBase);

},{"../config.js":5,"../utils.js":36,"./renderer.js":28}],25:[function(require,module,exports){
"use strict";

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

Object.defineProperty(exports, "__esModule", {
    value: true
});
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = _interopRequireWildcard(require("../utils.js"));

var renderer = _interopRequireWildcard(require("./renderer.js"));

/**
 * Renders to a canvas
 * @param {Canvas} default_canvas
 */

var ColorRenderer = exports.ColorRenderer = (function (_renderer$RendererBase) {
    function ColorRenderer() {
        _classCallCheck(this, ColorRenderer);

        // Create with the option 'parent_independent' to disable
        // parent coordinate translations from being applied by
        // a batch renderer.
        _get(Object.getPrototypeOf(ColorRenderer.prototype), "constructor", this).call(this, undefined, { parent_independent: true });
        this._rendered = false;
    }

    _inherits(ColorRenderer, _renderer$RendererBase);

    _createClass(ColorRenderer, {
        width: {
            get: function () {
                return this._canvas.width;
            },
            set: function (value) {
                this._canvas.width = value;
                this._render();

                // Tell parent layer this one has changed.
                this.trigger("changed");
            }
        },
        height: {
            get: function () {
                return this._canvas.height;
            },
            set: function (value) {
                this._canvas.height = value;
                this._render();

                // Tell parent layer this one has changed.
                this.trigger("changed");
            }
        },
        color: {
            get: function () {
                return this._color;
            },
            set: function (value) {
                this._color = value;
                this._render();

                // Tell parent layer this one has changed.
                this.trigger("changed");
            }
        },
        render: {

            /**
             * Render to the canvas
             * @param {dictionary} (optional) scroll - How much the canvas was scrolled.  This
             *                     is a dictionary of the form {x: float, y: float}
             * @return {null}
             */

            value: function render(scroll) {
                if (!this._rendered) {
                    this._render();
                    this._rendered = true;
                }
            }
        },
        _render: {

            /**
             * Render a frame.
             * @return {null}
             */

            value: function _render() {
                this._canvas.clear();
                this._canvas.draw_rectangle(0, 0, this._canvas.width, this._canvas.height, { fill_color: this._color });
            }
        }
    });

    return ColorRenderer;
})(renderer.RendererBase);

},{"../utils.js":36,"./renderer.js":28}],26:[function(require,module,exports){
"use strict";

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

Object.defineProperty(exports, "__esModule", {
    value: true
});
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var animator = _interopRequireWildcard(require("../animator.js"));

var utils = _interopRequireWildcard(require("../utils.js"));

var renderer = _interopRequireWildcard(require("./renderer.js"));

/**
 * Render document cursors
 *
 * TODO: Only render visible.
 */

var CursorsRenderer = exports.CursorsRenderer = (function (_renderer$RendererBase) {
    function CursorsRenderer(cursors, style, row_renderer, has_focus) {
        var _this = this;

        _classCallCheck(this, CursorsRenderer);

        _get(Object.getPrototypeOf(CursorsRenderer.prototype), "constructor", this).call(this);
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
        var rerender = function () {
            _this._blink_animator.reset();
            _this.render();
            // Tell parent layer this one has changed.
            _this.trigger("changed");
        };
        this._cursors.on("change", rerender);
    }

    _inherits(CursorsRenderer, _renderer$RendererBase);

    _createClass(CursorsRenderer, {
        render: {

            /**
             * Render to the canvas
             * Note: This method is called often, so it's important that it's
             * optimized for speed.
             * @return {null}
             */

            value: function render(scroll) {
                var _this = this;

                // Remove the previously drawn cursors, if any.
                if (scroll !== undefined) {
                    this._canvas.clear();
                    utils.clear_array(this._last_drawn_cursors);
                } else {
                    if (this._last_drawn_cursors.length > 0) {
                        this._last_drawn_cursors.forEach(function (cursor_box) {

                            // Remove 1px space around the cursor box too for anti-aliasing.
                            _this._canvas.clear({
                                x: cursor_box.x - 1,
                                y: cursor_box.y - 1,
                                width: cursor_box.width + 2,
                                height: cursor_box.height + 2 });
                        });
                        utils.clear_array(this._last_drawn_cursors);
                    }
                }

                // Only render if the canvas has focus.
                if (this._has_focus() && this._blink_animator.time() < 0.5) {
                    this._cursors.cursors.forEach(function (cursor) {
                        // Get the visible rows.
                        var visible_rows = _this._get_visible_rows();

                        // If a cursor doesn't have a position, render it at the
                        // beginning of the document.
                        var row_index = cursor.primary_row || 0;
                        var char_index = cursor.primary_char || 0;

                        // Draw the cursor.
                        var height = _this._get_row_height(row_index);
                        var multiplier = _this.style.cursor_height || 1;
                        var offset = (height - multiplier * height) / 2;
                        height *= multiplier;
                        if (visible_rows.top_row <= row_index && row_index <= visible_rows.bottom_row) {
                            var cursor_box = {
                                x: char_index === 0 ? _this._row_renderer.margin_left : _this._measure_partial_row(row_index, char_index) + _this._row_renderer.margin_left,
                                y: _this._get_row_top(row_index) + offset,
                                width: _this.style.cursor_width === undefined ? 1 : _this.style.cursor_width,
                                height: height };
                            _this._last_drawn_cursors.push(cursor_box);

                            _this._canvas.draw_rectangle(cursor_box.x, cursor_box.y, cursor_box.width, cursor_box.height, {
                                fill_color: _this.style.cursor || "back" });
                        }
                    });
                }
                this._last_rendered = Date.now();
            }
        },
        _render_clock: {

            /**
             * Clock for rendering the cursor.
             * @return {null}
             */

            value: function _render_clock() {
                // If the canvas is focused, redraw.
                if (this._has_focus()) {
                    var first_render = !this._was_focused;
                    this._was_focused = true;
                    this.render();
                    // Tell parent layer this one has changed.
                    this.trigger("changed");
                    if (first_render) this.trigger("toggle");

                    // The canvas isn't focused.  If this is the first time
                    // it hasn't been focused, render again without the
                    // cursors.
                } else if (this._was_focused) {
                    this._was_focused = false;
                    this.render();
                    // Tell parent layer this one has changed.
                    this.trigger("changed");
                    this.trigger("toggle");
                }

                // Timer.
                setTimeout(utils.proxy(this._render_clock, this), 1000 / this._fps);
            }
        }
    });

    return CursorsRenderer;
})(renderer.RendererBase);

},{"../animator.js":2,"../utils.js":36,"./renderer.js":28}],27:[function(require,module,exports){
"use strict";

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

Object.defineProperty(exports, "__esModule", {
    value: true
});
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = _interopRequireWildcard(require("../utils.js"));

var row = _interopRequireWildcard(require("./row.js"));

var config = _interopRequireWildcard(require("../config.js"));

config = config.config;

/**
 * Render the text rows of a DocumentModel.
 * @param {DocumentModel} model instance
 */

var HighlightedRowRenderer = exports.HighlightedRowRenderer = (function (_row$RowRenderer) {
    function HighlightedRowRenderer(model, scrolling_canvas, style) {
        var _this = this;

        _classCallCheck(this, HighlightedRowRenderer);

        _get(Object.getPrototypeOf(HighlightedRowRenderer.prototype), "constructor", this).call(this, model, scrolling_canvas);
        this.style = style;

        model.on("tags_changed", function (rows) {
            var row_visible = false;
            if (rows) {
                var visible_rows = _this.get_visible_rows();
                for (var i = 0; i < rows.length; i++) {
                    if (visible_rows.top_row <= rows[i] && rows[i] <= visible_rows.bottom_row) {
                        row_visible = true;
                        break;
                    }
                }
            }

            // If at least one of the rows whos tags changed is visible,
            // re-render.
            if (row_visible) {
                _this.render();
                _this.trigger("changed");
            }
        });
    }

    _inherits(HighlightedRowRenderer, _row$RowRenderer);

    _createClass(HighlightedRowRenderer, {
        _render_row: {

            /**
             * Render a single row
             * @param  {integer} index
             * @param  {float} x
             * @param  {float} y
             * @return {null}
             */

            value: function _render_row(index, x, y) {
                if (index < 0 || this._model._rows.length <= index) {
                    return;
                }var groups = this._get_groups(index);
                var left = x;
                for (var i = 0; i < groups.length; i++) {
                    var width = this._text_canvas.measure_text(groups[i].text, groups[i].options);

                    if (config.highlight_draw) {
                        this._text_canvas.draw_rectangle(left, y, width, this.get_row_height(i), {
                            fill_color: utils.random_color() });
                    }

                    this._text_canvas.draw_text(left, y, groups[i].text, groups[i].options);
                    left += width;
                }
            }
        },
        _get_groups: {

            /**
             * Get render groups for a row.
             * @param  {integer} index of the row
             * @return {array} array of renderings, each rendering is an array of
             *                 the form {options, text}.
             */

            value: function _get_groups(index) {
                if (index < 0 || this._model._rows.length <= index) {
                    return;
                }var row_text = this._model._rows[index];
                var groups = [];
                var last_syntax = null;
                var char_index = 0;
                var start = 0;
                for (char_index; char_index < row_text.length; char_index++) {
                    var syntax = this._model.get_tag_value("syntax", index, char_index);
                    if (!this._compare_syntax(last_syntax, syntax)) {
                        if (char_index !== 0) {
                            groups.push({ options: this._get_options(last_syntax), text: row_text.substring(start, char_index) });
                        }
                        last_syntax = syntax;
                        start = char_index;
                    }
                }
                groups.push({ options: this._get_options(last_syntax), text: row_text.substring(start) });

                return groups;
            }
        },
        _get_options: {

            /**
             * Creates a style options dictionary from a syntax tag.
             * @param  {string} syntax
             * @return {null}
             */

            value: function _get_options(syntax) {
                var render_options = utils.shallow_copy(this._base_options);

                // Highlight if a sytax item and style are provided.
                if (this.style) {

                    // If this is a nested syntax item, use the most specific part
                    // which is defined in the active style.
                    if (syntax && syntax.indexOf(" ") != -1) {
                        var parts = syntax.split(" ");
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
                        render_options.color = this.style.text || "black";
                    }
                }

                return render_options;
            }
        },
        _compare_syntax: {

            /**
             * Compare two syntaxs.
             * @param  {string} a - syntax
             * @param  {string} b - syntax
             * @return {bool} true if a and b are equal
             */

            value: function _compare_syntax(a, b) {
                return a === b;
            }
        }
    });

    return HighlightedRowRenderer;
})(row.RowRenderer);

},{"../config.js":5,"../utils.js":36,"./row.js":29}],28:[function(require,module,exports){
"use strict";

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

Object.defineProperty(exports, "__esModule", {
    value: true
});
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var canvas = _interopRequireWildcard(require("../canvas.js"));

var utils = _interopRequireWildcard(require("../utils.js"));

/**
 * Renders to a canvas
 * @param {Canvas} default_canvas
 */

var RendererBase = exports.RendererBase = (function (_utils$PosterClass) {
    function RendererBase(default_canvas, options) {
        _classCallCheck(this, RendererBase);

        _get(Object.getPrototypeOf(RendererBase.prototype), "constructor", this).call(this);
        this.options = options || {};
        this._canvas = default_canvas ? default_canvas : new canvas.Canvas();
    }

    _inherits(RendererBase, _utils$PosterClass);

    _createClass(RendererBase, {
        width: {
            get: function () {
                return this._canvas.width;
            },
            set: function (value) {
                this._canvas.width = value;
            }
        },
        height: {
            get: function () {
                return this._canvas.height;
            },
            set: function (value) {
                this._canvas.height = value;
            }
        },
        top: {
            get: function () {
                return -this._canvas._ty(0);
            }
        },
        left: {
            get: function () {
                return -this._canvas._tx(0);
            }
        },
        render: {

            /**
             * Render to the canvas
             * @param {dictionary} (optional) scroll - How much the canvas was scrolled.  This
             *                     is a dictionary of the form {x: float, y: float}
             * @return {null}
             */

            value: function render(scroll) {
                throw new Error("Not implemented");
            }
        }
    });

    return RendererBase;
})(utils.PosterClass);

},{"../canvas.js":3,"../utils.js":36}],29:[function(require,module,exports){
"use strict";

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

Object.defineProperty(exports, "__esModule", {
    value: true
});
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var canvas = _interopRequireWildcard(require("../canvas.js"));

var utils = _interopRequireWildcard(require("../utils.js"));

var renderer = _interopRequireWildcard(require("./renderer.js"));

/**
 * Render the text rows of a DocumentModel.
 * @param {DocumentModel} model instance
 */

var RowRenderer = exports.RowRenderer = (function (_renderer$RendererBase) {
    function RowRenderer(model, scrolling_canvas) {
        _classCallCheck(this, RowRenderer);

        this._model = model;
        this._visible_row_count = 0;

        // Setup canvases
        this._text_canvas = new canvas.Canvas();
        this._tmp_canvas = new canvas.Canvas();
        this._scrolling_canvas = scrolling_canvas;
        this._row_width_counts = {}; // Dictionary of widths -> row count

        // Base
        _get(Object.getPrototypeOf(RowRenderer.prototype), "constructor", this).call(this);

        // Set some basic rendering properties.
        this._base_options = {
            font_family: "monospace",
            font_size: 14 };
        this._line_spacing = 2;

        // Set initial canvas sizes.  These lines may look redundant, but beware
        // because they actually cause an appropriate width and height to be set for
        // the text canvas because of the properties declared above.
        this.width = this._canvas.width;
        this.height = this._canvas.height;

        this._margin_left = 0;
        this._margin_top = 0;

        this._model.on("text_changed", utils.proxy(this._handle_value_changed, this));
        this._model.on("rows_added", utils.proxy(this._handle_rows_added, this));
        this._model.on("rows_removed", utils.proxy(this._handle_rows_removed, this));
        this._model.on("row_changed", utils.proxy(this._handle_row_changed, this)); // TODO: Implement my event.
    }

    _inherits(RowRenderer, _renderer$RendererBase);

    _createClass(RowRenderer, {
        width: {
            get: function () {
                return this._canvas.width;
            },
            set: function (value) {
                this._canvas.width = value;
                this._text_canvas.width = value;
                this._tmp_canvas.width = value;
            }
        },
        height: {
            get: function () {
                return this._canvas.height;
            },
            set: function (value) {
                this._canvas.height = value;

                // The text canvas should be the right height to fit all of the lines
                // that will be rendered in the base canvas.  This includes the lines
                // that are partially rendered at the top and bottom of the base canvas.
                var row_height = this.get_row_height();
                this._visible_row_count = Math.ceil(value / row_height) + 1;
                this._text_canvas.height = this._visible_row_count * row_height;
                this._tmp_canvas.height = this._text_canvas.height;
            }
        },
        margin_left: {
            get: function () {
                return this._margin_left;
            },
            set: function (value) {

                // Update internal value.
                var delta = value - this._margin_left;
                this._margin_left = value;

                // Intelligently change the document's width, without causing
                // a complete O(N) width recalculation.
                var new_counts = {};
                for (var width in this._row_width_counts) {
                    if (this._row_width_counts.hasOwnProperty(width)) {
                        new_counts[width + delta] = this._row_width_counts[width];
                    }
                }
                this._row_width_counts = new_counts;
                this._scrolling_canvas.scroll_width += delta;

                // Re-render with new margin.
                this.render();
                // Tell parent layer this one has changed.
                this.trigger("changed");
            }
        },
        margin_top: {
            get: function () {
                return this._margin_top;
            },
            set: function (value) {
                // Update the scrollbars.
                this._scrolling_canvas.scroll_height += value - this._margin_top;

                // Update internal value.
                this._margin_top = value;

                // Re-render with new margin.
                this.render();
                // Tell parent layer this one has changed.
                this.trigger("changed");
            }
        },
        render: {

            /**
             * Render to the canvas
             * Note: This method is called often, so it's important that it's
             * optimized for speed.
             * @param {dictionary} (optional) scroll - How much the canvas was scrolled.  This
             *                     is a dictionary of the form {x: float, y: float}
             * @return {null}
             */

            value: function render(scroll) {

                // If only the y axis was scrolled, blit the good contents and just render
                // what's missing.
                var partial_redraw = scroll && scroll.x === 0 && Math.abs(scroll.y) < this._canvas.height;

                // Update the text rendering
                var visible_rows = this.get_visible_rows();
                this._render_text_canvas(-this._scrolling_canvas.scroll_left + this._margin_left, visible_rows.top_row, !partial_redraw);

                // Copy the text image to this canvas
                this._canvas.clear();
                this._canvas.draw_image(this._text_canvas, this._scrolling_canvas.scroll_left, this.get_row_top(visible_rows.top_row));
            }
        },
        _render_text_canvas: {

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

            value: function _render_text_canvas(x_offset, top_row, force_redraw) {

                // Try to reuse some of the already rendered text if possible.
                var rendered = false;
                var row_height = this.get_row_height();
                var i;
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
                            for (i = top_row + saved_rows; i < top_row + this._visible_row_count; i++) {
                                this._render_row(i, x_offset, (i - top_row) * row_height);
                            }
                        } else if (scroll < 0) {
                            // Render the top.
                            this._text_canvas.clear();
                            for (i = top_row; i < top_row + new_rows; i++) {
                                this._render_row(i, x_offset, (i - top_row) * row_height);
                            }
                        } else {
                            // Nothing has changed.
                            return;
                        }

                        // Use the old content to fill in the rest.
                        this._text_canvas.draw_image(this._tmp_canvas, 0, -scroll * this.get_row_height());
                        this.trigger("rows_changed", top_row, top_row + this._visible_row_count - 1);
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
                    this.trigger("rows_changed", top_row, top_row + this._visible_row_count - 1);
                }

                // Remember for delta rendering.
                this._last_rendered_row = top_row;
                this._last_rendered_row_count = this._visible_row_count;
                this._last_rendered_offset = x_offset;
            }
        },
        get_row_char: {

            /**
             * Gets the row and character indicies closest to given control space coordinates.
             * @param  {float} cursor_x - x value, 0 is the left of the canvas.
             * @param  {float} cursor_y - y value, 0 is the top of the canvas.
             * @return {dictionary} dictionary of the form {row_index, char_index}
             */

            value: function get_row_char(cursor_x, cursor_y) {
                var row_index = Math.floor((cursor_y - this._margin_top) / this.get_row_height());

                // Find the character index.
                var widths = [0];
                try {
                    for (var length = 1; length <= this._model._rows[row_index].length; length++) {
                        widths.push(this.measure_partial_row_width(row_index, length));
                    }
                } catch (e) {}
                var coords = this._model.validate_coords(row_index, utils.find_closest(widths, cursor_x - this._margin_left));
                return {
                    row_index: coords.start_row,
                    char_index: coords.start_char };
            }
        },
        measure_partial_row_width: {

            /**
             * Measures the partial width of a text row.
             * @param  {integer} index
             * @param  {integer} (optional) length - number of characters
             * @return {float} width
             */

            value: function measure_partial_row_width(index, length) {
                if (0 > index || index >= this._model._rows.length) {
                    return 0;
                }

                var text = this._model._rows[index];
                text = length === undefined ? text : text.substring(0, length);

                return this._canvas.measure_text(text, this._base_options);
            }
        },
        _measure_text_width: {

            /**
             * Measures a strings width.
             * @param  {string} text - text to measure the width of
             * @param  {integer} [index] - row index, can be used to apply size sensitive 
             *                             formatting to the text.
             * @return {float} width
             */

            value: function _measure_text_width(text) {
                return this._canvas.measure_text(text, this._base_options);
            }
        },
        get_row_height: {

            /**
             * Measures the height of a text row as if it were rendered.
             * @param  {integer} (optional) index
             * @return {float} height
             */

            value: function get_row_height(index) {
                return this._base_options.font_size + this._line_spacing;
            }
        },
        get_row_top: {

            /**
             * Gets the top of the row when rendered
             * @param  {integer} index
             * @return {null}
             */

            value: function get_row_top(index) {
                return index * this.get_row_height() + this._margin_top;
            }
        },
        get_visible_rows: {

            /**
             * Gets the visible rows.
             * @return {dictionary} dictionary containing information about 
             *                      the visible rows.  Format {top_row, 
             *                      bottom_row, row_count}.
             */

            value: function get_visible_rows() {

                // Find the row closest to the scroll top.  If that row is below
                // the scroll top, use the partially displayed row above it.
                var top_row = Math.max(0, Math.floor((this._scrolling_canvas.scroll_top - this._margin_top) / this.get_row_height()));

                // Find the row closest to the scroll bottom.  If that row is above
                // the scroll bottom, use the partially displayed row below it.
                var row_count = Math.ceil(this._canvas.height / this.get_row_height());
                var bottom_row = top_row + row_count;

                // Row count + 1 to include first row.
                return { top_row: top_row, bottom_row: bottom_row, row_count: row_count + 1 };
            }
        },
        _handle_value_changed: {

            /**
             * Handles when the model's value changes
             * Complexity: O(N) for N rows of text.
             * @return {null}
             */

            value: function _handle_value_changed() {

                // Calculate the document width.
                this._row_width_counts = {};
                var document_width = 0;
                for (var i = 0; i < this._model._rows.length; i++) {
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
            }
        },
        _handle_row_changed: {

            /**
             * Handles when one of the model's rows change
             * @return {null}
             */

            value: function _handle_row_changed(text, index) {
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
            }
        },
        _handle_rows_added: {

            /**
             * Handles when one or more rows are added to the model
             *
             * Assumes constant row height.
             * @param  {integer} start
             * @param  {integer} end
             * @return {null}
             */

            value: function _handle_rows_added(start, end) {
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
            }
        },
        _handle_rows_removed: {

            /**
             * Handles when one or more rows are removed from the model
             *
             * Assumes constant row height.
             * @param  {array} rows
             * @param  {integer} [index]
             * @return {null}
             */

            value: function _handle_rows_removed(rows, index) {
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
            }
        },
        _render_row: {

            /**
             * Render a single row
             * @param  {integer} index
             * @param  {float} x
             * @param  {float} y
             * @return {null}
             */

            value: function _render_row(index, x, y) {
                this._text_canvas.draw_text(x, y, this._model._rows[index], this._base_options);
            }
        },
        _measure_row_width: {

            /**
             * Measures the width of a text row as if it were rendered.
             * @param  {integer} index
             * @return {float} width
             */

            value: function _measure_row_width(index) {
                return this.measure_partial_row_width(index, this._model._rows[index].length);
            }
        },
        _find_largest_width: {

            /**
             * Find the largest width in the width row count dictionary.
             * @return {float} width
             */

            value: function _find_largest_width() {
                var values = Object.keys(this._row_width_counts);
                values.sort(function (a, b) {
                    return parseFloat(b) - parseFloat(a);
                });
                return parseFloat(values[0]);
            }
        }
    });

    return RowRenderer;
})(renderer.RendererBase);

// Nom nom nom...

},{"../canvas.js":3,"../utils.js":36,"./renderer.js":28}],30:[function(require,module,exports){
"use strict";

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

Object.defineProperty(exports, "__esModule", {
    value: true
});
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var animator = _interopRequireWildcard(require("../animator.js"));

var utils = _interopRequireWildcard(require("../utils.js"));

var renderer = _interopRequireWildcard(require("./renderer.js"));

var config = _interopRequireWildcard(require("../config.js"));

config = config.config;

/**
 * Render document selection boxes
 *
 * TODO: Only render visible.
 */

var SelectionsRenderer = exports.SelectionsRenderer = (function (_renderer$RendererBase) {
    function SelectionsRenderer(cursors, style, row_renderer, has_focus, cursors_renderer) {
        var _this = this;

        _classCallCheck(this, SelectionsRenderer);

        _get(Object.getPrototypeOf(SelectionsRenderer.prototype), "constructor", this).call(this);
        this._dirty = null;
        this.style = style;
        this._has_focus = has_focus;

        // When the cursors change, redraw the selection box(es).
        this._cursors = cursors;
        var rerender = function () {
            _this.render();
            // Tell parent layer this one has changed.
            _this.trigger("changed");
        };
        this._cursors.on("change", rerender);

        // When the style is changed, redraw the selection box(es).
        this.style.on("change", rerender);
        config.on("change", rerender);

        this._row_renderer = row_renderer;
        // TODO: Remove the following block.
        this._get_visible_rows = utils.proxy(row_renderer.get_visible_rows, row_renderer);
        this._get_row_height = utils.proxy(row_renderer.get_row_height, row_renderer);
        this._get_row_top = utils.proxy(row_renderer.get_row_top, row_renderer);
        this._measure_partial_row = utils.proxy(row_renderer.measure_partial_row_width, row_renderer);

        // When the cursor is hidden/shown, redraw the selection.
        cursors_renderer.on("toggle", function () {
            _this.render();
            // Tell parent layer this one has changed.
            _this.trigger("changed");
        });
    }

    _inherits(SelectionsRenderer, _renderer$RendererBase);

    _createClass(SelectionsRenderer, {
        render: {

            /**
             * Render to the canvas
             * Note: This method is called often, so it's important that it's
             * optimized for speed.
             * @return {null}
             */

            value: function render(scroll) {
                var _this = this;

                // If old contents exist, remove them.
                if (this._dirty === null || scroll !== undefined) {
                    this._canvas.clear();
                    this._dirty = null;
                } else {
                    this._canvas.clear({
                        x: this._dirty.x1 - 1,
                        y: this._dirty.y1 - 1,
                        width: this._dirty.x2 - this._dirty.x1 + 2,
                        height: this._dirty.y2 - this._dirty.y1 + 2 });
                    this._dirty = null;
                }

                // Get newline width.
                var newline_width = config.newline_width;
                if (newline_width === undefined || newline_width === null) {
                    newline_width = 2;
                }

                // Only render if the canvas has focus.
                this._cursors.cursors.forEach(function (cursor) {
                    // Get the visible rows.
                    var visible_rows = _this._get_visible_rows();

                    // Draw the selection box.
                    if (cursor.start_row !== null && cursor.start_char !== null && cursor.end_row !== null && cursor.end_char !== null) {

                        for (var i = Math.max(cursor.start_row, visible_rows.top_row); i <= Math.min(cursor.end_row, visible_rows.bottom_row); i++) {

                            var left = _this._row_renderer.margin_left;
                            if (i == cursor.start_row && cursor.start_char > 0) {
                                left += _this._measure_partial_row(i, cursor.start_char);
                            }

                            var selection_color;
                            if (_this._has_focus()) {
                                selection_color = _this.style.selection || "skyblue";
                            } else {
                                selection_color = _this.style.selection_unfocused || "gray";
                            }

                            var width;
                            if (i !== cursor.end_row) {
                                width = _this._measure_partial_row(i) - left + _this._row_renderer.margin_left + newline_width;
                            } else {
                                width = _this._measure_partial_row(i, cursor.end_char);

                                // If this isn't the first selected row, make sure atleast the newline
                                // is visibily selected at the beginning of the row by making sure that
                                // the selection box is atleast the size of a newline character (as
                                // defined by the user config).
                                if (i !== cursor.start_row) {
                                    width = Math.max(newline_width, width);
                                }

                                width = width - left + _this._row_renderer.margin_left;
                            }

                            var block = {
                                left: left,
                                top: _this._get_row_top(i),
                                width: width,
                                height: _this._get_row_height(i)
                            };

                            _this._canvas.draw_rectangle(block.left, block.top, block.width, block.height, {
                                fill_color: selection_color });

                            if (_this._dirty === null) {
                                _this._dirty = {};
                                _this._dirty.x1 = block.left;
                                _this._dirty.y1 = block.top;
                                _this._dirty.x2 = block.left + block.width;
                                _this._dirty.y2 = block.top + block.height;
                            } else {
                                _this._dirty.x1 = Math.min(block.left, _this._dirty.x1);
                                _this._dirty.y1 = Math.min(block.top, _this._dirty.y1);
                                _this._dirty.x2 = Math.max(block.left + block.width, _this._dirty.x2);
                                _this._dirty.y2 = Math.max(block.top + block.height, _this._dirty.y2);
                            }
                        }
                    }
                });
            }
        }
    });

    return SelectionsRenderer;
})(renderer.RendererBase);

},{"../animator.js":2,"../config.js":5,"../utils.js":36,"./renderer.js":28}],31:[function(require,module,exports){
"use strict";

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

Object.defineProperty(exports, "__esModule", {
    value: true
});
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var canvas = _interopRequireWildcard(require("./canvas.js"));

var utils = _interopRequireWildcard(require("./utils.js"));

/**
 * HTML canvas with drawing convinience functions.
 */

var ScrollingCanvas = exports.ScrollingCanvas = (function (_canvas$Canvas) {
    function ScrollingCanvas() {
        _classCallCheck(this, ScrollingCanvas);

        _get(Object.getPrototypeOf(ScrollingCanvas.prototype), "constructor", this).call(this);
        this._bind_events();
        this._old_scroll_left = 0;
        this._old_scroll_top = 0;

        // Set default size.
        this.width = 400;
        this.height = 300;
    }

    _inherits(ScrollingCanvas, _canvas$Canvas);

    _createClass(ScrollingCanvas, {
        scroll_width: {

            /**
             * Width of the scrollable canvas area
             */

            get: function () {
                // Get
                return this._scroll_width || 0;
            },
            set: function (value) {
                // Set
                this._scroll_width = value;
                this._move_dummy(this._scroll_width, this._scroll_height || 0);
            }
        },
        scroll_height: {

            /**
             * Height of the scrollable canvas area.
             */

            get: function () {
                // Get
                return this._scroll_height || 0;
            },
            set: function (value) {
                // Set
                this._scroll_height = value;
                this._move_dummy(this._scroll_width || 0, this._scroll_height);
            }
        },
        scroll_top: {

            /**
             * Top most pixel in the scrolled window.
             */

            get: function () {
                // Get
                return this._scroll_bars.scrollTop;
            },
            set: function (value) {
                // Set
                this._scroll_bars.scrollTop = value;
                this._handle_scroll();
            }
        },
        scroll_left: {

            /**
             * Left most pixel in the scrolled window.
             */

            get: function () {
                // Get
                return this._scroll_bars.scrollLeft;
            },
            set: function (value) {
                // Set
                this._scroll_bars.scrollLeft = value;
                this._handle_scroll();
            }
        },
        height: {

            /**
             * Height of the canvas
             * @return {float}
             */

            get: function () {
                return this._canvas.height / 2;
            },
            set: function (value) {
                this._canvas.setAttribute("height", value * 2);
                this.el.setAttribute("style", "width: " + this.width + "px; height: " + value + "px;");

                this.trigger("resize", { height: value });
                this._try_redraw();

                // Stretch the image for retina support.
                this.scale(2, 2);
            }
        },
        width: {

            /**
             * Width of the canvas
             * @return {float}
             */

            get: function () {
                return this._canvas.width / 2;
            },
            set: function (value) {
                this._canvas.setAttribute("width", value * 2);
                this.el.setAttribute("style", "width: " + value + "px; height: " + this.height + "px;");

                this.trigger("resize", { width: value });
                this._try_redraw();

                // Stretch the image for retina support.
                this.scale(2, 2);
            }
        },
        focused: {

            /**
             * Is the canvas or related elements focused?
             * @return {boolean}
             */

            get: function () {
                return document.activeElement === this.el || document.activeElement === this._scroll_bars || document.activeElement === this._dummy || document.activeElement === this._canvas;
            }
        },
        redraw: {

            /**
             * Causes the canvas contents to be redrawn.
             * @return {null}
             */

            value: function redraw(scroll) {
                this.clear();
                this.trigger("redraw", scroll);
            }
        },
        _layout: {

            /**
             * Layout the elements for the canvas.
             * Creates `this.el`
             * 
             * @return {null}
             */

            value: function _layout() {
                canvas.Canvas.prototype._layout.call(this);
                // Change the canvas class so it's not hidden.
                this._canvas.setAttribute("class", "canvas");

                this.el = document.createElement("div");
                this.el.setAttribute("class", "poster scroll-window");
                this.el.setAttribute("tabindex", 0);
                this._scroll_bars = document.createElement("div");
                this._scroll_bars.setAttribute("class", "scroll-bars");
                this._touch_pane = document.createElement("div");
                this._touch_pane.setAttribute("class", "touch-pane");
                this._dummy = document.createElement("div");
                this._dummy.setAttribute("class", "scroll-dummy");

                this.el.appendChild(this._canvas);
                this.el.appendChild(this._scroll_bars);
                this._scroll_bars.appendChild(this._dummy);
                this._scroll_bars.appendChild(this._touch_pane);
            }
        },
        _bind_events: {

            /**
             * Bind to the events of the canvas.
             * @return {null}
             */

            value: function _bind_events() {
                var _this = this;

                // Trigger scroll and redraw events on scroll.
                this._scroll_bars.onscroll = function (e) {
                    _this.trigger("scroll", e);
                    _this._handle_scroll();
                };

                // Prevent scroll bar handled mouse events from bubbling.
                var scrollbar_event = function (e) {
                    if (e.target !== _this._touch_pane) {
                        utils.cancel_bubble(e);
                    }
                };
                this._scroll_bars.onmousedown = scrollbar_event;
                this._scroll_bars.onmouseup = scrollbar_event;
                this._scroll_bars.onclick = scrollbar_event;
                this._scroll_bars.ondblclick = scrollbar_event;
            }
        },
        _handle_scroll: {

            /**
             * Handles when the canvas is scrolled.
             */

            value: function _handle_scroll() {
                if (this._old_scroll_top !== undefined && this._old_scroll_left !== undefined) {
                    var scroll = {
                        x: this.scroll_left - this._old_scroll_left,
                        y: this.scroll_top - this._old_scroll_top };
                    this._try_redraw(scroll);
                } else {
                    this._try_redraw();
                }
                this._old_scroll_left = this.scroll_left;
                this._old_scroll_top = this.scroll_top;
            }
        },
        _try_redraw: {

            /**
             * Queries to see if redraw is okay, and then redraws if it is.
             * @return {boolean} true if redraw happened.
             */

            value: function _try_redraw(scroll) {
                if (this._query_redraw()) {
                    this.redraw(scroll);
                    return true;
                }
                return false;
            }
        },
        _query_redraw: {

            /**
             * Trigger the 'query_redraw' event.
             * @return {boolean} true if control should redraw itself.
             */

            value: function _query_redraw() {
                return this.trigger("query_redraw").every(function (x) {
                    return x;
                });
            }
        },
        _move_dummy: {

            /**
             * Moves the dummy element that causes the scrollbar to appear.
             * @param  {float} x
             * @param  {float} y
             * @return {null}
             */

            value: function _move_dummy(x, y) {
                this._dummy.setAttribute("style", "left: " + String(x) + "px; top: " + String(y) + "px;");
                this._touch_pane.setAttribute("style", "width: " + String(Math.max(x, this._scroll_bars.clientWidth)) + "px; " + "height: " + String(Math.max(y, this._scroll_bars.clientHeight)) + "px;");
            }
        },
        _tx: {

            /**
             * Transform an x value based on scroll position.
             * @param  {float} x
             * @param  {boolean} inverse - perform inverse transformation
             * @return {float}
             */

            value: function _tx(x, inverse) {
                return x - (inverse ? -1 : 1) * this.scroll_left;
            }
        },
        _ty: {

            /**
             * Transform a y value based on scroll position.
             * @param  {float} y
             * @param  {boolean} inverse - perform inverse transformation
             * @return {float}
             */

            value: function _ty(y, inverse) {
                return y - (inverse ? -1 : 1) * this.scroll_top;
            }
        }
    });

    return ScrollingCanvas;
})(canvas.Canvas);

},{"./canvas.js":3,"./utils.js":36}],32:[function(require,module,exports){
"use strict";

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

Object.defineProperty(exports, "__esModule", {
    value: true
});
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = _interopRequireWildcard(require("./utils.js"));

var styles = _interopRequireWildcard(require("./styles/init.js"));

/**
 * Style
 */

var Style = exports.Style = (function (_utils$PosterClass) {
    function Style() {
        _classCallCheck(this, Style);

        _get(Object.getPrototypeOf(Style.prototype), "constructor", this).call(this, ["comment", "string", "class-name", "keyword", "boolean", "function", "operator", "number", "ignore", "punctuation", "cursor", "cursor_width", "cursor_height", "selection", "selection_unfocused", "text", "background", "gutter", "gutter_text", "gutter_shadow"]);

        // Load the default style.
        this.load("peacock");
    }

    _inherits(Style, _utils$PosterClass);

    _createClass(Style, {
        load: {

            /**
             * Load a rendering style
             * @param  {string or dictionary} style - name of the built-in style 
             *         or style dictionary itself.
             * @return {boolean} success
             */

            value: function load(style) {
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
                    console.error("Error loading style", e);
                    return false;
                }
            }
        }
    });

    return Style;
})(utils.PosterClass);

},{"./styles/init.js":33,"./utils.js":36}],33:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var styles = {
    peacock: require("./peacock.js") };
exports.styles = styles;

},{"./peacock.js":34}],34:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var style = {
    comment: "#7a7267",
    string: "#bcd42a",
    "class-name": "#ede0ce",
    keyword: "#26A6A6",
    boolean: "#bcd42a",
    "function": "#ff5d38",
    operator: "#26A6A6",
    number: "#bcd42a",
    ignore: "#cccccc",
    punctuation: "#ede0ce",

    cursor: "#f8f8f0",
    cursor_width: 1,
    cursor_height: 1.1,
    selection: "#df3d18",
    selection_unfocused: "#4f1d08",

    text: "#ede0ce",
    background: "#2b2a27",
    gutter: "#2b2a27",
    gutter_text: "#7a7267",
    gutter_shadow: [[0, "black"], [1, "transparent"]] };
exports.style = style;

},{}],35:[function(require,module,exports){
"use strict";

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

Object.defineProperty(exports, "__esModule", {
    value: true
});
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

var utils = _interopRequireWildcard(require("./utils.js"));

/**
 * Superset
 */

var Superset = exports.Superset = (function (_utils$PosterClass) {
    function Superset() {
        _classCallCheck(this, Superset);

        _get(Object.getPrototypeOf(Superset.prototype), "constructor", this).call(this);
        this._array = [];
    }

    _inherits(Superset, _utils$PosterClass);

    _createClass(Superset, {
        array: {
            get: function () {
                this._clean();
                return this._array;
            }
        },
        clear: {

            /**
             * Clears the set
             */

            value: function clear() {
                utils.clear_array(this._array);
            }
        },
        set: {

            /**
             * Set the state of a region.
             * @param {integer} start - index, inclusive
             * @param {integer} stop - index, inclusive
             * @param {object} state
             */

            value: function set(start, stop, state) {
                this._set(start, stop, state, 0);
            }
        },
        _set: {

            /**
             * Set the state of a region.
             * @param {integer} start - index, inclusive
             * @param {integer} stop - index, inclusive
             * @param {object} state
             * @param {integer} integer - current recursion index
             */

            value: function _set(start, stop, state, index) {
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
            }
        },
        _insert: {

            /**
             * Inserts an entry.
             * @param  {integer} index
             * @param  {integer} start
             * @param  {integer} end  
             * @param  {object} state
             */

            value: function _insert(index, start, end, state) {
                if (start > end) {
                    return;
                }this._array.splice(index, 0, [start, end, state]);
            }
        },
        _clean: {

            /**
             * Joins consequtive states.
             */

            value: function _clean() {

                // Sort.
                this._array.sort(function (a, b) {
                    return a[0] - b[0];
                });

                // Join consequtive.
                for (var i = 0; i < this._array.length - 1; i++) {
                    if (this._array[i][1] === this._array[i + 1][0] - 1 && this._array[i][2] === this._array[i + 1][2]) {
                        this._array[i][1] = this._array[i + 1][1];
                        this._array.splice(i + 1, 1);
                        i--;
                    }
                }
            }
        }
    });

    return Superset;
})(utils.PosterClass);

},{"./utils.js":36}],36:[function(require,module,exports){
"use strict";

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

Object.defineProperty(exports, "__esModule", {
    value: true
});
// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

/**
 * Base class with helpful utilities
 * @param {array} [eventful_properties] list of property names (strings)
 *                to create and wire change events to.
 */

var PosterClass = exports.PosterClass = (function () {
    function PosterClass(eventful_properties) {
        var _this = this;

        _classCallCheck(this, PosterClass);

        this._events = {};
        this._on_all = [];

        // Construct eventful properties.
        if (eventful_properties && eventful_properties.length > 0) {
            for (var i = 0; i < eventful_properties.length; i++) {
                (function (name) {
                    _this.property(name, function () {
                        return this["_" + name];
                    }, function (value) {
                        this.trigger("change:" + name, value);
                        this.trigger("change", name, value);
                        this["_" + name] = value;
                        this.trigger("changed:" + name);
                        this.trigger("changed", name);
                    });
                })(eventful_properties[i]);
            }
        }
    }

    _createClass(PosterClass, {
        property: {

            /**
             * Define a property for the class
             * @param  {string} name
             * @param  {function} getter
             * @param  {function} setter
             * @return {null}
             */

            value: function property(name, getter, setter) {
                Object.defineProperty(this, name, {
                    get: getter,
                    set: setter,
                    configurable: true
                });
            }
        },
        on: {

            /**
             * Register an event listener
             * @param  {string} event
             * @param  {function} handler
             * @param  {object} context
             * @return {null}
             */

            value: function on(event, handler, context) {
                event = event.trim().toLowerCase();

                // Make sure a list for the event exists.
                if (!this._events[event]) {
                    this._events[event] = [];
                }

                // Push the handler and the context to the event's callback list.
                this._events[event].push([handler, context]);
            }
        },
        off: {

            /**
             * Unregister one or all event listeners for a specific event
             * @param  {string} event
             * @param  {callback} (optional) handler
             * @return {null}
             */

            value: function off(event, handler) {
                event = event.trim().toLowerCase();

                // If a handler is specified, remove all the callbacks
                // with that handler.  Otherwise, just remove all of
                // the registered callbacks.
                if (handler) {
                    this._events[event] = this._events[event].filter(function (callback) {
                        return callback[0] !== handler;
                    });
                } else {
                    this._events[event] = [];
                }
            }
        },
        on_all: {

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

            value: function on_all(handler) {
                var index = this._on_all.indexOf(handler);
                if (index === -1) {
                    this._on_all.push(handler);
                }
            }
        },
        off_all: {

            /**
             * Unregister a global event handler.
             * @param  {[type]} handler
             * @return {boolean} true if a handler was removed
             */

            value: function off_all(handler) {
                var index = this._on_all.indexOf(handler);
                if (index != -1) {
                    this._on_all.splice(index, 1);
                    return true;
                }
                return false;
            }
        },
        trigger: {

            /**
             * Triggers the callbacks of an event to fire.
             * @param  {string} event
             * @return {array} array of return values
             */

            value: function trigger(event) {
                var _this = this;

                event = event.trim().toLowerCase();

                // Convert arguments to an array and call callbacks.
                var args = Array.prototype.slice.call(arguments);
                args.splice(0, 1);

                // Trigger global handlers first.
                this._on_all.forEach(function (handler) {
                    return handler.apply(_this, [event].concat(args));
                });

                // Trigger individual handlers second.
                var events = this._events[event];
                if (events) {
                    var returns = [];
                    events.forEach(function (callback) {
                        return returns.push(callback[0].apply(callback[1], args));
                    });
                    return returns;
                }
                return [];
            }
        }
    });

    return PosterClass;
})();

/**
 * Cause one class to inherit from another
 * @param  {type} child
 * @param  {type} parent
 * @return {null}
 */
var inherit = function inherit(child, parent) {
    child.prototype = Object.create(parent.prototype, {});
};

exports.inherit = inherit;
/**
 * Checks if a value is callable
 * @param  {any} value
 * @return {boolean}
 */
var callable = function callable(value) {
    return typeof value == "function";
};

exports.callable = callable;
/**
 * Calls the value if it's callable and returns it's return.
 * Otherwise returns the value as-is.
 * @param  {any} value
 * @return {any}
 */
var resolve_callable = function resolve_callable(value) {
    if (callable(value)) {
        return value.call(this);
    } else {
        return value;
    }
};

exports.resolve_callable = resolve_callable;
/**
 * Creates a proxy to a function so it is called in the correct context.
 * @return {function} proxied function.
 */
var proxy = function proxy(f, context) {
    if (f === undefined) {
        throw new Error("f cannot be undefined");
    }
    return function () {
        return f.apply(context, arguments);
    };
};

exports.proxy = proxy;
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
var clear_array = function clear_array(array) {
    while (array.length > 0) {
        array.pop();
    }
};

exports.clear_array = clear_array;
/**
 * Checks if a value is an array
 * @param  {any} x
 * @return {boolean} true if value is an array
 */
var is_array = function is_array(x) {
    return x instanceof Array;
};

exports.is_array = is_array;
/**
 * Find the closest value in a list
 * 
 * Interpolation search algorithm.  
 * Complexity: O(lg(lg(N)))
 * @param  {array} sorted - sorted array of numbers
 * @param  {float} x - number to try to find
 * @return {integer} index of the value that's closest to x
 */
var find_closest = (function (_find_closest) {
    var _find_closestWrapper = function find_closest(_x, _x2) {
        return _find_closest.apply(this, arguments);
    };

    _find_closestWrapper.toString = function () {
        return _find_closest.toString();
    };

    return _find_closestWrapper;
})(function (sorted, x) {
    var min = sorted[0];
    var max = sorted[sorted.length - 1];
    if (x < min) return 0;
    if (x > max) return sorted.length - 1;
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
    } else if (guess > 0 && sorted[guess - 1] < x && x < sorted[guess]) {
        return find_closest(sorted.slice(guess - 1, guess + 1), x) + guess - 1;
    } else if (guess < sorted.length - 1 && sorted[guess] < x && x < sorted[guess + 1]) {
        return find_closest(sorted.slice(guess, guess + 2), x) + guess;
    } else if (sorted[guess] > x) {
        return find_closest(sorted.slice(0, guess), x);
    } else if (sorted[guess] < x) {
        return find_closest(sorted.slice(guess + 1), x) + guess + 1;
    }
});

exports.find_closest = find_closest;
/**
 * Make a shallow copy of a dictionary.
 * @param  {dictionary} x
 * @return {dictionary}
 */
var shallow_copy = function shallow_copy(x) {
    var y = {};
    for (var key in x) {
        if (x.hasOwnProperty(key)) {
            y[key] = x[key];
        }
    }
    return y;
};

exports.shallow_copy = shallow_copy;
/**
 * Hooks a function.
 * @param  {object} obj - object to hook
 * @param  {string} method - name of the function to hook
 * @param  {function} hook - function to call before the original
 * @return {object} hook reference, object with an `unhook` method
 */
var hook = (function (_hook) {
    var _hookWrapper = function hook(_x, _x2, _x3) {
        return _hook.apply(this, arguments);
    };

    _hookWrapper.toString = function () {
        return _hook.toString();
    };

    return _hookWrapper;
})(function (obj, method, hook) {

    // If the original has already been hooked, add this hook to the list
    // of hooks.
    if (obj[method] && obj[method].original && obj[method].hooks) {
        obj[method].hooks.push(hook);
    } else {
        // Create the hooked function
        var hooks = [hook];
        var original = obj[method];
        var hooked = function hooked() {
            var args = arguments;
            var ret;
            var results;
            var that = this;
            hooks.forEach(function (hook) {
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
        unhook: function unhook() {
            var index = obj[method].hooks.indexOf(hook);
            if (index != -1) {
                obj[method].hooks.splice(index, 1);
            }

            if (obj[method].hooks.length === 0) {
                obj[method] = obj[method].original;
            }
        } };
});

exports.hook = hook;
/**
 * Cancels event bubbling.
 * @param  {event} e
 * @return {null}
 */
var cancel_bubble = function cancel_bubble(e) {
    if (e.stopPropagation) e.stopPropagation();
    if (e.cancelBubble !== null) e.cancelBubble = true;
    if (e.preventDefault) e.preventDefault();
};

exports.cancel_bubble = cancel_bubble;
/**
 * Generates a random color string
 * @return {string} hexadecimal color string
 */
var random_color = function random_color() {
    var random_byte = function random_byte() {
        var b = Math.round(Math.random() * 255).toString(16);
        return b.length == 1 ? "0" + b : b;
    };
    return "#" + random_byte() + random_byte() + random_byte();
};

exports.random_color = random_color;
/**
 * Compare two arrays by contents for equality.
 * @param  {array} x
 * @param  {array} y
 * @return {boolean}
 */
var compare_arrays = function compare_arrays(x, y) {
    if (x.length != y.length) {
        return false;
    }for (var i = 0; i < x.length; i++) {
        if (x[i] !== y[i]) {
            return false;
        }
    }
    return true;
};

exports.compare_arrays = compare_arrays;
/**
 * Find all the occurances of a regular expression inside a string.
 * @param  {string} text - string to look in
 * @param  {string} re - regular expression to find
 * @return {array} array of [start_index, end_index] pairs
 */
var findall = function findall(text, re, flags) {
    re = new RegExp(re, flags || "gm");
    var results;
    var found = [];
    while ((results = re.exec(text)) !== null) {
        var end_index = results.index + (results[0].length || 1);
        found.push([results.index, end_index]);
        re.lastIndex = Math.max(end_index, re.lastIndex);
    }
    return found;
};

exports.findall = findall;
/**
 * Checks if the character isn't text.
 * @param  {char} c - character
 * @return {boolean} true if the character is not text.
 */
var not_text = function not_text(c) {
    return "abcdefghijklmnopqrstuvwxyz1234567890_".indexOf(c.toLowerCase()) == -1;
};

exports.not_text = not_text;
/**
 * Merges objects
 * @param  {array} objects
 * @return {object} new object, result of merged objects
 */
var merge = function merge(objects) {
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
exports.merge = merge;

},{}]},{},[23]);

//# sourceMappingURL=poster.js.map