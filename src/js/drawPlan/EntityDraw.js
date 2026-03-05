import * as Cesium from 'cesium'

export default class EntityDraw {
	constructor(viewer, dataAbove) {
		this.viewer = viewer;
		this.dataAbove = dataAbove;
		this.viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(
			Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
		);
		this.initEvents();
	}

	//激活
	activate(drawType) {
		this.deactivate();
		this.clear();
		this.drawType = drawType;
		this.positions = [];
		this.tempPositions = [];
		this.startpoint = null; //矩形绘制起点
		this.endpoint = null; //矩形绘制终点
		this.posArr = []; //矩形绘制动态点集合
		this.registerEvents(); //注册鼠标事件

		//设置鼠标状态
		// this.viewer.enableCursorStyle = false;
		// this.viewer._element.style.cursor = 'default';

		this.viewer._element.style.cursor = "pointer";
		this.viewer.enableCursorStyle = true;
		// this.DrawStartEvent.raiseEvent("开始绘制");
	}

	//禁用
	deactivate() {
		this.unRegisterEvents();
		this.drawType = undefined;
		this.drawEntity = undefined;

		// this.viewer._element.style.cursor = 'pointer';
		// this.viewer.enableCursorStyle = true;
		this.viewer._element.style.cursor = "default";
		this.viewer.enableCursorStyle = true;
	}

	//清空绘制
	clear() {
		if (this.drawEntity) {
			this.viewer.entities.remove(this.drawEntity);
			this.drawEntity = undefined;
		}
	}

	//初始化事件
	initEvents() {
		this.handler = new Cesium.ScreenSpaceEventHandler(
			this.viewer.scene.canvas
		);
		this.DrawStartEvent = new Cesium.Event(); //开始绘制事件
		this.DrawEndEvent = new Cesium.Event(); //结束绘制事件
	}

	//注册鼠标事件
	registerEvents() {
		this.leftClickEvent();
		this.rightClickEvent();
		this.mouseMoveEvent();
	}

	leftClickEvent() {
		//单击鼠标左键画点
		this.handler.setInputAction((e) => {
			// this.viewer._element.style.cursor = 'default';
			let position = this.viewer.scene.pickPosition(e.position);
			position = this.viewer.scene.camera.pickEllipsoid(
				e.position,
				this.viewer.scene.globe.ellipsoid
			);
			if (!position) return;
			this.positions.push(position);
			if (this.positions.length == 1) {
				if (this.drawType == "Rectangle") {
					let car = Cesium.Cartographic.fromCartesian(position);
					// 弧度转化为经纬度，十进制表示，保留五位小数
					let lon = Cesium.Math.toDegrees(car.longitude).toFixed(5);
					let lat = Cesium.Math.toDegrees(car.latitude).toFixed(5);
					this.startpoint = {
						lon: lon * 1,
						lat: lat * 1,
						height: 0,
					};
					this.posArr = Cesium.Rectangle.fromDegrees(
						this.startpoint.lon,
						this.startpoint.lat,
						this.startpoint.lon,
						this.startpoint.lat
					);
				}
				this.handleFirstPosition();
			} else if (this.positions.length == 2) {
				if (this.drawType == "Rectangle") {
					this.generateRectangle();
					this.drawEnd();
				}
			}
		}, Cesium.ScreenSpaceEventType.LEFT_CLICK);
	}

	handleFirstPosition() {
		switch (this.drawType) {
			case "Point":
				this.generatePoint();
				this.drawEnd();
				break;
			case "Polyline":
				this.generatePolyline();
				break;
			case "Polygon":
				this.generatePolygon();
				break;
			case "Rectangle":
				this.generateRectangle();
		}
	}

	generatePoint() {
		this.drawEntity = this.viewer.entities.add({
			position: this.positions[0],
			point: {
				pixelSize: 4,
				color: Cesium.Color.RED,
			},
		});
	}

	generatePolyline() {
		this.drawEntity = this.viewer.entities.add({
			polyline: {
				positions: new Cesium.CallbackProperty((e) => {
					return this.tempPositions;
				}, false),
				width: 2,
				material: Cesium.Color.RED,
			},
		});
	}

