from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="quantum-mycelium",
    version="1.0.0",
    author="Crowe Logic",
    author_email="dev@crowelogic.com",
    description="Python SDK for QuantumMycelium Nexus platform",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/crowelogic/quantum-mycelium-sdk-python",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
        "Topic :: Scientific/Engineering :: Bio-Informatics",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
    python_requires=">=3.8",
    install_requires=[
        "requests>=2.28.0",
        "numpy>=1.21.0",
        "pandas>=1.3.0",
        "pydantic>=2.0.0",
        "websocket-client>=1.3.0",
        "qiskit>=0.43.0",
        "networkx>=2.8.0",
        "scipy>=1.9.0",
        "matplotlib>=3.5.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "pytest-cov>=3.0.0",
            "pytest-asyncio>=0.21.0",
            "black>=22.0.0",
            "flake8>=4.0.0",
            "mypy>=0.990",
        ],
        "viz": [
            "plotly>=5.0.0",
            "ipywidgets>=8.0.0",
            "jupyter>=1.0.0",
        ],
    },
)