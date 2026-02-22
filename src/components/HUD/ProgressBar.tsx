interface Props {
  percent: number;
  width?: number;
}

const base = import.meta.env.BASE_URL;

export function ProgressBar({ percent, width = 200 }: Props) {
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div className="progress-bar" style={{ width }}>
      <div className="progress-bar__frame">
        <img src={`${base}assets/ui/progressbar_left.png`} alt="" />
        <img src={`${base}assets/ui/progressbar_center.png`} alt="" className="progress-bar__frame-center" />
        <img src={`${base}assets/ui/progressbar_right.png`} alt="" />
      </div>
      <div className="progress-bar__fill-wrap">
        <div className="progress-bar__fill" style={{ width: `${clamped}%` }}>
          <img src={`${base}assets/ui/progressbar_progress_fill.png`} alt="" className="progress-bar__fill-body" />
          <img src={`${base}assets/ui/progressbar_progress_end.png`} alt="" />
        </div>
      </div>
    </div>
  );
}
