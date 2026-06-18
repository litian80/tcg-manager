declare module "edmonds-blossom" {
  /**
   * Edmonds' maximum weighted matching algorithm (Blossom algorithm).
   *
   * @param edges Array of [nodeIdx1, nodeIdx2, weight] tuples.
   *   Node indices must be non-negative integers.
   *   Weights must be non-negative integers.
   * @param maxCardinality If true, find a maximum cardinality matching
   *   (match as many nodes as possible). If false or omitted, find a
   *   maximum weight matching.
   * @returns Array where mate[i] = index of node matched to i, or -1 if unmatched.
   */
  function blossom(
    edges: number[][],
    maxCardinality?: boolean
  ): number[];

  export = blossom;
}
