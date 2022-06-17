<template>
  <div>
    <!-- 图片上传组件:这里整合的是elementUI的组件-->
    <el-upload
      v-show="false"
      :action="uploadUrl"
      :headers="header"
      :show-file-list="false"
      :on-success="uploadSuccess"
      :on-error="uploadError"
      :before-upload="beforeUpload"
      class="avatar-uploader"
      accept="image/*"
      name="file" />
    <!-- 实际富文本显示区域 -->
    <quill-editor
      ref="myQuillEditor"
      v-model="content"
      :options="editorOption"
      class="editor"
      @blur="onEditorBlur($event)"
      @focus="onEditorFocus($event)"
      @change="onEditorChange($event)" />
  </div>
</template>
<script>
// 需要引入的文件
import { quillEditor } from 'vue-quill-editor'
import 'quill/dist/quill.core.css'
import 'quill/dist/quill.snow.css'
import 'quill/dist/quill.bubble.css'
import { getToken } from "@/utils/auth";
// 工具栏配置
const toolbarOptions = [
  ['bold', 'italic', 'underline', 'strike'], // 加粗 斜体 下划线 删除线
  ['blockquote', 'code-block'], // 引用  代码块
  [{ header: 1 }, { header: 2 }], // 1、2 级标题
  [{ list: 'ordered' }, { list: 'bullet' }], // 有序、无序列表
  [{ script: 'sub' }, { script: 'super' }], // 上标/下标
  [{ indent: '-1' }, { indent: '+1' }], // 缩进
  // [{'direction': 'rtl'}],                         // 文本方向
  // [{ size: ['small', false, 'large', 'huge'] }], // 字体大小
  [{ header: [1, 2, 3, 4, 5, 6, false] }], // 标题
  [{ color: [] }, { background: [] }], // 字体颜色、字体背景颜色
  [{ font: [] }], // 字体种类
  [{ align: [] }], // 对齐方式
  ['clean'], // 清除文本格式
  ['link', 'image'] // 链接、图片、视频 ['link', 'image', 'video']
]

