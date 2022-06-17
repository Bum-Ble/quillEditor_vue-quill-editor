import { deleteFile } from '@/api/editor/editor'

export default {
  data(){
    return{
      removeList: [], // 需要删除的图片列表
      cancelStatus: false, // 点击取消按钮
      uploadList: [] // 上传图片的列表，用于点取消操作时删除图片。
    }
  },
  methods:{
    // 监听remove-images事件，获取图片列表数据
    onRemoveImages(removeList, uploadList){
      this.removeList = removeList
      this.uploadList = uploadList
    },

    // 删除图片
    onDeleteFile(){
      if (this.cancelStatus) { // 取消操作
        if (this.uploadList.length === 0){ // 没有上传照片，删除了照片但取消操作。
          this.removeList = []
        }else{ // 上传了照片
          this.removeList = this.$clone(this.uploadList)
        }
      }
      this.removeList = this.removeList.join(',')
      this.cancelStatus = false
      if (this.removeList){
        deleteFile(this.removeList).then( response => {
          console.log(response.msg)
        })
      }
    }
  }

}
