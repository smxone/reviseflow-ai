export function DummyComponent() {
  // Intentionally violating the Tailwind rule established in PR #3
  return (
    <div style={{ padding: "20px", backgroundColor: "blue", color: "white" }}>
      This is a temporary component to test Precedent surfacing!
    </div>
  );
}
