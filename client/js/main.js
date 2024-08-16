const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

const signDiv = document.getElementById("sign-div");
const playButton = document.getElementById("play-button");
const nameInput = document.getElementById("name-input");
const socket = io();

let client = {
    x: 0,
    y: 0,
    r: 0,
    name: "",
    points: 0,
    maxPoints: 0,
    level: 1,
    angle: 0,
};

let camera = {
    x: 0,
    y: 0,
    zoom: 1,
};

let mousePosition = {
    x: 0,
    y: 0,
};

let lerpList = [];
let bulletLerpList = [];
let shapeLerpList = [];

let playerList = [];
let bulletList = [];
let shapeList = [];

let oldDate = 0;

function drawHealthBar(x, y, width, health, maxHealth) {
    if (health >= maxHealth) return;

    ctx.strokeStyle = "black";
    ctx.lineWidth = 6;

    ctx.beginPath();

    ctx.moveTo(x - width, y);
    ctx.lineTo(x + width, y);

    ctx.closePath();
    ctx.stroke();

    ctx.strokeStyle = "lime";
    ctx.lineWidth = 3;

    ctx.beginPath();

    ctx.moveTo(x - width, y);
    ctx.lineTo(x - width + (health / maxHealth) * width * 2, y);

    ctx.closePath();
    ctx.stroke();

    ctx.strokeStyle = "black";
}

function drawPolygon(color, radius, sides) {
    const PI2 = Math.PI * 2;
    const a = PI2 / sides;

    ctx.fillStyle = color;
    ctx.lineWidth = 3;

    ctx.beginPath();
    for (let i = 0; i < PI2; i += a) {
        const p = [Math.cos(i) * radius, Math.sin(i) * radius];
        if (i == 0) {
            ctx.moveTo(p[0], p[1]);
        } else {
            ctx.lineTo(p[0], p[1]);
        }
    }

    ctx.closePath();

    ctx.fill();
    ctx.stroke();
}

