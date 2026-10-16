const evidenceItems = [];
let nextId = 1;

const getAll = () => evidenceItems.map((item) => ({ ...item, author: { ...item.author } }));
const findById = (id) => evidenceItems.find((item) => item.id === id) || null;
const create = (data) => {
  const evidence = {
    ...data,
    id: `EVD-${String(nextId++).padStart(4, "0")}`,
    createdAt: new Date().toISOString(),
    author: { ...data.author }
  };
  evidenceItems.unshift(evidence);
  return { ...evidence, author: { ...evidence.author } };
};

const memoryRepository = { getAll, findById, create };
module.exports = process.env.VERA_EVIDENCE_COMMENT_STORE === "supabase"
  ? require("./supabaseEvidenceRepository")
  : memoryRepository;
