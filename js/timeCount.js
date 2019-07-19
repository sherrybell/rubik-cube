export default class Counter {
  constructor(obj) {
    this.flag = obj.flag
    this.max = obj.max
    this.timer = null
    this.text = '00:00:00.000'
    this.counter()
  }
  counter() {
    let ms = 0
    let second = 0
    let minute = 0
    let hour = 0
    if (this.flag == false || this.max >= 50) {
      clearInterval(this.timer)
      ms = 0
      second = 0
      minute = 0
      hour = 0
      this.timer = null
      this.text = '00:00:00.000' // 返回默认时间设置
    } else {
      this.timer = setInterval(()=> {
          ms += 50
          if( ms == 1000){
            ms = 0
            second += 1
          }
          if ( second == 60) {
            second = 0
            minute += 1
          }
          if (minute == 60) {
            minute = 0
            hour += 1
          }
        this.text = `${this.format(hour, false)} : ${this.format(minute, false)} : ${this.format(second, false)} . ${this.format(ms, true)}`
        console.log(this.text)
      }, 50)

    }
  }
  format(val, ms) {
    if(!ms){
      return val <= 10 ? `0${val}` : val
    } else {
      return val <= 10 ? `00${val}` : val
    }
  }
}