function render() {
    if (canvas.style.display == "none") return;

    const delta = Date.now() - oldDate;
    oldDate = Date.now();

    let camTween = delta / 200;
    if (camTween > 1) camTween = 1;
    if (camTween < 0) camTween = 0;
    camera.x += (client.x - camera.x) * camTween;
    camera.y += (client.y - camera.y) * camTween;
    if (client.r > 0)
        camera.zoom += (1 / (client.r / 30) - camera.zoom) * camTween;

    /* stuff */
    const rScale = canvas.height / 800;
    const scale = rScale * camera.zoom;

    const other_position_yay = {
        x: (client.x - camera.x) * scale,
        y: (client.y - camera.y) * scale,
    };
    client.angle = Math.atan2(
        mousePosition.y - (canvas.height / 2 + other_position_yay.y),
        mousePosition.x - (canvas.width / 2 + other_position_yay.x),
    );

    /* render */
    ctx.lineJoin = "round";

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();

    ctx.translate(
        -camera.x * scale + canvas.width / 2,
        -camera.y * scale + canvas.height / 2,
    );
    ctx.scale(scale, scale);

    ctx.save();
    ctx.translate(camera.x - (camera.x % 30), camera.y - (camera.y % 30));

    ctx.beginPath();

    const x1 = canvas.width / scale / 2 + 30;
    const y1 = canvas.height / scale / 2 + 30;

    for (let y = -y1; y < y1; y += 30) {
        ctx.moveTo(-x1, y);
        ctx.lineTo(x1, y);
    }

    for (let x = -x1; x < x1; x += 30) {
        ctx.moveTo(x, -y1);
        ctx.lineTo(x, y1);
    }

    ctx.closePath();

    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgb(235, 235, 235)";

    ctx.stroke();

    ctx.restore();

    ctx.strokeStyle = "black";

    for (let index in playerList) {
        const player = playerList[index];

        if (lerpList[index] == null) {
            lerpList[index] = {
                x: player.x,
                y: player.y,
                angle: 0,
                turrets: [],
            };
        } else {
            let playerTween = delta / 50;
            if (playerTween > 1) playerTween = 1;
            if (playerTween < 0) playerTween = 0;
            lerpList[index].x += (player.x - lerpList[index].x) * playerTween;
            lerpList[index].y += (player.y - lerpList[index].y) * playerTween;
            const change = player.angle - lerpList[index].angle;
            if (Math.abs(change) >= Math.PI) {
                if (change > 0) {
                    lerpList[index].angle += Math.PI * 2;
                } else {
                    lerpList[index].angle -= Math.PI * 2;
                }
            } else {
                lerpList[index].angle +=
                    (player.angle - lerpList[index].angle) * playerTween;
            }
        }

        ctx.save();
        ctx.translate(lerpList[index].x, lerpList[index].y);
        if (player.id == socket.id) {
            ctx.rotate(client.angle);
        } else {
            ctx.rotate(lerpList[index].angle);
        }

        const playerScale = player.r / 30;
        ctx.scale(playerScale, playerScale);

        ctx.lineWidth = 3 / playerScale;
        ctx.fillStyle = "rgb(150, 150, 150)";
        player.turrets.forEach((turret, ti) => {
            if (turret.type == 0) {
                if (lerpList[index].turrets[ti] == null) {
                    lerpList[index].turrets[ti] = { anim1: 0 };
                } else {
                    let playerTween = delta / 50;
                    if (playerTween > 1) playerTween = 1;
                    if (playerTween < 0) playerTween = 0;

                    lerpList[index].turrets[ti].anim1 +=
                        (turret.anim1 - lerpList[index].turrets[ti].anim1) *
                        playerTween;
                }

                ctx.save();
                ctx.rotate((turret.angle * Math.PI) / 180);
                ctx.translate(turret.y, turret.x);
                ctx.fillRect(
                    lerpList[index].turrets[ti].anim1,
                    -turret.sizeX / 2,
                    turret.sizeY,
                    turret.sizeX,
                );
                ctx.strokeRect(
                    lerpList[index].turrets[ti].anim1,
                    -turret.sizeX / 2,
                    turret.sizeY,
                    turret.sizeX,
                );
                ctx.restore();
            }
        });

        ctx.beginPath();
        ctx.arc(0, 0, 30, 0, Math.PI * 2);
        ctx.closePath();

        if (player.id == socket.id) {
            ctx.fillStyle = "rgb(0, 200, 255)";
        } else {
            ctx.fillStyle = "rgb(255, 0, 0)";
        }

        ctx.fill();
        ctx.stroke();

        if (player.forceField == true) {
            ctx.beginPath();
            ctx.arc(0, 0, 30, 0, Math.PI * 2);
            ctx.closePath();

            ctx.fillStyle = "white";
            ctx.globalAlpha = (Math.sin(Date.now() / 100) + 1) / 4;

            ctx.fill();

            ctx.globalAlpha = 1;
        }

        ctx.lineWidth = 3 / playerScale;
        ctx.fillStyle = "rgb(150, 150, 150)";
        player.turrets.forEach((turret, ti) => {
            if (lerpList[index].turrets[ti] == null) {
                lerpList[index].turrets[ti] = { angle: 0, anim1: 0 };
            } else {
                let playerTween = delta / 50;
                if (playerTween > 1) playerTween = 1;
                if (playerTween < 0) playerTween = 0;

                const change = turret.angle - lerpList[index].turrets[ti].angle;
                if (Math.abs(change) > Math.PI) {
                    if (change > 0) {
                        lerpList[index].turrets[ti].angle += Math.PI * 2;
                    } else {
                        lerpList[index].turrets[ti].angle -= Math.PI * 2;
                    }
                } else {
                    lerpList[index].turrets[ti].angle += change * playerTween;
                }

                lerpList[index].turrets[ti].anim1 +=
                    (turret.anim1 - lerpList[index].turrets[ti].anim1) *
                    playerTween;
            }

            if (turret.type == 1) {
                ctx.save();
                if (player.id == socket.id) {
                    ctx.rotate(
                        lerpList[index].turrets[ti].angle - client.angle,
                    );
                } else {
                    ctx.rotate(
                        lerpList[index].turrets[ti].angle -
                            lerpList[index].angle,
                    );
                }
                ctx.translate(turret.y, turret.x);
                ctx.fillRect(
                    lerpList[index].turrets[ti].anim1,
                    -turret.sizeX / 2,
                    turret.sizeY,
                    turret.sizeX,
                );
                ctx.strokeRect(
                    lerpList[index].turrets[ti].anim1,
                    -turret.sizeX / 2,
                    turret.sizeY,
                    turret.sizeX,
                );
                ctx.beginPath();
                ctx.arc(0, 0, turret.sizeX, 0, Math.PI * 2);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }
        });

        ctx.restore();

        if (player.id == socket.id) {
            client.x = lerpList[index].x;
            client.y = lerpList[index].y;
            client.r = player.r;

            let tweenThing = delta / 200;
            if (tweenThing > 1) tweenThing = 1;
            if (tweenThing < 0) tweenThing = 0;
            client.points += (player.points - client.points) * tweenThing;
            client.maxPoints +=
                (player.maxPoints - client.maxPoints) * tweenThing;
            client.name = player.name;
            client.level = player.level;
        } else {
            ctx.lineWidth = 6;
            ctx.fillStyle = "rgb(255, 255, 255)";
            ctx.font = "bold 30px Arial";
            ctx.textAlign = "center";

            ctx.strokeText(
                player.name,
                lerpList[index].x,
                lerpList[index].y - player.r - 20,
            );
            ctx.fillText(
                player.name,
                lerpList[index].x,
                lerpList[index].y - player.r - 20,
            );
        }

        drawHealthBar(
            lerpList[index].x,
            lerpList[index].y + player.r + 10,
            player.r - 5,
            player.health,
            player.maxHealth,
        );
    }

    for (let i in shapeList) {
        const shape = shapeList[i];

        const max_x = canvas.width / scale / 2;
        const max_y = canvas.height / scale / 2;
        const pos_on_canvas = { x: shape.x - camera.x, y: shape.y - camera.y };
        if (
            pos_on_canvas.x + shape.r < -max_x ||
            pos_on_canvas.x - shape.r > max_x ||
            pos_on_canvas.y + shape.r < -max_y ||
            pos_on_canvas.y - shape.r > max_y
        ) {
            shapeLerpList[i] = {
                x: shape.x,
                y: shape.y,
                damage_anim: 0,
                angle: shape.angle,
                health: shape.health,
            };

            continue;
        }

        if (shapeLerpList[i] == null) {
            shapeLerpList[i] = {
                x: shape.x,
                y: shape.y,
                damage_anim: 0,
                angle: shape.angle,
                health: shape.health,
            };
        } else {
            let shapeTween = delta / 50;
            if (shapeTween > 1) shapeTween = 1;
            if (shapeTween < 0) shapeTween = 0;

            shapeLerpList[i].x += (shape.x - shapeLerpList[i].x) * shapeTween;
            shapeLerpList[i].y += (shape.y - shapeLerpList[i].y) * shapeTween;
            shapeLerpList[i].health +=
                (shape.health - shapeLerpList[i].health) * shapeTween;

            if (shapeLerpList[i].damage_anim == 0) {
                shapeLerpList[i].damage_anim = shape.damage_anim;
            } else {
                shapeLerpList[i].damage_anim += delta;
            }

            const angleChange = shape.angle - shapeLerpList[i].angle;
            if (Math.abs(angleChange) > Math.PI) {
                if (angleChange > 0) {
                    shapeLerpList[i].angle += Math.PI * 2;
                } else {
                    shapeLerpList[i].angle -= Math.PI * 2;
                }
            } else {
                shapeLerpList[i].angle += angleChange * shapeTween;
            }
        }

        ctx.save();
        ctx.translate(shapeLerpList[i].x, shapeLerpList[i].y);
        ctx.rotate(shapeLerpList[i].angle);

        const shape_info = { color: "rgb(255, 235, 10)", sides: 4 };
        switch (shape.type) {
            case 1:
                shape_info.color = "rgb(255, 100, 100)";
                shape_info.sides = 3;
                break;

            case 2:
                shape_info.color = "rgb(100, 100, 255)";
                shape_info.sides = 5;
                break;

            case 3:
                shape_info.color = "rgb(100, 100, 255)";
                shape_info.sides = 5;
                break;

            case 4:
                shape_info.color = "rgb(255, 77, 190)";
                shape_info.sides = 3;
                break;

            case 5:
                shape_info.color = "rgb(255, 77, 190)";
                shape_info.sides = 3;
                break;

            default:
                break;
        }

        ctx.strokeStyle = "black";

        if (shapeLerpList[i].damage_anim > 120) {
            shapeLerpList[i].damage_anim = 0;
        } else if (shapeLerpList[i].damage_anim > 60) {
            shape_info.color = "rgb(255, 0, 0)";
            ctx.strokeStyle = shape_info.color;
        } else if (shapeLerpList[i].damage_anim > 0) {
            shape_info.color = "rgb(255, 240, 240)";
            ctx.strokeStyle = shape_info.color;
        }

        drawPolygon(shape_info.color, shape.r, shape_info.sides);

        ctx.restore();

        drawHealthBar(
            shapeLerpList[i].x,
            shapeLerpList[i].y + shape.r + 10,
            shape.r - 5,
            shapeLerpList[i].health,
            shape.maxHealth,
        );
    }

    for (let i in bulletList) {
        const bullet = bulletList[i];

        const max_x = canvas.width / scale / 2;
        const max_y = canvas.height / scale / 2;
        const pos_on_canvas = {
            x: bullet.x - camera.x,
            y: bullet.y - camera.y,
        };
        if (
            pos_on_canvas.x + bullet.rad < -max_x ||
            pos_on_canvas.x - bullet.rad > max_x ||
            pos_on_canvas.y + bullet.rad < -max_y ||
            pos_on_canvas.y - bullet.rad > max_y
        ) {
            bulletLerpList[i] = { x: bullet.x, y: bullet.y };

            continue;
        }

        if (bulletLerpList[i] == null) {
            bulletLerpList[i] = { x: bullet.x, y: bullet.y };
        } else {
            let bulletTween = delta / 50;
            if (bulletTween > 1) bulletTween = 1;
            if (bulletTween < 0) bulletTween = 0;

            bulletLerpList[i].x +=
                (bullet.x - bulletLerpList[i].x) * bulletTween;
            bulletLerpList[i].y +=
                (bullet.y - bulletLerpList[i].y) * bulletTween;
        }

        ctx.save();
        ctx.translate(bulletLerpList[i].x, bulletLerpList[i].y);

        if (bullet.id == null) {
            ctx.fillStyle = bullet.color;
        } else {
            if (bullet.id == socket.id) {
                ctx.fillStyle = "rgb(0, 200, 255)";
            } else {
                ctx.fillStyle = "rgb(255, 0, 0)";
            }
        }

        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.arc(0, 0, bullet.rad, 0, Math.PI * 2);
        ctx.closePath();

        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }

    ctx.restore();

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height);
    ctx.scale(rScale, rScale);

    ctx.lineWidth = 30;
    ctx.strokeStyle = "black";

    ctx.beginPath();

    ctx.moveTo(-150, -30);
    ctx.lineTo(150, -30);

    ctx.closePath();
    ctx.stroke();

    ctx.lineWidth = 24;
    ctx.strokeStyle = "rgb(255, 200, 0)";

    ctx.beginPath();

    ctx.moveTo(-150, -30);
    ctx.lineTo(-150 + (client.points / client.maxPoints) * 300, -30);

    ctx.closePath();
    ctx.stroke();

    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeStyle = "black";
    ctx.fillStyle = "white";
    ctx.lineWidth = 6;
    ctx.strokeText("Level: " + client.level, 0, -30);
    ctx.fillText("Level: " + client.level, 0, -30);

    ctx.font = "35px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.strokeText(client.name, 0, -45);
    ctx.fillText(client.name, 0, -45);

    ctx.restore();

    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(rScale * 1.25, rScale * 1.25);

    let yP = 0;
    for (let i in playerList) {
        const player = playerList[i];

        ctx.globalAlpha = 0.5;

        ctx.beginPath();

        ctx.moveTo(-105, yP + 15);
        ctx.lineTo(-15, yP + 15);

        ctx.closePath();

        ctx.lineWidth = 20;
        ctx.strokeStyle = "black";

        ctx.stroke();

        ctx.font = "15px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "white";
        ctx.globalAlpha = 1;

        ctx.fillText(player.name, -60, yP + 15);

        yP += 25;
    }

    ctx.globalAlpha = 1;

    ctx.restore();

    requestAnimationFrame(render);
}

