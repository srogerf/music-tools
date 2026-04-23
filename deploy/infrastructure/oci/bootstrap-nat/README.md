# Bootstrap NAT Gateway

This stack creates a temporary outbound internet path for the private OCI app
subnet. Use it only when the private host needs package installation or other
bootstrap-time downloads, then destroy it again.

NAT Gateway is not part of the default free-tier production path. Oracle's
Always Free resource list does not call out NAT Gateway as Always Free, and
Free Tier tenancies can hit NAT Gateway limits. Treat this stack as an optional
paid-account or limit-dependent escape hatch, not the normal bootstrap path.

## Resources

- NAT gateway
- Private route table with `0.0.0.0/0` routed to the NAT gateway
- Route table attachment for the private app subnet

## Private Config

Copy the example to `.private/` and fill in real values:

```bash
cp deploy/infrastructure/oci/bootstrap-nat/terraform.tfvars.example .private/oci/bootstrap-nat.tfvars
```

Use the app stack outputs for:

- `compartment_ocid`: `project_compartment_id`
- `vcn_id`: `vcn_id`
- `private_subnet_id`: `private_subnet_id`

If your app stack was created before `private_subnet_id` existed as an output,
run the app stack plan/apply once first. That should only update Terraform
outputs, not recreate app infrastructure.

## Workflow

If NAT Gateway is available in the tenancy, create the temporary NAT path:

```bash
bash bin/oci_bootstrap_nat_plan.sh
bash bin/oci_bootstrap_nat_apply.sh
```

Run the host bootstrap work that needs outbound internet access.

Destroy the temporary NAT path:

```bash
bash bin/oci_bootstrap_nat_destroy_plan.sh
bash bin/oci_bootstrap_nat_destroy_apply.sh
```

## Notes

- The state for this stack is intentionally local under `.private/terraform/`.
- NAT Gateway is not documented as Always Free, so keep it short-lived if used.
- If creation fails with a service limit error, do not keep retrying blindly.
  Use a free-tier-safe bootstrap approach instead, such as a pre-baked image or
  staging install artifacts through the Bastion SSH tunnel.
- Keep this stack separate from the app stack so production network posture is
  explicit and easy to review.
