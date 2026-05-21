---
applyTo: "**/*.{yml,yaml}"
---

# AKS YAML Verification Instructions

Use these rules when reviewing customer Kubernetes deployment YAML intended for Azure Kubernetes Service (AKS). Treat these as strict validation rules, not suggestions.

## Scope

- Apply these checks to workload manifests such as `Deployment`, `StatefulSet`, `DaemonSet`, `Job`, `CronJob`, and `Pod`.
- Assume the target AKS cluster uses dedicated node pools with workload isolation.
- Reject manifests that do not make scheduling intent explicit.

## Required Scheduling Rules

### 1. Every workload must target an approved node pool

- Every workload pod spec must include either:
  - `nodeSelector`, or
  - `affinity.nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution`
- The scheduling rule must target exactly one approved AKS node pool.
- Do not accept manifests that rely on default scheduling behavior.

### 2. Approved node pools

Only the following node pool names are allowed for customer workloads:

- `userapps`: default pool for standard application workloads
- `memapps`: dedicated pool for memory-intensive workloads
- `gpuapps`: dedicated pool for GPU workloads only
- `batchspot`: dedicated spot pool for interruptible batch or background workloads

Any other pool name must be rejected unless the customer provides written platform approval.

### 3. System node pool is forbidden for customer workloads

- Customer manifests must never target `system` or `systempool`.
- Customer manifests must never tolerate taints intended for system components such as `CriticalAddonsOnly`.
- Only platform-managed components may run on the system node pool.

### 4. One workload, one pool

- A single workload must target one pool only.
- Do not accept selectors or affinity rules that allow scheduling across multiple pools.
- Do not accept soft preferences such as `preferredDuringSchedulingIgnoredDuringExecution` as the only placement rule.
- Placement must be hard-required.

## Pool-Specific Enforcement

### `userapps`

- Use for standard web APIs, background services, and general business applications.
- Must not include GPU resource requests.
- Must not tolerate spot taints.

### `memapps`

- Use only when the workload is explicitly memory-heavy.
- Must include memory requests and limits.
- Must not be used as a fallback for general workloads.

### `gpuapps`

- Use only when the manifest requests GPU resources.
- GPU workloads must:
  - request GPU resources in `resources.limits`
  - target `gpuapps`
  - include the required toleration for the GPU taint if the pool is tainted
- Non-GPU workloads must never target `gpuapps`.

### `batchspot`

- Use only for workloads that are safe to evict or interrupt.
- Allowed examples: batch jobs, async workers, low-priority background processing.
- Not allowed for user-facing APIs, stateful services, or critical scheduled processing.
- Workloads targeting `batchspot` must include the appropriate spot taint toleration.

## Required Manifest Quality Checks

### Workload reliability

- `Deployment` and `StatefulSet` workloads must define:
  - resource requests and limits
  - liveness probes
  - readiness probes
- Production-facing workloads should define a `PodDisruptionBudget`.
- Multi-replica workloads should define topology spread constraints or pod anti-affinity.

### Security

- Containers must not run as privileged unless explicitly justified.
- Avoid `hostNetwork`, `hostPID`, and `hostPath` unless there is a documented exception.
- Images should be pinned to a version tag and not use `latest`.

### Operability

- Namespaces must be explicit.
- Labels must include application identity such as `app` or `app.kubernetes.io/name`.
- Environment-specific values should not be hardcoded when they belong in ConfigMaps, Secrets, or Helm values.

## Reject Conditions

Reject the manifest if any of the following are true:

- No explicit node pool placement is defined.
- The manifest can schedule onto more than one pool.
- The manifest targets the system pool.
- A general application targets `batchspot` without being interruptible.
- A workload targets `gpuapps` without requesting GPU resources.
- A workload requests GPU resources but does not target `gpuapps`.
- A memory-intensive workload targets `userapps` without an approved exception.
- Spot or GPU taints are tolerated without matching pool intent.

## Preferred Review Pattern

When validating a manifest, explicitly confirm all of the following:

1. The workload kind and workload purpose.
2. The exact node pool being targeted.
3. The mechanism used to enforce placement: `nodeSelector` or required node affinity.
4. Whether taints and tolerations match the selected pool.
5. Whether the workload type is appropriate for that pool.
6. Any missing reliability, security, or operability requirements.

## Example Accepted Placement

```yaml
spec:
  template:
    spec:
      nodeSelector:
        kubernetes.azure.com/agentpool: userapps
```

## Example Rejected Placement

```yaml
spec:
  template:
    spec:
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              preference:
                matchExpressions:
                  - key: kubernetes.azure.com/agentpool
                    operator: In
                    values:
                      - userapps
                      - memapps
```

Reason: this is only a preference and allows placement ambiguity across multiple pools.