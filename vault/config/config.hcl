# vault/config/config.hcl

# UI configuration - enables the web dashboard at https://localhost:8200
ui = true

# Integrated Storage (Raft) configuration
# This stores data locally in the container at /vault/data
storage "raft" {
  path    = "/vault/data"
  node_id = "node1"
}

# Listener configuration
# Binds to 0.0.0.0 so other containers (backend/frontend) can reach it.
# WARNING: tls_disable is set to true for development/school project simplicity.
# For real production, you would provide cert_file and key_file.
listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = "true"
}

# API Address - address to advertise to other cluster members
api_addr = "https://localhost:8200"

# Cluster Address - address for cluster-to-cluster communication
cluster_addr = "https://127.0.0.1:8201"

# Prevent memory swapping (important for security)
disable_mlock = true