// Add this or save it in a configuration file like src/core/constants/campusMap.ts
export const MSU_BUILDINGS: Record<string, { name: string; x: number; y: number; landmark: string; tips: string }> = {
  CICS: {
    name: "College of Information and Computing Sciences",
    x: 38,
    y: 42,
    landmark: "Near CHTM & Admin Building",
    tips: "The Mac Labs and server rooms are located on the second floor."
  },
  COE: {
    name: "College of Engineering",
    x: 62,
    y: 28,
    landmark: "Adjacent to the Main Library",
    tips: "Drafting rooms and labs are located on the upper wings."
  },
  CBAA: {
    name: "College of Business Administration and Accountancy",
    x: 25,
    y: 55,
    landmark: "Near the Sunken Garden area",
    tips: "The main accountancy lecture rooms are on the ground floor."
  },
  CED: {
    name: "College of Education",
    x: 50,
    y: 65,
    landmark: "Facing the University Gymnasium",
    tips: "Laboratory High School classrooms occupy the east wing."
  },
  COA: {
    name: "College of Agriculture",
    x: 78,
    y: 50,
    landmark: "Near the demo farms and field plots",
    tips: "Soil science laboratories are situated on the right corridor."
  }
};