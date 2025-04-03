# Introduction

This project was created using [C4-DSL-Builder](https://JustinBusschau.github.io/C4-DSL-Builder/).

C4-DSL-Builder was heavily influenced by [C4-Builder](https://adrianvlupu.github.io/C4-Builder/) so be sure to check that out too.

Further reading:

- [Markdown](https://guides.github.com/features/mastering-markdown/) creates rich text documents from plain text.

- [C4Model](https://c4model.com/) an easy to learn, developer friendly approach to software architecture diagramming.

- [Structurizr DSL](https://docs.structurizr.com/dsl) provides a way to define a software architecture model.

- [Mermaid](https://mermaid.js.org/) a JavaScript based diagramming and charting tool.

# Getting Started

To create a new project:

```bash
npm i -g c4dslbuilder
c4dslbuilder new
```

You will be prompted for a project name and then a new folder created with a template document set.

Next, set up your configuration and start modelling:

```bash
cd <projectName>
c4dslbuilder config
```

# Creating your documentation

There are two parts to the documentation in C4-DSL-Builder:

1. **The Structurizr DSL Model**

    The `workspace.dsl` file lives in the `_dsl` folder under `src`. For more detail on how to use the Structurizr DSL, see the excellent documentation [here](https://docs.structurizr.com/dsl).
    When your documentation is built (see below), the relevant diagrams will be generated and saved to the `_diagrams` folder 

2. **Markdown & Mermaid Documents**

    The documents and folders in `src` 

# Building the diagrams from the DSL

To create the Mermaid diagrams based on your `workspace.dsl`:

```bash
c4dslbuilder dsl
```

Reference the diagrams create (in the `_diagrams` folder) from your markdown documents.

# Building the documentation for sharing

There are a number of ways to build a shareable versio of your project documentation

## 1. Markdown

For a single markdown file that includes all documentation and diagrams:

```bash
c4dslbuilder md
```

If you prefer a separate markdown file for each of the folders in your documentation source:

```bash
c4dslbuilder md -s # or --split
```

The above commands will prepare all relevant mermaid diagrams, as specified in your `workspace.dsl`, then combine them along with any text in `.md` files to create a single shareable document in markdown format.

## 2. PDF

If you prefer a PDF, rather than a markdown document:

```bash
c4dslbuilder pdf
```

If you prefer a separate markdown file for each of the folders in your documentation source:

```bash
c4dslbuilder pdf -s # or --split
```

The above commands will prepare all relevant mermaid diagrams, as specified in your `workspace.dsl`, then combine them along with any text in `.md` files to create a single shareable PDF document.

## 3. Website

To compile your documentation and diagrams into a website:

```bash
c4dslbuilder site
```

To see live updates to the website as you edit the source:

```bash
c4dslbuilder site -w # or --watch
```

The site will then be available on `localhost:3000`. You can change the port by either adding the `-p <port>` (or `--port <port>`) option to your `site` command, or by setting the port number in config (see below).


# Configuring C4-DSL-Builder

To list the current configuration:

```bash
c4dslbuilder list
```

The output of the above command will show all available configuration items along with their current values (if set) - e.g.

    CURRENT CONFIGURATION
    
    Project Name: Example
    Homepage Name: Overview
    Root Folder: src
    Destination Folder: docs
    Generate multiple markdown files: false
    
    Generate a single complete markdown file: false
    Generate website: false
    
        Repository Url: https://www.www.com/src
    Include breadcrumbs: true
    Embed SVG diagram : true
    Replace diagrams with a link: false
    Place diagrams before text: true
    Diagram format: svg
    Charset: UTF-8
    Exclude other files: false
    PDF CSS: /Users/coder/Proj/config/pdf.css

To update the configuration, you can either edit the `.c4dslbuilder` file in your project folder, or:

```bash
c4dslbuilder config
```

You will be prompted for a value for each available configuration item.

To clear the current configuration and start from scratch:

```bash
c4dslbuilder reset
```