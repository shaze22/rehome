import Image from 'next/image'

// Intrinsic size of each cut-out in public/kassim (see CLAUDE.md, "Kassim mascot").
const POSES = {
  'head-smile': [280, 409],
  'head-cheer': [280, 411],
  'head-shock': [280, 412],
  'head-sigh': [280, 406],
  'head-wink': [280, 406],
  'head-think': [280, 404],
  'body-wave': [420, 642],
  'body-cheer': [420, 634],
  'body-point': [420, 745],
  'body-thumbs': [420, 744],
  // 3D canon renders: hero-size use only, too detailed for icons.
  '3d-point': [355, 684],
  '3d-front': [488, 796],
  '3d-thumbs': [362, 679],
} as const

export type KassimPose = keyof typeof POSES

interface KassimProps {
  pose: KassimPose
  /** Rendered width in px; height follows the pose's aspect ratio. */
  width: number
  className?: string
  preload?: boolean
}

export function Kassim({ pose, width, className, preload }: KassimProps) {
  const [w, h] = POSES[pose]
  return (
    <Image
      src={`/kassim/${pose}.webp`}
      alt=""
      aria-hidden
      width={width}
      height={Math.round((width * h) / w)}
      className={className}
      preload={preload}
      draggable={false}
    />
  )
}

interface KassimSaysProps {
  pose: KassimPose
  title: string
  children?: React.ReactNode
  width?: number
}

/** Centred mascot + message block for empty states. */
export function KassimSays({ pose, title, children, width = 96 }: KassimSaysProps) {
  return (
    <>
      <Kassim pose={pose} width={width} className="mx-auto mb-3" />
      <p className="font-medium mb-1">{title}</p>
      {children && (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{children}</p>
      )}
    </>
  )
}
