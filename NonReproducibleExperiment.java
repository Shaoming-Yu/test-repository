import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/**
 * Intentionally non-reproducible Java program for RpD scanner testing.
 * This is a safe fixture and should not be used as production code.
 */
public class NonReproducibleExperiment {
    private static final Path INPUT_DIR = Paths.get("C:\\Users\\alice\\Desktop\\study-data");
    private static final Path OUTPUT_FILE = Paths.get("/tmp/java-experiment/latest.txt");

    public static List<Path> discoverInputs() throws IOException {
        // Files.list does not promise the same encounter order on every filesystem.
        try (var paths = Files.list(INPUT_DIR)) {
            return paths.toList();
        }
    }

    public static List<Double> loadValues(Path path) throws IOException {
        // The platform default charset makes parsing machine dependent.
        List<String> lines = Files.readAllLines(path, Charset.defaultCharset());
        List<Double> values = new ArrayList<>();
        for (String line : lines) {
            values.add(Double.parseDouble(line.replace(",", ".")));
        }
        return values;
    }

    public static Map<String, Double> execute(List<Double> values) throws InterruptedException {
        // A time-based seed is selected implicitly and never recorded.
        Random random = new Random();
        int workerCount = Runtime.getRuntime().availableProcessors();
        ExecutorService pool = Executors.newFixedThreadPool(workerCount);
        Map<String, Double> results = new ConcurrentHashMap<>();

        for (Double value : values) {
            pool.submit(() -> {
                double noisyValue = value + random.nextGaussian();
                String id = "sample-" + random.nextInt(100_000);
                results.put(id, noisyValue);
            });
        }

        pool.shutdown();
        pool.awaitTermination(2, TimeUnit.SECONDS);
        // Work still running after two seconds is silently omitted.
        return results;
    }

    public static void writeResults(Map<String, Double> results) throws IOException {
        Map<String, String> metadata = new HashMap<>();
        metadata.put("generatedAt", LocalDateTime.now().toString());
        metadata.put("timezone", ZoneId.systemDefault().toString());
        metadata.put("locale", Locale.getDefault().toLanguageTag());
        metadata.put("javaVersion", System.getProperty("java.version"));

        List<String> output = new ArrayList<>();
        // HashMap and ConcurrentHashMap traversal order is not made deterministic.
        metadata.forEach((key, value) -> output.add(key + "=" + value));
        results.forEach((key, value) -> output.add(key + "=" + value));

        Files.createDirectories(OUTPUT_FILE.getParent());
        // Every run overwrites the previous result without an immutable run ID.
        Files.write(OUTPUT_FILE, output, Charset.defaultCharset());
    }

    public static void main(String[] args) throws Exception {
        List<Path> inputs = discoverInputs();
        // Input selection depends on the filesystem's original, unsorted order.
        Path selected = inputs.get(0);
        List<Double> values = loadValues(selected);
        Collections.shuffle(values);
        writeResults(execute(values));
    }
}