nameInput.addEventListener("input", () => {
    if (nameInput.value.length > 12) {
        nameInput.value = nameInput.value.slice(0, 12);
    }
});

playButton.addEventListener("click", () => {
    document.getElementById("fadeDIV").style.display = "inline-block";
    requestAnimationFrame(() => {
        document.getElementById("fadeDIV").style.opacity = "1";

        setTimeout(() => {
            socket.emit("playGame", nameInput.value);
        }, 750);
    });
});

socket.on("playSignal", () => {
    oldDate = Date.now();
    document.getElementById("fadeDIV").style.opacity = "0";

    setTimeout(() => {
        document.getElementById("fadeDIV").style.display = "none";
    }, 750);

    signDiv.style.display = "none";
    canvas.style.display = "inline-block";

    document.body.style.backgroundColor = "white";

    requestAnimationFrame(render);
});

socket.on("dead", () => {
    document.getElementById("fadeDIV").style.display = "inline-block";

    requestAnimationFrame(() => {
        document.getElementById("fadeDIV").style.opacity = "1";
        setTimeout(() => {
            signDiv.style.display = "flex";
            canvas.style.display = "none";
            document.body.style.backgroundColor = "rgb(50, 50, 50)";
            document.getElementById("fadeDIV").style.opacity = "0";
            lerpList = [];
            shapeLerpList = [];
            bulletLerpList = [];

            camera.x = 0;
            camera.y = 0;
            camera.zoom = 1;

            setTimeout(() => {
                document.getElementById("fadeDIV").style.display = "none";
            }, 750);
        }, 750);
    });
});

