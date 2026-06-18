interface Props {
  urgency: "high" | "medium" | "low" | "none";
}

export function UrgencyFlag({ urgency }: Props) {
  if (urgency === "none" || urgency === "low") return null;
  return <span className={"urgency-flag " + urgency}>{urgency}</span>;
}
