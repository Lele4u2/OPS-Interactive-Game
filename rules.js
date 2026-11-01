
"use strict";

// Source-aligned rules from the OPS User Guide.
// Practice aircraft slots and starting inventory are NOT
// official execution-workbook data.

window.OPS_RULES = Object.freeze({
  roles: ["MOB", "CAOC", "SPACE", "MEDCOM"],

  boards: {
    MOB: "assets/mob.png",
    CAOC: "assets/caoc.png",
    SPACE: "assets/cspoc.png",
    MEDCOM: "assets/medcom.png"
  },

  RFIs: [
    "Crash Fire Rescue",
    "Mobility Support",
    "Ramp Space",
    "Air Traffic Control",
    "Equipment",
    "Bed Down",
    "Fuel",
    "Airfield Security",
    "Host Nation Support",
    "Medical Capability"
  ],

  tasks: [
    "Bed Down and Sanitation",
    "Power",
    "Command and Control",
    "Contracts",
    "Ramp Security",
    "Perimeter Security",
    "Missile Defense",
    "Camouflage and Base Hardening",
    "Airfield Operations",
    "Mobility Support",
    "Integrated Combat Turns",
    "Specialized Fueling Operations",
    "Host Nation Relationships",
    "Health and Welfare",
    "Base Recovery",
    "Logistics Support"
  ],

  categories: [
    "Establish",
    "Defend",
    "Operate",
    "Maintain"
  ],

  // Zero-based task numbers:
  // Task 1 requires Task 2.
  // Task 10 requires Task 5.
  prerequisites: {
    0: [1],
    9: [4]
  },

  // Establish and Operate tasks.
  fighterGate: [0, 1, 2, 3, 8, 9, 10, 11],

  // Practice slots, not official aircraft capacities.
  aircraft: [
    {id: "C17", name: "C-17", slots: 8},
    {id: "C130", name: "C-130", slots: 5},
    {id: "C5", name: "C-5", slots: 12}
  ],

  dice(mode, roll) {
    if (mode === "team") {
      return {
        title: "EVENT / RISK — TEAM",
        explanation: `Team ${roll} selected.`,
        note:
          "One Event and one Risk Card per turn. " +
          "A separate D4 determines the FOS. " +
          "Instructor adjudicates the actual card. " +
          "The effect applies the following turn."
      };
    }

    if (mode === "fos") {
      return {
        title: "EVENT / RISK — FOS",
        explanation: `FOS ${roll} selected.`,
        note:
          "The instructor determines the actual card outcome. " +
          "Apply the effect on the following turn."
      };
    }

    if (mode === "risk") {
      if (roll === 1) {
        return {
          title: "RISK FAILED",
          explanation:
            "General assumed risk fails; loss may result.",
          note:
            "General D10 rule. Specific risk tables override it."
        };
      }

      if (roll <= 4) {
        return {
          title: "SUCCESS WITH DAMAGE",
          explanation:
            "The risk succeeds, but affected equipment " +
            "or personnel are inoperable for one turn.",
          note: "General D10 Risk Token rule."
        };
      }

      return {
        title: "SUCCESS — NO ADDITIONAL CONSEQUENCE",
        explanation:
          "The risk succeeds without an additional consequence.",
        note: "General D10 Risk Token rule."
      };
    }

    if (mode === "c5") {
      if (roll <= 3) {
        return {
          title: "C-5 CRASH",
          explanation:
            "Aircraft, personnel, and equipment are lost.",
          note:
            "Specific D20 C-5 FOS landing table. " +
            "USTRANSCOM landing restrictions still apply."
        };
      }

      if (roll <= 6) {
        return {
          title: "SIGNIFICANT DAMAGE",
          explanation:
            "Successful landing; aircraft broken for two turns.",
          note: "Specific C-5 FOS landing rule."
        };
      }

      if (roll <= 10) {
        return {
          title: "MINOR DAMAGE",
          explanation:
            "Successful landing; aircraft broken for one turn.",
          note: "Specific C-5 FOS landing rule."
        };
      }

      return {
        title: "SUCCESSFUL C-5 LANDING",
        explanation: "Aircraft lands without damage.",
        note: "Specific C-5 FOS landing rule."
      };
    }

    if (mode === "dp4" || mode === "dp10") {
      return {
        title: "DEMORALIZATION POINTS",
        explanation: `${roll} Demoralization Points.`,
        note:
          mode === "dp4"
            ? "D4 applies to twice the required personnel " +
              "deployed without assigned tasks."
            : "D10 applies to three times the required personnel " +
              "deployed without assigned tasks."
      };
    }

    return {
      title: "INSTRUCTOR REVIEW",
      explanation: String(roll),
      note:
        "Resolve combat using the applicable strength dice " +
        "and instructor adjudication."
    };
  }
});
