/**
 * United Benefits advisor list for the Step-1 dropdown.
 *
 * EDIT THIS LIST — will move to ADVISOR_LIST env/Salesforce in Phase 2.
 * If NEXT_PUBLIC_ADVISOR_LIST is set (JSON array of {name, email}), it wins.
 */

export interface Advisor {
  name: string;
  email: string;
}

const STATIC_ADVISORS: Advisor[] = [
  { name: "Not sure / Assign me one", email: "" },
  { name: "Sample Advisor", email: "advisor@unitedbenefits.com" },
];

function fromEnv(): Advisor[] | null {
  const raw = process.env.NEXT_PUBLIC_ADVISOR_LIST;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      Array.isArray(parsed) &&
      parsed.length > 0 &&
      parsed.every(
        (a) =>
          a &&
          typeof a === "object" &&
          typeof (a as Advisor).name === "string" &&
          typeof (a as Advisor).email === "string"
      )
    ) {
      return parsed as Advisor[];
    }
  } catch {
    // fall through to static list
  }
  return null;
}

export const ADVISORS: Advisor[] = fromEnv() ?? STATIC_ADVISORS;
