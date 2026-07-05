// @ts-nocheck
// react-tinder-card@1.6.4 をベースにしたローカル版。
// 変更点: カードの移動を「横一直線（縦ロック）＋横移動量ベースの回転」に固定し、
//   指の縦移動による“ゆらゆら”を排除。ジェスチャー/スプリング処理は本家のまま
//   （touchstart で preventDefault するため、ドラッグ途中で戻る pointercancel が起きない）。
import React from "react"
import { useSpring, animated } from "@react-spring/web"

const settings = {
  maxTilt: 18, // deg（自前版の rotate = dragX/20 相当の見た目に寄せる）
  rotationDivisor: 20, // 横移動量 dx をこの値で割って回転角に
  swipeThreshold: 0.5,
}

const physics = {
  touchResponsive: { friction: 50, tension: 2000 },
  animateOut: { friction: 30, tension: 400 },
  animateBack: { friction: 10, tension: 200 },
}

const pythagoras = (x, y) => Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2))

const clamp = (v, min, max) => Math.max(min, Math.min(v, max))

// 退場アニメ。縦成分は 0 に固定して横方向へまっすぐ飛ばす
const animateOut = async (gesture, setSpringTarget, windowHeight, windowWidth) => {
  const diagonal = pythagoras(windowHeight, windowWidth)
  const dirX = gesture.x >= 0 ? 1 : -1
  const speed = Math.max(Math.abs(gesture.x), 0.6) // 遅すぎる時の最低速
  const finalX = diagonal * dirX
  const finalY = 0
  const finalRotation = dirX * 45
  const duration = diagonal / (speed * 1000)
  // フライアウトの最低アニメーション時間(ms)。大きいほどゆっくり飛ぶ
  const minDuration = 800

  setSpringTarget.start({
    xyrot: [finalX, finalY, finalRotation],
    config: { duration: Math.max(duration, minDuration) },
  })

  return await new Promise((resolve) =>
    setTimeout(resolve, Math.max(duration, minDuration))
  )
}

const animateBack = (setSpringTarget) => {
  return new Promise((resolve) => {
    setSpringTarget.start({ xyrot: [0, 0, 0], config: physics.animateBack, onRest: resolve })
  })
}

// 方向判定は実ジェスチャー（dx/dy or vx/vy）で行う（縦ロックは見た目だけ）
const getSwipeDirection = (property) => {
  if (Math.abs(property.x) > Math.abs(property.y)) {
    if (property.x > settings.swipeThreshold) return "right"
    else if (property.x < -settings.swipeThreshold) return "left"
  } else {
    if (property.y > settings.swipeThreshold) return "down"
    else if (property.y < -settings.swipeThreshold) return "up"
  }
  return "none"
}

const AnimatedDiv = animated.div

