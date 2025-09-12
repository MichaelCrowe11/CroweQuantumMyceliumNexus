param(
    [Parameter(Mandatory=$false)]
    [string]$BenchmarkSuite = "all",
    
    [Parameter(Mandatory=$false)]
    [int]$Iterations = 10,
    
    [Parameter(Mandatory=$false)]
    [string]$OutputDir = "benchmark-results",
    
    [Parameter(Mandatory=$false)]
    [switch]$ClassicalOnly,
    
    [Parameter(Mandatory=$false)]
    [switch]$QuantumOnly,
    
    [Parameter(Mandatory=$false)]
    [switch]$GenerateReport,
    
    [Parameter(Mandatory=$false)]
    [string]$Namespace = "quantum-mycelium-staging"
)

$ErrorActionPreference = "Stop"

# Set working directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
Set-Location $projectRoot

Write-Host "⚡ QuantumMycelium Nexus Performance Benchmarks" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

# Create output directory
if (!(Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

# Benchmark configuration
$benchmarkConfig = @{
    baseUrl = "http://localhost:8300"
    namespace = $Namespace
    iterations = $Iterations
    warmupIterations = 3
    timeout = 600  # 10 minutes per benchmark
    classicalEnabled = !$QuantumOnly.IsPresent
    quantumEnabled = !$ClassicalOnly.IsPresent
}

# Initialize benchmark results
$benchmarkResults = @{
    startTime = Get-Date
    configuration = $benchmarkConfig
    results = @()
    summary = @{}
}

# Benchmark test cases
$benchmarkTests = @{
    "matrix_operations" = @{
        name = "Matrix Operations"
        description = "Large matrix multiplication and eigenvalue decomposition"
        sizes = @(32, 64, 128, 256)
        complexity = "O(n³)"
        myceliumCode = @"
fn matrix_benchmark(size: usize) -> BenchmarkResult {
    let a = create_random_matrix(size, size);
    let b = create_random_matrix(size, size);
    
    let start = get_time();
    let result = matrix_multiply(a, b);
    let eigenvalues = compute_eigenvalues(result);
    let end = get_time();
    
    return BenchmarkResult {
        computation_time: end - start,
        result_size: eigenvalues.len(),
        memory_used: estimate_memory_usage(result)
    };
}

fn main() {
    return matrix_benchmark(INPUT_SIZE);
}
"@
        quantumCode = @"
quantum fn quantum_matrix_benchmark(size: usize) -> BenchmarkResult {
    let qubits = allocate_qubits(log2(size * size));
    
    let start = get_time();
    encode_matrices(qubits, size);
    apply_quantum_matrix_operations(qubits);
    let result = measure_result_matrix(qubits);
    let eigenvalues = quantum_eigenvalue_algorithm(qubits);
    let end = get_time();
    
    return BenchmarkResult {
        computation_time: end - start,
        result_size: eigenvalues.len(),
        memory_used: estimate_quantum_memory_usage(qubits)
    };
}

fn main() {
    return quantum_matrix_benchmark(INPUT_SIZE);
}
"@
    }
    
    "optimization_problems" = @{
        name = "Optimization Problems"
        description = "Combinatorial optimization using QAOA vs classical methods"
        sizes = @(8, 12, 16, 20)
        complexity = "Exponential"
        myceliumCode = @"
fn optimization_benchmark(problem_size: usize) -> BenchmarkResult {
    let problem = generate_max_cut_problem(problem_size);
    
    let start = get_time();
    let solution = simulated_annealing(problem, max_iterations: 10000);
    let end = get_time();
    
    return BenchmarkResult {
        computation_time: end - start,
        solution_quality: evaluate_solution(problem, solution),
        iterations_used: 10000
    };
}

fn main() {
    return optimization_benchmark(INPUT_SIZE);
}
"@
        quantumCode = @"
quantum fn qaoa_optimization_benchmark(problem_size: usize) -> BenchmarkResult {
    let qubits = allocate(problem_size);
    let problem = generate_max_cut_problem(problem_size);
    
    let start = get_time();
    let solution = qaoa_solve(qubits, problem, p_layers: 5);
    let end = get_time();
    
    return BenchmarkResult {
        computation_time: end - start,
        solution_quality: evaluate_solution(problem, solution),
        quantum_depth: calculate_circuit_depth(qubits)
    };
}

fn main() {
    return qaoa_optimization_benchmark(INPUT_SIZE);
}
"@
    }
    
    "machine_learning" = @{
        name = "Machine Learning"
        description = "Classification and clustering algorithms"
        sizes = @(100, 500, 1000, 2000)
        complexity = "O(n² to n³)"
        myceliumCode = @"
fn ml_benchmark(dataset_size: usize) -> BenchmarkResult {
    let (features, labels) = generate_classification_dataset(dataset_size, dimensions: 10);
    
    let start = get_time();
    let model = train_svm(features, labels);
    let accuracy = cross_validate(model, features, labels, folds: 5);
    let end = get_time();
    
    return BenchmarkResult {
        computation_time: end - start,
        accuracy: accuracy,
        model_complexity: model.support_vectors.len()
    };
}

fn main() {
    return ml_benchmark(INPUT_SIZE);
}
"@
        quantumCode = @"
quantum fn quantum_ml_benchmark(dataset_size: usize) -> BenchmarkResult {
    let (features, labels) = generate_classification_dataset(dataset_size, dimensions: 10);
    let qubits = allocate(log2(dataset_size) + 10);
    
    let start = get_time();
    let quantum_model = train_qsvm(qubits, features, labels);
    let accuracy = quantum_cross_validate(quantum_model, features, labels, folds: 5);
    let end = get_time();
    
    return BenchmarkResult {
        computation_time: end - start,
        accuracy: accuracy,
        quantum_advantage: calculate_kernel_advantage(quantum_model)
    };
}

fn main() {
    return quantum_ml_benchmark(INPUT_SIZE);
}
"@
    }
    
    "graph_algorithms" = @{
        name = "Graph Algorithms"
        description = "Shortest path and network analysis"
        sizes = @(50, 100, 200, 500)
        complexity = "O(V²) to O(V³)"
        myceliumCode = @"
fn graph_benchmark(num_vertices: usize) -> BenchmarkResult {
    let graph = generate_random_graph(num_vertices, edge_probability: 0.3);
    
    let start = get_time();
    let shortest_paths = floyd_warshall(graph);
    let centrality = calculate_betweenness_centrality(graph);
    let communities = detect_communities(graph);
    let end = get_time();
    
    return BenchmarkResult {
        computation_time: end - start,
        paths_computed: shortest_paths.len(),
        communities_found: communities.len()
    };
}

fn main() {
    return graph_benchmark(INPUT_SIZE);
}
"@
        quantumCode = @"
quantum fn quantum_graph_benchmark(num_vertices: usize) -> BenchmarkResult {
    let graph = generate_random_graph(num_vertices, edge_probability: 0.3);
    let qubits = allocate(log2(num_vertices * num_vertices));
    
    let start = get_time();
    encode_adjacency_matrix(qubits, graph);
    let shortest_paths = quantum_shortest_paths(qubits);
    let communities = quantum_community_detection(qubits);
    let end = get_time();
    
    return BenchmarkResult {
        computation_time: end - start,
        paths_computed: shortest_paths.len(),
        quantum_speedup: estimate_speedup(qubits)
    };
}

fn main() {
    return quantum_graph_benchmark(INPUT_SIZE);
}
"@
    }
    
    "mycelial_modeling" = @{
        name = "Mycelial Network Modeling"
        description = "Biological network simulation and analysis"
        sizes = @(100, 500, 1000, 2000)
        complexity = "O(n²) simulation"
        myceliumCode = @"
fn mycelial_benchmark(network_size: usize) -> BenchmarkResult {
    let network = create_mycelial_network(network_size);
    let environment = setup_environment();
    
    let start = get_time();
    let growth_simulation = simulate_growth(network, environment, time_steps: 1000);
    let nutrient_flow = calculate_nutrient_distribution(network);
    let stability_analysis = analyze_network_stability(network);
    let end = get_time();
    
    return BenchmarkResult {
        computation_time: end - start,
        network_complexity: calculate_complexity_measure(network),
        convergence_steps: growth_simulation.steps_to_convergence
    };
}

fn main() {
    return mycelial_benchmark(INPUT_SIZE);
}
"@
        quantumCode = @"
quantum fn quantum_mycelial_benchmark(network_size: usize) -> BenchmarkResult {
    let network = create_mycelial_network(network_size);
    let environment = setup_environment();
    let qubits = allocate(log2(network_size) + 8);
    
    let start = get_time();
    let quantum_state = encode_network_topology(qubits, network);
    let growth_patterns = quantum_simulate_growth(qubits, environment, time_steps: 1000);
    let optimal_flow = quantum_optimize_nutrient_flow(qubits);
    let end = get_time();
    
    return BenchmarkResult {
        computation_time: end - start,
        quantum_efficiency: calculate_quantum_efficiency(qubits),
        entanglement_measure: measure_network_entanglement(qubits)
    };
}

fn main() {
    return quantum_mycelial_benchmark(INPUT_SIZE);
}
"@
    }
}

function Write-BenchmarkHeader {
    param([string]$BenchmarkName)
    Write-Host "`n⚡ Benchmark: $BenchmarkName" -ForegroundColor Yellow
    Write-Host ("=" * ($BenchmarkName.Length + 13)) -ForegroundColor Yellow
}

function Run-SingleBenchmark {
    param(
        [string]$TestName,
        [hashtable]$TestConfig,
        [int]$Size,
        [string]$Mode  # "classical", "quantum", or "hybrid"
    )
    
    $results = @()
    
    # Determine which code to use
    $codeToExecute = switch ($Mode) {
        "classical" { $TestConfig.myceliumCode -replace "INPUT_SIZE", $Size }
        "quantum" { $TestConfig.quantumCode -replace "INPUT_SIZE", $Size }
        "hybrid" { 
            # Combine both for hybrid execution
            $TestConfig.quantumCode -replace "INPUT_SIZE", $Size
        }
    }
    
    Write-Host "   Running $Mode mode (size: $Size)..." -ForegroundColor Gray
    
    # Warmup iterations
    for ($i = 0; $i -lt $benchmarkConfig.warmupIterations; $i++) {
        try {
            $warmupResult = Invoke-HybridComputation -Code $codeToExecute -Mode $Mode
            Write-Host "      Warmup $($i+1)/$($benchmarkConfig.warmupIterations) completed" -ForegroundColor Gray
        } catch {
            Write-Host "      Warmup $($i+1) failed: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
    
    # Actual benchmark iterations
    for ($i = 0; $i -lt $benchmarkConfig.iterations; $i++) {
        $iterationStart = Get-Date
        
        try {
            $result = Invoke-HybridComputation -Code $codeToExecute -Mode $Mode
            $iterationEnd = Get-Date
            $executionTime = ($iterationEnd - $iterationStart).TotalMilliseconds
            
            $benchmarkResult = @{
                testName = $TestName
                mode = $Mode
                size = $Size
                iteration = $i + 1
                executionTimeMs = $executionTime
                success = $true
                result = $result
                timestamp = $iterationStart
            }
            
            $results += $benchmarkResult
            Write-Host "      Iteration $($i+1)/$($benchmarkConfig.iterations): $($executionTime.ToString('F2'))ms" -ForegroundColor Green
            
        } catch {
            Write-Host "      Iteration $($i+1) failed: $($_.Exception.Message)" -ForegroundColor Red
            
            $benchmarkResult = @{
                testName = $TestName
                mode = $Mode
                size = $Size
                iteration = $i + 1
                executionTimeMs = -1
                success = $false
                error = $_.Exception.Message
                timestamp = $iterationStart
            }
            
            $results += $benchmarkResult
        }
    }
    
    return $results
}

function Invoke-HybridComputation {
    param(
        [string]$Code,
        [string]$Mode
    )
    
    # Prepare the API request
    $requestBody = @{
        mycelium_code = $Code
        optimization_level = if ($Mode -eq "quantum") { "quantum" } else { "basic" }
        parameters = @{
            mode = $Mode
            enable_quantum = ($Mode -ne "classical")
        }
    } | ConvertTo-Json
    
    # Make the API call
    $response = Invoke-RestMethod -Uri "$($benchmarkConfig.baseUrl)/api/v1/compute/hybrid" `
        -Method POST `
        -Body $requestBody `
        -ContentType "application/json" `
        -TimeoutSec $benchmarkConfig.timeout
    
    return $response
}

function Calculate-BenchmarkStatistics {
    param([array]$Results)
    
    $successfulResults = $Results | Where-Object { $_.success -eq $true }
    $executionTimes = $successfulResults | ForEach-Object { $_.executionTimeMs }
    
    if ($executionTimes.Count -eq 0) {
        return @{
            count = 0
            mean = 0
            median = 0
            stddev = 0
            min = 0
            max = 0
            successRate = 0
        }
    }
    
    $sortedTimes = $executionTimes | Sort-Object
    $mean = ($executionTimes | Measure-Object -Average).Average
    $median = if ($sortedTimes.Count % 2 -eq 0) {
        ($sortedTimes[$sortedTimes.Count/2 - 1] + $sortedTimes[$sortedTimes.Count/2]) / 2
    } else {
        $sortedTimes[[Math]::Floor($sortedTimes.Count/2)]
    }
    
    $variance = ($executionTimes | ForEach-Object { [Math]::Pow($_ - $mean, 2) } | Measure-Object -Average).Average
    $stddev = [Math]::Sqrt($variance)
    
    return @{
        count = $executionTimes.Count
        mean = $mean
        median = $median
        stddev = $stddev
        min = ($executionTimes | Measure-Object -Minimum).Minimum
        max = ($executionTimes | Measure-Object -Maximum).Maximum
        successRate = $successfulResults.Count / $Results.Count
    }
}

function Generate-ComparisonReport {
    param([hashtable]$AllResults)
    
    Write-Host "`n📊 Performance Comparison Report" -ForegroundColor Cyan
    Write-Host "=================================" -ForegroundColor Cyan
    
    foreach ($testName in $AllResults.Keys) {
        $testResults = $AllResults[$testName]
        
        Write-Host "`n🔬 Test: $testName" -ForegroundColor Yellow
        
        foreach ($size in ($testResults.Keys | Sort-Object)) {
            $sizeResults = $testResults[$size]
            
            Write-Host "   📏 Size: $size" -ForegroundColor White
            
            $classicalStats = if ($sizeResults.ContainsKey("classical")) {
                Calculate-BenchmarkStatistics $sizeResults["classical"]
            } else { $null }
            
            $quantumStats = if ($sizeResults.ContainsKey("quantum")) {
                Calculate-BenchmarkStatistics $sizeResults["quantum"]
            } else { $null }
            
            $hybridStats = if ($sizeResults.ContainsKey("hybrid")) {
                Calculate-BenchmarkStatistics $sizeResults["hybrid"]
            } else { $null }
            
            # Display results
            if ($classicalStats) {
                Write-Host "      🖥️  Classical: $($classicalStats.mean.ToString('F2'))ms ± $($classicalStats.stddev.ToString('F2'))" -ForegroundColor Gray
            }
            
            if ($quantumStats) {
                Write-Host "      ⚛️  Quantum:   $($quantumStats.mean.ToString('F2'))ms ± $($quantumStats.stddev.ToString('F2'))" -ForegroundColor Blue
            }
            
            if ($hybridStats) {
                Write-Host "      🔗 Hybrid:    $($hybridStats.mean.ToString('F2'))ms ± $($hybridStats.stddev.ToString('F2'))" -ForegroundColor Purple
            }
            
            # Calculate speedup
            if ($classicalStats -and $quantumStats -and $classicalStats.mean -gt 0) {
                $speedup = $classicalStats.mean / $quantumStats.mean
                $speedupColor = if ($speedup > 1) { "Green" } else { "Red" }
                Write-Host "      🚀 Quantum Speedup: $($speedup.ToString('F2'))x" -ForegroundColor $speedupColor
            }
            
            if ($classicalStats -and $hybridStats -and $classicalStats.mean -gt 0) {
                $hybridSpeedup = $classicalStats.mean / $hybridStats.mean
                $hybridColor = if ($hybridSpeedup > 1) { "Green" } else { "Red" }
                Write-Host "      ⚡ Hybrid Speedup: $($hybridSpeedup.ToString('F2'))x" -ForegroundColor $hybridColor
            }
        }
    }
}

# Main benchmark execution
Write-Host "🚀 Starting performance benchmarks..." -ForegroundColor Green
Write-Host "   Configuration:" -ForegroundColor Gray
Write-Host "      Suite: $BenchmarkSuite" -ForegroundColor Gray
Write-Host "      Iterations: $Iterations" -ForegroundColor Gray
Write-Host "      Classical: $($benchmarkConfig.classicalEnabled)" -ForegroundColor Gray
Write-Host "      Quantum: $($benchmarkConfig.quantumEnabled)" -ForegroundColor Gray
Write-Host "      Output: $OutputDir" -ForegroundColor Gray

$allResults = @{}

# Determine which tests to run
$testsToRun = if ($BenchmarkSuite -eq "all") {
    $benchmarkTests.Keys
} else {
    @($BenchmarkSuite)
}

foreach ($testName in $testsToRun) {
    if (!$benchmarkTests.ContainsKey($testName)) {
        Write-Host "❌ Unknown benchmark: $testName" -ForegroundColor Red
        continue
    }
    
    $testConfig = $benchmarkTests[$testName]
    Write-BenchmarkHeader $testConfig.name
    Write-Host "   Description: $($testConfig.description)" -ForegroundColor Gray
    Write-Host "   Complexity: $($testConfig.complexity)" -ForegroundColor Gray
    
    $allResults[$testName] = @{}
    
    foreach ($size in $testConfig.sizes) {
        Write-Host "`n   📐 Testing size: $size" -ForegroundColor Cyan
        
        $allResults[$testName][$size] = @{}
        
        # Run classical benchmark
        if ($benchmarkConfig.classicalEnabled) {
            $classicalResults = Run-SingleBenchmark -TestName $testName -TestConfig $testConfig -Size $size -Mode "classical"
            $allResults[$testName][$size]["classical"] = $classicalResults
            
            $classicalStats = Calculate-BenchmarkStatistics $classicalResults
            Write-Host "      🖥️  Classical: $($classicalStats.mean.ToString('F2'))ms (success: $($classicalStats.successRate.ToString('P0')))" -ForegroundColor White
        }
        
        # Run quantum benchmark
        if ($benchmarkConfig.quantumEnabled) {
            $quantumResults = Run-SingleBenchmark -TestName $testName -TestConfig $testConfig -Size $size -Mode "quantum"
            $allResults[$testName][$size]["quantum"] = $quantumResults
            
            $quantumStats = Calculate-BenchmarkStatistics $quantumResults
            Write-Host "      ⚛️  Quantum: $($quantumStats.mean.ToString('F2'))ms (success: $($quantumStats.successRate.ToString('P0')))" -ForegroundColor Blue
        }
        
        # Run hybrid benchmark (if both are enabled)
        if ($benchmarkConfig.classicalEnabled -and $benchmarkConfig.quantumEnabled) {
            $hybridResults = Run-SingleBenchmark -TestName $testName -TestConfig $testConfig -Size $size -Mode "hybrid"
            $allResults[$testName][$size]["hybrid"] = $hybridResults
            
            $hybridStats = Calculate-BenchmarkStatistics $hybridResults
            Write-Host "      🔗 Hybrid: $($hybridStats.mean.ToString('F2'))ms (success: $($hybridStats.successRate.ToString('P0')))" -ForegroundColor Purple
        }
    }
    
    $benchmarkResults.results += @{
        testName = $testName
        config = $testConfig
        results = $allResults[$testName]
    }
}

# Generate comparison report
Generate-ComparisonReport $allResults

# Save detailed results
$benchmarkResults.endTime = Get-Date
$benchmarkResults.duration = $benchmarkResults.endTime - $benchmarkResults.startTime

$resultsPath = Join-Path $OutputDir "performance-benchmarks.json"
$benchmarkResults | ConvertTo-Json -Depth 10 | Out-File $resultsPath

Write-Host "`n📄 Detailed results saved to: $resultsPath" -ForegroundColor Gray

# Generate summary report
if ($GenerateReport) {
    $reportPath = Join-Path $OutputDir "benchmark-report.html"
    # Would generate HTML report here
    Write-Host "📊 HTML report would be generated at: $reportPath" -ForegroundColor Gray
}

Write-Host "`n✅ Performance benchmarking complete!" -ForegroundColor Green
Write-Host "   Total duration: $($benchmarkResults.duration.TotalMinutes.ToString('F1')) minutes" -ForegroundColor Gray