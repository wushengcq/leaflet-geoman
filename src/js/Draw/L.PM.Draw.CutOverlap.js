import lineIntersect from "@turf/line-intersect";
import get from "lodash/get";
import Utils from "../L.PM.Utils";
import Draw from './L.PM.Draw';
import { intersect } from "../helpers/turfHelper";

Draw.CutOverlap = Draw.Cut.extend({
  initialize(map) {
    this._map = map;
    this._shape = 'CutOverlap';
    this.toolbarButtonName = 'cutOverlap';
  },

  cut(cuttingLayer) {
    const all = this._map._layers;
    // contains information about snapping points
    const _latlngInfos = cuttingLayer._latlngInfos || [];

    // find all layers that intersect with `layer`, the just drawn cutting layer
    const layers = Object.keys(all)
      // convert object to array
      .map(l => all[l])
      // only layers handled by leaflet-geoman
      .filter(l => l.pm)
      // only polygon instances
      .filter(l => l instanceof L.Polygon)
      // exclude the drawn one
      .filter(l => l !== cuttingLayer)
      .filter(l => !this._layerGroup.hasLayer(l))
      // only layers with intersections
      .filter(l => {
        try {
          const lineInter = !!lineIntersect(cuttingLayer.toGeoJSON(15), l.toGeoJSON(15)).features.length > 0;
          if (lineInter) {
            return lineInter;
          }
          return !!intersect(cuttingLayer.toGeoJSON(15), l.toGeoJSON(15));
        } catch (e) {
          console.error('You cant cut polygons with self-intersections');
          return false;
        }
      });

    // loop through all layers that intersect with the drawn (cutting) layer
    // 这里 cuttingLayer 赋值给 resultLayer，但循环过程中 resultLayer 指向的对象一直在变
    // 因为在 _cutByOneLayer 函数里每次都是复制坐标数组后生成了一个新对象。
    var resultLayer = cuttingLayer;
    layers.forEach(l => {
      resultLayer = this._cutByOneLayer(l, resultLayer, _latlngInfos);
    });

    const resultingLayer = resultLayer.addTo(this._map.pm._getContainingLayer());

    // give the new layer the original options
    // 使得剪切新生成的图元加入到PM的管理中
    resultingLayer.pm.enable(this.options);
    resultingLayer.pm.disable();

    // remove old layer and cutting layer      
    cuttingLayer._pmTempLayer = true;  // add templayer prop so pm:remove isn't fired
    cuttingLayer.remove();
    cuttingLayer.removeFrom(this._map.pm._getContainingLayer());

    // Remove it only if it is a layergroup. It can be only not a layergroup if a layer exists
    if (resultingLayer.getLayers && resultingLayer.getLayers().length === 0) {
      this._map.pm.removeLayer({ target: resultingLayer });
    }

    this._addDrawnLayerProp(resultingLayer);
  },


  _cutByOneLayer(layer, cuttingLayer, latlngInfos) {
    let newLayer = L.polygon(layer.getLatLngs());
    
    // snapping points added to the layer, so borders are cutted correct
    const coords = newLayer.getLatLngs();
    latlngInfos.forEach((info) => {
      if (info && info.snapInfo) {
        const { latlng } = info;
        // get closest layer ( == input layer) with the closest segment to the intersection point
        const closest = this._calcClosestLayer(latlng, [newLayer]);
        if (closest && closest.segment && closest.distance < this.options.snapDistance) {
          const { segment } = closest;
          if (segment && segment.length === 2) {
            const { indexPath, parentPath, newIndex } = Utils._getIndexFromSegment(coords, segment);
            // define the coordsRing that is edited
            const coordsRing = indexPath.length > 1 ? get(coords, parentPath) : coords;
            coordsRing.splice(newIndex, 0, latlng);
          }
        }
      }
    });

    // find layer difference      
    const diff = this._cutLayer(newLayer, cuttingLayer);

    // the resulting layer after the cut
    let resultLayer = L.geoJSON(diff, layer.options);
    if (resultLayer.getLayers().length === 1) {
      [resultLayer] = resultLayer.getLayers(); // prevent that a unnecessary layergroup is created
    }

    return resultLayer;
  }

});