const LineTinderCard = React.forwardRef(
  (
    {
      flickOnSwipe = true,
      children,
      onSwipe,
      onCardLeftScreen,
      onDrag,
      className,
      preventSwipe = [],
      swipeRequirementType = "velocity",
      swipeThreshold = settings.swipeThreshold,
      // 指ドラッグでのスワイプを無効化する（ボタン操作のみにする）場合は false
      draggable = true,
    },
    ref
  ) => {
    const [{ xyrot }, setSpringTarget] = useSpring(() => ({
      xyrot: [0, 0, 0],
      config: physics.touchResponsive,
    }))

    settings.swipeThreshold = swipeThreshold

    React.useImperativeHandle(ref, () => ({
      async swipe(dir = "right") {
        if (onSwipe) onSwipe(dir)
        const power = 1.3
        if (dir === "right") await animateOut({ x: power, y: 0 }, setSpringTarget, window.innerHeight, window.innerWidth)
        else if (dir === "left") await animateOut({ x: -power, y: 0 }, setSpringTarget, window.innerHeight, window.innerWidth)
        if (onCardLeftScreen) onCardLeftScreen(dir)
      },
      async restoreCard() {
        await animateBack(setSpringTarget)
      },
    }))

    const handleSwipeReleased = React.useCallback(
      async (setSpringTarget, gesture) => {
        if (onDrag) onDrag(0) // 離したらスタンプを消す
        const dir = getSwipeDirection({
          x: swipeRequirementType === "velocity" ? gesture.vx : gesture.dx,
          y: swipeRequirementType === "velocity" ? gesture.vy : gesture.dy,
        })

        if (dir !== "none" && flickOnSwipe && !preventSwipe.includes(dir)) {
          // 左右のみ飛ばす（上下は preventSwipe で弾かれ animateBack）
          if (dir === "left" || dir === "right") {
            if (onSwipe) onSwipe(dir)
            const x = swipeRequirementType === "velocity" ? gesture.vx : gesture.dx
            await animateOut({ x, y: 0 }, setSpringTarget, window.innerHeight, window.innerWidth)
            if (onCardLeftScreen) onCardLeftScreen(dir)
            return
          }
        }

        // 飛ばさない場合は元の位置へ
        animateBack(setSpringTarget)
      },
      [swipeRequirementType, flickOnSwipe, preventSwipe, onSwipe, onCardLeftScreen, onDrag]
    )

    const gestureStateFromWebEvent = (ev, startPositon, lastPosition, isTouch) => {
      let dx = isTouch ? ev.touches[0].clientX - startPositon.x : ev.clientX - startPositon.x
      let dy = isTouch ? ev.touches[0].clientY - startPositon.y : ev.clientY - startPositon.y

      if (startPositon.x === 0 && startPositon.y === 0) {
        dx = 0
        dy = 0
      }

      const vx = -(dx - lastPosition.dx) / (lastPosition.timeStamp - Date.now())
      const vy = -(dy - lastPosition.dy) / (lastPosition.timeStamp - Date.now())

      return { dx, dy, vx, vy, timeStamp: Date.now() }
    }

    const element = React.useRef()

    React.useLayoutEffect(() => {
      let startPositon = { x: 0, y: 0 }
      let lastPosition = { dx: 0, dy: 0, vx: 0, vy: 0, timeStamp: Date.now() }
      let isClicking = false
      const el = element.current

      const onTouchStart = (ev) => {
        // 指ドラッグ無効時はジェスチャー追跡せず、preventDefault もしない
        // （カード内の縦スクロールをブラウザに任せる）
        if (!draggable) return
        if (!ev.srcElement.className.includes("pressable") && ev.cancelable) {
          ev.preventDefault()
        }
        const gestureState = gestureStateFromWebEvent(ev, startPositon, lastPosition, true)
        lastPosition = gestureState
        startPositon = { x: ev.touches[0].clientX, y: ev.touches[0].clientY }
      }

      const onMouseDown = (ev) => {
        isClicking = true
        const gestureState = gestureStateFromWebEvent(ev, startPositon, lastPosition, false)
        lastPosition = gestureState
        startPositon = { x: ev.clientX, y: ev.clientY }
      }

      // ★ 縦ロック：xyrot の y は常に 0。回転は横移動量 dx ベースで安定させる
      const handleMove = (gestureState) => {
        if (!draggable) return // 指ドラッグ無効時はカードを動かさない（ボタン操作のみ）
        if (onDrag) onDrag(gestureState.dx) // ドラッグ量を通知（スタンプ表示用）
        let rot = clamp(gestureState.dx / settings.rotationDivisor, -settings.maxTilt, settings.maxTilt)
        if (isNaN(rot)) rot = 0
        setSpringTarget.start({
          xyrot: [gestureState.dx, 0, rot],
          config: physics.touchResponsive,
        })
      }

      const onMouseMove = (ev) => {
        if (!isClicking) return
        const gestureState = gestureStateFromWebEvent(ev, startPositon, lastPosition, false)
        lastPosition = gestureState
        handleMove(gestureState)
      }

      const onMouseUp = () => {
        if (!isClicking) return
        isClicking = false
        handleSwipeReleased(setSpringTarget, lastPosition)
        startPositon = { x: 0, y: 0 }
        lastPosition = { dx: 0, dy: 0, vx: 0, vy: 0, timeStamp: Date.now() }
      }

      const onTouchMove = (ev) => {
        const gestureState = gestureStateFromWebEvent(ev, startPositon, lastPosition, true)
        lastPosition = gestureState
        handleMove(gestureState)
      }

      const onTouchEnd = () => {
        handleSwipeReleased(setSpringTarget, lastPosition)
        startPositon = { x: 0, y: 0 }
        lastPosition = { dx: 0, dy: 0, vx: 0, vy: 0, timeStamp: Date.now() }
      }

      el.addEventListener("touchstart", onTouchStart)
      el.addEventListener("mousedown", onMouseDown)
      el.addEventListener("touchmove", onTouchMove)
      el.addEventListener("touchend", onTouchEnd)
      window.addEventListener("mousemove", onMouseMove)
      window.addEventListener("mouseup", onMouseUp)

      return () => {
        el.removeEventListener("touchstart", onTouchStart)
        el.removeEventListener("touchmove", onTouchMove)
        el.removeEventListener("touchend", onTouchEnd)
        el.removeEventListener("mousedown", onMouseDown)
        window.removeEventListener("mousemove", onMouseMove)
        window.removeEventListener("mouseup", onMouseUp)
      }
    }, [handleSwipeReleased, setSpringTarget, onDrag, draggable])

    return React.createElement(AnimatedDiv, {
      ref: element,
      className,
      style: {
        transform: xyrot.to((x, y, rot) => `translate3d(${x}px, ${y}px, 0px) rotate(${rot}deg)`),
      },
      children,
    })
  }
)

// 利用側に props 型を提供（本体は @ts-nocheck のため型が落ちる）
interface LineTinderCardProps {
  flickOnSwipe?: boolean
  children?: React.ReactNode
  onSwipe?: (dir: "left" | "right" | "up" | "down") => void
  onCardLeftScreen?: (dir: "left" | "right" | "up" | "down") => void
  onDrag?: (dx: number) => void
  className?: string
  preventSwipe?: string[]
  swipeRequirementType?: "velocity" | "position"
  swipeThreshold?: number
  draggable?: boolean
}

// ボタンなどから命令的にスワイプさせるためのハンドル
export interface TinderCardHandle {
  swipe: (dir?: "left" | "right" | "up" | "down") => Promise<void>
  restoreCard: () => Promise<void>
}

export default LineTinderCard as React.ForwardRefExoticComponent<
  LineTinderCardProps & React.RefAttributes<TinderCardHandle>
>
