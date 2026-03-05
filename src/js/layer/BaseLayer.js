/*
 * @Author: dys
 * @Date: 2025-09-08 10:19:57
 * @LastEditors: dys
 * @LastEditTime: 2025-09-25 10:07:35
 * @Descripttion: 图层基础
 */
import Util from "./Util";

class BaseLayer {
  constructor(options) {
    this.options = options ? options : {};
    this.id = this.options.id ? this.options.id : Util.generateUUID();
    this.name = this.options.name ? this.options.name : this.id;
    this.show = this.options.show ? this.options.show : true;
  }
  addTo(viewer) {
    this.viewer = viewer;
  }
  remove() {
    this.viewer = null;
  }
  setVisible(flag) {
    this.show = flag;
  }
}
export default BaseLayer;
