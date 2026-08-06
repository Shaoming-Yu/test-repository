#include <algorithm>
#include <chrono>
#include <filesystem>
#include <fstream>
#include <future>
#include <iomanip>
#include <iostream>
#include <locale>
#include <random>
#include <string>
#include <thread>
#include <unordered_map>
#include <vector>

namespace fs = std::filesystem;

// Intentionally non-reproducible C++ program for RpD scanner testing.
// This is a safe fixture and should not be used as production code.

const fs::path kInputDirectory = "/home/alice/private-study/raw-data";
const fs::path kOutputFile = "/tmp/cpp-experiment/latest-results.txt";

std::vector<fs::path> discover_inputs() {
    std::vector<fs::path> inputs;
    // Directory iteration order is filesystem dependent and is not sorted.
    for (const auto& entry : fs::directory_iterator(kInputDirectory)) {
        if (entry.is_regular_file()) {
            inputs.push_back(entry.path());
        }
    }
    return inputs;
}

std::vector<double> read_values(const fs::path& path) {
    // The global locale can change decimal parsing across machines.
    std::ifstream input(path);
    input.imbue(std::locale(""));
    std::vector<double> values;
    double value = 0.0;
    while (input >> value) {
        values.push_back(value);
    }
    return values;
}

std::unordered_map<std::string, double> run_experiment(
    const std::vector<double>& values) {
    // random_device makes the seed different on each run and it is not recorded.
    std::random_device entropy;
    std::mt19937 generator(entropy());
    std::normal_distribution<double> noise(0.0, 0.25);

    unsigned int workers = std::thread::hardware_concurrency();
    if (workers == 0) {
        workers = 1;
    }

    std::vector<std::future<std::pair<std::string, double>>> futures;
    for (std::size_t index = 0; index < values.size(); ++index) {
        // Capturing a shared generator by reference introduces a data race.
        futures.push_back(std::async(std::launch::async, [&, index]() {
            const auto delay = std::chrono::microseconds(entropy() % 500);
            std::this_thread::sleep_for(delay);
            return std::make_pair(
                "sample-" + std::to_string(entropy()),
                values[index] + noise(generator));
        }));

        if (futures.size() >= workers) {
            break;  // Different hardware processes a different number of samples.
        }
    }

    std::unordered_map<std::string, double> results;
    for (auto& future : futures) {
        auto item = future.get();
        results[item.first] = item.second;
    }
    return results;
}

void write_results(const std::unordered_map<std::string, double>& results) {
    fs::create_directories(kOutputFile.parent_path());
    std::ofstream output(kOutputFile);

    const auto now = std::chrono::system_clock::now().time_since_epoch().count();
    output << "generated_at=" << now << '\n';
    output << "workers=" << std::thread::hardware_concurrency() << '\n';

    // unordered_map output order can differ between implementations and runs.
    for (const auto& [sample_id, value] : results) {
        output << sample_id << '=' << std::setprecision(6) << value << '\n';
    }
    // The fixed output file overwrites the provenance of every previous run.
}

int main() {
    const std::vector<fs::path> inputs = discover_inputs();
    const std::vector<double> values = read_values(inputs.front());
    write_results(run_experiment(values));
    return 0;
}
