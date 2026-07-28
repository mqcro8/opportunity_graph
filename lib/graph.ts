import { createClient } from "@/lib/supabase/server";

interface ExpansionResult {
  expandedNodeIds: string[];
  edges: { from_node_id: string; to_node_id: string; weight: number }[];
}

export async function expandGraph(
  seedNodeIds: string[],
  opts: { hops: number } = { hops: 2 }
): Promise<ExpansionResult> {
  const supabase = await createClient();
  const visited = new Set<string>(seedNodeIds);
  let frontier = new Set<string>(seedNodeIds);
  const allEdges: ExpansionResult["edges"] = [];

  for (let hop = 0; hop < opts.hops; hop++) {
    const nextFrontier = new Set<string>();

    const { data: edges, error } = await supabase
      .from("graph_edges")
      .select("from_node_id, to_node_id, weight")
      .or(
        `from_node_id.in.(${[...frontier].join(",")}),to_node_id.in.(${[...frontier].join(",")})`
      );

    if (error) throw error;

    for (const edge of edges ?? []) {
      allEdges.push(edge);
      const neighbor =
        frontier.has(edge.from_node_id) ? edge.to_node_id : edge.from_node_id;

      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        nextFrontier.add(neighbor);
      }
    }

    frontier = nextFrontier;
  }

  return { expandedNodeIds: [...visited], edges: allEdges };
}
