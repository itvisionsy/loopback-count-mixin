'use strict';

module.exports = function Counts(Model) {
  
  var Promise = require('es6-promise').Promise;
  Model.afterRemote('findById', injectCounts);
  Model.afterRemote('findOne', injectCounts);
  Model.afterRemote('find', injectCounts);

  function injectCounts(ctx, unused, next) {
    var relations = extractRelationCounts(ctx);
    var resources = ctx.result;
    if (!Array.isArray(resources)) resources = [resources];
    if (!relations.length || !resources.length) {
      return next();
    }

    fillCounts(relations, resources).then(function () {
      return next();
    }, function () {
      return next();
    });
  }

  function extractRelationCounts(ctx) {
    var filter;
    if (!ctx.args || !ctx.args.filter) return [];
    if (typeof ctx.args.filter === 'string') {
      filter = JSON.parse(ctx.args.filter);
    } else {
      filter = ctx.args.filter;
    }
    var relations = filter && filter.counts;
    if (relations.constructor === Array) {
      relations = relations.map(relation => normalizeRelationObject(relation));
    } else if (typeof (relations) === 'object') {
      if (Object.keys(relations).find(k => relations.hasOwnProperty(k) && typeof (relations[k]) === 'object')) {
        let _relations = [];
        // deep
        for (let key in relations) {
          if (!relations.hasOwnProperty(key)) continue;
          _relations.push(normalizeRelationObject({ relation: key, where: relations[key] }));
        }
        relations = _relations;
      } else {
        relations = [normalizeRelationObject(relations)];
      }
    } else {
      relations = [normalizeRelationObject(relations)];
    }
    return relations.filter(function (relation) {
      return !!relation.relation && Model.relations[relation.relation] && (Model.relations[relation.relation].type.indexOf('has') === 0);
    });
  }

  function fillCounts(relations, resources) {
    return Promise.all(resources.map(function (resource) {
      return Promise.all(relations.map(function (relation) {
        return resource[relation.relation].count(relation.where).then(function (count) {
          resource[(relation.as || relation.relation) + 'Count'] = count;
        });
      }));
    }));
  }

  function normalizeRelationObject(relation) {
    return typeof (relation) === 'string' ? { relation, as: relation, where: null } : { relation: relation.relation, as: relation.relation, where: null, ...relation };
  }
};
