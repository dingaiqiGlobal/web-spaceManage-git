/**
 * Texture3D 类
 * 实现一个基于 WebGL 的 3D 纹理对象，用于体积渲染
 * 支持从数组缓冲区或帧缓冲区创建三维纹理
 */
import * as Cesium from 'cesium'
const Cartesian3 = Cesium.Cartesian3;
const Check = Cesium.Check;
const defaultValue = Cesium.defaultValue;
const defined = Cesium.defined;
const destroyObject = Cesium.destroyObject;
const DeveloperError = Cesium.DeveloperError;
const PixelFormat = Cesium.PixelFormat;
const ContextLimits = Cesium.ContextLimits;
const PixelDatatype = Cesium.PixelDatatype;
const Sampler = Cesium.Sampler;

/**
 * 3D纹理类
 * 用于创建和管理WebGL 3D纹理
 */
class Texture3D {
    constructor(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        Check.defined('options.context', options.context);
        const context = options.context;
        let width = options.width;
        let height = options.height;
        let depth = options.depth;
        let source = options.source;
        const pixelFormat = defaultValue(options.pixelFormat, PixelFormat.RGBA);
        const pixelDatatype = defaultValue(options.pixelDataType, PixelDatatype.UNSIGNED_BYTE);
        const internalFormat = PixelFormat.toInternalFormat(pixelFormat, pixelDatatype, context);
        if (!defined(width) || !defined(height) || !defined(depth)) {
            throw new DeveloperError('options requires a source field to create an 3d texture. width or height or dimension fileds');
        }
        Check.typeOf.number.greaterThan('width', width, 0);
        if (width > ContextLimits.maximumTextureSize) {
            throw new DeveloperError('width must be less than or equal to the maximum texture size');
        }
        Check.typeOf.number.greaterThan('height', height, 0);
        if (height > ContextLimits.maximumTextureSize) {
            throw new DeveloperError('height must be less than or equal to the maximum texture size');
        }
        Check.typeOf.number.greaterThan('dimensions', depth, 0);
        if (depth > ContextLimits.maximumTextureSize) {
            throw new DeveloperError('dimension must be less than or equal to the maximum texture size');
        }
        if (!PixelFormat.validate(pixelFormat)) {
            throw new DeveloperError('Invalid options.pixelFormat.');
        }
        if (!PixelDatatype.validate(pixelDatatype)) {
            throw new DeveloperError('Invalid options.pixelDatatype.');
        }
        let initialized = true;
        const gl = context._gl;
        const textureTarget = gl.TEXTURE_3D;
        const texture = gl.createTexture();
        const lxs = gl.getParameter(gl.ACTIVE_TEXTURE);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(textureTarget, texture);
        let unpackAlignment = 4;
        if (defined(source) && defined(source.arrayBufferView)) {
            unpackAlignment = PixelFormat.alignmentInBytes(pixelFormat, pixelDatatype, width);
        }
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, unpackAlignment);
        gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.BROWSER_DEFAULT_WEBGL);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        if (defined(source)) {
            if (defined(source.arrayBufferView)) {
                let arrayBufferView = source.arrayBufferView;
                gl.texImage3D(textureTarget, 0, internalFormat, width, height, depth, 0, pixelFormat, PixelDatatype.toWebGLConstant(pixelDatatype, context), arrayBufferView);
                initialized = true;
            }
        }
        gl.bindTexture(textureTarget, null);
        this._id = Cesium.createGuid();
        this._context = context;
        this._textureFilterAnisotropic = context._textureFilterAnisotropic;
        this._textureTarget = textureTarget;
        this._texture = texture;
        this._internalFormat = internalFormat;
        this._pixelFormat = pixelFormat;
        this._pixelDatatype = pixelDatatype;
        this._width = width;
        this._height = height;
        this._depth = depth;
        this._dimensions = new Cartesian3(width, height, depth);
        this._hasMinmap = false;
        this._sizeInBytes = 4;
        this._preMultiplyAlpha = false;
        this._flipY = false;
        this._initialized = initialized;
        this._sampler = undefined;
        this.sampler = defined(options.sampler) ? options.sampler : new Sampler();
    }

    /**
     * 从帧缓冲区创建3D纹理
     * @param options 帧缓冲区选项
     * @returns 新创建的3D纹理对象
     */
    static fromFramebuffer(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        Check.defined('options.context', options.context);
        const context = options.context;
        const gl = context._gl;
        const pixelFormat = defaultValue(options.pixelFormat, PixelFormat.RGB);
        const framebufferXOffset = defaultValue(options.framebufferXOffset, 0);
        const framebufferYOffset = defaultValue(options.framebufferYOffset, 0);
        const width = defaultValue(options.width, gl.drawingBufferWidth);
        const height = defaultValue(options.height, gl.drawingBufferHeight);
        const depth = defaultValue(options.depth, 128);
        const framebuffer = options.framebuffer;
        const texture = new Texture3D({
            context: context,
            width: width,
            height: height,
            depth: depth,
            pixelFormat: pixelFormat,
            source: {
                framebuffer: defined(framebuffer) ? framebuffer : context.defaultFramebuffer,
                width: width,
                height: height,
                depth: depth,
            },
        });
        return texture;
    }

    /**
     * 检查对象是否已被销毁
     * @returns 如果对象已被销毁则返回true，否则返回false
     */
    isDestroyed() {
        return false;
    }

    /**
     * 销毁对象，释放资源
     * @returns undefined
     */
    destroy() {
        this._context._gl.deleteTexture(this._texture);
        return destroyObject(this);
    }

    /**
     * 获取纹理ID
     */
    get id() {
        return this._id;
    }

    /**
     * 获取或设置采样器
     */
    get sampler() {
        return this._sampler;
    }

    /**
     * 设置采样器并更新纹理参数
     */
    set sampler(sampler) {
        let minificationFilter = sampler.minificationFilter;
        let magnificationFilter = sampler.magnificationFilter;
        const context = this._context;
        const pixelFormat = this._pixelFormat;
        const pixelDatatype = this._pixelDatatype;
        const gl = context._gl;
        const target = this._textureTarget;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(target, this._texture);
        gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, minificationFilter);
        gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, magnificationFilter);
        gl.bindTexture(target, null);
        this._sampler = sampler;
    }

    /**
     * 获取纹理尺寸
     */
    get dimensions() {
        return this._dimensions;
    }

    /**
     * 获取纹理宽度
     */
    get width() {
        return this._width;
    }

    /**
     * 获取纹理高度
     */
    get height() {
        return this._height;
    }

    /**
     * 获取纹理深度
     */
    get depth() {
        return this._depth;
    }

    /**
     * 获取纹理目标
     */
    get _target() {
        return this._textureTarget;
    }
}

export { Texture3D };