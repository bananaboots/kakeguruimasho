export type HouseRuleProps = {
  /** Centered tracked-mono text between the diamonds. */
  text?: string;
};

export function HouseRule({ text = 'The House Honours All Pulls' }: HouseRuleProps) {
  return (
    <div className="house-rule" aria-hidden>
      <span className="house-rule__line" />
      <span className="house-rule__diamond" />
      <span className="house-rule__text">{text}</span>
      <span className="house-rule__diamond" />
      <span className="house-rule__line" />
    </div>
  );
}
