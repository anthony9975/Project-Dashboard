// UI Layer — Card Corner Fiducials Component (Fiducials.js)
// Renders small "+" registration marks on card corners, echoing PCB fiducials and drafting blueprint aesthetic.
export default function Fiducials() {
  return (
    <>
      <span className="fid fid-tl">+</span>
      <span className="fid fid-tr">+</span>
      <span className="fid fid-bl">+</span>
      <span className="fid fid-br">+</span>
    </>
  );
}
