# Implement Devcontainer-per-Worktree for AI Agent Isolation

## Problem Statement

Currently, developers working on multiple features simultaneously face:

- Port conflicts when running multiple development environments
- Security risks when AI agents need unrestricted access to modify code
- Lack of complete isolation between different feature branches
- Difficulty running parallel development without interference

## Proposed Solution

Implement a **devcontainer-per-worktree** architecture that provides:

- Complete security isolation for AI agents
- Separate development environments per git worktree
- Identical port usage across worktrees without conflicts
- Full filesystem, network, and process isolation

## Technical Implementation

### Core Components

1. **Automated Worktree Setup Script**
   - Creates git worktree
   - Generates isolated devcontainer configuration
   - Sets up project-specific Docker Compose environment

2. **Devcontainer Configuration**
   - Unique Docker network per worktree
   - Isolated service containers (PostgreSQL, TigerBeetle)
   - Resource limits for security
   - Complete filesystem isolation

3. **Enhanced Testcontainers Integration**
   - Project-specific container naming
   - Isolated test environments
   - Automatic cleanup on worktree removal

### Security Benefits for AI Agents

- ✅ **Filesystem Isolation**: AI can only access the specific worktree
- ✅ **Network Isolation**: Separate Docker network per worktree
- ✅ **Process Isolation**: Container boundaries prevent host access
- ✅ **Resource Limits**: Memory/CPU constraints prevent resource exhaustion
- ✅ **Complete Cleanup**: Easy environment destruction

### Developer Experience

```bash
# Single command creates isolated environment
./scripts/new-isolated-worktree.sh feature/payment-processing

# VSCode automatically opens with full isolation
code ../core-poc-feature-payment-processing

# AI agents can run unrestricted within container
# All services use standard ports (7001, 7002, etc.) without conflicts
```

## Implementation Tasks

- [ ] Create `scripts/new-isolated-worktree.sh` script
- [ ] Design devcontainer template with security isolation
- [ ] Implement Docker Compose configuration with project naming
- [ ] Create isolated testcontainers setup
- [ ] Add resource limits and security constraints
- [ ] Update development documentation
- [ ] Test with multiple concurrent worktrees
- [ ] Validate AI agent isolation effectiveness

## Acceptance Criteria

1. **Multiple Worktrees**: Can run 3+ worktrees simultaneously without conflicts
2. **Port Isolation**: Each worktree uses standard ports (7001, 7002) internally
3. **AI Agent Security**: AI agents cannot access host system or other worktrees
4. **Performance**: Minimal overhead compared to current development setup
5. **Cleanup**: Complete environment removal when worktree is deleted
6. **Documentation**: Clear setup and usage instructions

## Technical Requirements

- VSCode devcontainer support
- Docker-in-Docker capability
- Isolated Docker networks
- Resource limiting
- Automated setup/teardown
- Testcontainers integration

## Benefits

- **Security**: Safe AI agent execution with complete isolation
- **Productivity**: Parallel development without interference
- **Consistency**: Identical development environments across worktrees
- **Scalability**: Easy to add more worktrees as needed
- **Maintainability**: Clean separation of concerns

## Estimated Effort

- **Development**: 2-3 days
- **Testing**: 1 day
- **Documentation**: 0.5 days
- **Total**: ~4 days

## Priority

**Medium-High** - Enables safe AI agent development and improves parallel development workflow significantly.