socket.on("newPositions", (players, bullets, shapes) => {
    if (canvas.style.display == "none") return;

    playerList = players;
    bulletList = bullets;
    shapeList = shapes;

    for (let i in bulletLerpList) {
        if (bulletList[i] == null) delete bulletLerpList[i];
    }

    for (let i in shapeLerpList) {
        if (shapeList[i] == null) delete shapeLerpList[i];
    }

    for (let i in lerpList) {
        if (playerList[i] == null) delete lerpList[i];
    }
});

socket.on("updateStuff", () => {
    socket.emit("updateStuff", client);
});

function keyPress(keyEvent, val) {
    if (canvas.style.display == "none") return;

    const key = keyEvent.key;
    if (key == "a") socket.emit("moveKey", val, 0);
    if (key == "d") socket.emit("moveKey", val, 1);
    if (key == "w") socket.emit("moveKey", val, 2);
    if (key == "s") socket.emit("moveKey", val, 3);
}

window.addEventListener("keydown", (keyEvent) => keyPress(keyEvent, true));
window.addEventListener("keyup", (keyEvent) => keyPress(keyEvent, false));

window.addEventListener("mousemove", (me) => {
    mousePosition.x = me.clientX;
    mousePosition.y = me.clientY;
});
window.addEventListener("mousedown", () => {
    if (canvas.style.display == "none") return;

    socket.emit("enableShoot", true);
});
window.addEventListener("mouseup", () => {
    if (canvas.style.display == "none") return;

    socket.emit("enableShoot", false);
});

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const new_height = canvas.height / 15;
    const new_width = new_height * 8;
    const borderWidth = new_height / 20;

    signDiv.style.height = new_height + "px";
    signDiv.style.width = new_width + "px";
    signDiv.style.border = borderWidth + "px solid gray";
    signDiv.style.top =
        "calc(50% - " + (new_height / 2 + borderWidth / 2) + "px)";
    signDiv.style.left =
        "calc(50% - " + (new_width / 2 + borderWidth / 2) + "px)";
    playButton.style.font = new_height / 1.5 + "px Arial";
    nameInput.style.font = playButton.style.font;
}
resize();

signDiv.style.display = "flex";

window.addEventListener("resize", resize);
