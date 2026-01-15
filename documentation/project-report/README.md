# Project report - build instructions

This folder contains a LaTeX project report for the current version of ft_transcendence.

To produce the PDF from the LaTeX source run:

```bash
cd documentation/project-report
pdflatex project_report.tex
pdflatex project_report.tex
```

If `pdflatex` is not installed, on Ubuntu install it with:

```bash
sudo apt update
sudo apt install -y texlive-latex-recommended texlive-pictures texlive-fonts-recommended
```

Note: The generated report references images/placeholders. Replace `gantt.png` and other assets if you want figures embedded.
