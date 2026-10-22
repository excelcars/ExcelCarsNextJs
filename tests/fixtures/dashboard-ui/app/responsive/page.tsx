export default function ResponsiveChecks() {
  return <main>{[360, 768, 1440].map(width => <section key={width}>
    <h1>{width}px dashboard viewport</h1>
    <iframe title={`Dashboard ${width}px`} src="/" width={width} height={1200} style={{ display: 'block', border: '1px solid #ddd' }} />
  </section>)}</main>
}
