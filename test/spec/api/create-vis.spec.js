var _ = require('underscore');
var $ = require('jquery');
var Loader = require('../../../src/core/loader');
var createVis = require('../../../src/api/create-vis');
var VizJSON = require('../../../src/api/vizjson');
var fakeVizJSON = require('./fake-vizjson');
var util = require('../../../src/core/util');

var createFakeVizJSON = function () {
  return Object.assign({}, fakeVizJSON);
}

describe('src/api/create-vis', function () {
  beforeEach(function () {
    this.container = $('<div id="map">').css('height', '200px');
    this.containerId = this.container[0].id;
    $('body').append(this.container);

    this.$ajax = $.ajax;
    spyOn($, 'ajax').and.callFake(function (options) {
      if (options.url.indexOf(options.url.indexOf('http://cdb.localhost.lan:8181/api/v1/map/named/tpl_6a31d394_7c8e_11e5_8e42_080027880ca6/jsonp?') === 0)) {
        options.success && options.success({
          layergroupid: '1234567890'
        });
      }

      this.$ajax(options);
    }.bind(this));
  });

  afterEach(function () {
    $.ajax = this.$ajax;
    this.container.remove();
  });

  it('should throw errors', function () {
    expect(function () {
      createVis();
    }).toThrowError('a valid DOM element or selector must be provided');

    expect(function () {
      createVis('something');
    }).toThrowError('a valid DOM element or selector must be provided');

    expect(function () {
      createVis(this.containerId);
    }.bind(this)).toThrowError('a vizjson URL or object must be provided');

    expect(function () {
      createVis(this.container[0], 'vizjson');
    }.bind(this)).not.toThrowError();

    expect(function () {
      createVis(this.containerId, 'vizjson');
    }.bind(this)).not.toThrowError();
  });

  it('should load the vizjson file from a URL', function () {
    spyOn(Loader, 'get');
    var vis = createVis(this.containerId, 'http://example.com/vizjson', {
      skipMapInstantiation: true
    });
    spyOn(vis, 'load').and.callThrough();

    // Simulate a successful response from Loader.get
    var loaderCallback = Loader.get.calls.mostRecent().args[1];
    loaderCallback(fakeVizJSON);

    expect(vis.load).toHaveBeenCalledWith(jasmine.any(VizJSON));
  });

  it('should use the given vizjson object', function () {
    spyOn(Loader, 'get');
    createVis(this.containerId, fakeVizJSON, {
      skipMapInstantiation: true
    });

    expect(Loader.get).not.toHaveBeenCalled();
  });

  it('should initialize the visModel correctly', function () {
    var vizJSON = _.extend(fakeVizJSON, {
      title: 'TITLE',
      description: 'DESCRIPTION',
      https: true
    });
    var visModel = createVis(this.containerId, vizJSON, {
      apiKey: 'API_KEY',
      authToken: 'AUTH_TOKEN',
      show_empty_infowindow_fields: true,
      skipMapInstantiation: true
    });

    expect(visModel.get('title')).toEqual('TITLE');
    expect(visModel.get('description')).toEqual('DESCRIPTION');
    expect(visModel.get('authToken')).toEqual('AUTH_TOKEN');
    expect(visModel.get('showEmptyInfowindowFields')).toEqual(true);
    expect(visModel.get('https')).toEqual(true);
  });

  it('should set the given center if values are correct', function () {
    var opts = {
      center_lat: 43.3,
      center_lon: '89'
    };

    var vis = createVis(this.containerId, fakeVizJSON, opts);

    expect(vis.map.get('center')).toEqual([43.3, 89.0]);
  });

  it('should not set the center if values are not correct', function () {
    var opts = {
      center_lat: 43.3,
      center_lon: 'ham'
    };

    var vis = createVis(this.containerId, fakeVizJSON, opts);

    expect(vis.map.get('center')).toEqual([ 41.40578459184651, 2.2230148315429688 ]);
  });

  it('should parse bounds values if they are correct', function () {
    var opts = {
      sw_lat: 43.3,
      sw_lon: 12,
      ne_lat: 12,
      ne_lon: '0'
    };

    var vis = createVis(this.containerId, fakeVizJSON, opts);

    expect(vis.map.get('view_bounds_sw')).toEqual([43.3, 12]);
    expect(vis.map.get('view_bounds_ne')).toEqual([12, 0]);
  });

  it('should not parse bounds values if they are not correct', function () {
    var opts = {
      sw_lat: 43.3,
      sw_lon: 12,
      ne_lat: 'jamon',
      ne_lon: '0'
    };

    var vis = createVis(this.containerId, fakeVizJSON, opts);

    expect(vis.map.get('view_bounds_sw')).toEqual([
      41.340989240001214,
      2.0194244384765625
    ]);
    expect(vis.map.get('view_bounds_ne')).toEqual([
      41.47051539294297,
      2.426605224609375
    ]);
  });

  it('should not add header', function (done) {
    fakeVizJSON.title = 'title';

    var opts = {
      title: true
    };

    var vis = createVis(this.containerId, fakeVizJSON, opts);

    vis.once('load', function () {
      expect(this.container.find('.cartodb-header').length).toEqual(0);
      done();
    }.bind(this));
  });

  it('should add zoom', function (done) {
    fakeVizJSON.overlays = [{ type: 'zoom', order: 7, options: { x: 20, y: 20 }, template: 'test' }];

    var vis = createVis(this.containerId, fakeVizJSON, {});

    vis.once('load', function () {
      expect(this.container.find('.CDB-Zoom').length).toEqual(1);
      done();
    }.bind(this));
  });

  it("should enable zoom if it's specified by zoomControl option", function (done) {
    fakeVizJSON.overlays = [{ type: 'zoom', order: 7, options: { x: 20, y: 20 }, template: 'test' }];
    var opts = {
      zoomControl: true
    };

    var vis = createVis(this.containerId, fakeVizJSON, opts);

    vis.once('load', function () {
      expect(this.container.find('.CDB-Zoom').length).toEqual(1);
      done();
    }.bind(this));
  });

  it("should disable zoom if it's specified by zoomControl option", function (done) {
    fakeVizJSON.overlays = [{ type: 'zoom', order: 7, options: { x: 20, y: 20 }, template: 'test' }];
    var opts = {
      zoomControl: false
    };

    var vis = createVis(this.containerId, fakeVizJSON, opts);

    vis.once('load', function () {
      expect(this.container.find('.CDB-Zoom').length).toEqual(0);
      done();
    }.bind(this));
  });

  it('should add search', function (done) {
    fakeVizJSON.overlays = [{ type: 'search' }];

    var vis = createVis(this.containerId, fakeVizJSON, {});

    vis.once('load', function () {
      expect(this.container.find('.CDB-Search').length).toEqual(1);
      done();
    }.bind(this));
  });

  it("should enable search if it's specified by searchControl", function (done) {
    fakeVizJSON.overlays = [{ type: 'search' }];

    var opts = {
      searchControl: true
    };

    var vis = createVis(this.containerId, fakeVizJSON, opts);

    vis.once('load', function () {
      expect(this.container.find('.CDB-Search').length).toEqual(1);
      done();
    }.bind(this));
  });

  it("should disable search if it's specified by searchControl", function (done) {
    fakeVizJSON.overlays = [{ type: 'search' }];

    var opts = {
      searchControl: false
    };

    var vis = createVis(this.containerId, fakeVizJSON, opts);

    vis.once('load', function () {
      expect(this.container.find('.CDB-Search').length).toEqual(0);
      done();
    }.bind(this));
  });

  it("should disable logo if it's specified by logo", function (done) {
    fakeVizJSON.overlays = [{ type: 'logo' }];

    var opts = {
      logo: false
    };

    var vis = createVis(this.containerId, fakeVizJSON, opts);

    vis.once('load', function () {
      expect(this.container.find('.CDB-Logo').length).toEqual(0);
      done();
    }.bind(this));
  });

  var mapInstantiationRequestDone = function () {
    return _.any($.ajax.calls.allArgs(), function (args) {
      var expectedURLRegexp = /(http|https):\/\/cdb.localhost.lan:8181\/api\/v1\/map\/named\/tpl_6a31d394_7c8e_11e5_8e42_080027880ca6\/jsonp\?/;
      return args[0].url.match(expectedURLRegexp);
    });
  };

  describe('map instantiation', function () {
    it('should instantiate map using a GET request', function (done) {
      this.vis = createVis(this.containerId, fakeVizJSON, {});

      setTimeout(function () {
        expect(mapInstantiationRequestDone()).toEqual(true);
        done();
      }, 25);
    });

    it('should NOT instantiate map if skipMapInstantiation options is set to true', function (done) {
      this.vis = createVis(this.containerId, fakeVizJSON, {
        skipMapInstantiation: true
      });

      setTimeout(function () {
        expect(mapInstantiationRequestDone()).toEqual(false);
        done();
      }, 25);
    });
  });

  it('should correctly set some public properties', function () {
    this.vis = createVis(this.containerId, fakeVizJSON, {
      skipMapInstantiation: true
    });

    expect(this.vis.map).toBeDefined();
    expect(this.vis.analysis).toBeDefined();
    expect(this.vis.dataviews).toBeDefined();
    expect(this.vis.layerGroupModel).toBeDefined();
    expect(this.vis.overlaysCollection).toBeDefined();
  });

  describe('https attribute', function () {
    beforeEach(function () {
      this.vizJSON = createFakeVizJSON();
    });

    describe('when https is false in viz.json', function () {
      beforeEach(function () {
        this.vizJSON.https = false;
      });
  
      it('should be true when https option is true', function () {
        this.vis = createVis(this.containerId, this.vizJSON, {
          skipMapInstantiation: true,
          https: true
        });

        expect(this.vis.get('https')).toBe(true);
      });

      it('should be false when https option is false', function () {
        this.vis = createVis(this.containerId, this.vizJSON, {
          skipMapInstantiation: true,
          https: false
        });

        expect(this.vis.get('https')).toBe(false);
      });
    });

    describe('when https is true in viz.json', function () {
      beforeEach(function () {
        this.vizJSON.https = true;
      });
  
      it('should be true when https option is true', function () {
        this.vis = createVis(this.containerId, this.vizJSON, {
          skipMapInstantiation: true,
          https: true
        });

        expect(this.vis.get('https')).toBe(true);
      });

      it('should be true when https option is false', function () {
        this.vis = createVis(this.containerId, this.vizJSON, {
          skipMapInstantiation: true,
          https: false
        });

        expect(this.vis.get('https')).toBe(true);
      });
    });

    // We should test that https is enforced when protocol is 'https:;
    // but there's no easy to way to mock window.location.protocol
    xit('should be true/false depending on the URL', function () {
      var isProtocolHTTPs = window && window.location.protocol && window.location.protocol === 'https:';

      this.vis = createVis(this.containerId, this.vizJSON, {
        skipMapInstantiation: true
      });

      expect(this.vis.get('https')).toBe(isProtocolHTTPs);
    });
  });

  describe('map attributes', function () {
    beforeEach(function () {
      this.vizJSON = createFakeVizJSON();
    });

    describe('bounds', function () {
      it('should parse bounds and set attributes', function () {
        this.vis = createVis(this.containerId, this.vizJSON, {
          skipMapInstantiation: true
        });

        expect(this.vis.map.get('view_bounds_sw')).toEqual([ 41.340989240001214, 2.0194244384765625 ]);
        expect(this.vis.map.get('view_bounds_ne')).toEqual([ 41.47051539294297, 2.426605224609375 ]);
        expect(this.vis.map.get('bounds')).toBeUndefined();
      });
    });

    describe('center', function () {
      it('should set the center on the map', function () {
        this.vizJSON.center = [41.40578459184651, 2.2230148315429688];

        this.vis = createVis(this.containerId, this.vizJSON, {
          skipMapInstantiation: true
        });

        expect(this.vis.map.get('center')).toEqual([41.40578459184651, 2.2230148315429688]);
      });

      it('should set the center on the map when given a string', function () {
        this.vizJSON.center = '[41.40578459184651, 2.2230148315429688]';

        this.vis = createVis(this.containerId, this.vizJSON, {
          skipMapInstantiation: true
        });

        expect(this.vis.map.get('center')).toEqual([41.40578459184651, 2.2230148315429688]);
      });
    });

    describe('provider', function () {
      it('should use leaflet provider', function () {
        this.vizJSON.map_provider = 'leaflet';

        this.vis = createVis(this.containerId, this.vizJSON, {
          skipMapInstantiation: true
        });

        expect(this.vis.map.get('provider')).toEqual('leaflet');
      });

      it('should use googlemaps provider', function () {
        this.vizJSON.map_provider = 'googlemaps';

        this.vis = createVis(this.containerId, this.vizJSON, {
          skipMapInstantiation: true
        });

        expect(this.vis.map.get('provider')).toEqual('googlemaps');
      });
    });
  
    describe('drag', function () {
      beforeEach(function () {
        this.vizJSON = Object.assign({}, this.vizJSON);

        // Drag is disabled when the following things happen:
        this.vizJSON.options.scrollwheel = false;
        this.vizJSON.overlays = [];
        spyOn(util, 'isMobileDevice').and.returnValue(false);
      });

      it('should be disabled', function () {
        this.vis = createVis(this.containerId, this.vizJSON, {
          skipMapInstantiation: true
        });

        expect(this.vis.map.get('drag')).toBe(false);
      });

      it("should be enabled when there's a zoom overlay", function () {
        this.vizJSON.overlays = [
          {
            type: 'zoom',
            order: 6,
            options: {
              x: 20,
              y: 20,
              display: true
            },
            template: ''
          }
        ];

        this.vis = createVis(this.containerId, this.vizJSON, {
          skipMapInstantiation: true
        });

        expect(this.vis.map.get('drag')).toBe(true);
      });

      it('should be enabled when scrollwheel option is enabled', function () {
        this.vizJSON.options.scrollwheel = true;

        this.vis = createVis(this.containerId, this.vizJSON, {
          skipMapInstantiation: true
        });

        expect(this.vis.map.get('drag')).toBe(true);
      });

      it('should be enabled when using a mobile device', function () {
        util.isMobileDevice.and.returnValue(true);

        this.vis = createVis(this.containerId, this.vizJSON, {
          skipMapInstantiation: true
        });

        expect(this.vis.map.get('drag')).toBe(true);
      });
    });

    describe('scrollwhel', function () {
      beforeEach(function () {
        this.vizJSON.options.scrollwheel = false;
      });

      it('should be false when scrollwheel options are false', function () {
        this.vis = createVis(this.containerId, this.vizJSON, {
          skipMapInstantiation: true,
          scrollwheel: false
        });

        this.vis = createVis(this.containerId, this.vizJSON, {
          skipMapInstantiation: true
        });

        expect(this.vis.map.get('scrollwheel')).toBe(false);
      });

      it('should be true when scrollwheel option is true in vizjson', function () {
        this.vizJSON.options.scrollwheel = true;
        this.vis = createVis(this.containerId, this.vizJSON, {
          skipMapInstantiation: true
        });

        expect(this.vis.map.get('scrollwheel')).toBe(true);
      });

      it('should be true when scrollwheel option is false in the viz.json but given option is set to true', function () {
        this.vizJSON.options.scrollwheel = false;
        this.vis = createVis(this.containerId, this.vizJSON, {
          skipMapInstantiation: true,
          scrollwheel: true
        });

        expect(this.vis.map.get('scrollwheel')).toBe(true);
      });
    });
  });
});
