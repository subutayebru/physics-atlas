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

export interface Topic {
  /** kebab-case, unique across the file */
  id: string;
  title: string;
  /** Rough altitude in the graph; drives node color */
  level: TopicLevel;
  description: string;
  /** ids of topics that should be learned first (direct edges only) */
  prerequisites: string[];
  /** Show in the goal picker on the landing view */
  featured?: boolean;
  content: ContentItem[];
}

export interface TopicGraph {
  version: number;
  domain: string;
  topics: Topic[];
}