export default {
  components: {
    quillEditor
  },
  props: {
    /* 编辑器的内容 */
    value: {
      type: String,
      default: ''
    },
    /* 图片大小 */
    maxSize: {
      type: Number,
      default: 1024 * 5 // kb
    },
    cancelOperate:{
      type: Boolean
    }
  },
  data() {
    return {
      uploadUrl: process.env.VUE_APP_BASE_API + "/common/upload", // 上传的图片服务器地址
      content: this.value,
      quillUpdateImg: false, // 根据图片上传状态来确定是否显示loading动画，刚开始是false,不显示
      uploadImages: [], // 已上传的所有图片
      currentImages:[], // 当前存在的图片
      allImages:[], // 出现过的所有的图片
      isCancel: false,
      editorOption: {
        theme: 'snow', // or 'bubble'
        placeholder: '请在这里输入...',
        modules: {
          toolbar: {
            container: toolbarOptions,
            handlers: {
              // 处理图片上传
              image: function(value) {
                if (value) {
                  // 触发input框选择图片文件
                  document.querySelector('.avatar-uploader input').click()
                } else {
                  this.quill.format('image', false)
                }
              }
            }
          }
        }
      },
      header: {
        Authorization: "Bearer " + getToken()
        // token: sessionStorage.token
      }, // 有的图片服务器要求请求头需要有token
    }
  },
  computed:{
    isOpen(){ // 根据弹窗是否显示, 来判断是否清空图片列表数据
      return this.cancelOperate
    }
  },

  watch:{
    isOpen:{
      handler(val){
        if (!val){
          this.currentImages = []
          this.allImages = []
          this.uploadImages = []
        }
      }
    },
    value:{
      handler(val){
        this.content = val ? val : '';
        // 当前弹窗所有的图片
        this.currentImages = this.getSrc(val).map(item => item.replace(`${process.env.VUE_APP_BASE_API}/profile/upload`,'')).filter(item => item.indexOf('data:image') === -1)
        if (this.currentImages.length !== 0){
          this.currentImages.forEach(item => {
            if (this.allImages.length !== 0){
              if (this.allImages.indexOf(item) === -1) this.allImages.push(item)
            }else {
              this.allImages.push(item)
            }
          })
        }
      },
      immediate: true
    }
  },

  methods: {
    // 失去焦点事件
    onEditorBlur() {
    },
    onEditorFocus() {
      // 获得焦点事件
    },

    // 内容改变事件
    onEditorChange() {
      this.$emit('input', this.content)
      this.$nextTick(() => {
        // 抛出事件，把要删除的列表数据抛出
        let remove = this.allImages.filter(item => this.currentImages.every((e) => e !== item))
        this.$emit('remove-images',remove,this.uploadImages)
      })

    },
    // 富文本图片上传前
    beforeUpload() {
      // 显示loading动画
      this.quillUpdateImg = true
    },
    uploadSuccess(res, file) {
      // res为图片服务器返回的数据
      // 获取富文本组件实例
      const quill = this.$refs.myQuillEditor.quill
      // 如果上传成功
      if (res.code == 200) {
        this.$message.success('图片上传成功')
        // 获取光标所在位置
        const length = quill.getSelection().index
        // 插入图片  res.url为服务器返回的图片地址，需要拼接图片服务根地址
        quill.insertEmbed(length, 'image', process.env.VUE_APP_BASE_API + res.fileName)
        // 调整光标到最后
        quill.setSelection(length + 1)
        this.uploadImages.push(res.fileName.replace('/profile/upload',''))
      } else {
        this.$message.warning('图片插入失败')
      }
      // loading动画消失
      this.quillUpdateImg = false
    },
    // 富文本图片上传失败
    uploadError() {
      // loading动画消失
      this.quillUpdateImg = false
      this.$message.warning('图片插入失败')
    },
    /**
     * 取出区域内所有img的src
     */
    getSrc (html) {
      let imgReg = /<img.*?(?:>|\/>)/gi
      // 匹配src属性
      let srcReg = /src=[\\"]?([^\\"]*)[\\"]?/i
      let arr = html.match(imgReg)
      let imgs = []
      if (arr) {
        for (let i = 0; i < arr.length; i++) {
          var src = arr[i].match(srcReg)[1]
          imgs.push(src)
        }
      }
      return imgs
    },
  }
}
</script>
<!-- 富文本样式，需要加哦，不然有问题 -->
<style lang="scss">
.editor {
  // width: 700px;
  line-height: normal !important;
  .ql-editor {
    min-height: 300px !important;
    height: auto;
  }
  .ql-snow .ql-tooltip[data-mode='link']::before {
    content: '请输入链接地址:';
  }
  .ql-snow .ql-tooltip.ql-editing a.ql-action::after {
    border-right: 0px;
    content: '保存';
    padding-right: 0px;
  }

  .ql-snow .ql-tooltip[data-mode='video']::before {
    content: '请输入视频地址:';
  }

  .ql-snow .ql-picker.ql-size .ql-picker-label::before,
  .ql-snow .ql-picker.ql-size .ql-picker-item::before {
    content: '14px';
  }
  .ql-snow .ql-picker.ql-size .ql-picker-label[data-value='small']::before,
  .ql-snow .ql-picker.ql-size .ql-picker-item[data-value='small']::before {
    content: '10px';
  }
  .ql-snow .ql-picker.ql-size .ql-picker-label[data-value='large']::before,
  .ql-snow .ql-picker.ql-size .ql-picker-item[data-value='large']::before {
    content: '18px';
  }
  .ql-snow .ql-picker.ql-size .ql-picker-label[data-value='huge']::before,
  .ql-snow .ql-picker.ql-size .ql-picker-item[data-value='huge']::before {
    content: '32px';
  }

  .ql-snow .ql-picker.ql-header .ql-picker-label::before,
  .ql-snow .ql-picker.ql-header .ql-picker-item::before {
    content: '文本';
  }
  .ql-snow .ql-picker.ql-header .ql-picker-label[data-value='1']::before,
  .ql-snow .ql-picker.ql-header .ql-picker-item[data-value='1']::before {
    content: '标题1';
  }
  .ql-snow .ql-picker.ql-header .ql-picker-label[data-value='2']::before,
  .ql-snow .ql-picker.ql-header .ql-picker-item[data-value='2']::before {
    content: '标题2';
  }
  .ql-snow .ql-picker.ql-header .ql-picker-label[data-value='3']::before,
  .ql-snow .ql-picker.ql-header .ql-picker-item[data-value='3']::before {
    content: '标题3';
  }
  .ql-snow .ql-picker.ql-header .ql-picker-label[data-value='4']::before,
  .ql-snow .ql-picker.ql-header .ql-picker-item[data-value='4']::before {
    content: '标题4';
  }
  .ql-snow .ql-picker.ql-header .ql-picker-label[data-value='5']::before,
  .ql-snow .ql-picker.ql-header .ql-picker-item[data-value='5']::before {
    content: '标题5';
  }
  .ql-snow .ql-picker.ql-header .ql-picker-label[data-value='6']::before,
  .ql-snow .ql-picker.ql-header .ql-picker-item[data-value='6']::before {
    content: '标题6';
  }

  .ql-snow .ql-picker.ql-font .ql-picker-label::before,
  .ql-snow .ql-picker.ql-font .ql-picker-item::before {
    content: '标准字体';
  }
  .ql-snow .ql-picker.ql-font .ql-picker-label[data-value='serif']::before,
  .ql-snow .ql-picker.ql-font .ql-picker-item[data-value='serif']::before {
    content: '衬线字体';
  }
  .ql-snow .ql-picker.ql-font .ql-picker-label[data-value='monospace']::before,
  .ql-snow .ql-picker.ql-font .ql-picker-item[data-value='monospace']::before {
    content: '等宽字体';
  }
}
</style>
