/*
 * @Author: dys
 * @Date: 2025-09-08 10:19:28
 * @LastEditors: dys
 * @LastEditTime: 2025-09-25 10:07:39
 * @Descripttion: 工具
 */

class Util {

    constructor() {
    }
    /**
     * 生成uuid
     */
    static generateUUID() {
        var d = new Date().getTime();
        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = (d + Math.random()*16)%16 | 0;
            d = Math.floor(d/16);
            return (c=='x' ? r : (r&0x3|0x8)).toString(16);
        });
        return uuid;
    }

}

export default Util;
