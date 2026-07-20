export type TopicLevel = 'foundation' | 'core' | 'advanced' | 'goal';

export type ContentType = 'book' | 'video' | 'course' | 'notes' | 'article';

export interface ContentItem {
  type: ContentType;
  title: string;
  author?: string;
  /** Optional — books often have no canonical link */
  url?: string;
  /** Short guidance: why this resource, which chapters, etc. */
  note?: string;
}

export interface Subtopic {
  /** kebab-case, unique within its parent topic */
  id: string;
  title: string;
  description?: string;
  /**
   * Unit refs: sibling shorthand "eigenvalues", full "linear-algebra/eigenvalues",
   * or a whole topic without subtopics "hs-math"
   */
  prerequisites: string[];
  /** Same ref forms; enrichment — not required to reach a goal */
  optionalPrerequisites?: string[];
  /** "After this step you can …" outcomes */
  objectives?: string[];
  content?: ContentItem[];
}

export interface Skill {
  /** kebab-case, unique */
  id: string;
  title: string;
  description: string;
  content?: ContentItem[];
}

export interface Topic {
  /** kebab-case, unique across the file */
  id: string;
  title: string;
  /** Rough altitude in the graph; drives node color */
  level: TopicLevel;
  description: string;
  /** ids of topics that should be learned first (direct edges only) */
  prerequisites: string[];
  /** Topic ids; enrichment/context edges, drawn dashed on the map */
  optionalPrerequisites?: string[];
  /** "After this step you can …" outcomes */
  objectives?: string[];
  /** Show in the goal picker on the landing view */
  featured?: boolean;
  content: ContentItem[];
  /** Optional fine structure; topics without it act as one unit */
  subtopics?: Subtopic[];
}

export interface TopicGraph {
  version: number;
  domain: string;
  topics: Topic[];
  skills?: Skill[];
}
