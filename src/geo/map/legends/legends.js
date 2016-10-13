var _ = require('underscore');
var CategoryLegendModel = require('./category-legend-model');
var BubbleLegendModel = require('./bubble-legend-model');
var ChoroplethLegendModel = require('./choropleth-legend-model');
var CustomLegendModel = require('./custom-legend-model');
var HTMLLegendModel = require('./html-legend-model');

var LEGENDS_METADATA = {
  bubble: {
    modelClass: BubbleLegendModel,
    definitionAttrs: [ { 'fillColor': 'color' } ],
    dynamic: true
  },
  category: {
    modelClass: CategoryLegendModel,
    definitionAttrs: [ 'prefix', 'suffix' ],
    dynamic: true
  },
  choropleth: {
    modelClass: ChoroplethLegendModel,
    definitionAttrs: [ 'prefix', 'suffix' ],
    dynamic: true
  },
  custom: {
    modelClass: CustomLegendModel,
    definitionAttrs: [ { 'items': 'categories' } ]
  },
  html: {
    modelClass: HTMLLegendModel,
    definitionAttrs: [ 'html' ]
  }
};

var SHARED_ATTRS = [
  'title',
  { 'preHTMLSnippet': 'pre_html' },
  { 'postHTMLSnippet': 'post_html' }
];

var Legends = function (legendsData, deps) {
  if (!deps.visModel) throw new Error('visModel is required');

  this._legendsData = legendsData || [];
  this._visModel = deps.visModel;

  _.each(LEGENDS_METADATA, function (legendMetadata, legendType) {
    this[legendType] = this._createLegendModel(legendType, legendMetadata);
  }, this);
};

Legends.prototype._createLegendModel = function (legendType, legendMetadata) {
  var ModelClass = legendMetadata.modelClass;
  var attrs = SHARED_ATTRS.concat(legendMetadata.definitionAttrs);
  var data = this._findDataForLegend(legendType);

  // Flatten data.definition
  data = data && _.extend({},
    _.omit(data, 'definition'),
    data.definition);

  var modelAttrs = {};
  _.each(attrs, function (attr) {
    var attrNameInData = attr;
    var attrNameForModel = attr;
    if (_.isObject(attr)) {
      attrNameForModel = Object.keys(attr)[0];
      attrNameInData = attr[attrNameForModel];
    }

    modelAttrs[attrNameForModel] = data && data[attrNameInData];
  });

  var legendModel = new ModelClass(modelAttrs, {
    visModel: this._visModel
  });

  if (data) {
    legendModel.show();
  }
  return legendModel;
};

Legends.prototype._findDataForLegend = function (legendType) {
  return _.find(this._legendsData, { type: legendType });
};

Legends.prototype.hasAnyLegend = function () {
  var legendTypes = _.keys(LEGENDS_METADATA);
  return _.some(legendTypes, function (legendType) {
    var legend = this[legendType];
    return legend && legend.isVisible();
  }, this);
};

module.exports = Legends;