/*
 * @Author: dys
 * @Date: 2025-09-08 10:20:04
 * @LastEditors: dys
 * @LastEditTime: 2026-01-26 14:08:33
 * @Descripttion: Geojson网格
 */
import BaseLayer from "./BaseLayer";
import * as Cesium from 'cesium'

class Grid3DLayer extends BaseLayer {
	constructor(options) {
		super(options);
		this.url = options.url || "";
		this.name = options.name || "";
		this.Type = options.Type || "";
		this.dataSource = null;
		this.labelsVisible = true; // 添加标签可见性状态
		this.createLayer();
	}
	createLayer() {
		this.dataSource = new Cesium.GeoJsonDataSource(this.name);
		const grid = this.dataSource.load(this.url);
		grid.then((dataSource) => {
			const entities = dataSource.entities.values;
			for (let i = 0; i < entities.length; i++) {
				const entity = entities[i];
				const { agl, gridHeight, zoneType, altitude } =
					entity.properties;
				entity.Type = this.Type;
				entity.name = this.name;
				entity.polygon.height = agl.getValue();
				entity.polygon.extrudedHeight =
					gridHeight.getValue() + agl.getValue();
				entity.polygon.fill = true;
				entity.polygon.material = new Cesium.ColorMaterialProperty(
					Cesium.Color.fromCssColorString(
						this.setFillColor(zoneType.getValue())
					)
				);
				entity.polygon.outline = true;
				entity.polygon.outlineWidth = 1;
				entity.polygon.outlineColor = Cesium.Color.fromCssColorString(
					this.setOutlineColor(zoneType.getValue())
				);

				// /**
				//  * 中心
				//  */
				// // const center = Cesium.BoundingSphere.fromPoints(
				// // 	entity.polygon.hierarchy._value.positions
				// // ).center;
				// // entity.position = center;

				// /**
				//  * 右下角
				//  */
				// const positions = entity.polygon.hierarchy._value.positions;
				// let bottomRight = positions[3];

				// // 设置标签位置和属性
				// entity.position = bottomRight;

				// entity.label = {
				// 	text: `${altitude.getValue()}m`,
				// 	font: "6px sans-serif",
				// 	fillColor: Cesium.Color.fromCssColorString("#ffffffff"),
				// 	scaleByDistance: new Cesium.NearFarScalar(
				// 		1.5e2,
				// 		3.0,
				// 		1.5e5,
				// 		0.8
				// 	),
				// 	show: this.labelsVisible,
				// 	//右下
				// 	verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
				// 	horizontalOrigin: Cesium.HorizontalOrigin.RIGHT,
				// 	pixelOffset: new Cesium.Cartesian2(0, -5),
				// };
			}
		});
	}
	setFillColor(type) {
		const colorMap = {
			1: "rgba(60, 247, 3, 0.02)",
			2: "rgba(243, 243, 20, 0.02)",
			3: "rgba(237, 0, 0,0.02)",
		};
		return colorMap[type] || "#909399";
	}
	setOutlineColor(type) {
		const colorMap = {
			1: "rgba(60, 247, 3, 0.5)",
			2: "rgba(243, 243, 20,0.5)",
			3: " rgba(237, 0, 0, 0.5)",
		};
		return colorMap[type] || "#909399";
	}
	setLabelsVisible(visible) {
		this.labelsVisible = visible;

		if (!this.dataSource) return;

		const entities = this.dataSource.entities.values;
		for (let i = 0; i < entities.length; i++) {
			const entity = entities[i];
			if (entity.label) {
				// 直接更新 label 的 show 属性
				entity.label.show = Cesium.ConstantProperty(visible);
			}
		}
		return this;
	}
	addTo(viewer) {
		super.addTo(viewer);
		this.viewer.dataSources.add(this.dataSource);
		return this;
	}
	remove() {
		if (this.viewer) {
			this.viewer.dataSources.remove(this.dataSource);
			super.remove(this.viewer);
		}
		return this;
	}
	setVisible(flag) {
		super.setVisible(flag);
		this.dataSource.show = flag;
		return this;
	}
	addEventListener(eventType, handler) {
		this.dataSource.evt = new Cesium.Event();
		this.dataSource.evt.addEventListener(handler, this);
		return this;
	}
}
export default Grid3DLayer;
