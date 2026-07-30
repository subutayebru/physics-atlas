# Parallel transport   {id: differential-geometry/parallel-transport}

Be able to derive and use the parallel transport equation.

## Subgoals

- Explain all the elements of the parallel transport equation.
- Distinguish between the geodesic equation and parallel transport.
- Interpret geometrically the action of parallel transport on a vector.
- Compute component transformations of a transported vector.
- Illustrate the relevance of parallel transport to different curvature types.

## Prerequisites

### Linear Algebra   {ref: linear-algebra}

- Comfortably manipulate matrix equations.                                   {id: matrix-eqs}
- Use and explain Einstein index notation.                                   {id: einstein}
- Compute vector operations.                                                 {id: vector-ops}
- Distinguish abstract vector spaces, coordinate vectors, rank-1 tensors, and 1-forms.   {id: duals, needs: matrix-eqs, einstein, vector-ops}
- Compute coordinate transformations in the dual space.                      {id: dual-transforms, needs: duals}
- Explain vectors and dual vectors as differential operators.                {needs: duals}

### Calculus   {ref: calculus-1}

- Compute derivatives.                       {id: derivatives}
- Use the chain rule.                        {id: chain-rule, needs: derivatives}
- Compute Jacobians.                         {id: jacobians, needs: derivatives}
- Parameterize curves.                       {id: parameterize-curves}

### Tangent space   {ref: differential-geometry/tangent-space}

- Explain why vectors at different points belong to different tangent spaces.   {id: different-tangent-spaces}
- Construct tangent vectors as derivatives of curves.                           {id: tangent-from-curves}
- Explain why vectors at different points cannot be added directly.             {needs: different-tangent-spaces}

### Tensors   {ref: differential-geometry/tensors}

- Explain why partial derivatives fail to transform tensorially.              {id: partial-deriv-fail}
- Derive the covariant derivative by demanding tensor transformation.         {id: covariant-derivative, needs: partial-deriv-fail}
- Compute covariant derivatives of scalars, vectors, covectors, and higher-rank tensors.   {needs: covariant-derivative}

### Connection   {ref: differential-geometry/connection}

- Explain what a connection provides geometrically.                          {id: what-connection-provides}
- Distinguish the Levi-Civita connection from general affine connections.    {id: levi-civita, needs: what-connection-provides}
- Derive Christoffel symbols from the metric and compute them in different coordinates.   {id: christoffel, needs: levi-civita}

### Metric   {ref: differential-geometry/metric}

- Explain the metric from several equivalent viewpoints.                     {id: metric-viewpoints}
- Compute lengths, angles, and volumes.                                      {id: lengths-angles-volumes, needs: metric-viewpoints}
- Raise and lower indices.                                                   {id: raise-lower, needs: metric-viewpoints}
- Derive the metric under coordinate transformations using the Jacobian.     {needs: raise-lower}
