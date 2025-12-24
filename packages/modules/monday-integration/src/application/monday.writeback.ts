import type { MondayClient } from "../infrastructure/monday.client";
import type { WritebackTargets } from "../../../field-mapping/src/contracts/mapping.types";

export type ApplyAssignmentInput = {
  boardId: string;
  itemId: string;
  assigneeValue: string; // usually monday user id (for people) or text/status label
  reason?: string;
  status?: string;
};

/**
 * Apply assignment back to Monday based on Wizard-configured writeback targets.
 *
 * Supports assignedAgent target types:
 * - people: writes { personsAndTeams: [{ id, kind: "person" }] }
 * - text: writes { text: "..." }
 * - status: writes { label: "..." }
 */
export async function applyAssignmentToMonday(
  client: any,
  targets: WritebackTargets,
  input: ApplyAssignmentInput
): Promise<void> {
  const assigned = targets.assignedAgent;
  const ct = assigned.columnType ?? "people";

  if (ct === "people") {
    await client.changeColumnValue({
      boardId: assigned.boardId,
      itemId: input.itemId,
      columnId: assigned.columnId,
      value: { personsAndTeams: [{ id: Number(input.assigneeValue), kind: "person" }] },
    });
  } else if (ct === "text") {
    await client.changeColumnValue({
      boardId: assigned.boardId,
      itemId: input.itemId,
      columnId: assigned.columnId,
      value: { text: String(input.assigneeValue) },
    });
  } else if (ct === "status") {
    await client.changeColumnValue({
      boardId: assigned.boardId,
      itemId: input.itemId,
      columnId: assigned.columnId,
      value: { label: String(input.assigneeValue) },
    });
  } else {
    throw new Error(`Unsupported assignedAgent columnType: ${ct}`);
  }

  if (targets.routingStatus && input.status) {
    await client.changeColumnValue({
      boardId: targets.routingStatus.boardId,
      itemId: input.itemId,
      columnId: targets.routingStatus.columnId,
      value: { label: String(input.status) },
    });
  }

  if (targets.routingReason && input.reason) {
    await client.changeColumnValue({
      boardId: targets.routingReason.boardId,
      itemId: input.itemId,
      columnId: targets.routingReason.columnId,
      value: { text: String(input.reason) },
    });
  }
}


/**
 * Set routing meta (status/reason) without touching assignedAgent.
 * Useful for MANUAL_APPROVAL mode: mark item as Pending Approval.
 */
export async function setRoutingMetaOnMonday(
  client: any,
  targets: WritebackTargets,
  input: { boardId: string; itemId: string; status?: string; reason?: string }
): Promise<void> {
  if (targets.routingStatus && input.status) {
    await client.changeColumnValue({
      boardId: targets.routingStatus.boardId,
      itemId: input.itemId,
      columnId: targets.routingStatus.columnId,
      value: { label: String(input.status) },
    });
  }
  if (targets.routingReason && input.reason) {
    await client.changeColumnValue({
      boardId: targets.routingReason.boardId,
      itemId: input.itemId,
      columnId: targets.routingReason.columnId,
      value: { text: String(input.reason) },
    });
  }
}
