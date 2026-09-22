/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-afac4cd2'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "pwa-maskable-512x512.png",
    "revision": "c15e3ba00ce0f70dab86623a24ad2cd5"
  }, {
    "url": "pwa-512x512.png",
    "revision": "7e88cc0f4751df709b9f24d0799657e8"
  }, {
    "url": "pwa-192x192.png",
    "revision": "a5108135688c95a2cfd4316742fa5be2"
  }, {
    "url": "polarx-logo.svg",
    "revision": "78b87bc7618104ca775c90b7de2194c7"
  }, {
    "url": "index.html",
    "revision": "5787f9701fc625f7e2c2ddbf30f9ff7c"
  }, {
    "url": "favicon.svg",
    "revision": "59227981e0a8c744c34c692ff28a7da5"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "0880189974424a7387e8bc5a7bf12e30"
  }, {
    "url": "assets/web-Ch6IwNpw.js",
    "revision": null
  }, {
    "url": "assets/vendor-supabase-D_iOwayF.js",
    "revision": null
  }, {
    "url": "assets/vendor-react-J3eikCEJ.js",
    "revision": null
  }, {
    "url": "assets/vendor-lucide-CN1-Yb7N.js",
    "revision": null
  }, {
    "url": "assets/vendor-firebase-DZgpv4QC.js",
    "revision": null
  }, {
    "url": "assets/index-czRZ5BEp.js",
    "revision": null
  }, {
    "url": "assets/index-37QvZrKL.css",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "0880189974424a7387e8bc5a7bf12e30"
  }, {
    "url": "favicon.svg",
    "revision": "59227981e0a8c744c34c692ff28a7da5"
  }, {
    "url": "polarx-logo.svg",
    "revision": "78b87bc7618104ca775c90b7de2194c7"
  }, {
    "url": "pwa-192x192.png",
    "revision": "a5108135688c95a2cfd4316742fa5be2"
  }, {
    "url": "pwa-512x512.png",
    "revision": "7e88cc0f4751df709b9f24d0799657e8"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "c15e3ba00ce0f70dab86623a24ad2cd5"
  }, {
    "url": "manifest.webmanifest",
    "revision": "95772453a2610c5de44413664ee8d9fb"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("/index.html"), {
    denylist: [/^\/api/]
  }));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 20,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 30,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
