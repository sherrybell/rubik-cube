import * as THREE from './three/three.js'
require('./three/OrbitControls.js')
import TWEEN from './three/tween.js'


// import Counter from './timeCount.js'
// let ct = new Counter({flag: true, max : 30})
// ct.flag = false
//let ctx = canvas.getContext('WebGL')
/**
 * 游戏主函数
 */
export default class Main {
  constructor() {
    // 场景
    this.scene = new THREE.Scene();
    // 透视摄像头
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    // webGL渲染器
    this.renderer = new THREE.WebGLRenderer({canvas: canvas});
    this.allCubes = []
    this.initCubes = []
    this.orbitControl = null // 控制器
    this.normalize = null // 法向量
    this.intersect = null //触点对象
    this.isRotating = false
    this.points = {
      start: null,
      move: null,
      end: null
    }
    this.start()

  }
  renderGameBegin () {
    ctx.fillStyle = "#ffffff"
    ctx.font = "20px Arial"
    ctx.fillText(
      '开始游戏',
      window.innerWidth / 2 - 40,
      window.innerHeight / 2 - 100 + 50
    )
  }
  cameraPosAnimation () {
    // let pos = {x: 20,y: 20,z: 20}
    let tween = new TWEEN.Tween(this.camera.position)
    .to({x: 9, y: 9, z: 9}, 7000)
    .start()
  }
  start() {
   // this.renderGameBegin()
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.lookAt(this.scene.position)
    this.camera.position.set(30,19,19);
    this.cameraPosAnimation()
    this.initRubik()
    this.initOrbitControl()
    this.beginGame()
  }
  initRubik() {
    let mats = [
      new THREE.MeshBasicMaterial({ color: 0x009e60 }),
      new THREE.MeshBasicMaterial({ color: 0x0051ba }),
      new THREE.MeshBasicMaterial({ color: 0xffd500 }),
      new THREE.MeshBasicMaterial({ color: 0xff5800 }),
      new THREE.MeshBasicMaterial({ color: 0xc41e3a }),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    ]
    let faceMaterial = new THREE.MeshFaceMaterial(mats)
    let iii = -1
    for (let x = 0; x < 3; x++) {
      for (let y = 0; y < 3; y++) {
        for (let z = 0; z < 3; z++) {
          iii++
          let cubeGeom = new THREE.CubeGeometry(2.9, 2.9, 2.9)
          // let newmal = new THREE.MeshBasicMaterial({
          //     map: new THREE.TextureLoader().load(`images/cubes/${iii + 8}.png`)
          // })
          // let cube = new THREE.Mesh(cubeGeom, newmal)
         let cube = new THREE.Mesh(cubeGeom, faceMaterial)
          
          cube.position.set(x * 3 - 3, y * 3 - 3, z * 3 - 3)
          cube.name = cube.id
          this.initCubes.push({
            x: cube.position.x,
            y: cube.position.y,
            z: cube.position.z,
            name: cube.id
          })
          this.allCubes.push(cube)
          this.scene.add(cube)
          

        }

      }

    }
    let outergeo = new THREE.CubeGeometry(9, 9, 9)
    let outermesh = new THREE.Mesh(outergeo, new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0 }))
    outermesh.name = "outer"
    this.scene.add(outermesh)
  }
  initOrbitControl() {
    this.orbitControl = new THREE.OrbitControls(this.camera, this.renderer.domElement)
    this.orbitControl.enabled = true
    this.orbitControl.enableZoom = false
    this.orbitControl.target = this.scene.position
    this.loop()
  }
  getIntersect(event) {
    let raycaster = new THREE.Raycaster()
    let mouse = new THREE.Vector2()
    let objects = []
    mouse.set(
      (event.touches[0].clientX / window.innerWidth) * 2 - 1,
      -(event.touches[0].clientY / window.innerHeight) * 2 + 1,
    )
   
    raycaster.setFromCamera(mouse, this.camera)
    let intersects = raycaster.intersectObjects([this.scene.getObjectByName('outer'), ...this.allCubes])
    if (intersects.length > 0) {
      this.normalize = intersects[0].face.normal
      this.intersect = intersects[1]
    } else {
      this.intersect = null
    }
  }
  initEvents () {
    wx.onTouchStart( this.touchStart.bind(this))
    wx.onTouchMove( this.touchMove.bind(this))
    wx.onTouchEnd( this.touchEnd.bind(this))
  }
  touchStart(event) {
    this.getIntersect(event)
    if (!this.isRotating && this.intersect) {
      console.log('触点对象', this.intersect.object.name)
      this.orbitControl.enabled = false
      this.points.start = this.intersect.point
    }
  }
  touchMove(event) {
    this.getIntersect(event)
    if (this.intersect) {
      if (!this.isRotating && this.points.start) {
        console.log('终点对象', this.intersect,)
        this.points.move = this.intersect.point
        if (!this.points.move.equals(this.points.start)) {
          this.isRotating = true
          let sub = this.points.move.sub(this.points.start)
          let dir = this.getDirection(sub)
          let eleGroups = this.getRotateGroups(this.intersect, dir)
          let vm = this
          window.requestAnimationFrame(function (timestamp) {
            vm.rotateAnimation(eleGroups, dir, timestamp, 0)
          })
        }
      }
    }
  }
  touchEnd(event) {
    
    this.orbitControl.enabled = true
    this.intersect = null
    this.normalize = null
    this.points.start = null
    this.points.move = null
  }
  // 获取旋转方向
  getDirection(vector3) {
    let direction = -1
    let rotates = {
      xLine: new THREE.Vector3(1, 0, 0),
      xLineAd: new THREE.Vector3(-1, 0, 0),
      yLine: new THREE.Vector3(0, 1, 0),
      yLineAd: new THREE.Vector3(0, -1, 0),
      zLine: new THREE.Vector3(0, 0, 1),
      zLineAd: new THREE.Vector3(0, 0, -1)
    }
    //判断差向量与轴间的夹角
    let { xAngle, xAngleAd, yAngle, yAngleAd, zAngle, zAngleAd } = {
      xAngle: vector3.angleTo(rotates.xLine),
      xAngleAd: vector3.angleTo(rotates.xLineAd),
      yAngle: vector3.angleTo(rotates.yLine),
      yAngleAd: vector3.angleTo(rotates.yLineAd),
      zAngle: vector3.angleTo(rotates.zLine),
      zAngleAd: vector3.angleTo(rotates.zLineAd)
    }
    let minAngle = Math.min(...[xAngle, xAngleAd, yAngle, yAngleAd, zAngle, zAngleAd])
    if (minAngle) {
      switch (minAngle) {
        case xAngle:
          direction = 0 //x轴正方向
          if (this.normalize.equals(rotates.yLine)) {
            direction += 0.1 //绕z轴顺时针
          } else if (this.normalize.equals(rotates.yLineAd)) {
            direction += 0.2 //z轴逆时针
          } else if (this.normalize.equals(rotates.zLine)) {
            direction += 0.3 //y轴逆时针
          } else if (this.normalize.equals(rotates.zLineAd)) {
            direction += 0.4 //y轴顺时针
          }
          break
        case xAngleAd:
          direction = 1 //x轴反方向
          if (this.normalize.equals(rotates.yLine)) {
            direction += 0.1 //绕z轴逆时针
          } else if (this.normalize.equals(rotates.yLineAd)) {
            direction += 0.2 //z轴顺时针
          } else if (this.normalize.equals(rotates.zLine)) {
            direction += 0.3 //y轴顺时针
          } else if (this.normalize.equals(rotates.zLineAd)) {
            direction += 0.4 //y轴逆时针
          }
          break
        case yAngle:
          direction = 2 //y轴正方向
          if (this.normalize.equals(rotates.zLine)) {
            direction += 0.1 //绕x轴逆时针
          } else if (this.normalize.equals(rotates.zLineAd)) {
            direction += 0.2 //x轴顺时针
          } else if (this.normalize.equals(rotates.xLine)) {
            direction += 0.3 //z轴逆时针
          } else if (this.normalize.equals(rotates.xLineAd)) {
            direction += 0.4 //z轴顺时针
          }
          break
        case yAngleAd:
          direction = 3 //y轴反方向
          if (this.normalize.equals(rotates.zLine)) {
            direction += 0.1 //绕x轴顺时针
          } else if (this.normalize.equals(rotates.zLineAd)) {
            direction += 0.2 //x轴逆时针
          } else if (this.normalize.equals(rotates.xLine)) {
            direction += 0.3 //z轴顺时针
          } else if (this.normalize.equals(rotates.xLineAd)) {
            direction += 0.4 //z轴逆时针
          }
          break
        case zAngle:
          direction = 4 //z轴正方向
          if (this.normalize.equals(rotates.yLine)) {
            direction += 0.1 //绕x轴顺时针
          } else if (this.normalize.equals(rotates.yLineAd)) {
            direction += 0.2 //x轴逆时针
          } else if (this.normalize.equals(rotates.xLine)) {
            direction += 0.3 //y轴顺时针
          } else if (this.normalize.equals(rotates.xLineAd)) {
            direction += 0.4 //y轴逆时针
          }
          break
        case zAngleAd:
          direction = 5 //z轴反方向
          if (this.normalize.equals(rotates.yLine)) {
            direction += 0.1 //绕x轴逆时针
          } else if (this.normalize.equals(rotates.yLineAd)) {
            direction += 0.2 //x轴顺时针
          } else if (this.normalize.equals(rotates.xLine)) {
            direction += 0.3 //y轴逆时针
          } else if (this.normalize.equals(rotates.xLineAd)) {
            direction += 0.4 //y轴顺时针
          }
          break
        default:
          break
      }
      console.log('direction', direction)
      return direction
    }
  }
  //获取旋转方块组
  getRotateGroups(target, direction) {
    let ids = this.allCubes.map(item => {
      return item.name
    })
    let minId = Math.min(...ids)
    let targetId = target.object.name - minId
    let numI = parseInt(targetId / 9)
    let numJ = targetId % 9
    let groups = []
    switch (direction) {
      //绕z轴
      //case 4:
      //case 5:
      case 0.1:
      case 0.2:
      case 1.1:
      case 1.2:
      case 2.3:
      case 2.4:
      case 3.3:
      case 3.4:
        for (let i = 0 ; i < this.allCubes.length; i++) {
          if (targetId % 3 == (this.allCubes[i].name - minId) % 3) {
            groups.push(this.allCubes[i])
          }
        }
        break
      //绕y轴
      // case 2:
      // case 3:
      case 0.3:
      case 0.4:
      case 1.3:
      case 1.4:
      case 4.3:
      case 4.4:
      case 5.3:
      case 5.4:
        for (let i = 0 ; i < this.allCubes.length; i++) {
          if (parseInt(numJ / 3) == parseInt((this.allCubes[i].name - minId) % 9 / 3)) {
            groups.push(this.allCubes[i])
          }
        }
        break
      //绕x轴
      // case 0:
      // case 1:
      case 2.1:
      case 2.2:
      case 3.1:
      case 3.2:
      case 4.1:
      case 4.2:
      case 5.1:
      case 5.2:
        for (let i = 0 ; i < this.allCubes.length; i++) {
          if (numI == parseInt((this.allCubes[i].name - minId) / 9)) {
            groups.push(this.allCubes[i])
          }
        }
        break
      default:
        break
    }
    let gg = groups.map(g => { return g.name })
    console.log('rotate groups', gg)
    return groups
  }
  rotateAnimation(elements, direction, currentstamp, startstamp, laststamp) {
    let totalTime = 500
    if (startstamp == 0) {
      startstamp = currentstamp
      laststamp = currentstamp
    }
    if (currentstamp - startstamp >= totalTime) {
      currentstamp = startstamp + totalTime
      this.isRotating = false
      this.points.start = null
      this.updateCubeIndex(elements)
    }
    let theta = 90 * Math.PI / 180 * (currentstamp - laststamp) / totalTime
   
    switch (direction) {
      //z轴顺时针
      case 0.1:
      case 1.2:
      case 2.4:
      case 3.3:
        for (let i = 0; i< elements.length; i++) {
          this.rotateAroundWorld(elements[i], -theta, 'z')
        }
        break
      //z轴逆时针
      case 0.2:
      case 1.1:
      case 2.3:
      case 3.4:
        for (let i = 0; i< elements.length; i++) {
          this.rotateAroundWorld(elements[i], theta, 'z')
        }
        break
      //y轴顺时针
      case 0.4:
      case 1.3:
      case 4.3:
      case 5.4:
        for (let i = 0; i< elements.length; i++) {
          this.rotateAroundWorld(elements[i], -theta, 'y')
        }
        break
      //y轴逆时针
      case 1.4:
      case 0.3:
      case 4.4:
      case 5.3:
        for (let i = 0; i< elements.length; i++) {
          this.rotateAroundWorld(elements[i], theta, 'y')
        }
        break
      //x轴顺时针
      case 2.2:
      case 3.1:
      case 4.1:
      case 5.2:
        for (let i = 0; i< elements.length; i++) {
          this.rotateAroundWorld(elements[i], theta, 'x')
        }
        break
      //x轴逆时针
      case 2.1:
      case 3.2:
      case 4.2:
      case 5.1:
        for (let i = 0; i< elements.length; i++) {
          this.rotateAroundWorld(elements[i], -theta, 'x')
        }
        break
      default:
        break
    }
    let vm = this
    if (currentstamp - startstamp < totalTime) {
      requestAnimationFrame((timestamp) => {
        vm.rotateAnimation(elements, direction, timestamp, startstamp, currentstamp)
      })
    }
  }
  //旋转
  rotateAroundWorld(obj, rad, axixs) {
    let x0 = obj.position.x
    let y0 = obj.position.y
    let z0 = obj.position.z
    obj.matrixAutoUpdate = false
    let q = new THREE.Quaternion()
    if (axixs == 'x') {
      q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), rad)
      obj.quaternion.premultiply(q)
      obj.position.y = Math.cos(rad) * y0 - Math.sin(rad) * z0
      obj.position.z = Math.cos(rad) * z0 + Math.sin(rad) * y0
    } else if (axixs == 'y') {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rad)
      obj.quaternion.premultiply(q)
      obj.position.x = Math.cos(rad) * x0 + Math.sin(rad) * z0
      obj.position.z = Math.cos(rad) * z0 - Math.sin(rad) * x0
    } else {
      q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), rad)
      obj.quaternion.premultiply(q)
      obj.position.x = Math.cos(rad) * x0 - Math.sin(rad) * y0
      obj.position.y = Math.cos(rad) * y0 + Math.sin(rad) * x0
    }

    obj.updateMatrix()
  }
  // 更新name
  updateCubeIndex(elements) {
    for (let i=0; i< elements.length; i++) {
      let ele = elements[i]
      for (let j=0; j< this.initCubes.length; j++) {
        let item = this.initCubes[j]
        if (Math.round(ele.position.x) == item.x &&
          Math.round(ele.position.y) == item.y &&
          Math.round(ele.position.z) == item.z) {
          ele.name = item.name
          ele.elementsNeedUpdate = true
          ele.normalsNeedUpdate = true
          break
        }
      }
    }
    this.renderer.render(this.scene, this.camera)
  }
  // 随机生成几步打乱
  beginGame() {
    let vm = this
    // 获取触点，初始范围x:[224, 444], y: [102, 316]
    function getInt () {
      let a = {
        clientX: Math.floor(Math.random() * 224) + 220,
        clientY: Math.floor(Math.random() * 102) + 214
      }
      let e = { touches: [{ clientX: a.clientX, clientY: a.clientY }] }
      vm.getIntersect(e)
      if(!vm.intersect){
        getInt()
      }
      
    }
    // 随机获取方向
    function getDir() {
      let dArr = []
      for (let i = 0; i < 6; i++){
        for(let j = 1; j< 5; j++){
          dArr.push(i + j/10)
        }
       }
      return dArr.sort(() => {
        return (0.5 - Math.random())
      })
    }
    let dir = getDir()
    function initAnimate(callback) {
      return new Promise((resolve, reject) => {
        for (let i = 0; i < 11; i++) {
          setTimeout(() => {
            getInt()
            let eles = vm.getRotateGroups(vm.intersect, dir[i])
            window.requestAnimationFrame(function (timestamp) {
              vm.rotateAnimation(eles, dir[i], timestamp, 0)
            })
            if (i == 2) {
              resolve()
            }
          }, i * 650)
        }
      })
    }
    initAnimate().then(()=> {
      this.initEvents()
    })
    // todo, 600ms时间太长
  }
  // 实现游戏帧循环
  loop() {
    TWEEN.update()
    this.orbitControl.update()
    this.camera.updateProjectionMatrix()
    this.renderer.render(this.scene, this.camera);
    window.requestAnimationFrame(this.loop.bind(this), canvas);
  }
}
