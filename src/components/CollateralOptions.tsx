const options = ["Cash", "Vehicle title", "Property", "Payment plan", "Co-signer"];

export function CollateralOptions() {
  return (
    <div className="option-grid">
      {options.map((option) => (
        <label key={option} className="check-option">
          <input type="checkbox" name="collateral" value={option} />
          <span>{option}</span>
        </label>
      ))}
    </div>
  );
}