	generatePolygon() {
		this.drawEntity = this.viewer.entities.add({
			polygon: {
				hierarchy: new Cesium.CallbackProperty((e) => {
					return new Cesium.PolygonHierarchy(this.tempPositions);
					//使用最新1.72的时候 必须返回PolygonHierarchy类型 Cannot read property 'length' of undefined
					//低版本好像都可以
				}, false),
				material: Cesium.Color.RED.withAlpha(0.4),
				perPositionHeight: false,
			},
			polyline: {
				positions: new Cesium.CallbackProperty((e) => {
					return this.tempPositions.concat(this.tempPositions[0]);
				}, false),
				width: 1,
				material: Cesium.Color.RED,
			},
		});
	}

	generateRectangle() {
		this.clear();
		this.drawEntity = this.viewer.entities.add({
			rectangle: {
				coordinates: new Cesium.CallbackProperty(() => {
					return this.posArr;
				}, false),
				material: Cesium.Color.RED.withAlpha(0.4),
			},
		});
	}

	mouseMoveEvent() {
		this.handler.setInputAction((e) => {
			this.viewer._element.style.cursor = "pointer"; //由于鼠标移动时 Cesium会默认将鼠标样式修改为手柄 所以移动时手动设置回来
			let position = this.viewer.scene.pickPosition(e.endPosition);
			position = this.viewer.scene.camera.pickEllipsoid(
				e.startPosition,
				this.viewer.scene.globe.ellipsoid
			);
			if (!position) return;
			if (!this.drawEntity) return;
			if (this.drawType != "Rectangle") {
				this.tempPositions = this.positions.concat([position]);
			} else {
				let car = Cesium.Cartographic.fromCartesian(position);
				// 弧度转化为经纬度，十进制表示，保留五位小数
				let lon4 = Cesium.Math.toDegrees(car.longitude).toFixed(5);
				let lat4 = Cesium.Math.toDegrees(car.latitude).toFixed(5);
				this.endpoint = {
					lon: lon4 * 1,
					lat: lat4 * 1,
					height: 0,
				};
				if (
					this.endpoint.lon < this.startpoint.lon &&
					this.endpoint.lat > this.startpoint.lat
				) {
					// 第二象限
					this.posArr = Cesium.Rectangle.fromDegrees(
						this.endpoint.lon,
						this.startpoint.lat,
						this.startpoint.lon,
						this.endpoint.lat
					);
				} else if (
					this.endpoint.lon > this.startpoint.lon &&
					this.endpoint.lat > this.startpoint.lat
				) {
					// 第一象限
					this.posArr = Cesium.Rectangle.fromDegrees(
						this.startpoint.lon,
						this.startpoint.lat,
						this.endpoint.lon,
						this.endpoint.lat
					);
				} else if (
					this.endpoint.lon < this.startpoint.lon &&
					this.endpoint.lat < this.startpoint.lat
				) {
					// 第三象限
					this.posArr = Cesium.Rectangle.fromDegrees(
						this.endpoint.lon,
						this.endpoint.lat,
						this.startpoint.lon,
						this.startpoint.lat
					);
				} else {
					// 第四象限
					this.posArr = Cesium.Rectangle.fromDegrees(
						this.startpoint.lon,
						this.endpoint.lat,
						this.endpoint.lon,
						this.startpoint.lat
					);
				}
			}
		}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
	}

	rightClickEvent() {
		this.handler.setInputAction((e) => {
			if (!this.drawEntity) {
				this.deactivate();
				return;
			}
			switch (this.drawType) {
				case "Polyline":
					this.drawEntity.polyline.positions = this.positions;
					this.minPositionCount = 2;
					break;
				case "Polygon":
					this.drawEntity.polygon.hierarchy = this.positions;
					this.drawEntity.polyline.positions = this.positions.concat(
						this.positions[0]
					);
					this.minPositionCount = 3;
					break;
				case "Rectangle":
					this.drawEntity.rectangle.coordinates = this.posArr;
					this.minPositionCount = 2;
					break;
			}
			if (this.positions.length < this.minPositionCount) {
				this.clear();
				this.deactivate();
				return;
			}
			this.drawEnd();
		}, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
	}

	//解除鼠标事件
	unRegisterEvents() {
		this.handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);
		this.handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
		this.handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
		this.handler.removeInputAction(
			Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
		);
	}

	//绘制结束 触发结束事件
	drawEnd() {
		this.drawEntity.remove = () => {
			this.viewer.entities.remove(this.drawEntity);
		};
		this.DrawEndEvent.raiseEvent(
			this.drawEntity,
			this.positions,
			this.drawType
		);
		this.deactivate();
	}
}
