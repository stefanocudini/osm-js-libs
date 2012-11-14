// Generated by CoffeeScript 1.3.1
(function() {
  var Layer, intersects, intersectsKeys;

  intersects = function(arr1, arr2) {
    var el, _i, _len;
    for (_i = 0, _len = arr1.length; _i < _len; _i++) {
      el = arr1[_i];
      if (arr2.indexOf(el) >= 0) {
        return true;
      }
    }
    return false;
  };

  intersectsKeys = function(arr, hash) {
    var el, _i, _len;
    for (_i = 0, _len = arr.length; _i < _len; _i++) {
      el = arr[_i];
      if (hash[el]) {
        return true;
      }
    }
    return false;
  };

  Layer = L.Class.extend({
    includes: L.Mixin.Events,
    initialize: function(options) {
      var source, _i, _len, _ref, _results;
      this.options = options != null ? options : {};
      this.sources = {};
      this.sourceLayers = {};
      this.sourceRequests = {};
      this.disabledErrors = [];
      this.i18n = this.options.i18n || {
        error_info: 'More error info',
        errors: 'Errors',
        objects: 'Objects',
        params: 'Params',
        edit_in_potlatch: 'Edit in Potlatch',
        edit_in_josm: 'Edit in JOSM'
      };
      _ref = this.options.sources || [];
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        source = _ref[_i];
        _results.push(this.addSource(source));
      }
      return _results;
    },
    disableError: function(error) {
      if (this.disabledErrors.indexOf(error) < 0) {
        this.disabledErrors.push(error);
        return this.update();
      }
    },
    enableError: function(error) {
      var idx;
      if ((idx = this.disabledErrors.indexOf(error)) >= 0) {
        this.disabledErrors.splice(idx, 1);
        return this.update();
      }
    },
    addSource: function(source) {
      if (this.sources[source.url]) {
        this.sources[source.url] = source;
        if (this.map) {
          this.updateSource(source);
        }
        return this.fire('sourcechange', {
          source: source
        });
      } else {
        this.sourceLayers[source.url] = new L.LayerGroup();
        this.sources[source.url] = source;
        if (this.sourceRequests[source.url]) {
          this.sourceRequests[source.url].abort();
          delete this.sourceRequests[source.url];
        }
        if (this.map) {
          this.map.addLayer(this.sourceLayers[source.url]);
          this.updateSource(source);
        }
        return this.fire('sourceadd', {
          source: source
        });
      }
    },
    removeSource: function(source) {
      if (this.sources[source.url]) {
        if (this.map) {
          this.map.removeLayer(this.sourceLayers[source.url]);
        }
        delete this.sourceLayers[source.url];
        delete this.sources[source.url];
        if (this.sourceRequests[source.url]) {
          this.sourceRequests[source.url].abort();
          delete this.sourceRequests[source.url];
        }
        return this.fire('sourceremove', {
          source: source
        });
      }
    },
    onAdd: function(map) {
      var key, layer, _ref;
      this.map = map;
      _ref = this.sourceLayers;
      for (key in _ref) {
        layer = _ref[key];
        map.addLayer(layer);
      }
      map.on('moveend', this.update, this);
      return this.update();
    },
    onRemove: function(map) {
      var key, layer, _ref;
      map.off('moveend', this.update, this);
      _ref = this.sourceLayers;
      for (key in _ref) {
        layer = _ref[key];
        map.removeLayer(layer);
      }
      return this.map = void 0;
    },
    update: function() {
      var req, source, url, _ref, _ref1, _results;
      if (!this.map) {
        return;
      }
      _ref = this.sourceRequests;
      for (url in _ref) {
        req = _ref[url];
        req.abort();
      }
      this.sourceRequests = {};
      _ref1 = this.sources;
      _results = [];
      for (url in _ref1) {
        source = _ref1[url];
        _results.push(this.updateSource(source));
      }
      return _results;
    },
    updateSource: function(source) {
      var bounds, ne, sw, url,
        _this = this;
      bounds = this.map.getBounds();
      sw = bounds.getSouthWest();
      ne = bounds.getNorthEast();
      url = source.url.replace('{minlat}', sw.lat).replace('{maxlat}', ne.lat).replace('{minlon}', sw.lng).replace('{maxlon}', ne.lng).replace('{filtered_types}', this.getErrorTypes(source).join(','));
      return this.sourceRequests[source.url] = Layer.Utils.request(url, source, function(data) {
        var layer, res, _i, _j, _len, _len1, _ref, _ref1;
        delete _this.sourceRequests[source.url];
        layer = _this.sourceLayers[source.url];
        _this.map.removeLayer(layer);
        _ref = data.results;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          res = _ref[_i];
          if (res.type) {
            res.types = [res.type];
          }
        }
        layer.clearLayers();
        _ref1 = data.results;
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          res = _ref1[_j];
          if (intersectsKeys(res.types, source.types) && !intersects(res.types, _this.disabledErrors)) {
            layer.addLayer(_this.buildResult(source, res));
          }
        }
        return _this.map.addLayer(layer);
      });
    },
    getErrorTypes: function(source) {
      var desc, type, _ref, _results;
      _ref = source.types;
      _results = [];
      for (type in _ref) {
        desc = _ref[type];
        if (this.disabledErrors.indexOf(type) < 0) {
          _results.push(type);
        }
      }
      return _results;
    },
    buildResult: function(source, res) {
      var bounds, center, errorData, errorTemplate, key, ne, obj, popupText, resLayer, sw, type, value, _i, _j, _len, _len1, _ref, _ref1, _ref2, _ref3;
      bounds = new L.LatLngBounds();
      resLayer = new L.GeoJSON({
        type: 'Feature',
        geometry: res.geometry
      });
      Layer.Utils.extendBounds(bounds, resLayer);
      center = bounds.getCenter();
      sw = bounds.getSouthWest();
      ne = bounds.getNorthEast();
      popupText = "<div class=\"map-validation-error\">";
      popupText += "<p>" + this.i18n.errors + "</p>";
      popupText += "<ul class=\"errors\">";
      _ref = res.types;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        type = _ref[_i];
        if (!((_ref1 = source.types[type]) != null ? _ref1.text : void 0)) {
          continue;
        }
        errorTemplate = source.types[type].text;
        errorData = res.params || {};
        popupText += "<li>";
        popupText += errorTemplate.replace(/\{ *([\w_]+) *\}/g, function(str, key) {
          return errorData[key];
        });
        popupText += "</li>";
      }
      popupText += "</ul>";
      popupText += "<p>";
      if (res.url) {
        popupText += "<a href=\"" + res.url + "\" target=\"_blank\">" + this.i18n.error_info + "</a><br />";
      }
      popupText += "<a href=\"http://localhost:8111/load_and_zoom?top=" + ne.lat + "&bottom=" + sw.lat + "&left=" + sw.lng + "&right=" + ne.lng + "\" target=\"josm\">" + this.i18n.edit_in_josm + "</a><br />";
      popupText += "<a href=\"http://openstreetmap.org/edit?lat=" + center.lat + "&lon=" + center.lng + "&zoom=17\" target=\"_blank\">" + this.i18n.edit_in_potlatch + "</a><br />";
      popupText += "</p>";
      if (res.objects) {
        popupText += "<p>" + this.i18n.objects + "</p>";
        popupText += "<ul class=\"objects\">";
        _ref2 = res.objects;
        for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
          obj = _ref2[_j];
          popupText += "<li><a href=\"http://www.openstreetmap.org/browse/" + obj[0] + "/" + obj[1] + "\" target=\"_blank\">" + (obj.join('-')) + "</a></li>";
        }
        popupText += "</ul>";
      }
      if (res.params) {
        popupText += "<p>" + this.i18n.params + "</p>";
        popupText += "<ul class=\"params\">";
        _ref3 = res.params;
        for (key in _ref3) {
          value = _ref3[key];
          popupText += "<li>" + key + ": " + value + "</li>";
        }
        popupText += "</ul>";
      }
      popupText += "</div>";
      resLayer.bindPopup(popupText);
      return resLayer;
    }
  });

  Layer.Utils = {
    callbacks: {},
    callbackCounter: 0,
    extendBounds: function(bounds, l) {
      if (l.getBounds) {
        bounds.extend(l.getBounds().getSouthWest());
        return bounds.extend(l.getBounds().getNorthEast());
      } else if (l.getLatLng) {
        return bounds.extend(l.getLatLng());
      } else if (l._iterateLayers) {
        return l._iterateLayers(function(c) {
          return Layer.Utils.extendBounds(bounds, c);
        });
      } else {
        return console.log(["Can't determine layer bounds", l]);
      }
    },
    request: function(url, source, cb) {
      if (source.jsonp) {
        return this.requestJsonp(url, cb);
      } else {
        return this.requestXhr(url, cb);
      }
    },
    requestXhr: function(url, cb) {
      var xhr;
      xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            return cb(eval("(" + xhr.responseText + ")"));
          }
        }
      };
      xhr.send();
      return xhr;
    },
    requestJsonp: function(url, cb) {
      var abort, callback, counter, delim, el,
        _this = this;
      el = document.createElement('script');
      counter = (this.callbackCounter += 1);
      callback = "OsmJs.Validators.LeafletLayer.Utils.callbacks[" + counter + "]";
      abort = function() {
        if (el.parentNode) {
          return el.parentNode.removeChild(el);
        }
      };
      this.callbacks[counter] = function(data) {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
        delete _this.callbacks[counter];
        return cb(data);
      };
      delim = url.indexOf('?') >= 0 ? '&' : '?';
      el.src = "" + url + delim + "callback=" + callback;
      document.getElementsByTagName('body')[0].appendChild(el);
      return {
        abort: abort
      };
    }
  };

  if (!this.OsmJs) {
    this.OsmJs = {};
  }

  if (!this.OsmJs.Validators) {
    this.OsmJs.Validators = {};
  }

  this.OsmJs.Validators.LeafletLayer = Layer;

}).call(this);
